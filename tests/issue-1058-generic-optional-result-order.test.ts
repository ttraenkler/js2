// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import { ts } from "../src/ts-api.js";

for (const nullish of ["null", "undefined", "void"] as const) {
  for (const experimentalIR of [false, true]) {
    it(`shared generic ${nullish} result IR=${experimentalIR}`, async () => {
      const absent = nullish === "null" ? "null" : "undefined";
      const result = await compile(
        `
        function select<T>(value: T, present: boolean): T | ${nullish} {
          return present ? value : ${absent};
        }
        function number() { return select(7, true); }
        export function run() {
          const value = { flags: 73 };
          const found = select(value, true);
          const missing = select(value, false);
          return number() === 7 && found === value && missing === ${absent} ? 73 : -1;
        }
      `,
        { target: "standalone", experimentalIR },
      );
      expect(result.success, JSON.stringify(result.errors)).toBe(true);
      const module = new WebAssembly.Module(result.binary);
      expect(WebAssembly.Module.imports(module)).toEqual([]);
      expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(73);
    });
  }
}

for (const experimentalIR of [false, true]) {
  for (const predicateFirst of [false, true]) {
    for (const optimize of [false, true]) {
      it(`generic optional callback result IR=${experimentalIR} predicateFirst=${predicateFirst} optimize=${optimize}`, async () => {
        const object = `function object(map: ReadonlyMap<string, Sym>) {
          return forEachEntry(map, p => p.flags & 1 ? p : undefined);
        }`;
        const predicate = `function predicate(map: ReadonlyMap<string, Sym>) {
          return !!forEachEntry(map, p => p.flags & 111551 && isExpando(p.valueDeclaration));
        }`;
        const source = `
          interface Sym { flags: number; valueDeclaration: { kind: number }; }
          function forEachEntry<K, V, U>(map: ReadonlyMap<K, V>,
              callback: (value: V, key: K) => U | undefined): U | undefined {
            const iterator = map.entries();
            for (const [key, value] of iterator) {
              const result = callback(value, key);
              if (result) return result;
            }
            return undefined;
          }
          function isExpando(node: { kind: number }) { return node.kind === 7; }
          ${predicateFirst ? predicate + object : object + predicate}
          export function run(flags: number, kind: number) {
            const entry = { flags, valueDeclaration: { kind } };
            const map = new Map<string, Sym>();
            if (flags >= 0) map.set('a', entry);
            const value = object(map);
            return (value === entry && value.flags === 1 ? 70 : 0) + (predicate(map) ? 3 : 0);
          }
        `;
        const native: { run?: (flags: number, kind: number) => number } = {};
        new Function(
          "exports",
          ts.transpileModule(source, {
            compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
          }).outputText,
        )(native);
        const result = await compile(source, { target: "standalone", experimentalIR, optimize });
        expect(result.success, JSON.stringify(result.errors)).toBe(true);
        const module = new WebAssembly.Module(result.binary);
        expect(WebAssembly.Module.imports(module)).toEqual([]);
        const run = new WebAssembly.Instance(module).exports.run as (flags: number, kind: number) => number;
        for (const [flags, kind, expected] of [
          [1, 7, 73],
          [1, 8, 70],
          [0, 7, 0],
          [-1, 7, 0],
        ]) {
          expect(native.run!(flags, kind)).toBe(expected);
          expect(run(flags, kind)).toBe(expected);
        }
      });
    }
  }
}
