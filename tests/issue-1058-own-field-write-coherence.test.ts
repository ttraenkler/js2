// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";

async function compareStandalone(source: string, experimentalIR: boolean, expected: number): Promise<void> {
  const native: { run?: (select: number) => number } = {};
  new Function(
    "exports",
    ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText,
  )(native);
  const result = await compile(source, { target: "standalone", experimentalIR });
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const run = new WebAssembly.Instance(module).exports.run as (select: number) => number;
  for (const select of [0, 1]) {
    expect(native.run!(select)).toBe(expected);
    expect(run(select)).toBe(expected);
  }
}

for (const experimentalIR of [false, true]) {
  for (const initial of ["undefined", "null", '"wrong carrier"']) {
    for (const computed of [false, true]) {
      it(`keeps bag and physical map reads coherent IR=${experimentalIR} initial=${initial} computed=${computed}`, async () => {
        const source = `
          interface View { data?: Map<string, number>; other?: Map<string, number>; }
          class Box implements View { data!: Map<string, number>; other!: Map<string, number>; }
          function write(c: View, key: string, value: any) {
            ${computed ? "(c as any)[key] = value;" : "c.data = value;"}
          }
          function read(c: View, key: string): any {
            return ${computed ? "(c as any)[key]" : "c.data"};
          }
          export function run(select: number) {
            const c = new Box();
            const alias: View = c;
            const key = select ? "data" : "other";
            write(alias, key, ${initial});
            const next = new Map<string, number>();
            next.set("x", 42);
            write(alias, key, next);
            const dynamic = read(alias, key);
            const physical = ${computed ? "select ? c.data : c.other" : "c.data"};
            return alias === c && dynamic === next && physical === next
              ? dynamic.get("x") + physical.get("x") : -1;
          }
        `;
        await compareStandalone(source, experimentalIR, 84);
      });
    }
  }
}

for (const experimentalIR of [false, true]) {
  for (const writable of [false, true]) {
    for (const computed of [false, true]) {
      it(`preserves own data descriptor IR=${experimentalIR} writable=${writable} computed=${computed}`, async () => {
        const source = `"use strict";
          interface View { data?: Map<string, number>; other?: Map<string, number>; }
          class Box implements View { data!: Map<string, number>; other!: Map<string, number>; }
          function write(c: View, key: string, value: any) {
            ${computed ? "(c as any)[key] = value;" : "c.data = value;"}
          }
          export function run(select: number) {
            const c = new Box();
            const key = ${computed ? 'select ? "data" : "other"' : '"data"'};
            const initial = new Map<string, number>(); initial.set("x", 7);
            const next = new Map<string, number>(); next.set("x", 42);
            Object.defineProperty(c, key, {
              value: ${writable ? "undefined" : "initial"},
              writable: ${writable}, enumerable: false, configurable: true
            });
            let threw = false;
            try { write(c, key, next); } catch(e) { threw = e instanceof TypeError; }
            const d = Object.getOwnPropertyDescriptor(c, key)!;
            return threw === ${!writable} && d.value === ${writable ? "next" : "initial"}
              && d.writable === ${writable} && d.enumerable === false && d.configurable === true ? 1 : 0;
          }
        `;
        await compareStandalone(source, experimentalIR, 1);
      });
    }
  }
}
