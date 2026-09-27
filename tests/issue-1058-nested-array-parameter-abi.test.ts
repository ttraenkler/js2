// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

it.each(
  [true, false].flatMap((experimentalIR) =>
    ["Item[]", "readonly Item[]", "Items"].map((arrayType) => ({ experimentalIR, arrayType })),
  ),
)(
  "stabilizes nested local-interface $arrayType parameters (IR=$experimentalIR)",
  async ({ experimentalIR, arrayType }) => {
    const result = await compile(
      `
    export function run(seed: number): number {
      interface Item { value: number; }
      interface Items extends ReadonlyArray<Item> {}
      function first(items: ${arrayType}, parent: Item): number { return later(items) + seed + parent.value; }
      function later(items: ${arrayType}): number { const item: Item = items[0]; return item.value; }
      return first([{ value: 7 }], { value: 3 });
    }
  `,
      { target: "standalone", experimentalIR },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    expect((new WebAssembly.Instance(module, {}).exports.run as (seed: number) => number)(5)).toBe(15);
  },
);
