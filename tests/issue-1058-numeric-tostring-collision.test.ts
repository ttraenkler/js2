// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import { instantiateWithRuntime } from "./equivalence/helpers.js";

it.each(["gc", "standalone"] as const)("keeps numeric toString independent of class methods in %s", async (target) => {
  const result = await compile(
    `
    class Version {
      constructor(public major: number) {}
      toString(): string { return "version"; }
    }
    export function classControl(): number { return new Version(1).toString() === "version" ? 42 : 0; }
    export function test(value: number, radix: number): number {
      return value.toString(radix) === "1010" ? 42 : 0;
    }
  `,
    { target, experimentalIR: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  if (target === "standalone") expect(WebAssembly.Module.imports(module)).toEqual([]);
  const instance = await instantiateWithRuntime(result);
  expect((instance.exports.classControl as () => number)()).toBe(42);
  expect((instance.exports.test as (value: number, radix: number) => number)(10, 2)).toBe(42);
});
