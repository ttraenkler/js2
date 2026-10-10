# Error stack allocation and prototype plan — fresh negatives 86–87

Source-only Astra preparation, 2026-10-10. Root owns numeric issue allocation,
claim reconciliation, implementation dispatch, execution, and publication.
This document creates no new implementation claim. Every proposed experiment
and acceptance check below is **UNRUN**. No source change or measured repair.

## Frozen evidence and scope

Authoritative source checkout (`EXEC` below):
`/Users/thomas/Code/js2/.codex-worktrees/6878-delete-result-boolean-sol61`.
HEAD was read twice as `38901fff8f9a5ca029cbefcdaec5d8dd40949861`.
Root supplied source fingerprint
`a6464ffb87f98d4984d2454a14bc95bd80c035c88e7905bd1465b484537738c8`;
this task did not rerun the fingerprint instrument.
The primary `/Users/thomas/Code/js2` remains read-only and dirty.

Root's running authoritative census is native session 62071, FULL 11,778
originals including all 74 Intl originals, official standard standalone,
honest oracle 14, auto providers, strict both. Last supplied observation:
5,210 settled = 5,117 PASS + 82 FAIL + 5 CE + 6 compile timeouts; shard 7,
PID 54196, nonterminal. This is a partial accounting observation, not acceptance.
No compiler/parser/helper/test/build/typecheck/install/formatter/hook was run
here; no process was signalled or restarted. Root retains the heavy lease.

The originals and complete `nativeErrors.js` were read unchanged from primary:

- `test262/test/built-ins/Error/prototype/stack/getter-foreign-new-target.js`,
  root-pinned SHA256 `574d3d267999b83037e2e40331e3f165cac776090358fd1ab4016adf4d92aa07`.
  Root's 09:42:53 observation: FAIL, reached_test true, compile 5419 ms,
  execute 91 ms; first ErrorConstructor prototype assertion reports null
  against the expected `NotAnError.prototype` object.
- `test262/test/built-ins/Error/prototype/stack/getter-subclass.js`,
  root-pinned SHA256 `c1147393e1f061634c8309a8d0f877f7d56c0e9f635f67f50abd0a1f7c573831`.
  Root's 09:42:57 observation: FAIL, reached_test true, compile 3623 ms,
  execute 95 ms; first ErrorConstructor subclass direct getter reports
  `typeof undefined` instead of `string`.
- `test262/harness/nativeErrors.js`, root-pinned SHA256
  `601b5841cc3df18b72c3b5ce35c4d737acb3843c733b786991461ec5a6184508`.
  Order: Error, EvalError, RangeError, ReferenceError, SyntaxError, TypeError,
  URIError. Its additional AggregateError/SuppressedError helpers do not extend
  these originals' seven-element loop.

The foreign-new-target original is NOT a cross-realm test. It constructs
`Reflect.construct(Ctor, ['msg'], NotAnError)`, requires the exact selected
prototype, a string from the directly called stack getter, and `e.stack ===
undefined` because the chosen chain excludes Error.prototype. The subclass
original uses `var Ctor = nativeErrors[i]; var Sub = class extends Ctor {};`
and requires strings both from `get.call(e)` and inherited `e.stack`.
Later assertions and six later constructors are masked by the first failure.
Neither row identifies the actual emitted allocation/consumer route. The exact
failing strict variant, runtime carrier, and common-versus-distinct cause remain
UNKNOWN. Historical statements in issue 6775 are hypotheses, not fresh proof.

## Source route inventory

All source references below are to EXEC, not the older planner checkout.

