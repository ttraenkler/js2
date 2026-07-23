---
id: 3544
title: "standalone: dynamic `.call`/`.apply` on callable values silently answers undefined — gates the entire builtin receiver-validation cluster (~232 projected #3468-cliff tests)"
status: done
completed: 2026-07-23
assignee: ttraenkler/fable-3544b
created: 2026-07-23
priority: high
feasibility: hard
reasoning_effort: max
task_type: bug
area: codegen
language_feature: function-call, call, apply, dynamic-dispatch
es_edition: es5
goal: standalone
umbrella: 2860
sprint: current
horizon: m
related: [3468, 1596, 3140, 2984, 3537, 3554]
origin: "#3468 cliff clustering (fable-exposed, 2026-07-23): cluster 3 (builtin receiver-validation, 29/458 sampled ≈ 232 projected) concentration scoping — traced to ONE dispatch arm, not 232 per-builtin gaps"
# (#3102) The substrate is the NEW leaf module src/codegen/fn-call-dispatch.ts;
# these god-file touches are the unavoidable arm/wiring minimum (mirrors the
# #3537 grant): the arm call-site swap in object-runtime.ts, the reserved-flag
# ctx field in context/types.ts, and the finalize fill calls in index.ts.
loc-budget-allow:
  - src/codegen/object-runtime.ts
  - src/codegen/context/types.ts
  - src/codegen/index.ts
---

# #3544 — dynamic `.call`/`.apply` on callables answers undefined (standalone)

## Traced mechanism (WAT-verified 2026-07-23, exact chain)

`var s = String.prototype.slice; s.call(undefined, 0)` compiles to:

1. `__call_m_call_2(s, thisArg, box(0))` — builds key `"call"` + an `$ObjVec`
   argvec `[thisArg, arg0]` — then
2. `__extern_method_call(s, "call", argvec)` (`src/codegen/object-runtime.ts`
   ~4055). Receiver `s` is a **builtin proto-method closure** (a funcref-wrapper
   struct minted by `ensureStandaloneNativeMethodClosure`,
   `src/codegen/native-proto.ts` ~417 — `$__proto_method_<brand>_slice`), which
   is neither `$Object` nor `$Vec` nor a CAPTURING closure, so the else-arm
   chain (vec → closure-prop-carrier) falls through to **`ref.null.extern` —
   silent undefined. The call never dispatches.**

Probe matrix (r=1 threw ✓spec / r=3 silent no-throw ✗):
`String.slice/concat .call(undefined)` ✗ · `Uint8Array.filter.call({})` ✗ ·
`ArrayBuffer.slice.call({})` ✗ · `Promise.resolve.call(undefined)` ✗ ·
`Date.setTime.call({})` ✓ (Date routes elsewhere — statically resolved).

## Why ONE fix covers the cluster

The minted closures ALREADY have TypeError-bearing bodies: wired members carry
real receiver checks, un-wired members carry the #2984 refusal body
(`"<Builtin>.prototype.<m> is not yet implemented in --target standalone"` — a
REAL catchable TypeError). The cluster-3 tests assert only the CONSTRUCTOR
(`assert.throws(TypeError, () => m.call(badReceiver))`), so **dispatching the
call is sufficient to flip them — wired or refusal alike**. The gap is purely
the `.call`/`.apply` routing arm in `__extern_method_call`, not 232 per-builtin
receiver checks. (Harness `assert.throws` ctor-identity for a thrown TypeError
verified working — probe3, 2026-07-23.)

## Fix sketch (slice 1: `.call`)

In `__extern_method_call`'s else-arm chain (COMPOSED like #3537 — do not edit
closure-props.ts): a new leading arm
`if (name == "call" && __is_callable(recv)) → __dispatch_fn_call(recv, argvec)`:

- `__is_callable` — the #3140 `buildClosureRefTestArms` callable-gate
  classification already enumerates every funcref-wrapper struct (it powers
  `__bind_dyn`); reuse it.
