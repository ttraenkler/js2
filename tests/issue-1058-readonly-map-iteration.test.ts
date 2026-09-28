// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

for (const experimentalIR of [true, false]) {
  for (const view of ["ReadonlyMap<string, Inode>", "View"])
    for (const projection of ["source", "source.entries()"])
      it(`iterates ${view} ${projection} used by the upstream virtual filesystem (IR=${experimentalIR})`, async () => {
        const result = await compile(
          `
      interface Inode { ino: number; }
      interface View extends ReadonlyMap<string, Inode> {}
      function copy(source: ${view}, target: Map<string, Inode>): void {
        for (const [name, root] of ${projection}) target.set(name, { ino: root.ino + 1 });
      }
      export function run(): number {
        const source = new Map<string, Inode>();
        source.set("a", { ino: 3 }); source.set("b", { ino: 5 });
        const target = new Map<string, Inode>(); copy(source, target);
        return target.size * 100 + target.get("a")!.ino * 10 + target.get("b")!.ino;
      }
    `,
          { target: "standalone", experimentalIR },
        );
        expect(result.success, JSON.stringify(result.errors)).toBe(true);
        const module = new WebAssembly.Module(result.binary);
        expect(WebAssembly.Module.imports(module)).toEqual([]);
        expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(246);
      });
}
