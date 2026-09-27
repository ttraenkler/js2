// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

for (const experimentalIR of [true, false]) {
  it.each([false, true])("mutates optional Set with side effects=%s IR=" + experimentalIR, async (sideEffects) => {
    const result = await compile(
      `
      let receivers = 0;
      let argumentsRead = 0;
      function receiver(values: Set<number> | undefined): Set<number> | undefined {
        receivers++;
        return values;
      }
      function value(): number { argumentsRead++; return 7; }
      function add(values: Set<number> | undefined, missing: boolean): boolean {
        const result = ${sideEffects ? "receiver(values)?.add(value())" : "values?.add(7)"};
        return missing ? result === undefined : result === values;
      }
      export function run(): number {
        const values = new Set<number>();
        const present = add(values, false);
        const missing = add(undefined, true);
        if (!present) return -1;
        if (!missing) return -2;
        if (!values.has(7)) return -3;
        if (values.size !== 1) return -4;
        if (receivers !== ${sideEffects ? 2 : 0}) return -5;
        if (argumentsRead !== ${sideEffects ? 1 : 0}) return -6;
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
}
