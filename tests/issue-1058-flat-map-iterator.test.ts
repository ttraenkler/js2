// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import ts from "typescript";
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

// TypeScript 5.9.3 core.ts's original flatMapIterator body and signature.
const source = `
function* flatMapIterator<T, U>(iter: Iterable<T>, mapfn: (x: T) => readonly U[] | Iterable<U> | undefined): Generator<U, void, any> {
  for (const x of iter) {
    const iter2 = mapfn(x);
    if (!iter2) continue;
    yield* iter2;
  }
}
let closed = 0;
function* input() { try { yield 0; yield 1; yield 2; } finally { closed++; } }
function* pair(x: number) { yield x; yield x + 10; }
function mapped(x: number): readonly number[] | Iterable<number> | undefined {
  if (x === 0) return undefined;
  return x === 1 ? [1, 11] : pair(x);
}
export function drain(): number {
  closed = 0;
  let result = 0;
  for (const x of flatMapIterator(input(), mapped)) result = result * 100 + x;
  return result === 1110212 && closed === 1 ? 1 : -1;
}
export function closeEarly(): number {
  closed = 0;
  const iterator = flatMapIterator(input(), mapped);
  if (iterator.next().value !== 1 || closed !== 0) return -1;
  const end = iterator.return(undefined);
  return end.done && closed === 1 && iterator.next().done ? 1 : -2;
}
`;

const continueSource = `
let closed = 0;
function* input() { try { yield 0; yield 1; yield 2; } finally { closed++; } }
function* values() {
  for (const x of input()) {
    if (x === 0) continue;
    yield x;
    if (x === 1) { continue; }
    yield x + 10;
  }
}
export function run(): number {
  closed = 0;
  const it = values();
  if (it.next().value !== 1 || closed !== 0) return -1;
  if (it.next().value !== 2 || closed !== 0) return -2;
  if (it.next().value !== 12 || closed !== 0) return -3;
  if (!it.next().done || closed !== 1) return -4;
  closed = 0;
  const early = values();
  if (early.next().value !== 1 || closed !== 0) return -5;
  early.return(undefined);
  return closed === 1 && early.next().done ? 1 : -6;
}
`;

it.each([true, false])(
  "continues before and after suspension without closing its iterator (IR=%s)",
  async (experimentalIR) => {
    const result = await compile(continueSource, { target: "standalone", experimentalIR });
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    expect((new WebAssembly.Instance(module, {}).exports.run as () => number)()).toBe(1);
  },
);

it("preserves the upstream iterator's skip, delegation and cleanup in Node", () => {
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: Record<string, () => number> = {};
  new Function("exports", output)(exports);
  expect(exports.drain()).toBe(1);
  expect(exports.closeEarly()).toBe(1);
});

it.each([true, false])("runs the upstream flat-map iterator without host imports (IR=%s)", async (experimentalIR) => {
  const result = await compile(source, { target: "standalone", experimentalIR });
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const exports = new WebAssembly.Instance(module, {}).exports;
  expect((exports.drain as () => number)()).toBe(1);
  expect((exports.closeEarly as () => number)()).toBe(1);
});
