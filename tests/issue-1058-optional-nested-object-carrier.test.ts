// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import ts from "typescript";
import { expect, it } from "vitest";
import { compile, wrapExports } from "../src/index.js";

const prefix = "interface N{value:number;tail?:N;}";
const root = "const root:N={value:1,tail:{value:7}};";
const cases = [
  [
    "array storage",
    prefix + `export function run(){${root}const out:N[]=[];out.push(root.tail!);return out[0].value;}`,
    7,
  ],
  ["local assignment", prefix + `export function run(){${root}const leaf:N=root.tail!;return leaf.value;}`, 7],
  [
    "function argument",
    prefix + `function get(node:N){return node.value;} export function run(){${root}return get(root.tail!);}`,
    7,
  ],
  ["direct read control", prefix + `export function run(){${root}return root.tail!.value;}`, 7],
  ["direct own keys control", prefix + `export function run(){${root}return Object.keys(root.tail!).length;}`, 1],
  [
    "identity and mutation",
    prefix +
      `export function run(){${root}const leaf:N=root.tail!;leaf.value=9;return leaf===root.tail?root.tail!.value:-1;}`,
    9,
  ],
  [
    "absent own property",
    prefix +
      `export function run(){${root}const leaf:N=root.tail!;return Object.keys(leaf).length*10+(leaf.tail===undefined?1:0);}`,
    11,
  ],
  [
    "nullable context",
    "interface N{value:number;tail:N|null;} function get(node:N){return node.value;} export function run(){const root:N={value:1,tail:{value:7,tail:null}};return get(root.tail!);}",
    7,
  ],
  [
    "distinct union shapes",
    "interface A{a:number;} interface B{b:number;} export function run(){const root:{child?:A|B}={child:{b:7}};return (root.child as B).b;}",
    7,
  ],
] as const;

for (const target of ["gc", "standalone"] as const) {
  for (const experimentalIR of [false, true]) {
    for (const [name, source, expected] of cases) {
      // These value defects also reproduce on the exact pre-repair baseline.
      // Keep executable desired-value checks; an unexpected pass requires
      // removing the marker rather than silently accepting a stale limitation.
      const unresolved =
        name === "absent own property" ||
        name === "direct own keys control" ||
        (name === "distinct union shapes" && target === "gc");
      const check = unresolved ? it.fails : it;
      check(`${name} ${target} IR=${experimentalIR}`, async () => {
        const native: { run?: () => number } = {};
        new Function(
          "exports",
          ts.transpileModule(source, {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
          }).outputText,
        )(native);
        expect(native.run!()).toBe(expected);
        const result = await compile(source, { target, experimentalIR });
        expect(result.success, JSON.stringify(result.errors)).toBe(true);
        const module = new WebAssembly.Module(result.binary);
        if (target === "standalone") expect(WebAssembly.Module.imports(module)).toEqual([]);
        const imports = result.importObject ?? {};
        const instance = new WebAssembly.Instance(module, imports);
        (imports as { __setInstance?: (value: WebAssembly.Instance) => void }).__setInstance?.(instance);
        const exports = wrapExports(instance, { signatures: result.exportSignatures }) as unknown as { run(): number };
        expect(exports.run()).toBe(expected);
      });
    }
  }
}
