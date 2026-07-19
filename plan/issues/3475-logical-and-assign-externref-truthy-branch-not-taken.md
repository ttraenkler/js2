---
id: 3475
title: "Compound/logical-assignment externref fallback (Path B) __extern_get desyncs from the plain member-read dispatcher for defineProperty-added properties"
status: ready
sprint: current
created: 2026-07-20
updated: 2026-07-20
priority: low
horizon: m
feasibility: hard
task_type: bug
area: codegen
language_feature: logical-assignment-operators
es_edition: es2021
goal: test262-conformance
related: [3430, 2179, 2731]
origin: "Discovered 2026-07-20 while implementing #3430 (strict compound/logical assignment [[Set]]-failure-throws fix). Isolated as a pre-existing, unrelated bug — NOT caused by the #3430 fix (reproduces identically with #3430's diff removed)."
---

# #3475 — Path B (externref-fallback) property read desyncs from the plain member-read dispatcher

## Problem (revised 2026-07-20 — supersedes the original `&&=`-only framing below)

The original framing ("`&&=` never takes the truthy/assign branch") was too
narrow and, on deeper investigation, wrong about which operator is affected —
`||=` reproduces the same underlying defect, just with the opposite
symptom (assigns when it should keep). The **actual, empirically confirmed**
defect is a read-path desync:

`emitGet()` inside `compilePropertyLogicalAssignmentExternref` /
`compilePropertyCompoundAssignmentExternref` (`src/codegen/expressions/operator-assignment.ts`,
Path B — the externref/host-sidecar fallback taken when the compiler can't
statically resolve a struct field for the property) calls `__extern_get`
**directly**. But a **plain member-access read** (`obj.prop` with no
compound/logical operator) compiles through a *different* dispatcher,
`__get_member_prop`, which first does `ref.test` against the known static
struct type and only falls through to `__extern_get` in its `else` arm.

For a property added via `Object.defineProperty` on an object whose static
struct type was NOT known to include that field at `&&=`/`||=` compile time
(a `var obj = {}` at module scope, `defineProperty`d before use — see repro),
these two paths disagree: **the plain-read dispatcher correctly resolves the
current value; the Path B `emitGet()` call returns `undefined` for the exact
same object + property.** Traced via a host-import intercept
(`__defineProperty_value`/`__extern_get`/`__extern_set`), side-by-side:

```
=== PLAIN (no compound op) ===
  __defineProperty_value(<obj>, "prop", <val>, 63) -> <obj>
  return obj.prop;  ->  2                    (correct)

=== WITH `||=` ===
  __defineProperty_value(<obj>, "prop", <val>, 63) -> <obj>
  [Path B emitGet] __extern_get(<obj>, "prop") -> undefined   (WRONG — should be 2)
  [Path B emitSet] __extern_set(<obj>, "prop", 99) -> undefined
  return obj.prop;  ->  99                   (wrong: truthy 2 should have been KEPT)
```

Consistent with this, `&&=` on the same property shape shows the mirror
symptom: it never takes the truthy/assign branch (kept the stale value
instead of assigning), because its condition check is *also* built on the
same broken `emitGet()` read returning `undefined` (falsy) instead of the
real value.

**Mechanism is NOT yet confirmed** — only the symptom above is. Two
competing hypotheses, neither verified:

1. **Compile-order field-visibility skew.** The struct-field-resolution check
   that decides Path A (static `struct.get`/`struct.set`) vs Path B
   (externref fallback) for `obj.prop` inside `test()` may run *before*
   whatever mechanism (if any) adds "prop" as a real struct field from the
   module-level `Object.defineProperty` call — i.e. Path B is chosen based on
   a struct shape that's stale relative to what the property actually
   resolves to at runtime. This would mean the "defineProperty-added" framing
   is really "module-init-ordering versus per-function struct-field
   resolution," not a property-shape issue per se.
2. **`__extern_get`'s key/value materialization genuinely differs from
   `__get_member_prop`'s dynamic-fallback arm** (e.g. a key string-constant
   identity mismatch between the `defineProperty` callsite's key and Path B's
   own `compileStringLiteral`-materialized key, or a boxed-value
   representation `__extern_get`'s host-side JS doesn't unwrap the same way
   `__get_member_prop`'s `else` arm does) — in which case the bug is in
   `__extern_get` itself or its call site, not in Path A/B routing.

Distinguishing these requires comparing (a) the struct type's field list at
the point `compilePropertyLogicalAssignment` resolves Path A vs Path B for
`obj.prop` inside `test()`, against (b) whatever the module-init compile step
for `Object.defineProperty` actually does to that struct type — this has NOT
been done.

## Why this is harder than originally scoped (M, not S)

`__get_member_prop`'s dispatcher-based reroute looks like an obvious fix
target (make Path B's `emitGet`/`emitSet` go through the same dispatcher
instead of calling `__extern_get`/`__extern_set` directly) — **but
generalizing that dispatch has a known regression history**: #2179 and #2731
document prior attempts to broaden similar member-dispatch fallback logic
regressing `for-in` enumeration ordering and, in one case, hanging the
parser's tokenizer. Any fix here needs to be scoped narrowly and validated
against those regression vectors, not just against this repro. This pushes
the issue from a "narrow, self-contained bug" (original framing) to a
genuine M-horizon investigation-plus-fix.

## Repro

```ts
var obj = {};
Object.defineProperty(obj, "prop", { value: 2, writable: true, enumerable: true, configurable: true });
export function test(): number {
  obj.prop ||= 99;
  return obj.prop; // expected 2 (truthy, ||= keeps it) — actual: 99 (wrongly assigned)
}
```

```ts
var obj = {};
Object.defineProperty(obj, "prop", { value: 2, writable: true, enumerable: true, configurable: true });
export function test(): number {
  obj.prop &&= 99;
  return obj.prop; // expected 99 (truthy, &&= assigns) — actual: 2 (wrongly kept)
}
```

Both are the same underlying `emitGet()` read desync — `||=`'s condition
incorrectly reads falsy-`undefined` where the real value (2, truthy) should
be, so it takes the wrong branch in the opposite direction from `&&=`.

Contrast with the literal-object-property case, which works correctly (never
reaches Path B — resolves a static struct field, Path A):

```ts
export function test(): number {
  const obj: any = { prop: 2 };
  obj.prop &&= 99;
  return obj.prop; // 99 — correct
}
```

## Acceptance criteria

- Root-cause the `emitGet()`/`__extern_get` vs `__get_member_prop` read
  desync (confirm hypothesis 1 or 2 above, or find a third mechanism).
- `obj.prop &&= rhs` / `obj.prop ||= rhs` / `obj.prop ??= rhs` on an
  externref-fallback (Path B) property all correctly reflect the current
  value's actual truthiness, matching a plain `obj.prop` read on the same
  object/property.
- Regression guard: literal-property (Path A, struct-field) logical/compound
  assignment, and element-access (`arr[i] &&= v`) logical/compound
  assignment, behavior stays unchanged.
- Explicit regression run against #2179 and #2731's original repros if the
  fix touches the member-dispatch reroute — do not regress `for-in` ordering
  or tokenizer behavior.
- Add a focused vitest regression test mirroring both repros above.

## Notes

Deferred in favor of sprint P1 (host-restore pass rate under the authentic
harness) — this issue was picked up opportunistically alongside #3430 but
turned out to need real root-cause investigation rather than being a quick
win. Left `status: ready`, unassigned, for whoever picks up compound/logical
assignment work next (or for #3430's related-cluster follow-up).
