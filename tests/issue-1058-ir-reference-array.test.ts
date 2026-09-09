// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

it.each([false, true])("reads distinct reference layouts from a readonly array (closure=%s)", async (closure) => {
  const result = await compile(
    `export function run(): number {
    type Left = {x: number; left: number};
    type Right = {x: number; right: string};
    function read(values: readonly (Left | Right)[]): number {
      return values[0].x + values[1].x;
    }
    ${closure ? "const alias = read;" : ""}
    return ${closure ? "alias" : "read"}([{x:19,left:7}, {x:23,right:"different layout"}]);
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

it("preserves array results, element identity and undefined for invalid indices", async () => {
  const result = await compile(
    `export function run(): number {
    type Left = {x: number; left: number};
    type Right = {x: number; right: string};
    function identity(values: readonly (Left | Right)[]): readonly (Left | Right)[] { return values; }
    function missing(values: readonly (Left | Right)[], index: number): boolean { return values[index] === undefined; }
    const left = {x:19,left:7}; const right = {x:23,right:"other"};
    const values = identity([left, right]);
    if (values[0] !== left || values[1] !== right || values[0] === values[1]) return -1;
    if (missing(values, 0) || missing(values, -0)) return -2;
    if (!missing(values, -1) || !missing(values, 2)) return -3;
    if (!missing(values, 0.5) || !missing(values, -0.5)) return -4;
    if (!missing(values, 0 / 0) || !missing(values, 1 / 0)) return -5;
    if (identity([]).length !== 0 || !missing([], 0)) return -6;
    return values[0].x + values[1].x;
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
