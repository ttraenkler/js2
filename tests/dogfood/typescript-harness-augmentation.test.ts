// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import ts from "typescript";
import { expect, it } from "vitest";
import { compile } from "../../src/index.js";
import { typescriptHarnessAugmentation } from "./typescript-harness-augmentation.mjs";
import { TYPESCRIPT_SOURCE_ASSERT } from "./typescript-source-assert.mjs";
import { UPSTREAM_TEST_SHIM } from "./upstream-suite-runner.mjs";

// Pinned harness block; the production runner reads it from the verified checkout.
const original = `{
  assert.isFalse = (expr: any, msg: string) => {
    if (expr !== false) throw new Error(msg);
  };
  const assertDeepImpl = assert.deepEqual;
  assert.deepEqual = (a, b, msg) => {
    if (ts.isArray(a) && ts.isArray(b)) {
      assertDeepImpl(arrayExtraKeysObject(a), arrayExtraKeysObject(b), "Array extra keys differ");
    }
    assertDeepImpl(a, b, msg);
    function arrayExtraKeysObject(a: readonly unknown[]): object {
      const obj: { [key: string]: unknown } = {};
      for (const key in a) {
        if (Number.isNaN(Number(key))) obj[key] = a[key];
      }
      return obj;
    }
  };
}`;

function assertions(augmented: boolean, callable: boolean) {
  const augmentation = augmented
    ? ts.transpileModule(typescriptHarnessAugmentation(original), {
        compilerOptions: { target: ts.ScriptTarget.ES2022 },
      }).outputText
    : "";
  const bootstrap = callable
    ? ts.transpileModule(TYPESCRIPT_SOURCE_ASSERT, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
    : "const assert = __qunitAssert;";
  return new Function("ts", `${UPSTREAM_TEST_SHIM}\n${bootstrap}\n${augmentation}\nreturn assert;`)({
    isArray: Array.isArray,
  });
}

it.each([false, true])("retains the original TypeScript array-property assertion (callable=%s)", (callable) => {
  const a = Object.assign([], { hasTrailingComma: true });
  const b = Object.assign([], { hasTrailingComma: false });
  expect(() => assertions(false, callable).deepEqual(a, b)).not.toThrow();
  expect(() => assertions(true, callable).deepEqual(a, b)).toThrow();
  expect(() => assertions(true, callable).deepEqual(a, Object.assign([], { hasTrailingComma: true }))).not.toThrow();
  expect(() => assertions(true, callable).deepEqual(["A"], ["B"])).toThrow();
});

it("refuses missing or ambiguous upstream augmentation blocks", () => {
  expect(() => typescriptHarnessAugmentation("export const x=1;")).toThrow();
  expect(() => typescriptHarnessAugmentation(original + "\n{}\n")).toThrow();
  expect(() => typescriptHarnessAugmentation("{ assert.deepEqual = null; }")).toThrow();
});

it.each([
  { name: "object", prefix: "const assert = __qunitAssert;" },
  { name: "callable", prefix: TYPESCRIPT_SOURCE_ASSERT },
])("enforces array metadata assertions in zero-import standalone code ($name)", async ({ prefix }) => {
  const result = await compile(
    `${UPSTREAM_TEST_SHIM}
    const ts = {isArray: (value: any): boolean => Array.isArray(value)};
    ${prefix}
    ${typescriptHarnessAugmentation(original)}
    export function checkMetadata(): number {
      const a: any = []; a.hasTrailingComma = true;
      const b: any = []; b.hasTrailingComma = false;
      const c: any = []; c.hasTrailingComma = true;
      assert.deepEqual(a,c);
      try { assert.deepEqual(a,b); } catch { return 1; }
      return 0;
    }
    export function checkRead(): number {
      const a: any = []; a.hasTrailingComma = true;
      return a.hasTrailingComma === true ? 1 : 0;
    }
    export function checkObjects(): number {
      try { assert.deepEqual({flag: true}, {flag: false}); } catch { return 1; }
      return 0;
    }
    export function checkFalse(): number {
      assert.isFalse(false);
      return 1;
    }
    export function checkForIn(): number {
      const a: any = []; a.hasTrailingComma = true;
      for (const key in a) if(key === 'hasTrailingComma') return 1;
      return 0;
    }
  `,
    { target: "standalone", skipSemanticDiagnostics: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const exports = new WebAssembly.Instance(module, {}).exports;
  expect((exports.checkRead as () => number)(), "metadata read").toBe(1);
  expect((exports.checkForIn as () => number)(), "for-in").toBe(1);
  expect((exports.checkObjects as () => number)(), "object assertion").toBe(1);
  expect((exports.checkMetadata as () => number)(), "assertion").toBe(1);
  expect((exports.checkFalse as () => number)(), "omitted assertion message").toBe(1);
});
