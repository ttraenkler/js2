---
id: 3630
title: "Runtime eval: compile the string via acorn + IR→codegen (no TS parser/checker), linked as a separate module"
status: backlog
created: 2026-07-25
priority: low
horizon: xl
feasibility: hard
area: codegen, runtime
goal: es5-complete
related: [1006, 1054, 1066, 1073, 1102, 2927, 2928, 3631, 3632, 3633]
blocked-by: [1066]
---

# #3630 — runtime eval compilation via acorn + IR→codegen

**Deliberately last of three.** This is the most expensive way to support `eval`
and it must not be started before the two cheaper phases have landed. Filed to
capture the design, not to schedule it.

## Phase ordering (stakeholder-set, 2026-07-25)

1. **Static / ahead-of-time eval compilation — #1102: already `done`** (landed
   2026-07-16, PR #3113). Eval strings that are compile-time constants are
   compiled at build time, by `tryStaticEvalInline` in
   `src/codegen/expressions/eval-inline.ts`. No runtime compiler, no linking,
   no scope marshalling. This phase is **not pending** — it shipped, and the
   `blocked-by` entry for #1102 has been removed accordingly.

   Its measured reach was established by the #3631 partition (2026-07-25,
   baselines fetched 18:21). Of the 484 not-passing ES5 eval-dependent tests in
   the host lane, **~475 already carry a constant eval argument that the folder
   reaches**. So the AOT phase is close to saturated on the constant surface,
   and the earlier expectation that it "likely covers the majority of the 512
   failures" did not hold in the way it was meant: the folder _reaches_ them and
   then declines 380 of them on purpose (the `funcDeclNeedsDynamicEvalPath`
   AnnexB B.3.3 guard), routing to the dynamic host path. Those 380 are
   #2200/#2552's work, not eval's. The residual eval-shaped defects are #3631
   (completion value), #3632 (Script early errors) and #3633 (module bindings
   invisible to `__extern_eval`).

2. **Dynamic eval via the interpreter — #1066, #2927/#2928.** An interpreter
   over the acorn AST. No codegen, no module instantiation, no host linking,
   and no marshalling of scope across a module boundary — it runs in-process
   and reads the reified scope object directly.
3. **THIS ISSUE — compile dynamic eval.** Only after (1) and (2). Its only
   advantage over (2) is _execution speed_ of eval'd code, which is irrelevant
   for conformance. Do not start it for conformance reasons alone.

## The idea

Compile the eval'd string at runtime and link the result as a separate Wasm
module. The payload is kept small by dropping the front end:

```
eval string -> acorn (already being dogfooded, #2927) -> AST
            -> IR builder in ALL-DYNAMIC mode  (no type checker)
            -> codegen -> wasm bytes -> host instantiate -> funcref
```

**Why the checker can be dropped:** the type oracle is an _optimiser_, not a
correctness requirement. Eval'd code can be compiled fully dynamic (everything
boxed / `any`); the oracle exists to avoid that path when it can prove better.
Slower but correct is free for conformance.

**Why the TypeScript parser can be dropped:** eval strings are _JavaScript_, not
TypeScript. No annotations to parse. acorn is the right parser and is already
being compiled to Wasm.

So the runtime payload collapses from _TS parser + checker + IR + codegen_ to
**acorn + IR builder + codegen**.

## Two hard constraints

**1. Core Wasm has no runtime module-instantiation primitive.** A Wasm module
cannot instantiate another Wasm module by itself. This step MUST be a host
import. Model it on the `WebAssembly` JS API so a JS host satisfies it natively
and a standalone runtime (Wasmtime et al.) can satisfy it via its embedding API.

**Design refinement — do NOT model the general API.** `instantiate(module,
importObject)` requires constructing an arbitrary import object from inside
Wasm. Eval needs exactly one thing passed in (a reference to the reified scope),
so specialise: `eval_instantiate(source, scopeRef) -> funcref`. No import-object
machinery.

