---
id: 2838
title: "[SENIOR-DEV ONLY] dynamic prototype-accessor dispatch on statically-typed receivers — `Object.defineProperties(Proto, {get})` getters never fire on `this.field` (acorn `return` wall)"
status: ready
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
related: [2837, 2831, 2664, 2151, 1239]
depends_on: [2837]
blocks: [1712]
architect_spec: candidate
---

# #2838 — runtime-installed prototype accessors are never invoked via `this.field` on a typed receiver

**Layer 3 of the acorn `return` wall (round 5).** #2837 (object-literal growth →
externref `$Object`) is NECESSARY but NOT SUFFICIENT for compiled acorn to parse
a `return` statement. After #2837, acorn module-init succeeds (the
`prototypeAccessors` descriptors build and the getter closures install), but
`function f(){ return 1 }` STILL throws acorn's own `'return' outside of
function`. This issue is the remaining, ORTHOGONAL blocker.

## Root cause (WAT-grounded, NOT hand-waved)

acorn installs its parser-state predicates as **prototype getters at runtime**:

```js
var prototypeAccessors = { inFunction: { configurable: true }, /* +10 */ };
prototypeAccessors.inFunction.get = function () {
  return (this.currentVarScope().flags & SCOPE_FUNCTION) > 0;
};
Object.defineProperties(Parser.prototype, prototypeAccessors);   // runtime install
```

`parseReturnStatement` (acorn.mjs:1191) then does `if (!this.allowReturn) raise(…)`,
where `allowReturn` → `this.inFunction` → the runtime-installed getter.

Instrumented compiled acorn (`.tmp/bb-instr.mjs` / `bb-instr2.mjs`):
- `this.inFunction` reads **0** (`typeof number`), `allowReturn` reads **0**, so
  every `return` raises `'return' outside of function`.
- BUT a direct `this.currentVarScope().flags & SCOPE_FUNCTION` computes **2**
  (correct) — the scope state is fine.
- The injected `console.log` inside the `inFunction` getter body **never fires**,
  while one in `parseReturnStatement` does. **The runtime-installed getter is
  NEVER invoked.**

**Mechanism:** the compiler lowers `this.inFunction` (a member access on a
statically-typed receiver) as a **STATIC struct-field read**, with no knowledge
that `inFunction` is an **accessor installed at runtime** via
`Object.defineProperties(Parser.prototype, …)`. So it reads the struct's default
slot value (0) instead of dispatching to the getter. (#2837 already made the
*storage* of the getter closure + its host-callable wrapping work — verified the
descriptors install and `definePropertiesHandler` wraps the wasm closures; the
gap is purely the **invocation** at the `this.field` read site.)

## Minimal repro (no acorn)

```ts
function C(this: any) {}
Object.defineProperties((C as any).prototype, {
  f: { get(this: any) { return 1; }, configurable: true },
});
export function probe(): number {
  return new (C as any)().f;   // must return 1; currently reads the struct default (0/undefined)
}
```

Acceptance: `new C().f` invokes the runtime-installed getter (returns 1), and the
acorn return repros parse:
`parse("function f(){ return 1; }")`, `parse("(a)=>{ return a; }")` →
correct AST, no `WebAssembly.Exception`.

## Scope / candidate approaches (architect to choose)

This is the **accessor-dispatch** substrate (member-get on a typed receiver vs the
host MOP), ORTHOGONAL to #2837's literal-growth representation. Candidates:

- **A — host-MOP fallthrough on member-get:** when a `this.field` / `o.field` read
  targets a field that is NOT a statically-known struct slot (or whose receiver's
  prototype had a runtime `Object.defineProperties` accessor install), route the
  read through `__extern_get` (the host MOP), which already consults
  runtime-installed prototype accessors. Risk: perf on the hot struct-field path;
  needs a precise "this field might be a runtime accessor" predicate.
- **B — static modelling of `Object.defineProperties(Proto, {…})`:** detect the
  acorn-shape install at compile time and register the prototype keys as
  accessor-backed members so `this.field` lowers to a getter call. Narrower; may
  not generalise beyond the statically-analysable install shape.
- **C — represent such prototype-accessor-bearing instances as `$Object`:** if a
  constructor's prototype receives runtime accessors, route its instances through
  the externref `$Object` path (reads go through `__extern_get` → host accessor).
  Broad; perf + identity considerations.

Recommend an architect spec choosing A/B/C. **Verify-first MUST exercise the
actual `Object.defineProperties(Proto, {get})` + `new C().field` install-and-invoke
chain** — NOT a direct `desc.get()` call (the #2837 architect's `:any` verify used
`po.inFn.get()`, a direct call, which masked this invocation gap). **Senior-dev,
`reasoning_effort: max`, `horizon: l`. Broad-impact ⇒ full `merge_group` +
standalone-floor.**

## Pointers

- acorn: `parseReturnStatement` 1191, `allowReturn`/`inFunction` getters 624/608,
  `Object.defineProperties(Parser.prototype, prototypeAccessors)` ~685.
- Compiler: member-get dispatch (`property-access.ts`), `__extern_get` host MOP,
  the struct-field-read fast path; runtime `definePropertiesHandler`
  (`src/runtime.ts`) where the accessors install (#2837 wraps the closures there).
- Repro infra (branch `issue-2837-objrep` `.tmp/`): `bb-instr.mjs`,
  `bb-instr2.mjs` (getter-never-invoked proof), `bb-probe2.mjs` (return trigger).
- Diagnosed after #2837 on compiled acorn@8.16.0, 2026-06-29 (sendev round 5).

## Round-6 implementation findings (sendev, 2026-06-29) — the architect's `this`-threading reframe is NECESSARY but NOT SUFFICIENT; acorn is blocked by a SECOND (member-read) layer

I implemented the architect's `this`-threading fix and then verified it against
acorn's ACTUAL pattern. Two distinct layers exist; the architect's verify-first
captured only the first, and on an unrepresentative repro.

### Layer 3 (the architect's): accessor-getter `this`-threading — IMPLEMENTED, works, non-regressing
- Root cause confirmed: a getter/setter wrapped at fixed arity 0/1
  (`_maybeWrapCallable`) needs `__call_fn_method_0`/`_1` to thread `this` via
  `__current_this`; those are often not emitted → `this` inert.
- **Better fix than the architect's** `_maybeWrapCallableUnknownArity` swap
  (which is **eager** — it checks `__call_fn_N` availability at WRAP time, but
  `Object.defineProperties` runs during MODULE-INIT before `__setExports`, so it
  returns null → "Getter must be a function" crash at init): instead patch the
  **lazy** `wasmClosureBridge` (`runtime.ts:2009`) so its method-`this` path falls
  back to the HIGHEST available `__call_fn_method_N` when the exact-arity
  dispatcher is absent (padding to that arity). Lazy ⇒ module-init-safe; mirrors
  the dynamic bridge's `methodMaxArity` logic. Confirmed: acorn module-init no
  longer crashes; closure suites (`#585`, `#1712`) fail IDENTICALLY with/without
  the change (pre-existing, not a regression). **This change is reverted on the
  branch pending the Layer-4 design** (it does not achieve acorn alone and is a
  broad method-`this` change; re-apply once Layer 4 lands).