1. Reflect front end: `expressions/call-namespace-static.ts:2450–2670`
   validates constructor inputs, distinguishes an assigned prototype expression
   from runtime NewTarget, and can synthesize `new target(args)` before applying
   the selected prototype. `reflect-construct-newtarget.ts` under `expressions/`
   contains preparation (116), runtime Get (138), application (243), ordinary
   driver (672), Proxy driver (814), and admission classification (1317).
   The runtime carrier list at call-namespace-static:2653 contains DataView
   field 3 and dynamic TypedArray field 5, not Error. Remaining carriers reach
   `__object_setPrototypeOf`. This exposes an Error storage gap, but does NOT
   prove that this exact original selected the runtime versus static arm.
   Error prototype access must occur at Error's allocation point before message
   conversion; merely adding a field to the post-construction patch is insufficient
   for an effectful NewTarget.prototype/message pair.
2. Dynamic native constructor values: `builtin-collection-dyn-construct.ts`
   reserves `__builtin_collection_dyn_construct(callee,arg0)->externref` (97),
   then fills canonical-identity Error arms (223) calling `__new_<Name>`.
   Its seven Error globals use bare names, collections `ctor:<Name>`.
   `tryEmitErrorFamilyValueConstruct` (270) evaluates callee and all arguments
   once; `expressions/new-super.ts:8532` invokes it at the Error-family terminal.
   Dynamic native driver `native-construct.ts:717` also consumes the helper.
   This helper has no NewTarget parameter; adding that behavior is a shared ABI
   change, not an accessor-only edit. Existing null-retry dispatch must not
   confuse a legitimate construction result or abrupt completion with a miss.
3. Alternative value call/construct route: `builtin-ctor-value-invoke.ts`
   prepares intrinsic-identity arms and `__builtin_ctor_value_<Error>` helpers.
   `prepareErrorHelper` (221) performs undefined-aware message ToString before
   calling the native constructor. `armedNames` (332), call arms (346), and
   construct-on-null (368) depend on earlier helper/global reservations.
   Compare this with the identity helper's direct argument forwarding when
   determining effect order. No claim that one of them ran in either original.
4. Class collection: `class-bodies.ts:1085–1240` distinguishes resolved class,
   named native parent, inherited externref backing, and unresolved runtime
   heritage. Unknown identifier `Ctor` can populate classParentMap and
   classDynamicUnresolvedHeritageSet without a native parent. Property/index
   heritage has a related unresolved-root path. Linked-provider routing is
   separately gated in `standalone-dynamic-parent-class.ts`; it is not a generic
   solution for a mutable local `Ctor` holding a native Error constructor.
   The original uses IDENTIFIER heritage; calling it literally an indexed
   heritage AST would be wrong even though the value originated in an array.
5. Native subclass allocation: implicit forwarders at `class-bodies.ts:2840–2920`
   use linked dynamic construction or `resolveStandaloneBuiltinSuperCtorIdx`
   (425), then `emitSetSubclassProto` and `emitSetSubclassUserBrand` (772).
   Explicit super handling is around 4294–4435; direct `new` has additional
   class/externref paths in `expressions/new-super.ts`. A native subclass must
   retain the actual parent-constructed object as `this`; setting a subclass
   tag on a plain object cannot create ErrorData. Capture heritage once per
   class evaluation, preserve subsequent binding reassignment semantics, and
   do not use a module-global last-parent value for multiple live classes.
6. Getter: `error-stack-accessor.ts:252` has ABI `(self,this)->externref`,
   tests receiver objectness, then `ref.test ctx.errorStructTypeIdx`.
   The Error arm returns the existing implementation-defined empty string;
   non-Error objects return canonical undefined. Primitives throw TypeError.
   `array-object-proto.ts:2714` selects this body for the Error stack accessor.
   Proxies have no ErrorData even when their target does. Preserve this genuine
   representation check; do not replace it with instanceof, names, prototype
   membership, or an unconditional string. A getter-body change is not yet
   justified by the subclass failure because the receiver may be wrong.
