// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

it.each(
  [true, false].flatMap((experimentalIR) =>
    [false, true].flatMap((isStatic) => [false, true].map((sibling) => ({ experimentalIR, isStatic, sibling }))),
  ),
)(
  "hoists a class callback (IR=$experimentalIR, static=$isStatic, sibling=$sibling)",
  async ({ experimentalIR, isStatic, sibling }) => {
    const result = await compile(
      `
    function outer(seed: number): number {
      let bestResult = seed;
      function visit(n: number): number { bestResult += n; return bestResult; }
      return visit(1);
    }
    class Collector {
      ${isStatic ? "static" : ""} run(seed: number): number {
        const result = seed;
        return [3].map(visit)[0];
        function visit(n: number): number { return ${sibling ? "add(n)" : "result + n"}; }
        ${sibling ? "function add(n: number): number { return result + n; }" : ""}
      }
    }
    export function run(): number { return outer(10) * 100 + ${isStatic ? "Collector" : "new Collector()"}.run(20); }
  `,
      { target: "standalone", experimentalIR },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(1123);
  },
);
