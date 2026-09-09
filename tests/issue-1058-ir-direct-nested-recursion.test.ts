// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import { analyzeSource } from "../src/checker/index.js";
import { hasDirectNestedRecursion } from "../src/ir/direct-nested-recursion.js";
import { ts } from "../src/ts-api.js";

it.each([
  ["direct call", `return n ? recur(n - 1) : 1;`, true],
  ["no recursive call", `return n;`, false],
  ["alias", `const other = recur; return other(n);`, false],
  ["shorthand escape", `const escaped = { recur }; return n ? recur(n - 1) : 1;`, false],
  ["nested callback", `const call = () => recur(n - 1); return n ? call() : 1;`, false],
  ["optional call", `return n ? recur?.(n - 1) : 1;`, false],
] as const)("proves only direct self identity: %s", (_name, body, expected) => {
  const ast = analyzeSource(`function run() { function recur(n: number): number { ${body} } return recur(3); }`);
  const root = ast.sourceFile.statements[0] as ts.FunctionDeclaration;
  const fn = root.body!.statements[0] as ts.FunctionDeclaration;
  expect(hasDirectNestedRecursion(fn, ast.checker)).toBe(expected);
  expect(hasDirectNestedRecursion(fn)).toBe(false);
});

it.each([
  [
    "factorial",
    `function recur(n: number): number { if (n <= 1) return 1; return n * recur(n - 1); } return recur(input);`,
    5,
    120,
  ],
  [
    "immutable capture",
    `const offset = 2; function recur(n: number): number { if (n <= 0) return offset; return offset + recur(n - 1); } return recur(input);`,
    3,
    8,
  ],
  [
    "mutable capture",
    `let count = 0; function recur(n: number): number { count++; if (n <= 0) return count; return recur(n - 1); } const result = recur(input); return result * 100 + count;`,
    3,
    404,
  ],
] as const)("executes direct nested recursion with %s in IR", async (_name, body, input, expected) => {
  const result = await compile(`export function run(input: number): number { ${body} }`, {
    target: "standalone",
    experimentalIR: true,
    trackIrOutcomes: true,
  });
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  expect(
    result.irOutcomes?.find((row) => row.displayName === "run"),
    JSON.stringify(result.irOutcomes),
  ).toMatchObject({ irBodyEmitted: true, legacyBodyEmitted: false });
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const run = new WebAssembly.Instance(module, {}).exports.run as (n: number) => number;
  expect(run(input)).toBe(expected);
  expect(run(input)).toBe(expected);
});

it("does not admit recursive closure values through the direct-call proof", async () => {
  const result = await compile(
    `export function run(): number {
    function recur(n: number): number { if (n <= 0) return 1; return recur(n - 1); }
    const callback = recur; return callback(3);
  }`,
    { target: "standalone", experimentalIR: true, trackIrOutcomes: true },
  );
  expect(result.irOutcomes?.find((row) => row.displayName === "run")).toMatchObject({ irBodyEmitted: false });
});
