// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import { instantiateWithRuntime } from "./equivalence/helpers.js";

it.each(["gc", "standalone"] as const)(
  "keeps destructuring bindings stable across tuple alternatives in %s",
  async (target) => {
    const result = await compile(
      `
    interface SortedReadonlyArray<T> extends ReadonlyArray<T> { __sortedArrayBrand: any; }
    function sorted<T>(rows: readonly T[]): SortedReadonlyArray<T> { return rows.slice() as SortedReadonlyArray<T>; }
    function members(): SortedReadonlyArray<[number, string]> {
      const result: [number, string][] = [];
      result.push([11, "Literal"]);
      return sorted(result);
    }
    export function other(value: any): [number, any][] {
      const result: [number, any][] = [];
      result.push([9, value]);
      return result;
    }
    export function test(expected: number): number {
      for (const [value, name] of members()) {
        if (value === expected) return name === "Literal" ? 42 : 0;
      }
      return -1;
    }
  `,
      { target, experimentalIR: true },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    if (target === "standalone") expect(WebAssembly.Module.imports(module)).toEqual([]);
    const instance = await instantiateWithRuntime(result);
    expect((instance.exports.test as (value: number) => number)(11)).toBe(42);
  },
);
