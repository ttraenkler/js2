// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

it.each([true, false])("preserves an ordinary object's dynamic length value (IR=%s)", async (experimentalIR) => {
  const result = await compile(
    `
    function absent(value: any): number { return typeof value.length === 'undefined' ? 1 : 0; }
    function text(value: any): number { return value.length === 'custom' ? 1 : 0; }
    function numeric(value: any): number { return value.length === 3.5 ? 1 : 0; }
    export function missing(): number { return absent({flag: true}); }
    export function stringLength(): number { return text({length: 'custom'}); }
    export function fractionalLength(): number { return numeric({length: 3.5}); }
  `,
    { target: "standalone", experimentalIR },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const exports = new WebAssembly.Instance(module, {}).exports;
  for (const name of ["missing", "stringLength", "fractionalLength"]) {
    expect((exports[name] as () => number)(), name).toBe(1);
  }
});
