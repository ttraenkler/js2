// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import { analyzeSource } from "../src/checker/index.js";
import { TsCheckerOracle } from "../src/checker/oracle.js";
import { inferredClosureSignature } from "../src/ir/inferred-closure-signature.js";
import { ts } from "../src/ts-api.js";

it("requires the explicit undefined-result capability", () => {
  const ast = analyzeSource(
    "const enum E { A, B }; function choose(value: E) { switch(value) { case E.A: return true; case E.B: return false; } }",
  );
  const declaration = ast.sourceFile.statements.find(ts.isFunctionDeclaration)!;
  const oracle = new TsCheckerOracle(ast.checker);
  const carriers = { oracle, resolve: () => undefined };
  expect(inferredClosureSignature(oracle, declaration, carriers)?.returnType).toEqual({
    kind: "val",
    val: { kind: "i32" },
  });
  expect(
    inferredClosureSignature(oracle, declaration, { ...carriers, supportsImplicitUndefinedReturns: true })?.returnType,
  ).toEqual({ kind: "dynamic" });
});

it("returns undefined after break and an empty trailing case", async () => {
  const result = await compile(
    `export function run(input: number): number {
    function choose(value: number) { switch(value) { case 0: return 42; case 1: break; case 2: } }
    const value = choose(input);
    return value === undefined ? 7 : 42;
  }`,
    { target: "standalone", experimentalIR: true, trackIrOutcomes: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  expect(
    result.irOutcomes?.find((row) => row.displayName === "run"),
    JSON.stringify(result.irOutcomes),
  ).toMatchObject({ irBodyEmitted: true });
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const run = new WebAssembly.Instance(module, {}).exports.run as (input: number) => number;
  expect([run(0), run(1), run(2), run(3)]).toEqual([42, 7, 7, 7]);
});

it.each([
  ["number", "0", "42"],
  ["boolean", "false", "true"],
  ["string", '""', '"answer"'],
] as const)("preserves %s returns and unmatched undefined", async (_kind, first, second) => {
  const result = await compile(
    `
    const enum E { A = 0, B = 1 }
    export function run(input: number): number {
      function choose(value: E) {
        switch (value) { case E.A: return ${first}; case E.B: return ${second}; }
      }
      const value = choose(input as E);
      if (value === undefined) return 7;
      if (value === ${first}) return 10;
      if (value === ${second}) return 42;
      return 99;
    }`,
    { target: "standalone", experimentalIR: true, trackIrOutcomes: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  expect(
    result.irOutcomes?.find((row) => row.displayName === "run"),
    JSON.stringify(result.irOutcomes),
  ).toMatchObject({ irBodyEmitted: true });
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const run = new WebAssembly.Instance(module, {}).exports.run as (input: number) => number;
  expect(run(0)).toBe(10);
  expect(run(1)).toBe(42);
  expect(run(2)).toBe(7);
});

it.each([
  "function choose(value: number) { switch (value) { case 0: return 42; } } const alias = choose;",
  "const alias = (value: number) => { switch (value) { case 0: return 42; } };",
])("preserves closure call completion: %s", async (declaration) => {
  const result = await compile(
    `export function run(input: number): number {
    ${declaration}
    const result = alias(input);
    if (result === undefined) return 7;
    return result === 42 ? 42 : 99;
  }`,
    { target: "standalone", experimentalIR: true, trackIrOutcomes: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  expect(
    result.irOutcomes?.find((row) => row.displayName === "run"),
    JSON.stringify(result.irOutcomes),
  ).toMatchObject({ irBodyEmitted: true });
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const run = new WebAssembly.Instance(module, {}).exports.run as (input: number) => number;
  expect(run(0)).toBe(42);
  expect(run(2)).toBe(7);
});
