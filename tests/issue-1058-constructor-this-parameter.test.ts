// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile, compileMulti } from "../src/index.js";
import { runtimeFunctionParameters } from "../src/ir/runtime-function-parameters.js";
import { ts } from "../src/ts-api.js";

it("erases only the receiver annotation and retains exact runtime parameter nodes", () => {
  const source = ts.createSourceFile(
    "input.ts",
    "function F(this: object, n: number, ...rest: number[]) {}",
    ts.ScriptTarget.Latest,
    true,
  );
  const declaration = source.statements[0] as ts.FunctionDeclaration;
  const parameters = runtimeFunctionParameters(declaration);
  expect(parameters).toEqual([declaration.parameters[1], declaration.parameters[2]]);
  expect(parameters[0]).toBe(declaration.parameters[1]);
  expect(declaration.parameters).toHaveLength(3);
});

for (const experimentalIR of [false, true]) {
  for (const optimize of [false, true]) {
    it(`cached NodeLinks construction IR=${experimentalIR} optimize=${optimize}`, async () => {
      const types = `export const enum NodeCheckFlags { None=0, TypeChecked=1 }
        export interface NodeLinks { flags: NodeCheckFlags; resolvedType?: Type; }
        export interface Type { flags: number; symbol?: Symbol; }
        export interface Symbol { name: string; links?: NodeLinks; }
        export interface Node { id: number; }`;
      const checker = `function NodeLinks(this: NodeLinks) { this.flags = NodeCheckFlags.None; }
        export function createTypeChecker() {
          const nodeLinks: NodeLinks[] = [];
          function getNodeId(node: Node): number { return node.id; }
          function getNodeLinks(node: Node): NodeLinks {
            const nodeId = getNodeId(node);
            return nodeLinks[nodeId] || (nodeLinks[nodeId] = new (NodeLinks as any)());
          }
          return { check(node: Node) {
            const links = getNodeLinks(node);
            const old = links.flags;
            links.flags = NodeCheckFlags.TypeChecked;
            return old;
          } };
        }`;
      const entry = `export function run(): number {
        const checker = createTypeChecker(); const other = createTypeChecker();
        return checker.check({id:2}) + checker.check({id:2})*10 + other.check({id:2})*100;
      }`;
      const native: { run?: () => number } = {};
      new Function(
        "exports",
        ts.transpileModule(`${types}\n${checker}\n${entry}`, {
          compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
        }).outputText,
      )(native);
      expect(native.run!()).toBe(10);
      const result = await compileMulti(
        {
          "./types.ts": types,
          "./checker.ts": `import {NodeLinks,NodeCheckFlags,Node} from './types.js';\n${checker}`,
          "./entry.ts": `import {createTypeChecker} from './checker.js';\n${entry}`,
        },
        "./entry.ts",
        { target: "standalone", experimentalIR, optimize },
      );
      expect(result.success, JSON.stringify(result.errors)).toBe(true);
      const module = new WebAssembly.Module(result.binary);
      expect(WebAssembly.Module.imports(module)).toEqual([]);
      expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(10);
    });
  }
  for (const captured of [false, true]) {
    it(`imported receiver annotation IR=${experimentalIR} captured=${captured}`, async () => {
      const result = await compileMulti(
        {
          "./types.ts": `export enum NodeCheckFlags {None=0}
          export interface NodeLinks {flags:NodeCheckFlags; calculatedFlags?:NodeCheckFlags;}`,
          "./entry.ts": `import {NodeLinks,NodeCheckFlags} from './types.js';
          ${captured ? "function make(seed:number){" : ""}
          function NodeLinks(this:NodeLinks){this.flags=${captured ? "seed" : "NodeCheckFlags.None"};}
          ${captured ? "return new (NodeLinks as any)();}" : ""}
          export function run():number {
            return ${captured ? "make(7).flags*10+make(3).flags" : "new (NodeLinks as any)().flags+73"};
          }`,
        },
        "./entry.ts",
        { target: "standalone", experimentalIR },
      );
      expect(result.success, JSON.stringify(result.errors)).toBe(true);
      const module = new WebAssembly.Module(result.binary);
      expect(WebAssembly.Module.imports(module)).toEqual([]);
      expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(73);
    });
  }
  for (const typedThis of [false, true]) {
    for (const argumentsRead of [false, true]) {
      it(`constructor argument slots IR=${experimentalIR} typedThis=${typedThis} arguments=${argumentsRead}`, async () => {
        const source = `
          interface NodeLinks { flags: number; }
          function NodeLinks(${typedThis ? "this: NodeLinks," : ""} n: number) {
            this.flags = n ${argumentsRead ? "+ arguments.length * 10 + arguments[1]" : ""};
          }
          export function run(): number { return new (NodeLinks as any)(3, 4).flags; }
        `;
        const native: { run?: () => number } = {};
        new Function(
          "exports",
          ts.transpileModule(source, {
            compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
          }).outputText,
        )(native);
        const expected = argumentsRead ? 27 : 3;
        expect(native.run!()).toBe(expected);
        const result = await compile(source, { target: "standalone", experimentalIR });
        expect(result.success, JSON.stringify(result.errors)).toBe(true);
        const module = new WebAssembly.Module(result.binary);
        expect(WebAssembly.Module.imports(module)).toEqual([]);
        expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(expected);
      });
    }
    it(`zero-argument NodeLinks constructor IR=${experimentalIR} typedThis=${typedThis}`, async () => {
      const result = await compile(
        `
        interface NodeLinks { flags: number; }
        function NodeLinks(${typedThis ? "this: NodeLinks" : ""}) { this.flags = 0; }
        export function run(): number { return new (NodeLinks as any)().flags + 7; }
      `,
        { target: "standalone", experimentalIR },
      );
      expect(result.success, JSON.stringify(result.errors)).toBe(true);
      const module = new WebAssembly.Module(result.binary);
      expect(WebAssembly.Module.imports(module)).toEqual([]);
      expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(7);
    });
  }
}
