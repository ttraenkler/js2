---
id: 1917
title: "One coercion engine — four divergent coercion matrices disagree about lossiness"
status: in-progress
sprint: 64
model: opus
created: 2026-06-10
updated: 2026-06-17
priority: high
feasibility: medium
reasoning_effort: high
task_type: refactor
area: codegen
language_feature: compiler-internals
goal: correctness
---
# #1917 — One coercion engine

## Problem

Four independently-maintained type-coercion matrices coexist in the WasmGC
backend, and they **disagree semantically**:

- `coerceType` (`src/codegen/type-coercion.ts:980`, ~1,100 lines for one function)
- `coercionInstrs` (`type-coercion.ts:2695-2903`)
- `callArgCoercionInstrs` (`src/codegen/stack-balance.ts:1179-1310`)
- `fixBranchType` (`stack-balance.ts:678-764`), plus `fixLocalSetCoercion`

Observed divergence:
- externref→f64: `callArgCoercionInstrs` calls `__unbox_number` (correct);
  `fixBranchType` emits lossy `drop; f64.const 0` (`stack-balance.ts:724-728`).
- ref→f64: `coercionInstrs` pushes `f64.const NaN` (line 2786);
  `fixBranchType` pushes `0` (lines 737-742).

So the runtime value a coercion produces depends on *which syntactic context
triggered it* — call argument vs branch result vs local.set. Additionally,
the guarded-ref-cast idiom (tee tmp → ref.test → if/then cast / else null) is
copy-pasted ≥6 times within type-coercion.ts alone (1026-1048, 1067-1089,
2820-2834, 2843-2857, 2865-2878, 2885-2898).

## Proposed approach

1. Extract a single `coercionPlan(from: ValType, to: ValType, ctx) →
   { instrs: Instr[] } | { needsTemp: ... } | { lossy: true, instrs }` table
   in `type-coercion.ts`.
