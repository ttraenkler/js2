---
id: 2831
title: "[SENIOR-DEV ONLY] member-WRITE dispatcher `__set_member_<name>` traps `illegal cast` on the value coercion — compiled acorn cannot parse ANY function/arrow body"
status: ready
assignee: ttraenkler/unassigned
sprint: current
priority: high
horizon: l
feasibility: hard
reasoning_effort: max
created: 2026-06-29
task_type: bugfix
area: codegen
language_feature: value-representation
goal: acorn-dogfood
related: [2664, 2659, 2805, 2806, 2809, 1917, 2379]
depends_on: []
blocks: [1712]
architect_spec: candidate
---

# #2831 — `__set_member_<name>` value-coercion `ref.cast` traps; compiled acorn can't parse function/arrow bodies

**The genuine blocker for #1712 (acorn parses a real file).** Surfaced by a
real-world differential (compiled acorn.wasm vs node-acorn) on the
native-messaging sources `examples/native-messaging/{edge.js,background.js}`:
both throw inside compiled acorn. Localized to **any function declaration or
arrow function** — the bulk of any real file.

## Minimal repros (RAW export, fresh single instance, first & only call)

Compile pinned acorn@8.16.0 with `skipSemanticDiagnostics: true`, instantiate,
`__setExports`, then on `instance.exports.parse(src, {ecmaVersion:2022,sourceType:"script"})`:

```
parse("function f() {}")      -> RuntimeError: illegal cast
parse("var g = (x) => x;")    -> RuntimeError: illegal cast
parse("async function f(){}") -> RuntimeError: illegal cast
```

Expression-level inputs ALL pass (call/member/var-decl/ternary/for-of/spread/
optional-chain/template), so the expression walls #2681/#2686/#2801 are genuinely
fixed — this is a **new, later wall**. Stack (raw export, not host marshalling):

```
RuntimeError: illegal cast
  at __set_member_labels   (wasm-function[174])
  at __closure_507         (wasm-function[888])   ; acorn parseFunctionBody-family
  at __call_fn_method_8    (wasm-function[1535])
```

## Root cause (WAT ground truth, NOT hand-waved)

