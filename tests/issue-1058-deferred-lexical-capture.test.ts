// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import ts from "typescript";
import { compile } from "../src/index.js";
import { readStandaloneException } from "./dogfood/upstream-suite-worker-protocol.mjs";
const cases = [
  [
    "object pattern after caught early read",
    `export function run():number{let caught=0;try{read();}catch(e){caught=e instanceof ReferenceError?1:0;}const {later}={later:7};return caught*10+read();function read(){return later;}}`,
    17,
  ],
  [
    "array pattern after caught early read",
    `export function run():number{let caught=0;try{read();}catch(e){caught=e instanceof ReferenceError?1:0;}const [later]=[7];return caught*10+read();function read(){return later;}}`,
    17,
  ],
  [
    "callback read before and after init",
    `export function run():number{const read=create();let caught=0;try{read();}catch(e){caught=e instanceof ReferenceError?1:0;}const later=7;return caught*10+read();function create(){return ()=>later;}}`,
    17,
  ],
  [
    "deferred const",
    `export function run():number{const read=create();const later=7;return read();function create(){return ()=>later;}}`,
    7,
  ],
  [
    "deferred let",
    `export function run():number{const read=create();let later=7;return read();function create(){return ()=>later;}}`,
    7,
  ],
  [
    "deferred object",
    `export function run():number{const read=create();const checker={value:7};return read();function create(){return ()=>checker.value;}}`,
    7,
  ],
  [
    "reachable immediate read",
    `export function run():number{let caught=0;try{read();}catch(e){caught=e instanceof ReferenceError?1:0;}const later=7;return caught;function read(){return later;}}`,
    1,
  ],
  [
    "deferred initialized control",
    `export function run():number{const later=7;const read=create();return read();function create(){return ()=>later;}}`,
    7,
  ],
] as const;
for (const [name, input, expected] of cases)
  for (const experimentalIR of [true, false])
    it(`${name} IR=${experimentalIR}`, async () => {
      const e: any = {};
      new Function(
        "exports",
        ts.transpileModule(input, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText,
      )(e);
      expect(e.run()).toBe(expected);
      const r = await compile(input, { target: "standalone", experimentalIR });
      expect(r.success, JSON.stringify(r.errors)).toBe(true);
      const m = new WebAssembly.Module(r.binary);
      expect(WebAssembly.Module.imports(m)).toEqual([]);
      const instance = new WebAssembly.Instance(m);
      try {
        expect((instance.exports.run as () => number)()).toBe(expected);
      } catch (e) {
        throw new Error(readStandaloneException(e, instance.exports) || String(e));
      }
    });
