// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compileMulti } from "../src/index.js";

for (const experimentalIR of [false, true]) {
  for (const generic of [false, true]) {
    for (const implementsClause of ["Node", "Literal", "Node, Literal"]) {
      it(`preserves refined class token IR=${experimentalIR} generic=${generic} implements=${implementsClause}`, async () => {
        const sources: Record<string, string> = {
          "./types.ts": `export interface Node {kind:number;pos:number;getKind():number;} export interface Literal extends Node {text:string;}`,
          "./services.ts": `import {type Node,type Literal} from './types.js';class Token implements ${implementsClause} {${implementsClause.includes("Literal") ? "text='';" : ""}constructor(public kind:number,public pos:number){}getKind(){return this.kind;}} export const allocator={getTokenConstructor:()=>Token};`,
          "./base.ts": `import {type Node} from './types.js';import {allocator} from './services.js';export function createFactory(){let C:new(kind:number,pos:number)=>Node;return {create};function create(kind:number):Node{return new (C || (C=allocator.getTokenConstructor()))(kind,-1);}}`,
          "./entry.ts": `import {type Node,type Literal} from './types.js';import {createFactory} from './base.js';const factory=createFactory();type Mutable<T>={-readonly[P in keyof T]:T[P]};${generic ? 'function create<T extends Node>(kind:T["kind"]){return factory.create(kind) as Mutable<T>;}' : "function create(kind:number):Literal{return factory.create(kind) as Literal;}"}export function run(){const node=create${generic ? "<Literal>" : ""}(14);const alias:Node=node;node.text='x';return node===alias&&node.getKind()===14&&node.pos===-1&&node.text==='x'?1:0;}`,
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
        const result = await compileMulti(sources, "./entry.ts", { target: "standalone", experimentalIR });
        expect(result.success, JSON.stringify(result.errors)).toBe(true);
        const module = new WebAssembly.Module(result.binary);
        expect(WebAssembly.Module.imports(module)).toEqual([]);
        expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(1);
      });
    }
  }
}
