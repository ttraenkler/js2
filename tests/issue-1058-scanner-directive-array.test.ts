// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";

const declaration = `interface D {range:{pos:number;end:number};type:number;}`;
const cases = [
  [
    "for-of reads a readonly array through a narrowed optional result",
    `interface Identifier {kind:number;} interface Identifiers {identifiers:readonly Identifier[];isCompleteFix:boolean;} function get(n:number):Identifiers|undefined {return n?{identifiers:[{kind:7}],isCompleteFix:true}:undefined;} export function run(){const identifiers=get(1);if(!identifiers)return 0;let n=0;for(const identifier of identifiers.identifiers)n+=identifier.kind;return n;}`,
    7,
  ],
  [
    "declared class implementer receives optional scanner array",
    `interface N {kind:number;commentDirectives?:D[];} class Node implements N {kind=1;} function scanner(){let value:D[]|undefined;return {get:()=>value};} function make():N{return new Node();} export function run(){const n=make();n.commentDirectives=scanner().get();return (n as any).commentDirectives===undefined?1:0;}`,
    1,
  ],
  [
    "reference union distinguishes undefined, null and a live array",
    `function choose(n:number):D[]|null|undefined {if(n===0)return undefined;if(n===1)return null;return [{range:{pos:1,end:3},type:7}];} function inspect(value:any){return value===undefined?1:value===null?2:value[0].type;} export function run(){return inspect(choose(0))*100+inspect(choose(1))*10+inspect(choose(2));}`,
    127,
  ],
  [
    "optional array argument preserves undefined on return through any",
    `function echo(value:D[]|undefined):any{return value;} export function run(){return echo(undefined)===undefined?1:0;}`,
    1,
  ],
  [
    "interface-typed node receives optional scanner array",
    `interface N {kind:number;commentDirectives?:D[];} class Node {kind=1;} function scanner(){let value:D[]|undefined;return {get:()=>value};} function make():N{return new Node();} export function run(){const n=make();n.commentDirectives=scanner().get();return (n as any).commentDirectives===undefined?1:0;}`,
    1,
  ],
  [
    "object node receives optional scanner array",
    `interface N {kind:number;commentDirectives?:D[];} function scanner(){let value:D[]|undefined;return {get:()=>value};} function make():N{return {kind:1};} export function run(){const n=make();n.commentDirectives=scanner().get();return (n as any).commentDirectives===undefined?1:0;}`,
    1,
  ],
  [
    "generic append retains directive elements",
    `function append<T>(a:T[]|undefined,d:T):T[]{if(a)a.push(d);else a=[d];return a;} function scanner(){let value:D[]|undefined;return {get:()=>value,set:()=>{value=append(value,{range:{pos:1,end:3},type:7});}};} export function run(){const s=scanner();s.set();let n=0;for(const d of s.get()!){const {range,type}=d;n+=range.end+type;}return n;}`,
    10,
  ],
  [
    "optional array return",
    `function get():D[]|undefined {let value:D[]|undefined;return value;} export function run(){return get()===undefined?1:0;}`,
    1,
  ],
  [
    "scanner closure initial value",
    `function scanner(){let value:D[]|undefined;return {get:()=>value,set:()=>{value=[{range:{pos:1,end:3},type:7}];}};} export function run(){const s=scanner();return s.get()===undefined?1:0;}`,
    1,
  ],
  [
    "scanner closure array elements",
    `function scanner(){let value:D[]|undefined;return {get:()=>value,set:()=>{value=[{range:{pos:1,end:3},type:7}];}};} export function run(){const s=scanner();s.set();let n=0;for(const d of s.get()!){const {range,type}=d;n+=range.end+type;}return n;}`,
    10,
  ],
  [
    "append retains directive elements",
    `function append(a:D[]|undefined,d:D):D[]{if(a)a.push(d);else a=[d];return a;} function scanner(){let value:D[]|undefined;return {get:()=>value,set:()=>{value=append(value,{range:{pos:1,end:3},type:7});}};} export function run(){const s=scanner();s.set();let n=0;for(const d of s.get()!){const {range,type}=d;n+=range.end+type;}return n;}`,
    10,
  ],
] as const;

for (const experimentalIR of [false, true]) {
  for (const [name, body, expected] of cases) {
    it(`${name} IR=${experimentalIR}`, async () => {
      const source = declaration + body;
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
