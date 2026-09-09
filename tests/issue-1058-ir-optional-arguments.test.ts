// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import { analyzeSource } from "../src/checker/index.js";
import { TsCheckerOracle } from "../src/checker/oracle.js";
import { inferredClosureSignature } from "../src/ir/inferred-closure-signature.js";
import { closureSignatureEquals } from "../src/ir/nodes.js";
import { ts } from "../src/ts-api.js";

it("keeps optional arity separate from expression defaults and exact signatures", () => {
  const ast = analyzeSource("function read(base: number, value?: number) { return value === undefined; }");
  const declaration = ast.sourceFile.statements.find(ts.isFunctionDeclaration)!;
  const oracle = new TsCheckerOracle(ast.checker);
  const carriers = { oracle, resolve: () => undefined };
  expect(inferredClosureSignature(oracle, declaration, carriers)).toBeUndefined();
  const signature = inferredClosureSignature(oracle, declaration, { ...carriers, supportsOptionalArguments: true })!;
  expect(signature.optionalParamStart).toBe(1);
  expect(signature.defaultParamStart).toBeUndefined();
  expect(signature.params[1]).toEqual({ kind: "dynamic" });
  expect(closureSignatureEquals(signature, { ...signature, optionalParamStart: undefined })).toBe(false);
});

it("keeps optional parameters in function length", async () => {
  const result = await compile(
    `export function run(): number {
    const read = (base: number, value?: number) => { return value === undefined ? base : 42; };
    return read.length;
  }`,
    { target: "standalone", experimentalIR: true, trackIrOutcomes: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module, {}).exports.run as () => number)()).toBe(2);
  expect(
    result.irOutcomes?.find((row) => row.displayName === "run"),
    JSON.stringify(result.irOutcomes),
  ).toMatchObject({ irBodyEmitted: true });
});

it.each([false, true])("pads an optional object argument (closure=%s)", async (closure) => {
  const result = await compile(
    `export function run(): number {
    function read(base: number, value?: { x: number }) {
      if (value === undefined) return base;
      return base + value.x;
    }
    ${closure ? "const alias = read;" : ""}
    const object = { x: 20 };
    return ${closure ? "alias" : "read"}(1) + ${closure ? "alias" : "read"}(1, undefined) + ${closure ? "alias" : "read"}(20, object);
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

it("preserves optional numeric values without a missing-argument sentinel", async () => {
  const result = await compile(
    `export function run(): number {
    const read = (value?: number) => { if (value === undefined) return 7; return value === 0 ? 10 : 25; };
    return read() + read(0) + read(3);
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
