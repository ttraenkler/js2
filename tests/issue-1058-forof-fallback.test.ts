// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";

const cases = [
  [
    "head TDZ survives array fallback",
    `export function run(){const values=[1,2];let count=0;try{for(const values of values){count++;}}catch(error){return count===0 && error instanceof ReferenceError?1:0;}return 0;}`,
    1,
  ],
  [
    "receiver evaluated once and outer head restored",
    `let calls=0;function source(){calls++;return [2,3];} export function run(){let value=7;let n=0;for(const value of source()){n+=value;}return calls*100+value*10+n;}`,
    175,
  ],
  [
    "member receiver survives optional result narrowing",
    `interface R {values:readonly number[];} function source(n:number):R|undefined{return n?{values:[2,3]}:undefined;} export function run(){const result=source(1);if(!result)return -1;let n=0;for(const value of result.values)n+=value;return n;}`,
    5,
  ],
] as const;
for (const experimentalIR of [false, true])
  for (const [name, source, expected] of cases) {
    it(`${name} IR=${experimentalIR}`, async () => {
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
