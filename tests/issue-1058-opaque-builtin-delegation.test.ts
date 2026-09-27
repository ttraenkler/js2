// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import ts from "typescript";
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

const cases = [
  ["array", "[1, 2]", "12"],
  ["string", '"a😀"', "a😀"],
  ["set", "new Set([1, 2])", "12"],
] as const;

function source(subject: string, expected: string): string {
  return `
    function* values(input: any) { yield* input; }
    export function run(): number {
      let count = 0;
      let result = '';
      for (const value of values(${subject})) { result += String(value); count++; }
      return count === 2 && result === ${JSON.stringify(expected)} ? 1 : 0;
    }
  `;
}

it.each(cases)("delegates the opaque %s in the native reference", (_, subject, expected) => {
  const output = ts.transpileModule(source(subject, expected), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: Record<string, () => number> = {};
  new Function("exports", output)(exports);
  expect(exports.run()).toBe(1);
});

it.each(
  cases.flatMap(([name, subject, expected]) =>
    [true, false].map((experimentalIR) => ({ name, subject, expected, experimentalIR })),
  ),
)(
  "delegates the opaque $name without host imports (IR=$experimentalIR)",
  async ({ subject, expected, experimentalIR }) => {
    const result = await compile(source(subject, expected), { target: "standalone", experimentalIR });
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    expect((new WebAssembly.Instance(module, {}).exports.run as () => number)()).toBe(1);
  },
);
