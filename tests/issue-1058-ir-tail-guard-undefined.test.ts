// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import { analyzeSource } from "../src/checker/index.js";
import { TsCheckerOracle } from "../src/checker/oracle.js";
import { inferredClosureSignature } from "../src/ir/inferred-closure-signature.js";
import { ts } from "../src/ts-api.js";

it("requires implicit-undefined capability without rerouting annotated scalar signatures", () => {
  const ast = analyzeSource(
    "function choose(value: boolean) { if (value) return 42; } function scalar(value: boolean): number { if (value) return 42; }",
  );
  const [choose, scalar] = ast.sourceFile.statements.filter(ts.isFunctionDeclaration);
  const oracle = new TsCheckerOracle(ast.checker);
  const provider = { oracle, resolve: () => undefined };
  expect(inferredClosureSignature(oracle, choose!, provider)).toBeUndefined();
  const enabled = { ...provider, supportsImplicitUndefinedReturns: true };
  expect(inferredClosureSignature(oracle, choose!, enabled)?.returnType).toEqual({ kind: "dynamic" });
  expect(inferredClosureSignature(oracle, scalar!, enabled)).toBeUndefined();
});

it.each([false, true])("returns canonical undefined from a trailing guard (closure=%s)", async (closure) => {
  const result = await compile(
    `export function run(input: boolean): number {
    function choose(value: boolean) { if (value) return 42; }
    ${closure ? "const alias = choose;" : ""}
    const value = ${closure ? "alias" : "choose"}(input);
    return value === undefined ? 7 : value === 42 ? 42 : -1;
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
  expect([run(0), run(1)]).toEqual([7, 42]);
});

it("preserves a guarded object result and fallthrough side effects", async () => {
  const result = await compile(
    `export function run(input: boolean): number {
    const object = {x:42}; let visits = 0;
    function choose(value: boolean): {x:number} | undefined {
      if (value) { visits += 1; if (visits === 1) return object; }
    }
    const value = choose(input);
    const second = choose(input);
    if (input) return value === object && second === undefined && visits === 2 ? 42 : -1;
    return value === undefined && visits === 0 ? 7 : -2;
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
  expect([run(0), run(1)]).toEqual([7, 42]);
});

it("preserves a trailing guard in an inferred arrow", async () => {
  const result = await compile(
    `export function run(input: boolean): number {
    const choose = (value: boolean) => { if (value) return 42; };
    const value = choose(input);
    return value === undefined ? 7 : value === 42 ? 42 : -1;
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
  expect([run(0), run(1)]).toEqual([7, 42]);
});
