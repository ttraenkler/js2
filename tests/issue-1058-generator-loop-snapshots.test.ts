// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";

const cases: [string, string, number][] = [
  ["arrow", `for(const item of [2,4]){saved.push(()=>item);yield item;}`, 24],
  ["function expression", `for(const item of [2,4]){saved.push(function(){return item;});yield item;}`, 24],
  ["object", `for(const item of [{n:2},{n:4}]){saved.push(()=>item.n);yield item.n;}`, 24],
  ["two suspensions", `for(const item of [2,4]){const f=()=>item;saved.push(f);yield item;yield item;}`, 24],
  [
    "filter callback",
    `for(const item of [2,4]){const n=[1,2,3,4].filter(x=>x>item).length;saved.push(()=>n);yield n;}`,
    20,
  ],
];

for (const [name, body, expected] of cases)
  for (const experimentalIR of [true, false])
    it(`${name} retains each iteration IR=${experimentalIR}`, async () => {
      const source = `function* g(saved:(()=>number)[]){${body}}export function run():number{const saved:(()=>number)[]=[];Array.from(g(saved));return saved[0]()*10+saved[1]();}`;
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
      expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(expected);
    });

for (const [name, body] of [
  ["mutable capture", `for(let item of [2,4]){saved.push(()=>item);item++;yield item;}`],
  ["named helper", `for(const item of [2,4]){function f(){return item;}saved.push(f);yield item;}`],
])
  for (const experimentalIR of [true, false])
    it(`retains refusal for ${name} IR=${experimentalIR}`, async () => {
      // Removing the admission guard produces invalid Wasm / runtime failures
      // for these shapes. Keep them visible until per-iteration cells work.
      const result = await compile(
        `function* g(saved:(()=>number)[]){${body}}export function run():number{const saved:(()=>number)[]=[];return Array.from(g(saved)).length;}`,
        { target: "standalone", experimentalIR },
      );
      expect(result.success).toBe(false);
      expect(result.errors.some((error) => error.message.includes("native generator lowering"))).toBe(true);
    });