7. Property reads are DISTINCT from getter invocation. `registry/error-types.ts`
   `fillExternGetErrorProps` (644) prepends native Error handling: own bag with
   original receiver, nullable message, name, nullable stack, constructor and
   subclass-prototype arms (858–940). `error-subclass-proto-chain.ts` derives
   class prototype from field 4 and admits its current accessor receiver is the
   prototype carrier, not the instance. `property-access-dispatch.ts:1413–1545`
   still has typed/catch Error field reads, including stack field 3. Hence
   generic and statically typed reads need independent evidence.
8. Intrinsic fallback: `proto-index-store.ts:1080–1115` supplies Error type to
   `runtime/wasmgc/values/prototype-receiver-bodies.ts:298`, which maps every
   matching Error carrier to ERROR_OFF. A selected non-Error prototype must
   suppress that implicit chain, without suppressing genuine ErrorData.
   Receiver-aware proto consults and `accessor-driver.ts` must preserve the
   original receiver for inherited accessors.
9. Prototype identity: `object-model/native-carrier-get-prototype.ts:146`
   answers built-in Error tags only when userClassId == -1 and an intrinsic
   prototype was already materialized; its wrapper first preserves an existing
   base answer. `object-runtime-prototype.ts:94` installs this at finalize via
   fillArrayProtoSingleton. It cannot represent arbitrary chosen prototypes.
   Audit static folds in `expressions/object-get-prototype-of.ts` as well as
   dynamic `__getPrototypeOf`; a dynamic-only fix may be bypassed.

## ABI, shared state, registration and carrier bridges

Actual canonical layout is `runtime/wasmgc/values/string-layouts.ts:29`:
field 0 immutable i32 tag; 1 mutable externref message; 2 mutable externref
name; 3 mutable externref stack; 4 mutable i32 userClassId; 5 mutable
externref props. There is NO constructProto field. Old comments claiming
three fields or that userClassId is last are not layout authority.

Producers/mutators requiring coordinated review:

- `runtime/wasmgc/values/error-bodies.ts:31` builds all six operands, then
  struct.new and extern.convert_any. `registry/error-types.ts:278` interns the
  name first, registers type/function, and queues message finalization.
- The same canonical builder/layout are consumed by
  `backend/wasmgc/resources/native-errors.ts`: reserve/require/fill verifies
  ownership and exact layout. Append-only field addition still changes the
  canonical prepared resource; it needs IR-owner agreement and matching fill.
- `registry/error-types.ts:550–572` manually constructs SuppressedError and
  must receive any new operand. Test262Error uses the shared constructor at
  269; AggregateError, disposal and Promise error creation also depend on the
  Error ABI. They are regression scope even though these originals use seven.
- `emitSetSubclassUserBrand` writes field 4; `error-props.ts:143–170` lazily
  reads/writes field 5. `error-instance-field-write.ts`, `expressions/assignment.ts`
  and native field/descriptor paths mutate fields or sidecar. Do not repurpose
  stack field 3 or props field 5 for prototype state.
- Native/host bridge `registry/error-types.ts:182` exports Error predicate,
  name and message readers; `link-boundary-tostring.ts`, `exn-render-lite.ts`
  and `native-strings.ts` consume Error identity/string fields. A wrapper that
  drops nominal identity would break these routes.

Direct Error-layout/type consumers found by source search (complete matched
file inventory for `errorStructTypeIdx|getOrRegisterErrorStructType|
buildErrorConstructorBody|createErrorStructType`, not a claim of all transitive
runtime readers): context/{types,create-context}, registry/{types,error-types},
class-bodies, error-props, error-instance-field-write, error-stack-accessor,
property-access, property-access-dispatch, expressions/{assignment,identifiers},
object-runtime, object-proto-tostring, object-proto-tostring-carriers,
object-model/native-carrier-get-prototype, proto-index-store, native-strings,
link-boundary-tostring, exn-render-lite, disposable-runtime,
promise-combinators, array-filter-length-set; plus runtime values
{string-layouts,error-bodies} and backend resources/native-errors.