`__set_member_labels` is the deferred-fill member-WRITE dispatcher
(`src/codegen/member-set-dispatch.ts`, #2664). Dumped body from compiled acorn:

```wat
(func $__set_member_labels (type 21) (local $__any anyref)
  local.get 0  any.convert_extern  local.tee 2
  ref.test (ref 6)                      ;; receiver shape A ($__fnctor_… )
  (if (then
      local.get 2  ref.cast (ref 6)     ;; receiver cast — GATED by ref.test, SAFE
      local.get 1  any.convert_extern
      ref.cast null (ref null 2)         ;; <-- VALUE coercion, UNGUARDED narrowing cast -> TRAPS
      struct.set 6 30)                    ;; field $labels, slot 30, type (ref null 2)
    (else
      local.get 2  ref.test (ref 47)     ;; receiver shape B (dual Parser struct, #2664)
      (if (then
          local.get 2  ref.cast (ref 47)
          local.get 1  any.convert_extern
          ref.cast null (ref null 2)      ;; <-- same unguarded value cast
          struct.set 47 30)
        (else local.get 0 global.get 561 local.get 1 call 39))))) ;; __extern_set_strict sidecar
```

Type 2 = `$__vec_externref` (the externref array-vec). So the `labels` field is an
**externref vec** (correct — #2806/#2809 routed acorn's evolving arrays to
externref). The trap is the **VALUE** coercion, not the receiver cast:
`coercionInstrs(ctx, {externref}, cand.fieldType)` at `member-set-dispatch.ts:180`
emits `any.convert_extern; ref.cast (ref null $__vec_externref)` on the inbound
value with **no `ref.test` guard**. acorn's `parseFunctionBody` does
`this.labels = []` on an `any`-typed `this` (a prototype method → dynamic
dispatch). The contextless empty `[]` at a dynamic any-receiver write has **no
expected-type propagation**, so it lowers to a *different* vec representation
(the #2806/#2809 numeric-vs-externref-vec family) than the field's
`$__vec_externref`; boxed to externref, the unguarded narrowing cast traps.

### The read-vs-write asymmetry (why only writes trap)

- **READ** (`__get_member_<name>`, `member-get-dispatch.ts:174`): after the gated
  receiver cast + `struct.get`, it coerces the field **UP to externref** —
  `externref` no-op / `__box_number` / `extern.convert_any`. Boxing up never
  narrows, so the read side **cannot** trap.
- **WRITE** (`__set_member_<name>`, `member-set-dispatch.ts:180`): it coerces the
  inbound value **DOWN** `externref → fieldType`. For a ref/vec field that is an
  **unguarded narrowing `ref.cast`** on a value whose runtime representation the
  dispatcher cannot know (the receiver is dynamic). This is the asymmetry: there
  is no "box up" equivalent for a write — `struct.set` requires the exact field
  type.

## #2805 verdict — this is NOT #2805

The coordinator's hypothesis (this = #2805's write-side substrate gap) is
**disproven**:

| | #2805 | #2831 (this) |
|---|---|---|
| symptom | silent **dropped write** (field stays default) | **`illegal cast` TRAP** |
| timing | MODULE-INIT (`start` section, before `__setExports`) | parse-time RUNTIME (long after `__setExports`) |
| mechanism | host setter `__sset_<field>` unreachable at init | unguarded narrowing `ref.cast` on the value coercion |
| code path | `tryEmitDeleteAwareDynamicSet` host-set gate | `fillMemberSetDispatch` value coercion (line 180) |

Same *family* (write-side, member-set-dispatch #2664/#2659), but a distinct bug.
Closest relative is the **#2806/#2809 array-representation** work (value-rep
mismatch on an externref-vec field), now manifesting at the **dynamic-write value
position**.

## Why this is architecture-scope (escalated for an architect spec)

A naive "guard the value cast with `ref.test`, else fall to the sidecar" is
**WRONG**: for a genuine write whose value is in a mismatched representation,
diverting to `__extern_set_strict` stores it in the JS sidecar while later reads
use the struct **slot** (`struct.get`) — reintroducing the exact #2664
"write-leaks-to-sidecar / read-uses-slot" desync that member-set-dispatch was
created to fix (it was the 8th acorn dogfood wall: `while (this.type !== eof)`
never terminating).

The correct fix is **representation-aware** and couples several substrates:
- **member-set-dispatch** (#2664) — the dispatcher value coercion must convert
  (not hard-cast) a vec value whose element-rep differs from the field's vec, and
  only sidecar genuinely host/incompatible values;
- **coercion engine** (#1917/#2108) — needs a guarded/representation-aware
  `externref → (ref $vec)` path (test + convert, not bare `ref.cast`);
- **#2806/#2809 array-rep family** — unify the empty/contextless `[]` vec rep so a
  value written to an externref-vec field is an externref vec (or convertible);
- **value-representation substrate** — the contextless empty `[]` at a dynamic
  any-receiver write currently has no expected-type and lowers to the wrong vec.

Blast radius: **every dynamic `any`-receiver WRITE of a ref/vec-typed field** —
a representation-scale change (reference_2379 hazard, explicitly flagged in
#2809). Requires full `merge_group` + standalone-floor validation, not a scoped
sweep. **Senior-dev / architect, `reasoning_effort: max`.**

## Acceptance

- `parse("function f(){}")`, `parse("(x) => x")`, `parse("async function f(){}")`
  on compiled acorn return the correct AST (no `illegal cast`).
- The real-world NM differential (`edge.js` module + `background.js` script)
  compiled-acorn vs node-acorn is **structurally equal** (modulo the known
  marshalling quirks: always-null `sourceFile`, boolean as i32) — THE #1712 bar.
- 0-regression `merge_group` + standalone-floor (watch the member-set-dispatch /
  any-receiver-write and `built-ins/Array/**` buckets); the #2664 slot/sidecar
  invariant (`while (this.type !== eof)` terminates) must NOT regress.

## Pointers

- `src/codegen/member-set-dispatch.ts:180` (the unguarded value coercion);
  contrast `src/codegen/member-get-dispatch.ts:174` (safe box-up).
- `findAlternateStructsForField` + `coercionInstrs` (`type-coercion.ts`).
- Repro infra (this branch `.tmp/`, gitignored): `nm-diff.mjs` (full-file
  differential), `nm-bisect.mjs` / `nm-isolate.mjs` / `nm-stack.mjs` (localization
  to the raw-export wasm trap), `dump-setlabels.mjs` (WAT dump of the dispatcher).
- Verified on freshly-compiled pinned acorn@8.16.0, 2026-06-29 (sendev).
