---
id: 2905
title: "Standalone/WASI Promise carrier: resolveWasmType(Promise<T>) must lower to externref (stored/typed promise contract)"
status: ready
created: 2026-07-01
updated: 2026-07-01
priority: high
feasibility: medium
task_type: bug
area: codegen
goal: standalone
sprint: current
horizon: m
related: [2867, 2895, 2865, 1313, 1727, 1936]
umbrella: 2860
architect_spec: authored
blocks: [2895]
---

# Promise type contract: `resolveWasmType(Promise<T>) → externref` under the native carrier

## Problem

Under the native `$Promise` carrier (the `isStandalonePromiseActive(ctx)` gate —
today `ctx.wasi`, widened to `ctx.standalone` by #2895 slice 1d), an async call
`f()` leaves a **real `$Promise` (externref)** on the stack — produced either by
`wrapAsyncReturn` (synchronously-compiled async fn,
`expressions.ts:378-389`) or by the drive layer's result-promise
(`emitAsyncFrameStateMachine`, `function-body.ts:1159-1173`).

But the **type contract for a stored/typed `Promise<T>`** disagrees:
`resolveWasmType(ctx, Promise<T>)` unwraps the promise to `T` at
**`src/codegen/index.ts:12044-12054`** (comment: "Async functions are compiled
synchronously, so Promise<T> is just T at the Wasm level" — **false under the
carrier**). So every place that types a *value as `Promise<T>`* resolves to
`f64`/`i32`/etc., and storing the externref `$Promise` into that slot coerces
`externref → f64` via `__unbox_number($Promise)` = **NaN** (or `ref.cast` into a
struct slot = illegal-cast trap).

PR for #2401 fixed only the **inline** `f().then()` / `await f()` path (the type
flows straight from the call expression, never through a `Promise<T>`-typed
slot). The **stored / typed** path is still corrupted:

```ts
const p = f();            // p : Promise<T>  → f64 slot  ← NaN
p.then(cb);               // receiver typed Promise<T>   ← any.convert_extern on f64
async function g(q: Promise<T>) { await q; }  // param typed Promise<T> ← NaN
interface H { p: Promise<T> }                  // field typed Promise<T> ← NaN
function h(): Promise<T> { return Promise.resolve(x); }  // non-async return ← NaN
```

This is the **#2367 graveyard** (the −1404/−31/−16 regression pattern). The fix
is a **carrier-gated type-contract change**, validated verify-first on the
already-on WASI carrier, landing **before** #2895 slice 1d (which would
otherwise expose this corruption the moment the standalone gate widens).

## Implementation Plan (authored — read-only analysis of current `main`)

### Root cause

`resolveWasmType(Promise<T>)` (`index.ts:12046`) and `mapTsTypeToWasm(Promise<T>)`
(`src/checker/type-mapper.ts:111-118`, Object → externref) **disagree**:
`resolveWasmType` has a more specific Promise branch that unwraps to `T`, while
the carrier produces an externref `$Promise` value. Under synchronous async
compilation the unwrap was correct (`f()` returned raw `T`); under the carrier it
corrupts every stored/typed promise.

### The fix (one focused change)

**File: `src/codegen/index.ts`** — `resolveWasmType`, the `Promise` branch
(line 12046-12054). Carrier-gate the unwrap:

```ts
if (sym?.name === "Promise") {
  const typeArgs = ctx.checker.getTypeArguments(tsType as ts.TypeReference);
  if (typeArgs.length > 0) {
    const inner = typeArgs[0]!;
    if (isVoidType(inner)) return { kind: "externref" }; // already externref
    // (#2905) Under the native $Promise carrier a STORED/TYPED Promise<T> is a
    // real $Promise externref (wrapAsyncReturn / drive-layer result), NOT the
    // unwrapped T. Lower to externref so the slot matches the value end-to-end.
    // GC/host stays byte-identical: the unwrap-to-T contract only held because
    // async fns were compiled synchronously, which is exactly when the carrier
    // is OFF. Async fns' OWN return signature pre-unwraps via unwrapPromiseType
    // (function-body.ts:670 etc.), so this branch is only hit for value slots.
    if (isStandalonePromiseActive(ctx)) return { kind: "externref" };
    return resolveWasmType(ctx, inner, _depth + 1, _visited);
  }
  return { kind: "externref" }; // bare Promise — already externref
}
```

