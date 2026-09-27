// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";

const find = `function find(parent:any,child:any):number{for(const name in parent){if(Object.prototype.hasOwnProperty.call(parent,name)&&parent[name]===child)return 1;}return 0;}`;
const cases = [
  [
    "class array child",
    `interface N{kind:number;children?:N[]} class Node implements N{kind=1;children:N[]|undefined;} function visit(n:N,cb:(n:N[])=>void){if(n.children)cb(n.children)} export function run(){const n:N=new Node();n.children=[new Node()];let result=0;visit(n,c=>{result=find(n,c)});return result}`,
    1,
  ],
  [
    "derived array child",
    `interface N{kind:number} interface P extends N{children:N[]} class Node implements N{kind=1;} class Parent extends Node{children:N[]=[];} function visit(n:P,cb:(n:N[])=>void){cb(n.children)} export function run(){const n:P=new Parent();n.children=[new Node()];let result=0;visit(n,c=>{result=find(n,c)});return result}`,
    1,
  ],
  [
    "plain array child",
    `interface N{kind:number;children?:N[]} function visit(n:N,cb:(n:N[])=>void){if(n.children)cb(n.children)} export function run(){const n:N={kind:1,children:[{kind:2}]};let result=0;visit(n,c=>{result=find(n,c)});return result}`,
    1,
  ],
  [
    "distinct arrays remain distinct",
    `function same(a:any,b:any){return a===b} export function run(){const a=[1,2],b=[1,2];return same(a,b)?0:1}`,
    1,
  ],
  [
    "primitive equality and NaN retain semantics",
    `function same(a:any,b:any){return a===b} export function run(){const n:any=NaN;return !same(n,n)&&same(null,null)&&same(undefined,undefined)&&!same(null,undefined)&&same(2,2)&&!same(2,'2')&&same('x','x')&&same(true,true)?1:0}`,
    1,
  ],
] as const;

for (const experimentalIR of [false, true]) {
  for (const [name, body, expected] of cases) {
    it(`${name} IR=${experimentalIR}`, async () => {
      const source = find + body;
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
