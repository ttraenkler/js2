// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
//
// #3667 (task #34) — DETACHED `Object.*` statics bypass the sidecar-aware runtime.
//
// ROOT CAUSE (host lane). Two different lowerings for the same builtin:
//
//   DIRECT   `Object.getOwnPropertyDescriptor(o, k)`
//              -> compiler lowering -> `__getOwnPropertyDescriptor` import
//              -> runtime.ts: `_isWasmStruct(o) ? _readOwnDescriptor(o, k) : <host gOPD>`
//              -> SIDECAR-AWARE, sees `defineProperty`-defined attributes.
//
//   DETACHED `var g = Object.getOwnPropertyDescriptor; g(o, k)`
//              -> property-access-dispatch.ts host branch
//              -> `__get_builtin("Object")` + `__extern_get(..., "getOwnPropertyDescriptor")`
//              -> the RAW HOST FUNCTION, which knows nothing about `_wasmPropDescs`
//              -> returns `undefined` for a WasmGC-struct receiver.
//
// WHY IT MATTERS: `propertyHelper.js` captures every primordial it uses as a
// DETACHED reference at the top of the file —
//   `var __getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;`
// and `verifyProperty` runs `var originalDesc = __getOwnPropertyDescriptor(obj, name);`.
// When that returns `undefined`, ALL THREE attribute comparisons fail at once,
// which is exactly the observed test262 signature ("should not be enumerable;
// should not be writable; should not be configurable" together). This is the
// mechanism behind the #3603 de-inflation's 1,038 verifyProperty-shaped failures.
//
// ⚠️ METHOD — why this was invisible for so long: every probe written by every
// lane used the DIRECT call form, because that is how one naturally writes a
// probe, and the harness never does. **Write the probe in the CALLER'S idiom,
// not your own.** Each case below therefore pairs a detached arm (the defect)
// with a direct-call control (must stay green) — the pair IS the discriminator,
// and a test asserting only one arm proves nothing.
//
// The standalone lane already does this correctly: `ensureStandaloneBuiltinStatic-
// MethodClosure` (builtin-value-read.ts) reifies these statics as closures that
// call the SAME `__object_keys` / `__getOwnPropertyDescriptor` imports the direct
// path uses. The host branch in property-access-dispatch.ts does not — it hands
// back the raw host function. That asymmetry is the fix site.

import { describe, it, expect } from "vitest";
import { compile } from "../src/index.js";
import { buildImports } from "../src/runtime.js";

async function runHost(source: string): Promise<unknown> {
  const result = await compile(source);
  if (!result.success) throw new Error("compile error: " + result.errors.map((e) => e.message).join("; "));
  if (!WebAssembly.validate(result.binary)) throw new Error("invalid wasm");
  const imports = buildImports(result.imports, undefined, result.stringPool);
  const { instance } = await WebAssembly.instantiate(result.binary, imports);
  (imports as { setExports?: (e: WebAssembly.Exports) => void }).setExports?.(instance.exports);
  return (instance.exports as { run: () => unknown }).run();
}

