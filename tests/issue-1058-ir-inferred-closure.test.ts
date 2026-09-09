// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import { analyzeSource } from "../src/checker/index.js";
import { TsCheckerOracle } from "../src/checker/oracle.js";
import { inferredClosureSignature } from "../src/ir/inferred-closure-signature.js";
import { ts } from "../src/ts-api.js";

const cases = [
  ["direct nested", `function add(value: number) { return value + offset; } return add(2);`],
  [
    "address-taken nested",
    `function add(value: number) { return value + offset; } const alias = add; return alias(2);`,
  ],
  ["arrow", `const add = (value: number) => value + offset; return add(2);`],
  [
    "returned callback",
    `function make(value: number) { return (input: number) => input + value; } const add = make(offset); return add(2);`,
  ],
] as const;

it.each(cases)("executes inferred %s on the standalone IR route", async (_name, body) => {
  const result = await compile(`export function run(offset: number): number { ${body} }`, {
    target: "standalone",
    experimentalIR: true,
    trackIrOutcomes: true,
  });
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const run = new WebAssembly.Instance(module, {}).exports.run as (offset: number) => number;
  expect(run(40)).toBe(42);
  expect(run(-8)).toBe(-6);
  expect(
    result.irOutcomes?.find((row) => row.displayName === "run"),
    JSON.stringify(result.irOutcomes),
  ).toMatchObject({ irBodyEmitted: true, legacyBodyEmitted: false });
});

it.each([
  "function test(value: any) { return value; }",
  "interface Node { parent: Node; } function test(value: Node) { return value; }",
  "function test(value?: number) { return value || 0; }",
  "function test(...value: number[]) { return value.length; }",
  "function test(value = 1) { return value; }",
  "function test<T>(value: T) { return value; }",
  "async function test(value: number) { return value; }",
  "function* test(value: number) { yield value; }",
])("refuses inference without a supported exact boundary: %s", (source) => {
  const ast = analyzeSource(source, "/repo/inferred-refusal.ts");
  const declaration = ast.sourceFile.statements.find(ts.isFunctionDeclaration)!;
  expect(inferredClosureSignature(new TsCheckerOracle(ast.checker), declaration)).toBeUndefined();
});

it("shares an exact higher-order signature plan without changing another source node", () => {
  const ast = analyzeSource(
    "function make(value: number) { return (input: number) => input + value; }",
    "/repo/inferred-plan.ts",
  );
  const oracle = new TsCheckerOracle(ast.checker);
  const declaration = ast.sourceFile.statements.find(ts.isFunctionDeclaration)!;
  const plan = inferredClosureSignature(oracle, declaration);
  expect(plan).toMatchObject({
    params: [{ kind: "val", val: { kind: "f64" } }],
    returnType: {
      kind: "closure",
      signature: { params: [{ kind: "val", val: { kind: "f64" } }], returnType: { kind: "val", val: { kind: "f64" } } },
    },
  });
  expect(inferredClosureSignature(oracle, declaration)).toBe(plan);
  expect(Object.isFrozen(plan)).toBe(true);
  expect(inferredClosureSignature(undefined, declaration)).toBeUndefined();
});
