// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import ts from "typescript";
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

const cases = [
  ["Array", "[1, 2]"],
  ["Set", "new Set([1, 2])"],
  ["String", '"ab"'],
  ["Map", "new Map([[1, 2]])"],
] as const;

function source(brand: string, subject: string, remove: boolean): string {
  return `
    function* values(input: any) { yield* input; }
    function* replacement() { yield 9; }
    export function run(): number {
      const proto: any = ${brand}.prototype;
      const original = proto[Symbol.iterator];
      try {
        ${remove ? "delete proto[Symbol.iterator];" : "proto[Symbol.iterator] = replacement;"}
        let result = '';
        for (const value of values(${subject})) result += String(value);
        return ${remove ? "0" : "result === '9' ? 1 : 0"};
      } catch (error) { return ${remove ? "error instanceof TypeError ? 1 : -1" : "-1"}; }
      finally { proto[Symbol.iterator] = original; }
    }
  `;
}

const scenarios = cases.flatMap(([brand, subject]) => [false, true].map((remove) => ({ brand, subject, remove })));
it.each(scenarios)("observes $brand iterator mutation in Node (delete=$remove)", ({ brand, subject, remove }) => {
  const output = ts.transpileModule(source(brand, subject, remove), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: Record<string, () => number> = {};
  new Function("exports", output)(exports);
  expect(exports.run()).toBe(1);
});

it.each(scenarios.flatMap((test) => [true, false].map((experimentalIR) => ({ ...test, experimentalIR }))))(
  "observes $brand iterator mutation standalone (delete=$remove, IR=$experimentalIR)",
  async ({ brand, subject, remove, experimentalIR }) => {
    const result = await compile(source(brand, subject, remove), { target: "standalone", experimentalIR });
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    expect(WebAssembly.validate(result.binary)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(1);
  },
);
