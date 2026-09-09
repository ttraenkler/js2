// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import { analyzeSource } from "../src/checker/index.js";
import { TsCheckerOracle } from "../src/checker/oracle.js";
import { inferredClosureSignature } from "../src/ir/inferred-closure-signature.js";
import { ts } from "../src/ts-api.js";

it("requires explicit array capability and rejects unproved element layouts", () => {
  const ast = analyzeSource(`
    function numeric(values: readonly number[]): number { return values.length; }
    function objects(values: readonly {x:number}[]): number { return values.length; }
    function nested(values: readonly number[][]): number { return values.length; }
    function callbacks(values: readonly (() => number)[]): number { return values.length; }
    function tuple(values: readonly [number, string]): number { return values.length; }
  `);
  const [numeric, ...unsupported] = ast.sourceFile.statements.filter(ts.isFunctionDeclaration);
  const oracle = new TsCheckerOracle(ast.checker);
  const provider = { oracle, resolve: () => undefined };
  expect(inferredClosureSignature(oracle, numeric!, provider)).toBeUndefined();
  const enabled = { ...provider, supportsArraySignatures: true };
  expect(inferredClosureSignature(oracle, numeric!, enabled)?.params).toEqual([
    { kind: "vec", elementType: { kind: "val", val: { kind: "f64" } }, nullable: true },
  ]);
  expect(inferredClosureSignature(new TsCheckerOracle(ast.checker), numeric!, enabled)).toBeUndefined();
  for (const declaration of unsupported)
    expect(inferredClosureSignature(oracle, declaration, enabled), declaration.name!.text).toBeUndefined();
});

it("keeps optional array arguments on the undefined-capable boundary", () => {
  const ast = analyzeSource("function read(values?: readonly number[]): number { return values ? values.length : 0; }");
  const declaration = ast.sourceFile.statements.find(ts.isFunctionDeclaration)!;
  const oracle = new TsCheckerOracle(ast.checker);
  const signature = inferredClosureSignature(oracle, declaration, {
    oracle,
    supportsArraySignatures: true,
    supportsOptionalArguments: true,
    resolve: () => undefined,
  });
  expect(signature?.optionalParamStart).toBe(0);
  expect(signature?.params).toEqual([{ kind: "dynamic" }]);
});

it.each([false, true])("reads a readonly numeric array parameter (closure=%s)", async (closure) => {
  const result = await compile(
    `export function run(): number {
    function read(values: readonly number[]): number { return values[0] + values.length; }
    ${closure ? "const alias = read;" : ""}
    const values = [40, 7];
    return ${closure ? "alias" : "read"}(values);
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

it("preserves a readonly array result and its values", async () => {
  const result = await compile(
    `export function run(): number {
    function identity(values: readonly number[]): readonly number[] { return values; }
    const values = [40, 7];
    const output = identity(values);
    return output[0] + output.length;
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
