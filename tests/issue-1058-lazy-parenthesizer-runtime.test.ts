// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compileMulti } from "../src/index.js";
import { instantiateWithRuntime } from "./equivalence/helpers.js";

it.each(
  (["gc", "standalone"] as const).flatMap((target) =>
    [false, true].flatMap((annotated) =>
      [false, true].flatMap((getter) =>
        [false, true].map((dynamicParameter) => ({ target, annotated, getter, dynamicParameter })),
      ),
    ),
  ),
)(
  "executes lazy rules in $target (annotated=$annotated, getter=$getter, dynamic=$dynamicParameter)",
  async ({ target, annotated, getter, dynamicParameter }) => {
    const result = await compileMulti(
      {
        "./core.ts": `
        export function memoize<T>(callback: () => T): () => T {
          let value: T;
          return () => {
            if (callback) { value = callback(); callback = undefined!; }
            return value;
          };
        }
      `,
        "./rules.ts": `
        export interface Node { value: number; }
        export interface Factory { seed: number; make(value: number): Node; run(): number; readonly parenthesizer: Rules; }
        export interface Rules { wrap(value: number): Node; }
        export function createRules(factory: ${dynamicParameter ? "any" : "Factory"}): Rules {
          return { wrap };
          function wrap(value: number): Node { return factory.make(value); }
        }
      `,
        "./factory.ts": `
        import { memoize } from "./core";
        import { createRules, Factory, Node } from "./rules";
        export function createFactory() {
          const rules = memoize(() => createRules(factory));
          const factory${annotated ? ": Factory" : ""} = {
            seed: 40, make, run,
            ${getter ? "get parenthesizer() { return rules(); }" : "parenthesizer: undefined!"}
          };
          return factory;
          function make(value: number): Node { return { value: factory.seed + value }; }
          function run(): number { return ${getter ? "factory.parenthesizer" : "rules()"}.wrap(2).value; }
        }
      `,
        "./entry.ts": `
        import { createFactory } from "./factory";
        const factory = createFactory();
        export function test(): number { return factory.run() + factory.run(); }
      `,
      },
      "./entry.ts",
      { target, experimentalIR: true, skipSemanticDiagnostics: true },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    if (target === "standalone") expect(WebAssembly.Module.imports(module)).toEqual([]);
    const instance = await instantiateWithRuntime(result);
    expect((instance.exports.test as () => number)()).toBe(84);
  },
);
