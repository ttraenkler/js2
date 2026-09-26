// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compileMulti } from "../src/index.js";

it.each([
  { label: "explicit true", defaultValue: "false", argument: ", true", expected: 42 },
  { label: "explicit false", defaultValue: "true", argument: ", false", expected: 0 },
  { label: "omitted true default", defaultValue: "true", argument: "", expected: 42 },
  { label: "omitted false default", defaultValue: "false", argument: "", expected: 0 },
])(
  "preserves $label inside a zero-argument callback through an ESM namespace",
  async ({ defaultValue, argument, expected }) => {
    const result = await compileMulti(
      {
        "./parser.ts": `
      interface Options { languageVersion: number; }
      export function createSourceFile(name: string, text: string, version: number | Options, parents = ${defaultValue}, kind?: number): number {
        return parents ? 42 : 0;
      }
    `,
        "./barrel.ts": `export * from "./parser.js";`,
        "./entry.ts": `
      import * as ts from "./barrel.js";
      const callbacks: (() => number)[] = [];
      function it(callback: () => number): void { callbacks.push(callback); }
      it(() => ts.createSourceFile("index.ts", "const x = 1", 99${argument}));
      export function run(): number { return callbacks[0].call(undefined); }
    `,
      },
      "./entry.ts",
      { target: "standalone", experimentalIR: true, resolve: { consumerDrivenBarrels: true } },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    expect((new WebAssembly.Instance(module, {}).exports.run as () => number)()).toBe(expected);
  },
);

// Measured separately in #1058: explicit undefined still yields 0 rather than
// the true default's 42. Do not count this pending case as passing coverage.
it.todo("applies a true boolean default to explicit undefined inside the same callback fixture");
