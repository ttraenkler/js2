---
id: 2895
title: "Standalone: genuinely-pending await needs true frame suspension (AG1 / PATH B) — await-on-$Frame + microtask resume"
status: ready
created: 2026-06-30
priority: medium
feasibility: hard
task_type: feature
area: codegen
goal: standalone
sprint: Backlog
horizon: xl
related: [2864, 2865, 2867, 2367]
umbrella: 2860
architect_spec: candidate
depends_on: [2865]
---

# Standalone: true async-frame suspension for genuinely-pending awaits (PATH B)

## Context

#2865 AG0 (PATH A) shipped the host-free **synchronous-settlement** subset:
under `--target standalone`/WASI, `await` now unwraps one level of the native
`$Promise` carrier (`expressions.ts` `emitStandaloneAwaitUnwrap`) and
`isStandalonePromiseActive` covers `ctx.standalone`, so `await Promise.resolve(x)`,
`await <literal>`, and `await <a sync-fulfilled promise>` run host-free with
correct values (no NaN). Async functions are still compiled **synchronously**
(the CPS state machine is gated off for standalone/WASI in `function-body.ts`).

## Problem (what AG0 does NOT cover)

A **genuinely-pending** await — a promise that only settles on a *later*
microtask/timer (executor that resolves async, `await fetch()`-style I/O,
`Promise.all` of pending promises, `.then` chains observed synchronously) —
cannot be served by one-level unwrap: the value is not present during the
synchronous body execution. AG0 returns the pending `$Promise.value` (null /
stale) for these. They were already wrong pre-AG0, so AG0 is not a regression,
but it does not fix them.

## Root cause / design (PATH B)

Build a real resumable async frame, host-free:

- Extend the #2864 `$Frame` br_table state machine with `await` as an additional
  **suspend-kind** (the AG2 "await-on-`$Frame` convergence"): at an await,
  spill live locals, register a reaction (continuation funcref + frame capture)
  on the awaited `$Promise`'s reaction list, and return the result `$Promise`.
- Rewrite `async-cps.ts` to consume/produce the **native** `$Promise` + the
  existing microtask ring (`async-scheduler.ts`) instead of the host
  `Promise_resolve`/`Promise_then2`/`__make_callback` imports.
- Microtask drain resumes the frame at the saved state with the settled value.
- Async functions then return real `$Promise`s even under standalone.

Reconcile the two existing substrates: the wasi/standalone-gated `$Frame`
(`generators-native.ts`) and the microtask/Promise machinery
(`async-scheduler.ts`, which today has no async-function frame driver).

## Architect spec

NOTE (verified 2026-06-30): `origin/async-gen-2865-spec` has **no unique
commits** (it is *behind* main) and contains **no AG0–AG5 design** — the
believed-existing spec does not exist. The design below was derived from a
direct read of the two substrates; it IS the spec.

## Implementation Plan (derived from substrate read)

### What exists to reuse

**Scheduler (`async-scheduler.ts`, gated host-free; AG0 extended the gate to
`standalone`):**
- `$Promise` struct = `[state:i32, value:externref, callbacks:externref]`
  (`getOrRegisterPromiseType`). `state` ∈ {0 pending, 1 fulfilled, 2 rejected}.
- `$PromiseCallback` reaction-list node = `[onFulfilledFn:funcref,
  onFulfilledCaps:externref, onRejectedFn:funcref, onRejectedCaps:externref,
  next:externref]`.
- Microtask ring + `__microtask_enqueue(funcref, caps:externref,
  arg:externref)` and `__drain_microtasks()` (drains by `call_ref fn(caps,
  arg)` — the uniform wrapper signature is `(externref, externref) ->
  externref`, result dropped).
- `__promise_fulfill(promise, value)` / `__promise_reject(promise, value)` —
  one-shot settle + schedule the promise's queued reactions onto the ring.
- `.then` already builds reaction records + chained promises this way.

**Generator frame (`generators-native.ts`, gated `noJsHostTarget`):**
- `buildNativeGeneratorPlan` — splits a body into states at suspend points,
  computes live-across-suspend spills + their types (`resolveSpillLocalValType`).
- The state struct = `[state:i32, mode:i32, sent, abrupt, error, params…,
  spills…]`; `ensureNativeGeneratorResumeFunction` emits `(ref $State) ->
  (ref $Result)` as a `br_table`-on-`state` trampoline; `compileState` emits one
  segment; spills are stored/loaded via `struct.get/set`.
