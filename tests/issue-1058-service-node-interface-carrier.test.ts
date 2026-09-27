// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compileMulti } from "../src/index.js";
import { collectClassImplementedInterfaceNames } from "../src/ir/class-interface-heritage.js";
import { interfaceHasClassImplementer } from "../src/codegen/interface-class-implementer.js";
for (const experimentalIR of [false, true])
  it(`linked services allocator IR=${experimentalIR}`, async () => {
    const sources: Record<string, string> = {
      "./types.ts": `export interface Node {kind:number;pos:number;parent?:Node;getKind():number;} export interface Identifier extends Node {text:string;}`,
      "./utilities.ts": `import {type Node} from './types.js'; function Node(this:Node,kind:number,pos:number){this.kind=kind;this.pos=pos;} export let objectAllocator={getIdentifierConstructor:()=>Node as any}; export function setObjectAllocator(value:typeof objectAllocator){objectAllocator=value;}`,
      "./services.ts": `import {type Node,type Identifier} from './types.js'; import {setObjectAllocator} from './utilities.js'; class Token<TKind extends number> implements Node {parent?:Node;constructor(public kind:TKind,public pos:number){}getKind():number{return this.kind;}} class IdentifierObject extends Token<80> implements Identifier {text='';} setObjectAllocator({getIdentifierConstructor:()=>IdentifierObject});`,
      "./base.ts": `import {type Node} from './types.js';import {objectAllocator} from './utilities.js';export function createFactory(){let C:new(kind:80,pos:number)=>Node;return {create};function create(kind:80):Node{return new (C || (C=objectAllocator.getIdentifierConstructor()))(kind,-1);}}`,
      "./entry.ts": `import './services.js';import {type Identifier} from './types.js';import {createFactory} from './base.js';const factory=createFactory();export function run(){const node=factory.create(80) as Identifier;node.text='x';return node.kind===80&&node.pos===-1&&node.text==='x'?1:0;}`,
    };
    const modules = new Map<string, any>();
    const require = (name: string): any => {
      name = name.replace(/\.js$/, ".ts");
      if (modules.has(name)) return modules.get(name);
      const exports = {};
      modules.set(name, exports);
      new Function(
        "exports",
        "require",
        ts.transpileModule(sources[name]!, {
          compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
        }).outputText,
      )(exports, require);
      return exports;
    };
    expect(require("./entry.ts").run()).toBe(1);
    const r = await compileMulti(sources, "./entry.ts", { target: "standalone", experimentalIR });
    expect(r.success, JSON.stringify(r.errors)).toBe(true);
    const m = new WebAssembly.Module(r.binary);
    expect(WebAssembly.Module.imports(m)).toEqual([]);
    expect((new WebAssembly.Instance(m).exports.run as () => number)()).toBe(1);
  });

it("selects interface carriers from source evidence before class registration", () => {
  const source = ts.createSourceFile(
    "input.ts",
    `
   interface Node { getKind(): number; }
   class Token implements Node { getKind() { return 80; } }
   function nested() { class Local implements Nested {} return Local; }
   const Value = class implements Expression {};
   namespace N { export class Value implements Namespaced {} }
   declare class Ambient implements IgnoredClass {}
   declare namespace AmbientSpace { class Value implements IgnoredNamespace {} }
   declare module 'package' { class Value implements IgnoredModule {} }
   declare global { class Value implements IgnoredGlobal {} }
 `,
    ts.ScriptTarget.Latest,
    true,
  );
  const declarationFile = ts.createSourceFile(
    "ambient.d.ts",
    "class Value implements IgnoredFile {}",
    ts.ScriptTarget.Latest,
    true,
  );
  expect([...collectClassImplementedInterfaceNames([source, declarationFile])].sort()).toEqual([
    "Expression",
    "Namespaced",
    "Nested",
    "Node",
  ]);
  const ctx = {
    callableSourceFiles: [source, declarationFile],
    classDeclarationMap: new Map(),
  } as unknown as Parameters<typeof interfaceHasClassImplementer>[0];
  expect(interfaceHasClassImplementer(ctx, "Node")).toBe(true);
  expect(interfaceHasClassImplementer(ctx, "Absent")).toBe(false);
  expect(ctx.classDeclarationMap.size).toBe(0);
});

it("does not memoize incomplete registry answers when no source population is available", () => {
  const source = ts.createSourceFile("fallback.ts", "class C implements I {}", ts.ScriptTarget.Latest, true);
  const ctx = { classDeclarationMap: new Map() } as unknown as Parameters<typeof interfaceHasClassImplementer>[0];
  expect(interfaceHasClassImplementer(ctx, "I")).toBe(false);
  ctx.classDeclarationMap.set("C", source.statements[0] as ts.ClassDeclaration);
  expect(interfaceHasClassImplementer(ctx, "I")).toBe(true);
});
