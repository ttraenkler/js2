// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import { nativeStringAbiBridge } from "../src/wasm/model/native-string-abi.js";

it("only bridges declared native string carriers, without coercing other brands", () => {
  expect(nativeStringAbiBridge({ kind: "externref" }, { kind: "ref_null", typeIdx: 7 }, [7, 8])).toEqual([
    { op: "any.convert_extern" },
    { op: "ref.cast_null", typeIdx: 7 },
  ]);
  expect(nativeStringAbiBridge({ kind: "ref", typeIdx: 8 }, { kind: "externref" }, [7, 8])).toEqual([
    { op: "extern.convert_any" },
  ]);
  for (const typeIdx of [-1, 6, 9]) {
    expect(nativeStringAbiBridge({ kind: "externref" }, { kind: "ref_null", typeIdx }, [7, 8])).toBeNull();
  }
  expect(nativeStringAbiBridge({ kind: "f64" }, { kind: "ref_null", typeIdx: 7 }, [7, 8])).toBeNull();
});

it.each([true, false])(
  "calls a generic identity through a string callback without a direct call (IR=%s)",
  async (experimentalIR) => {
    // A direct identity('...') call specializes the original failure away.
    const result = await compile(
      `
    function identity<T>(value: T): T { return value; }
    function invoke(value: string, callback: (x: string) => string): string { return callback(value); }
    function choose(value: string, callback: ((x: string) => string) | boolean): string {
      const canonical = typeof callback === 'function' ? callback : identity;
      return invoke(value, canonical);
    }
    export function simple(): number { return invoke('abc', identity) === 'abc' ? 1 : 0; }
    export function empty(): number { return invoke('', identity) === '' ? 1 : 0; }
    export function unicode(): number { return choose('İ/ß', false) === 'İ/ß' ? 1 : 0; }
    export function array(): number { return [choose('/a', identity)][0] === '/a' ? 1 : 0; }
  `,
      { target: "standalone", experimentalIR },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    const exports = new WebAssembly.Instance(module, {}).exports;
    for (const name of ["simple", "empty", "unicode", "array"]) {
      expect((exports[name] as () => number)(), name).toBe(1);
    }
  },
);