`isStandalonePromiseActive` is exported from `src/codegen/async-scheduler.ts:3116`.
**Cycle caution**: `async-scheduler.ts` imports `getOrRegisterPromiseType` etc.
FROM `index.ts`, so a direct `import { isStandalonePromiseActive }` into
`index.ts` risks an import cycle. The predicate is a one-line `ctx.wasi === true`
(1d will OR-in `ctx.standalone`). **Decision: do not import it into `index.ts` —
inline the gate condition** (`ctx.wasi === true` today) at the `resolveWasmType`
call site, or read a cached `ctx.promiseCarrierActive` boolean set once at ctx
init from the same predicate. When #2895 1d widens the carrier, update **both**
the inlined `resolveWasmType` gate and `isStandalonePromiseActive` together (they
must stay in lockstep — keep a `// keep in sync with isStandalonePromiseActive`
comment). A cached `ctx` flag is the cleanest single-source option and avoids the
two-place edit at 1d.

### Why this single change is sufficient (the contract coupling)

All four stored/typed sinks funnel through `resolveWasmType(Promise<T>)`:

1. **Bindings** — `const p = f()`: `statements/variables.ts`
   `localTypeForDeclaration` → `resolveWasmType` (via `index.ts`); the existing
   `isPromiseHostCall` override (`variables.ts:388-410`) already forces externref
   for `new Promise`/`Promise.resolve(...)` initializers, but **not** for
   `const p = userAsyncFn()` — this change covers that gap uniformly. No
   `variables.ts` edit needed once `resolveWasmType` is fixed.
2. **Params** — `function-body.ts:714` (`resolveWasmType(getTypeAtLocation(param))`)
   and `declarations.ts` signature registration.
3. **Fields** — interface/class struct fields via `collectInterface` /
   `ensureStructForType` → `resolveWasmType`.
4. **Non-async returns** — `function h(): Promise<T>` (returns a promise without
   `async`): `effectiveRetType = retType` (no unwrap) → `resolveWasmType` →
   externref. Async fns are handled separately (below).

With the slot now externref end-to-end:
- `f()` (externref) → externref slot: `coerceType(externref→externref)` = no-op. ✓
- `p.then(...)`: `emitStandalonePromiseThen` (`async-scheduler.ts:3120`) compiles
  the receiver then `any.convert_extern; ref.cast $Promise` — requires the
  receiver to be an externref `$Promise`. ✓
- `await p`: `emitStandaloneAwaitUnwrap` (`expressions.ts:414`) consumes one
  externref and `ref.test ($Promise)`-discriminates. With `p` now externref, the
  operand-is-externref branch (`expressions.ts:1359-1365`) fires. ✓

### Carrier gating — keep GC/host byte-identical

The change fires **only** when the carrier is active. In host/GC mode
(`!standalone && !wasi`) the branch keeps the `resolveWasmType(inner)` unwrap
exactly as today, so GC bytes are unchanged. **Acceptance includes a byte-diff of
a GC-mode corpus compile** (must be identical). `Promise<void>` and bare
`Promise` were already externref, so they are untouched; the gate narrows to
`Promise<T>` with non-void `T`.

### Signature-stability HAZARD (the −16/−29 guard) — REQUIRED audit

The async fn's **own** wasm return signature must stay `resolveWasmType(T)`
(f64), **never** externref, for a synchronously-compiled async fn — otherwise the
declared result type (externref) mismatches the body's raw-`T` return = **invalid
Wasm**. The main async-return sites already pre-unwrap via `unwrapPromiseType`
and are SAFE:

