# ES2015 standalone: SuperCall after constructor-prototype mutation

2026-10-10; source/spec planning handoff only. **Pending normal numeric issue
allocation, frontmatter, claim, shared-owner agreement, and publication.**
No implementation, instrumented route, conformance gain, or causal regression
attribution is claimed. This file does not authorize a second implementation lane.

## Frozen scope and evidence

- Planner checkout only:
  `/Users/thomas/.codex/worktrees/es2015-fresh-full-census-plan-astra/js2`, detached
  `dbf5b4f74b37d67e525b2af36fd1fe49803b1348`. The three existing plans stay intact.
- Analyzed execution checkout (EXEC):
  `/Users/thomas/Code/js2/.codex-worktrees/6878-delete-result-boolean-sol61`, HEAD
  `38901fff8f9a5ca029cbefcdaec5d8dd40949861`, root source digest
  `a6464ffb87f98d4984d2454a14bc95bd80c035c88e7905bd1465b484537738c8`.
  All source references below are to EXEC, not the older planner source.
- Full original read and SHA independently checked:
  `/Users/thomas/Code/js2/test262/test/language/expressions/super/call-proto-not-ctor.js`,
  SHA-256 `bcac1ca27113185c15387617f6270dd3821c30ecc2b4a91e248bd25410476071`.
  Metadata: feature class, no extra includes, no flags, no negative expectation.
- Root reports a current canonical FAIL: honest 14 / auto / standalone,
  strict both, reached_test true, compile_ms 1768, exec_ms 62. The first assertion
  expected `typeof caught` to be `"object"`, observed `"undefined"`.
  Raw shard-0 stdout line 481 reports callback duration 2012 ms. These are
  separate metrics, not phase attribution; metadata does not prove both variants
  reached every assertion. The subsequent TypeError-identity and evaluatedArg
  assertions are not proven by a failure at the first assertion.
- Original: derived C extends Object; inside its constructor a try/catch wraps
  `super(evaluatedArg = true)` and stores the caught value. After class creation,
  `Object.setPrototypeOf(C, parseInt)` replaces C's constructor-side prototype.
  `new C()` is separately caught/ignored outside. Assertions require an inner
  caught TypeError and argument evaluation. The outer catch deliberately ignores
  the derived uninitialized-this completion; do not weaken the inner assertions.
- Root's exact-path scan found this only in full manifest line 7996, not the
  #6929 focused tests. That does not imply the mechanism is disjoint from #6929.
  Root session `62071` is still live; the source/provenance must remain frozen.

No compiler/parser/Node/tests/types/build/install/format/hooks/profile/process
control, Git mutation, GitHub query, production-source edit, or root write was
performed for this plan. Read-only official specification lookup supports the
ordering contract below. All execution proposed here is deferred to root's later
sole heavy slot, after natural terminal or explicit user-stop authority AND actual
terminal. The full goal remains 11,778 original entries INCLUDING 74 Intl.

## Ordering contract

SuperCall obtains the active function's current constructor-side prototype before
evaluating arguments. It checks that captured value for constructability after
argument evaluation, constructs with the original NewTarget, then binds this.
Therefore changing C's prototype inside an argument must not replace the already
captured super constructor for that call. An argument throw takes precedence over
the later nonconstructor TypeError. A nonconstructor must throw inside the user's
super-call try region; this must not become initialized on failure.
[SuperCall and GetSuperConstructor](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-super-keyword-runtime-semantics-evaluation).

Constructor-side `C.[[Prototype]]` is distinct from `C.prototype`, the instance
prototype. GetSuperConstructor uses the active function object, not the current
value of a mutable source binding named C, and not `this` (still uninitialized).
The check concerns the runtime value's internal constructor capability, not its
name, callable shape, `.prototype` property, or spelling.
[GetSuperConstructor](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-getsuperconstructor).

## Existing ownership and historical findings

