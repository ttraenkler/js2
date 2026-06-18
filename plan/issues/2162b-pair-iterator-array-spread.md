---
id: 2162b
title: "Standalone array-spread of pair-producing iterators ([...map] / [...x.entries()]) — needs architect spec"
status: blocked
sprint: 64
created: 2026-06-18
updated: 2026-06-18
assignee: ttraenkler/sdev-iter
priority: medium
feasibility: hard
reasoning_effort: max
task_type: bugfix
area: codegen
language_feature: iterators-collections
goal: standalone-mode
parent: 2162
depends_on: [2162a]
---

# Standalone array-spread of pair-producing iterators

## Problem (re-scoped from "Map entries [k,v] spread", TaskList #9)

On standalone (`--target wasi`), spreading any **pair-producing iterator** into
an array literal is broken — and it is NOT Map-specific:

```ts
const arr = [10, 20];
[...arr.entries()];        // VALIDATE-FAIL: array.set expected f64, found call externref
const m = new Map<number,number>(); m.set(1, 9);
[...m.entries()];          // VALIDATE-FAIL (identical)
[...m];                    // bare Map → entry pairs: leaks env.__array_from_iter; a.length=0
Array.from(m.entries());   // VALIDATE-FAIL (same family)
```

The discriminating proof: `[...arr.entries()]` — a plain **array** entries
iterator, no Map anywhere — fails identically. So the breakage is "materialize a
pair-producing iterator (`$ObjVec` `[k,v]` externref objects) into an array
literal", shared by array.entries + map.entries + bare map.

`for-of ([k,v] of map)` works zero-import (it consumes pairs inline, never
materializing a vec-of-pairs) — confirming the **producer** (#8 /
`emitCollectionIteratorVec`) is fine. The gap is purely the **consumer-side
materialization**.

## Root cause (verified, multi-path)

The flow for `[...x.entries()]` crosses THREE interacting code paths, which is
why a single element-type tweak does not close it:

1. **`src/codegen/literals.ts` `compileArrayLiteral` element-type heuristic** —
   for a spread-first-element it resolves the iterator's tuple type-arg
   (`[number, number]`) to **f64**, so the result vec is f64. (A
   `isPairSpreadSource(spreadType)` predicate — `Map`, or an `*Iterator` whose
   first type-arg is a tuple — can force externref here; the
   `ArrayIterator`/`MapIterator`/tuple-arg discriminators are confirmed via the
   checker.)

2. **`compileArrayLiteral` spread branch** — the materialized pairs arrive as
   externref `$ObjVec` objects and route through the externref-spread branch
   (`buildVecFromExternref`).

3. **`src/codegen/type-coercion.ts` (~line 401, the `__tup_mat_*` path)** — this
   is where the invalid `array.set` is actually emitted. It materializes each
   pair into a **tuple struct** by `__extern_get_idx` + per-field `__unbox_number`
   into an f64/i32 backing — and pulls in `__array_from_iter` (the host import
   that leaks for bare `[...map]`). The element-type force in (1) alone does not
   reach this emit site (the tuple-materialization picks its own field types).

So a correct fix must (a) force externref result-elem type for pair sources, (b)
route bare `[...map]` through `emitCollectionIteratorVec` kind="entries" (the
#2162a Set machinery, extended to Map), AND (c) make the
`type-coercion.ts` `__tup_*` tuple-materialization standalone-native (no
`__array_from_iter` host leak) when the result vec element type is externref
(store the pair externref directly, skip per-field unbox). (c) is the load-bearing
piece and is shared core array-compiler code → high regression blast radius.

## Recommendation

**Architect spec before coding.** This is not a quick follow-up: it touches the
core array-literal compiler's tuple-materialization subsystem (used by all
tuple/`[k,v]` spreads, not just collections), so it needs a deliberate design for
the externref-pair vec representation + nested-pair read (`a[0][1]`) path and a
regression-guard plan. Recommend `/architect-spec` to design the
externref-pair-vec materialization contract, then implement.

## Scope discipline / no regression

#2162a (Set value-spread + per-element coercion) is merged/queued and unaffected.
This issue is the deferred entries-pair half. No partial fix was shipped — the
investigation branch was reverted clean (`issue-2162b-map-entries-spread`).

## Source

Investigation of TaskList #9 (2026-06-18, sdev-iter), stacked on #2162a (PR #1714).