- `__dispatch_fn_call(recv, argvec)` — thisArg = argvec[0], rest = argvec[1..]
  re-pushed into a fresh `$ObjVec`, then `__apply_closure(recv, thisArg, rest)`.
  Native-string compare for the `"call"` key via the `fillBuiltinFnMeta`
  classify pattern (same as #3537's "length" refusal).
- Arm ORDER: before the closure-prop-carrier arm (a capturing closure's
  `f.call(x)` must invoke `f`, not consult its expando bag; an own expando
  literally named "call" is pathological and broken today anyway).
- `.apply` = follow-on slice (needs array-arg spreading; check what the
  DONE #1596 static path already has as helpers).

## ⚠ Measured-floor HAZARD — must be quantified before PR (do NOT skip)

Dispatching makes the #2984 **refusal-stub bodies reachable**: today
`m.call(x)` on an un-wired member silently answers undefined; after the fix it
THROWS the refusal TypeError. That is spec-directionally better (fail-loud) and
flips the cluster-3 assert.throws tests green, but any today-passing standalone
test that _tolerates_ the silent undefined would flip pass→fail at module init.
The #2984 comment explicitly measured this class of regression once before
(`hasOwnProperty.call` idioms rely on the null-return fall-through of
`emitReflectiveNativeProtoClosureCall` — note that is a DIFFERENT, static
route; verify it stays untouched). Validation protocol (the #3537 template):

1. stride-8 floor run (main vs main+fix) — regressions MUST be ~0; every
   regression individually triaged (a refusal-throw regression means the
   member needs a real wired body or the arm needs a narrower gate);
2. re-run the 458 #3468-cliff sample on routing-harness ± fix — report
   measured flips ONLY (coordinator directive: a sibling agent's 29% signature
   share measured 2/198 — size on flips, never share);
3. `hasOwnProperty.call` / `propertyIsEnumerable.call` harness idioms explicitly
   re-tested.

## WIP FINDING (2026-07-23, fable-exposed) — prototype built; convention split found

A working prototype of the arm exists on branch **`issue-3544-call-dispatch`**
(pushed to the fork; stacked on `issue-3537-vec-expando-props`; NOT a PR):
`src/codegen/fn-call-dispatch.ts` (reserve/fill: `__fn_call_name_gate`,
`__is_fn_callable`, `__fn_call_invoke`) + arm wiring. Measured behavior:

- `Promise.resolve.call(undefined, 1)` **now throws ✓** — the arm + name gate +
  invoke work end-to-end for static-shape builtin closures.
- `String.prototype.slice.call(undefined, 0)` **still silent ✗** — and the WHY
  is the key discovery: **two calling conventions coexist.**
  - Ordinary user closures: lifted sig `(self, ...args)`; `this` flows via the
    `__current_this` global → `.call(t, a)` must split argvec: thisArg=t,
    rest=[a] → `__apply_closure(m, t, [a])` (what the prototype does).
  - Builtin proto-method closures (`ensureStandaloneNativeMethodClosure`):
    lifted sig `(self, THIS-AS-PARAM, ...args)` — userParams `[this, p0, …]`
    (`native-proto.ts` ~461). `.call(t, a)` must pass the ORIGINAL argvec
    `[t, a]` (this folded as first arg) padded to the member's paramSlots.
    The prototype's uniform split mis-arities these into the wrong
    `__call_fn_method_N` (no matching per-type arm at that N) → silent null →
    the observed undefined. `emitReflectiveNativeProtoClosureCall` (the static
    `hasOwnProperty.call` route) is the existing precedent for the folded
    convention — study it before finishing.
- Also fixed en route: `__is_fn_callable` must use PER-CONCRETE-TYPE arms over
  `ctx.closureInfoByTypeIdx` (the same set `__call_fn_method_N` tests), NOT
  `collectClosureBaseWrapperTypeIdxs` — the base-root walk misses the
  proto-method wrapper structs (measured: gate matched Promise, missed String).

**Next implementer:** distinguish the two conventions inside
`__fn_call_invoke` — e.g. a fill-time `ref.test` chain over the proto-method
wrapper types (they are enumerable at finalize from the funcMap
`__proto_method_*` names / a registry added at mint time) choosing
argvec-as-is + pad vs split; or normalize the convention at mint time. Then
run the pre-authorized measurement (stride-8 floor + full-458 cliff; decision
rule: floor≈0 → ship; material loss → STOP, report per-member).

## Implementation (2026-07-23, fable-3544) — convention discrimination landed

The predecessor's blocker (uniform argvec split mis-arities folded-convention
proto-methods) is resolved inside `fillFnCallDispatch`'s `__fn_call_invoke`
fill (`src/codegen/fn-call-dispatch.ts`), no new modules:

- **WHY a runtime type test and not a mint-time normalization**: the folded
  convention (`(self, THIS-AS-PARAM, ...args)`) is the SAME contract the
  static reflective route already codifies (`emitReflectiveNativeProtoClosureCall`
  and the #2193 PR-B `m.call(t, a)` → `m(t, a)` rewrite keyed on
  `nativeProtoReceiverClosureStructTypes`). Normalizing at mint time would
  change every existing call surface of every proto-method closure (static
  calls, gOPD descriptor `.get` invokes, `__bind_dyn`) for one dynamic route —
  the discrimination belongs at the one place the convention is ambiguous.
- **The discrimination set**: `nativeProtoReceiverClosureStructTypes ∩
builtinFnMetaByTypeIdx` — meta subtypes ONLY. native-proto.ts registers
  BOTH the base signature wrapper and the meta subtype in the receiver set,
  but base wrappers are signature-SHARED with ordinary user closures (#1712:
  capture structs subtype their signature wrapper), so `ref.test`ing a base
  wrapper would mis-fold a user `f.call(x)`. Meta-only stays complete because
  every proto-method VALUE is minted as its unique per-(brand, member) meta
  subtype (factory return type + #2963 singleton materializer).
- **The pad**: folded dispatch passes the ORIGINAL argvec `[t, ...args]`
  padded with undefined to the closure's `paramTypes.length` (this + arg
  slots). `__apply_closure` dispatches on VECTOR LENGTH, and
  `__call_fn_method_N` only carries arms for closures with arity ≤ N — an
  unpadded len-2 vec for a 3-param slice closure lands in
  `__call_fn_method_2` with no matching arm (the measured silent undefined).
  Over-length vecs need no truncation (extras plumbing absorbs them).

Probe matrix after the fix (was: all ✗ silent): `String.slice/concat
.call(undefined)` ✓threw · `Uint8Array.filter.call({})` ✓ ·
`ArrayBuffer.slice.call({})` ✓ · `Promise.resolve.call(undefined)` ✓ ·
`Date.setTime.call({})` ✓ (unchanged) · user-closure
`add.call(undefined, 2, 3) === 5` ✓ (split path intact).

Control probes against the pre-fix compiler surfaced the main-side truth:
dynamic `.call` results USED as strings TRAP uncatchably on main
("dereferencing a null pointer") — the fix converts those to catchable
refusal TypeErrors; `hasOwnProperty.call(o, "x")` answered silently-wrong
`false` for an EXISTING property (only the static syntactic route works).

## Measured validation (2026-07-23, fable-3544b) — the numbers that set the shipped design

All runs: CI-exact worker driver (the m3468 rig), paired against a control
bundle built from the same `origin/main` (a8228d9e) the branch merged.

**1. Floor, EXACT census — not a sample.** Every pass-baseline standalone test
whose source contains `.call` (2,242 files) ran on the full-dispatch fix;
every failure re-ran on the main control (all pass there → true paired
regressions):

- Full dispatch (refusal stubs dispatchable): **22 pass→fail / 2,242**, all
  ONE mechanism (deferred/refusal bodies newly reachable): Array.of 4,
  Array.from 4, Promise.resolve 2, Promise.reject 2, Date.prototype.toJSON 2,
  String.prototype.valueOf 2, Symbol.prototype.valueOf 2,
  WeakRef.prototype.deref 1 (= 19 "not yet implemented" refusal stubs), plus
  3 tests where `new Function("...").call(...)` now dispatches into the
  deferred dynamic-code-eval throw (13.2-8-s, 13.2-16-s, S15.3.4.4_A6_T4 —
  honest fail-loud). Net −22 < the −15 merge_group tolerance → unshippable.
- Independent cross-check: whole-floor stride-8 run (3,582 tests, all
  categories): 6/3,582 regressions, same mechanism only — no unrelated
  breakage from the arm/reserve plumbing.
- **Improvements in CI config: 0 / 1,820 fail-baseline `.call` candidates.**

**2. Truth-harness cliff (458-file #3468 sample, harness-main vs harness-fix):
+14 / −0.** Wins: String slice/concat/search/localeCompare
this-value-not-obj-coercible, the #3250 refusal getters (ArrayBuffer.detached
/maxByteLength, %TypedArray%.buffer, SAB.maxByteLength), RegExp compile,
DisposableStack×3, Promise.resolve context, Array.of return-abrupt.

**3. Key discovery revising the fix-sketch assumption:** `String.prototype
.slice`/`concat`/… as VALUES are themselves #2984 refusal stubs (WAT-verified:
the "receiver check" TypeError the cluster tests catch is the refusal throw —
right constructor, honest error, un-wired body). So a blanket
"exclude-all-refusal-stubs" gate would forfeit most of the cliff wins.
**Shipped design: CURATED narrow gate** — exactly the 8 census members above
are excluded from `__is_fn_callable` (mint-time registration →
`ctx.fnCallRefusalMetaTypeIdxs`; lists + removal condition in
`src/codegen/fn-call-dispatch.ts`). Everything else — wired members, all
other refusal stubs, all refusal getters, user closures — dispatches.
Expected curated floor cost: only the 3 eval-class tests.

**4. Curated variant re-measurement (the shipped configuration) — prediction
matched exactly:**

- Floor census (same 4,062 candidates): **3 pass→fail / 2,242** — precisely
  the 3 eval-class tests (honest fail-loud; `new Function` closures must not
  silently no-op on `.call`), **0 refusal-member regressions**, 0
  improvements. CI-visible net = **−3**, well inside the −15 merge_group
  tolerance.
- Truth-harness cliff (458): **+12 / −0** (vs +14 for full dispatch — the
  delta is exactly the two curated-member wins forfeited: Promise.resolve
  context-non-object, Array.of return-abrupt). Wins kept: String
  slice/concat/search/localeCompare receiver checks, RegExp compile, the
  #3250 refusal getters (ArrayBuffer.detached/maxByteLength, SAB
  .maxByteLength, %TypedArray%.buffer), DisposableStack/AsyncDisposableStack
  use/adopt/defer.

