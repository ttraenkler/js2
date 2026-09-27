// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import ts from "typescript";
import { expect, it } from "vitest";
import { compile } from "../../src/index.js";
import { TYPESCRIPT_SOURCE_ASSERT } from "./typescript-source-assert.mjs";
import { UPSTREAM_TEST_SHIM } from "./upstream-suite-runner.mjs";

const source = `${UPSTREAM_TEST_SHIM}\n${TYPESCRIPT_SOURCE_ASSERT}
export function passing(): number {
  assert(true); assert(1); assert('yes'); assert({}); assert([]);
  assert.equal(1,'1'); assert.strictEqual(1,1); assert.deepEqual([1,2],[1,2]);
  return 1;
}
export function failing(): number {
  let count=0;
  for(const value of [false,0,'',null,undefined]) {
    try {assert(value,'sentinel');} catch(error) {if(error.message==='sentinel' || String(error.message).includes('sentinel'))count++;}
  }
  try {assert.strictEqual(1,2);} catch {count++;}
  try {assert.deepEqual([1],[2]);} catch {count++;}
  return count;
}
`;

it("implements callable truthiness and rejecting methods in the native adapter", () => {
  const js = ts.transpileModule(source.replace(/export function/g, "function"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = new Function(`${js}\nreturn {passing,failing};`)();
  expect(exports.passing()).toBe(1);
  expect(exports.failing()).toBe(7);
});

it.each([true, false])("implements callable assertions without host imports (IR=%s)", async (experimentalIR) => {
  const result = await compile(source, { target: "standalone", experimentalIR, skipSemanticDiagnostics: true });
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const exports = new WebAssembly.Instance(module, {}).exports;
  expect((exports.passing as () => number)()).toBe(1);
  expect((exports.failing as () => number)()).toBe(7);
});
