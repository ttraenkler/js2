// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import ts from "typescript";
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

const cases = [
  {
    name: "values rejects nullish receivers at creation",
    body: `const method = Array.prototype.values; let rejected = 0;
      try { method.call(null); } catch (e) { if (e instanceof TypeError) rejected++; }
      try { method.call(undefined); } catch (e) { if (e instanceof TypeError) rejected++; }
      return rejected === 2 ? 1 : 0;`,
  },
  {
    name: "values advances past a throwing indexed getter",
    body: `const receiver = { length: 2, get 0() { throw 7; }, 1: 'next' };
      const method = Array.prototype.values; const it = method.call(receiver);
      try { it.next(); return 0; } catch (e) { if (e !== 7) return 0; }
      return it.next().value === 'next' && it.next().done ? 1 : 0;`,
  },
  {
    name: "values retries a throwing length getter without advancing",
    body: `let reads = 0; const receiver = { get length() { if (++reads === 1) throw 7; return 1; }, 0: 'first' };
      const method = Array.prototype.values; const it = method.call(receiver);
      try { it.next(); return 0; } catch (e) { if (e !== 7) return 0; }
      return it.next().value === 'first' && it.next().done ? 1 : 0;`,
  },
  {
    name: "direct values observes changes after creation",
    body: `const a = [1, 2]; const it = a.values(); a[0] = 7; a.push(3);
      let result = 0; for (const value of it) result = result * 10 + value;
      return result === 723 ? 1 : 0;`,
  },
  {
    name: "reflective values observes changes and stays exhausted",
    body: `const a = [1, 2]; const method = Array.prototype.values;
      const it = method.call(a); a[0] = 7; a.push(3);
      if (it.next().value !== 7 || it.next().value !== 2 || it.next().value !== 3 || !it.next().done) return 0;
      a.push(4); return it.next().done ? 1 : 0;`,
  },
  {
    name: "borrowed keys defers length and never reads indexed values",
    body: `let reads = 0; const receiver = { get length() { reads++; return '2'; },
      get 0() { throw new Error('keys must not read elements'); } };
      const method = Array.prototype.keys; const it = method.call(receiver);
      if (reads !== 0) return 0;
      if (it.next().value !== 0 || reads !== 1) return 0;
      if (it.next().value !== 1 || reads !== 2) return 0;
      if (!it.next().done || reads !== 3) return 0;
      return 1;`,
  },
  {
    name: "borrowed entries reads holes and creates fresh pairs",
    body: `const receiver:any = { 0: 'first', length: 2 };
      const method = Array.prototype.entries; const it = method.call(receiver);
      const first = it.next().value; const second = it.next().value;
      return first !== second && first[0] === 0 && first[1] === 'first' &&
        second[0] === 1 && second[1] === undefined && it.next().done ? 1 : 0;`,
  },
];

it.each(cases)("native reference: $name", ({ body }) => {
  const output = ts.transpileModule(`function run(): number { ${body} }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  expect(new Function(`${output}; return run();`)()).toBe(1);
});

it.each(cases.flatMap((test) => [true, false].map((experimentalIR) => ({ ...test, experimentalIR }))))(
  "$name in standalone (IR=$experimentalIR)",
  async ({ body, experimentalIR }) => {
    const result = await compile(`export function run(): number { ${body} }`, { target: "standalone", experimentalIR });
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    expect((new WebAssembly.Instance(module, {}).exports.run as () => number)()).toBe(1);
  },
);
