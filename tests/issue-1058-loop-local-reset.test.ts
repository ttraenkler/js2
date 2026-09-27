// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";

for (const experimentalIR of [false, true]) {
  for (const [type, value] of [
    ["number[]", "[7]"],
    ["Item[]", "[{ n: 7 }]"],
    ["Item", "{ n: 7 }"],
    ["number", "7"],
  ]) {
    for (const declaration of ["let", "var"]) {
      for (const captured of [false, true]) {
        // #1058 follow-up: an optional numeric closure result still loses
        // undefined. Measured on both baseline and candidate; not fixed here.
        const test = captured && type === "number" ? it.fails : it;
        test(`initializes ${declaration} ${type} on loop entry captured=${captured} IR=${experimentalIR}`, async () => {
          const source = `
          interface Item { n: number; }
          export function run(): number {
            let count = 0;
            let missing = 0;
            for (let i = 0; i < 3; i++) {
              ${captured ? "const read = () => value;" : ""}
              ${declaration} value: ${type} | undefined;
              if (${captured ? "read()" : "value"} === undefined) missing++;
              if (i === 0) value = ${value};
              if (${captured ? "read()" : "value"}) count++;
            }
            return count + missing * 10;
          }
        `;
          const native: { run?: () => number } = {};
          new Function(
            "exports",
            ts.transpileModule(source, {
              compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
            }).outputText,
          )(native);
          const expected = declaration === "let" ? 31 : 13;
          expect(native.run!()).toBe(expected);
          const result = await compile(source, { target: "standalone", experimentalIR, trackIrOutcomes: true });
          expect(result.success, JSON.stringify(result.errors)).toBe(true);
          if (experimentalIR && type === "number" && !captured && declaration === "let") {
            expect(result.irOutcomes?.find((row) => row.displayName === "run")?.irBodyEmitted).toBe(true);
          }
          const module = new WebAssembly.Module(result.binary);
          expect(WebAssembly.Module.imports(module)).toEqual([]);
          expect(
            (new WebAssembly.Instance(module).exports.run as () => number)(),
            JSON.stringify(result.irOutcomes),
          ).toBe(expected);
        });
      }
    }
  }
}
