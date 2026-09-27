// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";

const classes = `class Base{kind=1;} class Middle extends Base{children!:number[];} class Leaf extends Middle{label!:string;}`;
const summary = `let mask=0,count=0;for(const key of keys){count++;if(key==='kind')mask|=1;if(key==='children')mask|=2;if(key==='label')mask|=4;}return count*100+mask;`;
const cases = [
  ["for-in", `const keys:string[]=[];for(const key in node)keys.push(key);`],
  ["Object.keys", `const keys=Object.keys(node);`],
  ["getOwnPropertyNames", `const keys=Object.getOwnPropertyNames(node);`],
] as const;

for (const experimentalIR of [false, true]) {
  for (const [name, enumeration] of cases) {
    for (const leaf of [false, true]) {
      it(`${name} leaf=${leaf} IR=${experimentalIR}`, async () => {
        const expectedKeys = leaf ? "kind,children,label" : "kind,children";
        const source = `${classes} function inspect(node:any){${enumeration}if(keys.join(',')!=='${expectedKeys}')return -1;${summary}} export function run(){const node=new ${leaf ? "Leaf" : "Middle"}();node.children=[7];${leaf ? "node.label='file';" : ""}return inspect(node);}`;
        const native: { run?: () => number } = {};
        new Function(
          "exports",
          ts.transpileModule(source, {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
          }).outputText,
        )(native);
        const expected = leaf ? 307 : 203;
        expect(native.run!()).toBe(expected);
        const result = await compile(source, { target: "standalone", experimentalIR });
        expect(result.success, JSON.stringify(result.errors)).toBe(true);
        const module = new WebAssembly.Module(result.binary);
        expect(WebAssembly.Module.imports(module)).toEqual([]);
        expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(expected);
      });
    }
  }
}

for (const experimentalIR of [false, true]) {
  for (const dynamic of [false, true]) {
    for (const value of ["9", "undefined"]) {
      it(`declare-only field presence dynamic=${dynamic} value=${value} IR=${experimentalIR}`, async () => {
        const write = dynamic ? `write(node,'brand',${value});` : `node.brand=${value};`;
        const source = `class Base{kind=1;} class Child extends Base{declare brand:any;children!:number[];} function write(node:any,key:string,value:any){node[key]=value;} function owns(node:any){return Object.keys(node).includes('brand');} export function run(){const node=new Child();node.children=[7];const before=owns(node)?0:1;${write}return before*10+(owns(node)&&node.brand===${value}?1:0);}`;
        const native: { run?: () => number } = {};
        new Function(
          "exports",
          ts.transpileModule(source, {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
          }).outputText,
        )(native);
        expect(native.run!()).toBe(11);
        const result = await compile(source, { target: "standalone", experimentalIR });
        expect(result.success, JSON.stringify(result.errors)).toBe(true);
        const module = new WebAssembly.Module(result.binary);
        expect(WebAssembly.Module.imports(module)).toEqual([]);
        expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(11);
      });
    }
  }
  it(`declare redeclaration preserves a base runtime field IR=${experimentalIR}`, async () => {
    const source = `class Base{brand:any=7;} class Child extends Base{declare brand:any;} function owns(node:any){return Object.keys(node).includes('brand');} export function run(){const node=new Child();return owns(node)&&node.brand===7?11:0;}`;
    const native: { run?: () => number } = {};
    new Function(
      "exports",
      ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      }).outputText,
    )(native);
    expect(native.run!()).toBe(11);
    const result = await compile(source, { target: "standalone", experimentalIR });
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(11);
  });
}
