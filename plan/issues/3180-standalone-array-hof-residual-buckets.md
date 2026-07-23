---
id: 3180
title: "standalone: Array.prototype HOF residual gap buckets after the #3169 receiver ladder (~306 tests, 6 mechanisms)"
status: ready
created: 2026-07-12
updated: 2026-07-12
priority: medium
feasibility: hard
model: fable
task_type: bug
area: codegen
es_edition: multi
language_feature: array-methods
goal: standalone
umbrella: 2860
sprint: current
horizon: l
related: [3169, 2860, 3170, 2670]
origin: "#3169 measured residual (2026-07-12 local 7-family batch vs baselines)"
---

# #3180 — standalone: Array.prototype HOF residual gap buckets (post-#3169)

## Problem

#3169 landed the CLOSED-STRUCT array-like receiver ladder (+~209 of the 513
measured host↔standalone gap tests under
`built-ins/Array/prototype/{reduce,reduceRight,filter,some,every,map,forEach}`).
The remaining ~306 gap tests split into six DISTINCT mechanisms, none of which
is the receiver ladder — per the #3169 anti-scope-creep clause they are filed
here as a follow-on instead of being absorbed.

## Measured residual buckets (2026-07-12, local batch, files in

`.tmp/gap-still-failing.txt` methodology — recompute before slicing)

1. **defineProperty-during-iteration MOP (~101, sec-7/sec-9)** — accessor
   properties installed via `Object.defineProperty(obj, "0", {get(){…}})` on
   array-like literals; getters that mutate/delete/add elements or `length`
   mid-iteration. Needs: defineProperty on a closed-struct literal to divert
   the literal to the open `$Object` rep at compile time (the host lane's
   `compileObjectLiteralWithAccessors` analog), so the runtime MOP (accessor
   entries, delete tombstones) actually applies. Largest single bucket.
   **ROUTING: this bucket belongs to the #2992 / fable-2984c lane
   (peer-owned) — the standalone defineProperty/accessor-MOP substrate. Do
   NOT double-work it here; the HOF flip is a downstream consumer of that
   substrate. Coordinate before touching.**
2. **fnctor-array-inheritance (~52, sec-8)** — `foo.prototype = new Array(...);
f = new foo(); f.length = null; f.every(cb)` — constructor instances
   inheriting Array.prototype elements/length through the proto chain.
3. **builtin-expando receivers (~46, sec-1)** — `Math.length = 1; Math[0] = 1;
Array.prototype.every.call(Math, cb)` (also Date/Function/RegExp/JSON/Error
   /String-object receivers). Needs expando properties on builtin singletons.
4. **arguments fidelity (~37)** — `Array.prototype.every.call(arguments, cb)`
   and `arguments[2][arguments[1]] === arguments[0]` inside 0-declared-param
   callbacks. The materialized arguments object is order-fragile and reflects
   DECLARED params, not actual call args (the HOF inline loop pushes only
   declared params through `call_ref`). #3169 explicitly EXCLUDES
   `arguments`-rooted receivers from its positional dynamic-index read
   (`isArgumentsRootedExpression`, property-access.ts) to avoid flipping
   vacuous passes — remove that exclusion when fixing this properly.
5. **thisArg semantics on direct HOFs (~29, sec-5)** — `arr.every(cb, foo)`
   where `cb` reads `this.res` / compares `this === arg` (function expandos,
   sloppy-mode global this, thisArg identity through `__current_this`).
6. **ToPrimitive lengths (~26, sec-3 residual)** — `length: {toString(){…}}` /
   `{valueOf(){…}}` object-valued lengths. #3169 handles f64/i32/bool/
   externref-unbox/string lengths; an object length needs runtime ToPrimitive
   (the closed-struct method dispatch) inside `__extern_length`'s
   closed-struct arm.

## Notes

- 2 known vacuous-pass→honest-fail conversions from #3169 belong to bucket 1:
  `reduce/15.4.4.21-8-b-ii-2.js`, `reduceRight/15.4.4.22-8-b-ii-2.js`
  (defineProperty length accessor + no-init reduce — previously "passed"
  because the refused call answered undefined; now the spec TypeError from the
  empty hole-scan honestly fails).
