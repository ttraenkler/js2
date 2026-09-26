// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

const operands = [
  { source: '"a"', value: "a" },
  { source: '"y"', value: "y" },
  { source: '"2"', value: "2" },
  { source: '"10"', value: "10" },
  { source: "2", value: 2 },
  { source: "10", value: 10 },
  { source: "0", value: 0 },
  { source: "NaN", value: Number.NaN },
  { source: "undefined", value: undefined },
  { source: "null", value: null },
  { source: "false", value: false },
  { source: "true", value: true },
];

function nativeMask(a: any, b: any): number {
  return (a < b ? 1 : 0) | (a <= b ? 2 : 0) | (a > b ? 4 : 0) | (a >= b ? 8 : 0);
}

it.each([true, false])("compares primitive unions by their runtime values (IR=%s)", async (experimentalIR) => {
  const cases = operands.flatMap((left) => operands.map((right) => ({ left, right })));
  const source = `
    type Value = string | number | boolean | null | undefined;
    function compare(a: Value, b: Value): number {
      return (a < b ? 1 : 0) | (a <= b ? 2 : 0) | (a > b ? 4 : 0) | (a >= b ? 8 : 0);
    }
    ${cases.map(({ left, right }, i) => `export function case${i}(): number { return compare(${left.source}, ${right.source}); }`).join("\n")}
  `;
  const result = await compile(source, { target: "standalone", experimentalIR, skipSemanticDiagnostics: true });
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const exports = new WebAssembly.Instance(module, {}).exports;
  for (const [i, { left, right }] of cases.entries()) {
    expect((exports[`case${i}`] as () => number)(), `${left.source} compared with ${right.source}`).toBe(
      nativeMask(left.value, right.value),
    );
  }
});
