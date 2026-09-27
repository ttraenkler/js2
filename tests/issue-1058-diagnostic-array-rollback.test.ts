// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";

for (const experimentalIR of [false, true]) {
  for (const overlay of [false, true]) {
    for (const falsy of ["false", "undefined as Diagnostic | undefined", "null as Diagnostic | null", "0"]) {
      it(`rolls back speculative diagnostics IR=${experimentalIR} overlay=${overlay} result=${falsy}`, async () => {
        const source = `
          ${overlay ? 'export function unrelated(o: any) { Object.defineProperty(o, "x", {get: () => 1}); }' : ""}
          interface Diagnostic { start: number; code: number; }
          const parser = (() => {
            let diagnostics: Diagnostic[] = [];
            function last<T>(array: readonly T[] | undefined): T | undefined {
              return array === undefined || array.length === 0 ? undefined : array[array.length - 1];
            }
            function error(start: number, code: number) {
              const previous = last(diagnostics);
              if (!previous || previous.start !== start) diagnostics.push({start, code});
            }
            const scanner = (() => {
              let pos = 0;
              function speculate<T>(callback: () => T): T {
                const saved = pos; pos++;
                const result = callback();
                if (!result) pos = saved;
                return result;
              }
              return {tryScan: speculate};
            })();
            function speculate<T>(callback: () => T): T {
              const length = diagnostics.length;
              const result = scanner.tryScan(callback);
              if (!result) diagnostics.length = length;
              return result;
            }
            function run() {
              diagnostics = [];
              speculate(() => true);
              speculate(() => ({start: 0, code: 0}));
              speculate(() => {
                error(2, 1000);
                speculate(() => {error(4, 1001); return ${falsy};});
                return ${falsy};
              });
              error(2, 1161);
              return diagnostics.length === 1 ? diagnostics[0].code : -diagnostics.length;
            }
            return {run};
          })();
          export function run() { return parser.run(); }
        `;
        const native: { run?: () => number } = {};
        new Function(
          "exports",
          ts.transpileModule(source, {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
          }).outputText,
        )(native);
        expect(native.run!()).toBe(1161);
        const result = await compile(source, { target: "standalone", experimentalIR });
        expect(result.success, JSON.stringify(result.errors)).toBe(true);
        const module = new WebAssembly.Module(result.binary);
        expect(WebAssembly.Module.imports(module)).toEqual([]);
        const run = new WebAssembly.Instance(module).exports.run as () => number;
        expect(run()).toBe(1161);
        expect(run()).toBe(1161);
      });
    }
  }
}
