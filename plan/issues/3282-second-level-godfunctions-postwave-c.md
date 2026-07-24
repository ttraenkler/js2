---
id: 3282
title: "Decompose the second-level god-functions created by the Wave-B/C extractions (+ ensureAnyHelpers, + deferred object-runtime core)"
status: in-progress
assignee: ttraenkler/dev-opus-4
sprint: current
created: 2026-07-14
priority: high
feasibility: medium
model: opus
horizon: l
reasoning_effort: high
task_type: refactor
area: codegen
goal: maintainability
subtask_of: 3182
related: [3112, 3274, 3105, 3259]
# Slice B relocates the byte-identical equality tails (__any_eq/__any_strict_eq)
# out of the SANCTIONED any-helpers.ts into the sibling any-eq-helpers.ts. The
# coercion-sites gate can't see the sanctioned-source decrease, so it reads the
# net-zero move as +2/+2 growth. prove-emit-identity 60/60 proves it's a pure
# relocation, not new hand-rolled coercion.
coercion-sites-allow:
  - src/codegen/any-eq-helpers.ts
---

# #3282 — the next god-function decomposition wave (post Wave-B/C)

**Source:** the 2026-07-14 god-function breakdown session. Wave B decomposed the 5
biggest single functions (`compileCallExpression` 13,371→1,671, `ensureNativeStringHelpers`
4,843→47, `compilePropertyAccess` 3,335→96, `ensureObjectRuntime` 7,378→3,494,
`compileArrowAsClosure` 1,311→637) and Wave C the 2 biggest untouched ones
(`compileBinaryExpression` 3,129→1,330, `compileNewExpression` 3,082→1,357) — all
byte-identity IDENTICAL. That closes **#3112** (its three named functions —
compilePropertyAccess / compileBinaryExpression / compileNewExpression — are done; mark it
done).

## Problem: the extractions created *second-level* god-functions

Extracting a giant dispatch arm into a new sibling module is byte-neutral, but the arm is
itself large — so several *new* modules now contain a >1,500-LOC function that #3112 could
not have named because it didn't exist before the extraction. Measured on `main` after
Wave C (functions >1,500 LOC, excluding the deliberate lean dispatch skeletons):

