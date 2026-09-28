// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import ts from "typescript";
import { incompleteAssertionCarrierTypes } from "../src/frontend/ts/incomplete-assertion-carriers.js";

it("selects exact incomplete interface types without treating unknown shapes as evidence", () => {
  const filename = "/incomplete-assertion-plan.ts";
  const source = ts.createSourceFile(
    filename,
    `
    interface Complete { value: number; }
    interface Optional { value: number; unused?: number; }
    interface Incomplete<T> { value: T; unused(): number; }
    class Nominal { value = 1; unused() {} }
    const value = { value: 1 };
    const a = value as Complete;
    const b = value as Optional;
    const c = value as unknown as Incomplete<number>;
    const d = { value: "s", unused() {} } as Incomplete<string>;
    const e = value as unknown as Nominal;
    declare const unknownValue: unknown;
    const f = unknownValue as Incomplete<boolean>;
  `,
    ts.ScriptTarget.Latest,
    true,
  );
  const options = { strict: true, noLib: true };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (file) => (file === filename ? source : undefined);
  const checker = ts.createProgram([filename], options, host).getTypeChecker();
  expect(
    [...incompleteAssertionCarrierTypes(checker, source).keys()].map((type) => checker.typeToString(type)),
  ).toEqual(["Incomplete<number>"]);
});

const cases = [
  {
    name: "keeps a captured method through a returned host assertion",
    body: `
      interface Host { getValue(): number; unused(): number; }
      function makeHost(value: number): Host {
        const host = { getValue: () => value };
        return host as unknown as Host;
      }
      function consume(host: Host): number { return host.getValue(); }
      export function run(): number { return consume(makeHost(17)); }
    `,
    expected: 17,
  },
  {
    name: "preserves identity and mutation through both views",
    body: `
      interface Host { value: number; unused(): number; }
      export function run(): number {
        const original = { value: 5 };
        const host = original as unknown as Host;
        if (host !== original) return -1;
        original.value = 13;
        if (host.value !== 13) return -2;
        host.value = 29;
        return original.value;
      }
    `,
    expected: 29,
  },
  {
    name: "does not materialize absent fields or methods",
    body: `
      interface Host { value: number; absent: number; unused(): number; }
      export function run(): number {
        const original = { value: 5 };
        const host = original as unknown as Host;
        if (typeof host.unused !== "undefined") return -1;
        if (typeof host.absent !== "undefined") return -5;
        if ("unused" in host || "absent" in host) return -2;
        if (host.absent !== undefined) return -3;
        const absent = host.absent;
        const kind = typeof host["unused"];
        if (absent !== undefined || kind !== "undefined") return -4;
        return Object.keys(host).length;
      }
    `,
    expected: 1,
  },
  {
    name: "throws a catchable error when an absent method is actually called",
    body: `
      interface Host { value: number; unused(): number; }
      export function run(): number {
        const host = { value: 5 } as unknown as Host;
        try { host.unused(); } catch (error) { return error instanceof TypeError ? 1 : -1; }
        return 0;
      }
    `,
    expected: 1,
  },
  {
    name: "keeps a complete implementation of the same interface usable",
    body: `
      interface Host { getValue(): number; unused(): number; }
      function incomplete(): Host { return { getValue: () => 3 } as unknown as Host; }
      function complete(): Host { return { getValue: () => 7, unused: () => 11 }; }
      export function run(): number { return incomplete().getValue() + complete().getValue() + complete().unused(); }
    `,
    expected: 21,
  },
];

for (const experimentalIR of [true, false]) {
  for (const test of cases) {
    it(`${test.name} (IR=${experimentalIR})`, async () => {
      const result = await compile(test.body, { target: "standalone", experimentalIR });
      expect(result.success, JSON.stringify(result.errors)).toBe(true);
      const module = new WebAssembly.Module(result.binary);
      expect(WebAssembly.Module.imports(module)).toEqual([]);
      const instance = new WebAssembly.Instance(module, {});
      expect((instance.exports.run as () => number)()).toBe(test.expected);
    });
  }
}