- `function-body.ts:670`, `declarations.ts:2930`, `:3011/3012`, `:3377`,
  `:3520` — all `isAsync ? unwrapPromiseType(retType) : retType`.

But **THREE sites compute a function's own return via
`resolveWasmType(retType)` WITHOUT the async unwrap** — under the carrier these
would now declare an externref return for a synchronously-compiled async fn whose
body returns f64 (today they are *accidentally* correct because
`Promise<T>`→`T`→f64 matched the body). **These MUST be guarded** (add
`isAsync ? unwrapPromiseType(retType, ctx.checker) : retType`, deriving `isAsync`
from the decl modifiers / `ctx.asyncFunctions`):

- **`src/codegen/declarations.ts:1655`** — `findCallSignature` call-site
  param/return inference (`results = isVoidType(retType) ? [] : [resolveWasmType(ctx, retType)]`).
- **`src/codegen/declarations.ts:3742`** — `module.exports = function …` default
  export signature.
- **`src/codegen/declarations.ts:3804`** — CJS named `module.exports.x = function …`
  signature.

These are edge forms (call-site inference, CJS function-expression exports) and
rarely async, but correctness under the carrier requires the guard. **This audit
is the −16/−29 guard: it is the one place the change can produce invalid Wasm.**
(If deriving `isAsync` at 1655 is awkward — it works off a resolved signature, not
a decl — gate the unwrap on `isPromiseType(retType)` + the callee being an async
decl, or simply pre-unwrap any `Promise<T>` return there since a non-async fn that
returns `Promise<T>` STILL wants externref under the carrier and `T` would be
wrong for it too. Pre-unwrap-to-externref-when-carrier is the uniform safe move at
all three sites: a fn whose *body* returns a real promise needs an externref
result either way.)

### AG0 value-consumer idiom (#2895-owned, 2 pre-existing fails) — isolation

The `return await <var>` / `asyncFn() as any as number` value-consumer idiom
(#1313/#1727 "compile away") flows through the **call-expression result type +
`asyncResultConsumedAsValue`** (`expressions.ts:333-341, 1266-1269`), NOT through
a `Promise<T>`-typed slot:

- `await asyncCall()` (inline) and `asyncCall() as number` skip `wrapAsyncReturn`
  and leave **raw `T` (f64)** on the stack — they never call
  `resolveWasmType(Promise<T>)`, so this change does **not** touch them. The 2
  pre-existing fails owned by #2895 stay exactly as-is (neither fixed nor
  regressed) — they need real frame suspension (PATH B), which is orthogonal.
