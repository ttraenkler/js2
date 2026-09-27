// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

it.each([true, false])("checks narrowed array membership without a host IR=%s", async (experimentalIR) => {
  const result = await compile(
    `
    interface Item { value: number }
    interface Range { range: Item | readonly Item[] }
    function isReadonlyArray(value: Item | readonly Item[]): value is readonly Item[] {
      return Array.isArray(value);
    }
    function contains(targetRange: Range, node: Item): boolean {
      return isReadonlyArray(targetRange.range) && targetRange.range.includes(node);
    }
    export function run(): number {
      const item = {value: 7};
      const other = {value: 7};
      const range: Range = {range: [item]};
      if (!isReadonlyArray(range.range)) return -5;
      if (!contains(range, item)) return -1;
      if (contains(range, other)) return -2;
      if (contains({range: []}, item)) return -3;
      if (contains({range: item}, item)) return -4;
      return 1;
    }
  `,
    { target: "standalone", experimentalIR },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(1);
});

it.each([true, false])("preserves opaque includes values, offsets and evaluation IR=%s", async (experimentalIR) => {
  const result = await compile(
    `
    interface Holder { values: readonly unknown[] | number }
    let receivers = 0, argumentsRead = 0;
    function receiver(holder: Holder): Holder { receivers++; return holder; }
    function value(input: unknown): unknown { argumentsRead++; return input; }
    function has(holder: Holder, needle: unknown, from: number): boolean {
      return (receiver(holder).values as readonly unknown[]).includes(value(needle), from);
    }
    export function run(): number {
      const holder: Holder = {values: [NaN, 0, null, undefined, 7]};
      if (!has(holder, NaN, 0)) return -1;
      if (!has(holder, null, 0)) return -2;
      if (!has(holder, undefined, 0)) return -3;
      if (!has(holder, 7, -1)) return -4;
      if (has(holder, 7, 5) || has(holder, 0, 2)) return -5;
      if (!(holder.values as readonly unknown[]).includes(undefined)) return -6;
      if (!(holder.values as readonly unknown[]).includes(null)) return -7;
      if (has({values: []}, undefined, 0)) return -8;
      return receivers === 7 && argumentsRead === 7 ? 1 : -9;
    }
    `,
    { target: "standalone", experimentalIR },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(1);
});
