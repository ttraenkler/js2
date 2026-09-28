// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

async function run(source: string, experimentalIR: boolean, optimize = false): Promise<number> {
  const result = await compile(source, { target: "standalone", experimentalIR, optimize });
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  return (new WebAssembly.Instance(module).exports.run as () => number)();
}

for (const experimentalIR of [false, true]) {
  for (const optimize of [false, true]) {
    it(`keeps guarded Node operations host-free (IR=${experimentalIR}, optimize=${optimize})`, async () => {
      expect(
        await run(
          `
        declare const process: any;
        function createNodeSystem() {
          process.exit(1);
          return process.cwd().length + process.platform.length + process.argv.length + process.stdout.fd;
        }
        const sys = typeof process !== 'undefined' && process.nextTick && !process.browser ? createNodeSystem() : 42;
        export function run() { return sys; }
      `,
          experimentalIR,
          optimize,
        ),
      ).toBe(42);
    });
  }
  it(`uses an explicitly supplied native process capability (IR=${experimentalIR})`, async () => {
    expect(
      await run(
        `
      declare const process: any;
      let exitCode = 0;
      (globalThis as any).process = {
        cwd() { return '/tmp'; }, platform: 'native', argv: [1, 2], stdout: { fd: 1 },
        exit(code: number) { exitCode = code; }
      };
      export function run() {
        process.exit(7);
        return process.cwd().length + process.platform.length + process.argv.length + process.stdout.fd + exitCode;
      }
    `,
        experimentalIR,
      ),
    ).toBe(20);
  });
  it(`preserves a local process shadow (IR=${experimentalIR})`, async () => {
    expect(
      await run(
        `
      export function run() {
        const process = { cwd() { return 'local'; }, platform: 'wasm', argv: [1, 2, 3] };
        return process.cwd().length + process.platform.length + process.argv.length;
      }
    `,
        experimentalIR,
      ),
    ).toBe(12);
  });
}
