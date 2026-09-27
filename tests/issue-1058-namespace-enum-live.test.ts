// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compileMulti } from "../src/index.js";

for (const experimentalIR of [false, true]) {
  it(`keeps an opaque namespace enum live across initialization IR=${experimentalIR}`, async () => {
    const result = await compileMulti(
      {
        "./provider.ts": `
        import * as self from './provider.js';
        function read(namespace:any,key:string){return namespace[key];}
        export const before=typeof read(self,'Kind');
        export enum Kind { First=11, Alias=First, Text='text' }
        export function own(){return Kind;}
      `,
        "./barrel.ts": "export * from './provider.js';",
        "./entry.ts": `
        import * as ns from './barrel.js';
        import { Kind, own, before } from './provider.js';
        function read(namespace:any,key:string){return namespace[key];}
        export function run(index:number){
          const kind=read(ns,'Kind');
          switch(index){
            case 0:return before==='undefined'?42:0;
            case 1:return kind===Kind?42:0;
            case 2:return kind===own()?42:0;
            case 3:return kind[11]==='Alias'?42:0;
            case 4:return kind.Text==='text'?42:0;
            case 5:kind.extra=7;return read(ns,'Kind').extra===7?42:0;
            default:return 0;
          }
        }
      `,
      },
      "./entry.ts",
      { target: "standalone", experimentalIR },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    const run = new WebAssembly.Instance(module).exports.run as (index: number) => number;
    for (let index = 0; index < 6; index++) expect.soft(run(index), `case ${index}`).toBe(42);
  });
}
