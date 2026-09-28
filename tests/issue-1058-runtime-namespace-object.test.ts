// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile, compileMulti } from "../src/index.js";
import { ts } from "../src/ts-api.js";
import { detectEarlyErrors } from "../src/compiler/early-errors/index.js";

it("admits namespace internal aliases without admitting nested module imports", () => {
  const errors = (source: string, kind: ts.ScriptKind = ts.ScriptKind.TS) =>
    detectEarlyErrors(ts.createSourceFile("input.ts", source, ts.ScriptTarget.Latest, true, kind)).filter((error) =>
      error.message.includes("declarations may only appear"),
    );
  expect(errors("namespace N {export import A = Other;}")).toEqual([]);
  for (const kind of [ts.ScriptKind.JS, ts.ScriptKind.JSX])
    expect(errors("namespace N {export import A = Other;}", kind)).toHaveLength(1);
  for (const source of [
    "function f(){import A = Other;}",
    "namespace N {import A from './other.js';}",
    "namespace N {import A = require('./other.js');}",
  ])
    expect(errors(source)).toHaveLength(1);
});

const cases = [
  {
    name: "exported namespace aliases publish the target object",
    source: `namespace N {export namespace B {export const value=73;} export import C=B;}
      export function run(){return N.C===N.B ? N.C.value : -1;}`,
  },
  {
    name: "qualified namespace alias targets retain identity",
    source: `namespace N {export namespace B {export namespace Inner {export const value=73;}}
      export import C=B.Inner;}
      export function run(){return N.C===N.B.Inner ? N.C.value : -1;}`,
  },
  {
    name: "internal reads observe replacement of an exported alias property",
    source: `namespace N {export namespace B {export const value=1;} export import C=B;
      export function read(){return C.value;}}
      export function run(){(N as any).C={value:73};return N.read();}`,
  },
  {
    name: "internal member calls observe replacement of an exported alias",
    source: `namespace N {export namespace B {export function value(){return 1;}} export import C=B;
      export function read(){return C.value();}}
      export function run(){(N as any).C={value(){return 73;}};return N.read();}`,
  },
  {
    name: "destructured exports publish their binding values",
    source: `namespace N {export const {value}={value:73};}
      export function run(){return N.value;}`,
  },
  {
    name: "object pattern defaults read earlier exported bindings",
    source: `namespace N {export const {x=7,y=x*10+3}={};}
      export function run(){return N.y;}`,
  },
  {
    name: "array pattern defaults read earlier exported bindings",
    source: `namespace N {export const [x=7,y=x*10+3]=[];}
      export function run(){return N.y;}`,
  },
  {
    name: "later source getters observe earlier publications",
    source: `namespace N {export const {x,y}={x:7,get y(){return N.x*10+3;}};}
      export function run(){return N.y;}`,
  },
  {
    name: "earlier source getters do not see later own properties",
    source: `namespace N {export const {x,y}={
      get x(){return Object.prototype.hasOwnProperty.call(N,'y')?-1:7;},y:3};}
      export function run(){return N.x*10+N.y;}`,
  },
  {
    name: "nested and rest bindings publish independently",
    source: `namespace N {export const {p:{x},...rest}={p:{x:7},y:3};}
      export function run(){return N.x*10+N.rest.y;}`,
  },
  {
    name: "uninitialized exports have no own property and remain live after deletion",
    source: `namespace N { export let value: number | undefined; export function read(){return value;} }
      export function run(){
        const early = Object.prototype.hasOwnProperty.call(N,"value");
        N.value=4; const first=N.read(); delete (N as any).value;
        return !early && first===4 && N.read()===undefined ? 73 :
          (early ? 1 : 0) + (first===4 ? 2 : 0) + (N.read()===undefined ? 4 : 0);
      }`,
  },
  {
    name: "each declarator publishes before the next initializer",
    source: `namespace N { export let first = (N as any).second === undefined ? 7 : -1,
        second = first + 3; }
      export function run(){ return N.first*10+N.second-7; }`,
  },
  {
    name: "merged declarations reuse the object seen by an intervening alias",
    source: `namespace N { export let value=7; }
      const alias=N;
      namespace N { export const next=value+3; }
      export function run(){ return alias===N && alias.next===10 ? N.value*10+3 : -1; }`,
  },
  {
    name: "exported functions retain their local binding after public replacement",
    source: `namespace N { export function value(){return 7;} export function local(){return value();} }
      export function run(){ const alias=N; alias.value=()=>3;
        return N.local()*10+N.value(); }`,
  },
  {
    name: "ordinary writable enumerable configurable data properties",
    source: `namespace N { export let value=7; export function read(){return value;} }
      export function run(){ const d=Object.getOwnPropertyDescriptor(N,"value");
        return d && d.value===7 && d.writable && d.enumerable && d.configurable && !d.get ? 73 : -1; }`,
  },
  {
    name: "function namespace augmentation preserves the callable identity",
    source: `function N(){return 7;} const before=N;
      namespace N { export const value=3; }
      export function run(){ return before===N ? before()*10+N.value : -1; }`,
  },
  {
    name: "nested namespaces own distinct same-named exports",
    source: `namespace Outer { export let value=7; export namespace Inner { export let value=3; }
        export function read(){return value*10+Inner.value;} }
      export function run(){ return Outer.read(); }`,
  },
  {
    name: "dotted namespace components publish their terminal object",
    source: `namespace A.B {export let value=73;}
      export function run(){const alias=A;return alias.B.value;}`,
  },
  {
    name: "nested exported dotted groups retain merged component identities",
    source: `namespace Root {export namespace A.B {export let value=70;}}
      const before=Root.A;
      namespace Root {export namespace A.B {export let next=3;}}
      export function run(){return before===Root.A ? before.B.value+Root.A.B.next : -1;}`,
  },
  {
    name: "class namespace augmentation retains its constructor and static field storage",
    source: `class N {static value=70;} const before=N;
      namespace N {export const next=3;}
      export function run(){return before===N ? N.value+N.next : -1;}`,
  },
  {
    name: "enum namespace augmentation retains its object and reverse mappings",
    source: `enum N {value=70} const before=N;
      namespace N {export const next=3;}
      export function run(){return before===N && N[70]==='value' ? N.value+N.next : -1;}`,
  },
  {
    name: "a parameter shadows the exported binding",
    source: `namespace N { export let value=7; export function read(value:number){return value;} }
      export function run(){ return N.value*10+N.read(3); }`,
  },
];

