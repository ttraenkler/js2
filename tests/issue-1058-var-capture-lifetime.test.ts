// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";

const cases: [string, string, number][] = [
  ...["var", "let", "const"].map((keyword): [string, string, number] => [
    `${keyword} forward capture`,
    `function make(n:number){var read=createReader();${keyword} symbol={value:n};return read;function createReader(){return function(){return symbol.value;};}}export function run():number {const a=make(3),b=make(7);return a()*10+b();}`,
    37,
  ]),
  [
    "redeclaration",
    `function make(){var read=createReader();var symbol={value:3};var symbol={value:7};return read;function createReader(){return function(){return symbol.value;};}}export function run():number{return make()();}`,
    7,
  ],
  [
    "parameter shadow",
    `function make(n:number){var read=createReader();var symbol={value:n};return read;function createReader(){return function(){return symbol.value+other({value:9});};}function other(symbol:{value:number}){return symbol.value;}}export function run():number{return make(3)();}`,
    12,
  ],
  [
    "pattern var",
    `function make(n:number){var read=createReader();var {symbol}={symbol:{value:n}};return read;function createReader(){return function(){return symbol.value;};}}export function run():number{return make(3)();}`,
    3,
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
      const result = await compile(source, { target: "standalone", experimentalIR });
      expect(result.success, JSON.stringify(result.errors)).toBe(true);
      const module = new WebAssembly.Module(result.binary);
      expect(WebAssembly.Module.imports(module)).toEqual([]);
      expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(expected);
    });
