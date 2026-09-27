// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import ts from "typescript";
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

const cases = [
  ["missing capture", "function choose(value:string)", "/(x)?y/.exec('y')![1]", 1],
  ["null", "function choose(value:string)", "null as any", 2],
  ["undefined", "function choose(value:string)", "undefined as any", 1],
  ["matching capture", "function choose(value:string)", "/(x)?y/.exec('xy')![1]", 3],
  ["empty string", "function choose(value:string)", "''", 4],
  ["arrow missing capture", "const choose=(value:string)=>", "/(x)?y/.exec('y')![1]", 1],
  ["arrow null", "const choose=(value:string)=>", "null as any", 2],
  ["function expression", "const choose=function(value:string)", "/(x)?y/.exec('y')![1]", 1],
] as const;

for (const experimentalIR of [false, true]) {
  for (const nested of [false, true]) {
    for (const [name, declaration, argument, expected] of cases) {
      it(`${name} nested=${nested} IR=${experimentalIR}`, async () => {
        const functionSource = `${declaration}{switch(value){case undefined:return 1;case null:return 2;case 'x':return 3;default:return 4;}};`;
        const source = nested
          ? `export function run(){${functionSource}return choose(${argument});}`
          : `${functionSource}export function run(){return choose(${argument});}`;
        const native: { run?: () => number } = {};
        new Function(
          "exports",
          ts.transpileModule(source, {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
          }).outputText,
        )(native);
        expect(native.run!()).toBe(expected);
        const result = await compile(source, { target: "standalone", experimentalIR, skipSemanticDiagnostics: true });
        expect(result.success, JSON.stringify(result.errors)).toBe(true);
        const module = new WebAssembly.Module(result.binary);
        expect(WebAssembly.Module.imports(module)).toEqual([]);
        expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(expected);
      });
    }
  }
}