Class state is not a private allocation hint. classBuiltinParentMap,
classExternrefBackedSet and classDynamicUnresolvedHeritageSet are initialized
in context/create-context:270. Named/transitive/unresolved mutators are in
class-bodies:1133,1176–1197,1228–1236; standalone-dynamic-parent-class:195
also marks externref backing. Their readers include class field layout,
class callable ABI, ordinary/prepared/implicit constructors, IR integration,
method trampolines, instance-prototype and method installation, property
reads/writes, identifiers/instanceof, Object.isView, builtin subclass receivers,
Array/RegExp/Promise subclass machinery and host bridge generation in index.
Do not globally label a mutable Ctor binding as Error from one observed value.
New class capture state needs per-evaluation identity, collection/body order,
speculative rollback and multi-source lifecycle review. Existing speculative
snapshot code is not evidence that an added map automatically rolls back.

Registration contracts:

- Error type registration caches ctx.errorStructTypeIdx; canonical layout must
  agree across legacy registration and prepared reservations.
- `errorCtorMessageSlots` is optional, appended by constructor emission (328),
  consumed and cleared by fillErrorCtorUndefinedMessage (376–391). It patches
  after undefined representation is known. Moving constructors outside this
  lifecycle must preserve undefined/no-own-message behavior.
- Dynamic identity helper reserves before use and fills after carrier globals
  are complete; noteBuiltinCollectionCarrierReserved handles reversed source
  order. Constructor dependencies must be prepared while body emission can
  flush late import shifts, not first invented in finalize.
- Own-bag helpers reserve in object-runtime before consumers (1489), fill in
  index:6650/11358. Error constructor patch/get readers/bridge finalize at
  index:6870–6876 and 11497–11501. Both single- and multi-source flows matter.
- ClassTagMap/protoGlobals feed finalize subclass lookup; nativeProtoGlobals
  determine available intrinsic fallback. GetPrototypeOf fallback must not
  materialize fresh glue after dispatch closure. New helper reservations need
  stable indices, fresh body arrays, correct DCE/remapping, and no host import.

## Ownership gate and minimal implementation choices

No independent source seam is cleared by this plan. The smallest coherent
allocation/prototype repair spans shared Error ABI, class construction and
prototype consumers; a new leaf filename alone does not make it independent.
Root should initially release an observation-only diagnostic to the existing
constructor/Error lane after the census ends, then approve exact files/interfaces.

Read-only cached assignment audit: upstream ref
`8972712a1bf33c3429ff6a851e8581a0783b1ada`, dated 2026-10-09 23:37:04 +0200.
No fetch/remote refresh occurred. Origin/fork assignment refs instead stop at
`3d6bc324711e54f4b4d41f71910ee228cc8ed6ac` (2026-08-09); do not use them to
declare a lease free. Read upstream records show:

- 6775 built-ins miscellany: ttraenkler/opus-6775, in-progress;
  6772 class residue: ttraenkler/opus-6772, in-progress.
- 3371 Reflect NewTarget and 5316 Proxy receiver/Construct forwarding:
  ttraenkler/fable-es6, in-progress, claude/es6-test262-standalone-g10c7u.
  5316 issue frontmatter says done: discrepancy needs reconciliation, not takeover.
- 6766 Proxy prototype link: ttraenkler/opus-6766, in-progress;
  6770 Object/Reflect: ttraenkler/opus-6770, in-progress.
- 4098 own-field/property substrate: ttraenkler/dev-4098-g1, in-progress;
  5156 function/error builtins: reserved, empty assignee, issue in-review.
- 6651 integration objective: ttraenkler/project-thread-yhj9pp, in-progress.
  6929 native constructor record: reserved, empty assignee; root separately
  reports existing PR6605 checkpoint 6f9288f8 and dirty constructor worktree.
  That report is not a complete source pin or handover.
