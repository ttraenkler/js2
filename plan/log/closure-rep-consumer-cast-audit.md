# Closure-value representation — consumer/cast audit (sr-3024 step 2)

Audit for **#3534 option (a)**: a UNIFORM `externref` boxed representation for
closure VALUES. Under option (a) every closure-value binding — the
`$__mod_<name>` module global, the `$__captured_<name>` global, and the
`$__captured_box_<name>` / local ref-cell field-0 — stays **`externref` for its
whole lifetime** (never retro-narrowed). Closures are **boxed on store**
(`extern.convert_any` of the closure struct) and **unboxed on read/call**
(`any.convert_extern` + guarded `ref.cast` to the wrapper ROOT / self carrier).

This enumerates every site that CONSUMES a closure value (reads it from a
module global / captured global / ref cell / captured binding and casts or
type-assumes it) OR is a SINK that stores a closure value into a typed slot,
and classifies how each behaves once the retro-narrow is removed.

**Baseline branches read**: `fork/issue-3024-toString-closure-funcref` (PR #3497,
the #3024 landed call-site slice + the #3534 design plan) and current
`origin/main` src. Line numbers are against the worktree src at audit time
(2026-07-22) — re-anchor before editing.

## Classification key

- **(i) already externref-safe** — the site re-reads the storage type LIVE at
  emit time and already has an `externref` branch that fires; no change.
- **(ii) needs a box/unbox/convert** — mass-handled if the site already routes
  through `coerceType` (which guards externref→ref at `type-coercion.ts:1856`
  and boxes ref→externref at `:1717`/`:2043`); the convert appears automatically
  once the storage type flips to externref.
- **(iii) BREAKS** — the site assumes the NARROWED `(ref null N)` / precise
  struct type (a cached/independently-resolved type, or a raw `struct.new` /
  `struct.set` / `global.set` operand with no trailing coerce). Removing the
  narrow either invalidates an already-emitted read (the #3533 mechanism) or
  INVERTS it (`struct.set expected (ref null N), found externref`). **These are
  the regressors** — the sites that turn a currently-passing closure test red.
- **(iv) perf-sensitive hot path** — extra `extern.convert_any`/`ref.cast`
  round-trips on a path that may be hot; measure for step-5's floor/perf check.

Two discriminators decide (i) vs (iii) for every cast site (per advisor):
1. **Live-read vs cached-narrow** — does it re-read `globalDef.type` /
   `fieldType` at emit, or assume `(ref null N)` from an independent resolve?
2. **Root vs sibling wrapper** — when casting externref→precise, does it target
   the wrapper ROOT (`getFuncRefWrapperRootTypeIdx`, or
   `getClosureFuncSelfTypeIdx`→root for shared funcs) or a per-signature SIBLING
   wrapper (`?? info.structTypeIdx` / `?? wrapperStructIdx`)? Sibling casts are
   #2873-latent: safe today only because no corpus value is boxed as that
   sibling; boxing-everything-as-externref changes which wrapper a value carries.

---

## Enumerated consumer / sink table

### A. The store sites (where the retro-narrow lives — step 2's own edits)

| # | Site (file:line) | What it casts/assumes | Class | Required change under (a) |
|---|---|---|---|---|
| A1 | `statements/variables.ts:848-861` | **The retro-narrow itself.** Module-`const fn = () => …` compiles the arrow (`closureType` = precise `(ref null N)`), then `globalDef.type = nullableType` NARROWS the pre-declared `externref` `$__mod_<name>` global to the precise ref, and rewrites `init`. | **(iii)** | **Remove the narrow.** Keep `globalDef.type` externref; do NOT rewrite `init`. |
| A2 | `statements/variables.ts:862-865` | **Box-on-store operand.** `local.tee $local (precise ref)` → `global.set $__mod_<name>`. With A1 removed the global is externref but the value on the stack is a precise ref → `global.set expected externref, found (ref null N)`. | **(iii)** | Insert `coerceType(ctx, fctx, closureType, {kind:"externref"})` (i.e. `extern.convert_any`) before `global.set`. Leave the LOCAL precise (its call reads use the precise-ref call arm). |
| A3 | `closures.ts:570` (`getOrRegisterRefCellType(ctx, cap.valType)`) + `closures.ts:578` `struct.new $refCell` | **Ref-cell field-0 carrier type** for a boxed *closure* capture = `cap.valType` (today a precise ref, or the #3534 bare funcref). This is THE #3534 construct-site carrier: mutually-recursive const closures store cross-referencing cells; a sibling-wrapper `ref.cast` at construct traps `illegal cast`. | **(iii)** | For closure-valued captures, box as externref: ref-cell field-0 = `externref`, `struct.new` operand `extern.convert_any`'d. Inner closures then cross-reference via externref → sidesteps the #2873 sibling-wrapper cast entirely (design step 4). Non-closure captures (scalars) unchanged. |
| A4 | `closures.ts:588-597` `$__captured_box_<name>` global | Box GLOBAL typed `(ref null refCellTypeIdx)`; holds the ref cell (not the value). Unaffected by value rep IF the cell's field-0 flips to externref (A3) — the box wraps the cell, cell wraps the value. | (i) | none (cell type change in A3 propagates). |
| A5 | `closures.ts:626-654` `$__captured_<name>` value-global | Captured-VALUE global typed from `localType` (line 633-634: precise ref widened to ref_null). For a closure this is a precise ref today. | **(ii/iii)** | If the captured local is now externref, the global should be externref; the copy `local.get; global.set` (656-658) then needs no cast. If the local stays precise but the global is externref, insert `extern.convert_any`. Follow the same rule as A2. |

### B. The call sites (read a closure value → call it)

| # | Site (file:line) | What it casts/assumes | Class | Required change under (a) |
|---|---|---|---|---|
| B1 | `expressions/calls-closures.ts:363-377` `compileClosureCall` module-global arm | LIVE-reads `globalDef.type`; `if (globalType?.kind === "externref")` → `global.get; any.convert_extern; emitGuardedRefCast(selfStructTypeIdx)`. Under (a) the global is ALWAYS externref → this branch always fires. | **(i)** (already the target arm) but see B2 | Verify: `selfStructTypeIdx = getClosureFuncSelfTypeIdx(info.funcTypeIdx) ?? info.structTypeIdx` (line 326). For a SHARED lifted func this is the ROOT → cast safe. For a private/named func it's the concrete self → the boxed value MUST be that concrete struct (it is, when boxed from its own `struct.new`). |
| B2 | `expressions/calls-closures.ts:379-403` `pushClosureRef` raw-global path | When `effectiveLocalIdx === undefined` (global NOT externref today after narrow) it does raw `global.get; struct.get selfStructTypeIdx` — **assumes the narrowed `(ref null selfStructTypeIdx)`**. | **(iii)→dead** | Under (a) the externref arm (B1) always sets `effectiveLocalIdx`, so this raw arm becomes DEAD for closure globals. Confirm it's unreachable; the `#1730` late-import re-resolve comment applies only to the raw arm — its hazard disappears with the value pre-cast into a local. |
| B3 | `calls-closures.ts:339-351` `compileClosureCall` boxed-local arm | LIVE-reads `boxed.valType`; `if (boxed.valType.kind === "externref") any.convert_extern` then `emitGuardedRefCast(selfStructTypeIdx)`. | **(i)** | With A3, `boxed.valType` is externref → the convert fires, guarded cast to selfStructTypeIdx. Safe if selfStructTypeIdx is root/concrete-own (same caveat as B1). |
| B4 | `calls-closures.ts:352-362` local-externref arm | `localType?.kind === "externref"` → `any.convert_extern; emitGuardedRefCast`. Already externref-safe. | **(i)** | none |
| B5 | `calls-closures.ts:854-905` `compileCallablePropertyCall` precise-ref-field closure arm | `fieldType.kind === "ref"/"ref_null"` and `closureInfoByTypeIdx.get(fieldType.typeIdx)` → raw `struct.get structTypeIdx fieldIdx` then `struct.get fieldType.typeIdx 0` (field-0 funcref). **Assumes the field is a precise closure struct.** | **(ii/iii)** | Only reached when the class/object FIELD itself is a precise closure ref. If option (a) also flips closure-typed FIELDS to externref (see D-family), this arm is not taken → the externref arm (B6) handles it. If fields stay precise, this arm is fine (the field value is a precise struct, independent of the source global rep). Decide field-rep policy explicitly. |
| B6 | `calls-closures.ts:909-1021` `compileCallablePropertyCall` externref-field arm | `fieldType.kind === "externref"`; single-candidate path casts to `selfTypeIdx = getClosureFuncSelfTypeIdx(...) ?? wrapperStructIdx` (**`?? wrapperStructIdx` = per-signature SIBLING**, line 941). Multi-candidate path casts to the ROOT (`getFuncRefWrapperRootTypeIdx`, line 1002). | **(iii/iv) #2873-latent** on the single-candidate sibling fallback | The `?? wrapperStructIdx` fallback is a sibling-wrapper cast — #2873-latent (memory `reference_2873`: "property-call dispatch still casts to the declared wrapper"). Boxing-all-as-externref changes which wrapper a stored closure carries → make the single-candidate path also cast to the ROOT and discriminate on the funcref's exact type (the landed #2873 pattern already used by the multi-candidate arm). |
| B7 | `calls-closures.ts:1024-1106` `compileCallablePropertyCall` ref-field-by-signature-scan arm | Scans `closureInfoByTypeIdx` for a matching sig, then `emitGuardedRefCast(matchedStructTypeIdx)` on the field value. Guarded, so a miss nulls (not traps). | **(i/ii)** | Guarded cast → no trap. Same field-rep-policy note as B5. |
| B8 | `calls-closures.ts:1184-1231` `compileCallableElementAccessCall` single-candidate | Casts element (externref/ref) to `selfTypeIdx = getClosureFuncSelfTypeIdx(...) ?? wrapperStructIdx` — **`?? wrapperStructIdx` SIBLING** (line 1189). | **(iii/iv) #2873-latent** | Same as B6: route single-candidate through the ROOT. |
| B9 | `calls-closures.ts:1233-1253` `compileCallableElementAccessCall` multi-candidate | Casts to ROOT (`getFuncRefWrapperRootTypeIdx`, line 1236) + `emitRootFuncrefDispatch`. | **(i)** | none (already root-safe) |
| B10 | `calls-closures.ts:238-307` `emitRootFuncrefDispatch` | Fetches funcref off the ROOT (`struct.get rootIdx 0`), dispatches on exact funcref type; per-arm concrete self `ref.cast candidateSelfTypeIdx` only when `!== rootIdx` (line 268). | **(i)** | none — this is the #2873-correct template every sibling site above should adopt. |

### C. The value-read site (read a closure value AS a value — not called)

| # | Site (file:line) | What it casts/assumes | Class | Required change under (a) |
|---|---|---|---|---|
| C1 | `expressions/identifiers.ts:788-808` module-global identifier read | `global.get $__mod_<name>` then returns `mType = globalDef.type` (LIVE). Today returns the narrowed `(ref null N)` → the #3533 root: an already-emitted read is retro-invalidated, and its SINK (`struct.set externref`) sees `(ref null N)`. | **(iii)→fixed by A1** | With A1 removed, `mType` is externref → the read is valid as-emitted and returns externref; #3533's `struct.set expected externref, found (ref null N)` disappears. The non-null narrow at 803-805 (`if mType.kind==="ref_null" && narrowedNonNull → ref.as_non_null`) simply doesn't fire for externref — confirm nothing downstream depends on a flow-narrowed closure global being a precise `(ref N)`. |
| C2 | `identifiers.ts:749-763` boxed-captured-global read (`emitCapturedBoxGlobalRead`, `property-access.ts:1368-1385`) | `global.get box; emitNullGuardedStructGet(refCellTypeIdx, valType, field 0)` → returns `entry.valType`. | **(i/ii)** | With A3 `valType` is externref → returns externref; the null-guarded struct.get reads the externref field. Consumers of this externref are handled by coerceType. |
| C3 | `identifiers.ts:765-786` captured-global read | `global.get capturedIdx` → returns `gType` (LIVE); optional `ref.as_non_null` if widened. | **(i)** | With A5 the captured global is externref → returns externref; the `ref.as_non_null` narrow doesn't fire. |

### D. The SINK sites (store a closure value into a typed slot — the INVERSION regressors)

The value-read (C1) now yields externref. Every slot that previously accepted a
precise `(ref null N)` closure and does a RAW operand (no trailing `coerceType`)
INVERTS: `expected (ref null N), found externref`.

| # | Site (file:line) | What it assumes | Class | Required change under (a) |
|---|---|---|---|---|
| D1 | `literals.ts:2452-2455` object-literal nominal-struct property-assignment | `compileExpression(prop.initializer, field.type)` with NO trailing coerce. For `{ c: fn }` with a PRECISE closure `field.type`, the identifier read (C1) returns externref; the value flows straight into `struct.new` → **`struct.new` operand type mismatch**. | **(iii)** | Add an explicit `coerceType(ctx, fctx, actualType, field.type)` after `compileExpression` (coerceType:1856 guards externref→precise-ref), OR make closure-typed obj-literal fields externref. |
| D2 | `literals.ts:2420-2438` method-shorthand closure → field | LIVE-checks `field.type.kind` and `extern.convert_any` for externref (2425); for a same-typeIdx precise field, no coerce (2428-2430 only handles MISMATCH by drop+null). This arm's SOURCE is a fresh `emitObjectMethodAsClosure` struct, not a global read — unaffected by value-rep. | **(i)** | none (source is a local struct.new, not a narrowed global). |
| D3 | Class instance-field init / `this.c = fn` in constructor | Routes through `expressions/assignment.ts` property-write. Most write arms DO `coerceType(resultType, fieldType/globalType)` (assignment.ts:346, 384, 396, 435, 468, 517, 690-697, 792, 1195, 1218, 1358) → externref→precise-ref guarded by coerceType:1856. | **(ii)** mass-handled | none if the store routes through coerceType. **Spot-verify** the specific class-field-init path (`class C { c = fn }`, the dev-serve #3533/#3533-sibling repro) actually reaches a coerceType arm and not a raw struct.set. |
| D4 | `literals.ts:213-320` `compileObjectLiteralAsExternref` | Stores every property AS externref (`coerceType(..., {kind:"externref"})`, lines 233/319/461). | **(i)** | none — already the externref target rep. |
| D5 | Array/vec element store of a closure (`type-coercion.ts:875-899` element coercion; array-literal build) | Element coercion arm handles ref→externref (`extern.convert_any`, :896) and externref→ref (`any.convert_extern; ref.cast_null`, :899). | **(ii)** | none if the closure element store routes through this arm. Verify a `const fns = [a, b]` of module-const arrows stores externref elements. |
| D6 | Closure passed as a `(ref null N)`-typed CALL ARG | Arg coercion via `coerceType(argType, paramType)` → externref→precise-ref guarded (coerceType:1856). | **(ii)** | none if arg lowering routes through coerceType (it does for typed params). |
| D7 | Closure in RETURN position where the wasm return type is a precise closure ref | Return coercion; if the function's wasm return type was resolved as the precise closure struct but the returned value-read is now externref, needs coerceType. | **(ii/iii)** | Depends on whether return lowering coerces to the declared return valtype (usually yes). Flag for the measurement corpus (mutual-recursion returns closures). |

### E. The host/dynamic-dispatch bridges (already externref-in — the model to copy)

| # | Site (file:line) | What it does | Class |
|---|---|---|---|
| E1 | `closure-exports.ts:433-447` `buildFuncrefExtraction` / `__call_fn_<arity>` (:250,:336,:564,:637,:840,:913,:1007) | Take a closure AS externref, `any.convert_extern`, chained `ref.test`/`ref.cast selfTypeIdx` over every registered shape, extract funcref off field 0, `call_ref`. | **(i)** — already the uniform-externref consumer pattern; unaffected. Under (a) these become the COMMON path and stay correct. |
| E2 | `closure-exports.ts:114-122` `externToClosureParamRef` | externref closure-call ARG → `any.convert_extern` + (for concrete ref param) `ref.cast`. This is a NON-guarded `ref.cast` (line 117/119). | **(iv) watch** — non-guarded cast; safe because param types are concrete AnyString/etc., not sibling wrappers. Not a closure-value cast per se; note only. |
| E3 | `type-coercion.ts:1856-1927` `coerceType` externref→ref | Guarded (`ref.test toIdx` + `cast_null`, else vec/tuple materialize or null). **Casts to a SPECIFIC `toIdx`** — if `toIdx` is a per-signature sibling wrapper and the value was boxed as a different sibling, this NULLS OUT (silent wrong-callee), not traps. | **(iii/iv) #2873-interaction** — when coerceType is used to lower a closure externref to a *specific wrapper ref*, it inherits the sibling-mismatch hazard. Prefer routing closure externref→precise through the ROOT, or ensure `toIdx` is the self carrier the value was boxed as. |

---

## Highest-risk sites (read these first)

1. **A3 — ref-cell field-0 carrier (`closures.ts:570`)** + the #3534 construct
   site. This is the carrier for the mutually-recursive matcher closures. If it
   is NOT flipped to externref, #3534's `illegal cast` at construct persists
   (the sibling-wrapper cast is never removed). Highest-value, highest-risk edit.
2. **A1+A2 — the retro-narrow removal + box-on-store (`variables.ts:848-865`)**.
   This is step 2's core. A2 is easy to forget (the narrow removal without the
   `extern.convert_any` gives `global.set expected externref, found (ref null N)`).
3. **D1 — object-literal precise-ref closure-field store (`literals.ts:2452-2455`)**
   and **D3 class-field init**. The INVERSION regressors: a closure stored into a
   precise struct field via a raw operand flips from valid to
   `struct.set/struct.new expected (ref null N), found externref`. D1 has no
   trailing coerce → confirmed (iii). D3 *appears* mass-handled by coerceType but
   MUST be spot-verified on the exact `class C { c = fn }` repro.
4. **B6/B8 — the single-candidate sibling-wrapper casts (`?? wrapperStructIdx`,
   calls-closures.ts:941, :1189)**. #2873-latent today; boxing-everything-as-
   externref changes which wrapper a stored closure carries, so a value boxed as
   sibling-A read through a sibling-B cast NULLS → `call_ref` traps on null
   funcref. Route both single-candidate paths through the ROOT (adopt B10's
   template). Corroborated by memory `reference_2873_funcref_wrapper_chain_rtt_order`.

## Type-(iii) breaking-site count

**Confirmed (iii) — WILL break without an edit: 5**
- A1 (retro-narrow removal — the enabling edit)
- A2 (box-on-store operand)
- A3 (ref-cell carrier → externref; #3534)
- B2 (raw-global struct.get arm — becomes DEAD but must be proven unreachable, not left assuming the narrow)
- D1 (object-literal precise closure-field raw `struct.new` operand)

**(iii)-latent / conditional (break depending on field-rep policy or unverified coerce routing): 5**
- B6, B8 (#2873 single-candidate sibling casts — break once value-boxing rep changes which wrapper is carried)
- E3 (coerceType externref→specific-sibling-wrapper — silent null, #2873 class)
- A5 (captured-value global — breaks if local/global rep disagree)
- D7 (closure-in-return-position if return lowering doesn't coerce)

**Spot-verify-before-trusting (expected (ii) mass-handled, but one raw store would make it (iii)): D3, D5, D6.**

So: **5 hard (iii) sites** that the step-2 PR must edit, **+5 latent (iii)**
that flip with the value-rep change (chiefly the #2873 sibling casts), **+3
sink families to spot-verify** route through `coerceType`.

## Hot-path / perf concerns (step-5 floor + playground sidebar)

- **`extern.convert_any` on store, `any.convert_extern` + guarded `ref.cast` on
  every read/call** of a closure global/cell. For module-const closures the
  STORE is once-per-init (cold). The READ/CALL cost lands on B1/B3 (every
  internal call through a module-const closure) — a guarded cast (`ref.test` +
  branch) per call. The #3534/#3533 corpus (matcher harness, config closures)
  is cold, but **HOFs / callbacks-in-arrays / mutual recursion in a loop** are
  the perf-sensitive shapes — measure those on the playground benchmark sidebar.
- **Routing single-candidate B6/B8 through the ROOT + funcref-exact discrimination**
  replaces one direct cast with a `struct.get root 0` + a `ref.test` chain. For a
  1-candidate module this is a single test — negligible; only multi-candidate
  arity-collision modules pay the chain (already the case for the multi-candidate
  arm today).
- The convert ops (`extern.convert_any`/`any.convert_extern`) exist in BOTH the
  gc and standalone lanes and are near-free engine-level identity casts; the
  guarded `ref.test` is the only real cost. Expect negligible on cold paths;
  **must be measured, not assumed** — re-check the standalone floor at each step
  (the payoff was framed as standalone flips; `project_standalone_floor_only_on_merge_group`
  means a regression here surfaces ONLY at merge_group).

## #2873 interaction summary

Option (a) is #2873-SAFE **only where the externref→precise cast targets the
wrapper ROOT**. Residual sibling-wrapper casts that boxing-everything-as-externref
turns from latent-into-live: **B6** (`calls-closures.ts:941`), **B8**
(`:1189`), and **E3** (`coerceType` externref→specific-wrapper). The #3024
landed call-site arm (B1, `compileClosureCall`) already reads `selfStructTypeIdx`
via `getClosureFuncSelfTypeIdx`→root for shared funcs (line 326), so it is
root-safe; option (a) SUPERSEDES the #3024 funcref-cell `struct.new` stopgap
(a boxed struct never takes that branch — design step 3). `emitRootFuncrefDispatch`
(B10) is the correct template to propagate to B6/B8.

## Interaction with sr-3024's landed call-site arm (#3024)

The #3024 slice fixed the CALL read in `compileClosureCall` for the funcref-cell
case. Under option (a) the ref cell no longer stores a bare funcref (A3 → it
stores an externref-boxed struct), so the #3024 `struct.new`-rebuild branch
becomes dead and should be removed once A3 lands and provably no cell is
funcref-typed (design step 3). Do NOT remove it before A3 — the two must land in
the stated order (step 2 store change → step 3 stopgap removal).
