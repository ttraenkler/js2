// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";

const cases: [string, string, number][] = [
  ["reverse declaration order", "for(let i=3;i<5;i++)yield i;for(const i of [1,2])yield i;", 3412],
  ["sequential", "for(const i of [1,2])yield i;for(let i=3;i<5;i++)yield i;", 1234],
  ["two iterables", "for(const i of [1,2])yield i;for(const i of [3,4])yield i;", 1234],
  [
    "opposite branches",
    "for(const mode of [0,1]){if(mode){for(const i of [3,4])yield i;}else{for(let i=1;i<3;i++)yield i;}}",
    1234,
  ],
  ["finally", "try{for(const i of [1,2])yield i;}finally{for(let i=3;i<5;i++)yield i;}", 1234],
];

for (const [name, body, expected] of cases)
  for (const experimentalIR of [true, false])
    it(`${name} uses disjoint loop scopes IR=${experimentalIR}`, async () => {
      const source = `function* g(){${body}}export function run():number{let n=0;for(const value of g())n=n*10+value;return n;}`;
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

for (const [name, body] of [
  ["outer binding", "let i=9;for(const i of [1,2])yield i;yield i;"],
  ["other loops overlap", "for(const i of [1,2])yield i;for(let i=3;i<5;i++){for(let i=6;i<8;i++)yield i;yield i;}"],
  ["pattern binding", "const [i]=[9];for(const i of [1,2])yield i;yield i;"],
  ["nested loops", "for(const i of [1,2]){for(let i=3;i<5;i++)yield i;yield i;}"],
  ["var loop", "for(const i of [1,2])yield i;for(var i=3;i<5;i++)yield i;yield i;"],
  ["different carriers", 'for(const i of [1,2])yield i;for(const i of ["abc"])yield i.length;'],
  [
    "retained captures",
    "const saved:(()=>number)[]=[];for(const i of [1,2]){saved.push(()=>i);yield i;}for(let i=3;i<5;i++)yield i;yield saved[0]();",
  ],
])
  for (const experimentalIR of [true, false])
    it(`does not admit unsafe shared slot: ${name} IR=${experimentalIR}`, async () => {
      const result = await compile(
        `function* g(){${body}}export function run():number{let n=0;for(const value of g())n=n*10+value;return n;}`,
        { target: "standalone", experimentalIR },
      );
      // Refusal may occur at planning or at the standalone host-import fence.
      // Neither is permission to emit an import-free module with a wrong value.
      if (result.success)
        expect(WebAssembly.Module.imports(new WebAssembly.Module(result.binary)).length).toBeGreaterThan(0);
      else expect(result.errors.some((error) => error.severity === "error")).toBe(true);
    });
