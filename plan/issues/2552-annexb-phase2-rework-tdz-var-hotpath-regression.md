---
id: 2552
title: "Annex B B.3.3 Phase 2 rework — TDZ-var outer-binding allocation perturbs hot-path codegen (-1180 test262 regression)"
status: in-progress
sprint: 64
created: 2026-06-19
assignee: ttraenkler/sendev-funcidx
priority: medium
feasibility: hard
reasoning_effort: max
task_type: bugfix
area: codegen
language_feature: annex-b, block-functions
goal: es5
parent: 2200
related: [2200, 1764]
origin: "2026-06-19 — #2200 Phase 2 (PR #1769) failed the full test262-regression gate -1180; parked Phase-1-only. This is the rework follow-up."
---

# #2552 — Annex B Phase 2 rework: TDZ-var allocation perturbs hot-path codegen

> **ID note (2026-06-20):** originally drafted as `#2514`, which collided with
> the already-on-main `#2514` (runtime-helpers-as-shared-linkable-module).
> Renumbered to `#2552` via the atomic allocator (`claim-issue.mjs --allocate`).

## Context

#2200 Phase 1 (#1764, ~93-test floor: case-A cancellation) is **merged and stands
alone**. Phase 2 (case-B uninitialised-then-init outer var-binding + `typeof`
resolution) was implemented on branch `issue-2200-annexb-phase2` (PR #1769) but
the **full CI test262-regression gate flagged -1180 net pass (1411 regressions,
231 improvements)** — so Phase 2 is parked (PR #1769 → draft) pending this rework.

## The regression (gate bucket output, signature `d57ce880bc38ea96`)

- categories: `wasm_compile: 625`, `null_deref: 593`, `type_error: 143`, other 41.
- top buckets (each >50): `Array/prototype/{some 115, every 113, filter 109,
  map 93, forEach 86, reduceRight 69, reduce 58}`,
  `language/statements/{function/dstr 88, generators/dstr 88,
  async-generator/dstr 52}`.

**Confirmed NOT drift:** PR #1767 ran its gate against the SAME fresh baseline
seconds apart and was clean (+21, different signature, 3 files). The -1180 is
specific to #1769's 4-file Phase 2 delta (`context/types.ts`, `statements.ts`,
`nested-declarations.ts`, `typeof-delete.ts`; `array-methods.ts` byte-identical to
main).

## Root cause (hypothesis — needs local-slice confirmation)

The Phase 2 **TDZ-var allocation in `hoistFunctionDeclarations`**
(`src/codegen/statements/nested-declarations.ts`): `annexBBlockNestedEligible`
→ for any block-nested function it does `allocLocal(fctx, funcName, externref)` +
an `__tdz_<name>` i32 flag and records `annexBOuterBindings`. The `null_deref` /
`wasm_compile` categories across hot-path Array methods + `*/dstr` strongly
suggest this **perturbs local-index layout** (or leaves an uninitialised
outer-binding externref local that a shared codegen path reads) for the dominant
test262 harness shape: a function that merely **contains** a block-nested helper
(the Array-method test files wrap assertions + helper fns in blocks). The
gate fails, but it does NOT reproduce in targeted local compiles (standalone OR
host) of realistic shapes — it lives in test262's specific harness/strict-mode
config.

## Rework plan

1. **Reproduce FIRST against a local test262 slice** over the flagged buckets
   (`built-ins/Array/prototype/{some,every,filter,map,forEach,reduce,reduceRight}`
   + `language/statements/{function,generators,async-generator}/dstr`) — do NOT
   attempt a blind patch. Use `pnpm run test:262` scoped to those paths (or the
   runner's category filter) on the `issue-2200-annexb-phase2` branch vs main to
   get the exact failing files + WAT.
2. **Narrow `annexBBlockNestedEligible`** so the outer-binding TDZ-var is
   allocated ONLY when the outer binding is actually OBSERVED (read/typeof'd
   outside the declaring block) — a function that merely *contains* a block-nested
   helper, or whose block-fn name is never referenced at function scope, must be
   byte-identical to pre-Phase-2 codegen (no `allocLocal`, no flag, no
   `annexBOuterBindings` entry). The current gate fires on mere structural
   eligibility, which is too broad.
3. **Preserve the typeof-resolution fix** (`emitAnnexBTypeofFlagBranch` invoked at
   the top of the undeclared-identifier branch in `typeof-delete.ts`) — it is
   correct and reusable; the bug is in the allocation breadth, not the typeof
   read.
4. **Re-validate against the FULL gate** (not just local unit tests) before
   re-opening #1769 / a fresh PR — the local Phase-2/typeof/scope tests passed
   while the broad gate caught the regression, so a local-slice + full-gate
   re-run is mandatory.

## WIP / branch

`issue-2200-annexb-phase2` (PR #1769, draft). Phase 2 plumbing + the correct
typeof fix + the full regression diagnosis live there. Phase 1 floor is on main
(#1764).

## Acceptance criteria

- The case-B behaviours work (TDZ binding / value / in-block call / if-skip /
  `typeof` after-block→"function", before/skip→"undefined") — i.e. the Phase 2
  unit tests pass.
- The full test262-regression gate is **net ≥ 0** with no bucket >50 and ratio
  <10% (no Array/prototype/* or */dstr regression).
- `#2200` can then close (both phases complete).

## Resolution (2026-06-21, sendev-funcidx)

Reintroduced the reverted Phase-2 source (the inverse of revert `925db38df`:
`context/types.ts` `annexBOuterBindings`, `statements.ts` decl-site init,
`nested-declarations.ts` eligibility+alloc, `typeof-delete.ts`
`emitAnnexBTypeofFlagBranch`) onto current upstream/main, then **narrowed the
allocation breadth** — the single root cause of the -1180.

**The narrowing.** `annexBBlockNestedEligible` (nested-declarations.ts) now
additionally requires `annexBNameObservedOutsideBlock(name, block)`: the
block-fn's name must be referenced as a value (read / `typeof` / call / arg —
`isAnnexBValueReference`) somewhere in the enclosing Annex-B scope OUTSIDE its
declaring block. The scan walks the enclosing function/SourceFile body, skips the
declaring block and any nested function scope, and excludes property/declaration/
label names. When the name is NOT observed outside its block — the dominant
test262 harness shape (a function that merely *contains* block-nested helpers) —
NO outer-binding local, NO `__tdz_` flag, and NO `annexBOuterBindings` entry are
emitted, so codegen is byte-identical to pre-Phase-2. The case-B lifecycle is
implemented exactly where it is observable.

**Byte-identity verified** (compile-and-hash, my branch vs clean upstream/main):
single-helper, multi-helper, dstr-style, nested-block, and a realistic
Array.prototype verifyProperty-style harness (multiple block-nested helpers used
only within their blocks) — ALL produce identical binaries. This is the direct
evidence the -1180 hot-path perturbation does not recur.

**Case-B behaviours verified** (`tests/issue-2552-annexb-phase2.test.ts`, 10
cases): `typeof F` after-block→"function", skip/before→"undefined", `F()` after
block→value, unobserved-helper still callable in-block, undeclared→"undefined",
normal fn-body decl→"function", numeric local→"number", and case-A cancellation
(let-shadow → ReferenceError) intact. `typecheck` + `format:check` + `lint` +
`check:stack-balance` + `check:issues` clean.

Pre-existing failures `tests/finally-block.test.ts` (5) and
`tests/issue-1712-capture-closure-dispatch.test.ts` (1) reproduce identically on
clean upstream/main — NOT regressions.

**Full-gate is the final arbiter** (the -1180 could not be pre-validated locally;
byte-identity on the flagged shapes is the local proxy). On the gate landing
net ≥ 0, `#2200` closes (both phases complete).

## Merge_group result + diagnosis (2026-06-21, sendev-funcidx review)

PR #1817 was un-held and enqueued once (GraphQL `enqueuePullRequest`, user PAT)
to let the merge_group test262 gate arbitrate. It **EJECTED** on the
`check for test262 regressions` job (runs 27901419024 + 27901413332, both
completed/failure). The hold was re-applied; **not re-enqueued** (one-shot rule;
auto-enqueue backstop owns re-adds).

**The narrowing WORKED — the -1180 is gone.** Gate output:
`net -10` (32920→32910 pass), **regression bucket signature `a0df2c22d5af927e`,
10 non-CT files, 0 improvements**, ratio ∞ (10/0). The gate fails purely on
`net < 0` / ratio ≥ 10 %, NOT on the old hot-path buckets. There is **zero**
`Array/prototype/*` or `*/dstr` regression. Independent byte-identity (7
unobserved harness shapes, hash-identical PR-HEAD vs merge-base `1f88850a`) is
confirmed sound.

**All 10 regressed files are the Annex B feature's OWN observed-case path**
(diffed merged-report jsonl vs baseline):

- 8× `test/annexB/language/function-code/*-func-existing-block-fn-no-init.js`
  (`block-decl`, `if-decl-else-decl-a/b`, `if-decl-else-stmt`,
  `if-decl-no-else`, `if-stmt-else-decl`, `switch-case`, `switch-dflt`):
  error **`f is not defined`** (error_category `other`).
- 2× `*-block-scoping.js` (`block-decl-func-block-scoping`,
  `block-decl-global-block-scoping`): `initialBV()`/value assertions
  (`assertion_fail`).

**Root cause (confirmed by local repro on the PR branch).** Phase 2 wires the
`annexBOuterBindings` outer-binding local for exactly TWO consumers — the
decl-site init (`statements.ts`) and `typeof F` (`typeof-delete.ts`). A **bare
value READ** of an observed Annex B name is NOT wired to the synthetic externref
outer-binding local. So for the `no-init` shape:

```js
(function () {
  init = f;            // observed READ before block → resolves via the normal
                       // identifier path, which does NOT find the synthetic
                       // outer-binding local → "f is not defined"
  { function f() {} }
  { function f() {} }
}());
assert.sameValue(init, undefined);   // spec: binding EXISTS, uninitialised → undefined
```

Local repro on `99cf4c0a1`: `init = f` before the block throws **`f is not
defined`** (should yield `undefined` — the var binding exists, just
uninitialised, so a read is NOT a ReferenceError). `typeof f` works (it's wired);
a *call* `f()` after the block works (resolves via `funcMap`); but a bare
read/assignment-read and the mutable-binding read/`f = 123` value semantics
(`block-scoping`: `initialBV()`/`currentBV`) are unwired.

**The -10 FIX (2026-06-21, sendev-funcidx — three coordinated changes).**

1. **Bare value-read interception** (`identifiers.ts`, in `compileIdentifier`,
   BEFORE the generic localMap/`tdzFlagLocals` path). A bare read of an
   `annexBOuterBindings` name now emits a flag-gated read: flag 1 ⇒ the
   outer-binding externref local; flag 0 ⇒ `emitUndefined(...)`. Crucially this
   yields `undefined` — NOT a ReferenceError — because the var-style binding
   EXISTS. The previous behaviour reused the shared let/const `tdzFlagLocals`
   path, so a textually-before read hit `emitStaticTdzThrow` → "f is not defined"
   (the 8 `*-no-init` files). `undefined` is materialised into the MAIN body
   first (late-import-shift-safe), stashed, then `select`ed on the flag — same
   pattern as `emitAnnexBTypeofFlagBranch`. Gated on the normally-empty
   `annexBOuterBindings` set → byte-identical for every other read.

2. **Mutable-binding exclusion** (`annexBNameReassignedInBlock`,
   nested-declarations.ts). The 2 `*-block-scoping` files use
   `{ function f() { f = 123; … } }` — the in-block reassignment splits the
   block-local binding from the outer var binding (per §B.3.3 the outer binding
   captured the function at block entry and is independent of the later mutation).
   The single-slot flag-gated machinery can't model that split, so a name
   reassigned anywhere in its declaring block subtree is excluded from the outer
   binding and reverts to the (passing) pre-Phase-2 path.

3. **Existing-`var` exclusion** (`annexBSameNameVarIn­Scope`,
   nested-declarations.ts). Per §B.3.3 step 2 ("If instantiatedVarNames does not
   contain F"), a same-named `var F` already in the enclosing function/global
   scope means NO fresh outer binding — the function uses the existing var. The
   existing var may be a non-externref slot (e.g. an f64 number, as in
   `block-decl-func-existing-var-no-init`: `var f = 123`); allocating an externref
   outer binding on top desyncs the type and the new read path emits
   `expected externref, got f64`. This was a regression my read-interception
   newly EXPOSED (the file was `pass` on PR-HEAD because nothing consumed the
   stray binding); the var-scan eligibility exclusion is order-independent and
   restores it.

**Validation (all local, on the fixed branch).**
- **All 10 merge_group-regressed files now PASS** (`runTest262File`): the 8
  `*-no-init` + 2 `*-block-scoping`.
- **Whole-tree no-regression**: `annexB/language/{function,global}-code` swept
  (312 files) on the fixed branch vs the pre-Phase-2 merge-base — **104/312 on
  both, ZERO new failures, zero recoveries** (i.e. exact base-parity; Phase-2
  now adds the case-B feature with no collateral). The `var-no-init` file the
  read-path first broke is included and passes.
- **Byte-identity intact**: all 7 unobserved harness shapes still hash-identical
  to the merge-base — the -1180 fix is undisturbed (the three new gates only make
  eligibility STRICTER; the read interception is `annexBOuterBindings`-gated).
- **Unit tests**: `tests/issue-2552-annexb-phase2.test.ts` now 13/13 (added
  bare-read-before-block→undefined, read-after→function, reassigned-in-block
  in-block-use). `typecheck` + `format:check` + `lint`(changed files) +
  `check:stack-balance` clean.

Expected merge_group delta: the -10 recovered, no new regressions → **net ≥ 0**.
On landing, `#2200` closes (both Annex B phases complete).

## Status reconciliation (2026-07-26, opus-loop-e)

**All of the above LANDED.** Verified on current `main`: `annexBNameObservedOutsideBlock`,
`annexBNameReassignedInBlock`, `annexBSameNameVarInScope` (all in
`nested-declarations.ts`), `annexBOuterBindings` in `context/types.ts` /
`statements.ts` / `typeof-delete.ts`, **and** the bare-value-read interception in
`expressions/identifiers.ts`. The abandoned branch
`issue-2552-annexb-phase2-tdz-narrow` has exactly one unique commit (`99843727b`,
the −10 fix) and it is **redundant with main** — nothing to cherry-pick. The
`in-progress` frontmatter was stale, not a signal of remaining work.

**The residual 204 failures are a DIFFERENT mechanism** (see below), not this
issue's hot-path regression.

## ⚠️ METHOD — read this before writing a line of code here

**The negative-control requirement is not boilerplate. It caught a fix that did
nothing, in this exact area, on 2026-07-26.**

The same swallowed-exception / no-op failure mode appeared at **three levels in a
single session**, and in every case the *only* thing that caught it was a control
that **must** report failure:

1. **The #3626 census's own probe** recorded "delete of non-configurable
   succeeds" for 22 tests. The `delete` actually *throws*, so the expression it
   read was never evaluated — it measured the throw and reported a defect that
   does not exist (see #3626 §2.2.1).
2. **Two ad-hoc probes** in the same session reported clean results that were
   artifacts — one from `String(boolean)` silently yielding `"0"`, one from an
   unrelated `typeof e` construct producing "invalid wasm".
3. **A fix in THIS issue's area changed nothing at all.** A step-ii exclusion was
   added to the `annexBBlockNestedEligible` chain; the 7-form × 2-scope matrix
   returned **pass=2 fail=14 with the fix and pass=2 fail=14 with
   `nested-declarations.ts` reverted to `origin/main` — byte-identical.** The two
   that passed were **already passing on the merge base**. A test suite written
   around those two forms would have been green, credible, and worthless.

**Why that fix was a no-op** — and the trap for the next implementer:
`compileNestedFunctionDeclaration` registers the name via
`ctx.funcMap.set(funcName, …)` (`nested-declarations.ts`, the reserved-entry
block) **unconditionally**, independent of every Annex B eligibility decision. A
bare read of `f` resolves through *that* route. **Gating the outer binding cannot
help when the name is reachable by a second, unconditional path.** This is the
third instance of one architectural shape in the codebase — the descriptor
two-store bug (#739), the vec-mirror/`__vec_len` dual route, and this one — so
state it as a standing hazard:

> **When a fix gates a write/registration path, check whether a second path can
> still satisfy the read. A gate is only as good as the completeness of the
> routes it covers.**

**Required checks for any change here:**
- Run the **7 early-err forms × 2 scopes** (`early-err`, `-block`, `-for`,
  `-for-in`, `-for-of`, `-switch`, `-try`; function-code + global-code) and
  confirm they are **red on the merge base** before claiming anything.
- **Re-run the identical matrix with the fix AND with the file reverted to
  `origin/main`, and diff the two.** Byte-identical output is what exposed the
  no-op; make this the standard check, not a one-off.
- Keep the **24 `existing-global*`** failures **unmoved** — they are a separate
  mechanism (`missing_builtin: null is not a function [in __module_init()]`),
  not step ii.
- **Do not run a CPU-heavy job (e.g. `tsc --noEmit`) concurrently with the
  matrix** — it induces `compilation timeout` results that look like
  regressions. One contaminated run already had to be discarded.
- `early-err` (the base form) is **not** a step-ii test: it asserts
  `init === 123` / `after === 123` against a function-scope `let f`, and passes
  for unrelated reasons. Do not read it as evidence either way.

## The real residual mechanism (2026-07-26 measurement)

Measured from the fresh baseline jsonl, corpus-wide:

| bucket | tests | fail | distinct signatures |
| --- | --- | --- | --- |
| `annexB/language/function-code` | 159 | 93 | 12 |
| `annexB/language/global-code` | 153 | 111 | 9 |
| **combined** | **312** | **204** | **21** |

- **96** (48 + 48) — *"An initialized binding is not created prior to evaluation —
  Expected a ReferenceError, none thrown"*. **This is Annex B B.3.3.1 step ii**:
  the "would replacing the FunctionDeclaration with a `var` produce an Early
  Error?" exclusion, which is not implemented. When it would, the extension is
  **not observed** — no binding is created and a function-scope read of `F` must
  throw. Canonical: `for (let f in {key:0}) { if (true) function f(){} }`.
- **24** — `missing_builtin: null is not a function [in __module_init()]`,
  `global-code`/`existing-global*` only. **Different mechanism**, do not conflate.
- remaining **~84** across 19 signatures.

So **"204 failures, one mechanism" is wrong — the mechanism is 96/204 (47 %)**,
which is still the best-concentrated currently-actionable ES5 lever measured.

**What varies inside the 96** (checked before counting it as one): it is one rule
over **7 syntactic forms × 8 block templates × 2 scopes**. One *rule*, seven
*cases* — the scope walk has to locate a colliding lexical binding in seven
structurally different hosts (sibling `let` in a block, `for(let f;;)`, for-in and
for-of heads, a `switch` case clause, a **destructuring** `catch ({ f })`, and the
base form). Size any claim off a re-run, never off 96.

**A THIRD finding — why routing step ii into the cancel path ALSO fails**
(2026-07-26, measured). After normalising the B.3.4 implicit block and calling the
step-ii predicate from `annexBHoistCancels` (so the *cancellation* machinery, not
the eligibility chain, owns it), the 14 step-ii cases **still fail identically**.
Reason: `fctx.annexBCancelled` is **function-context-local**, but every one of
these tests performs the observing read from inside a *nested* function —

```js
assert.throws(ReferenceError, function() { f; }, '…');
```

That inner arrow/function compiles in a **different `FunctionContext`**, which has
no `annexBCancelled` entry, while `ctx.funcMap` is **module-global**. So the read
resolves through funcMap and no ReferenceError is raised. **Both** existing Annex B
mechanisms are function-local; the route that actually answers the read is global.
A working fix therefore needs the cancellation/step-ii state to be visible to
nested contexts (or the funcMap registration itself to be suppressed for
step-ii-excluded names) — not another gate in a function-local table.

Three attempts, all measured, all negative: (1) eligibility-chain exclusion —
byte-identical no-op; (2) cancel-path + B.3.4 implicit-block normalisation — no
change; (3) both together — no change. None were committed to `src/`. Treat this
as evidence the fix must be **cross-context**, and start there.

**A second finding that blocks the whole family** (2026-07-26): for the
`if-decl-*` / `if-stmt-else-decl` templates — most of the generated corpus — the
declaration is `if (true) function f() {}`, so the parser gives it an
**IfStatement** parent, not a Block. Both `annexBHoistCancels` and
`annexBBlockNestedEligible` open with `if (!ts.isBlock(block)) return null`, so
**neither Annex B path runs at all** for that entire family. Annex B **B.3.4**
treats an if-clause FunctionDeclaration as implicitly block-wrapped; that implicit
block has to be normalised before any step-ii logic can even be reached.
