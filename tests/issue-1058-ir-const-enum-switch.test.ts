// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile, compileMulti } from "../src/index.js";
import { analyzeSource } from "../src/checker/index.js";
import { ts } from "../src/ts-api.js";
import { constEnumValue } from "../src/ir/const-enum-value.js";
import { numericSwitchCaseValue, stringSwitchCaseValue } from "../src/ir/switch-case-value.js";

it("requires erased binding evidence, preserving zero and empty-string values", () => {
  const ast = analyzeSource(
    'const enum E { A = 0, B = "" }; enum R { A = 0 }; const alias = E; const values = [E.A, E.B, R.A, alias.A];',
    undefined,
    { skipSemanticDiagnostics: true },
  );
  const statement = ast.sourceFile.statements.at(-1) as ts.VariableStatement;
  const values = statement.declarationList.declarations[0]!.initializer as ts.ArrayLiteralExpression;
  const resolve = (expr: ts.Expression) => constEnumValue(expr, ast.checker);
  expect(numericSwitchCaseValue(values.elements[0]!, resolve)).toBe(0);
  expect(stringSwitchCaseValue(values.elements[1]!, resolve)).toBe("");
  for (const expression of values.elements) {
    expect(numericSwitchCaseValue(expression)).toBeNull();
    expect(stringSwitchCaseValue(expression)).toBeNull();
  }
  for (const expression of values.elements.slice(2)) {
    expect(numericSwitchCaseValue(expression, resolve)).toBeNull();
    expect(stringSwitchCaseValue(expression, resolve)).toBeNull();
  }
});

it.each([
  ["numeric", "const enum E { A = 0, B = -2, C = 7 }", "number", [0, -2, 7, 9]],
  ["string", 'const enum E { A = "", B = "b", C = "c" }', "string", ["", "b", "c", "other"]],
] as const)("dispatches %s enum cases with duplicates and fallthrough", async (_name, declaration, type, inputs) => {
  const calls = inputs.map((value) => `choose(${JSON.stringify(value)})`).join(" + ");
  const result = await compile(
    `${declaration}
    function choose(value: ${type}): number {
      let result = 0;
      switch (value) {
        case E.A: return 10;
        case E.A: return 999;
        default: return 2;
        case E.B: result = 20;
        case E.C: result += 5; break;
      }
      return result;
    }
    export function run(): number { return ${calls}; }
  `,
    { target: "standalone", experimentalIR: true, trackIrOutcomes: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  expect(
    result.irOutcomes?.find((row) => row.displayName === "choose"),
    JSON.stringify(result.irOutcomes),
  ).toMatchObject({ irBodyEmitted: true });
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module, {}).exports.run as () => number)()).toBe(42);
});

it.each(["import { E } from './enum.js';", "import * as ns from './enum.js';"])(
  "dispatches imported enum cases: %s",
  async (declaration) => {
    const member = declaration.includes("* as") ? "ns.E" : "E";
    const result = await compileMulti(
      {
        "/entry.ts": `${declaration}
        export function run(value: number): number {
          switch (value) { case ${member}.A: return 42; default: return 7; }
        }`,
        "/enum.ts": "export const enum E { A = 0 }",
      },
      "/entry.ts",
      { target: "standalone", experimentalIR: true, trackIrOutcomes: true },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    expect(
      result.irOutcomes?.find((row) => row.displayName === "run"),
      JSON.stringify(result.irOutcomes),
    ).toMatchObject({ irBodyEmitted: true });
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    const run = new WebAssembly.Instance(module, {}).exports.run as (value: number) => number;
    expect(run(0)).toBe(42);
    expect(run(1)).toBe(7);
  },
);
