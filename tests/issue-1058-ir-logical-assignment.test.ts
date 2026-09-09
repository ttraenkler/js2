// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

async function emitted(source: string) {
  const result = await compile(source, { target: "standalone", experimentalIR: true, trackIrOutcomes: true });
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  expect(
    result.irOutcomes?.find((row) => row.displayName === "run"),
    JSON.stringify(result.irOutcomes),
  ).toMatchObject({ irBodyEmitted: true, legacyBodyEmitted: false });
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  return new WebAssembly.Instance(module, {}).exports.run as (...args: number[]) => number;
}

it.each(["||=", "&&="])("executes local %s with numeric truthiness", async (op) => {
  const run = await emitted(
    `export function run(initial: number, fallback: number): number { let value = initial; value ${op} fallback; return value; }`,
  );
  for (const initial of [0, -0, NaN, 7, -3, 0.25, -0.25, Infinity, -Infinity]) {
    let expected = initial;
    if (op === "||=") expected ||= 42;
    else expected &&= 42;
    expect(run(initial, 42)).toBe(expected);
  }
});

it.each(["||=", "&&="])("short-circuits a trapping RHS of %s", async (op) => {
  const run = await emitted(
    `function fail(): number { throw "rhs"; } export function run(value: number): number { value ${op} fail(); return value; }`,
  );
  expect(run(op === "||=" ? 3 : 0)).toBe(op === "||=" ? 3 : 0);
  expect(() => run(op === "||=" ? 0 : 3)).toThrow();
});

it("shares a logical-assignment write with a captured outer binding", async () => {
  const run = await emitted(`export function run(initial: number, fallback: number): number {
    let cache = initial;
    function fill(): number { cache ||= fallback; return cache; }
    const value = fill(); return value + cache;
  }`);
  expect(run(0, 21)).toBe(42);
  expect(run(7, 21)).toBe(14);
});

it("lowers logical assignment inside a loop body", async () => {
  const run = await emitted(
    `export function run(initial: number): number { let value = initial; for (let i = 0; i < 3; i++) { value ||= i; } return value; }`,
  );
  expect(run(0)).toBe(1);
  expect(run(7)).toBe(7);
});

it.each([
  `const box = { value: initial }; box.value ||= 42; return box.value;`,
  `let value = initial; return (value ||= 42);`,
])("does not claim a logical assignment without its required target/result plan: %s", async (body) => {
  const result = await compile(`export function run(initial: number): number { ${body} }`, {
    target: "standalone",
    experimentalIR: true,
    trackIrOutcomes: true,
  });
  const outcome = result.irOutcomes?.find((row) => row.displayName === "run");
  expect(outcome).toBeDefined();
  expect(outcome?.irBodyEmitted).toBe(false);
});
