---
id: 1629b
title: "standalone: typeof on an externref (boxed boolean/number from $Object) returns null — GOPD attribute-flag read-back"
status: in-progress
assignee: ttraenkler/sendev-receiver
created: 2026-06-19
updated: 2026-06-19
priority: high
feasibility: medium
reasoning_effort: high
task_type: bugfix
area: codegen, runtime
language_feature: typeof, property-descriptors, objects
goal: standalone-mode
related: [2372, 2374, 1888, 2107, 1907]
---

# #1629b — standalone `typeof` on a boxed-primitive externref returns null

## Problem (measured)

`Object.getOwnPropertyDescriptor({a:5}, "a")` returns a descriptor `$Object`
whose attribute flags (`writable`/`enumerable`/`configurable`) read back as
**`null`** instead of `true`/`false`. The flags ARE present
(`"writable" in d === true`) and the bits ARE set (`FLAG_DEFAULT` at
`__obj_insert`), and `__getOwnPropertyDescriptor` boxes them via `__box_boolean`
correctly. The bug is **one level up**: reading a boxed boolean back through the
externref frontier and asking its type gives `null`.

Minimal repro (not even GOPD):
```ts
const o: any = { f: true };
typeof o.f;          // → "null"  (should be "boolean")
```

So the GOPD attribute-flag failures are a *symptom*; the root cause is
`typeof <externref>` in standalone.

### Measured baseline (faithful harness)

`built-ins/Object/getOwnPropertyDescriptor`, user-object receiver slice
(excludes the native-prototype `Date.prototype`-style tests, which are
sdev-harvest2's #2374 value-read lane): **36 pass / 63 fail / 10 CE**. The 63
fails are dominated by `d.writable`/`enumerable`/`configurable` reading back as
null. Blast radius is wider than GOPD — any standalone object with a boolean
property + any `typeof` on a dynamic externref value is affected.

## Root cause

`typeof` on a `$AnyValue` operand routes to the native `__any_typeof`
(tag-dispatch → "boolean" etc.) — correct. But `typeof` on a plain **externref**
operand (the `o.f` read off a `$Object` yields a `$__box_boolean_struct`
externref, NOT a `$AnyValue`) falls through to the legacy `__typeof` helper.
Its standalone native body is a **stub returning `ref.null.extern`**
(`src/codegen/index.ts:9588` — "producing real type-tag strings would require a
NativeString per tag; defer"). So `typeof <boxed externref>` → null.

(The separate `__typeof_number/string/boolean(externref) -> i32` import helpers
exist and ARE used by `typeof x === "literal"` constant-compares — but the bare
`typeof x` that yields a *string* uses `__typeof`, the stub. #2107 fixed the
`$AnyValue` path via `__any_typeof`; the externref path was left on the stub.)

## Fix

Replace the `__typeof` null stub (standalone/`nativeStrings`) with a real body:
a `ref.test` ladder over the operand's WasmGC struct brand, emitting the native
type-tag string (via `nativeStrConstInstrs`) for each:
- null externref → "undefined"
- `$__box_number_struct` → "number"
- `$__box_boolean_struct` → "boolean"
- `$BigInt` struct → "bigint"
- `$NativeString`/`$AnyString` → "string"
- `$Object` / `$Array` / other ref → "object"
- (function brand if present) → "function"

Mirror `__unbox_boolean`'s `ref.test boxBoolStructIdx` discipline; reuse the type
idxs already captured at the registration site (`boxBoolStructIdx`,
`boxNumberStructIdx`, `bigIntStructIdx`, `ctx.anyStrTypeIdx`, `$Object` idx).
Gate to `nativeStrings` (the type-tag native strings require it); keep the
null-stub for the no-nativeStrings legacy path so non-standalone stays
byte-identical.

**Scope**: `src/codegen/index.ts` (the `__typeof` registerNative body). Does NOT
touch `property-access.ts` — coordinated with sdev-harvest2 (its #2374 lane is
the native-prototype value-read; this is the boxed-primitive `typeof` read-back).

## Acceptance criteria

1. `const o:any={f:true}; typeof o.f === "boolean"` standalone.
2. `Object.getOwnPropertyDescriptor({a:5},"a").writable === true` standalone.
3. The user-object `getOwnPropertyDescriptor` slice flips (re-measure the 63).
4. No regression: `typeof` on $AnyValue / native-typed values unchanged
   (WAT byte-diff a `typeof number`/`typeof string` fast path).
