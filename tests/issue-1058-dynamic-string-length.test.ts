// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

it.each([true, false])(
  "reads primitive string length through the ordinary property protocol (IR=%s)",
  async (experimentalIR) => {
    const result = await compile(
      `
    function length(value: any): number { return value.length; }
    function read(value: any, key: string): any { return value[key]; }
    export function empty(): number { return length(''); }
    export function flat(): number { return length('/'); }
    export function unicode(): number { return length('a😀'); }
    export function joined(n: number): number { return length('root/' + String(n)); }
    export function boxed(): number { return length(new String('abc')); }
    export function computed(): number { return read('abc','length'); }
    export function other(): number { return read('abc','absent')===undefined?1:0; }
    export function object(): number { return read({length:'custom'},'length')==='custom'?1:0; }
    export function normalization(): number {
      let normalized; normalized='/a'.substring(0,1);
      if(normalized.length!==1) normalized+='/';
      normalized+='b'; return normalized==='/b'?1:0;
    }
  `,
      { target: "standalone", experimentalIR },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    const exports = new WebAssembly.Instance(module, {}).exports;
    for (const [name, expected] of Object.entries({
      empty: 0,
      flat: 1,
      unicode: 3,
      boxed: 3,
      computed: 3,
      other: 1,
      object: 1,
      normalization: 1,
    })) {
      expect.soft((exports[name] as () => number)(), name).toBe(expected);
    }
    expect((exports.joined as (n: number) => number)(42)).toBe(7);
  },
);
