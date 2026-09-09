// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compileMulti } from "../src/index.js";
import { instantiateWithRuntime } from "./equivalence/helpers.js";

it.each(["gc", "standalone"] as const)(
  "returns namespace strings through nested assertion helpers in %s",
  async (target) => {
    const result = await compileMulti(
      {
        "./enum.ts": `export enum Kind { Literal = 11, Parenthesized = 211 }`,
        "./debug.ts": `import * as ts from "./barrel.js";
    export namespace Debug {
      export function formatSyntaxKind(kind: number): string { return (ts as any).Kind[kind]; }
    }`,
        "./barrel.ts": `export * from "./debug.js"; export * from "./enum.js";`,
        "./entry.ts": `import * as ts from "./barrel.js";
      function makeTest(): (kind: number) => number {
        function assertion(node: {kind: number}, expected: number): string {
          return \`Actual: \${ts.Debug.formatSyntaxKind(node.kind)} Expected: \${ts.Debug.formatSyntaxKind(expected)}\`;
        }
        return (kind: number) => assertion({kind}, kind) === (kind === 11 ? "Actual: Literal Expected: Literal" : "Actual: Parenthesized Expected: Parenthesized") ? 42 : 0;
      }
      const callback = makeTest();
      export function test(kind: number): number { return callback(kind); }`,
      },
      "./entry.ts",
      { target, experimentalIR: true, resolve: { consumerDrivenBarrels: true } },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    if (target === "standalone") expect(WebAssembly.Module.imports(module)).toEqual([]);
    const instance = await instantiateWithRuntime(result);
    for (const kind of [11, 211]) expect((instance.exports.test as (kind: number) => number)(kind)).toBe(42);
  },
);
