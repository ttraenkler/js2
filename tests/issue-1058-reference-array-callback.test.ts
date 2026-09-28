// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";
import { readStandaloneException } from "./dogfood/upstream-suite-worker-protocol.mjs";

const cases: [string, string, number][] = [];
for (const [name, type, items, value] of [
  ["string", "string", "['a','bb']", "v.length"],
  ["object", "{weight:number}", "[{weight:1},{weight:2}]", "v.weight"],
  ["numeric control", "number", "[1,2]", "v"],
]) {
  cases.push([
    name,
    `function sum(items:${type}[]){let n=0;items.forEach(inc);return n;function inc(v:${type}){n+=${value};}} export function run():number{return sum(${items});}`,
    3,
  ]);
}
cases.push([
  "arrow control",
  `function sum(items:string[]){let n=0;items.forEach(s=>inc(s));return n;function inc(v:string){n+=v.length;}}export function run():number{return sum(['a','bb']);}`,
  3,
]);
cases.push([
  "generator",
  `function* values(items:string[]){let n=0;yield n;items.forEach(inc);yield n;inc('x');yield n;function inc(v:string){n+=v.length;}}export function run():number{const g=values(['a','bb']);g.next();return g.next().value*10+g.next().value;}`,
  34,
]);
cases.push([
  "error baseline helper graph",
  `
function* baseline(messages:string[]):IterableIterator<[string,string,number]> {
 let outputLines='';let errorsReported=0;let firstLine=true;
 function newLine(){if(firstLine){firstLine=false;return '';}return '\\r\\n';}
 function outputErrorText(message:string){
  const lines=message.split('\\n').filter(s=>s.length>0).map(s=>'!!! '+s);
  lines.forEach(e=>outputLines+=newLine()+e);errorsReported++;
 }
 yield ['summary','summary',messages.length];
 messages.forEach(outputErrorText);
 yield ['global',outputLines,errorsReported];
 outputLines='';errorsReported=0;outputErrorText('last');
 yield ['file',outputLines,errorsReported];
}
export function run():number {
 const a=baseline(['one\\ntwo','three']),b=baseline(['other']);
 const a0=a.next().value,b0=b.next().value;
 const a1=a.next().value,b1=b.next().value,a2=a.next().value;
 return a0[2]===2&&b0[2]===1&&a1[1]==='!!! one\\r\\n!!! two\\r\\n!!! three'&&a1[2]===2&&b1[1]==='!!! other'&&a2[1]==='\\r\\n!!! last'&&a2[2]===1?1:0;
}`,
  1,
]);

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
      const instance = new WebAssembly.Instance(module);
      try {
        expect((instance.exports.run as () => number)()).toBe(expected);
      } catch (error) {
        throw new Error(readStandaloneException(error, instance.exports) || String(error));
      }
    });