| LOC   | Function                     | File (created by Wave B/C)                       |
| ----- | ---------------------------- | ----------------------------------------------- |
| 3,494 | `ensureObjectRuntime`        | object-runtime.ts — **deferred entangled core** (see #3274) |
| 3,017 | `compileReceiverMethodCall`  | expressions/call-receiver-method.ts             |
| 2,964 | `compileBuiltinStaticCall`   | expressions/call-builtin-static.ts              |
| 2,500 | `buildObjectDescriptorHelpers` | object-runtime-descriptors.ts                 |
| 2,010 | `compileIdentifierCall`      | expressions/call-identifier.ts                  |
| 1,930 | `compileNamespaceStaticCall` | expressions/call-namespace-static.ts            |
| 1,860 | `ensureAnyHelpers`           | any-helpers.ts — **never touched by any wave**  |
| 1,793 | `compileTailDispatch`        | expressions/call-tail-dispatch.ts               |

The lean skeletons `compileCallExpression` (1,671), `compileBinaryExpression` (1,709 pre-#3092
/ ~1,330), `compileNewExpression` (~1,357) are the intended reduced dispatch cores — leave
them unless a clean further cut appears.

## Approach (proven on Wave B/C)

Same byte-identity-guarded intra-function decomposition:
- Extract cohesive dispatch/receiver-family/helper-builder groups into named helpers in new
  sibling modules; `prove-emit-identity check` must print **IDENTICAL 39/39** after every step;
  `tsc --noEmit` 0.
- Both relocation-shift gates are now net-per-field / net-zero-immune (oracle-ratchet #3070,
  coercion-sites #3084), so pure relocations pass with **no** per-issue allowance.
- Continuous stacking (branch each slice off the current branch; don't idle-wait for merges),
  one PR per slice, #2093 smoke test per issue.
- **Coordinate the last stacked slice's finalization** — the July-14 run hit worktree-removal
  stranding when authors stood down mid-stack (see notes); land each stack fully before standing down.

## The `ensureObjectRuntime` entangled core (~3,494) is a distinct, harder sub-target

Per #3274's deferral note, the remaining object-runtime core (`__obj_hash`/`__key_equals`/
`__obj_find`/`__extern_get`/`__obj_insert`/`__extern_set` + the shared `emitClassifyKey`/
`emitKeyMatch`/`withKeyCoercion` closures + forward-splice machinery) is NOT a clean
byte-identical lift — it *defines* cross-cutting closures. It warrants a dedicated architect
pass; keep it a separate slice within this issue (or its own issue) rather than forcing it.

## Acceptance

1. No codegen function >1,500 LOC except the deliberate dispatch skeletons and (if still
   deferred) the object-runtime entangled core, which must carry a documented reason.
2. Every slice byte-identity IDENTICAL (39/39 gc/standalone/wasi); tsc 0; no test262 regression.
3. #3112 marked done (superseded here).

## Relation to the reduction epics

This is *structural* (breaks up functions), setting up the *reductive* follow-ons under #3182:
the emit-idiom builder library (#3105) and jscpd-quantified dedup (#3259) become far easier
once these arms are small, named helpers — decompose first, then dedup.

## Slices landed

- **Slice A (opus-1) — `__any_box_*` + `__any_unbox_*` families out of
  `ensureAnyHelpers` → new sibling module `any-boxing-helpers.ts`.**
  Lifted the seven tag-boxing primitives (`__any_box_null`, `…undefined`,
  `…i32`, `…f64`, `…bool`, `…string`, `…extern_s1`, `…ref`) and the four
  tag-unboxing primitives (`__any_unbox_i32`, `…f64`, `…bool`, `…extern`)
  verbatim into `registerAnyBoxHelpers` / `registerAnyUnboxHelpers` in the new
  `src/codegen/any-boxing-helpers.ts`. `addHelper` is threaded in as a callback
  so registration order + bodies are unchanged → emitted Wasm byte-identical
  (`prove-emit-identity check`: IDENTICAL 56/56). Extracting to a **sibling
  module** (not same-file) shrinks the god-file: `any-helpers.ts` drops
  2752 → 2425 LOC (−327), keeping the LOC-regrowth ratchet green with no
  allowance. The `undefinedSingletonActive` import back into `any-helpers.ts`
  is a runtime-only ESM cycle (both function declarations), safe. tsc 0,
  biome/prettier/loc-budget clean. Epic remains open for the eq / add families
  and the larger call-family functions.
- **Slice B (dev-opus-4) — equality & relational-comparison family out of
  `ensureAnyHelpers` → new sibling module `any-eq-helpers.ts`.**
  Lifted `__any_eq`, `__any_strict_eq`, and the four relational comparisons
  `__any_lt`/`__any_gt`/`__any_le`/`__any_ge` (via the `addComparisonHelper`
  nested registrar) verbatim into `registerAnyEqHelpers` in the new
  `src/codegen/any-eq-helpers.ts`. `addHelper` is threaded in as a callback and
  the tag-5 coercion/equality closures (`tag5ToNumber` / `tag5ValueEqThen`) are
  threaded as params so their captured environment is unchanged; the
  standalone/wasi-gated #2175 V2-S3 reference-identity reconciliation inside
  `__any_strict_eq` moved verbatim WITH its guard. Registration order
  (eq → strict_eq → lt → gt → le → ge) preserved → emitted Wasm byte-identical
  (`prove-emit-identity check`: **IDENTICAL 60/60** across gc/standalone/wasi/
  linear). `any-helpers.ts` drops 2425 → 1926 LOC (−499). No import back into
  `any-helpers.ts` (the eq region references nothing from it) → no ESM cycle.
  tsc 0, biome + check:godfiles clean. Epic remains open for the arithmetic
  (`__any_to_f64`/`__any_add`/`__any_div`/`__any_mod`/`__any_neg`) and
  `__any_typeof` tail families.

## Tail Slice (arithmetic + `__any_typeof`) — Implementation Map (handoff for a fresh dev)

Committed on branch `issue-3282-arith-typeof` (stacked on Slice B / PR #3543). This
is the next slice after the equality family: extract the remaining
`ensureAnyHelpers` helper families into a sibling module (proposed
`src/codegen/any-arith-helpers.ts`), same byte-identity-guarded pattern as Slices
A/B (`registerAny…Helpers(addHelper, …deps)`; `prove-emit-identity check` must
print **IDENTICAL 60/60** across gc/standalone/wasi/linear after every step).

**Line numbers below are on `any-helpers.ts` AS OF PR #3543's tip** (i.e. what main
looks like once #3543 lands). RE-VERIFY against current `main` before cutting — other
PRs shift them.

### Critical: the tail is NOT contiguous — it straddles the eq registrar call

Registration ORDER (must be preserved verbatim for funcIdx/byte stability):
`__any_to_f64 → __any_add → __any_sub → __any_mul → __any_div → __any_mod →
[registerAnyEqHelpers call] → __any_neg → __any_typeof`.

So there are **4 extraction points**, each a registrar called AT ITS CURRENT
POSITION (do not lump them — the eq registrar sits between `__any_mod` and
`__any_neg`):

1. **`registerAnyToF64Helper`** — `__any_to_f64` (addHelper ~1167–1309), called at
   ~1167 (BEFORE the `toF64Idx`/`boxI32Idx`/`boxF64Idx` consts at 1311–1313, which
   read it from `funcMap`). **CLEAN.** Deps to thread: `ctx` (uses
   `ctx.nativeBoxNumberTypeIdx` / `ctx.nativeBoxBooleanTypeIdx`), `addHelper`,
   `anyRefNull`, `anyTypeIdx`. No closures.

2. **`registerAnyArithmeticHelpers`** — `__any_add` (~1578–1615), the
   `addNumericBinaryHelper` generator (~1618–1667) + its two calls
   `__any_sub`/`__any_mul` (~1669–1670), `__any_div` (~1673–1687), `__any_mod`
   (~1688–~1757), called at ~1578. **MOST ENTANGLED (the delicate part).**
   - `__any_add` (1578) references closures/values defined in the 1340–1577 region:
     `concatArm` (an `Instr[]` at ~1465, itself a `anyAddCanConcat ? … : …`
     conditional capturing `opToAnyString` @1398 + `buildNumericArm` @1433),
     `stringyOperand` (@1509), `buildNumericArm` (@1433). `__any_div`/`__any_mod`
     also pull `tag5ToNumber` (@1340) and `tag5ValueEqThen` (@1052) — the SAME two
     closures Slice B already threads into the eq module.
   - Two ways to handle these closures, both byte-identical: (a) **thread the
     finished closures/values as params** (matches Slice B's `tag5ToNumber`/
     `tag5ValueEqThen` threading — `concatArm` is a value, thread it directly), or
     (b) **move the `__any_add`-specific closures** (`opToAnyString`,
     `buildNumericArm`, `concatArm`, `stringyOperand`) into the new module too —
     but first check what THEY capture (`anyAddCanConcat` flag + consts). Threading
     (a) is lower-risk. Also thread: `anyRefNull`, `anyRef`, `anyTypeIdx`,
     `toF64Idx`, `boxI32Idx`, `boxF64Idx`, `strToNumIdx`. ~10–14 params total.

3. **`registerAnyNegHelper`** — `__any_neg` (~1758–~1795), called at ~1758 (AFTER
   the eq registrar). **CLEAN.** Deps: `addHelper`, `anyRefNull`, `anyRef`,
   `anyTypeIdx`, `boxI32Idx`, `boxF64Idx`.

4. **`registerAnyTypeofHelper`** — `__any_typeof` (~1813), called at ~1790.
   **CONDITIONAL** — the whole thing lives inside
   `if (ctx.nativeStrings && ctx.nativeStrTypeIdx >= 0) { … }` (guard @1790, block
   ~1790–1911) and contains a nested `nativeStrConstInstrs` closure. Move the guard
   + nested closure VERBATIM (like Slice B moved the `#2175` standalone/wasi IIFE).
   Deps: `ctx`, `addHelper`, native-string type idxs (`ctx.nativeStrTypeIdx`,
   `ctx.nativeStrDataTypeIdx`).

### Gate interactions to expect (learned on Slice B)

- **coercion-sites**: `any-helpers.ts` is in the gate's SANCTIONED set. Moving VOCAB
  tokens OUT of it into the non-sanctioned new module reads as net growth even for a
  net-zero relocation (the sanctioned-source decrease is invisible). `__any_to_f64`
  IS in the VOCAB list → add `coercion-sites-allow: - src/codegen/any-arith-helpers.ts`
  to this issue's frontmatter (as Slice B did for `any-eq-helpers.ts`). Verify the
  true net is zero via the probe pattern before allowancing.
- **check:func-budget (#3400, 300-LOC/function)**: DON'T let any single registrar
  exceed 300 LOC — split behind a thin exported wrapper (as Slice B split
  `registerAnyEqHelpers` into loose-eq + strict-eq/relational, both <300). Prefer the
  split over a `func-budget-allow`; it serves the decomposition goal.
- **prettier/format:check** uses prettier (not biome) — run `pnpm run format:check`.
- Run the FULL `quality` set locally before pushing (lint, format:check, typecheck,
  check:{ir-fallbacks,ir-only,dead-exports,oracle-ratchet,coercion-sites,loc-budget,
  any-box-sites,func-budget,godfiles,pushraw,codegen-fallbacks,stack-balance,
  harness-compile-budget}). Slice B ate a CI round-trip by only running biome first.

### Proof protocol

Golden baseline is byte-identical to `origin/main` (Slice B proved #3543 IDENTICAL).
Capture a fresh golden baseline from the branch base, extract, then
`npx tsx scripts/prove-emit-identity.mjs check` → must be IDENTICAL 60/60. This slice
is a PURE refactor — zero conformance delta.