- `EXEC/plan/issues/5153-es2015-standalone-super-wave1.md` is in-review and names
  this exact row in cluster C / step D4. Its narrow nonconstructor-global idea
  is a historical proposal, not a current route or ownership clearance.
- `EXEC/plan/issues/6774-es2015-standalone-expressions-residue.md` is in-progress.
  S23 around 1078 names this exact row; the 2026-10-02 record at 1426 explicitly
  says S23 was not attempted. Historical r2 owner label is
  `ttraenkler/opus-6774-r2`. Its proposal reads a per-class global AFTER arguments
  and approximates IsConstructor using callable branding. Do not implement that
  ordering or approximation. Its later statement that no shared constructor
  classifier exists is stale relative to EXEC's reflect-construct-native.ts.
- #1551's resolution explains an old speculative rollback of nested-super
  argument instructions; #2709 is marked done and follows up related concerns.
  Keep those regression controls. Do not reuse the superseded claim that every
  nested super is emitted outside its try region.
- #6651 historical notes around 5916 describe class prototype mutation as a
  no-op and compile-time super dispatch. Those observations help prioritize a
  hypothesis but must not be reported as measurements of this frozen epoch.
- Current #6929 constructor work is a direct overlap: root reports dirty
  `/Users/thomas/.codex/worktrees/6929-native-function-constructor-fix/js2`,
  PR #6605 published prefix `6f9288`, versus unpublished/local super-related
  prefix `4c30e1...` and nonconstructability prefix `3b8d...`.
  These are root-supplied abbreviated identifiers, NOT complete source pins.
  No files in that checkout were adopted or modified; no local gains are credited.
  Root must obtain full committed and dirty-diff pins, test evidence, and owner
  agreement before choosing integration versus further implementation.
- Remote assignment/PR state was intentionally not refreshed in this task.
  Local issue frontmatter is not proof that shared files are free. Root must
  coordinate #6929, #6774/#5153, class/prototype owners, and active IR owners before
  assigning code. Prefer extending the existing constructor lane after review,
  not dispatching an independent duplicate fix. Historical worktree/link/build
  commands in issue text do not override today's frozen-run/private-runtime rules.

## Current source: hypotheses, not observed route

1. `src/codegen/expressions/calls.ts:8133–8158` routes a nested constructor
   SuperCall (such as inside try) to `compileSuperCall`, then BindThisValue and
   parent override publication, returning the bound value in standalone mode.
   Thus the old no-op fallback is not sufficient as today's diagnosis.
2. `src/codegen/class-bodies.ts:4168` selects linked dynamic parent first, then
   compile-time `classParentMap` / `classBuiltinParentMap`. Its builtin branch
   resolves a native builtin constructor, evaluates args, calls it, and stores
   self. No current constructor-prototype fetch precedes arguments in the read
   branch. The original's actual emitted branch is not yet observed.
3. `src/codegen/expressions/extern.ts:449` lazily creates class-object singleton
   values using the class struct shape. Runtime identity is the singleton, not
   the struct type (instances can share that shape). Do not identify constructors
   merely with a ref.test of a class struct.
4. `src/codegen/expressions/call-builtin-static.ts:2159` compiles Object.setPrototypeOf
   operands and routes native semantics through status + writer helpers.
   `src/codegen/object-runtime-prototype.ts:716` has a `$Object` writer and
   nonordinary/boundary paths; alone it is not the full finalized runtime.
5. In particular, `src/codegen/object-model/closed-object-prototype-edges.ts`
   already installs an identity-keyed edge table and prepends get/status/set
   arms under standalone + usesDynamicProto with expando-carrier admission.
   Its entries distinguish absence from an explicit null prototype. The original
   class singleton's admission and actual final helper ordering need verification.
   Do not conclude that its mutation is necessarily dropped just from the older
   issue note or the `$Object` writer's base body.
6. `src/codegen/expressions/object-get-prototype-of.ts:390` tries dynamic-prototype
   reads before static class folds. Verify that typed/aliased readback and internal
   super retrieval observe the SAME edge and do not fold a stale parent.
