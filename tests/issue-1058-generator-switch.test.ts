// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import { analyzeSource } from "../src/checker/index.js";
import { createCodegenContext } from "../src/codegen/context/create-context.js";
import { isNativeGeneratorCandidate } from "../src/codegen/generators-native.js";
import { createEmptyModule } from "../src/ir/types.js";
import { ts } from "../src/ts-api.js";

async function build(source: string, experimentalIR: boolean) {
  const result = await compile(source, { target: "standalone", experimentalIR });
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  return new WebAssembly.Instance(module).exports.run as (n?: number) => number;
}

for (const experimentalIR of [false, true]) {
  it(`preserves selector order, grouped cases, default and fall-through (IR=${experimentalIR})`, async () => {
    const run = await build(
      `export function run(n: number) { let reads=0, probes=0;
      function key(n:number) { reads++; return n; }
      function probe(n:number) { probes=probes*10+n; return n; }
      function* g() { switch(key(n)) {
        case probe(1): case probe(2): yield 10; if(n===1)break; yield 20;
        default: yield 30;
        case probe(3): yield 40; break;
      } yield 50; }
      const iter=g(); if(reads!==0 || probes!==0)return -1;
      let sum=0; for(const value of iter)sum+=value;
      return sum*10000+reads*1000+probes;
    }`,
      experimentalIR,
    );
    for (const [input, expected] of [
      [1, 601001],
      [2, 1501012],
      [3, 901123],
      [0, 1201123],
    ]) {
      expect(run(input)).toBe(expected);
    }
  });

  it(`uses strict case equality and object identity (IR=${experimentalIR})`, async () => {
    const run = await build(
      `export function run() {
      const object={x:1};
      function* g(value:any) { switch(value) {
        case 1: yield 1; break; case true: yield 2; break; case '1': yield 3; break;
        case object: yield 4; break; case NaN: yield 99; break; default: yield 5;
      } }
      let answer=0; for(const value of [1,true,'1',object,{x:1},NaN]) {
        for(const result of g(value))answer=answer*10+result;
      } return answer;
    }`,
      experimentalIR,
    );
    expect(run()).toBe(123455);
  });

  it(`routes nested switch breaks and outer-loop continues (IR=${experimentalIR})`, async () => {
    const run = await build(
      `export function run() { let updates=0;
      function* g() { for(let i=0;i<3;i++,updates++) { switch(i) {
        case 0: yield 1; continue;
        case 1: for(let j=0;j<3;j++){if(j===1)break;}
          switch(i+1){case 2: yield 2; break; default: yield 99;} break;
        default: yield 3; break;
      } yield 4; } }
      let sequence=0;for(const value of g())sequence=sequence*10+value;
      return sequence*10+updates;
    }`,
      experimentalIR,
    );
    expect(run()).toBe(124343);
  });

  it(`keeps enclosing finally execution after a switch break (IR=${experimentalIR})`, async () => {
    const run = await build(
      `export function run() { let cleanup=0;
      function* g(n:number) { try { switch(n) {case 1: yield 2; break; default: yield 3;} }
        finally {cleanup++;} yield 4; }
      let answer=0;for(const value of g(1))answer=answer*10+value;
      return answer*10+cleanup;
    }`,
      experimentalIR,
    );
    expect(run()).toBe(241);
  });

  it(`continues after an unmatched switch without a default (IR=${experimentalIR})`, async () => {
    const run = await build(
      `export function run() {
      function* g(n:number){switch(n){case 1:yield 99;break;}yield 7;}
      let answer=0;for(const value of g(2))answer+=value;return answer;
    }`,
      experimentalIR,
    );
    expect(run()).toBe(7);
  });

  it(`runs checker-shaped object yields inside a for-of switch (IR=${experimentalIR})`, async () => {
    const run = await build(
      `
      interface Property {kind:number;name:string;value?:number;skip?:boolean;}
      function* elements(properties:Property[]) {
        for(const prop of properties) {
          if(prop.skip)continue;
          const type={flags:1};if(!type || (type.flags & 2))continue;
          switch(prop.kind) {
            case 1:case 2:yield {name:prop.name,value:undefined,type};break;
            case 3:yield {name:prop.name,value:prop.value,type};break;
            default:throw new Error('unexpected property');
          }
        }
      }
      export function run() {let answer=0;
        for(const item of elements([{kind:1,name:'a'},{kind:3,name:'bb',value:7},{kind:4,name:'skip',skip:true}])) {
          answer+=item.name.length+item.type.flags*10+(item.value===undefined?0:item.value);
        }return answer;
      }
    `,
      experimentalIR,
    );
    expect(run()).toBe(30);
  });
}

it.each([
  "switch(1){case 1:let x=1;yield x;break;}",
  "switch(1){case 1:try {yield 1;break;} finally {side++;}}",
  "outer: switch(1){case 1:yield 1;break outer;}",
  "switch(yield 1){case 1:yield 2;break;}",
  "switch(1){case yield 1:yield 2;break;}",
])("rejects a switch route without modeled scope or unwind: %s", (body) => {
  const ast = analyzeSource(`let side=0;function* g(){${body}}`);
  const declaration = ast.sourceFile.statements.find(ts.isFunctionDeclaration)!;
  const ctx = createCodegenContext(createEmptyModule(), ast.checker, { standalone: true });
  expect(isNativeGeneratorCandidate(ctx, declaration)).toBe(false);
});
