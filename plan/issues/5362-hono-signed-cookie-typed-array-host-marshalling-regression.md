---
id: 5362
title: "REGRESSION on main: a typed array built in compiled code no longer reaches a host WebCrypto method as a typed array — hono 244 → 220/324, all 24 in `cookie.test.ts` (`SubtleCrypto.importKey: 2nd argument is not instance of ArrayBuffer …`)"
status: ready
sprint: current
created: 2026-09-06
updated: 2026-09-06
priority: high
horizon: s
feasibility: medium
reasoning_effort: high
task_type: bug
area: compiler
goal: correctness
---

## Problem

hono dropped **244/324 → 220/324** on `main` between `01ce47aba7` and
`efa9e76f07` (27 commits, 2026-09-06 ~03:00–06:00Z). All 24 losses are in
**one file**, `src/utils/cookie.test.ts`, which now fails as a **whole
module** — per-test `wasmError` is `null`; the message is in
`report.compile.details[N]`:

```
SubtleCrypto.importKey: 2nd argument is not instance of ArrayBuffer, Buffer, TypedArray, or DataView
```

Reported by the #5342 agent on clean `main` at `efa9e76f07`, and independently
by the #5346 agent, whose *parent-code* control run also gave 220. **Not yet
measured by the lead — step 1 is to reproduce.**

The shape: hono's signed-cookie helper (`src/utils/cookie.ts`) does

```js
const secretBuf = typeof secret === 'string' ? new TextEncoder().encode(secret) : secret
const key = await crypto.subtle.importKey('raw', secretBuf, { name: 'HMAC', hash: { name: 'SHA-256' } }, false, ['sign'])
```

Both the string-secret tests and the binary-secret test
(`new Uint8Array([172, 142, …])` at `cookie.test.ts:911`) hand a typed array
produced in **compiled** code to a **host** WebCrypto method. Until this
window that crossed the boundary as a real `Uint8Array`; now the host sees
something that is not a buffer view. Whole-module failure means it dies
before the first `it` body completes — establish whether it is module-init
(a hoisted `importKey`) or the first call.

## Candidates — three `src/`-touching merges in the window

| merge | PR | what it changed | why it could do this |
|---|---|---|---|
| `fc4d4e6050` | #5646 (#5343) | `call-tail-dispatch.ts`: a registry miss now routes to the **dynamic call ladder** instead of falling through silently | `crypto.subtle.importKey(...)` is a host method on a host global; if the ladder boxes a WasmGC typed-array carrier generically (`extern.convert_any` / `__box_*`) instead of the typed-array→host conversion the direct arm used, the host receives a wrapper, not a view |
| `4001bbe811` | #5642 (#5334) | `callable-rest-bridge.ts` + runtime: host callables with rest params get a wrapper | `importKey` takes five arguments; a generic re-marshal in the bridge would turn a typed array into a plain array/object |
| `d58086f75d` | #5641 (#5250) | `src/runtime.ts` Temporal error semantics | least likely — but it touches the host runtime |

**Two measurements settle it**: the reduction at `4001bbe811` (after #5642,
before #5646) and at `b26dd237bc` (before #5642). Use the reduction, not the
full suite, for the bisect — seconds instead of minutes.

## Acceptance criteria

1. Culprit PR named, with the two bisect results quoted. **Fix forward in the
   culprit's mechanism** — do not revert any of the three PRs; each fixed
   real failures (#5343 hono/axios, #5334 jest +6, #5250 Temporal).
2. `cookie.test.ts` back to its pre-regression count (measure it at
   `01ce47aba7` yourself — expected 24/35) and hono **≥ 244/324** on the fixed
   HEAD.
3. Regression test under `tests/`, **untyped `.js` two-file fixtures**: (a) a
   `new Uint8Array([...])` literal and (b) a `TextEncoder().encode()` result,
   each passed from compiled code to a host method that requires a buffer view
   (`crypto.subtle.importKey('raw', buf, {name:'HMAC', hash:'SHA-256'}, false,
   ['sign'])` on Node's webcrypto is the real thing and needs no shim), with
   (c) an anti-vacuity control that a plain array literal still arrives as a
   plain array. Fails on the regressed parent, passes with the fix — exact
   counts both ways.
4. **A/B at one HEAD**, 17 suites, per test file. **Anchors on current main
   (2026-09-06 08:40Z)**: hono **220**/324 (regressed) · lodash **58**/62
   (#5342 landed) · jest 335/356 · prettier 101/151 · axios 200/231 · redux
   63–64/82 · marked 9/30 · three 17/18 · webpack 16 · clsx 32 · cookie 63740
   · tailwindcss 13 · jsdom 6 · styled-components 9 · uuid 75 · moment 10 ·
   stylelint 108. hono moves up; nothing else moves. If lodash or redux read
   differently on your base, re-run that suite alone before believing it.
5. All ratchet gates green including `pnpm run check:dogfood-validation`.

## Implementation Plan

0. Base recipe (mandatory, the agent worktree starts ~3,800 commits stale):
   fetch `upstream main` with the LFS overrides or STOP; detach onto
   `upstream/main`; `rev-parse HEAD` must equal `rev-parse upstream/main`;
   dirty count must be 0; only then branch.
1. Reproduce on current `main`: run the hono suite alone
   (`node --import tsx tests/dogfood/hono-upstream-suite.mjs`), read
   `compile.details` for `cookie.test.ts`, quote the exact error and which
   phase (`errors[]` / `validationError` / `runtimeError`).
2. Reduce in a standalone `.mjs` via `compileAndRunUpstreamModule` (never
   vitest + `instantiateWithRuntime`): a two-file untyped project whose entry
   does `const k = await crypto.subtle.importKey('raw', new Uint8Array([1,2,3]),
   {name:'HMAC', hash:'SHA-256'}, false, ['sign']); return k.type;`. Confirm
   the same message. Also try the `TextEncoder` form and a direct host
   function `(b) => ArrayBuffer.isView(b)` — the last one tells you whether
   it is *this* call shape or every typed-array crossing.
3. Dump WAT for the call. Which arm marshals argument 2 — the typed-array→host
   conversion (grep `src/runtime.ts` for the typed-array export/import pair,
   and `src/codegen` for how a `ref $Uint8Array` carrier is coerced to
   `externref` at a host-call boundary), or a generic box?
4. Bisect with the reduction at `4001bbe811` and `b26dd237bc`.
5. Fix in the culprit's mechanism:
   - If #5646: the dynamic ladder must coerce typed-array carriers through the
     same conversion the direct host-call arm uses (or the registry-miss
     fallthrough must not claim calls whose receiver is a host global —
     whichever is the narrower, sound change).
   - If #5642: the rest bridge must pass each argument through the direct
     call's coercion; do not re-marshal.
   - If #5641: find the runtime helper whose signature/behaviour changed and
     restore the typed-array branch.
6. Regression test; A/B; one PR; set `status: done` here with the culprit,
   the mechanism, and the two bisect measurements recorded.

## Dispatch

Model: **opus**. A two-step bisect with a seconds-long reduction, three
named candidates, and a fix inside an existing coercion arm. No design
decision — but the previous three regressions in this effort (#5333, #5332,
#5335, #5348) were each misattributed once before being measured, so the
bisect is not optional.
