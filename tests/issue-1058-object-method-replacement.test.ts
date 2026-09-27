// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

it.each([true, false])("observes shorthand method replacement through aliases (IR=%s)", async (experimentalIR) => {
  const result = await compile(
    `
    const original = {deepEqual(a: number, b: number): number { return a + b; }};
    const alias = original;
    const saved = alias.deepEqual;
    const before = original.deepEqual(1, 2);
    alias.deepEqual = (a: number, b: number): number => saved(a, b) + 10;
    const untouched = {deepEqual(a: number, b: number): number { return a * b; }};
    export function viaAlias(): number { return alias.deepEqual(1, 2); }
    export function viaOriginal(): number { return original.deepEqual(1, 2); }
    export function beforeWrite(): number { return before; }
    export function unrelated(): number { return untouched.deepEqual(2, 4); }
    export function receiver(): number {
      const value = {x: 7, method(): number { return 1; }};
      value.method = function(): number { return this.x; };
      return value.method();
    }
  `,
    { target: "standalone", experimentalIR },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const exports = new WebAssembly.Instance(module, {}).exports;
  for (const [name, expected] of Object.entries({
    viaAlias: 13,
    viaOriginal: 13,
    beforeWrite: 3,
    unrelated: 8,
    receiver: 7,
  })) {
    expect((exports[name] as () => number)(), name).toBe(expected);
  }
});
