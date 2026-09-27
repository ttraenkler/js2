// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compileMulti } from "../src/index.js";
import { ts } from "../src/ts-api.js";

const provider = "export class C {static read(value=0){return value+1;} static field=(value:number)=>value+4;}";
const cases: Record<string, readonly [string, number]> = {
  original: ["return ns.C.read();", 1],
  callableField: ["return ns.C.field(3);", 7],
  replacement: ["ns.C.read=()=>2;return ns.C.read();", 2],
  opaque: ["const target:any=ns.C;target.read=()=>2;return ns.C.read();", 2],
  receiver: ["ns.C.read=function(this:any){return this===ns.C?7:0;};return ns.C.read();", 7],
  calleeBeforeArguments: ["return ns.C.read((ns.C.read=()=>99,2));", 3],
  getterBeforeArguments: [
    "let trace=0;Object.defineProperty(ns.C,'read',{get(){trace=1;return(x:number)=>trace+x;}});return ns.C.read((trace=trace*10+2));",
    24,
  ],
  receiverOnce: [
    "let trace=0;const holder={get C(){trace=trace*10+1;return ns.C;}};const result=holder.C.read((trace=trace*10+2));return trace*100+result;",
    1213,
  ],
  throwingGetter: [
    "let n=0;Object.defineProperty(ns.C,'read',{get(){throw new Error('stop');}});try{ns.C.read(++n);}catch{return n===0?7:0;}return 0;",
    7,
  ],
};

for (const experimentalIR of [false, true]) {
  for (const [name, [body, expected]] of Object.entries(cases)) {
    it(`observes live qualified static methods: ${name} IR=${experimentalIR}`, async () => {
      const entry = `import * as ns from './provider.js';export function run(){${body}}`;
      const nativeProvider = {};
      const nativeEntry: { run?: () => number } = {};
      const transpile = (source: string) =>
        ts.transpileModule(source, {
          compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
        }).outputText;
      new Function("exports", transpile(provider))(nativeProvider);
      new Function("exports", "require", transpile(entry))(nativeEntry, () => nativeProvider);
      expect(nativeEntry.run!()).toBe(expected);
      const result = await compileMulti({ "./provider.ts": provider, "./entry.ts": entry }, "./entry.ts", {
        target: "standalone",
        experimentalIR,
      });
      expect(result.success, JSON.stringify(result.errors)).toBe(true);
      const module = new WebAssembly.Module(result.binary);
      expect(WebAssembly.Module.imports(module)).toEqual([]);
      expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(expected);
    });
  }
}
