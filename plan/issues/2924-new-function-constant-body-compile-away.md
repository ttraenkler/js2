---
id: 2924
title: 'new Function("<const>") compile-away MVP — replace the no-op stub'
status: ready
created: 2026-07-02
updated: 2026-07-02
priority: high
horizon: m
feasibility: medium
reasoning_effort: medium
task_type: feature
area: codegen
language_feature: eval
goal: runtime-eval
sprint: current
parent: 1584
depends_on: [2923]
related: [1163, 1584]
---

# #2924 — `new Function("<const>")` compile-away MVP

Slice **B** of the runtime-eval roadmap
([docs/architecture/runtime-eval-interpreter.md](../../docs/architecture/runtime-eval-interpreter.md), §6-B, §4.4).
Second landable slice — pure AOT, **standalone-safe**, no interpreter.

## Problem

`new Function(...)` / `Function(...)` currently lowers to a **no-op stub**
(`src/codegen/expressions/new-super.ts` ~line 3179): it evaluates the arguments
for side effects and returns `ref.null.extern` — a "function" that returns
`undefined`. Every test that actually _calls_ the constructed function fails
(119 `new Function(` tests fail today, roadmap §5.2), and standalone gets
nothing.

## Key semantic (why this is easier than eval)

Per **§20.2.1.1** `Function(p1, …, pn, body)`, the created function's scope is
**always the global environment** — it never captures the caller's lexical
scope. So there is no environment-reification problem here (that is eval's
Tier-2/§4.1 concern). When the parameter list and body are compile-time
**constant** strings, `new Function("a","b","return a+b")` is semantically
identical to compiling `function (a,b){ return a+b }` at that site.

## Goal

Replace the no-op stub with a compile-away path:

1. Detect the constructor callee is the global `Function` (mirror
   `isGlobalEvalIdentifier` in `eval-tiering.ts` — a `Function` identifier
   resolving only to the `.d.ts` lib declaration, not a local shadow).
2. Resolve each argument with `resolveConstantString` (from `eval-inline.ts`).
   If **all** are constant: the last is the body, the rest are the parameter
   list (comma-split, per §20.2.1.1.1 CreateDynamicFunction).
3. Synthesize `function (<params>) { <body> }` as a foreign SourceFile (reuse
   the #2923-broadened splice machinery) and emit it as a real AOT function
   value (a `funcref`/closure over the **global** scope only).
4. Non-constant arguments keep falling through to the existing path (host import
   today, the Tier-2 interpreter in #2928).

## Edge cases

- **`Function()` no args** → `function anonymous() {}` (empty body). Returns a
  callable that returns `undefined` — but a _real_ callable, not `ref.null`.
- **Multiple param strings** — `new Function("a", "b,c", "return a+b+c")`:
  params flatten across args (`a`, `b`, `c`).
- **Body parse error** → real JS throws `SyntaxError`. Emit the compile-time
  error (matches negative tests) rather than silently returning null.
- **`new` vs plain call** — `Function(...)` and `new Function(...)` are
  equivalent (§20.2.1.1); handle both callee shapes.
- **No lexical capture** — the synthesized function must NOT close over caller
  locals (global scope only). Verify a name used in the body that is a caller
  local resolves as a **global**, not the caller's binding.

## Acceptance criteria

**Slice 1 (this PR):**

- [x] `new Function("a","b","return a+b")(1,2) === 3` in **standalone (host-free)
      AND host**. (headline)
- [x] single-param + no-param const bodies, single call, both lanes host-free.
- [x] reuse across **separate statements** correct on both lanes.
- [x] a **non-constant** argument bails gracefully to the legacy stub — compiles,
      never miscompiles (negative test).
- [x] No regression in existing `new Function` tests (the stub still handles
      every non-const / unsupported case).

**Deferred to follow-up slices (explicit NON-GOALS of slice 1):**

- [ ] Plain-call value form `Function("return 42")()` (AC2) — routed in
      `calls.ts`, not `compileNewExpression`; not yet wired.
- [ ] `new Function("a","b,c","return a+b+c")(1,2,3) === 6` (AC3) — ≥3-arg call
      is correct in **host** but silently wrong (`NaN`) in **standalone** (a
      standalone closure-call arg-marshalling temp-collision, NOT unique to this
      feature — see below).
- [ ] Two calls to the SAME synthesized closure coexisting in ONE expression
      (`f(1)+f(2)`) — correct in host, silently `0` in standalone (same
      standalone closure-call temp-collision; reuse across statements is fine).
- [ ] `new Function("return")()` / `new Function()()` → `undefined` (AC5/AC6) —
      currently the no-value result is the stub `null`, not the `undefined`
      singleton.
- [ ] no-capture `typeof x` string-return (AC4) — the empty-`localMap` global
      compile is in place; the string-return marshalling needs confirming.

## WIP status (dev-f2, 2026-07-02) — core mechanism landed, iteration remaining

Implemented `tryCompileConstantFunctionCtor` in
`src/codegen/expressions/new-super.ts`, wired into the `new Function(...)` stub.
It resolves all args via `resolveConstantString`, synthesizes
`function <synth>(<params>) { <body> }` as a foreign `SourceFile`, compiles it
with an **empty enclosing `localMap`** (global scope, no lexical capture — the
§20.2.1.1 requirement), and escapes it as a callable via `emitFuncRefAsClosure`.
Reuses #2442's foreign-binding-less `compileNestedFunctionDeclaration`
tolerance. Rollback-guarded (snapshots `mod.functions.length` + `funcMap` so a
mid-body compile throw can't leave a half-registered empty-body function).

`tests/issue-2924.test.ts` (6/6) covers the slice-1 shapes + the graceful-bail
negative test.

**The standalone silent-miscompile edges (AC3 `NaN`, `f(1)+f(2)` → `0`) are
SPECIFIC to the synthesized-function closure, NOT general closure reuse.**
Verified by control: a normal `function`-expression / `function`-declaration
closure `const f=…; f(1)+f(2)` returns the CORRECT `23` in standalone, but the
`new Function`-synthesized closure returns `0` — so something about the
synthesized function's closure value / its standalone call marshalling collides
when two calls coexist in one expression (reuse across statements is correct on
both lanes; single call is correct on both lanes). Root-cause candidates: the
`emitFuncRefAsClosure`/`emitCachedFuncClosureAccess` wrapper for the
empty-`localMap`-compiled function, or the standalone `call_ref` arg temps.
Needs a focused trace (follow-up slice). Because these edges silently produce a
wrong value rather than bailing, a maintainer may prefer to **gate the
compile-away to host-only** (host is correct on every measured shape) until the
edge is fixed — flagged for the ship decision.

Stacked on #2442 (the eval-broaden `compileNestedFunctionDeclaration`
foreign-tolerance); re-base onto `main` once #2442 lands, then PR.

## Notes

Dynamic-body `new Function` (runtime-computed strings) is deferred to the Tier-2
interpreter (#2928). Umbrella: #1584. Goal: `runtime-eval`.
