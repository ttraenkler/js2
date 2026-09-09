// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

it("retains the finally cleanup barrier", async () => {
  const result = await compile(
    `let count = 0;
    export function cleanup(): number { return count; }
    export function run(a: boolean, b: boolean): number {
      try { if (a) { if (b) return 11; } }
      finally { count += 1; }
      return 20;
    }`,
    { target: "standalone", experimentalIR: true, trackIrOutcomes: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  expect(
    result.irOutcomes?.find((row) => row.displayName === "run"),
    JSON.stringify(result.irOutcomes),
  ).toMatchObject({ irBodyEmitted: false, kind: "unsupported" });
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const exports = new WebAssembly.Instance(module, {}).exports;
  const run = exports.run as (a: number, b: number) => number;
  const cleanup = exports.cleanup as () => number;
  expect(run(1, 1)).toBe(11);
  expect(cleanup()).toBe(1);
  expect(run(0, 0)).toBe(20);
  expect(cleanup()).toBe(2);
});

it.each([false, true])("returns from partial guard branches (else=%s)", async (withElse) => {
  const result = await compile(
    `export function run(a: boolean, b: boolean): number {
    let value = 7;
    if (a) { if (b) return 11; value = 20; }
    ${withElse ? "else { if (b) return 33; value = 40; }" : ""}
    return value;
  }`,
    { target: "standalone", experimentalIR: true, trackIrOutcomes: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  expect(
    result.irOutcomes?.find((row) => row.displayName === "run"),
    JSON.stringify(result.irOutcomes),
  ).toMatchObject({ irBodyEmitted: true });
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const run = new WebAssembly.Instance(module, {}).exports.run as (a: number, b: number) => number;
  expect([run(1, 1), run(1, 0), run(0, 1), run(0, 0)]).toEqual(withElse ? [11, 20, 33, 40] : [11, 20, 7, 7]);
});

it("skips continuation effects only on returned paths", async () => {
  const result = await compile(
    `export function run(): number {
    let touched = 0;
    function choose(a: boolean, b: boolean) {
      if(a) { if(b) return 10; touched += 1; }
      else { if(b) return 20; touched += 2; }
      touched += 4;
      return 0;
    }
    const values = choose(true,true) + choose(false,true);
    choose(true,false); choose(false,false);
    return values + touched + 1;
  }`,
    { target: "standalone", experimentalIR: true, trackIrOutcomes: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  expect(
    result.irOutcomes?.find((row) => row.displayName === "run"),
    JSON.stringify(result.irOutcomes),
  ).toMatchObject({ irBodyEmitted: true });
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module, {}).exports.run as () => number)()).toBe(42);
});
