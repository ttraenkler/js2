// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";

const cases = [
  [
    "self-recursive field preserves undefined before linking and identity afterwards",
    `class Node { next!: Node; value: number; constructor(value:number){this.value=value;} link(next:Node){this.next=next;} } export function run(){const first=new Node(3);const second=new Node(4);const missing=(first as any).next===undefined;first.link(second);return (missing?10:0)+(first.next===second?20:0)+first.next.value;}`,
    34,
  ],
  [
    "mutually recursive fields preserve undefined before linking",
    `class Left {right!:Right; attach(right:Right){this.right=right;}} class Right {left!:Left; attach(left:Left){this.left=left;}} export function run(){const left=new Left();const right=new Right();const missing=(left as any).right===undefined && (right as any).left===undefined;left.attach(right);right.attach(left);return (missing?10:0)+(left.right.left===left?1:0);}`,
    11,
  ],
  [
    "definite-assignment symbol enumerates as undefined",
    `class C { symbol!: { pos: number }; emitNode?: {pos: number}; constructor() {this.emitNode = undefined;} } export function run() { const c:any=new C(); let n=0; for(const k in c) {if(c[k] === undefined) n++; else if(c[k] === null) return -1;} return n;}`,
    2,
  ],
  [
    "required field starts undefined",
    `class C { value: {n:number}; } export function run(){const c:any=new C();return c.value===undefined?1:0;}`,
    1,
  ],
  [
    "call before overwrite observes undefined",
    `interface R {n:number} let seen=0; function observe(x:any){seen=x===undefined?1:2;} class C {value:R; constructor(value:R){observe(this.value);this.value=value;}} export function run(){const c=new C({n:7});return seen*10+c.value.n;}`,
    17,
  ],
  [
    "field initializer observes undefined",
    `interface R {n:number} class C {value:R; seen=this.value===undefined?1:0; constructor(value:R){this.value=value;}} export function run(){const c=new C({n:7});return c.seen+c.value.n;}`,
    8,
  ],
  [
    "overwrite RHS can observe the instance",
    `interface R {n:number} let seen=0; function make(c:any):R{seen=c.value===undefined?1:2;return {n:7};} class C {value:R; constructor(){this.value=make(this);}} export function run(){const c=new C();return seen*10+c.value.n;}`,
    17,
  ],
  [
    "conditional overwrite is not initialization proof",
    `interface R {n:number} class C {value:R; constructor(value:R,set:boolean){if(set)this.value=value;}} export function run(){const missing:any=new C({n:7},false);const present=new C({n:7},true);return (missing.value===undefined?10:0)+present.value.n;}`,
    17,
  ],
] as const;
for (const experimentalIR of [false, true])
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
