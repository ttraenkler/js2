// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
//
// #1355 — Proxy traps → 100% (standalone), Slice 1: the `deleteProperty` trap.
//
// Builds on #1100 Phase 1 (get/set/has + construction). Adds the §10.5.10
// [[Delete]] trap: `delete proxy.x` routes through a `ref.test $Proxy`
// front-guard on `__delete_property` to `__proxy_delete_dispatch`, which invokes
// the handler's `deleteProperty` trap closure (via the `__apply_closure` bridge,
// handler bound as `this`) and ToBoolean-coerces its result; an absent trap
// forwards to the ordinary `__delete_property` on the target. The trap field is
// the 5th `$ProxyTraps` slot, read off the open-object handler at construction.
//
// Spec: ECMA-262 §10.5.10 [[Delete]], §28.2 handler `deleteProperty`.
//
// (Proxies bound to a `const p: any` local so member ops lower to the dynamic
// `__extern_*`/`__delete_property` boundary — the path test262's untyped JS
// always takes. See #1100 test header.)
import { describe, expect, it } from "vitest";
import { compile } from "../src/index.js";

async function runStandalone(src: string): Promise<unknown> {
  const r = await compile(src, { target: "standalone" });
  expect(r.success, r.errors.map((e) => e.message).join("\n")).toBe(true);
  expect(WebAssembly.validate(r.binary), "module failed WebAssembly.validate").toBe(true);
  const { instance } = await WebAssembly.instantiate(r.binary, {});
  return (instance.exports as { test: () => unknown }).test();
}

describe("#1355 standalone Proxy — deleteProperty trap", () => {
  it("deleteProperty trap intercepts `delete proxy.x`", async () => {
    expect(
      await runStandalone(`export function test(): number {
        let hit = 0;
        const p: any = new Proxy({ x: 1 }, { deleteProperty: (t: any, k: any) => { hit = 5; return true; } });
        delete p.x;
        return hit;
      }`),
    ).toBe(5);
  });

  it("deleteProperty trap's truthy result is the `delete` expression value", async () => {
    expect(
      await runStandalone(`export function test(): boolean {
        const p: any = new Proxy({ x: 1 }, { deleteProperty: (t: any, k: any) => true });
        return delete p.x;
      }`),
    ).toBe(1);
  });

  it("absent deleteProperty trap forwards the delete to the target", async () => {
    expect(
      await runStandalone(`export function test(): boolean {
        const p: any = new Proxy({ x: 1 }, {});
        return delete p.x;
      }`),
    ).toBe(1);
  });

  it("get/set/has traps still work alongside deleteProperty (no #1100 regression)", async () => {
    expect(
      await runStandalone(`export function test(): number {
        const p: any = new Proxy({ x: 5 }, { get: (t: any, k: any) => 42 });
        return p.x;
      }`),
    ).toBe(42);
  });
});