## ⚠ SYSTEMIC FINDING — the CI floor metric CANNOT see this class of improvement (#3468)

The fix's wins and losses are asymmetrically visible to CI, and the asymmetry
is a measurement defect, not a property of the fix:

- The ~232-test receiver-validation cluster asserts via
  `assert.throws(TypeError, () => m.call(bad))`. Under the #3468 vacuity
  (standalone function objects cannot carry own props → `assert.*` methods are
  never invoked → the callback never runs), those tests ALREADY "pass"
  vacuously on main. Fixing dispatch converts them from vacuous-pass to REAL
  pass — **a truth gain the CI pass-count records as zero change** (measured:
  0 CI-visible improvements across all 1,820 fail-baseline `.call`
  candidates; +14 real wins visible only under the truth harness).
- Meanwhile the ONLY CI-visible effect of dispatching is the loss side: a
  module-init throw is the one thing that can flip a vacuous floor test to
  fail (the 19 refusal regressions).

So for any fix in this family, the merge_group floor gate scores truth work
as pure regression. This is an independent, quantified argument for
prioritising the #3468 observability program: until assert.\* actually runs
in standalone, the standalone conformance number cannot credit
receiver-validation/error-semantics work at all. (Cross-referenced in the
#3468 issue family; surfaced to the stakeholder by the tech lead
2026-07-23.)

