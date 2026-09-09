// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compileMulti } from "../src/index.js";
import { instantiateWithRuntime } from "./equivalence/helpers.js";

it.each(
  (["gc", "standalone"] as const).flatMap((target) =>
    (["enum", "const enum", "object"] as const).flatMap((kind) =>
      [false, true].map((circular) => ({ target, kind, circular })),
    ),
  ),
)("formats a namespace enum in $target (kind=$kind, circular=$circular)", async ({ target, kind, circular }) => {
  const result = await compileMulti(
    {
      "./types.ts":
        kind === "object"
          ? `export const Kind = { Unknown: 0, Literal: 11, 0: "Unknown", 11: "Literal" };`
          : `export ${kind} Kind { Unknown, Literal = 11 }`,
      "./barrel.ts": `export * from "./types.js"; export * from "./debug.js";`,
      "./debug.ts": `
      import * as ts from "./${circular ? "barrel" : "types"}.js";
      export namespace Debug {
        export function format(kind: number): string { return (ts as any).Kind[kind]; }
      }
    `,
      "./entry.ts": `
      import { Debug, Kind } from "./barrel.js";
      export function test(): number { return Debug.format(Kind.Literal) === "Literal" ? 42 : 0; }
    `,
    },
    "./entry.ts",
    { target, experimentalIR: true, resolve: { consumerDrivenBarrels: true }, skipSemanticDiagnostics: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  if (target === "standalone") expect(WebAssembly.Module.imports(module)).toEqual([]);
  const instance = await instantiateWithRuntime(result);
  expect((instance.exports.test as () => number)()).toBe(42);
});
