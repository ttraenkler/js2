// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import { ts } from "../src/ts-api.js";
import { objectMethodEnvironmentOwner } from "../src/ir/object-method-environment.js";

async function check(source: string, experimentalIR: boolean): Promise<void> {
  const native: { run?: () => number } = {};
  new Function(
    "exports",
    ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText,
  )(native);
  const expected = native.run!();
  const result = await compile(source, { target: "standalone", experimentalIR });
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(expected);
}

for (const escaped of [false, true])
  for (const two of [false, true])
    for (const experimentalIR of [false, true])
      for (const open of [false, true]) {
        it(`transitive captures escaped=${escaped} two=${two} IR=${experimentalIR} open=${open}`, async () => {
          await check(
            `interface Resolver {read(v:number):number; readonly marker?:number}
      function factory(seed:number){
        function error(v:number){return seed+v;}
        function check(v:number){return error(v);}
        function build(){const resolver:Resolver={
          ${open ? "get marker(){return 1;}," : ""}read(v:number){return check(v);}
        };return resolver;}
        ${escaped ? 'const callbacks={error};if(callbacks.error(0)<0)throw new Error("negative");' : ""}
        return build();
      }
      export function run(){const a=factory(10);
        ${two ? "const b=factory(20);return a.read(1)*100+b.read(2);" : "return a.read(1);"}
      }`,
            experimentalIR,
          );
        });
      }

const cases = {
  inferred: `function make(n:number){return {read(){return n;}}} export function run(){const a=make(10),b=make(20);return a.read()*100+b.read();}`,
  receiver: `function make(n:number){return {bias:n*2,read(){return n+this.bias;}}} export function run(){const a=make(10),b=make(20);return a.read()*100+b.read();}`,
  mutable: `function make(n:number){return {read(){return ++n;}}} export function run(){const a=make(10),b=make(20);a.read();return a.read()*100+b.read();}`,
  defaults: `function make(n:number){return {read(v=n){return v;}}} export function run(){const a=make(10),b=make(20);return a.read()*100+b.read();}`,
  borrowed: `function make(n:number){return {bias:n*2,read(){return n+this.bias;}}} export function run(){const a=make(10),b=make(20);return a.read.call(b)*100+b.read.call(a);}`,
  borrowedApply: `function make(n:number){return {bias:n*2,read(v:number){return n+this.bias+v;}}} export function run(){const a=make(10),b=make(20);return a.read.apply(b,[1])*100+b.read.apply(a,[2]);}`,
  sameShape: `function make(n:number){const a={read(){return n+1;}},b={read(){return n+2;}};return a.read()*100+b.read();} export function run(){return make(10)+make(20);}`,
};
for (const [name, source] of Object.entries(cases))
  for (const experimentalIR of [false, true]) {
    it(`${name} IR=${experimentalIR}`, () => check(source, experimentalIR));
  }

it("identifies exact allocation owners, not generated frame names or class methods", () => {
  const source = ts.createSourceFile(
    "owners.ts",
    `
    const root={read(){return 1;}};
    function factory(){return {read(){return 2;}};}
    class C {read(){return 3;} build(){return {read(){return 4;}};}}
  `,
    ts.ScriptTarget.Latest,
    true,
  );
  const methods: ts.MethodDeclaration[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isMethodDeclaration(node)) methods.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  expect(methods).toHaveLength(5);
  expect(methods.map((method) => objectMethodEnvironmentOwner(method)?.kind)).toEqual([
    undefined,
    ts.SyntaxKind.FunctionDeclaration,
    undefined,
    undefined,
    ts.SyntaxKind.MethodDeclaration,
  ]);
});
