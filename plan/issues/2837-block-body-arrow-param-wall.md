---
id: 2837
title: "[SENIOR-DEV ONLY] dynamic property-add to a NON-EMPTY object literal is silently dropped (closed struct, no sidecar) — breaks `Object.defineProperties` getters → compiled acorn throws on every `return` statement"
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
related: [2836, 2831, 2664, 2151, 2186, 2379]
depends_on: []
blocks: [1712]
architect_spec: needed
---

# #2837 — dynamic property-add to a non-empty object literal is silently dropped (closed struct, no sidecar)

**Round-4 acorn-dogfood wall, exposed after #2836.** The carve title ("block-body
arrow") was a RED HERRING — WAT-grounded isolation shows the real trigger is the
**`return` statement**, and the true root cause is a general
object-representation bug: **a property added to a NON-EMPTY object literal after
creation is silently compiled away.**

## Trigger isolation (compiled acorn@8.16.0, AFTER #2836)

`parse(src, {ecmaVersion:2022})`:

```
function f(){}              OK     function f(){ 1; }        OK
function f(){ x; }          OK     function f(){ var x=1; }  OK
function f(){ f(); }        OK     function f(){ ; }         OK
() => {}                    OK     () => { 1; }              OK
function f(){ return; }     THROW  function f(){ return 1; } THROW
() => { return 1; }         THROW  x => { return x; }        THROW
```

Not block-body, not params — **only a `return` statement throws.** (My round-3
carve guessed block-body arrow; that was wrong — the block bodies that "threw" all
happened to contain `return`.)

## Why `return` throws (acorn raise path → getter → root cause)

`parseReturnStatement` (acorn.mjs:1191): `if (!this.allowReturn) { this.raise(…,
"'return' outside of function") }`. Instrumented compiled acorn:
`allowReturn = 0` (typeof number), `inFunction = 0`, **but** my direct
`currentVarScope().flags & SCOPE_FUNCTION = 2` (correct). So the getter
`inFunction` returns 0 despite `flags&2 == 2`.

`inFunction`/`allowReturn`/`inGenerator`/`inAsync`/`canAwait`/… are **getters
installed via `Object.defineProperties(Parser.prototype, prototypeAccessors)`**
(acorn.mjs:600/608/624). Instrumenting the getter body proved **it is never
invoked** (its `console.log` never fires, while a `console.log` in
`parseReturnStatement` does). So `this.inFunction` reads a **default 0**, not the
getter result → `allowReturn` 0 → every `return` raises.

## Root cause (minimal repro + WAT, NOT hand-waved)

acorn's idiom: `var prototypeAccessors = { inFunction: { configurable: true },
… }` then `prototypeAccessors.inFunction.get = function(){…}` then
`Object.defineProperties(Parser.prototype, prototypeAccessors)`. The getter is
added to the descriptor via a **property assignment after the literal**.

Minimal repros (no acorn):

| repro | result | |
|---|---|---|
| `var o={}; o.f=7; o.f` | `number:7` | empty literal → dynamic `$Object`, grows fine |
| `var o={}; o.type="X"; o.start=5; o.get=fn` (all late) | works | empty literal grows fine |
| `var o={c:1}; o.d=7; o.d` | **`object`/null** | **non-empty literal → write DROPPED** |
| `{inFn:{configurable:true}}` then `.inFn.get=fn`, read `.get` | **`typeof "object"`** | acorn's exact pattern — getter lost |
| `Object.defineProperty(proto,…)` (singular) | works | install+dispatch machinery is fine |
| `Object.defineProperties(proto,{x:{get:fn}})` (inline literal) | works | inline descriptors fine |

WAT for `var o={c:1}; o.d=7; return o.d`:

```wat
(func $probe (result externref)
  (local $o (ref null 2))   ;; o = closed struct type 2 (only field 'c': f64)
  f64.const 1
  struct.new 2              ;; build {c:1}
  local.set 0
  f64.const 0
  drop                      ;; o.d = 7   → WRITE SILENTLY DROPPED (no sidecar)
  ref.null extern           ;; return o.d → null
  return)
