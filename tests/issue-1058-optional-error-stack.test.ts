// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

for (const experimentalIR of [true, false]) {
  it(`calls a user-installed stack capture hook (IR=${experimentalIR})`, async () => {
    const result = await compile(
      `
      let calls = 0;
      function createIOError(code: string): Error {
        const err = new Error(code);
        if ((Error as any).captureStackTrace) (Error as any).captureStackTrace(err, createIOError);
        return err;
      }
      export function run(): number {
        (Error as any).captureStackTrace = (err: Error, ctor: any) => {
          if (err.message === "ENOENT" && ctor === createIOError) calls++;
        };
        createIOError("ENOENT");
        return calls;
      }
    `,
      { target: "standalone", experimentalIR },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(1);
  });
  it(`allows the upstream guarded stack capture (IR=${experimentalIR})`, async () => {
    const result = await compile(
      `
      interface ErrorConstructor { captureStackTrace?(target: object, constructor?: Function): void; }
      function createIOError(code: string): Error {
        const err = new Error(code);
        if (Error.captureStackTrace) Error.captureStackTrace(err, createIOError);
        return err;
      }
      export function run(): number { return createIOError("ENOENT").message === "ENOENT" ? 1 : 0; }
    `,
      { target: "standalone", experimentalIR },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(1);
  });
}
