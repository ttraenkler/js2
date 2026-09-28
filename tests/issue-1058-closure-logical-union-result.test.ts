// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import { ts } from "../src/ts-api.js";

const cases = [
  [
    "number and boolean result tags",
    `const choose = (n: number) => n && n > 0;
     const x = choose(0), y = choose(7), z = choose(-7);
     return typeof x === 'number' && x === 0 &&
       typeof y === 'boolean' && y === true &&
       typeof z === 'boolean' && z === false ? 73 : -1;`,
  ],
  [
    "bitwise numeric result and boolean predicate",
    `const choose = (n: number) => (n & 111551) && n > 0;
     const x = choose(0), y = choose(1), z = choose(-1);
     return typeof x === 'number' && x === 0 &&
       typeof y === 'boolean' && y === true &&
       typeof z === 'boolean' && z === false ? 73 : -1;`,
  ],
  [
    "short circuit and nested mixed results",
    `let calls = 0;
     const tick = () => { calls++; return true; };
     const choose = (n: number) => n && (n > 0 && tick());
     const x = choose(0), y = choose(7), z = choose(-7);
     return calls === 1 && typeof x === 'number' && x === 0 &&
       typeof y === 'boolean' && y === true &&
       typeof z === 'boolean' && z === false ? 73 : -1;`,
  ],
] as const;

for (const [name, body] of cases) {
  for (const experimentalIR of [false, true]) {
    for (const optimize of [false, true]) {
      it(`${name} IR=${experimentalIR} optimize=${optimize}`, async () => {
        const source = `export function run() { ${body} }`;
        const native: { run?: () => number } = {};
        new Function(
          "exports",
          ts.transpileModule(source, {
            compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
          }).outputText,
        )(native);
        expect(native.run!()).toBe(73);
        const result = await compile(source, { target: "standalone", experimentalIR, optimize });
        expect(result.success, JSON.stringify(result.errors)).toBe(true);
        const module = new WebAssembly.Module(result.binary);
        expect(WebAssembly.Module.imports(module)).toEqual([]);
        expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(73);
      });
    }
  }
}