- Slice by bucket; each is a separate PR-sized mechanism. Bucket 1 is the
  highest-value and has the cleanest precedent (the host lane's
  accessor-literal divert).

## Acceptance criteria

- Per slice: the targeted bucket's measured gap tests flip to host-free
  standalone passes with zero host regressions; recompute the residual list
  first (main moves).

## 2026-07-23 re-measurement (fable-2860 — HANDOFF, no implementation started)

Stand-down handoff (coordinator call, capacity freed for the acorn-parse
bisect). What is DONE here is exactly one thing: **the residual list was
recomputed through the real sharded worker** per the acceptance note, on a
tree = main@08615d58 + the then-in-flight #3549 (now all merged). Population:
all 423 non-pass `built-ins/Array/prototype/{reduce,reduceRight,filter,some,
every,map,forEach}` rows from the 2026-07-23-morning standalone baseline.
Result: **29 compile_error · 393 fail · 1 pass** — today's #3536/#3541/#3549
chain did NOT move this family (expected; different mechanisms), and the
#3169/#3170 gains were already baked into the baseline.

Top de-masked signatures (primary variant; full per-file verdicts were in
`.tmp/hof-residual-results.txt` of the fable-2860 worktree — REGENERATE with
the method below rather than hunting for the file):

|         n | signature (normalized)                                                           | example                        |
| --------: | -------------------------------------------------------------------------------- | ------------------------------ |
|       137 | `Test262Error: testResult !== true`                                              | reduce/15.4.4.21-9-c-i-14.js   |
|        42 | `Test262Error: accessed !== true`                                                | some/15.4.4.17-4-8.js          |
|        29 | `TypeError: Reduce of empty array with no initial value`                         | reduceRight/15.4.4.22-9-b-6.js |
|        25 | `Test262Error: result !== true`                                                  | forEach/15.4.4.18-1-13.js      |
|        20 | host-import leak `__array_concat_any`/`__js_array_new` (resizable-buffer shapes) | every/resizable-buffer.js      |
| 13+11+7+6 | `…some.call(obj/child, callbackfn) !== true` family                              | some/15.4.4.17-1-8.js          |
|         9 | `Array.isArray(a) !== true` (map species/return)                                 | map/15.4.4.19-9-3.js           |
|        18 | `Array.prototype.<hof> is not yet callable as a value` (method-as-value refusal) | every/15.4.4.16-1-3.js         |
|         6 | host-import leak `__call_N_fN`                                                   | filter/15.4.4.20-4-2.js        |

Reading: the assertion-signature buckets (137/42/25…) are OPAQUE at this
granularity — they need per-test source triage against the six mechanism
buckets above before any slice is sized. The visible mechanism buckets:
`.call(obj/…)` family ≈ bucket 3/4 territory; `Reduce of empty array` ≈ the
bucket-1-adjacent hole-scan (bucket 1 is PEER-ROUTED — do not touch);
method-as-value (18) is the #1907/#1888 refusal, NOT this issue.

**Resume steps for the next owner:**

1. Regenerate the list: filter the standalone baseline for non-pass rows
   under the seven HOF paths; run through `scripts/test262-worker.mjs` (the
   `.tmp/drive-worker.mjs` harness pattern from the #3541/#3549 chain —
   fork worker, `originalHarness: true`, `target: "standalone"`, primary
   variant) after `build:compiler-bundle` + the runtime-bundle esbuild line
   from `scripts/run-test262-vitest.sh`.
2. Sample ~15 tests from the 137-row `testResult !== true` bucket and read
   their sources — expect them to distribute over buckets 2/3/4/5; pick the
   bucket with the highest measured concentration.
3. Do NOT take bucket 1 (defineProperty-MOP, ~101) — peer-owned
   (#2992/fable-2984c). Do NOT absorb method-as-value (separate refusal
   family).
4. Lesson from today's chain (measured twice): a bucket gate does not
   predict flips — layers hide behind layers. Size only on measured runtime
   PASS after a probe fix, never on bucket counts.

Claim released; `status: ready`; no code was written for this issue.