### Layer 4 (the actual acorn blocker, NOT in the architect's spec): member-get on `this.<field>` never invokes the runtime-installed prototype accessor
- WAT/instrumented proof (`bb-instr2.mjs`, `bb-instr3.mjs`): inside
  `parseReturnStatement`, `this.inFunction` reads a static **0**, the getter body's
  injected `console.log` **never fires**, AND
  `Object.getPrototypeOf(this)` has **no `inFunction` descriptor**
  (`proto has inFunction desc=false`). So the getter installed by
  `Object.defineProperties(Parser.prototype, …)` is **not reachable** from the
  member-get on the typed `this` receiver.
- **Why the architect missed it:** the verify-first used `new C().f` (instance
  member access — `c` is externref/host → routes through `__extern_get`/MOP →
  getter fires, `this` inert = Layer 3). acorn uses **`this.<field>` inside a
  prototype method**, where `this` is a typed Parser **struct** receiver: the
  member-get takes the static struct-field path (field absent → default 0) and
  **does NOT consult the prototype's runtime-installed accessors**. acorn's
  prototype **methods** work (compile-time `__register_prototype` registry), but
  runtime-installed **accessors** are not in that registry and the typed-receiver
  member-get's prototype lookup (`_fnctorProtoLookup` / sidecar) doesn't surface
  them.
- **This IS the member-read layer the original carve's (a)/(b)/(c) targeted** —
  the architect rejected them based on the `new C().f` repro, but for `this.field`
  they are the relevant layer. Re-spec needed.

### Ask for the re-spec (architect)
Verify-first MUST use the REPRESENTATIVE chain: a prototype METHOD that reads
`this.<accessor>` where the accessor was installed via
`Object.defineProperties(C.prototype, <variableDescriptorMap>)` and `this` is a
typed struct receiver — e.g.
```ts
function C(){ this.flags = 2; }
C.prototype.m = function(){ return 1; };           // ensures method dispatchers exist
var acc = { f: { get: function(){ return this.flags; } } };
Object.defineProperties(C.prototype, acc);
C.prototype.read = function(){ return this.f; };   // this.<accessor> in a method
// new C().read() must return 2 (currently the getter never fires → 0/null)
```
NOT `new C().f`. The fix must make a typed-receiver member-get of a
not-statically-known field consult runtime-installed prototype accessors (host
MOP / `_fnctorProtoLookup` over the accessor sidecar). Couple it with the Layer-3
`wasmClosureBridge` `this`-threading fix above (re-apply from this branch's git
history / the `.tmp` notes).
