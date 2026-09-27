// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

it.each([true, false])(
  "enumerates typed array keys and metadata with the native runtime (IR=%s)",
  async (experimentalIR) => {
    const result = await compile(
      `
    function keys(a: readonly unknown[]): string { let result=''; for(const k in a)result+=k+',';return result; }
    export function dense(): number { return keys([1,2,3])==='0,1,2,'?1:0; }
    export function metadata(): number {
      const a:any=[]; a.hasTrailingComma=true;
      return keys(a)==='hasTrailingComma,'?1:0;
    }
    export function sparse(): number {
      const a:any=[1,2,3]; delete a[1]; a.tag=true;
      Object.defineProperty(a,'hidden',{value:1,enumerable:false});
      return keys(a)==='0,2,tag,'?1:0;
    }
    export function inherited(): number {
      const a:any=[1]; a.tag=true; Object.setPrototypeOf(a,{inherited:true});
      return keys(a)==='0,tag,inherited,'?1:0;
    }
  `,
      { target: "standalone", experimentalIR },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    const exports = new WebAssembly.Instance(module, {}).exports;
    for (const name of ["dense", "metadata", "sparse", "inherited"])
      expect((exports[name] as () => number)(), name).toBe(1);
  },
);