for (const experimentalIR of [false, true]) {
  for (const { name, source } of cases) {
    it(`${name} IR=${experimentalIR}`, async () => {
      const native: { run?: () => number } = {};
      new Function(
        "exports",
        ts.transpileModule(source, {
          compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
        }).outputText,
      )(native);
      expect(native.run!()).toBe(73);
      const result = await compile(source, { target: "standalone", experimentalIR });
      expect(result.success, JSON.stringify(result.errors)).toBe(true);
      const module = new WebAssembly.Module(result.binary);
      expect(WebAssembly.Module.imports(module)).toEqual([]);
      expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(73);
    });
  }
  for (const barrel of [false, true])
    for (const callback of [false, true]) {
      it(`logging-host install and restore IR=${experimentalIR} barrel=${barrel} callback=${callback}`, async () => {
        const result = await compileMulti(
          {
            "./debug.ts": `export namespace Debug {
          export let loggingHost: {log(n:number):void}|undefined;
          export function write(n:number){if(loggingHost)loggingHost.log(n);}
        }`,
            "./barrel.ts": `export * from './debug.js';`,
            "./entry.ts": `import * as ts from './${barrel ? "barrel" : "debug"}.js';
          export function run(){ const saved=ts.Debug.loggingHost; let count=0;
            ts.Debug.loggingHost={log(n:number){count+=n;}};
            ${callback ? "ts.Debug.write(3);" : "ts.Debug.loggingHost.log(3);"}
            const installed=ts.Debug.loggingHost; ts.Debug.loggingHost=saved;
            return count*10+(installed!==ts.Debug.loggingHost?7:0);
          }`,
          },
          "./entry.ts",
          { target: "standalone", experimentalIR },
        );
        expect(result.success, JSON.stringify(result.errors)).toBe(true);
        const module = new WebAssembly.Module(result.binary);
        expect(WebAssembly.Module.imports(module)).toEqual([]);
        expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(37);
      });
    }
}
