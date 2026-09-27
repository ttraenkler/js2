// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import { ts } from "../src/ts-api.js";

async function check(source: string, expected: number, experimentalIR: boolean): Promise<void> {
  const native: { run?: () => number } = {};
  new Function(
    "exports",
    ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText,
  )(native);
  expect(native.run!()).toBe(expected);
  const result = await compile(source, { target: "standalone", experimentalIR });
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(expected);
}

for (const experimentalIR of [false, true]) {
  it(`evaluates slice arguments before copying the erased receiver IR=${experimentalIR}`, async () => {
    await check(
      `interface Node {kind:number;}
      function make(){return {slice};function slice<T extends Node>(elements?:readonly T[],start?:()=>number){
        if(elements===undefined)elements=[];return elements.slice(start?start():0);
      }}
      const factory=make();
      export function run(){const items=[{kind:1},{kind:2}];
        const copied=factory.slice(items,()=>{items[0]={kind:9};return 0;});
        return copied[0].kind*10+items[0].kind;}
    `,
      99,
      experimentalIR,
    );
  });
  it(`keeps a null slice receiver throwing TypeError IR=${experimentalIR}`, async () => {
    await check(
      `function slice<T>(items:readonly T[]|null){return items!.slice();}
      export function run(){try{slice(null);return 0;}catch(e){return e instanceof TypeError?1:2;}}
    `,
      1,
      experimentalIR,
    );
  });
}