7. `src/codegen/reflect-construct-native.ts:208–347` reserves/fills
   `__reflect_is_constructor`: nominal constructible closures, identity-branded
   TA constructors, recursively bound targets, Proxy's stored construct bit,
   builtin constructor brands, class singleton identity, and an admitted boundary
   capability. Audit coverage for the selected value rather than inventing a
   callable approximation. Reservation/finalization order matters.
8. `construct-is-constructor-guard.ts` is a narrowed guard for a particular native
   construct fallback, with callable/runtime-eval-marker exceptions. It is NOT a
   general SuperCall guard to paste unchanged: null and ordinary noncallable
   objects must also be rejected, and unsupported carriers must not be misproved.
9. `src/codegen/js-errors.ts:73` builds native JS-error throws through the canonical
   error constructor/tag. It can degrade to a string if ctor registration fails;
   that fallback cannot satisfy this original. `registry/error-types.ts:610+`
   includes constructor-property identity using cached builtin carriers. Reuse
   real TypeError production and assert identity, not name or message matching.
10. `classes/derived-ctor-this-guard.ts:296` emits BindThisValue checks after the
    parent call. A failed IsConstructor/argument evaluation must bypass those
    stores; a successful repeated super constructs first, then bind-this refuses.

Leading source hypothesis: static super-parent selection ignores a changed
constructor-side runtime edge. Mutation loss or classifier/catch-storage errors
could additionally contribute. The observed undefined caught value alone cannot
distinguish them. Existing bug versus #6878 or other regression remains unproven.

## Bounded later verification, unchanged original first

- Freeze exact A = EXEC, and run the unmodified original through the maintained
  honest-14/auto/standalone original-harness path, normal strict policy, 30-second
  jobs / 10-second fresh retries / 90-second callbacks. Capture primary/strict
  and retry evidence when available without inventing dispatch counts from labels.
- Keep this semantic packet separate from the already-reviewed four-original
  timeout A/B experiment. Do not add it to that experiment without root review.
- Source/emitted-route diagnostic checks, separate from original body: identity
  `Object.getPrototypeOf(C)` before/after mutation through direct and aliased
  readers; actual class-object carrier; set status/writer branch; compiled super
  callee selection; argument once/order; runtime constructor classification;
  native error allocation; catch binding publication; this-initialized flag.
  Do not insert assertions or tracing into the authoritative original.
- Baseline A, candidate C = A plus only the reviewed minimal implementation, and
  restored A with exact source digest. Use isolated immutable arms and matched
  source/harness/provider/runtime receipts; do not restore by overwriting the live
  census or dirty constructor checkout. Candidate bundles/providers must have
  normal build/admission at their own epoch, not borrowed outputs.
- If root instead integrates #6929, name the full candidate commit AND dirty-diff
  digest; separately test published-only versus proposed local changes as needed.
  No branch-title or previous focused-count substitution for this original.
- A/C/A demonstrates candidate effect at this epoch, not historical origin.
  Any #6878 attribution additionally needs its reviewed minimal removal/restoration
  control. Do not infer origin from old equal errors or whole-main comparisons.

## Conditional implementation boundary

After route confirmation and #6929 owner agreement, prefer one small leaf under
`src/codegen/classes/` for runtime SuperCall target capture/dispatch, with narrow
hooks in `class-bodies.ts` and, only if necessary, the nested expression caller.
Do not independently redesign IR, constructor ABI, or the whole prototype system.

1. Obtain the active constructor function object's runtime identity. Read its
   current constructor-side prototype once BEFORE arguments, spill the VALUE,
   then evaluate each argument/spread exactly once in source order within the
   current exception region. Preserve original NewTarget separately. Never use
   a mutable source-name lookup or retrieve the super value again after args.
2. After arguments finish, classify the captured value. Reject all actual
   nonconstructors with a genuine intrinsic TypeError. No parseInt-name special
   case, typeof-function shortcut, `.prototype` test, or compile-time heritage
   proof after mutation. An ambient-global declaration is not proof of the
   current runtime value: aliases, global rebinds, parameters and shadows matter.
