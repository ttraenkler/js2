// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

it.each([true, false])("shares index descriptors across array projections (IR=%s)", async (experimentalIR) => {
  const result = await compile(
    `
    function keys(a: readonly unknown[]): string { let out=''; for(const k in a)out+=k+',';return out; }
    function remove(a: unknown[]): void { delete a[1]; }
    function hide(a: unknown[]): void { Object.defineProperty(a,'1',{enumerable:false}); }
    export function deletedBeforeProjection(): number {
      const a=[1,2,3]; delete a[1]; return keys(a)==='0,2,'?1:0;
    }
    export function deletedThroughProjection(): number {
      const a=[1,2,3]; remove(a); return 1 in a?0:1;
    }
    export function hiddenThroughProjection(): number {
      const a=[1,2,3]; hide(a); return Object.keys(a).join(',')==='0,2'?1:0;
    }
    export function independent(): number {
      const a=[1,2,3], b=[1,2,3]; remove(a); return keys(b)==='0,1,2,'?1:0;
    }
  `,
    { target: "standalone", experimentalIR },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const exports = new WebAssembly.Instance(module, {}).exports;
  for (const name of [
    "deletedBeforeProjection",
    "deletedThroughProjection",
    "hiddenThroughProjection",
    "independent",
  ]) {
    expect.soft((exports[name] as () => number)(), name).toBe(1);
  }
});
