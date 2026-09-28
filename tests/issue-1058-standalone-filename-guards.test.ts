// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

async function run(source: string, experimentalIR: boolean): Promise<number> {
  const result = await compile(source, { target: "standalone", experimentalIR });
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  return (new WebAssembly.Instance(module).exports.run as () => number)();
}

for (const experimentalIR of [false, true]) {
  it(`keeps guarded Node filenames host-free (IR=${experimentalIR})`, async () => {
    expect(
      await run(
        `
      declare const process: any; declare const __filename: any; declare const __dirname: any;
      function createNodeSystem() {
        return __filename.endsWith('sys.js') ? __dirname.length : __filename.length;
      }
      const sys = typeof process !== 'undefined' && process.nextTick && !process.browser ? createNodeSystem() : 42;
      export function run() { return sys; }
    `,
        experimentalIR,
      ),
    ).toBe(42);
  });

  for (const type of ["any", "string"]) {
    it(`reads supplied native filenames (IR=${experimentalIR}, type=${type})`, async () => {
      expect(
        await run(
          `
        declare const __filename: ${type}; declare const __dirname: ${type};
        (globalThis as any).__filename = '/tmp/sys.js'; (globalThis as any).__dirname = '/tmp';
        export function run() { return __filename.length * 100 + __dirname.length; }
      `,
          experimentalIR,
        ),
      ).toBe(1104);
    });
    it(`does not infer filename presence from ambient types (IR=${experimentalIR}, type=${type})`, async () => {
      expect(
        await run(
          `
        declare const __filename: ${type}; declare const __dirname: ${type};
        export function run() {
          return typeof __filename === 'undefined' && typeof __dirname === 'undefined' ? 1 : 0;
        }
      `,
          experimentalIR,
        ),
      ).toBe(1);
    });
  }

  it(`preserves lexical filename shadows (IR=${experimentalIR})`, async () => {
    expect(
      await run(
        `
      declare const __filename: any; declare const __dirname: any;
      export function run() {
        const __filename = 'local.ts'; const __dirname = 'local';
        return __filename.length * 100 + __dirname.length;
      }
    `,
        experimentalIR,
      ),
    ).toBe(805);
  });
}