3. If the captured value equals the unchanged original parent, the established
   parent-specific construction path may remain, provided identity comparison
   is sound and inputs were not evaluated twice. A different VALID constructor
   must reach compatible dynamic Construct with NewTarget and result/this handling;
   a guard that accepts it but still calls old Object is not a correct fix.
   If the required driver cannot represent a carrier, stop for owner/root design
   review rather than silently misconstruct or claim full acceptance.
4. Fix prototype storage only if readback proves it missing. Prefer extending the
   existing identity-keyed prototype facility and its readers/writers, not a
   second per-source-class global. Per-name state can conflate repeated class
   expressions and rebinding; null cannot mean both unset and explicitly null.
   Audit Object/Reflect/legacy __proto__ writes, aliases, refusal/cycle/extensibility,
   getPrototypeOf/static inherited reads and Proxy behavior together.
5. On throw, retain this-uninitialized state and the enclosing user's catch;
   do not publish parent overrides or initialize fields. On successful Construct,
   preserve replacement-object return, BindThisValue timing, fields once, and
   the expression value. Keep emit result/stack contracts so speculative rollback
   cannot erase a valid side effect or throw. Do not convert the original's outer
   ignored ReferenceError into evidence that the inner TypeError occurred.
6. Preserve helper reserve/fill discipline, shift-safe indices, fresh Instr
   arrays and existing Error-constructor identity. Register a new leaf using the
   current compiler-boundary policy after root approval. No compiler.ts/output.ts,
   machine IR, harness, oracle, provider-policy or acceptance changes in this slice.

Potential shared files needing explicit ownership: class-bodies.ts, expressions/
calls.ts, expressions/extern.ts, reflect-construct-native.ts, object-model/
closed-object-prototype-edges.ts, expressions/object-get-prototype-of.ts, and
object-runtime-prototype.ts. Error plumbing is a dependency to validate, not an
automatic edit assignment. Avoid widening this list unless the first divergence
requires it. Coordinate all prototype edits with the other pending TypedArray
prototype plan; these are different semantics sharing storage readers/writers.

## Required controls and acceptance

- Original PASS with BOTH maintained variants and unchanged original assertions,
  source/hash/includes, oracle/providers and deadlines; no skip, hidden import,
  forced host lane, source rewrite or synthetic replacement. Preserve any timeout
  as timeout. Final original PASS is necessary but not sufficient for soundness.
- No mutation: class extends Object works and super args occur once. Same-parent
  reassignment remains equivalent. Mutating C.prototype alone must not change
  SuperCall's constructor. Mutation through class alias must affect it.
- Nonconstructable parents: intrinsic parseInt via direct/aliased/dynamic value,
  arrow/method, ordinary object and null. Local constructable function named
  parseInt, shadowed Object, and a reassigned global parseInt must follow actual
  values, not names or ambient-symbol assumptions. Restore global changes between
  isolated controls; never mutate shared corpus/harness globals outside a test.
- Decisive ordering pair: begin with nonconstructor then argument changes C's
  prototype to a valid constructor — this call still throws TypeError after args;
  begin valid then argument changes C to nonconstructor — captured valid parent
  still constructs for this call. A second call observes the new prototype.
- Argument throws preserve exact thrown object identity and suppress later args
  and the later constructor check. Spread getters/iterators preserve ordering and
  abrupt completion. A second successful super runs the parent before the
  bind-this ReferenceError; failure must not falsely mark this initialized.
- Valid replacement parent: user function, class, admitted builtin, bound and
  Proxy constructor controls preserve NewTarget, returned object and side effects.
  Nonconstructable Proxy, revoked constructable Proxy, and bound nonconstructor
  must keep their distinct actual capability/operation behavior; do not invoke
  user getters or a dummy construct just to classify.
