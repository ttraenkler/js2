// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.

// TypeScript's Chai assert is callable as well as carrying assertion methods.
// Delegate to the same checked operations used by the native/Wasm test adapter;
// the original harness augmentation is applied after these initial bindings.
export const TYPESCRIPT_SOURCE_ASSERT = `
function assert(value: any, message?: any): void { __qunitAssert.ok(value, message); }
${[
  "expect",
  "isTrue",
  "isFalse",
  "ok",
  "notOk",
  "isDefined",
  "equal",
  "notEqual",
  "strictEqual",
  "notStrictEqual",
  "deepEqual",
  "throws",
]
  .map((name) => `assert.${name} = __qunitAssert.${name};`)
  .join("\n")}
`;
