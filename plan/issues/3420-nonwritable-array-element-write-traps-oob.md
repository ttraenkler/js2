---
id: 3420
title: "Write to non-writable/frozen Array element traps oob instead of throwing TypeError (verifyProperty corpus)"
status: ready
created: 2026-07-18
priority: high
feasibility: medium
task_type: bugfix
area: codegen
goal: test262-conformance
model: fable
sprint: current
horizon: m
related: [3370, 3417, 3335, 3189]
---

# #3420 — non-writable Array element write traps `oob` instead of throwing TypeError

## Problem
Under the honest v8 harness, `propertyHelper.js::verifyProperty` and frozen-array
tests exercise writes to non-writable / frozen Array elements. Instead of throwing a
catchable `TypeError` (strict) or silently no-op'ing (sloppy), the compiler emits an
**uncatchable `unreachable`/`oob` trap**:

```
array element access out of bounds [in verifyProperty() ← __module_init]
```

Because the trap is uncatchable, `assert.throws(TypeError, …)` can't catch it and the
test fails; it also drove the merge-group **oob 45→49 (+4)** trap-growth flag on the
oracle-v8 refresh.

Measured (oracle-v8, run 29634290540): 19 tests newly `oob` vs v7 (11 were v7-pass),
in the Object.freeze / Array.prototype non-writable-target family:
- `built-ins/Object/freeze/15.2.3.9-2-c-*.js`
- `built-ins/Array/prototype/{splice,unshift,pop,reverse,slice,map,filter}/…non-writable…`
- `built-ins/Promise/all{,Settled}/resolve-element-function-{length,name}.js`
Plus a larger latent propertyHelper corpus once #3419 (Duplicate identifier) unblocks
compilation.

## Root cause
Array element assignment lowers to a bounds-checked store that traps on a
non-writable / frozen (or length-locked) element rather than consulting the element's
`[[Writable]]`/extensibility slot and taking the spec path (throw TypeError in strict,
no-op in sloppy). Frozen/sealed/non-writable state (from `Object.freeze` /
`defineProperty` with `writable:false`) is not honored on the fast array-element write
path. Related slot machinery: #2744 (extensible/preventExtensions/seal/freeze
queries).

## Implementation Plan
- Locate the array element **store** lowering (`src/codegen/expressions.ts` assignment
  path + `src/codegen/array-methods.ts` for the prototype mutators splice/unshift/pop/
  reverse). On a write to an element whose descriptor is non-writable, or whose array
  is frozen / element index is non-configurable/length-locked:
  - **strict mode** → throw a real `TypeError` (catchable) — reuse the existing
    TypeError-throw helper so `assert.throws(TypeError)` matches (see #3287 patterns).
  - **sloppy mode** → silently ignore the write (no trap), return the RHS.
- Route the frozen/non-writable query through the extensibility-slot machinery
  (#2744) rather than a raw bounds/`unreachable` trap.
- Ensure the prototype mutators (splice/unshift/pop/reverse) that relocate elements
  also honor per-element writability and throw/short-circuit correctly.

### Edge cases
- Genuine out-of-bounds (index ≥ length on a NON-frozen array that should extend) must
  still extend, not throw.
- `length` non-writable (frozen array) → setting `length` throws TypeError.
- Distinguish "index out of allocated capacity" (grow) from "element non-writable"
  (throw/no-op) — today both collapse to oob.

## Verification
- Scoped: the 19 listed tests + `Object/freeze/15.2.3.9-2-c-*` pass; assert.throws
  catches the TypeError.
- Confirms as a real spec-fidelity fix, not oracle skew: these throw catchably rather
  than trapping.
- Zero-regression on ordinary array growth/mutation.

## Notes
Filed per coordinator request as the REAL bug behind the oracle-v8 oob +4 trap flag
(#3335/#3189). The trap growth itself was within #3370's declared ceiling and
promoted via a one-time forced refresh; this issue fixes the underlying gap.

## Verify-first findings (2026-07-20, senior-dev, current origin/main @89ce643)

The plan's stated root cause — "array element **store** lowers to a bounds-checked
`array.set` that traps `oob` on a non-writable/frozen element; fix = throw
TypeError / no-op on the store path" — **does NOT match current main.** Measured:

**Store-path behavior (the premise):**
- Typed vec (a real JS `[1,2,3]` array) frozen element write `arr[0]=999` →
  **silently succeeds** (freeze not honored). NOT oob, NOT TypeError.
- `any`-scalar-annotated receiver → in-bounds write throws a *catchable* TypeError;
  out-of-capacity write traps oob. But test262 arrays are vecs, not scalar-any, so
  this path is not what the corpus exercises.
- Typed vec OOB write `arr[10]=5` grows correctly (length→11). No trap.
- ⇒ The store path already does NOT emit an uncatchable oob for frozen/non-writable
  writes, so a "check [[Writable]] on `array.set`" fix flips ~**0** tests.

**Per-file ground truth (single-file `runTest262File`, JS-host lane):**
| bucket | files |
| --- | --- |
| FAIL-OOB (real, matches issue) | `Array/prototype/filter/target-array-with-non-writable-property.js`, `Array/prototype/map/target-array-with-non-writable-property.js` |
| PASS (already correct) | splice / slice / concat / flat / flatMap `target-array-with-non-writable-property.js`; `Array/prototype/with/frozen-this-value.js` |
| FAIL-OTHER (unrelated bug) | `Object/freeze/15.2.3.9-2-c-1.js` — thrown TypeError fails `e instanceof TypeError` on the `delete` path (error-identity, NOT oob) |
| runner-infra THREW (not a compiler signal) | pop/push/shift/unshift `set-length-array-is-frozen.js` — harness assembly errors ("reading 'text'", "which has only a getter") |

**Real oob mechanism (filter, map only):** both honor `Symbol.species`; the test's
species returns `q = new Array(0)` then `Object.defineProperty(q, 0, {value,
writable:false, configurable:true})` (numeric key). filter/map then write results
into that species-supplied backing (allocated capacity 0) without a grow-safe
store, so `verifyProperty`'s later read/write of the result element traps oob.
This is **Symbol.species result-backing consistency**, not store-path writability,
and it is method-specific (splice/slice/concat/flat already pass). Note:
`Object.defineProperty(arr, N, {value:V})` on an array index also does not persist
`V` into the vec backing (reads default), a separate latent gap.

**Assessment:** wall for a focused, net-positive, low-risk PR. The issue-as-scoped
flips ~0; the true remaining oob is 2 tests requiring risky changes to the core
`filter`/`map` species-result path (or full extensibility-slot machinery, #2744).
Escalated to tech lead 2026-07-20 to re-scope (narrow species-backing issue) or
defer. Not implemented speculatively.
