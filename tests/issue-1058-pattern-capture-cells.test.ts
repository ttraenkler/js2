// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";
import { readStandaloneException } from "./dogfood/upstream-suite-worker-protocol.mjs";

const graph = `
interface Item {value:number;items:Item[];kind:number}
function transform(context:{bias:number}) {
 const {bias}=context;
 let current:Item;let scope=0;
 return dispatch;
 function dispatch(node:Item):Item {return node.kind===1?bundle(node):file(node);}
 function bundle(node:Item):Item {return {value:node.value,kind:1,items:node.items.map(file)};}
 function file(node:Item):Item {current=node;const result=save(node,visit);current=undefined!;return result;}
 function save(node:Item,f:(n:Item)=>Item):Item {const old=scope;scope++;const result=f(node);scope=old;return result;}
 function visit(node:Item):Item {return {value:current.value+bias+scope,kind:0,items:[]};}
}
export function run():number {
 const a=transform({bias:10}),b=transform({bias:20});
 const node={value:0,kind:1,items:[{value:2,kind:0,items:[]},{value:3,kind:0,items:[]}]};
 return a(node).items[0].value*100+b(node).items[1].value;
}`;
const cases: [string, string, number][] = [
  [
    "block pattern preserves body binding",
    `function make(){{const {x}={x:9};}const f=read;const x=3;return f;function read(){return x;}}export function run():number{return make()();}`,
    3,
  ],
  [
    "abrupt later element",
    `let saved:()=>number=()=>0;function make(){saved=read;const {a=3,b=fail()}={};function read(){return a;}function fail():number{throw 9;}}export function run():number{try{make();}catch{}return saved();}`,
    3,
  ],
  [
    "absent leaf",
    `function make(){const {value}={};return read;function read(){return value===undefined?1:0;}}export function run():number{return make()();}`,
    1,
  ],
  [
    "object rest",
    `function make(source:{x:number;y:number}){const {x,...rest}=source;return read;function read(){return x+rest.y;}}export function run():number{return make({x:3,y:7})();}`,
    10,
  ],
  ["typed object", graph, 1324],
  ["opaque object", graph.replace("context:{bias:number}", "context:any"), 1324],
  ["nested object", graph.replace("const {bias}=context;", "const {inner:{bias}}={inner:context};"), 1324],
  [
    "array",
    graph
      .replace("context:{bias:number}", "context:number[]")
      .replace("const {bias}=context;", "const [bias]=context;")
      .replace("transform({bias:10})", "transform([10])")
      .replace("transform({bias:20})", "transform([20])"),
    1324,
  ],
  [
    "default",
    graph
      .replace("context:{bias:number}", "context:{bias?:number}")
      .replace("const {bias}=context;", "const {bias=10}=context;")
      .replace("transform({bias:10})", "transform({})"),
    1324,
  ],
  [
    "early closure",
    graph
      .replace("const {bias}=context;", "const early=dispatch;const {bias}=context;")
      .replace("return dispatch;", "return early;"),
    1324,
  ],
  [
    "element order",
    `function make(){const {a=3,b=read()}={};return b;function read(){return a;}}export function run():number{return make();}`,
    3,
  ],
  [
    "later element TDZ",
    `function make(){const {a=read(),b=4}={};return a;function read(){return b;}}export function run():number{try{make();return 0;}catch(e){return e instanceof ReferenceError?1:2;}}`,
    1,
  ],
  [
    "mutable leaf",
    `function make(){let {x}={x:1};const f=read;x++;return f;function read(){return x;}}export function run():number{return make()();}`,
    2,
  ],
  [
    "parameter shadow",
    `function make(){const {x}={x:1};return read;function read(){return x*10+shadow(4);}function shadow(x:number){return x;}}export function run():number{return make()();}`,
    14,
  ],
  [
    "array rest",
    `function make(xs:number[]){const [first,...rest]=xs;return read;function read(){return first+rest.length;}}export function run():number{return make([3,4,5])();}`,
    5,
  ],
];

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
