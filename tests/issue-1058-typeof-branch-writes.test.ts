// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import ts from "typescript";
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

const cases = [
  ["parenthesized update", "if(typeof value==='string'){++(value);}return Number(value);", 3, "2"],
  ["asserted update", "if(typeof value==='string'){++(value as unknown as number);}return Number(value);", 3, "2"],
  ["direct assignment", "if(typeof value==='string'){value=7;}return Number(value);", 7],
  ["object destructuring", "if(typeof value==='string'){({value}={value:7});}return Number(value);", 7],
  ["array destructuring", "if(typeof value==='string'){[value]=[7];}return Number(value);", 7],
  ["array default target", "if(typeof value==='string'){[value=7]=[undefined];}return Number(value);", 7],
  ["else branch", "if(typeof value!=='string'){return 9;}else{value=7;}return Number(value);", 7],
  ["read after write", "if(typeof value==='string'){value=7;return Number(value);}return 9;", 7],
  ["closure write", "function update(){value=7;}if(typeof value==='string'){update();}return Number(value);", 7],
  ["loop write", "if(typeof value==='string'){for(value of [7,8]){}}return Number(value);", 8],
  ["finally write", "try{if(typeof value==='string'){value=7;}}finally{}return Number(value);", 7],
  ["readonly narrowing", "if(typeof value==='string'){return value.length;}return value;", 1],
  ["shadowed write", "if(typeof value==='string'){{let value=2;value=3;}return value.length;}return value;", 1],
] as const;

for (const experimentalIR of [false, true]) {
  for (const [name, body, expected, input = "x"] of cases) {
    it(`${name} IR=${experimentalIR}`, async () => {
      const source = `function f(value:number|string){${body}}export function run(){return f(${JSON.stringify(input)});}`;
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
