// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import { analyzeSource } from "../src/checker/index.js";
import { TsCheckerOracle } from "../src/checker/oracle.js";
import { inferredClosureSignature } from "../src/ir/inferred-closure-signature.js";
import { ts } from "../src/ts-api.js";

it("requires capability for multi-reference unions and refuses mixed storage", () => {
  const ast = analyzeSource(`
    interface Left { x: number; left: number }
    interface Right { x: number; right: string }
    function identity(value: Left | Right): Left | Right { return value; }
    function mixed(value: Left | number): number { return 0; }
  `);
  const [identity, mixed] = ast.sourceFile.statements.filter(ts.isFunctionDeclaration);
  const oracle = new TsCheckerOracle(ast.checker);
  const provider = { oracle, resolve: () => undefined };
  expect(inferredClosureSignature(oracle, identity!, provider)).toBeUndefined();
  const enabled = { ...provider, supportsDynamicReferenceUnions: true };
  expect(inferredClosureSignature(oracle, identity!, enabled)).toMatchObject({
    params: [{ kind: "dynamic" }],
    returnType: { kind: "dynamic" },
  });
  expect(inferredClosureSignature(oracle, mixed!, enabled)).toBeUndefined();
});

it.each([false, true])("preserves distinct reference layouts across a union call (closure=%s)", async (closure) => {
  const result = await compile(
    `export function run(): number {
    type Left = { x: number; left: number };
    type Right = { x: number; right: string };
    function identity(value: Left | Right): Left | Right { return value; }
    function read(value: Left | Right): number { return value.x; }
    ${closure ? "const alias = identity;" : ""}
    const left = {x: 19, left: 7};
    const right = {x: 23, right: "other layout"};
    if (${closure ? "alias" : "identity"}(left) !== left) return -1;
    if (right !== ${closure ? "alias" : "identity"}(right)) return -2;
    if (${closure ? "alias" : "identity"}(left) === ${closure ? "alias" : "identity"}(right)) return -3;
    return read(${closure ? "alias" : "identity"}(left)) + read(${closure ? "alias" : "identity"}(right));
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

it("keeps null and undefined distinct alongside multiple reference layouts", async () => {
  const result = await compile(
    `export function run(): number {
    type Left = { x: number; left: number };
    type Right = { x: number; right: string };
    function read(value: Left | Right | null | undefined): number {
      if (value === undefined) return 1;
      if (value === null) return 2;
      return value.x;
    }
    const left = {x: 19, left: 7};
    const right = {x: 20, right: "other layout"};
    return read(left) + read(right) + read(null) + read(undefined);
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

it("recurses through a discriminated reference union", async () => {
  const result = await compile(
    `export function run(): number {
    type Leaf = { kind: 0; value: number };
    type Branch = { kind: 1; child: Leaf | Branch };
    function read(node: Leaf | Branch): number {
      if (node.kind === 1) return read(node.child);
      return node.value;
    }
    return read({kind: 1, child: {kind: 0, value: 42}});
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
