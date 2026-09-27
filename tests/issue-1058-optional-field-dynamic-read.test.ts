// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";

for (const experimentalIR of [false, true]) {
  for (const initial of ["undefined", "uninitialized", "null", "{ pos: 7 }"]) {
    for (const read of ["node[key]", "Object.getOwnPropertyDescriptor(node, key)!.value"]) {
      // #1058: implicit field initialization is still absent from the IR plan.
      // Keep this measured gap explicit; it is not a semantic pass.
      const test = initial === "uninitialized" ? it.fails : it;
      test(`reads optional class reference ${initial} using ${read} IR=${experimentalIR}`, async () => {
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
        const result = await compile(source, { target: "standalone", experimentalIR });
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