- 3518 parent IR record released, but native-values, native-resource-declarations-
  checkpoint, and error-message-bridge-leaves records are in-progress under
  ttraenkler/codex-astra-native-values-20260908,
  ttraenkler/codex-native-resource-declarations-checkpoint and
  ttraenkler/astra-reference-error-runtime-20260906 respectively.
  Prototype-chain-native-bodies-delivery-20260928 is recorded done.
  Root reports continuing IR work elsewhere; a released parent is not blanket
  clearance. 4274 realm contract is relevant only if fallback realm identity
  becomes part of a generalized constructor change; this original needs no realm fix.

These are cached claims, not proof that every named person is running now.
Root must reconcile current owner/diff/branch evidence and obtain explicit
handover for ABI, class and receiver/prototype seams before Sol6.1 writes.
General inference/index-variable/array-HOF authority does not cover Error ABI.

After actual route evidence, choose the smallest coherent option:

1. If the subclass receiver is not a native Error, fix native dynamic heritage
   capture and construction in the existing class/constructor owner lane. Reuse
   intrinsic identity dispatch; retain parent result and attach genuine subclass
   prototype. Prefer a small native-Error allocation leaf with approved class
   collection/new/super call-site seams. Do not widen linked-provider rules by
   simply deleting their guard, reinterpret a user constructor by its name, or
   skip other possible runtime constructors. Forward each argument once and
   preserve explicit-super return/this initialization rules.
2. If foreign construction produces native Error but loses prototype, add a
   genuine per-instance edge, preferably append-only after field 5 with an
   explicit state contract distinguishing implicit default from explicit null.
   Construction with primitive NewTarget.prototype selects the proper intrinsic
   default; later setPrototypeOf(null) means a genuinely null chain. All producers,
   GetPrototypeOf/static folds, property/proto fallback and mutation consumers
   must agree. Field plus post-patch alone is not an acceptable implementation.
   A hidden side-table alternative avoids layout changes only if existing
   lifecycle, identity, visibility, integrity and cross-boundary readers can
   support it; props user keys cannot emulate an internal slot.
3. If allocation and selected edge are correct but getter receives a different
   value, isolate the call/accessor carrier bridge and repair only its proven
   receiver transport. Keep the getter's ErrorData predicate. If only inherited
   access remains wrong, use receiver-threaded lookup through the selected
   chain, with own-property precedence and no intrinsic fallback on chain miss.
   No speculative getter widening or synthetic stack-property installation.

Required evidence deciding among these: emitted allocation helper and nominal
carrier, class metadata/capture at definition, exact prototype edge after
allocation, getter closure identity and receiver immediately at its ABI, and
the consumer that handles ordinary `.stack`. Pin generated native Wasm/IR
route receipts through maintained diagnostics; compilation success alone is
not evidence that the intended route executed. Abort unsupported attribution
with UNKNOWN, not success. Shared-file changes stay serialized in one owner
lane unless root approves a genuinely disjoint interface split.

## Unrun verification and acceptance protocol

Only after root releases execution and concrete ownership:

1. Pin A to the exact frozen source, dirty-source hash, runner/helper/provider
   hashes, official standard harness, honest oracle14, standalone native compiled
   Wasm and requested strict variants. Pin candidate C identically except the
   reviewed source change. Use the maintained Test262 path runner and its actual
   status/reached/variant records. Do not run JavaScript as the implementation.
2. Run unchanged originals independently A–C–A, fresh isolated executions.
   Retain every assertion and all seven constructors. Pin hashes before/after.
   Require actual completion of every strict variant and per-constructor direct
   getter/property/prototype controls; a first-Error pass is not seven successes.
3. Run a known passing native Error original and an intentionally failing
   assertion/throw control through the SAME instrument on each source epoch.
   Put intentional negatives in separate owned diagnostic fixtures, never
   alter originals. Demonstrate negative controls report failure/reached true;
   a removed-fix counterfactual must restore the relevant A divergence. A control
   that cannot observe its target invalidates attribution, not the original.
