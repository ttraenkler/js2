// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";
import {
  collectIrClassInstanceInitializers,
  collectIrClassParameterProperties,
} from "../src/ir/class-instance-initializers.js";

const cases = {
  string: `class C { constructor(private text: string) {} length(): number {return this.text.length;} } export function run(){return new C('hello').length();}`,
  numeric: `class C { constructor(public value: number) {} } export function run(){return new C(5).value;}`,
  default: `class C { constructor(readonly value: number=5) {} } export function run(){return new C().value;}`,
  protected: `class C { constructor(protected value: number) {} read(): number {return this.value;} } export function run(){return new C(5).read();}`,
  derived: `class B { base=2; } class C extends B { constructor(public value: number){super(); this.value += this.base;} } export function run(){return new C(3).value;}`,
  body: `class C { valueAtBody: number; constructor(public value: number) {this.valueAtBody=this.value; this.value=1;} } export function run(){return new C(5).valueAtBody;}`,
  order: `let trace=0; function field(): number {trace=trace*10+1;return 0;} class C { marker=field(); constructor(public value: number){trace=trace*10+2;} } export function run(){const c=new C(5);return trace===12?c.value:0;}`,
  ordinary: `class C { value:number; constructor(value:number){this.value=value;} } export function run(){return new C(5).value;}`,
  prewrite: `class C { before:any=this.value; constructor(public value:number){} } export function run(){const c=new C(5);return c.before===undefined?c.value:0;}`,
};

it.each([true, false].flatMap((ir) => Object.entries(cases).map(([name, source]) => [ir, name, source] as const)))(
  "preserves constructor parameter properties IR=%s: %s",
  async (experimentalIR, name, source) => {
    const native: { run?: () => number } = {};
    new Function(
      "exports",
      ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText,
    )(native);
    expect(native.run!()).toBe(5);
    const result = await compile(source, {
      target: "standalone",
      experimentalIR,
      trackIrOutcomes: true,
      deferTopLevelInit: true,
    });
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    const exports = new WebAssembly.Instance(module).exports;
    (exports.__module_init as (() => void) | undefined)?.();
    expect((exports.run as () => number)()).toBe(5);
    // Defaults and an `any` instance field remain existing class-shape refusals.
    // Every other positive case must actually emit the constructor through IR.
    if (experimentalIR && name !== "default" && name !== "prewrite") {
      expect(result.irCompiledFuncs, JSON.stringify(result.irOutcomes)).toContain("C_new");
    }
  },
);

it("plans only implementation parameter properties after ordinary field initializers", () => {
  const source = ts.createSourceFile(
    "parameters.ts",
    `
    class C {
      static ignored = 1;
      static constructor(ignored: string) {}
      before = 2;
      constructor(value: number);
      constructor(public readonly value: number, ordinary?: string) {}
      after = 3;
    }
  `,
    ts.ScriptTarget.ES2022,
    true,
  );
  const declaration = source.statements.find(ts.isClassDeclaration)!;
  const properties = collectIrClassParameterProperties(declaration);
  expect(properties.map((parameter) => parameter.name.text)).toEqual(["value"]);
  const plan = collectIrClassInstanceInitializers(declaration)!;
  expect(plan.map((initializer) => initializer.fieldName)).toEqual(["before", "after", "value"]);
  expect(plan[2]!.declaration).toBe(properties[0]);
  expect(plan[2]!.expression).toBe(properties[0]!.name);
  expect(
    plan.every((initializer, index) => index === 0 || initializer.sourceOrdinal > plan[index - 1]!.sourceOrdinal),
  ).toBe(true);
});

it("still refuses the complete IR plan for an unsupported computed field name", () => {
  const source = ts.createSourceFile(
    "dynamic.ts",
    `class C { [key()] = 1; constructor(public value: number) {} }`,
    ts.ScriptTarget.ES2022,
    true,
  );
  expect(collectIrClassInstanceInitializers(source.statements.find(ts.isClassDeclaration)!)).toBeUndefined();
});
