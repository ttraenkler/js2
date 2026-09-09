// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile, compileMulti } from "../src/index.js";
import { analyzeSource } from "../src/checker/index.js";
import { ts } from "../src/ts-api.js";
import { constEnumValue } from "../src/ir/const-enum-value.js";

it.each([
  ["numeric", "const enum E { A = 40, B = A + 2 }", "E.B", 42],
  ["zero", "const enum E { A = 0 }", "E.A", 0],
  ["string", 'const enum E { A = "answer" }', "E.A.length", 6],
  ["computed", "const enum E { A = 42 }", 'E["A"]', 42],
] as const)("lowers a %s const enum in IR", async (_name, declaration, value, expected) => {
  const result = await compile(`${declaration} export function run(): number { return ${value}; }`, {
    target: "standalone",
    experimentalIR: true,
    trackIrOutcomes: true,
  });
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  expect(
    result.irOutcomes?.find((row) => row.displayName === "run"),
    JSON.stringify(result.irOutcomes),
  ).toMatchObject({ irBodyEmitted: true });
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module, {}).exports.run as () => number)()).toBe(expected);
});

it.each(["import { E } from './enum.js';", "import * as ns from './enum.js';"])(
  "resolves an imported const enum: %s",
  async (declaration) => {
    const member = declaration.includes("* as") ? "ns.E.A" : "E.A";
    const result = await compileMulti(
      {
        "/entry.ts": `${declaration} export function run(): number { return ${member}; }`,
        "/enum.ts": "export const enum E { A = 42 }",
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
    expect((new WebAssembly.Instance(module, {}).exports.run as () => number)()).toBe(42);
  },
);

it.each([
  ["enum E { A = 42 }", "E.A"],
  ["const enum E { A = 42 }; const alias = E", "alias.A"],
  ["const enum E { A = 42 }; function read(): typeof E { return E; }", "read().A"],
  ["const enum E { A = 42 }; const key = 'A'", "E[key]"],
] as const)("does not fold runtime or unproven enum access %s / %s", (declaration, expression) => {
  const ast = analyzeSource(`${declaration}; const result = ${expression};`, undefined, {
    skipSemanticDiagnostics: true,
  });
  const last = ast.sourceFile.statements.at(-1) as ts.VariableStatement;
  const value = last.declarationList.declarations[0]!.initializer!;
  expect(constEnumValue(value, ast.checker)).toBeUndefined();
  expect(constEnumValue(value)).toBeUndefined();
});