- Drive is `.next()/.return()/.throw()` dispatch producing a `{value,done}`
  `IteratorResult`.

### The async-frame lowering (target shape)

For `async function f(<params>) { <prefix> ; const x = await P ; <suffix> }`:

1. **State struct** `$AsyncFrame_f = [state:i32, mode:i32, sent:externref,
   error:externref, result:(ref $Promise), params…, spills…]`. `sent` carries
   the resolved await value; `mode` ∈ {0 resume-fulfilled, 1 resume-rejected}
   so a rejected awaited promise re-throws at the resume point.
2. **Resume fn** `__async_resume_f(self:(ref $AsyncFrame_f)) -> void` —
   `br_table` on `state`. Each `await` is a suspend: store spills, set the next
   `state`, register the reaction (step 3), `return`. On normal completion
   `__promise_fulfill(self.result, <returned value boxed externref>)`; on an
   uncaught throw `__promise_reject(self.result, <error>)`.
3. **await suspend sequence** (at each await):
   - compile the awaited expr → externref; `Promise.resolve`-assimilate to a
     `(ref $Promise)` (reuse AG0's native fulfilled-`$Promise` construction so a
     plain value becomes a settled promise);
   - register a reaction on that promise whose `onFulfilledFn` /`onRejectedFn`
     is the **step wrapper** `__async_step_f` and whose caps is `self`
     (extern-converted). If the promise is ALREADY settled, enqueue the step
     directly via `__microtask_enqueue` (don't lose the wakeup); if pending,
     append a `$PromiseCallback` so `__promise_fulfill/reject` schedules it.
   - `return` (suspends the frame).
4. **Step wrapper** `__async_step_f(caps:externref, value:externref) ->
   externref` (uniform ring signature): `ref.cast` caps → `(ref $AsyncFrame_f)`,
   store `value` into `self.sent` (set `mode` for the reject variant), call
   `__async_resume_f(self)`, return null. Two wrappers (fulfill/reject) or one
   wrapper + a mode field set by which reaction fired.
5. **Call site** `f(args)`: allocate the frame + a pending `result` `$Promise`,
   store args, `call __async_resume_f(self)` (runs the prefix to the first
   suspend or to completion), then leave `extern.convert_any(self.result)` on the
   stack as f's return value. So `f()` returns a real `$Promise` even standalone.
6. **`await f()`** then unwraps that promise: a *pending* one now suspends the
   awaiter's frame (recursion through the same machinery); a settled one is
   AG0's one-level unwrap.
7. **Drain**: the module top-level / `test()` harness path must call
   `__drain_microtasks()` after the synchronous body so queued resumptions run
   (WASI `_start` already auto-drains; standalone needs the drain wired at the
   top-level init / before reading an exported async result — confirm the
   standalone harness drains, else add an exported drain or auto-drain).

### THE architectural fork (needs a decision — see escalation)

**Reuse the generator frame infra vs. build a parallel async-frame.** The
state-split + spill-typing + `br_table` trampoline (the hard part) is identical;
the suspend semantics (yield-vs-await), the result (`IteratorResult` vs
`$Promise`), and the drive (`.next()` vs microtask reaction) differ.

- **Option R (reuse/extend generators-native.ts):** add `await` as a suspend
  kind in `buildNativeGeneratorPlan` + `compileState`, parameterize result/drive.
  Maximal code reuse; RISK: the ~250 working native-generator tests share these
  functions — a regression here is high-blast-radius.
- **Option P (parallel async-frame, recommended):** extract the body-analysis +
  state-split + spill-typing + trampoline into a shared `frame-core` module that
  both generators and async consume; build a SEPARATE async result/drive layer
  (`$Promise` + microtask) in/next-to `async-scheduler.ts`. More up-front
  extraction, but isolates async from the generator dispatch and keeps each
  path's result semantics clean. Lower regression risk to existing generators.

**Recommendation: Option P** — extract the shared frame-core, keep async's
result/drive separate. Confirm before the large build.

### First slice (after the fork decision)

Plain async fn, single pending await, no try/catch-across-await: items 1–5 above
for one await + the drain wiring (item 7). Verify-first `--target standalone`: a
microtask-deferred resolve resumes correctly host-free, value flows, no
NaN/illegal-cast. Defer multi-await chains, try/catch-across-await, for-await,
and async generators (#2865) to later slices.

## Test plan

- `test/language/expressions/await/**`, `test/language/statements/async-function/**`
  (the pending-await shapes AG0 leaves wrong).
- `test/built-ins/Promise/**` `.then`/`all`/`race` observed across a microtask.
- Full `merge_group` + standalone high-water. Sequence after #2865 AG0 (landed).

Also unblocks #2367 (native Promise carrier) and feeds #2865 (async generators).

## Suspended Work (handoff — PR2 starts fresh next window)

**Status:** AG0 (#2380) + PR1 frame-core (#2384) landed/landing; PR2 (the async
result/drive layer) is **paced to a fresh focused window** — deliberately NOT
started on a draining budget, because its first slice is an **atomic** unit
(no testable partial frame) of several-hundred-line greenfield WasmGC in the
−601 stack-balance/illegal-cast risk class. A clean fresh start beats a
half-built broken frame.

**Foundation already in place:**
- `src/codegen/frame-core.ts` (PR #2384) — the shared frame ABI + `FrameLayout`
  interface + state-field-I/O / spill-store helpers, byte-identical-proven for
  generators. PR2 imports from here; do NOT re-fork the substrate.
- `src/codegen/async-scheduler.ts` — the native `$Promise` struct
  `[state:i32, value:externref, callbacks:externref]`, `$PromiseCallback`
  reaction list, microtask ring (`__microtask_enqueue(funcref, caps, arg)` /
  `__drain_microtasks`), `__promise_fulfill/reject`, uniform `(caps, value) ->
  externref` wrapper sig. Reuse these for the drive.
- AG0 (#2380): `isStandalonePromiseActive = wasi||standalone` (Promise.resolve/
  reject native + await-unwrap); native `.then`/`.catch` chaining scoped to
  WASI-only via `isStandaloneThenChainNativeActive` (PR2 widens this back to
  standalone once the frame-driven `.then` lands).

**PR2 first-slice machinery (atomic — all of it, for ONE pending await in a
plain async fn):** see `## Implementation Plan` above for the full design. The
ordered build list:
1. async-frame **plan/analysis** (split body at `await` + live-across-await
   spill typing) — model on `buildNativeGeneratorPlan` + `resolveSpillLocalValType`.
2. `$AsyncFrame` **state struct** `[state, mode, sent, error, result(ref
   $Promise), params…, spills…]` via `FrameLayout` + the frame-core ABI.
3. `__async_resume_f(self) -> void` **br_table trampoline** — model on
   `ensureNativeGeneratorResumeFunction`; settle-on-completion via
   `__promise_fulfill`/`__promise_reject`.
4. **await-suspend emission**: assimilate awaited → `(ref $Promise)` (reuse AG0
   native fulfilled-promise construction), register reaction (`__async_step_f` +
   `self` caps) on the promise / enqueue if already-settled, then `return`.
5. `__async_step_f(caps, value) -> externref` **microtask adapter**: cast caps →
   `$AsyncFrame`, store `value`→`sent` (mode for reject), call resume.
6. **call-site**: alloc frame + pending result `$Promise`, store args, call
   resume (runs prefix to first suspend / completion), leave
   `extern.convert_any(self.result)` as the return value.
7. **drain wiring**: ensure `__drain_microtasks` runs after the synchronous body
   / before an exported async result is read (WASI `_start` auto-drains; confirm
   the standalone harness drains, else add it).

**Architectural decision (settled):** Option P — a SEPARATE async result/drive
layer that REUSES frame-core, NOT extending generators-native.ts (its `.next/
.return/.throw`+IteratorResult dispatch is the wrong fit and high-blast-radius
on the ~250 generator tests).

**VERIFY-FIRST DISCIPLINE (non-negotiable — this is the −601 lesson):** do NOT
trust synthetic probes. Validate against **corpus-scale `wrapTest`** on the
real test262 async-method-in-class shapes (e.g.
`Promise.all([...]).then(arrow).then($DONE,$DONE)`, the
`class/elements/*async-method*privatename*` family). The recipe that caught the
−601: download the merged standalone report artifact, extract the failing/target
test paths, run each through `tests/test262-runner.ts` `wrapTest` + `compile({
target:'standalone' })` + `WebAssembly.compile`, and check for "not enough
arguments on the stack" / illegal-cast. The merge_group standalone report must be
NET-POSITIVE; a broken frame regresses hundreds of tests at once.

**Branch:** `issue-2895-async-frame-pr2` (committed clean, pushed; stacked on PR1
frame-core). Resume there or branch fresh from `origin/main` once PR1 lands and
`frame-core.ts` is on main.
