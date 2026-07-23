// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
// #3544 — standalone: dynamic `.call` on callable values silently answered
// undefined. `m.call(thisArg, ...args)` on a function VALUE flowing through the
// dynamic path lowers to `__extern_method_call(m, "call", argvec)`; a callable
// receiver (funcref-wrapper closure struct) matched no arm in the non-object
// else chain, so the call NEVER dispatched. The fix adds a leading
// `.call`-on-callable arm (src/codegen/fn-call-dispatch.ts) that discriminates
// the TWO closure calling conventions:
//   - SPLIT (user closures): thisArg = argvec[0], rest = argvec[1..]
//     -> __apply_closure(m, thisArg, rest)
//   - FOLDED (builtin proto-method closures, this-as-first-param): the ORIGINAL
//     argvec padded with undefined to the closure's declared user-param count
// These tests run compiled standalone binaries and assert on RUNTIME results.
import { describe, expect, it } from "vitest";
import { compile } from "../src/index.js";

const standaloneOpts = {
  fileName: "test.ts",
  emitWat: false,
  skipSemanticDiagnostics: true,
  target: "standalone" as const,
};

async function run(src: string): Promise<number> {
  const r = await compile(src, standaloneOpts);
  expect(r.success).toBe(true);
  expect(r.errors.filter((e) => e.severity === "error")).toEqual([]);
  const { instance } = await WebAssembly.instantiate(r.binary, {});
  return (instance.exports.test as () => number)();
}

describe("#3544 — dynamic .call dispatch on callables (standalone)", () => {
  it("folded proto-method .call on an invalid receiver throws a CATCHABLE TypeError (was: silent undefined)", async () => {
    // String.prototype.slice's receiver check / refusal body must actually run.
    expect(
      await run(`var s: any = (String.prototype as any).slice;
export function test(): number {
  try { var r = s.call(undefined, 0); return r === undefined ? 2 : 3; }
  catch (e) { return 1; }
}`),
    ).toBe(1);
  });

  it("folded proto-method .call on a VALID receiver dispatches for real (charAt)", async () => {
    expect(
      await run(`var c: any = (String.prototype as any).charAt;
export function test(): number {
  try { return c.call("abc", 1) === "b" ? 1 : 2; }
  catch (e) { return 3; }
}`),
    ).toBe(1);
  });

  it("split-convention user closure .call passes args through (was: silent undefined)", async () => {
    expect(
      await run(`function add(a: number, b: number): number { return a + b; }
var f: any = add;
export function test(): number { return f.call(undefined, 2, 3) === 5 ? 1 : 2; }`),
    ).toBe(1);
  });

  it("capturing user closure .call invokes the closure, not its expando bag", async () => {
    expect(
      await run(`var k = 10;
function mk(): any { var n = 5; return function (x: number): number { return x + n + k; }; }
var f: any = mk();
export function test(): number { return f.call(undefined, 1) === 16 ? 1 : 2; }`),
    ).toBe(1);
  });

  it("static hasOwnProperty.call reflective route is untouched", async () => {
    expect(
      await run(`var o: any = { x: 1 };
export function test(): number {
  return Object.prototype.hasOwnProperty.call(o, "x") === true ? 1 : 2;
}`),
    ).toBe(1);
  });

  it("folded proto-method .call on an invalid receiver throws even when the body is a refusal stub (slice)", async () => {
    // String.prototype.slice as a VALUE is an un-wired #2984 refusal stub; its
    // catchable "not yet implemented" TypeError satisfies the cluster-3
    // `assert.throws(TypeError, …)` shape and is a measured truth win — it
    // must keep dispatching (the narrow gate is CURATED, not every stub).
    expect(
      await run(`var s: any = (String.prototype as any).slice;
export function test(): number {
  try { var r = s.call(undefined, 0); return 2; }
  catch (e) { return 1; }
}`),
    ).toBe(1);
  });

  it("CURATED narrow gate: excluded refusal members keep the status-quo silent no-throw (#3544 deferral pin)", async () => {
    // KNOWN-WRONG, deliberately preserved: String.prototype.valueOf (and the 7
    // other census members) must NOT dispatch — their refusal throw would flip
    // vacuous-pass floor tests (#3468). This test pins the deferral; when the
    // member is wired (follow-up issues) or the #3468 vacuity is gone, flip
    // this expectation to a throw/result and delete the exclusion.
    expect(
      await run(`var v: any = (String.prototype as any).valueOf;
export function test(): number {
  try { var r = v.call("s"); return 3; }
  catch (e) { return 1; }
}`),
    ).toBe(3);
  });

  it("host lane is byte-neutral: no dispatch helpers are emitted outside standalone/wasi", async () => {
    const src = `var s: any = (String.prototype as any).slice;
export function test(): number { return s.call("abc", 1) === "bc" ? 1 : 2; }`;
    const host = await compile(src, { ...standaloneOpts, target: undefined, emitWat: true });
    expect(host.success).toBe(true);
    const wat = (host as { wat?: string }).wat ?? "";
    expect(wat).not.toContain("__fn_call_name_gate");
    expect(wat).not.toContain("__is_fn_callable");
    expect(wat).not.toContain("__fn_call_invoke");
  });
});
