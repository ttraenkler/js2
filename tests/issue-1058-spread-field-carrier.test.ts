// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

for (const experimentalIR of [true, false]) {
  it.each([
    ["string", "any", '"text"', 'copy(source).value === "text"'],
    ["number", "any", "42", "copy(source).value === 42"],
    ["any", "number", "42", "copy(source).value === 42"],
    ["boolean", "any", "true", "copy(source).value === true"],
    ["Node", "any", "node", "copy(source).value === node"],
  ])(
    "copies %s to %s with its value intact (IR=" + experimentalIR + ")",
    async (sourceType, targetType, value, check) => {
      const result = await compile(
        `
      interface Node { text: string; }
      interface Source { value: ${sourceType}; }
      interface Target { value: ${targetType}; extra: number; }
      function copy(source: Source): Target { return {...source, extra: 7}; }
      export function run(): number {
        const node = {text: "identity"};
        const source: Source = {value: ${value}};
        return ${check} && copy(source).extra === 7 ? 1 : 0;
      }
    `,
        { target: "standalone", experimentalIR },
      );
      expect(result.success, JSON.stringify(result.errors)).toBe(true);
      const module = new WebAssembly.Module(result.binary);
      expect(WebAssembly.Module.imports(module)).toEqual([]);
      expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(1);
    },
  );

  it("preserves earlier writers for absent properties (IR=" + experimentalIR + ")", async () => {
    const result = await compile(
      `
      interface Source { name?: any; }
      interface Target { name: string; }
      function named(source: Source): Target { return {name: "fallback", ...source}; }
      function spread(source: Source): Target { return {...{name: "fallback"}, ...source}; }
      export function run(): number {
        return (named({name: "later"}).name === "later" ? 1 : 0) + (named({}).name === "fallback" ? 2 : 0) +
          (spread({name: "later"}).name === "later" ? 4 : 0) + (spread({}).name === "fallback" ? 8 : 0);
      }
    `,
      { target: "standalone", experimentalIR },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(15);
  });
}

it.each([true, false])(
  "converts an opaque spread field into the destination string carrier (IR=%s)",
  async (experimentalIR) => {
    const result = await compile(
      `
    interface Source { name: any; kind: string; }
    interface Action { name: string; kind: string; error?: string; }
    function copy(source: Source): Action { return {...source, error: "reason"}; }
    export function run(): number {
      const result = copy({name: "action", kind: "refactor"});
      return result.name === "action" && result.kind === "refactor" && result.error === "reason" ? 1 : 0;
    }
  `,
      { target: "standalone", experimentalIR },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(1);
  },
);
