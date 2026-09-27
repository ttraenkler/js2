// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";

for (const experimentalIR of [false, true]) {
  for (const field of [
    "children?: D[]",
    "children: D[] | undefined",
    "children: D[] | null",
    "children?: readonly D[]",
    "children: D[]",
  ]) {
    it(`preserves nested diagnostic items in ${field} IR=${experimentalIR}`, async () => {
      const source = `
        interface D { start: number; length: number; ${field}; }
        function make(): D { return { start: 0, length: 2, children: [{start: 1, length: 1${field === "children: D[]" ? ", children: []" : ""}}] }; }
        export function run(): number {
          const d = make();
          if (!d.children || d.children.length !== 1) return -1;
          const view: any = d.children;
          if (view[0] === null || view[0] === undefined) return -2;
          let total = 0;
          for (const item of d.children) total += item.start + item.length;
          return total;
        }
      `;
      const native: { run?: () => number } = {};
      new Function(
        "exports",
        ts.transpileModule(source, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText,
      )(native);
      expect(native.run!()).toBe(2);
      const result = await compile(source, { target: "standalone", experimentalIR });
      expect(result.success, JSON.stringify(result.errors)).toBe(true);
      const module = new WebAssembly.Module(result.binary);
      expect(WebAssembly.Module.imports(module)).toEqual([]);
      expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(2);
    });
  }
}
