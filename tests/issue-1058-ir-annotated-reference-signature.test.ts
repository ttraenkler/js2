// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import { analyzeSource } from "../src/checker/index.js";
import { TsCheckerOracle } from "../src/checker/oracle.js";
import { inferredClosureSignature } from "../src/ir/inferred-closure-signature.js";
import { ts } from "../src/ts-api.js";

it("requires carrier evidence without rerouting annotated scalar signatures", () => {
  const ast = analyzeSource(
    "function read(value: {x:number} | undefined): boolean { return value === undefined; } function scalar(value: number): number { return value; }",
  );
  const [read, scalar] = ast.sourceFile.statements.filter(ts.isFunctionDeclaration);
  const oracle = new TsCheckerOracle(ast.checker);
  const provider = { oracle, resolve: () => undefined };
  expect(inferredClosureSignature(oracle, read!)).toBeUndefined();
  expect(inferredClosureSignature(oracle, read!, provider)).toBeUndefined();
  const enabled = { ...provider, supportsDynamicReferenceUnions: true };
  expect(inferredClosureSignature(oracle, read!, enabled)?.params).toEqual([{ kind: "dynamic" }]);
  expect(inferredClosureSignature(oracle, scalar!, enabled)).toBeUndefined();
  expect(inferredClosureSignature(new TsCheckerOracle(ast.checker), read!, enabled)).toBeUndefined();
});

it("preserves an annotated reference-union result", async () => {
  const result = await compile(
    `export function run(): number {
    type Maybe = {x:number} | undefined;
    function identity(value: Maybe): Maybe { return value; }
    const object = {x:42};
    if (identity(undefined) !== undefined) return 0;
    if (identity(object) === {x:42}) return 0;
    if (object !== identity(object)) return 0;
    return identity(object) === object ? 42 : 0;
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

it.each([false, true])("plans an annotated nullable-reference parameter (closure=%s)", async (closure) => {
  const result = await compile(
    `export function run(): number {
    type Maybe = { x: number } | undefined;
    function read(value: Maybe): number { if (value === undefined) return 2; return value.x; }
    ${closure ? "const alias = read;" : ""}
    const object = { x: 40 };
    return ${closure ? "alias" : "read"}(object) + ${closure ? "alias" : "read"}(undefined);
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

it("plans an annotated optional parameter", async () => {
  const result = await compile(
    `export function run(): number {
    function read(value?: number): number { if (value === undefined) return 2; return value === 0 ? 40 : 99; }
    return read() + read(0);
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
