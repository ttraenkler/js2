// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compileMulti } from "../src/index.js";
import { instantiateWithRuntime } from "./equivalence/helpers.js";

it.each(["gc", "standalone"] as const)(
  "keeps enum initialization ordered and imported identity stable in %s",
  async (target) => {
    const result = await compileMulti(
      {
        "./enum.ts": `
      import * as self from "./enum.js";
      export const before = typeof (self as any).Kind;
      export enum Kind { First = 11, Alias = First, Text = "text" }
      export const after = typeof (self as any).Kind;
      export function own(): any { return Kind; }
    `,
        "./other.ts": `export enum Kind { Different = 9 }`,
        "./entry.ts": `
      import * as ns from "./enum.js";
      import { Kind as Direct, before, after, own } from "./enum.js";
      import { Kind as Other } from "./other.js";
      export function test(index: number): number {
        const kind = (ns as any).Kind;
        switch (index) {
          case 0: return before === "undefined" ? 42 : 0;
          case 1: return after === "object" ? 42 : 0;
          case 2: return kind === Direct ? 42 : 0;
          case 3: return kind === own() ? 42 : 0;
          case 4: return kind !== Other ? 42 : 0;
          case 5: return kind[11] === "Alias" ? 42 : 0;
          case 6: return kind.Text === "text" ? 42 : 0;
          case 7: return kind.text === undefined ? 42 : 0;
          default: return 0;
        }
      }
    `,
      },
      "./entry.ts",
      { target, experimentalIR: true, skipSemanticDiagnostics: true, resolve: { consumerDrivenBarrels: true } },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    if (target === "standalone") expect(WebAssembly.Module.imports(module)).toEqual([]);
    const instance = await instantiateWithRuntime(result);
    const labels = [
      "early read",
      "initialized read",
      "import identity",
      "return identity",
      "distinct declaration",
      "reverse alias",
      "string member",
      "no string reverse",
    ];
    for (const [index, label] of labels.entries()) {
      expect.soft((instance.exports.test as (index: number) => number)(index), label).toBe(42);
    }
  },
);
