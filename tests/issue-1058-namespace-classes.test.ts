// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile, compileMulti } from "../src/index.js";
import { requiresRuntimeModuleIdentity } from "../src/ir/runtime-module-identity.js";
import { indexIrClassShapesByIdentity } from "../src/ir/class-shape-identity.js";
import { createIrClassId, createIrSourceId } from "../src/ir/identity.js";
import type { IrClassShape } from "../src/ir/nodes.js";
const cases = {
  namespaceStaticRead: `namespace N {export class C {static read(){return 5;}}} export function run(){return N.C.read();}`,
  namespaceStaticReplacement: `namespace N {export class C {static read(){return 1;}}} export function run(){N.C.read=()=>5;return N.C.read();}`,
  namespaceEarlyRead: `function early(){try{return N.C.read();}catch{return 5;}} const result=early(); namespace N {export class C {static read(){return 1;}}} export function run(){return result;}`,
  snapshot: `interface S {getLength():number;} namespace N {class C implements S {constructor(private text:string){} getLength():number{return this.text.length;}} export function make(text:string):S{return new C(text);}} export function run():number{return N.make('hello').getLength();}`,
  exportedSnapshot: `interface S {getLength():number;} export namespace N {class C implements S {constructor(private text:string){} getLength():number{return this.text.length;}} export function make(text:string):S{return new C(text);}} export function run():number{return N.make('hello').getLength();}`,
  siblings: `namespace A {class C {value=2;} export function read():number{return new C().value;}} namespace B {class C {value=3;} export function read():number{return new C().value;}} export function run():number{return A.read()+B.read();}`,
  outer: `class C {value=2;} namespace N {class C {value=3;} export function read():number{return new C().value;}} export function run():number{return new C().value+N.read();}`,
  staticOrder: `let trace=0; namespace N {trace=1; class C {static value=(trace=trace*10+2);} trace=trace*10+3; export function read():number{return C.value;}} export function run():number{return trace===123&&N.read()===12?5:0;}`,
  namespaceCapture: `namespace N {let n=2; class C {read():number{return n;}} n=5; export function read():number{return new C().read();}} export function run():number{return N.read();}`,
  nested: `namespace A {namespace B {class C {value=5;} export function read():number{return new C().value;}} export function read():number{return B.read();}} export function run():number{return A.read();}`,
  exportedConstruction: `namespace A {export class C {value=2;}} namespace B {export class C {value=3;}} export function run():number{return new A.C().value+new B.C().value;}`,
  distinctShapes: `namespace A {class C {constructor(private text:string){} read():number{return this.text.length;}} export function read():number{return new C('hi').read();}} namespace B {class C {constructor(public value:number){} read():number{return this.value;}} export function read():number{return new C(3).read();}} export function run():number{return A.read()+B.read();}`,
};
for (const experimentalIR of [true, false])
  for (const trackIrOutcomes of [true, false])
    for (const [name, source] of Object.entries(cases))
      it(`${name} IR=${experimentalIR} tracking=${trackIrOutcomes}`, async () => {
        const native: { run?: () => number } = {};
        new Function(
          "exports",
          ts.transpileModule(source, {
            compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
          }).outputText,
        )(native);
        expect(native.run!()).toBe(5);
        const r = await compile(source, {
          target: "standalone",
          experimentalIR,
          deferTopLevelInit: true,
          trackIrOutcomes,
        });
        expect(r.success, JSON.stringify(r.errors)).toBe(true);
        const m = new WebAssembly.Module(r.binary);
        expect(WebAssembly.Module.imports(m)).toEqual([]);
        const e = new WebAssembly.Instance(m).exports;
        (e.__module_init as (() => void) | undefined)?.();
        expect((e.run as () => number)()).toBe(5);
      });

it.each([false, true])("keeps linked namespace bodies independent of tracking=%s", async (trackIrOutcomes) => {
  const result = await compileMulti(
    {
      "./snapshot.ts": `export namespace N {class C {constructor(private text:string){} getLength():number{return this.text.length;}} export function length(text:string):number{return new C(text).getLength();}}`,
      "./entry.ts": `import { N } from './snapshot.js'; export function run():number{return N.length('hello');}`,
    },
    "./entry.ts",
    { target: "standalone", experimentalIR: false, trackIrOutcomes },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const instance = new WebAssembly.Instance(module);
  expect((instance.exports.run as () => number)()).toBe(5);
});

it("requires namespace identity only for runtime declarations", () => {
  for (const [source, required] of [
    ["namespace N { export function f(){} }", true],
    ["namespace A.B { export function f(){} }", true],
    ['import * as ns from "./provider.js";', true],
    ['export * as ns from "./provider.js";', true],
    ['import type * as ns from "./provider.js";', false],
    ['export type * as ns from "./provider.js";', false],
    ['import { value } from "./provider.js";', false],
    ["declare namespace N { function f():void; }", false],
    ['declare module "pkg" { function f():void; }', false],
    ["export {}; declare global { function f():void; }", false],
    ["class C {}", false],
  ] as const) {
    expect(requiresRuntimeModuleIdentity(ts.createSourceFile("input.ts", source, ts.ScriptTarget.Latest, true))).toBe(
      required,
    );
  }
  expect(
    requiresRuntimeModuleIdentity(ts.createSourceFile("input.d.ts", "namespace N {}", ts.ScriptTarget.Latest, true)),
  ).toBe(false);
});

it("indexes class shapes by identity and refuses conflicting projections", () => {
  const sourceId = createIrSourceId({ kind: "source", order: 0, sourceKey: "namespace-shapes.ts" });
  const shape = (ordinal: number): IrClassShape => ({
    classId: createIrClassId({ sourceId, lexicalOwnerId: null, declarationKind: "declaration", ordinal }),
    className: "C",
    fields: [],
    methods: [],
    constructorParams: [],
  });
  const first = shape(0);
  const second = shape(1);
  const index = indexIrClassShapesByIdentity([first, second, first]);
  expect(index.size).toBe(2);
  expect(index.get(first.classId)).toBe(first);
  expect(index.get(second.classId)).toBe(second);
  expect(() => indexIrClassShapesByIdentity([first, { ...first }])).toThrow("conflicting projected shapes");
});
