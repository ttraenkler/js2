// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";

for (const experimentalIR of [false, true]) {
  for (const type of ["number", "boolean", "string", "bigint"]) {
    // Both failures reproduce on the merged baseline: their scalar carriers
    // still cannot preserve undefined. They are not counted as semantic wins.
    const test = type === "boolean" || type === "bigint" ? it.fails : it;
    test(`keeps optional ${type} fields undefined IR=${experimentalIR}`, async () => {
      const result = await compile(
        `
        class C { value?: ${type}; }
        export function run(): number { const view: any = new C(); return view.value === undefined ? 1 : 0; }
      `,
        { target: "standalone", experimentalIR },
      );
      expect(result.success, JSON.stringify(result.errors)).toBe(true);
      const module = new WebAssembly.Module(result.binary);
      expect(WebAssembly.Module.imports(module)).toEqual([]);
      expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(1);
    });
  }
  it(`initializes an optional derived field after super and before the next field IR=${experimentalIR}`, async () => {
    const result = await compile(
      `
      class Base { value?: { pos: number }; constructor() { this.value = {pos: 7}; } }
      class Derived extends Base { value?: { pos: number }; seen = this.value === undefined ? 1 : 0; }
      export function run(): number { const view: any = new Derived(); return view.value === undefined ? view.seen : 0; }
    `,
      { target: "standalone", experimentalIR },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(1);
  });
  for (const initial of ["undefined", "uninitialized", "null", "{ pos: 7 }"]) {
    for (const read of ["node[key]", "Object.getOwnPropertyDescriptor(node, key)!.value"]) {
      it(`reads optional class reference ${initial} using ${read} IR=${experimentalIR}`, async () => {
        const source = `
          interface EmitNode { pos: number; }
          class NodeObject {
            emitNode?: EmitNode ${initial === "null" ? "| null" : ""};
            constructor() { ${initial === "uninitialized" ? "" : `this.emitNode = ${initial};`} }
          }
          function observe(node: any, key: string): number {
            const value = ${read};
            return value === undefined ? 1 : value === null ? 2 : value.pos;
          }
          export function run(): number { return observe(new NodeObject(), "emitNode"); }
        `;
        const native: { run?: () => number } = {};
        new Function(
          "exports",
          ts.transpileModule(source, {
            compilerOptions: {
              module: ts.ModuleKind.CommonJS,
              target: ts.ScriptTarget.ES2022,
            },
          }).outputText,
        )(native);
        const expected = initial === "undefined" || initial === "uninitialized" ? 1 : initial === "null" ? 2 : 7;
        expect(native.run!()).toBe(expected);
        const result = await compile(source, { target: "standalone", experimentalIR, trackIrOutcomes: true });
        expect(result.success, JSON.stringify(result.errors)).toBe(true);
        const module = new WebAssembly.Module(result.binary);
        expect(WebAssembly.Module.imports(module)).toEqual([]);
        expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(expected);
      });
    }
  }
  it(`preserves identity and repeated clear/write transitions IR=${experimentalIR}`, async () => {
    const source = `
      interface EmitNode { pos: number; }
      class NodeObject {
        emitNode?: EmitNode;
        constructor() { this.emitNode = undefined; }
        set(value: EmitNode) { this.emitNode = value; }
        clear() { (() => { this.emitNode = undefined; })(); }
      }
      export function run(): number {
        const node = new NodeObject();
        const view: any = node;
        const value = {pos: 7};
        if (view.emitNode !== undefined) return 1;
        node.set(value);
        if (view.emitNode !== value || node.emitNode !== value) return 2;
        node.clear();
        if (view.emitNode !== undefined || node.emitNode !== undefined) return 3;
        view.emitNode = null;
        if (view.emitNode !== null) return 4;
        node.set(value);
        return view.emitNode === value ? 0 : 5;
      }
    `;
    const result = await compile(source, { target: "standalone", experimentalIR });
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(0);
  });
}

it("emits implicit undefined in an IR-owned numeric-field constructor", async () => {
  const result = await compile(
    `
    class C { value?: number; constructor() {} }
    export function run(): number { const view: any = new C(); return view.value === undefined ? 1 : 0; }
  `,
    { target: "standalone", experimentalIR: true, trackIrOutcomes: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  expect(
    result.irOutcomes?.find((row) => row.displayName === "C_new"),
    JSON.stringify(result.irOutcomes),
  ).toMatchObject({ irBodyEmitted: true, legacyBodyEmitted: false });
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(1);
});
