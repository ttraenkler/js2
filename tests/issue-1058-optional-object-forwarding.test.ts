// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compileMulti } from "../src/index.js";

for (const experimentalIR of [false, true]) {
  it(`preserves optional options across overloaded module calls (IR=${experimentalIR})`, async () => {
    const result = await compileMulti(
      {
        "./provider.ts": `
          interface Options { error?: boolean; warnAfter?: number; version?: number; }
          export let writes = 0;
          function warning() { let warned = false; return () => { if (!warned) { writes++; warned = true; } }; }
          function error() { return () => { throw new TypeError('deprecated'); }; }
          function noop() {}
          function select(options: Options & { error: true }): () => never;
          function select(options?: Options): () => void;
          function select(options: Options = {}) {
            return options.error ? error() : !options.warnAfter || (options.version ?? 39) >= options.warnAfter ? warning() : noop;
          }
          export function deprecate(options?: Options) { return select(options); }
        `,
        "./entry.ts": `
          import { deprecate, writes } from './provider.js';
          export function run() {
            deprecate({ warnAfter: 39, version: 38 })(); const silent = writes;
            const warning = deprecate({ warnAfter: 39, version: 39 }); warning(); warning();
            let caught = 0; try { deprecate({ error: true })(); } catch { caught = 1; }
            return silent * 100 + writes * 10 + caught;
          }
        `,
      },
      "./entry.ts",
      { target: "standalone", experimentalIR },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(11);
  });
}