describe("#3667 detached Object.* statics — gOPD", () => {
  it("CONTROL direct gOPD sees a defineProperty-defined descriptor", async () => {
    const src = `export function run(): string {
      const o: any = {};
      Object.defineProperty(o, 'p', { value: 1, writable: false, enumerable: false, configurable: false });
      const d: any = Object.getOwnPropertyDescriptor(o, 'p');
      return d ? (d.writable + '/' + d.enumerable + '/' + d.configurable) : 'NO-DESC';
    }`;
    expect(await runHost(src)).toBe("false/false/false");
  });

  // RED on the merge base: returns 'NO-DESC'.
  it("DETACHED gOPD must see the same descriptor (harness form)", async () => {
    const src = `export function run(): string {
      const o: any = {};
      Object.defineProperty(o, 'p', { value: 1, writable: false, enumerable: false, configurable: false });
      const g: any = Object.getOwnPropertyDescriptor;
      const d: any = g(o, 'p');
      return d ? (d.writable + '/' + d.enumerable + '/' + d.configurable) : 'NO-DESC';
    }`;
    expect(await runHost(src)).toBe("false/false/false");
  });

  // Pins the exact propertyHelper.js idiom: capture first, define after, then read.
  it("DETACHED gOPD captured BEFORE the define (propertyHelper ordering)", async () => {
    const src = `export function run(): string {
      const g: any = Object.getOwnPropertyDescriptor;
      const o: any = {};
      Object.defineProperty(o, 'p', { value: 1, writable: false, enumerable: false, configurable: false });
      const d: any = g(o, 'p');
      return d ? String(d.value) : 'NO-DESC';
    }`;
    expect(await runHost(src)).toBe("1");
  });

  it("CONTROL detached gOPD already works on a plain-assignment prop", async () => {
    const src = `export function run(): string {
      const o: any = {};
      o.z = 1;
      const g: any = Object.getOwnPropertyDescriptor;
      const d: any = g(o, 'z');
      return d === undefined ? 'UNDEFINED' : 'got-desc';
    }`;
    expect(await runHost(src)).toBe("got-desc");
  });
});

describe("#3667 detached Object.* statics — keys", () => {
  it("CONTROL direct Object.keys", async () => {
    const src = `export function run(): number {
      const o: any = {};
      o.z = 1;
      return Object.keys(o).length;
    }`;
    expect(await runHost(src)).toBe(1);
  });

  // RED on the merge base: the detached call returns null, so `.length` is null.
  it("DETACHED Object.keys must return the same array", async () => {
    const src = `export function run(): number {
      const o: any = {};
      o.z = 1;
      const k: any = Object.keys;
      const r: any = k(o);
      return (r && r.length) ? r.length : -1;
    }`;
    expect(await runHost(src)).toBe(1);
  });
});

describe("#3667 detached Object.* statics — defineProperty", () => {
  it("CONTROL direct Object.defineProperty applies", async () => {
    const src = `export function run(): string {
      const o: any = {};
      Object.defineProperty(o, 'p', { value: 5, writable: false });
      return String(o.p);
    }`;
    expect(await runHost(src)).toBe("5");
  });

  // RED on the merge base: the detached call is a silent no-op, so `o.p` is undefined.
  it("DETACHED Object.defineProperty must apply the property", async () => {
    const src = `export function run(): string {
      const o: any = {};
      const dp: any = Object.defineProperty;
      dp(o, 'p', { value: 5, writable: false });
      return String(o.p);
    }`;
    expect(await runHost(src)).toBe("5");
  });
});

describe("#3667 uncurried primordials (already correct — guard against regression)", () => {
  it("uncurried propertyIsEnumerable is correct", async () => {
    const src = `export function run(): string {
      const o: any = {};
      Object.defineProperty(o, 'p', { value: 1, enumerable: false });
      const pie: any = (Function.prototype.call as any).bind(Object.prototype.propertyIsEnumerable);
      return String(pie(o, 'p'));
    }`;
    expect(await runHost(src)).toBe("false");
  });

  it("uncurried hasOwnProperty is correct", async () => {
    const src = `export function run(): string {
      const o: any = {};
      Object.defineProperty(o, 'p', { value: 1, enumerable: false });
      const hop: any = (Function.prototype.call as any).bind(Object.prototype.hasOwnProperty);
      return String(hop(o, 'p'));
    }`;
    expect(await runHost(src)).toBe("true");
  });

  it("SENTINEL uncurried pie reports true for a genuinely enumerable prop", async () => {
    const src = `export function run(): string {
      const o: any = {};
      o.z = 1;
      const pie: any = (Function.prototype.call as any).bind(Object.prototype.propertyIsEnumerable);
      return String(pie(o, 'z'));
    }`;
    expect(await runHost(src)).toBe("true");
  });
});
