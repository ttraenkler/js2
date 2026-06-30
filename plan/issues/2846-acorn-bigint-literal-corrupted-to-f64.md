---
id: 2846
title: "compiled-acorn corrupts BigInt literals — parsed/marshalled as float64, losing value AND the `bigint` string"
status: ready
sprint: current
priority: high
horizon: m
feasibility: hard
created: 2026-06-29
task_type: bugfix
area: codegen, runtime
language_feature: bigint
goal: acorn-dogfood
related: [1712]
umbrella: 1712
---

# #2846 — compiled-acorn corrupts BigInt literals (parsed as float64)

Surfaced by the wider acorn differential corpus
(`tests/dogfood/acorn-corpus.mjs`, #1712 umbrella). A `BigInt` literal is parsed
without throwing, but the resulting `Literal` node holds a **float64** value
instead of a BigInt, and even the raw-digit `bigint` STRING field is corrupted —
both lose precision at the float64 boundary.

## Divergence (compiled-acorn vs node-acorn, same pinned acorn@8.16.0)

`literals.js` (`const big = 9007199254740993n;`):

```
bigint-mismatch     $...init.value    expected 9007199254740993n   actual 9007199254740992   (number, not bigint)
primitive-mismatch  $...init.bigint   expected "9007199254740993"  actual "9007199254740992"  (rounded string)
```

`9007199254740993` is `2^53 + 1` — the smallest integer that float64 cannot
represent — so the rounding to `...992` is the tell-tale: the digits passed
through a float64 somewhere during parse/marshalling. node-acorn keeps
`value` as a real `BigInt` and `bigint` as the exact source digit string.

## Minimal repro

```js
const big = 9007199254740993n;
```

node-acorn: `{ type:"Literal", value: 9007199254740993n, bigint:"9007199254740993", raw:"9007199254740993n" }`

compiled-acorn: `value: 9007199254740992` (number), `bigint:"9007199254740992"`.

## Suspected root cause / scope note

Two layers, both suspect: (1) compiled-acorn's numeric-literal read path stores
the literal in an f64 rather than preserving the digit string for the `bigint`
field; (2) host marshalling has no BigInt representation. This intersects the
**i64-brand decision** that gates BigInt support project-wide (see memory
`project_bigint_i64_brand_gate`) — full `value: BigInt` may be blocked on that.
A cheaper partial win, even pre-i64-brand, is preserving the exact `bigint`
digit **string** field (no arithmetic needed), which is the field acorn callers
actually pattern-match on. Scope this issue to at least fixing the `bigint`
string corruption; the `value` BigInt object may defer to the i64-brand work.

## Acceptance

- `tests/dogfood/acorn-corpus.mjs` shows `corpus/literals.js` with the `bigint`
  string field exact (no `primitive-mismatch @ .bigint`).
- `value` either a real BigInt or documented-deferred to the i64-brand gate.
- No test262 regression.

## Architect verdict — i64-brand decision + narrow-vs-full scope (2026-06-30)

**The i64-brand gate is already CLOSED.** The architectural i64-bigint-brand
ValType decision that #1349/#1644 waited on was **ratified 2026-05-27 and merged**
(Slices A–E1). It is option (a): a compile-time-only optional flag on the existing
variant — `{ kind: "i64"; bigint?: boolean }` (`src/ir/types.ts:106`). Native
`type i64 = number` stays unbranded; the flag changes only (i) the box/unbox
instruction at the i64↔externref frontier (`__box_bigint`/`__to_bigint`, host;
`$BigInt` struct, standalone) and (ii) the mixed-operand TypeError gate in
binary-ops. General BigInt literals, arithmetic, comparisons, `typeof`, and
`BigInt(x)` all already work. **I reaffirm option (a); no new epic, no senior-dev
escalation, nothing further to ratify.**

**Verdict: #2846 lands via the NARROW path (a) WITHOUT the full epic (b).** The
full substrate already exists. #2846 is NOT a missing-feature problem — it is a
**brand-propagation hole in function-type dedup**, identical in class to #2795
(which fixed the very same hole for the boolean/symbol i32 brand). The fix is two
lines. **Scope: S (small). Single developer, single small PR, ~1h. No standalone
work, no host-import changes, no arithmetic.**

### Root cause (verified on current main via probe, 2026-06-30)

The `bigint` brand is compile-time-only ValType metadata; the Wasm type section
encodes both branded and unbranded i64 as plain `i64`. The function-type dedup
key (`funcTypeKey`, `src/codegen/registry/types.ts:12`) and equality
(`valTypeEq`, same file:48) **ignore the `bigint` flag** — exactly as they once
ignored the `boolean`/`symbol` i32 flags before #2795. Consequence: a function
whose result is bigint-branded i64 (e.g. acorn's `stringToBigInt`, which returns
`BigInt(dynamicString)`) **deduplicates onto an existing plain-`i64` FuncTypeDef**.
At the call site, `getWasmFuncReturnType` (`src/codegen/expressions/helpers.ts:469`)
reads `results[0]` from that shared (unbranded) FuncTypeDef and hands the caller a
**plain i64**. The caller then boxes the i64 into acorn's `any`-typed `node.value`
field via the unbranded `i64 → externref` arm (`__box_number` =
`f64.convert_i64_s` + box) → precision loss past 2^53 → a JS **number**
`9007199254740992`, not a bigint. acorn then derives `node.bigint` from
`node.value.toString()` (`acorn.mjs:3181`), so the rounded number poisons the
`bigint` STRING field too. **One root cause, both reported symptoms.**

Probe matrix (current main, `9007199254740993n`):

| Pattern | Before | After fix |
|---|---|---|
| `node.value = 9007199254740993n` (literal, inline) | `9007199254740993` ✅ | ✅ |
| `node.value = BigInt(dynStr)` (inline, no wrapper fn) | `9007199254740993` ✅ | ✅ |
| `node.value = toBig(s)` where `toBig(): bigint` | `9007199254740992` ❌ | `9007199254740993` ✅ |
| `node.value = stringToBigInt(s)` (acorn shape, returns `bigint\|null`) | `9007199254740992` ❌ | `9007199254740993` ✅ |

The corruption is exclusively at the **function-return boundary** — inline paths
already work because the brand reaches the box site within one function. acorn's
`BigInt(...)` result crosses `stringToBigInt`'s return, which is where the brand
is dropped. **I verified the fix below makes all four rows exact.**

## Implementation Plan

### Change (two edits, one file)

**File: `src/codegen/registry/types.ts`**

1. `funcTypeKey` — `part()` inner helper (after the `i32` brand branch, ~line 27).
   Add an `i64` branch so a bigint-branded i64 keys distinctly, mirroring the
   `:bool`/`:sym` precedent:

   ```ts
   } else if (v.kind === "i64") {
     if ((v as { bigint?: true }).bigint) s += ":big";
   }
   ```

2. `valTypeEq` (~line 48) — keep the two i64 brands non-equal so `funcTypeEq`
   (used by any structural-match callers) does not re-merge them:

   ```ts
   if (a.kind === "i64") {
     return Boolean((a as { bigint?: true }).bigint) === Boolean((b as { bigint?: true }).bigint);
   }
   ```

   Add this right after the `ref`/`ref_null` typeIdx check, before the final
   `return true`.

That is the entire fix. With distinct FuncTypeDefs, `getWasmFuncReturnType`
returns the **branded** i64 for a bigint-returning function, the call-site result
ValType carries `bigint: true`, and the downstream `i64 → externref` coercion
takes the `from.bigint` arm (`__box_bigint`, host) / `$BigInt` struct
(standalone) instead of `__box_number`. No change needed at the coercion sites,
`getWasmFuncReturnType`, the call paths, or acorn — they all already honor the
brand once it survives dedup.

### Why not re-brand at the call site instead

An alternative is to re-apply the brand from the TS return type at each call site
(`getWasmFuncReturnType(...) ?? resolveWasmType(...)` appears ~15× across
`calls.ts` / `calls-closures.ts`). Rejected: it would touch many sites, miss the
untyped-JS `bigint | null` inferred-return case unless each site also re-derives
the brand, and leaves the dedup hazard latent for the next branded ValType. The
dedup-key fix is the single chokepoint #2795 already established as the correct
layer; do it the same way.

### Edge cases / invariants

- **Native `type i64 = number` must stay byte-identical.** The flag is optional
  and defaults to unbranded, so every existing `{ kind: "i64" }` signature keys
  exactly as today — only genuinely bigint-branded results get the new `:big`
  bucket. This is the same safety argument #2795 relied on for `:bool`/`:sym`.
- **Type-index growth is minimal**: only modules that actually have a
  bigint-returning function gain one extra FuncTypeDef (the branded twin of an
  i64 signature). Most modules have zero. No type-index-stability concern for the
  reserved-up-front struct indices (this is the func-type table, appended).
- **Param position too**: the `:big` suffix in `funcTypeKey` is emitted by the
  shared `part()` helper for params as well as results, so a bigint *parameter*
  signature is likewise kept distinct — harmless and consistent (a bigint arg
  boxed/unboxed at a call already relies on the brand).
- No interaction with standalone/WASI: this is a pure compile-time dedup-key
  change; the standalone `$BigInt` carrier (Slice E1) is downstream of the brand
  and already merged.

### Test plan

1. **Unit (new) — `tests/issue-2846.test.ts`** (JS-host, via
   `compileAndInstantiate` + `wrapExports`). Assert exact round-trips for the
   function-return boundary (the regressing rows above):
   - `function toBig(s: string): bigint { return BigInt(s.replace(/_/g,"")); }`
     then `toBig("9007199254740993").toString() === "9007199254740993"`.
   - The untyped `bigint | null` acorn shape (`stringToBigInt`) →
     `.toString() === "9007199254740993"`.
   - `typeof toBig("5") === "bigint"` (brand survives return → boxes as bigint).
   - A control: `9007199254740993n` literal stored/read is exact (already passed;
     guards against regression).
2. **Native-i64 guard (regression)** — confirm `tests/issue-1644.test.ts` (the
   brand's CI guard: `type i64 = number` boxing byte-identical) still passes, plus
   `tests/issue-1644-sliceb.test.ts` / `-slice-d.test.ts`. Run any
   `playground/examples/*i64*` if present.
3. **Dogfood acceptance** — `node --import tsx tests/dogfood/acorn-corpus.mjs`
   shows `corpus/literals.js` with NO `bigint-mismatch @ .init.value` and NO
   `primitive-mismatch @ .init.bigint`; `9007199254740993n` preserved both as the
   `value` (real bigint) and the `bigint` string.
4. **Full CI / merge_group** — required (the change touches the shared func-type
   registry on every compile). Watch for any unexpected test262 delta; expectation
   is **0 regression** and a small BigInt-cluster gain. No baseline refresh
   anticipated.

### Effort / scope classification

- **Size: S.** 2 LOC of fix + ~1 small test file. ~1h including CI.
- **Single developer-claimable** (`fix(...)`). No senior-dev, no architect
  follow-up, no standalone slice, no host-import or arithmetic work.
- **Risk: low**, bounded by the optional-default-unbranded invariant; the
  identical change shape already shipped safely as #2795.

### Files

- `src/codegen/registry/types.ts` — the two edits (fix).
- `tests/issue-2846.test.ts` — new unit test (add).
- (verify only, no edit) `src/codegen/expressions/helpers.ts:469`
  `getWasmFuncReturnType`; `src/ir/types.ts:106` the brand;
  `src/codegen/type-coercion.ts` `from.bigint` box arm.
