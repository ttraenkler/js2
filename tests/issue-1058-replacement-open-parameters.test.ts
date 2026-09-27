// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

it.each([true, false])(
  "preserves the original open argument contract after replacement (IR=%s)",
  async (experimentalIR) => {
    const result = await compile(
      `
    const object = { classify(value?: any): number { return -1; } };
    object.classify = (value: string): number => {
      if (value === undefined) return 1;
      if (value === null) return 2;
      if (typeof value === 'string') return 3;
      if (typeof value === 'number') return 4;
      return 5;
    };
    export function omitted(): number { return object.classify(); }
    export function explicitUndefined(): number { return object.classify(undefined); }
    export function explicitNull(): number { return object.classify(null); }
    export function text(): number { return object.classify('ok'); }
    export function number(): number { return object.classify(42); }
    const assert = {isFalse(value: any, message?: any): void { if (value !== false) throw new Error(message); }};
    assert.isFalse = (value: any, message: string): void => { if(value !== false) throw new Error(message); };
    export function noMessage(): number { assert.isFalse(false); return 1; }
  `,
      { target: "standalone", experimentalIR, skipSemanticDiagnostics: true },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    const exports = new WebAssembly.Instance(module, {}).exports;
    for (const [name, expected] of Object.entries({
      omitted: 1,
      explicitUndefined: 1,
      explicitNull: 2,
      text: 3,
      number: 4,
      noMessage: 1,
    })) {
      expect.soft((exports[name] as () => number)(), name).toBe(expected);
    }
  },
);
