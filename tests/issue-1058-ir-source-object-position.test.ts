// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

it("uses the proved source carrier for a recursive object parameter", async () => {
  const result = await compile(
    `
    interface Item { value: number; next?: Item; }
    function read(item: Item): number { return item.value; }
    export function run(): number { return read({value:42}); }
  `,
    { target: "standalone", experimentalIR: true, trackIrOutcomes: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module, {}).exports.run as () => number)()).toBe(42);
  expect(
    result.irOutcomes?.find((row) => row.displayName === "read"),
    JSON.stringify(result.irOutcomes),
  ).toMatchObject({ irBodyEmitted: true });
});
