// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

for (const experimentalIR of [true, false]) {
  for (const test of [
    { type: "(string | null)[]", input: '["one", null, "two"]', expected: '["one",null,"two"]' },
    { type: "(number | undefined)[]", input: "[1, undefined, NaN, Infinity, -2]", expected: "[1,null,null,null,-2]" },
    { type: "boolean[]", input: "[true, false]", expected: "[true,false]" },
    {
      type: "(boolean | null | undefined)[]",
      input: "[true, null, undefined, false]",
      expected: "[true,null,null,false]",
    },
    { type: "string[]", input: "[]", expected: "[]" },
  ]) {
    it(`serializes runtime ${test.type} once (IR=${experimentalIR})`, async () => {
      const result = await compile(
        `
        let calls = 0;
        function values(): ${test.type} { calls++; return ${test.input}; }
        export function run(): number {
          const text = JSON.stringify(values());
          return calls === 1 && text === ${JSON.stringify(test.expected)} ? 1 : 0;
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
  it(`serializes optional readonly configuration arrays (IR=${experimentalIR})`, async () => {
    const result = await compile(
      `
      function serialize(specs: readonly string[] | undefined): string { return JSON.stringify(specs || []); }
      export function run(): number {
        return (serialize(["src", "a\\\"b"]) === '["src","a\\\\\\\"b"]' ? 1 : 0)
          + (serialize(undefined) === '[]' ? 2 : 0);
      }
    `,
      { target: "standalone", experimentalIR },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(3);
  });
}
