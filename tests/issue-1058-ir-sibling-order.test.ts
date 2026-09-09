// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { analyzeSource } from "../src/checker/index.js";
import { compile } from "../src/index.js";
import { ts } from "../src/ts-api.js";
import { orderTailFunctionDeclarations } from "../src/ir/tail-function-declarations.js";

function ordered(body: string) {
  const ast = analyzeSource(`function run() { ${body} }`);
  const statements = (ast.sourceFile.statements[0] as ts.FunctionDeclaration).body!.statements;
  return { statements, result: orderTailFunctionDeclarations(statements, ast.checker), checker: ast.checker };
}

it("orders exact sibling dependencies and preserves node identity", () => {
  const { statements, result, checker } = ordered(`return first(40);
    function first(n: number): number { return second(n); }
    function second(n: number): number { return n + 2; }`);
  expect(result).toEqual([statements[2], statements[1], statements[0]]);
  expect(result[0]).toBe(statements[2]);
  expect(orderTailFunctionDeclarations(result, checker)).toBe(result);
  expect(orderTailFunctionDeclarations(statements)).toEqual([statements[1], statements[2], statements[0]]);
});

it("orders a long dependency chain without recursive graph traversal", () => {
  const count = 1200;
  const body = Array.from(
    { length: count },
    (_, i) => `function f${i}(): number { return ${i + 1 === count ? "42" : `f${i + 1}()`}; }`,
  ).join("\n");
  const { statements, result } = ordered(body);
  expect(result.length).toBe(count);
  expect(result).toEqual([...statements].reverse());
});

it("ignores same-spelled shadow parameters", () => {
  const { statements, result } = ordered(`function first(second: number): number { return second; }
    function second(n: number): number { return first(n); } return second(42);`);
  expect(result).toBe(statements);
});

it("does not move declarations across executable statements or solve mutual recursion", () => {
  for (const body of [
    `function first(): number { return second(); } const barrier = 1; function second(): number { return barrier; } return first();`,
    `function first(n: number): number { return second(n); } function second(n: number): number { return first(n); } return first(1);`,
  ]) {
    const { statements, result } = ordered(body);
    expect(result).toBe(statements);
  }
});

it("erases only overloads paired with their exact implementation", () => {
  const { statements, result } = ordered(`function next(n: number): number;
    function next(n: number): number { return n + 2; } return next(40);`);
  expect(result).toEqual([statements[1], statements[2]]);
  const unpaired = ordered(`function next(n: number): number; return 0;`);
  expect(unpaired.result).toBe(unpaired.statements);
});

it("executes a later sibling closure captured by an earlier function through IR", async () => {
  const result = await compile(
    `export function run(input: number): number {
    const offset = 2; return first(input);
    function first(n: number): number { const next = second; return next(n); }
    function second(n: number): number { return n + offset; }
  }`,
    { target: "standalone", experimentalIR: true, trackIrOutcomes: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  expect(
    result.irOutcomes?.find((row) => row.displayName === "run"),
    JSON.stringify(result.irOutcomes),
  ).toMatchObject({ irBodyEmitted: true, legacyBodyEmitted: false });
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module, {}).exports.run as (n: number) => number)(40)).toBe(42);
});

it("executes a nested overload implementation through IR", async () => {
  const result = await compile(
    `export function run(input: number): number {
    return next(input);
    function next(n: number): number;
    function next(n: number): number { return n + 2; }
  }`,
    { target: "standalone", experimentalIR: true, trackIrOutcomes: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  expect(
    result.irOutcomes?.find((row) => row.displayName === "run"),
    JSON.stringify(result.irOutcomes),
  ).toMatchObject({ irBodyEmitted: true, legacyBodyEmitted: false });
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module, {}).exports.run as (n: number) => number)(40)).toBe(42);
});
