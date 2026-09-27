// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { expect, it } from "vitest";
import { compile, compileProject } from "../src/index.js";

for (const experimentalIR of [false, true]) {
  for (const computed of [false, true]) {
    it(`keeps cross-module assertion binding distinct from global property IR=${experimentalIR} computed=${computed}`, async () => {
      const dir = mkdtempSync(join(tmpdir(), "ts5-global-assert-"));
      try {
        writeFileSync(
          join(dir, "helper.ts"),
          `
          declare var assert: { equal(a: unknown, b: unknown): void };
          export function check(value: number) { assert.equal(value, 3); }
        `,
        );
        const entry = join(dir, "entry.ts");
        writeFileSync(
          entry,
          `
          import { check } from "./helper.js";
          function assert(value: unknown) { if (!value) throw new Error("false"); }
          assert.equal = (a: unknown, b: unknown) => { if (a !== b) throw new Error("mismatch"); };
          globalThis${computed ? '["assert"]' : ".assert"} = assert;
          export function run(value: number) {
            try { check(value); return 1; } catch (error) {
              return (error as Error).message === "mismatch" ? 2 : -1;
            }
          }
        `,
        );
        const bundled = await build({
          entryPoints: [entry],
          bundle: true,
          platform: "node",
          format: "cjs",
          write: false,
        });
        const native = { exports: {} as { run(value: number): number } };
        runInNewContext(`(function(module, exports) { ${bundled.outputFiles[0].text}\n})(module, module.exports)`, {
          module: native,
        });
        const result = await compileProject(entry, {
          target: "standalone",
          experimentalIR,
          skipSemanticDiagnostics: true,
          deferTopLevelInit: true,
        });
        expect(result.success, JSON.stringify(result.errors)).toBe(true);
        const module = new WebAssembly.Module(result.binary);
        expect(WebAssembly.Module.imports(module)).toEqual([]);
        const exports = new WebAssembly.Instance(module).exports as Record<string, Function>;
        exports.__module_init();
        for (const value of [3, 4, 3, 4]) {
          expect(native.exports.run(value)).toBe(value === 3 ? 1 : 2);
          expect(exports.run(value)).toBe(native.exports.run(value));
        }
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }

  it(`preserves script function replacement through the global object IR=${experimentalIR}`, async () => {
    const source = `
      function probe() { return 7; }
      globalThis.probe = function () { return 91; };
      if (probe() !== 91) throw new Error("script function must be rebound");
    `;
    runInNewContext(source);
    const result = await compile(source, {
      target: "standalone",
      experimentalIR,
      allowJs: true,
      fileName: "script.js",
      inferModuleStrictArguments: false,
      skipSemanticDiagnostics: true,
      deferTopLevelInit: true,
    });
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    const exports = new WebAssembly.Instance(module).exports as Record<string, Function>;
    expect(() => exports.__module_init()).not.toThrow();
  });

  it(`does not replace a module-local function through globalThis IR=${experimentalIR}`, async () => {
    const source = `
      function probe() { return 7; }
      globalThis.probe = function () { return 91; };
      export function run() { const read = probe; return read() + probe(); }
    `;
    const bundled = await build({
      stdin: { contents: source, loader: "ts" },
      platform: "node",
      format: "cjs",
      write: false,
    });
    const native = { exports: {} as { run(): number } };
    runInNewContext(`(function(module, exports) { ${bundled.outputFiles[0].text}\n})(module, module.exports)`, {
      module: native,
    });
    expect(native.exports.run()).toBe(14);
    const result = await compile(source, {
      target: "standalone",
      experimentalIR,
      skipSemanticDiagnostics: true,
      deferTopLevelInit: true,
    });
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    const exports = new WebAssembly.Instance(module).exports as Record<string, Function>;
    exports.__module_init();
    expect(exports.run()).toBe(native.exports.run());
  });
}
