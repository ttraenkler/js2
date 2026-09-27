// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compileMulti } from "../src/index.js";

const cases: Record<string, readonly [string, number]> = {
  forward: [
    "export let observed=0;try {const early=ns.C;observed=1;}catch(error){observed=error instanceof ReferenceError?7:2;}export class C{} export function value(){return observed;}",
    7,
  ],
  after: ["export class C{} export const observed=ns.C===C?7:0;export function value(){return observed;}", 7],
  duringStatic: [
    "function read(){try{const early=ns.C;return 1;}catch(error){return error instanceof ReferenceError?8:2;}}export class C{static observed=read();}export function value(){return C.observed;}",
    8,
  ],
  beforeViaFunction: [
    "function read(){try{const early=ns.C;return 1;}catch(error){return error instanceof ReferenceError?9:2;}}export const observed=read();export class C{}export function value(){return observed;}",
    9,
  ],
};

for (const experimentalIR of [false, true]) {
  for (const [name, [body, expected]] of Object.entries(cases)) {
    it(`preserves exact ESM class initialization: ${name} IR=${experimentalIR}`, async () => {
      const result = await compileMulti(
        {
          "./provider.ts": `import * as ns from './provider.js';${body}export namespace Debug{export let level=1;}`,
          "./entry.ts": "import * as ns from './provider.js';export function run(){return ns.value();}",
        },
        "./entry.ts",
        { target: "standalone", experimentalIR },
      );
      expect(result.success, JSON.stringify(result.errors)).toBe(true);
      const module = new WebAssembly.Module(result.binary);
      expect(WebAssembly.Module.imports(module)).toEqual([]);
      expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(expected);
    });
  }
}
