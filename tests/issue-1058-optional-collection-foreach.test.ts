// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

it.each([true, false])("runs optional Set.forEach without host imports (IR=%s)", async (experimentalIR) => {
  const result = await compile(
    `
    function count(links: Set<string> | undefined): number {
      let hits = 0;
      links?.forEach(value => { if (value === "a" || value === "b") hits++; });
      return hits;
    }
    export function run(): number {
      const links = new Set<string>();
      links.add("a"); links.add("b");
      return count(links) * 10 + count(undefined);
    }
  `,
    { target: "standalone", experimentalIR },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(20);
});

for (const experimentalIR of [true, false]) {
  it.each(["Set", "Map"])("preserves %s optional iteration semantics IR=" + experimentalIR, async (collection) => {
    const type = collection === "Set" ? "Set<number>" : "Map<number, number>";
    const init = collection === "Set" ? "links.add(3); links.add(5);" : "links.set(3, 3); links.set(5, 5);";
    const result = await compile(
      `
      export function run(): number {
        const links = new ${type}(); ${init}
        let reads = 0, args = 0, sum = 0, matches = 0;
        function receiver(present: boolean): ${type} | undefined { reads++; return present ? links : undefined; }
        function context() { args++; return {tag: 7}; }
        const result = receiver(true)?.forEach(function(this: {tag: number}, value: number, key: number, owner: any) {
          sum += value;
          if (key === value && owner === links && this.tag === 7) matches++;
        }, context());
        receiver(false)?.forEach(value => { sum += 100; }, context());
        return sum === 8 && matches === 2 && reads === 2 && args === 1 && result === undefined ? 1 : 0;
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
