// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";
import { readStandaloneException } from "./dogfood/upstream-suite-worker-protocol.mjs";
const source = `
interface Document { file: string; text: string; }
function arrayFrom<T>(values:Iterable<T>):T[] {const result:T[]=[];for(const value of values)result.push(value);return result;}
function duplicate(name:string, seen:Map<string,number>):string {
 if(seen.has(name)){const count=1+seen.get(name)!;seen.set(name,count);return name+'.dupe'+count;}
 seen.set(name,0);return name;
}
function* iterateOutputs(outputFiles: Iterable<Document>): IterableIterator<[string,string]> {
 const files=arrayFrom(outputFiles);
 files.slice().sort((a,b)=>cleanName(a.file)<cleanName(b.file)?-1:1);
 const seen=new Map<string,number>();
 for(const outputFile of files)yield [duplicate(outputFile.file,seen),'/*====== '+outputFile.file+' ======*/'+outputFile.text];
 function cleanName(name:string){const slash=name.lastIndexOf('/');return name.substr(slash+1).toLowerCase();}
}
export function run():number {
 const output=iterateOutputs([{file:'b',text:'B'},{file:'a',text:'A'},{file:'b',text:'C'}]);
 let value='';for(const [name,text] of output)value+=name+':'+text+';';
 return value==='b:/*====== b ======*/B;a:/*====== a ======*/A;b.dupe1:/*====== b ======*/C;'?1:0;
}
`;
const helper =
  "function cleanName(name:string){const slash=name.lastIndexOf('/');return name.substr(slash+1).toLowerCase();}";
for (const externalHelper of [false, true])
  for (const experimentalIR of [true, false])
    it(`harness output generator IR=${experimentalIR} externalHelper=${externalHelper}`, async () => {
      const input = externalHelper
        ? source.replace(helper, "").replace("function* iterateOutputs", helper + "\nfunction* iterateOutputs")
        : source;
      const e = {};
      new Function(
        "exports",
        ts.transpileModule(input, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText,
      )(e);
      expect((e as any).run()).toBe(1);
      const r = await compile(input, { target: "standalone", experimentalIR });
      expect(r.success, JSON.stringify(r.errors)).toBe(true);
      const m = new WebAssembly.Module(r.binary);
      expect(WebAssembly.Module.imports(m)).toEqual([]);
      const instance = new WebAssembly.Instance(m);
      try {
        expect((instance.exports.run as () => number)()).toBe(1);
      } catch (e) {
        throw new Error(readStandaloneException(e, instance.exports) || String(e));
      }
    });

for (const [name, sourceText] of [
  [
    "parameter",
    `function* values(seed:number){yield next();yield next();function next(){return ++seed;}} export function run():number {const a=values(0),b=values(10);return a.next().value===1&&b.next().value===11&&a.next().value===2&&b.next().value===12?1:0;}`,
  ],
  [
    "capture-free identity",
    `function* values(){yield next;yield next;function next(){return 1;}} export function run():number {const a=values(),b=values();const aa=a.next().value,bb=b.next().value,aa2=a.next().value;return aa===aa2&&aa!==bb?1:0;}`,
  ],
  [
    "declaration before yields",
    `function* values(){function next(){return 1;}yield next;yield next;} export function run():number {const a=values(),b=values();const aa=a.next().value,bb=b.next().value,aa2=a.next().value;return aa===aa2&&aa!==bb&&aa()===1?1:0;}`,
  ],
  [
    "throw completion",
    `function* values(){let n=1;try{yield read;}finally{n=9;}function read(){return n;}} export function run():number {const a=values();const read=a.next().value;let caught=false;try{a.throw(7);}catch(e){caught=e===7;}return caught&&read()===9&&a.next().done?1:0;}`,
  ],
  [
    "abrupt completion",
    `function* values(){let n=1;try{yield read;}finally{n=9;}function read(){return n;}} export function run():number {const a=values();const read=a.next().value;a.return(undefined);return read()===9&&a.next().done?1:0;}`,
  ],
  [
    "shadowed capture",
    `function* values(){let n=1;yield read();{let n=8;yield n;}yield read();function read(){return n;}} export function run():number {const a=values();return a.next().value===1&&a.next().value===8&&a.next().value===1?1:0;}`,
  ],
  [
    "escaped TDZ",
    `function* values(){yield read;let n=7;yield read;function read(){return n;}} export function run():number {const a=values();const read=a.next().value;let caught=false;try{read();}catch(e){caught=e instanceof ReferenceError;}const later=a.next().value;return caught&&read===later&&read()===7?1:0;}`,
  ],
  [
    "escaped identity",
    `function* values(seed:number){let n=seed;yield next;yield next;function next(){return ++n;}} export function run():number {const a=values(0),b=values(10);const aa=a.next().value,bb=b.next().value,aa2=a.next().value;return aa===aa2&&aa!==bb&&aa()===1&&aa2()===2&&bb()===11?1:0;}`,
  ],
  [
    "TDZ",
    `function* values(){yield read();let n=1;function read(){return n;}} export function run():number {try{values().next();return 0;}catch(e){return e instanceof ReferenceError?1:0;}}`,
  ],
  [
    "readonly capture",
    `function* values(seed:number){const n=seed+1;yield read();yield read();function read(){return n;}} export function run():number {const a=values(6);return a.next().value===7&&a.next().value===7?1:0;}`,
  ],
] as const)
  for (const experimentalIR of [true, false])
    it(`helper edge ${name} IR=${experimentalIR}`, async () => {
      const e = {};
      new Function(
        "exports",
        ts.transpileModule(sourceText, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText,
      )(e);
      expect((e as any).run()).toBe(1);
      const r = await compile(sourceText, { target: "standalone", experimentalIR });
      if (name === "shadowed capture") {
        expect(r.success).toBe(false);
        return;
      }
      expect(r.success, JSON.stringify(r.errors)).toBe(true);
      const m = new WebAssembly.Module(r.binary);
      expect(WebAssembly.Module.imports(m)).toEqual([]);
      const instance = new WebAssembly.Instance(m);
      try {
        expect((instance.exports.run as () => number)()).toBe(1);
      } catch (e) {
        throw new Error(readStandaloneException(e, instance.exports) || String(e));
      }
    });

for (const inline of [false, true])
  for (const experimentalIR of [true, false])
    it(`generator helper capture across suspension IR=${experimentalIR} inline=${inline}`, async () => {
      const input = `function* values(){let n=0;${inline ? "yield ++n;yield ++n;" : "yield next();yield next();function next(){return ++n;}"}}
 export function run():number {const a=values(),b=values();return a.next().value*1000+b.next().value*100+a.next().value*10+b.next().value;}`;
      const e = {};
      new Function(
        "exports",
        ts.transpileModule(input, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText,
      )(e);
      expect((e as any).run()).toBe(1122);
      const r = await compile(input, { target: "standalone", experimentalIR });
      expect(r.success, JSON.stringify(r.errors)).toBe(true);
      const m = new WebAssembly.Module(r.binary);
      expect(WebAssembly.Module.imports(m)).toEqual([]);
      const instance = new WebAssembly.Instance(m);
      try {
        expect((instance.exports.run as () => number)()).toBe(1122);
      } catch (e) {
        throw new Error(readStandaloneException(e, instance.exports) || String(e));
      }
    });