```

**A non-empty object literal is lowered to a CLOSED struct with no sidecar
fallback.** A write to a field not in the literal shape is silently dropped; the
read returns null. An EMPTY literal `{}` uses the dynamic `$Object`
representation and grows correctly — so the divergence is purely the
representation choice (`{}` → `$Object`; `{…fields}` → closed struct). acorn's
`prototypeAccessors` (and its nested `{configurable:true}` descriptors) are
non-empty literals → closed structs → the later `.get =` assignment is dropped →
no getters installed → `inFunction` reads default 0 → `return` throws.

(`Object.defineProperty` singular and inline-literal `defineProperties`
descriptors work — this is NOT a defineProperties bug; it is the descriptor
object losing its late-added `.get` field.)

## Why this is architecture-scope (escalated for an architect spec)

This is the **object-representation substrate** (the `$Object` dynamic
reader / member-set-dispatch #2664 / member-get-dispatch #2151 family). Blast
radius: **every non-empty object literal that later receives a property not in
its literal shape** — a representation-scale change (reference_2379 hazard).
Candidate approaches, each with real tradeoffs an architect should weigh:

- **A — escape/flow analysis at the literal:** if an object created by a
  non-empty literal is ever the target of a property write whose key is not in
  the literal shape (or an `Object.define*` target), represent it as `$Object`
  (dynamic), like empty literals already are. Precise but needs intra/inter-proc
  escape analysis; misses dynamically-keyed writes.
- **B — sidecar fallback on closed structs:** make a write of an unknown field to
  a closed-struct object route to the sidecar, and member-get fall through to the
  sidecar on a miss (the machinery the empty-`$Object` path already uses). Uniform,
  no analysis, but adds a sidecar branch to every struct member-set/get (perf;
  the #2664 slot-vs-sidecar desync hazard must be respected).
- **C — always represent object literals as `$Object`:** simplest, but a broad
  perf regression for the common closed-record case.

Recommend an architect spec choosing A/B/C (B looks most uniform and reuses the
empty-object machinery, but must not reintroduce the #2664 write-leaks-to-sidecar
/ read-uses-slot desync). **Senior-dev / architect, `reasoning_effort: max`,
`horizon: l`. Broad-impact ⇒ full `merge_group` + standalone-floor.**

## Acceptance (bar = #1712)

- `var o={c:1}; o.d=7` reads back 7; the acorn `prototypeAccessors` idiom installs
  working getters; `parse("function f(){ return 1; }")`, `parse("() => { return
  x; }")` on compiled acorn return the correct AST (no `WebAssembly.Exception`).
- The real-world NM differential `edge.js` (module, 1190 nodes) compiled-acorn vs
  node-acorn is **structurally equal** modulo documented quirks (null
  `sourceFile`, boolean-as-i32) — completes the #1712 bar started by
  #2831/#2836. `background.js` must STAY structurally-equal (it already is — no
  `return`-in-non-empty-literal pattern).
- 0-regression `merge_group` + standalone-floor (broad-impact ⇒ full CI). Watch
  the object-literal / member-set-dispatch / `built-ins/Object/**` buckets and the
  #2664 invariant.

## Pointers

- acorn: `parseReturnStatement` 1191, `allowReturn`/`inFunction` getters 624/608,
  `Object.defineProperties(Parser.prototype, prototypeAccessors)` ~600, getter
  assignments 608+.
- Compiler: object-literal lowering (closed struct vs `$Object`) — the
  `struct.new` vs dynamic-object decision; member-set-dispatch (#2664,
  `src/codegen/member-set-dispatch.ts`), member-get-dispatch (#2151), the
  `$Object` sidecar reader.
- Repro infra (branch `issue-2837-blockbody-arrow` `.tmp/`): `bb-probe2.mjs`
  (return trigger), `bb-instr*.mjs` (getter-never-invoked proof),
  `getter-repro{,2,3,4,5}.mjs` (the table above), `dump-lit.mjs` + `lit.wat` (the
  dropped-write WAT), `nm-diff.mjs` (edge.js still throws; background.js stays
  equal).
- Verified after #2836 on compiled acorn@8.16.0, 2026-06-29 (sendev round 4).
