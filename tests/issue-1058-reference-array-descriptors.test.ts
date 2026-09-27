// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";

const cases = {
  "shrinks while preserving array and element identity": `
    const first: Item = {n: 1}; const a: Item[] = [first, {n: 2}, {n: 3}];
    const alias = a; a.length = 1;
    return a === alias && a.length === 1 && a[0] === first ? 1 : 0;`,
  "writes a compatible reference back to its typed slot": `
    const a: Item[] = [{n: 1}]; const next: Item = {n: 42};
    Object.defineProperty(a, "0", {value: next, writable: true, configurable: true, enumerable: true});
    return a[0] === next && a[0].n === 42 ? 1 : 0;`,
  "retains an incompatible value in the descriptor storage": `
    const a: Item[] = [{n: 1}];
    Object.defineProperty(a, "0", {value: "wrong", writable: true, configurable: true, enumerable: true});
    return (a as any)[0] === "wrong" && Object.getOwnPropertyDescriptor(a, "0")!.value === "wrong" ? 1 : 0;`,
  "refuses a strict write to readonly length": `
    const a: Item[] = [{n: 1}, {n: 2}];
    Object.defineProperty(a, "length", {writable: false});
    let threw = false;
    try {a.length = 0;} catch (error) {threw = error instanceof TypeError;}
    return threw && a.length === 2 && a[1].n === 2 ? 1 : 0;`,
  "stops shrinking at a non-configurable element": `
    const a: Item[] = [{n: 1}, {n: 2}, {n: 3}];
    Object.defineProperty(a, "1", {configurable: false});
    let threw = false;
    try {a.length = 0;} catch (error) {threw = error instanceof TypeError;}
    return threw && a.length === 2 && a[1].n === 2 ? 1 : 0;`,
};

for (const experimentalIR of [false, true]) {
  for (const [name, body] of Object.entries(cases)) {
    it(`${name} IR=${experimentalIR}`, async () => {
      const source = `"use strict";
        interface Item {n: number;}
        export function trigger(o: any) {Object.defineProperty(o, "x", {get: () => 1});}
        export function run() {${body}}
      `;
      const native: { run?: () => number } = {};
      new Function(
        "exports",
        ts.transpileModule(source, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText,
      )(native);
      expect(native.run!()).toBe(1);
      const result = await compile(source, { target: "standalone", experimentalIR });
      expect(result.success, JSON.stringify(result.errors)).toBe(true);
      const module = new WebAssembly.Module(result.binary);
      expect(WebAssembly.Module.imports(module)).toEqual([]);
      expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(1);
    });
  }
}
