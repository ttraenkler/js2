// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compileMulti } from "../src/index.js";

// An unrelated export must not make the module's class binding unreadable.
// Runtime namespaces reproduce the remaining original semver failure shape.
const surfaces = {
  empty: "",
  enum: "export enum Kind {One,Two}",
  functions: "export namespace Debug {export function check(){return 7;}}",
  variable: "export namespace Debug {export let level=1;}",
  object: "export const factory={value:7};",
};

for (const experimentalIR of [false, true]) {
  for (const [name, extra] of Object.entries(surfaces)) {
    it(`reads an exported class beside ${name} IR=${experimentalIR}`, async () => {
      const result = await compileMulti(
        {
          "./provider.ts": `export class Range {constructor(public value:string){} static tryParse(text:string){return new Range(text);}} ${extra}`,
          "./entry.ts": `import * as ns from './provider.js'; export function run(){return ns.Range.tryParse('abc').value.length;}`,
        },
        "./entry.ts",
        { target: "standalone", experimentalIR },
      );
      expect(result.success, JSON.stringify(result.errors)).toBe(true);
      const module = new WebAssembly.Module(result.binary);
      expect(WebAssembly.Module.imports(module)).toEqual([]);
      expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(3);
    });
  }
}