## Completion (2026-07-23, fable-3544b) — shipped scope + what remains

**Shipped**: the `.call` dispatch arm with convention discrimination (SPLIT
user closures / FOLDED proto-methods) and the CURATED narrow gate. Tests:
`tests/issue-3544.test.ts` (8, incl. the deferral-pin). Measured: floor −3
(eval-class only, honest fail-loud, inside tolerance) / truth cliff +12/−0.

**Remaining, tracked**:

- **Wire-first for the 8 curated members** → #3554 (per-member slice PRs;
  each wiring deletes its member from the gate list = automatic widening).
- **`.apply` dispatch** — follow-on slice (array-argument spreading through
  the same `__fn_call_invoke` shape); NOT yet implemented, `m.apply(...)`
  still silently answers undefined on the dynamic path. Needs its own issue
  id (allocator was contended at completion time — flagged to the tech lead
  in the completion report; do not lose this).
- **Gate removal** — conditional on the #3468 observability program; see the
  REMOVAL CONDITION in `src/codegen/fn-call-dispatch.ts`.

## Measurement infrastructure (reusable, in the fable-exposed worktree)

`/workspace/.claude/worktrees/agent-a5ae601287feed137/.tmp/m3468/`:
`driver.mts` (CI-exact worker-pool runner), `extract.mts` (deferTopLevelInit
payload extractor), `measure-all.sh` (4-phase template), bundles under
`bundles/{main2,fix,harness2,harnessfix}`, sample lists
(`sample-stride8.txt`, `regressed.txt`), and branch `tmp-harness2` /
`tmp-harnessfix` (origin/main ± routing-revert cherry-pick 5a71adf7c4eee3 +
compat shim) for cliff re-measurement.
