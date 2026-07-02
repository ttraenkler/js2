// (#2924) `new Function("<const>")` compile-away MVP — slice 1.
//
// When every argument to `new Function(...)` / `Function(...)` is a
// compile-time-constant string, the constructor is compiled away into a real
// callable value (a global-scope function, no lexical capture — §20.2.1.1),
// host-free in standalone. Non-constant args (and unsupported bodies) bail
// gracefully to the legacy no-op stub — they must never miscompile.
//
// Slice-1 scope = the stated acceptance shapes (single-call, both modes) +
// graceful bail. Known NON-GOALS (follow-up slices, see the issue file):
//   - plain-call `Function(...)` value form (routed in calls.ts, not here);
//   - standalone silent-miscompile edges: two calls to the SAME synthesized
//     closure coexisting in ONE expression (`f(1)+f(2)`), and ≥3-arg calls —
//     a closure-call temp-collision on the standalone lane (host is correct);
//   - `undefined`-return representation (`new Function("return")()` yields the
//     stub `null` on the no-value path rather than `undefined`).
import { describe, it, expect } from "vitest";
import { compile } from "../src/index.js";
import { wrapExports } from "../src/runtime.js";

async function runStandalone(source: string): Promise<{ value: unknown; hostFree: boolean }> {
  const r = await compile(source, { target: "standalone" });
  expect(r.success, r.errors.map((e) => e.message).join("\n")).toBe(true);
  const io: Record<string, unknown> = (r as unknown as { importObject?: Record<string, unknown> }).importObject ?? {};
  const { instance } = await WebAssembly.instantiate(r.binary, io as WebAssembly.Imports);
  (io.__setExports as ((e: unknown) => void) | undefined)?.(instance.exports);
  const exp = wrapExports(instance.exports, {
    signatures: (r as unknown as { exportSignatures?: unknown }).exportSignatures as never,
  }) as Record<string, (...a: unknown[]) => unknown>;
  return { value: exp.test(), hostFree: (r.imports ?? []).length === 0 };
}

async function runHost(source: string): Promise<unknown> {
  const r = await compile(source, { fileName: "t.ts" });
  expect(r.success, r.errors.map((e) => e.message).join("\n")).toBe(true);
  const io: Record<string, unknown> = (r as unknown as { importObject?: Record<string, unknown> }).importObject ?? {};
  const { instance } = await WebAssembly.instantiate(r.binary, io as WebAssembly.Imports);
  (io.__setExports as ((e: unknown) => void) | undefined)?.(instance.exports);
  const exp = wrapExports(instance.exports, {
    signatures: (r as unknown as { exportSignatures?: unknown }).exportSignatures as never,
  }) as Record<string, (...a: unknown[]) => unknown>;
  return exp.test();
}

describe("#2924 new Function(<const>) compile-away — slice 1", () => {
  const TWO_PARAM = `export function test(): number { const f: any = new Function("a","b","return a+b"); return f(1,2); }`;
  it("two-param body, single call — standalone (host-free) === 3", async () => {
    const { value, hostFree } = await runStandalone(TWO_PARAM);
    expect(value).toBe(3);
    expect(hostFree).toBe(true);
  });
  it("two-param body, single call — host === 3", async () => {
    expect(await runHost(TWO_PARAM)).toBe(3);
  });

  const ONE_PARAM = `export function test(): number { const f: any = new Function("x","return x*2"); return f(21); }`;
  it("one-param body — standalone (host-free) === 42", async () => {
    const { value, hostFree } = await runStandalone(ONE_PARAM);
    expect(value).toBe(42);
    expect(hostFree).toBe(true);
  });

  const NO_PARAM = `export function test(): number { const f: any = new Function("return 5"); return f(); }`;
  it("no-param body — standalone (host-free) === 5, host === 5", async () => {
    const { value, hostFree } = await runStandalone(NO_PARAM);
    expect(value).toBe(5);
    expect(hostFree).toBe(true);
    expect(await runHost(NO_PARAM)).toBe(5);
  });

  // Reuse across SEPARATE statements works on both lanes (the single-expression
  // `f(1)+f(2)` two-call-coexist edge is a documented standalone non-goal).
  const REUSE_STMTS = `export function test(): number { const f: any = new Function("a","return a+10"); const x: number = f(1); const y: number = f(2); return x+y; }`;
  it("reuse across separate statements — standalone === 23, host === 23", async () => {
    const { value } = await runStandalone(REUSE_STMTS);
    expect(value).toBe(23);
    expect(await runHost(REUSE_STMTS)).toBe(23);
  });

  // NEGATIVE: a NON-constant argument must bail to the legacy stub — compile
  // succeeds, the result is the null "function" placeholder, and nothing
  // miscompiles or throws at compile time.
  const NON_CONST = `export function make(s: any): any { return new Function(s); }
export function test(): number { const f: any = make("return 7"); return (f == null) ? 2 : (typeof f === "function" ? 1 : 3); }`;
  it("non-constant arg bails gracefully to the stub (compiles, no miscompile)", async () => {
    const { value } = await runStandalone(NON_CONST);
    expect(value).toBe(2); // f == null (stub), not a wrong-value miscompile
    expect(await runHost(NON_CONST)).toBe(2);
  });
});
