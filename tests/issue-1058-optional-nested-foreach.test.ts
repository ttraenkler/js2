// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

it.each([true, false])("iterates a nested optional Set after Map.get (IR=%s)", async (experimentalIR) => {
  const result = await compile(
    `
    interface Entry { links?: Set<string>; }
    export function run(): number {
      const cache = new Map<string, Entry>();
      const links = new Set<string>();
      links.add("a"); links.add("b");
      cache.set("present", {links});
      cache.set("empty", {});
      let hits = 0;
      let args = 0;
      cache.get("present")?.links?.forEach(value => { if (value === "a" || value === "b") hits++; }, args++);
      cache.get("empty")?.links?.forEach(value => { hits++; }, args++);
      cache.get("missing")?.links?.forEach(value => { hits++; }, args++);
      return hits * 10 + args;
    }
  `,
    { target: "standalone", experimentalIR },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(21);
});
