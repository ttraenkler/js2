---
id: 6686
title: "S2: the JS value boundary (strings, admitted objects, callbacks, errors) works under the native regime"
status: ready
created: 2026-09-26
updated: 2026-09-26
priority: high
horizon: l
feasibility: hard
reasoning_effort: high
task_type: refactor
area: codegen, runtime, host-interop
language_feature: wasm-js-interop
goal: architecture
sprint: current
parent: 5385
depends_on: [6685]
related: [4397, 4399, 4401]
---

# #6686 — S2: JS value boundary under the native regime

Slice S2 of the #5385 "Implementation Plan v2" (read that section first). S1
(#6685) must land first: it introduces `hostFreeEnvironment(ctx)` and settles
the console arm.

## Problem

With `JS2WASM_NATIVE_REGIME_JS=1`, a `semanticProviders: "native-first"` build
in a JavaScript environment lowers with the standalone regime, and nine tests
in `tests/issue-4397-native-semantic-js-host.test.ts` break because arms that
answer "does this module keep the JS value bridge?" are still gated on
`ctx.standalone` (now "which provider regime"). Under the regime those arms
must read the profile's `hostValueInterop` instead.

| 4397 test                                                      | observed                                               |
| -------------------------------------------------------------- | ------------------------------------------------------ |
| keeps Wasm-owned objects live and identity-stable; native JSON | `type incompatibility when transforming from/to JS`    |
| matches host-assisted string values and observable errors      | `expected {} to be 'ALPHA'`                            |
| object-rest CopyDataProperties with a JS-owned `any` source    | `illegal cast`                                         |
| DataView admits caller-owned views; scopes admitted objects    | `expected null to be 9`; `expected undefined to be 42` |
| compiled bind / JS function admitted at the boundary           | `[object Object] is not a function`                    |
| translates Wasm-owned errors only at the JS boundary           | `expected Error to be an instance of TypeError`        |

## Change

Introduce `jsValueBoundary(ctx)` ≡ `ctx.targetProfile.hostValueInterop !== "off"`
in `src/codegen/context/types.ts` (next to `hostFreeEnvironment`). The
reference pattern already exists at `src/codegen/object-runtime.ts` ≈ L937
(`boundaryObjectInterop`) and `src/codegen/export-throw-boundary.ts:76`;
generalize it. Re-key ONLY boundary arms, one test at a time, in table order:

1. **String marshal at exports** — `src/codegen/closure-exports.ts` ≈ L773 and
   ≈ L1516 (`needsHostFacadeUnwrap = !ctx.standalone && !ctx.wasi && …`) and
   the export-wrapper string bridge (`__str_from_mem`/`__str_to_mem`,
   `src/codegen/native-strings.ts` ≈ L1711); string params/results must cross
   as JS primitives exactly as the `native-first` (non-regime) build does today.
2. **Admitted-object reads on `any` receivers** — the `any` arms in
   `src/codegen/property-access.ts` / `property-access-dispatch.ts` that cast
   externref→`$Object` under `ctx.standalone` must first consult the admitted
   boundary MOP (`__boundary_object_get/has/…`, minted in `object-runtime.ts`)
   when `jsValueBoundary(ctx)`. Wasm-owned `$Object` values never route
   through it (existing #4399 invariant).
3. **Callbacks / callable `any`** — `src/codegen/expressions/calls.ts` ≈
   L4711–L4960 (`allowHostBoundaryFallback` arms gated `!ctx.standalone &&
   !ctx.wasi`) → `jsValueBoundary(ctx)`; `planHostCallFallback(arity,
   nativeBoundary=true)` already yields `__boundary_callback_call_N`.
4. **Error translation at the boundary** — native `$Error` structs crossing out
   must present as the matching JS `Error` subclass with `name`/`message`;
   locate the kind-tag consumer in `src/runtime.ts` (`_wrapForHost` error arm)
   and the codegen side (`src/codegen/js-errors.ts` `noJsHost()` consumers that
   skip the kind tag under `ctx.standalone`).
5. **Symbol fields in struct exports** — `src/codegen/struct-field-exports.ts`
   L219 / L482 / L572 / L783: `ctx.standalone || ctx.wasi` there means "no host
   Symbol"; with a JS bridge use the boundary Symbol map (#4397 Symbol slice).

Never widen `hostValueInterop` semantics, never touch "which provider" arms,
no new compound predicates. Add `JS2WASM_NATIVE_REGIME_JS=1` to
`scripts/check-host-import-policy.ts` so the ratchet measures the regime;
raise maxima in `plan/audit/host-import-policy-baseline.json` only with a
measured reason stated in the PR.

## Acceptance

- [ ] `tests/issue-4396-target-profile.test.ts` byte-identity test green
      (default `gc`/`standalone`/`wasi` unchanged).
- [ ] `JS2WASM_NATIVE_REGIME_JS=1 npx vitest run tests/issue-4397-native-semantic-js-host.test.ts tests/issue-4399*.test.ts tests/issue-4401-host-import-policy.test.ts`:
      4397 15/16 (only "parse and URI string globals", pre-existing on main,
      stays red); 4399 suites green; 4401 unchanged.
- [ ] `JS2WASM_NATIVE_REGIME_JS=1 pnpm run check:host-import-policy` green with
      zero legacy/unknown imports.
- [ ] 321-row sample ≥ the S1 number (record it).
- [ ] `wrapCompiledExports` live-view / copied-value / opaque-handle policies
      unchanged (`tests/issue-4399*`).
