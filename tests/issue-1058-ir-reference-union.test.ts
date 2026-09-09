// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import { analyzeSource } from "../src/checker/index.js";
import { TsCheckerOracle } from "../src/checker/oracle.js";
import { inferredClosureSignature } from "../src/ir/inferred-closure-signature.js";
import { ts } from "../src/ts-api.js";

it("requires explicit boxed-reference-union capability", () => {
  const ast = analyzeSource(`function inspect(value: { x: number } | undefined) { return value === undefined; }`);
  const fn = ast.sourceFile.statements[0] as ts.FunctionDeclaration;
  const oracle = new TsCheckerOracle(ast.checker);
  const provider = { oracle, resolve: () => undefined };
  expect(inferredClosureSignature(oracle, fn)).toBeUndefined();
  expect(inferredClosureSignature(oracle, fn, provider)).toBeUndefined();
  expect(inferredClosureSignature(oracle, fn, { ...provider, supportsDynamicReferenceUnions: true })).toMatchObject({
    params: [{ kind: "dynamic" }],
    returnType: { kind: "val", val: { kind: "i32" } },
  });
});

it.each([false, true])("preserves object, undefined and null across nested calls (closure=%s)", async (closure) => {
  const result = await compile(
    `export function run(): number {
    const object = { x: 42 };
    function classify(value: { x: number } | undefined | null) {
      if (value === undefined) return 1;
      if (value === null) return 2;
      return 3;
    }
    ${closure ? "const call = classify;" : ""}
    return ${closure ? "call" : "classify"}(undefined) * 100 + ${closure ? "call" : "classify"}(null) * 10 + ${closure ? "call" : "classify"}(object);
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
  expect((new WebAssembly.Instance(module, {}).exports.run as () => number)()).toBe(123);
});

it("preserves object identity through separately boxed arguments", async () => {
  const result = await compile(
    `export function run(): number {
    const a = { x: 42 }; const b = { x: 42 };
    function same(left: { x: number } | undefined, right: { x: number } | undefined) { return left === right; }
    if (!same(a, a)) return 0; if (same(a, b)) return 0; if (same(a, undefined)) return 0; return 42;
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
  expect((new WebAssembly.Instance(module, {}).exports.run as () => number)()).toBe(42);
});

it("reads a guarded field through an optional object parameter", async () => {
  const result = await compile(
    `export function run(): number {
    const object = { x: 42 };
    function read(value: { x: number } | undefined) { if (value === undefined) return 0; return value.x; }
    return read(object) + read(undefined);
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
  expect((new WebAssembly.Instance(module, {}).exports.run as () => number)()).toBe(42);
});
