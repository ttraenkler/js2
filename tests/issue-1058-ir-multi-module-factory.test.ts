// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compileMulti } from "../src/index.js";

it("emits a captured factory and its imported caller through IR", async () => {
  const result = await compileMulti(
    {
      "./factory.ts": `
        export function makeAdder(base: number): (value: number) => number {
          function add(value: number): number { return base + value; }
          return add;
        }
      `,
      "./entry.ts": `
        import { makeAdder } from "./factory";
        export function run(): number { const add = makeAdder(40); return add(2); }
      `,
    },
    "./entry.ts",
    { target: "standalone", nativeStrings: true, experimentalIR: true, trackIrOutcomes: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module, {}).exports.run as () => number)()).toBe(42);
  for (const name of ["makeAdder", "run"]) {
    expect(
      result.irOutcomes?.find((row) => row.displayName === name),
      JSON.stringify(result.irOutcomes),
    ).toMatchObject({ irBodyEmitted: true });
  }
});

it("emits cross-module scalar owners with captured nested functions", async () => {
  const result = await compileMulti(
    {
      "./left.ts": `
        export function left(base: number): number {
          function add(value: number): number { return base + value; }
          return add(2);
        }
      `,
      "./right.ts": `
        export function right(base: number): number {
          function add(value: number): number { return base - value; }
          return add(2);
        }
      `,
      "./entry.ts": `
        import { left as first } from "./left";
        import { right as second } from "./right";
        export function run(): number { return first(20) + second(22); }
      `,
    },
    "./entry.ts",
    { target: "standalone", nativeStrings: true, experimentalIR: true, trackIrOutcomes: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module, {}).exports.run as () => number)()).toBe(42);
  for (const name of ["left", "right", "run"]) {
    expect(
      result.irOutcomes?.find((row) => row.displayName === name),
      JSON.stringify(result.irOutcomes),
    ).toMatchObject({ irBodyEmitted: true });
  }
});