- The **stored-then-consumed** shape `const p = asyncCall(); return await p` *is*
  affected and is **fixed**: `p` becomes externref, `await p` reads externref →
  `emitStandaloneAwaitUnwrap` → value (vs. today's f64-NaN slot). This is a
  strict improvement, not a regression of the value-consumer idiom.

Edge to verify: a value-typed cast off a stored promise
(`const p = asyncCall(); const n = p as any as number`) — `p` is now externref,
`coerceType(externref→f64)` runs `__unbox_number`. For a sync-fulfilled
`$Promise` this yields `Number($Promise)` = NaN — but that shape was **already**
NaN today (f64 slot holding a corrupted promise) and is semantically a
mis-typed program (a raw cast off a Promise without `await`). No corpus test262
path exercises it; flagged for the verify-first corpus.

### Index / funcIdx / type-index stability

- `resolveWasmType(Promise<T>) → externref` registers **no new type** (externref
  is a leaf valtype, no `typeIdx`) — **no DCE remap, no late-import shift, no
  funcIdx churn** from this branch. This is materially lower-hazard than typical
  codegen changes. The `$Promise` struct type is registered independently at the
  `wrapAsyncReturn`/`await`/`then` sites (`getOrRegisterPromiseType`) and is
  untouched.
- **Representation-scale edge**: `Promise<T>[]` arrays. The Array branch
  (`index.ts:11995-12030`) resolves `elemWasm = resolveWasmType(elemTsType)`; for
  a `Promise<number>[]` the element flips f64→externref under the carrier,
  registering an **externref vec** instead of a numeric vec
  (`getOrRegisterVecType`). This is correct (the f64 vec stored NaN), but it is a
  new vec type under the carrier — include `Promise<T>[]` in the corpus and
  confirm gc-lane unchanged. Same applies to `Map<K, Promise<V>>` /
  tuple/object fields typed `Promise<T>`.

### Verify-first plan (corpus, NET-POSITIVE) — NON-NEGOTIABLE

1. Build on CURRENT `main`; `git merge origin/main` first.
2. **GC-lane byte-identity**: compile a GC-mode corpus (any non-standalone
   examples) before/after — bytes MUST be identical (the gate proves this; the
   diff is the proof).
3. **Carrier-lane corpus** (`--target wasi`, where the carrier is already on, so
   this change is *exercisable today without #2895 1d*): per-file merged-HEAD vs
   `origin/main` baseline on REAL paths —
   - `test/built-ins/Promise/prototype/then/**`, `…/catch/**`,
   - `test/language/statements/async-function/**` (stored-binding shapes,
     `Promise<T>` params),
   - `test/language/expressions/await/**` (stored-then-awaited),
   - a `Promise<T>`-typed interface field + a non-async `(): Promise<T>` fn.
   Require **NET-POSITIVE** on the WASI lane; require the **full `merge_group`
   standalone report net-positive** as the authoritative gate.
4. Commit incrementally; the signature-audit guard (1655/3742/3804) lands in the
   same PR as the `resolveWasmType` change (they are coupled — invalid Wasm
   otherwise).

### Edge cases

- `Promise<void>` / bare `Promise` — already externref, unchanged.
- `Promise<Promise<T>>` — externref (the inner is never reached). Correct: a
  promise-of-promise is still one `$Promise` value at the slot.
- `T | Promise<T>` union — `mapTsTypeToWasm`/`resolveWasmType` union handling
  already collapses to externref for heterogeneous unions; a `T | Promise<T>`
  where `T` is primitive is heterogeneous (f64 vs externref) → externref. Verify
  it does not regress to f64 via the "all same kind" union branch
  (`type-mapper.ts:101-106`) — it won't, because the kinds differ.
- A `Promise<T>`-typed **class field** initialized in a constructor: the struct
  field is externref; the `this.p = asyncCall()` store coerces externref→externref.
  ✓
- Generic `Promise<T>` where `T` is a type parameter — already externref via the
  carrier branch (we don't reach `resolveWasmType(inner)`).

### Sizing & sequencing

**One focused PR.** `horizon: m`. The core change is ~3 lines in `resolveWasmType`
plus the 3-site signature-audit guard; the bulk of the effort is the verify-first
corpus + the GC byte-identity proof. Blast radius is wide *conceptually* (every
stored/typed Promise) but funnels through a single function, so it is **NOT too
wide for one PR** — the surgical gate + the leaf-valtype (no type/funcIdx churn)
keep it contained.

**Sequence: land this BEFORE #2895 slice 1d.** It is a *predecessor* of 1d, not
part of it: 1d widens `isStandalonePromiseActive` to `ctx.standalone`, which would
expose this exact corruption on the standalone lane. Validating here on the
already-on WASI lane de-risks 1d (the type contract is proven before the gate
widens). Branch from `origin/main`; if #2895 1b/1c are still settling, this is
independent of them (it touches the *type* contract, not the drive layer).

## Cross-references

- #2867 — umbrella standalone Promise/microtask carrier (this is the stored/typed
  type-contract slice).
- #2895 — async-frame drive layer; **this issue blocks #2895 slice 1d** (the
  standalone gate widen).
- #1313/#1727/#1936 — the call-site async contract (`wrapAsyncReturn`,
  `asyncResultConsumedAsValue`, `asyncFnNeedsCps`) this contract must agree with.
