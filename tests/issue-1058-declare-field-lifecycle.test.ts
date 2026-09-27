// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";

const cases = [
  [
    "absent any read",
    `class C{declare value:any;read(){return this.value;}} export function run(){return new C().read()===undefined?1:0;}`,
  ],
  [
    "absent number read",
    `class C{declare value:number;read(){return this.value;}} export function run(){return new C().read()===undefined?1:0;}`,
  ],
  [
    "constructor write",
    `class C{declare value:number;constructor(v:number){this.value=v;}} export function run(){const c=new C(7);return Object.keys(c).includes('value')&&c.value===7?1:0;}`,
  ],
  [
    "method write",
    `class C{declare value:number;set(v:number):number{this.value=v;return v;}} export function run(){const c=new C();c.set(7);return Object.keys(c).includes('value')&&c.value===7?1:0;}`,
  ],
  [
    "derived runtime initializer",
    `class B{declare value:any;} class C extends B{value:any=7;} export function run(){const c=new C();return Object.keys(c).includes('value')&&c.value===7?1:0;}`,
  ],
  [
    "derived implicit undefined initializer",
    `class B{declare value:any;} class C extends B{value:any;} export function run(){const c=new C();return Object.keys(c).includes('value')&&c.value===undefined?1:0;}`,
  ],
  [
    "inherited absent field",
    `class B{declare value:any;} class C extends B{other=2;} export function run(){const c=new C();return !Object.keys(c).includes('value')&&c.value===undefined?1:0;}`,
  ],
] as const;

for (const experimentalIR of [false, true]) {
  for (const [name, source] of cases) {
    it(`${name} IR=${experimentalIR}`, async () => {
      const native: { run?: () => number } = {};
      new Function(
        "exports",
        ts.transpileModule(source, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText,
      )(native);
      expect(native.run!()).toBe(1);
      const result = await compile(source, { target: "standalone", experimentalIR, trackIrOutcomes: true });
      expect(result.success, JSON.stringify(result.errors)).toBe(true);
      if (experimentalIR && name === "method write") {
        expect(
          result.irOutcomes?.find((row) => row.displayName === "C_set"),
          JSON.stringify(result.irOutcomes),
        ).toMatchObject({ irBodyEmitted: true, legacyBodyEmitted: false });
      }
      const module = new WebAssembly.Module(result.binary);
      expect(WebAssembly.Module.imports(module)).toEqual([]);
      expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(1);
    });
  }
}
