---
id: 3533
title: "codegen: class field initialized to a function value (`c = fn`) emits invalid Wasm — closure-value read reports externref but stores a raw ref"
status: blocked
sprint: current
assignee: ttraenkler/dev-serve
blocked-on: coordination with sr-3024 (shared $__mod_fn global; call-path entanglement)
created: 2026-07-22
priority: high
horizon: m
feasibility: medium
reasoning_effort: high
task_type: bugfix
area: codegen
language_feature: codegen-correctness
goal: correctness
parent: 3024
related: [3024]
---

# #3533 — class field = function value → invalid Wasm (closure-value read desync)

**Parent:** #3024 (default-lane invalid-Wasm residual). **Distinct root cause**
from #3024's 68-file `Function.prototype.toString` cluster (that one is the
funcIdx/closure-type-index SHIFT family, layout-fragile, owned by sr-3024 in
`calls-closures.ts` `compileClosureCall`). This one is **non-layout-fragile**
(persists with an export) and lives on the closure-value **READ** path —
verified disjoint from sr-3024's fix (its repro still fails with sr-3024's fix
applied).

## Problem (34-file cluster)

A class field initialized to a function value emits a module that fails
validation at instantiate:

```ts
const fn = function () {};
class C {
  c = fn;
} // C_init: struct.set[1] expected externref, found global.get of type (ref null N)
```

The 34 affected test262 files are all
`language/expressions/class/elements/*-literal-names.js` (regular / static /
gen / async-gen / method / getter / setter field definitions whose literal
field is initialized to a function const), harvested from the current-main
default-lane invalid-Wasm sweep.

## Root cause (global-type PHASE-ORDERING desync on the SHARED `$__mod_fn` global)

Refined by instrumentation (`CF_DEBUG` at the field-init + the module-global
read + the emitted-instruction/global-type dump):

For a module-global function const (`const fn = function(){}`), the binding gets
a promoted module global `$__mod_<name>`. That global is **declared `externref`**
first (its closure struct type is not yet known at declaration time). The class
field-init compiles `c = fn` while the global is still `externref`, so the read
correctly emits `global.get $__mod_fn` and correctly reports `externref`
(`valTypesMatch(externref, externref-field)` == true → no coercion) — **valid at
read time**. LATER, when the actual closure is assigned in `__module_init`
(`ref.func; struct.new N; global.set`), the global's type is **narrowed
`externref` → `(ref null N)`** to match the stored closure. That narrowing
**retroactively invalidates the already-emitted `global.get`** in `C_init`: it
now loads a `(ref null N)` where `struct.set` (externref field) expects
externref → invalid Wasm.

Verified timeline: at field-init compile time `ctx.mod.globals[$__mod_fn].type`
== `externref`; in the final module it is `(ref null N)`.

## Why this is NOT cleanly disjoint from sr-3024 (guardrail trip)

The `$__mod_fn` global is **read by BOTH**: (a) closure-VALUE reads (want
`externref` — this bug), and (b) `fn()` CALLS via `compileClosureCall`
(`calls-closures.ts`, **sr-3024's**), which read the raw `(ref null N)` to
`call_ref`. Any fix that touches `$__mod_fn`'s type or store — keep it externref
+ box the store (breaks the call read), or keep it `(ref null N)` + box at every
value-read (needs the read to see the FINAL type, i.e. a phase-ordering/post-pass
change) — is entangled with sr-3024's call path. A field-init/struct.set-only fix
is impossible because the global still looks `externref` at field-init time; the
desync only exists after finalization.

Per the coordination guardrail (fix must not change a closure identifier's global
type / must stay disjoint from the call path), this is escalated to sr-3024 for a
joint approach — most likely: declare `$__mod_<name>` as its closure type up-front
(or a deferred re-coercion post-pass) so value-reads box and calls read the raw
ref consistently.

## Acceptance criteria

- The 34 `class/elements/*-literal-names.js` files flip from invalid-Wasm
  (`struct.set expected externref, found ref`) to valid (pass or a distinct
  semantic result — never invalid Wasm).
- Host/gc mode byte-unchanged for code that does not read a function value into
  an externref context.
- No new invalid-Wasm signatures; no default-lane regression.
