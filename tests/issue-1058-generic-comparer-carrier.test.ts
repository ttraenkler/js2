// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";

const core = `type EqualityComparer<T>=(a:T,b:T)=>boolean;
function equateValues<T>(a:T,b:T):boolean{return a===b;}
function contains<T>(array:readonly T[]|undefined,value:T,equalityComparer:EqualityComparer<T>=equateValues):boolean{
 if(array!==undefined){for(let i=0;i<array.length;i++){if(equalityComparer(array[i],value))return true;}}return false;
}
function filter<T>(array:readonly T[],f:(t:T)=>boolean):T[]{const result:T[]=[];for(const item of array)if(f(item))result.push(item);return result;}`;
const node = `class N{kind=1;}`;
const objectRun = `export function run(){const n=new N();return contains([n],n)&&!contains([n],new N())?1:0;}`;
const stringUse = `export function strings(){return equateValues('a','b');}`;
const numberUse = `export function numbers(){return contains([1,2],2);}`;
const cases = [
  ["numeric", `export function run(){return contains([1,2],2)&&!contains([1,2],3)?1:0;}`],
  ["object identity", node + objectRun],
  [
    "filtered",
    node +
      `function reuse(old:readonly N[],next:readonly N[]){return filter(old,v=>contains(next,v)).length;} export function run(){const n=new N();return reuse([n,new N()],[n]);}`,
  ],
  [
    "explicit comparer",
    node +
      `function reuse(old:readonly N[],next:readonly N[]){return filter(old,v=>contains(next,v,equateValues)).length;} export function run(){const n=new N();return reuse([n,new N()],[n]);}`,
  ],
  ["string specialization cannot replace object comparer", node + stringUse + objectRun],
  ["numeric specialization cannot replace object value", node + numberUse + objectRun],
  [
    "mixed callback graph",
    node +
      numberUse +
      stringUse +
      `function reuse(old:readonly N[],next:readonly N[]){return filter(old,v=>contains(next,v)).length;} export function run(){const n=new N();return reuse([n,new N()],[n]);}`,
  ],
  [
    "mixed primitive values",
    stringUse +
      `export function run(){return equateValues(7,7)&&!equateValues(7,8)&&equateValues(null,null)&&!equateValues(null,undefined)&&!equateValues(NaN,NaN)?1:0;}`,
  ],
] as const;

for (const experimentalIR of [false, true]) {
  for (const [name, body] of cases) {
    it(`${name} IR=${experimentalIR}`, async () => {
      const source = core + body;
      const native: { run?: () => number } = {};
      new Function(
        "exports",
        ts.transpileModule(source, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText,
      )(native);
      expect(native.run!()).toBe(1);
      const result = await compile(source, { target: "standalone", experimentalIR });
      expect(result.success, JSON.stringify(result.errors)).toBe(true);
      const module = new WebAssembly.Module(result.binary);
      expect(WebAssembly.Module.imports(module)).toEqual([]);
      expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(1);
    });
  }
}
