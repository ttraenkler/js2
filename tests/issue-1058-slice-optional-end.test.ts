// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

it.each([true, false])(
  "preserves undefined slice ends without treating NaN as omitted (IR=%s)",
  async (experimentalIR) => {
    const result = await compile(
      `
    function optional(end?: number): number { return [1,2,3].slice(1,end).length; }
    function erased(end: any): number { return [1,2,3].slice(1,end).length; }
    export function omitted(): number { return optional(); }
    export function explicit(): number { return optional(undefined); }
    export function dynamic(): number { return erased(undefined); }
    export function nan(): number { return optional(NaN); }
    export function erasedNaN(): number { return erased(NaN); }
    export function nullEnd(): number { return erased(null); }
    export function numeric(): number { return erased('2'); }
    export function negative(): number { return optional(-1); }
    export function once(): number {
      let calls=0;
      function end(): undefined { calls++; return undefined; }
      return [1,2,3].slice(1,end()).length*10+calls;
    }
    export function shadowed(): number {
      function inner(undefined: number): number { return [1,2,3].slice(1,undefined).length; }
      return inner(2);
    }
  `,
      { target: "standalone", experimentalIR },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    const exports = new WebAssembly.Instance(module, {}).exports;
    for (const [name, expected] of Object.entries({
      omitted: 2,
      explicit: 2,
      dynamic: 2,
      nan: 0,
      erasedNaN: 0,
      nullEnd: 0,
      numeric: 1,
      negative: 1,
      once: 21,
      shadowed: 1,
    })) {
      expect((exports[name] as () => number)(), name).toBe(expected);
    }
  },
);
