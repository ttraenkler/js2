// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";

const cases: [string, string, number][] = [
  [
    "untyped optional Error hook",
    `function make(code:string):Error{const err=new Error(code);if(Error.captureStackTrace)Error.captureStackTrace(err,make);return err;}export function run():number{return make('ENOENT').message==='ENOENT'?1:0;}`,
    1,
  ],
  [
    "typed optional Error hook",
    `interface ErrorConstructor{captureStackTrace(target:object,constructor?:Function):void;}function make(code:string):Error{const err=new Error(code);if(Error.captureStackTrace)Error.captureStackTrace(err,make);return err;}export function run():number{return make('ENOENT').message==='ENOENT'?1:0;}`,
    1,
  ],
  [
    "absent method evaluates arguments and throws",
    `export function run():number{let n=0;try{Error.missingMethod(++n);}catch(e){return e instanceof TypeError?n:0;}return 0;}`,
    1,
  ],
  [
    "native builtin remains callable",
    `export function run():number{if(Math.absentHostHook)Math.absentHostHook();return Math.max(2,7);}`,
    7,
  ],
  [
    "shadowed builtin receiver",
    `function call(Error:any):number{return Error.extra();}export function run():number{return call({extra:()=>7});}`,
    7,
  ],
];

for (const [name, source, expected] of cases)
  for (const experimentalIR of [true, false])
    it(`${name} IR=${experimentalIR}`, async () => {
      const native: any = {};
      new Function(
        "exports",
        ts.transpileModule(source, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText,
      )(native);
      expect(native.run()).toBe(expected);
      // The source-unit harness intentionally lacks Node's ambient hook types.
      const result = await compile(source, { target: "standalone", experimentalIR, skipSemanticDiagnostics: true });
      expect(result.success, JSON.stringify(result.errors)).toBe(true);
      const module = new WebAssembly.Module(result.binary);
      expect(WebAssembly.Module.imports(module)).toEqual([]);
      expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(expected);
    });