**2. Wasm locals are not addressable**, so a separate module cannot see the
caller's scope as compiled today. Any function containing a **direct** `eval`
must have its bindings spilled into a heap-allocated environment record instead
of Wasm locals — the same deoptimisation production JS engines apply. This also
solves write-back: sloppy-mode direct eval can introduce `var`/function bindings
into the _caller's_ variable environment, which is impossible against Wasm
locals and trivial against a reified environment object.

Cost falls on the **caller**, not the eval: a function containing direct eval
pays reification even if eval never runs. Mitigated because direct eval is
syntactically detectable (the identifier must appear in call position), and
**indirect eval** (`(0,eval)(s)`) sees only the global scope and needs no
reification at all.

## Consequence for the standalone metric — decide deliberately

The standalone conformance number counts **host-free** passes. If eval is
satisfied by host imports, those tests stop being host-free, so this path lifts
the **host and WASI** lanes and leaves the standalone floor unchanged. This and
the interpreter are therefore **complementary, not alternatives**: this gets
Wasmtime deployments working; only the interpreter moves the standalone number.

## Bonus that may justify the IR work regardless

If the IR is defined as a **stable serialised form**, the same representation
serves both the ahead-of-time case (#1102) and the runtime case — one format,
both paths.

## MEASURED (2026-07-25, #3631) — and it very nearly retires this issue

The partition this section demanded now exists. Population: ES5-classified
(post-#3626 classifier), eval-dependent under the exactly-specified rule
`*/eval-code/` ∪ `built-ins/eval` ∪ source matches `/eval\(/` — **775 tests, 484
not passing** in the host lane. (The #3626 census's 826/512 used a broader
eval-detection regex; `/\beval\b/` gives 913/552. ES5 totals reconcile exactly.)

Dominant eval shape of the 484 failures:

| shape                                 | tests | needs this issue? |
| ------------------------------------- | ----- | ----------------- |
| direct eval, constant string          | 341   | **no** — phase 1  |
| indirect eval, constant string        | 124   | **no** — phase 1  |
| `Function(...)` ctor, constant string | 5     | **no** — phase 1  |
| indirect eval, runtime string         | 11    | no — global scope |
| **direct eval, runtime string**       | **3** | **yes**           |

**Direct eval with a runtime string is 3 of 484 ES5 failures — 0.6 %.** The
expectation that (1)+(2) dominate is confirmed, and far more strongly than
anticipated. This issue's conformance value in the ES5 bucket is ~3 tests.
Keep it `backlog`/`low`; it exists to capture the design, exactly as filed.

What the 484 actually are:

| bucket                                                          | tests   | owner                                       |
| --------------------------------------------------------------- | ------- | ------------------------------------------- |
| `annexB/language/eval-code/*` — AnnexB B.3.3 in an eval wrapper | **380** | #2200 / #2552 (+ #3633 unmasks 184 of them) |
| eval Script early errors not enforced by the splice             | 16      | #3632                                       |
| eval completion value                                           | 7       | #3631                                       |
| `with` inside eval                                              | ~9      | #671                                        |
| compound-assignment evaluation order                            | ~11     | #2666                                       |
| missing `String.prototype` generic receivers                    | ~2      | #2742                                       |
| remainder (diffuse: `this` in eval, codegen crashes, …)         | ~59     | various                                     |

Lane caveat, and it is the one thing that could still justify runtime-eval work:
in the **standalone** lane a folder bail is fatal rather than harmless. 149
eval-dependent ES5 tests pass in host and fail standalone, 110 of them with
literally `dynamic eval is not supported in standalone mode`. That cost belongs
to **#1066** (the remaining `blocked-by`), not to this issue — the interpreter
is the cheaper answer there, as the phase ordering above already says.

## Context

ES5 conformance caps at **8,419/8,931 = 94%** until real eval lands (#3626).
CLAUDE.md's old claim that eval is skip-filtered was **stale** — those tests run
and are counted (corrected in the same change as this filing).
