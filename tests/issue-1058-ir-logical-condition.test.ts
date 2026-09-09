// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

it.each(["n && 'yes'", "!(!n || '')", "(n || '') && 'yes'"])("normalizes mixed condition %s", async (condition) => {
  const result = await compile(`export function run(n: number): number { if (${condition}) return 42; return 7; }`, {
    target: "standalone",
    experimentalIR: true,
    trackIrOutcomes: true,
  });
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  expect(
    result.irOutcomes?.find((row) => row.displayName === "run"),
    JSON.stringify(result.irOutcomes),
  ).toMatchObject({ irBodyEmitted: true });
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const run = new WebAssembly.Instance(module, {}).exports.run as (n: number) => number;
  expect([run(0), run(-0), run(NaN), run(2), run(-2)]).toEqual([7, 7, 7, 42, 42]);
});

it.each([
  ["||", 20],
  ["&&", 40],
] as const)(
  "short circuits optional booleans with %s without duplicating right-side effects",
  async (op, multiplier) => {
    const result = await compile(
      `export function run(): number {
    let calls = 0;
    const hit = () => { calls += 1; return true; };
    function check(flag?: boolean) { if (flag ${op} hit()) return 1; return 0; }
    check(true); check(false); check();
    return calls * ${multiplier} + 2;
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
  },
);

it("re-evaluates mixed loop conditions and ternary conditions", async () => {
  const result = await compile(
    `export function run(): number {
    let n = 3; let count = 0;
    while (n && 'yes') { count += 1; n -= 1; }
    return count === 3 && (n || 'yes') ? 42 : 7;
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
