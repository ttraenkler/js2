---
id: 3554
title: "standalone: wire native bodies for the 8 members excluded from #3544 dynamic .call dispatch (the curated narrow-gate list)"
status: ready
created: 2026-07-23
priority: medium
feasibility: medium
task_type: feature
area: codegen
language_feature: builtins, call, dynamic-dispatch
goal: standalone
umbrella: 2860
sprint: current
horizon: m
related: [3544, 2984, 3468]
origin: "#3544 narrow-gate deferral (fable-3544b, 2026-07-23): the measured floor census pinned exactly these 8 members"
---

# #3554 — wire the 8 members excluded from #3544's dynamic `.call` dispatch

## Why this exists (the deferral being repaid)

#3544 made dynamic `m.call(thisArg, …)` on callable values actually dispatch
in `--target standalone`. Full dispatch was measured (exact census, 2,242
pass-baseline `.call` tests, paired vs main control) to flip 19 floor tests
pass→fail with ZERO CI-visible wins — every one attributable to the #2984
"not yet implemented" REFUSAL stub of exactly 8 members becoming reachable
inside #3468-vacuous floor tests. Those 8 are pinned in the CURATED exclusion
lists (`FN_CALL_REFUSAL_EXCLUDED_PROTO_MEMBERS` / `…_STATICS` in
`src/codegen/fn-call-dispatch.ts`): their `m.call(x)` keeps the KNOWN-WRONG
silent-undefined status quo.

**Wiring a member's real native body and deleting it from the curated list
widens dispatch automatically** — no dispatch-side change needed. Keep each
member's wiring a SEPARATE PR (bisectable, independently landable), exactly
like the #2963 tier slices.

## Slices (each = own PR; measured floor tests it un-blocks in parentheses)

Easy (do first, independent wins):

1. **`String.prototype.valueOf`** (2 floor tests) — brand-check receiver;
   return the string primitive (same recovery the wired `toString` path uses).
2. **`Symbol.prototype.valueOf`** (2) — return the symbol for symbol receivers
   (`ensureSymbolCarrier` substrate); TypeError otherwise.
3. **`Date.prototype.toJSON`** (2) — §21.4.4.37: ToPrimitive(number) →
   non-finite → null; else delegate to the wired `toISOString` body.
4. **`Array.of`** (4) — build a `$Vec` from the argvec; the custom-`this`
   constructor arm (§23.1.2.3 step 4) can degrade to plain-array first.

Medium:

5. **`Promise.resolve`** (2) / **`Promise.reject`** (2) — the VALUE closures;
   the static call path already works, so the body can delegate to the same
   lowering (receiver/`this`-constructor semantics degrade-first).

Hard (may stay deferred; document if so):

6. **`Array.from`** (4) — iterables + array-likes + mapFn.
7. **`WeakRef.prototype.deref`** (1) — needs WeakRef instance machinery.

## Acceptance criteria (per slice)

- The member's `emitMemberBody` (proto glue) / static-value body returns a
  real body (probe no longer refuses), and the member is DELETED from the
  #3544 curated list.
- `tests/issue-3544.test.ts`'s deferral-pin test updated for that member (the
  pin test exists to be flipped — see its comment).
- The floor tests listed above flip back pass (they regress-check the wiring:
  a wired body must NOT throw on their shapes).
- No new host imports (standalone-native bodies only).

## Removal of the whole mechanism

Once the #3468 observability program lands (assert.\* actually runs in
standalone) and the vacuous passes are gone from the baseline, the curated
lists + mint-time registrations get deleted wholesale — see the REMOVAL
CONDITION note in `src/codegen/fn-call-dispatch.ts`.
