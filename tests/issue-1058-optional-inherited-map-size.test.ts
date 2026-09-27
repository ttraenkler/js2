// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

for (const experimentalIR of [true, false]) {
  it.each(["Map", "ReadonlyMap"])("reads optional inherited %s size IR=" + experimentalIR, async (base) => {
    const result = await compile(
      `
      interface MultiMap<K, V> extends ${base}<K, V[]> {}
      interface Derived<K, V> extends MultiMap<K, V> {}
      function size(map: Derived<string, string> | undefined): number { return map?.size ?? -1; }
      export function run(): number {
        const map = new Map<string, string[]>();
        const empty = size(map);
        map.set("a", ["x"]);
        return size(undefined) === -1 && empty === 0 && size(map) === 1 ? 1 : 0;
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