2. Consume it from all four call sites; delete the local matrices.
3. `lossy` arms emit a located diagnostic (ties into #1918's strict mode) —
   a lossy coercion in a branch fixup is an emitter bug being masked, and
   should be visible.
4. Extract one `guardedRefCast(toTypeIdx)` helper for the 6+ copies.
5. Add table-driven unit tests: for every (from, to) pair, all consumers
   produce identical instruction sequences.

## Acceptance criteria

- One coercion table; `callArgCoercionInstrs`/`fixBranchType` delegate to it.
- The externref→f64 and ref→f64 divergences are gone (branch context unboxes
  / NaNs identically to call-arg context), with a regression test for each.
- Equivalence + test262 CI green.

## Source

Compiler quality review 2026-06. Related: #1918 (fixup ratchet), #1858
(fail-loud umbrella).

## Amendment (2026-06-11, analysis program)

Two corpus-driven changes to this spec (full detail:
plan/log/analysis-2026-06/03-coercion-engine-spec.md and
05-structure-review.md §2a):

1. **The engine API must carry a `staticJsType?` hint.** The June corpus
   proved that dispatching on Wasm ValType alone mis-classifies values —
   the #2072 investigation showed booleans (i32) boxing as numbers,
   undefined/null (externref) as strings, native strings (eqref) as
   objects. A ValType-only engine reproduces that disease. Every entry
   point (`emitToString`, `emitToPrimitive`, `emitLooseEq`, …) takes the
   source expression's static TS classification when resolvable.
2. **The site inventory is larger than this issue assumed.** Report 03
   catalogued 37 sites: 13 ToString (the §7.1.17 matrix hand-rolled 7× —
   incl. template spans string-ops.ts:272-285, join elemToStr
   array-methods.ts:4543, standalone emitArrayJoin :4487+,
   $__any_to_string native-strings.ts:5417), 11 ToNumber/ToPrimitive,
   8 equality, 5 ToBoolean (incl. buildTruthyCheck, #2085). Migration
   order and the per-site bug map live in report 03 §3.

Sequencing: Step 0 (ValType table) is dependency-safe now; Steps 1+ land
AFTER the type-aware boxing P0 (#2072/#2080) so the engine consumes
correct tags. Drift gate: #2108.

## Implementation — Step 0 landed (sdev1, 2026-06-15)

**Scope: Step 0 only** (the ValType `coercionPlan` table). Steps 1-4 (the
JS-semantic `emitToString`/`emitToPrimitive`/`emitStrictEq`/`emitLooseEq`
engine) remain — they land after value-rep P0 (#2072/#2080, now done) per the
spec's migration order; this issue stays `in-progress` until they do.

### What landed

- **New `src/codegen/coercion-plan.ts`** — a single **pure** function
  `coercionPlan(from: ValType, to: ValType, {boxNumberIdx, unboxNumberIdx})`
  returning the exact instruction sequence for the **scalar / numeric /
  box-unbox** rows the three ValType matrices shared, plus a `lossy` flag for
  the genuine no-bridge rows (funcref→externref; ref→number with no unbox
  helper available → NaN/0 per §7.1.4).
- **`callArgCoercionInstrs` (stack-balance.ts)** delegates its scalar rows to
  `coercionPlan`; keeps only the externref→ref/ref_null guarded cast (needs the
  expected struct typeIdx).
- **`fixBranchType` (stack-balance.ts)** now routes scalar/box-unbox
  conversions through `coercionPlan`, threading `boxNumberIdx`/`unboxNumberIdx`
  down through `fixBranch`/`fixBody` from `stackBalance`. **This kills the
  headline divergence**: it previously emitted lossy `drop; f64.const 0` for
  externref→f64 and ref→f64 (silently zeroing the value during a stack-balance
  fixup) while the call-arg path correctly unboxed via `__unbox_number`. It
  also fixed a latent funcref→externref bug (old code emitted an INVALID
  `extern.convert_any` on a funcref; the table now uses the lossy null
  fallback, matching `coercionInstrs`).
- **`coercionInstrs` (type-coercion.ts)** delegates its non-ref scalar rows to
  `coercionPlan` (kept its own `ref→f64=NaN` / AnyValue→externref helper /
  guarded ref.cast arms, which need `ctx`/`fctx` and a deliberately different
  ref ToNumber policy — those are Step 2 engine concerns, not Step 0).

### Why ref→f64 differs between consumers (intentional, for now)

`callArgCoercionInstrs`/`fixBranchType` unbox a `ref` carrying a boxed number
(`extern.convert_any; __unbox_number`); `coercionInstrs` NaNs a bare GC ref
(ToNumber of an object without valueOf). Step 0 unifies the **box-unbox** rows
that were genuinely divergent-by-accident; the ref→f64 *policy* split is real
JS semantics that the Step 2 `emitToPrimitive` engine will own with a
`staticJsType` hint (boxed-number-ref vs object-ref). Step 0 does not force
them together to avoid changing array-callback-loop ToNumber behavior.

### Validation

- `tests/issue-1917-coercion-plan.test.ts` — 10 table-driven unit cases
  (asserting the exact sequence per `(from,to)` incl. the non-lossy externref→f64
  / ref→f64 guarantee) + 4 end-to-end any→number regression cases (host +
  standalone). All pass.
- Behavior-neutral: full `tests/equivalence/` dir green (exit 0); coercion +
  stack-balance suites unchanged (the 2 pre-existing `stack-balance.test.ts`
  failures and the IR-fallback/void-NaN equivalence failures reproduce
  identically on unmodified HEAD).
- `tsc --noEmit` clean; lint/format clean; `check:ir-fallbacks` OK.

### Next (Steps 1-4, separate PRs, now unblocked by #2072/#2080)

`coercion-engine.ts` skeleton + `emitToString` (Step 1, fixes #2005/#2006/
#1998/#2074), `emitToPrimitive` (Step 2, #1989/#2022/#1990/#1988),
`emitStrictEq`/`emitLooseEq` (Step 3, #1986/#1987/#2081), `emitToNumber`/
`emitToBoolean` (Step 4), then the drift gate (Step 5, #2108).

## Handoff from #1629b (sendev-receiver, 2026-06-19) — boxed-primitive boolean representation

Investigated the standalone GOPD attribute-flag read-back (#1629b) and drilled it
to a boxed-primitive representation root cause that belongs to THIS engine, not a
localized GOPD fix. Three measured/WAT-proven layers — banked on branch
`issue-1629b-gopd-attr-flags` (commits below), ready to compose with Steps 3/4:

**Layer 3 (the ROOT, highest-value — likely under several #1917/#2374 symptoms):**
The `true`/`false` literal (`src/codegen/expressions.ts:826-834`) returns a bare
`{kind:"i32"}` — the **boolean brand is dropped at the source**. So every
boolean→externref coercion (object-literal field, `__extern_set`, any `any`-typed
boolean) hits the generic `i32→externref` arm in `type-coercion.ts:1518` and boxes
via `__box_number`. WAT proof for `const o:any={f:true}`:
`i32.const 1 ; f64.convert_i32_s ; call __box_number`. Result: `o.f` is a boxed
**number**, `typeof o.f === "number"` (not "boolean"), and any descriptor flag /
JSON / reflection that round-trips a boolean through a `$Object` loses its type.
Fix (banked, commit `c04a03dac`): brand the literal `{kind:"i32",boolean:true}`
and honor `from.boolean` at `type-coercion.ts:1518` to box via `__box_boolean`.
**Caveat:** only literals carry the brand — comparison/`!`/`&&` boolean-producing
expressions still return unbranded i32, so full coverage needs the brand to
propagate from all boolean-producing ops (binary-ops relational/equality results,
unary `!`). This is engine-scope (Step 4 `emitToBoolean` / the i32-boolean brand
discipline), which is why it's handed here, not shipped piecemeal.

**Layer 2 (Step 3 `emitStrictEq`):** strict-eq between two boxed-boolean externrefs
compares struct IDENTITY, not value — `a.f === b.g` (two `$Object` booleans) →
false. `__any_strict_eq` (`any-helpers.ts:1361`) only handles `$AnyValue` tagged
structs (tag 4=bool); a `$__box_boolean_struct` read off a `$Object` never reaches
the tag path. Cleanest fix: extend `__any_strict_eq` with a `ref.test` arm over the
box brand (`$__box_boolean_struct`/number/string) that unboxes before compare —
the same ref.test-over-brand ladder as the `__typeof` fix below. NO ToPrimitive
contact (strict-eq is SameValueNonNumber).

**Layer 1 (typeof, banked commit `28f058bf5`, regression-clean, 0-flip ALONE):**
native `__typeof` was a `ref.null.extern` stub → `typeof <dynamic externref>`
returned null (#2107's externref-path sibling). Fixed with a `ref.test` brand
ladder ($__box_number→"number", $__box_boolean→"boolean", $BigInt→"bigint",
$AnyString→"string", else "object"). Correct + 27 typeof equiv assertions green,
but flips 0 test262 alone (measured base-vs-fix per-file diff GOPD+boolean+typeof =
0/0; the GOPD assertion-shape files already pass on base). Composes with Layers 2/3.

All three are in `src/codegen/{expressions,type-coercion,index,any-helpers}.ts` —
the #1917 engine's files (and #1709 already edits type-coercion.ts/literals.ts, so
these MUST be done by the engine owner to avoid conflict). Cherry-pick from
`issue-1629b-gopd-attr-flags` or re-derive; the analysis + WAT proof is the
load-bearing handoff.