4. Identity/effect controls, independent of source-name folding: all seven direct
   new/call/aliased/nativeErrors-index constructors; implicit and explicit native
   subclasses, multilevel and siblings; two classes created with different
   captured Ctor values, later Ctor reassignment, and repeated class creation.
   Preserve message coercion, no-own-message for absent/undefined, own expandos,
   subclass fields and `.constructor` where supported. Add ordered event arrays
   proving class heritage/prototype getters run at definition once and Error
   NewTarget.prototype Get precedes message ToString; throwing getter suppresses
   conversion, throwing conversion retains the already-observed prototype Get.
5. Foreign-NewTarget controls: plain object prototype, closed object-literal
   carrier, callable object and Proxy prototype, plus primitive/null/undefined
   prototype fallback. Assert exact object identity, not printed shape.
   Keep NewTarget's body uncalled, argument/list effects once, and unchanged
   target/NewTarget IsConstructor error order. Realm default selection is a
   separate owner dependency if the implementation changes that behavior.
6. ErrorData/lookup separation: real Error selected onto unrelated prototype
   has direct getter string but ordinary stack undefined; real Error reparented
   to null still has direct getter string; plain object inheriting Error.prototype
   has direct getter undefined; plain `{}`, Object.create(Error.prototype),
   Proxy(Error) and revoked Proxy have no ErrorData. Primitive/null/undefined
   receivers throw TypeError. Borrowed call/apply preserves exact this. Verify
   own stack data/accessor overrides and inherited custom accessors see the
   instance, and dynamic/caught/static/computed reads agree. No instanceof gate.
7. Run same-epoch Error/prototype/stack and NativeErrors neighborhoods, class
   dynamic heritage/super/return controls, Reflect.construct/bind/Proxy controls,
   Error descriptors/enumeration/delete/integrity/stringification/throw-catch,
   AggregateError/SuppressedError/Promise failure and prepared-resource/host
   bridge controls proportionate to touched ABI. Keep known negative rows
   visible; classify every newly exposed assertion separately.
8. Root runs normal required quality gates and full 11,778-original acceptance,
   preserving all 74 Intl, no reduced denominator, exclusions, harness
   substitution, oracle weakening, provider swap, error swallowing or timeout
   reclassification. Re-run apparent regressions independently with the same
   instrument. Report actual PASS/non-PASS deltas and unresolved rows; no
   extrapolation from this two-row shape or stale umbrella totals.

### Separately releasable inert Sol6.1 control packet

After root's FULL review, a worker may be assigned only new diagnostic fixture
files and a manifest in its own isolated worktree, with no production source,
original, harness, runner, provider or shared tests edited. Fixture ownership
must be named at dispatch. Prepare small Test262-shaped controls for the
identity/effect/brand distinctions above, preserving unannotated JavaScript
and runtime-valued heritage; do not add `: any` or literalize the constructor
loop and then claim the original route. The manifest records expected
observations, both intentionally positive/negative instruments, original
hashes, source epochs and UNRUN status. Use existing maintained diagnostics
for actual generated Wasm route receipts; no custom runtime simulation.
This packet is independently writable because it adds inert files only.
Executing it still waits for root's heavy-lease release, and its existence
does not clear the production ABI/class/prototype owners listed above.

Final root-supplied update while this document was being prepared: EXEC HEAD
38901fff remains pinned, staged/unstaged src/scripts/tests diffs empty;
root's existing manifest unchanged. Census 62071 remains live on PID54196,
5,224 = 5,131 PASS + 82 FAIL + 5 CE + 6 timeouts, no new failure. This task
did not independently execute any manifest or census verification instrument.

Preparation ends here. Only this new Markdown file is owned/written by this
planner; peer issue edits are preserved. No Git mutation, claim mutation,
source/corpus/runner mutation, publication, or implementation worker dispatch.
