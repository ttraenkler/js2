// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import ts from "typescript";

const cases = {
  "writable own size shadows inherited getter": `
    function read(o: any, k: string): any { return o[k]; }
    export function run(): number {
      const a: any = new Map();
      Object.defineProperty(a, "size", {value: 4, writable: true, configurable: true});
      a.size = 42;
      return read(a, "size") === 42 && Object.hasOwn(a, "size") ? 1 : 0;
    }`,
  "prototype writable replacement": `
    function read(o: any, k: string): any { return o[k]; }
    export function run(): number {
      Object.defineProperty(Map.prototype, "size", {value: 4, writable: true, configurable: true});
      const a: any = new Map(); a.size = 42;
      return read(a, "size") === 42 && Object.hasOwn(a, "size") ? 1 : 0;
    }`,
  "prototype deletion survives another constructor": `
    function read(o: any, k: string): any { return o[k]; }
    export function run(): number {
      const first = new Map();
      delete (Map.prototype as any).size;
      const a: any = new Map(); a.size = 42;
      return read(a, "size") === 42 && Object.hasOwn(a, "size") ? 1 : 0;
    }`,
  "Set and WeakMap identity properties": `
    function read(o: any, k: string): any { return o[k]; }
    export function run(): number {
      const a: any = new Set(); const b: any = new WeakMap();
      a.extra = 42; b.extra = 7;
      if (read(a, "extra") !== 42 || read(b, "extra") !== 7) return 0;
      return delete a.extra && read(a, "extra") === undefined && read(b, "extra") === 7 ? 1 : 0;
    }`,
  "identity and scalar reads": `
    function read(o: any, key: string): any { return o[key]; }
    export function run(): number {
      const a: any = new Map(); const b: any = new Map();
      a.label = 42; b.label = 7;
      return read(a, "label") === 42 && read(b, "label") === 7 ? 1 : 0;
    }`,
  "attached function identity": `
    function read(o: any, key: string): any { return o[key]; }
    function answer(): number { return 42; }
    export function run(): number {
      const a: any = new Map(); a.extra = answer;
      return read(a, "extra") === answer ? 1 : 0;
    }`,
  "own keys and descriptors": `
    export function run(): number {
      const a: any = new Map(); a.extra = 42;
      const d = Object.getOwnPropertyDescriptor(a, "extra")!;
      return Object.keys(a).length === 1 && Object.keys(a)[0] === "extra"
        && d.value === 42 && d.writable && d.configurable && d.enumerable ? 1 : 0;
    }`,
  delete: `
    function read(o: any, key: string): any { return o[key]; }
    export function run(): number {
      const a: any = new Map(); a.extra = 42;
      if (read(a, "extra") !== 42) return -1;
      return delete a.extra && read(a, "extra") === undefined && Object.keys(a).length === 0 ? 1 : 0;
    }`,
  "non-writable descriptor": `
    export function run(): number {
      const a: any = new Set(); Object.defineProperty(a, "extra", {value: 42, writable: false});
      try { a.extra = 7; } catch {}
      return a.extra === 42 ? 1 : 0;
    }`,
  "inherited size accessor": `
    export function run(): number {
      const a: any = new Map(); a.set("x", 1);
      try { a.size = 42; } catch {}
      return a.size !== 1 ? -2 : Object.hasOwn(a, "size") ? -3 : 1;
    }`,
};

it.each([true, false].flatMap((ir) => Object.entries(cases).map(([name, source]) => [ir, name, source] as const)))(
  "retains native collection own properties IR=%s: %s",
  async (experimentalIR, _name, source) => {
    const native: { run?: () => number } = {};
    const mapSize = Object.getOwnPropertyDescriptor(Map.prototype, "size")!;
    try {
      new Function(
        "exports",
        ts.transpileModule(source, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.CommonJS,
          },
        }).outputText,
      )(native);
      expect(native.run!()).toBe(1);
    } finally {
      Object.defineProperty(Map.prototype, "size", mapSize);
    }
    const result = await compile(source, { target: "standalone", experimentalIR, deferTopLevelInit: true });
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    const instance = new WebAssembly.Instance(module);
    (instance.exports.__module_init as (() => void) | undefined)?.();
    expect((instance.exports.run as () => number)()).toBe(1);
  },
);
