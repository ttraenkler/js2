// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { analyzeSource } from "../src/checker/index.js";
import { TsCheckerOracle } from "../src/checker/oracle.js";
import { planEnumObject } from "../src/ir/enum-object-plan.js";
import { ts } from "../src/ts-api.js";

function plans(source: string) {
  const ast = analyzeSource(source, "/repo/enum-plan.ts");
  const declarations: ts.EnumDeclaration[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isEnumDeclaration(node)) declarations.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast.sourceFile);
  const oracle = new TsCheckerOracle(ast.checker);
  return declarations.map((declaration) => {
    const plan = planEnumObject(declaration, oracle);
    expect(plan).toEqual(planEnumObject(declaration, ast.checker));
    return plan;
  });
}

it.each(["enum", "const enum"])("plans %s aliases and reverse mappings in source assignment order", (kind) => {
  const source = `export ${kind} Kind { Unknown, Literal = 11, Alias = Literal, Next, Text = "text", Negative = -2 }`;
  const plan = plans(source)[0]!;
  expect(plan).toBeDefined();
  expect(plan.writes).toEqual([
    { key: "Unknown", value: 0 },
    { key: "0", value: "Unknown" },
    { key: "Literal", value: 11 },
    { key: "11", value: "Literal" },
    { key: "Alias", value: 11 },
    { key: "11", value: "Alias" },
    { key: "Next", value: 12 },
    { key: "12", value: "Next" },
    { key: "Text", value: "text" },
    { key: "Negative", value: -2 },
    { key: "-2", value: "Negative" },
  ]);
  const native = { exports: {} as Record<string, unknown> };
  const emitted = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      preserveConstEnums: true,
    },
  }).outputText;
  new Function("exports", emitted)(native.exports);
  const value: Record<string, string | number> = {};
  for (const write of plan.writes) value[write.key] = write.value;
  expect(value).toEqual(native.exports.Kind);
  expect(Object.isFrozen(plan.writes)).toBe(true);
});

it("declines effectful initializers instead of erasing evaluation", () => {
  expect(plans(`function effect(): number { return 11; } enum Kind { Value = effect() }`)).toEqual([undefined]);
});

it("declines unknown oracle evidence rather than inventing enum values", () => {
  const ast = analyzeSource(`enum Kind { A = 11 }`, "/repo/unknown-enum.ts");
  const declaration = ast.sourceFile.statements.find(ts.isEnumDeclaration)!;
  expect(
    planEnumObject(declaration, {
      declarationsOf: () => [declaration],
      enumConstantValueOf: () => undefined,
    }),
  ).toBeUndefined();
  expect(
    planEnumObject(declaration, {
      declarationsOf: () => [],
      enumConstantValueOf: () => 11,
    }),
  ).toBeUndefined();
});

it("declines merged and ambient enum initialization", () => {
  expect(plans(`enum Kind { A = 1 } enum Kind { B = 2 }`)).toEqual([undefined, undefined]);
  expect(plans(`declare namespace External { enum Kind { A = 1 } }`)).toEqual([undefined]);
});

it("keeps enum writes source-owned when a namespace augments its runtime object", () => {
  const [plan] = plans(`enum Kind { A = 7 } namespace Kind { export const next = 3; }`);
  expect(plan?.writes).toEqual([
    { key: "A", value: 7 },
    { key: "7", value: "A" },
  ]);
});

it("keeps separate same-named enums attached to their declarations", () => {
  const [left, right] = plans(
    `namespace Left { export enum Kind { A = 1 } } namespace Right { export enum Kind { A = 2 } }`,
  );
  expect(left?.members).toEqual([{ key: "A", value: 1 }]);
  expect(right?.members).toEqual([{ key: "A", value: 2 }]);
  expect(left?.declaration).not.toBe(right?.declaration);
});
