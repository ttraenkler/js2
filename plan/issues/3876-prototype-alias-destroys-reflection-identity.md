---
id: 3876
slug: prototype-alias-destroys-reflection-identity
title: "Aliasing a built-in prototype through a local binding destroys its reflection identity"
status: ready
created: 2026-07-31
updated: 2026-07-31
priority: high
horizon: m
feasibility: medium
reasoning_effort: high
task_type: bugfix
area: reflection, object-model
language_feature: property-reflection
goal: standalone-mode
sprint: current
es_edition: es5
related: [1781, 3254]
---

# #3876 — `var P = X.prototype` destroys reflection identity

## Problem

Binding a built-in prototype to a local variable before reflecting on it
returns a different (wrong) answer than reflecting on it inline. Same object,
same property; the only difference is whether the receiver went through a local
binding.

**Affects BOTH lanes** — this is not standalone-only.

## Measured (2026-07-31, `origin/main` `af7d6f87`)

Apparatus: bare `compile(src, {target})` + `buildImports`, **no test262
frontmatter and no harness assembly**, so no test-harness code is in the
measurement path. Probe: `.tmp/reconcile4.mts`.

```
                                                      host   standalone
INLINE gOPD(RegExp.prototype,'global')                1      1
VAR    P=RegExp.prototype; gOPD(P,'global')           1      0   <- DIFF
INLINE gOPD(RegExp.prototype,'exec')                  1      1
VAR    P=RegExp.prototype; gOPD(P,'exec')             1      0   <- DIFF
INLINE RegExp.prototype.hasOwnProperty('exec')        1      0
VAR    P=RegExp.prototype; P.hasOwnProperty('exec')   1      0
INLINE Array.prototype.hasOwnProperty('push')         1      1
VAR    P=Array.prototype; P.hasOwnProperty('push')    0      0   <- BOTH LANES
```

The `Array.prototype` row is the clearest case: `hasOwnProperty('push')` is
correct (1) inline on both lanes, and wrong (0) on both lanes once the receiver
is a local binding.

## Why this matters beyond the row count

It is a **measurement hazard as well as a defect**. It silently explains a
harness-vs-bare disagreement that consumed several exchanges between two agents
before it was isolated: one probe used `var P = RegExp.prototype` and the other
used the inline form, and the two apparatuses were blamed before the receiver
shape was.

## Size — measured, not inferred

`dev-es5-coercion` counted the `(var|let|const) X = <Builtin>[.prototype]`
idiom across the full 866-row ES5 standalone wrong-answer cut:
**14 / 866 = 1.6 %**.

- Carry as **~14–25 rows, floor 14**.
- The detector misses aliases via parameter passing, property reads, and
  multi-step assignment, so 14 is a floor, not an exact count.
- An earlier claim by this author that the idiom is "near-universal in
  Sputnik-era tests" was an unmeasured structural inference and is **withdrawn**
  — it was counted and it is 1.6 %.

## Interaction with the lookup-registration fix

The nine `RegExp/prototype/{global,ignoreCase,multiline}` × `{A8,A9,A10}` rows
all open with `var __re = RegExp.prototype;` (e.g. `S15.10.7.2_A8.js`). They
therefore need **both** the lookup-registration fix **and** this one. A
"replicate the `Array.prototype` registration" fix alone will **not** move them,
and would surface as a mystery half-fix after implementation.

By contrast, the ~20 `Object/define*` descriptor rows use
`Object.defineProperty(Array.prototype, …)` **inline** — all 20 verified, 0
aliased. They are unaffected by this issue.

## RETRACTED — the "inline object-literal `gOPD`" defect does not exist

An earlier revision of this issue recorded a second defect: that
`Object.getOwnPropertyDescriptor({a:1},'a')` returns `undefined` on host while
the variable form returns a real descriptor. **That was a bare-`compile()`
measurement artifact, not a defect.** Retracted in full, and recorded here
rather than deleted because the way it was caught is the reusable part.

`dev-es5-coercion` re-ran it under the authoritative harness and it came back
correct. Re-verified independently with controls (below): on host,
`gOPD({a:1},'a') !== undefined` is **true**. There is nothing to fix.

**Why bare `compile()` produced a plausible wrong answer.** It mishandles an
**inline object literal passed directly as an argument** — and it does so
silently, returning a wrong value rather than erroring. The tell is that a
control of the same shape fails identically:

```
                                                  host (bare compile)
Object.keys({a:1,b:2}).length === 2               0    <- CONTROL FAILS
var o={a:1,b:2}; Object.keys(o).length === 2      1    <- CONTROL PASSES
```

Since the control fails in exactly the shape the "defect" was measured in, the
two are indistinguishable and the reading has to be discarded. It is **not** a
blanket under-assembly of `Object.*` statics — the variable form is fine.

**Instrument rule (the durable finding):** for any `Object.*` / `Reflect.*` /
prototype-reflection question, measure through `runTest262File` on both lanes,
and **always include a control that must hold under any spec version** —
`Object.keys({a:1,b:2}).length === 2` is a good cheap one. If the control
fails, discard the run rather than reading the result. Bare `compile()` is
usable for reflection only when no inline object/array literal is passed as an
argument.

Two earlier framings by this author are also withdrawn: "the host lane has
per-route reflection bugs" (wrong axis) and "it is the same receiver-shape axis,
inverted" (wrong — there is no second defect to have an axis).

## Verification under the authoritative harness

`runTest262File(abs, cat, 60000)` and `(…, "standalone")` on the same file,
`.tmp/probe-alias-authoritative.js`. **All four controls pass on both lanes**,
so these readings are load-bearing:

```
CONTROLS  CTRL_keys_inline=true  CTRL_keys_var=true  CTRL_ownkey=true  CTRL_bogus=false   (both lanes)

                        host            standalone
INLINE_arr              true            true
VAR_arr                 FALSE           FALSE      <- the defect, BOTH lanes
INLINE_re_exec          true            false      <- standalone: lookup registration
VAR_re_exec             true            false
INLINE_gopd_re          true            true
VAR_gopd_re             true            FALSE      <- the defect, gOPD, standalone
INLINE_gopd_lit         true            true       <- retracted claim: no defect
VAR_gopd_lit            true            true
```

This **confirms and strengthens** the headline: `Array.prototype` aliasing is
wrong on **both** lanes under the authoritative harness with passing controls,
and the defect also reaches `getOwnPropertyDescriptor` in standalone
(`VAR_gopd_re` false, `INLINE_gopd_re` true).

## Acceptance criteria

- `var P = X.prototype; P.hasOwnProperty(k)` agrees with
  `X.prototype.hasOwnProperty(k)` for every built-in prototype, on both lanes.
- `var P = X.prototype; Object.getOwnPropertyDescriptor(P, k)` agrees with the
  inline form.
- `tests/issue-3876.test.ts` permanently covers inline-vs-variable receiver
  parity for `hasOwnProperty` and `getOwnPropertyDescriptor` across at least
  `Array.prototype` and `RegExp.prototype`, on both lanes.
- Any pass-count claim is re-measured per row rather than read off the baseline.

## Not in scope

- **Lookup registration** — `hasOwnProperty` returns 0 for RegExp/String/Object
  prototypes even inline, while `Array.prototype` returns 1. `Array.prototype`
  is a genuine working reference for that route. Separate issue.
- **Enumeration** — `getOwnPropertyNames().length` is a constant 6 in standalone
  for Array/RegExp/String/Object prototypes vs host 40/15/52/12. Broken for
  `Array.prototype` too, so there is **no** working reference for that route.
  Separate issue, harder.
