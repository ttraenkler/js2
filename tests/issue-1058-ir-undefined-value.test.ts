// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import { analyzeSource } from "../src/checker/index.js";
import { ts } from "../src/ts-api.js";
import { isAmbientUndefined } from "../src/ir/ambient-undefined.js";

it.each([
  `const value = undefined; if (value === null) return 0; if (value === undefined) return 42; return 0;`,
  `let value; value = undefined; if (value === null) return 0; if (value === undefined) return 42; return 0;`,
])("materializes real undefined in a standalone IR value: %s", async (body) => {
  const result = await compile(`export function run(): number { ${body} }`, {
    target: "standalone",
    experimentalIR: true,
    trackIrOutcomes: true,
  });
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  expect(
    result.irOutcomes?.find((row) => row.displayName === "run"),
    JSON.stringify(result.irOutcomes),
  ).toMatchObject({
    irBodyEmitted: true,
    // The existing undefined provider is currently consumed by the overlay;
    // its prepared component still defers IR-first emission.
    legacyBodyEmitted: true,
    r2Withdrawal: { stage: "deferred", reason: "unsealed-component" },
  });
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module, {}).exports.run as () => number)()).toBe(42);
});

it.each(["", "undefined: number"])("uses checker binding identity with parameter %s", (parameter) => {
  const ast = analyzeSource(`function run(${parameter}) { return undefined; }`);
  const fn = ast.sourceFile.statements[0] as ts.FunctionDeclaration;
  const expression = (fn.body!.statements[0] as ts.ReturnStatement).expression!;
  expect(isAmbientUndefined(expression, ast.checker)).toBe(parameter === "");
  expect(isAmbientUndefined(expression)).toBe(false);
});

it("preserves a local parameter named undefined", async () => {
  const result = await compile(`export function run(undefined: number): number { return undefined + 2; }`, {
    target: "standalone",
    experimentalIR: true,
  });
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module, {}).exports.run as (n: number) => number)(40)).toBe(42);
});