- Identity/mutation controls: anonymous/repeated class expressions, separate
  classes of identical shape, factory invocations, binding rebound after an alias
  retained the original class, and getters/calls that return the constructor value.
  Any unsupported existing form is recorded separately, never falsely passed.
- TypeError is an object whose constructor is the correct intrinsic carrier,
  caught at the inner site; no string throw or error-name substitute. Separate
  catch-binding write/read control distinguishes a lost thrown value from no throw.
- Regression perimeter after focused controls: maintained expressions/super,
  class constructor/subclass originals, Object/Reflect prototype mutation,
  Reflect.construct/NewTarget and current #6929 pins; #1551, #2709, #5153,
  #6772 and #6774 focused regressions. Compare per-original maps against frozen
  baseline: zero newly lost PASS, new compile errors, or timeouts. Do not promote
  historical issue counts into current measured results.
- Root alone runs approved tests/types/build/boundary checks after the heavy slot
  opens. Narrow success does not complete ES2015: integrate only after review,
  then fresh exact 11,778-original census including 74 Intl with full receipts.

## Source SHA-256 pins at EXEC

```text
eafc7823c261429a4c9fd3859c49a076db508b10f8fd554f0dc03a6378281c07  src/codegen/class-bodies.ts
cc140db9914616fd2cbd53ba6539c67a410a3cda285ed3a21d118f7937244556  src/codegen/expressions/calls.ts
073319630bb7ca18bb5aff73d22ce00852a6cc2299cff657c91b9f23fe88fbea  src/codegen/expressions/call-builtin-static.ts
a152afdc5a872ad78516326bf4db98c3e7c6862babfdb4adb68fce2836c7ad96  src/codegen/expressions/extern.ts
a007fd7d7273d630bb4e19956ffa88a598f5749e509e23b2ca4a0d4edcf28f0d  src/codegen/object-runtime-prototype.ts
ea5e0f15e42f5eb72d411b3f7c0eb01e52d823ccc9104f5fe3f70e2e87026fb2  src/codegen/reflect-construct-native.ts
c8436a1c83563d73e6f585bb6d852049c780780ec23ba0633d322a1d8614190d  src/codegen/js-errors.ts
61ba24fa879345a33b4cb6c34cc61cad690d2a595d38ad39cb2321b12d0c1b4f  src/codegen/object-model/closed-object-prototype-edges.ts
faedc4cac899caabe54bede4d719788eb7a46b81174c1b221243f5cac15b36e2  src/codegen/expressions/object-get-prototype-of.ts
1294a85dd527c7dec7de2ae0214e9adf412e807f3d04a8b9763a5b6156922e95  src/codegen/registry/error-types.ts
```

Handoff state: source/spec plan ready for root review; #6929 overlap/ownership,
allocation, runtime route, candidate effect and historical attribution pending.
No existing or unpublished constructor gain is credited to this census.

## Same-epoch positive neighbor receipt, root readback

While the SAME full census remained live at execution HEAD
`38901fff8f9a5ca029cbefcdaec5d8dd40949861`, canonical original
`test/language/expressions/super/call-bind-this-value-twice.js` recorded PASS:
honest oracle 14/providers auto, standalone, strict both, reached_test true,
compile_ms 4429, exec_ms 101, no retry marker. Root fully read the original
and pinned SHA-256
`3f903f3a7daf61852dd78989dbe68c0916f35c5c8707bd9b8a7f9caef3615f01`.
It first calls super successfully, catches the second super's abrupt completion,
and asserts an object whose constructor is ReferenceError. This is a useful
unchanged positive neighbor for the later bounded super repair and its
BindThisValue/error-identity blast radius.

Preserve this actual baseline verdict rather than inventing an alternate
expected-to-fail control. It does not prove both strict variants ran, the
mutated-super constructor lookup works, the emitted route of either original,
or that the full census completed. Keep the existing call-proto-not-ctor FAIL
and its separate constructor-order acceptance. No current repair or new
conformance gain is credited; root session 62071 was verified live and source
remained frozen. Candidate A–C–A and ownership gates are unchanged.
