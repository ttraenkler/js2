// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";

const definitions = `interface File{fileName:string;text:string;} interface Related{code:number;file:File|undefined;start:number|undefined;length:number|undefined;messageText:string;} interface Diagnostic extends Related{relatedInformation?:Related[];} interface Detached extends Diagnostic{file:undefined;fileName:string;start:number;length:number;} function create(code:number):Detached{return{file:undefined,fileName:'file.ts',start:0,length:1,messageText:'error',code};}`;
const mutations = [
  ["assignment control", "d.relatedInformation=related;"],
  ["property spread", "d.relatedInformation.push(...related);"],
  ["loop control", "for(const item of related)d.relatedInformation.push(item);"],
  ["local alias spread", "const a=d.relatedInformation;a.push(...related);"],
  ["single push control", "d.relatedInformation.push(related[0]);"],
] as const;
const cases: readonly (readonly [string, string, number])[] = [
  ...mutations.map(
    ([name, mutation]) =>
      [
        name,
        definitions +
          `function add<T extends Diagnostic>(d:T,...related:Related[]):T{if(!related.length)return d;if(!d.relatedInformation)d.relatedInformation=[];${mutation}return d;} export function run(){const d=add(create(1),create(7));const a=d.relatedInformation;if(!a||a.length!==1)return -1;const r=a[0];if(!r||r.file!==undefined||r.start!==0||r.length!==1)return -2;return r.code;}`,
        7,
      ] as const,
  ),
  [
    "mixed spreads preserve evaluation order",
    `let calls=0;function source(n:number){calls=calls*10+n;return [n];} export function run(){const a=[0];const length=a.push(1,...source(2),3,...source(4));return length===5&&calls===24&&a.join(',')==='0,1,2,3,4'?1:0;}`,
    1,
  ],
  [
    "self spread captures the original prefix",
    `export function run(){const a=[2,3];const length=a.push(...a);return length===4&&a.join(',')==='2,3,2,3'?1:0;}`,
    1,
  ],
  [
    "empty spread is a no-op",
    `export function run(){const a=[2];const length=a.push(...[]);return length===1&&a[0]===2?1:0;}`,
    1,
  ],
  [
    "generator spread uses iterator values",
    `function* source(){yield 2;yield 3;} export function run(){const a=[1];const length=a.push(...source());return length===3&&a.join(',')==='1,2,3'?1:0;}`,
    1,
  ],
];

for (const experimentalIR of [false, true]) {
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
      const result = await compile(source, { target: "standalone", experimentalIR });
      expect(result.success, JSON.stringify(result.errors)).toBe(true);
      const module = new WebAssembly.Module(result.binary);
      expect(WebAssembly.Module.imports(module)).toEqual([]);
      expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(expected);
    });
  }
}
