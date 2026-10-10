# ES2015 Proxy missing-trap Get and Set: source-supported implementation plan

Model: Codex GPT-6 Astra High. Source-only planning, 2026-10-10.
Status: prerequisite-gated; no implementation, test execution, conformance credit,
or PR-readiness claim. This packet separates two observed failures; it does not
assert that they share a cause. Numeric allocation and live ownership checks
belong to root before implementation dispatch.

## Authority and custody

Planning checkout: `/Users/thomas/.codex/worktrees/es2015-fresh-full-census-plan-astra/js2`,
HEAD `dbf5b4f74b37d67e525b2af36fd1fe49803b1348`. Its existing dirty plans were
read-only to this task. The new path was checked absent before creation. This
task owns this Markdown file only. Primary `/Users/thomas/Code/js2` is dirty
parallel work and is read-only; originals were read through its `test262` tree.

Frozen execution source: `/Users/thomas/Code/js2/.codex-worktrees/6878-delete-result-boolean-sol61`,
HEAD `38901fff8f9a5ca029cbefcdaec5d8dd40949861`, independently read twice.
Root-supplied source-map digest is
`a6464ffb87f98d4984d2454a14bc95bd80c035c88e7905bd1465b484537738c8`,
count 1902; this audit did not regenerate the aggregate map. Individual source
SHA-256 pins below were independently calculated over complete files.

Root's latest supplied partial census: native session 62071, seventh shard
(index 6), PID 64778, LIVE; 4448/11778 settled = 4368 PASS, 69 FAIL,
5 compile_error, 6 compile_timeout; no new negatives in that update. The full
denominator includes all 74 Intl originals. This is not terminal completion.
The live census retains the heavy lease. No Node, parser, compiler, helper,
oracle, tests, typecheck, build, install, formatter, hooks, profiling, signals,
restarts, Git mutation, network mutation, production edits, or original edits
were performed. Source inspection is not evidence of selected runtime paths.

Read operating context: full MEMORY.md, shared readers/mutators, narrowest-site,
lane/harness/commit provenance, dispatch ownership, and historical Proxy blocker
memories; applicable AGENTS.md. Old issue histories and comments inform possible
contracts, but the frozen implementation outranks them for this plan.

## Original evidence, independently read in full

Original paths below are relative to `/Users/thomas/Code/js2/test262/`.

- `test/built-ins/Proxy/get/trap-is-missing-target-is-proxy.js`, SHA-256
  `b21e11a498cd25d168f9b772007a678b92dddf21827c1f99bbcd78736f408970`.
  Two empty-handler Proxies wrap `/(?:)/i`. Assertions, in order: an inheritor
  reads `lastIndex === 0`; outer Proxy's `Symbol.match` is the exact same
  function as `RegExp.prototype[Symbol.match]`; an inheritor of two Proxies
  around `function(_arg){}` reads `length === 1`.
  Root authoritative FAIL at 08:39:26 local, compile 1921ms/execute 29ms:
  `Test262Error: Expected SameValue(«undefined», «function () { [native code] }») to be true`.
  The native-function expected value identifies the middle assertion in the
  original. The final function-length assertion is masked. Earlier lastIndex
  success in the failing execution is not proof all variants completed.
- `test/built-ins/Proxy/set/trap-is-null-receiver.js`, SHA-256
  `0138fa9eb9693ccf42eff4bfd3633d34291663e23902bbdb0ac591a271ad08ea`.
  Target's accessor setter saves `this` into `context`. Direct `p.attr = 1`
  through `{set:null}` must save `p`; then `pParent.attr = 3`, where pParent
  inherits an empty-handler Proxy, must save pParent.
  Root authoritative FAIL at 08:40:19, compile 2070ms/execute 41ms:
  `Test262Error: Expected SameValue(«[object Object]», «[object Object]») to be true`.
  Failing assertion ordinal and actual identities are UNKNOWN. Do not infer
  `this === target` from the printed objects or assume the second assertion ran.
- Neighbor `test/built-ins/Proxy/ownKeys/trap-is-missing-target-is-proxy.js`,
  SHA-256 `96f6a83af4670ed3214cfab22d49354392ffec6b7f388dd9e8b0e451e20f3c3e`:
  two empty-handler Proxies around a String wrapper with a Symbol own property
  preserve `Reflect.ownKeys` order `0,1,2,length,symbol`. Root same-epoch PASS
  at 08:39:39, compile 4236ms/execute 106ms. This is a measured positive for
  that operation, not proof of recursive Get, Set, or general Proxy correctness.

All three root receipts use honest oracle 14, providers auto, standard official
harness, standalone lane, strict both, reached_test true. Actual primary/strict
variant execution counts, per-attempt identities, retry provenance, raw receipt
paths, emitted module hashes, runtime carrier identities, and route diagnostics
were not supplied to this planner. They remain unknown. Metadata year 2020 does
not remove an original selected in the 11778 objective.

## Entry and admission: what exists, what is not established

The original-harness path in `tests/test262-runner.ts:4776` assembles original
source and runs a primary variant; primary failure returns before a later
variant. Around 4470–4516, compilation carries target, semanticProviders from
the environment, hostBridge always, and deferred top-level initialization into
`compile(variant.source, ...)`. This source evidence explains why strict both
configuration does not prove both variants ran. Root must pin its actual worker
entry/configuration; an in-process runner spelling is not a substitute receipt.

`src/compiler.ts:1079` resolves the target profile and invokes generateModule
or generateMultiModule, retaining IR route/fallback diagnostics. It does not
prove which body route either test selected. If diagnostic evidence selects an
IR/machine route, trace that route rather than claiming the following legacy
codegen paths ran.

For legacy computed reads, `expressions.ts:1517` reaches compileElementAccess;
`property-access.ts:5172` first tries `tryProxyReceiverElementRead`.
`proxy-receiver-generic-read.ts:104` admits standalone receivers proven by
`tracesToProxyValue`; it compiles receiver and key to externref and calls
`__extern_get`. This exists to defeat TypeScript's target-shaped Proxy type.
The generic nonnumeric externref arm at `property-access.ts:6081` instead uses
compileHostPropertyKey then the same helper. Diagnose actual admission and
boxing; neither path may erase the symbol identity or evaluate an operand twice.

For dot assignment, `expressions/assignment.ts:4252` recognizes standalone
Proxy provenance and delegates to compilePropertyAssignmentExternSet with
forceRuntimeSet. That helper chooses strict/non-strict set around 5377. An
Object.create inheritor is a distinct lowering case; its static type, actual
prototype link, and selected runtime writer must be captured separately.

## Get: recursion exists; native-symbol read demand is a narrower candidate

Frozen `object-runtime-proxy.ts:365,498` directs absent get traps to
`__reflect_get_receiver(target,key,receiver)`. `:1875` prepends a Proxy front
guard to that receiver-aware operation, recursing one target hop while retaining
parameter 2. `:1843` guards ordinary `__extern_get` with receiver = itself.
`object-runtime-proxy-chain.ts:508` additionally forwards an inherited link to
the get dispatch with the walk's original explicitReceiver local. Thus adding
another unwrapping loop is not supported by this source audit.

`object-model/proxy-trap-read.ts:123` reads the handler's method per operation
and normalizes nullish to absent. `proxy-forward-carriers.ts:68` canonicalizes
keyed dispatch parameter 1 with ToPropertyKey, whose Symbol input must remain
a Symbol. Observe the actual key carrier/id at entry and at the RegExp target;
do not replace it with the textual spelling `Symbol.match` or `@@7`.

`object-runtime.ts:2044–2205` builds the ordinary Get and receiver wrapper;
`runtime/wasmgc/values/object-get-bodies.ts:51` consumes the one-shot receiver
before accessors. Non-object targets consult native-carrier/closure/vec routes.
`closure-props.ts:173`, `vec-props.ts:95`, and `proto-index-read-bindings.ts:27`
capture native prototype lookup, separating lookup brand from accessor receiver.
`object-get-arms.ts:95` preserves that split; RegExp classification is supplied
to `proto-index-store.ts:1096`. A Proxy receiver must never become the brand
used to look up its RegExp target's prototype member.

Concrete alternative G1, missing dynamic prototype demand:

- `array-holes.ts:1173–1222` treats a builtin prototype used as the base of a
  member access as a static-path case, except Symbol.unscopables. Merely writing
  the RHS `RegExp.prototype[Symbol.match]` does not establish protoMemberDirty.
- `proto-index-store.ts:195` reserves companions only under its demand flags;
  `native-proto.ts:680` gates RegExp companion seeding on protoMemberDirty.
  `native-proto.ts:765` seeds advertised Symbol members using boxed symbol keys
  and the canonical builtin singleton. `regexp-standalone.ts:5723,5759` advertises
  @@7/match, @@8/replace, @@9/search, @@10/split. Direct native-member reads and
  companion reads must reuse the same function object.
- Existing B10 leaf `regexp-untyped-receiver.ts` already describes this dynamic
  gap, but `METHODS` at 88 contains only exec/test/compile/toString; demand is
  tied to untyped RegExp binding uses, and its emitted key guard at 364 is a
  string test. This is not an existing general Symbol.match fallback.
- Assembled official includes/prelude can activate flags or seeders for other
  reasons. Therefore G1 is a concrete candidate, not a demonstrated flag value
  or the attributed cause of this row.

Distinguish G1 from G2 (key boxed as number/string or wrong well-known id), G3
(lookup classifies original Proxy instead of current RegExp target), G4 (own
bag/prototype mutation shadowing or seeder order/closure identity), and G5
(earlier compiler admission bypass). Later diagnostics should record which
arm returns undefined, seeder/companion membership, symbol identity, target brand,
and whether all Proxy hops run. No test-name admission, blanket protoMemberDirty
activation, layer collapsing, hardcoded answer, or new throwing stub is allowed.

Conditional repair: if G1 is demonstrated, add semantic demand for the reachable
native symbol member at the narrow dynamic-read demand/registration seam, reusing
the canonical mutable companion and singleton. If G2/G3 is demonstrated, repair
only the proven boxing/binding operand. Existing B10 is a coordination neighbor,
not permission to widen its string-only classifier blindly. Preserve own-property
shadowing, deleted/replaced prototype members, inherited getter receiver, and
lookup order. There is no independently cleared Get production leaf yet.

## Set: concrete receiver-observer omission in the three-argument branch

`object-runtime-proxy.ts:452–480` has two different absent-trap forwards:

1. Four-argument dispatch calls `__reflect_set_receiver(target,key,value,receiver)`
   and boxes its boolean. It already preserves the explicit receiver.
2. Three-argument dispatch tries protoLinkReceiverSetForward, then falls through
   to `__extern_set(target,key,value)`, losing the original Proxy operand.

`object-runtime-proxy-chain.ts:340–398` only takes the receiver-aware forward
when getOwnPropertyDescriptor or defineProperty traps are present. Its comment
asserts those are the only observers of the lost receiver. A target accessor
setter observing `this` is a separate observer, exactly the original's shape.
The null/absent handler trap case can therefore fall through to the target-only
writer. This is a source-demonstrated semantic gap conditional on taking that
three-argument branch; the observed failing ordinal/path is still unknown.

Strict mode does not automatically avoid it: `object-runtime-proxy.ts:2017`
intercepts only a present set trap in the strict helper, leaving the absent-trap
case to its existing body. In contrast, the inherited prototype link route in
`proxy-chain.ts:486` is designed to use the receiver-aware walk.
`object-runtime-ordinary-set.ts:460` checks for Proxy at every walk hop;
`:507–523` calls `__call_accessor_set(receiver,setter,value)` with parameter 3.
`accessor-driver.ts:335` fills that reserved bridge using receiver local 0 and
setter local 1, then drops the setter return. The source already contains the
right accessor call contract; do not globally change closure this binding on
the assumption that its bridge is broken.

After route proof, the preferred candidate is to make absent-trap forwarding
retain Receiver for every admitted ordinary target case where this helper is
sound, using the existing receiver walk. Do not add observable target gOPD
probing merely to decide whether an accessor exists: a Proxy target would see
an extra trap and altered order. Avoid a source-level accessor-name gate as well.
If ordinary-walk coverage for a target carrier is not proved, record and solve
that dependency before replacing all forwards. Typed arrays, array length,
native carriers and nonextensible receivers are real coverage constraints.

Keep the three-argument ABI and its placeholder result unless all callers are
explicitly handed over. The helper can publish success/refusal on the existing
set-result channel, but a missing helper/channel must not turn an unsupported
case into silent success. Four-argument dispatch owns a boxed boolean and must
not be changed to a placeholder. Preserve strict throw versus sloppy no-op,
assignment expression value, setter errors, and exact receiver identity.

## Proposed seam inventory and ownership boundaries

Exact current single code caller of protoLinkReceiverSetForward is
`object-runtime-proxy.ts:470`; its layout operands come from :353 and locals
from :361. It emits fresh Instr arrays and reads proxyDirty/standalone,
objectRuntimeTypes through trap helpers, funcMap, and externSetResultGlobalIdx.
It writes runtime result-global state, not context maps or Proxy layouts.
Do not change its public layout, parameter numbering, or lifecycle casually.

The three-/four-argument dispatch name references are in object-runtime-proxy,
object-runtime-proxy-chain, object-runtime-ordinary-set, object-runtime,
object-model/proxy-forward-carriers, and error-stack-accessor. Those include
generation, late patches, and callers, not six independent runtime call sites.
Review all if changing the ABI. Existing registration order is
object-runtime.ts:5647 reserve receiver walk → ensureProxyRuntime → proto-link
arms → fillOrdinarySetWithReceiver at :5751. Accessor and Proxy drivers are
filled at finalize in index.ts; mint/reserve/fill and late-index remapping must
remain ordered, with no shared mutable Instr subtrees.

The set-result channel index is allocated/stored at object-runtime.ts:2544–2552,
shifted by registry/imports.ts:757, and declared in context/types.ts. Its reference
inventory additionally includes carrier-bag-visibility, class-object-expando,
closed-struct-extern-set, closure-props, error-props, instance-props,
object-runtime-strict-set, vec-length-set, vec-overlay, and vec-props. These
read the index to emit writes/consults: writer results cross a shared
success/refused/unadmitted contract; strict-set resets then reads it, Proxy
guards distinguish a real trap result from the absent-forward placeholder.
This plan preserves all of these sites and adds no state. Any proposal to change
codes, move state, or add another writer requires instruction-level read/write
enumeration and reentrancy proof across this entire inventory first.

For G1, protoMemberDirty is initialized false in context/create-context.ts:178;
all source assignments found are in array-holes.ts:141,150,155,159,163,235.
Direct executable readers include scan early-exit, proto-index reservation,
to-primitive-presence, Function companion demand in closure-props, and native
companion seeding. Indirect registry readers include proto-index force-create
and seed-call filling, array-to-primitive, to-locale-string-element, and native
reflection metadata. Moving/introducing demand requires full flag/registry
lifecycle and reader review; enabling a flag changes more than one member.

Ownership prerequisites, using issue titles rather than numeric shorthand:

- 6770, “ES2015 standalone built-ins/Object + built-ins/Reflect residue — 49 rows:
  closed-struct literals under reflective builtins, own-key order, @@toStringTag
  on builtin prototypes, Proxy [[OwnPropertyKeys]] surfaces, lazy trap lookup”:
  current plan says in-progress, assignee ttraenkler/opus-6770. Owns shared lazy
  lookup and reflection machinery; no adoption here.
- 6766, “ES2015 standalone: a Proxy as [[Prototype]] — link carrier in
  `$Object.$proto`, per-hop trap dispatch, receiver-threaded [[Set]]”: owns the
  proposed Set donor and runtime wiring; explicit handover is needed.
- 5316, “ES2015 standalone proxy — r4: §10.5 descriptor-model invariants,
  Reflect.set receiver, [[Construct]] NewTarget forwarding”: historical done
  status does not make its shared receiver/descriptor contract ownerless.
- 3371, “standalone: Reflect.construct arbitrary distinct NewTarget still
  refuses 33 ES2015 rows”: coordinate shared Proxy construction/registration,
  but these failures do not justify changing NewTarget or realm behavior.

Root must reconcile current-main/PR/claim state and active worktree hunks after
the freeze. Also coordinate native RegExp/prototype B10 owners if G1 is proven.
This audit does not consult network or reassign anyone. A future Sol worker may
own a new focused diagnostic/test file plus this allocated issue after release;
production write bounds are conditional, not a lease granted by this packet:

- Set-only candidate: proxy-chain.ts::protoLinkReceiverSetForward, or an agreed
  new pure builder leaf with a single call from that function. Existing file
  owners retain integration. No change to object-runtime-proxy.ts, ordinary-set,
  accessor-driver, context, IR, machine/backend, strict-set, or channel encoding
  unless diagnostics prove necessity and ownership expands explicitly.
- Get-only candidate: the demonstrated native symbol demand/registration or
  split-receiver/key binding site. Pin exact function and consumers before
  releasing a source writer; do not authorize native-proto/array-holes wholesale.
- Read-only boundaries include the frozen source, originals/includes, runner,
  provider configuration, exclusions, harness, ABI/layout and unrelated plans.

No independently useful production leaf can be prepared now without choosing
an unproven Get cause or taking 6766's Set seam. Source-only control design and
this packet are the independently owned preparation. Do not manufacture a leaf
just to claim parallel progress.

Shared IR/machine contracts remain read-only. `ir/program/native-prototype-requirements.ts`
derives issued requirements from actual source/selected projection provenance;
unresolved chains remain gaps, and Get's receiver operand must survive.
`backend/wasmgc/resources/native-prototype-seeder-bindings.ts:49` requires the
same access-requirement identity and physical reservation inventory, preserving
gaps and descriptor-binding completion scope. Codegen globals/legacy flags are
not evidence those contracts are closed. Any fix needing their modification
returns to the shared IR/machine owner; do not forge handles, erase gaps, or
borrow another machine's completion claim.

## Post-freeze diagnostic and acceptance sequence

1. Root confirms terminal census/lease release, authoritative attempt records,
   owner handovers, collision-free numeric task and isolated implementation
   worktree. Pin actual compiler/runner/provider contents and selected route.
   If route/identity diagnostics cannot see an operand, report UNKNOWN.
2. Baseline A runs the two byte-unchanged originals under the authoritative
   standard official honest-14 standalone providers-auto configuration, with
   strict variants and retries recorded separately. Preserve first failures;
   never overwrite earlier receipts with a retry. Run the same-epoch ownKeys
   original positive to establish the selected instrument works.
3. Use separate focused diagnostics to localize assertions without modifying
   original acceptance files: Set saves explicit booleans for target/Proxy/heir
   identities and setter call count/value; Get records both target hops, key
   identity, selected branch and singleton comparison. Diagnostics must not
   themselves activate prototype demand invisibly; record flags before/after
   instrumentation and prefer existing compilation route telemetry.
4. Get controls: direct RegExp, one/two Proxies, empty/get:null handlers, actual
   trap observing handler-this/target/key/receiver once, inherited accessor,
   throwing trap getter, revoked inner Proxy, own symbol override, deleted and
   replaced prototype symbol member, ordinary string keys, distinct user Symbol,
   and the masked native-function length assertion. Run symbol identity checks
   both before and after direct prototype value access to reveal lazy-order bugs.
5. Set controls: direct target accessor; null/absent/undefined set trap; direct,
   inherited and nested Proxies; explicit Reflect.set distinct receiver; getter
   followed by setter; reentrant accessor; actual set trap with all arguments and
   handler-this; throwing trap getter/setter; noncallable trap; revoked inner
   Proxy; strict false-result throw versus sloppy refusal. Include own writable
   data property as a positive and nonwritable/nonextensible data refusals.
   Check target/receiver descriptors, effects and returned booleans/assignment
   values, not matching object renderings. No extra gopd/set/define trap calls.
6. Candidate C patches only the demonstrated seam. Record A/C source-map hashes,
   commit or dirty-diff identities, compiler/runner hashes, options, provider/cache
   identities, original/include hashes, lane, variant, retry, timing, reached_test,
   raw error, result and emitted artifact identity. A–C–A restores only the
   candidate semantic change in an isolated checkout: the original negative must
   return when disabled and the positive controls remain meaningful. Do not
   mutate the live frozen checkout to perform this sequence.
7. Acceptance requires both originals complete all their applicable variants
   (including the previously masked length assertion) with identical originals,
   official harness, provider selection and oracle. If only Set is fixed, report
   1/2 with Get explicitly open; this packet does not require coupling changes.
   Run relevant Proxy/RegExp/accessor/reflection controls and required repository
   checks in the later implementation phase; shared hot-path changes require
   appropriate broad current-baseline regression evidence. Report denominators
   and unsettled rows; no extrapolation from these three originals.

## Frozen complete-file SHA-256 pins

Paths are relative to the frozen execution checkout. These pin inspected source
content, not executable validation or an assertion every line was analyzed.

```text
26a7fc2058ea452553088e77e2e1033118cd2aab2da1699f920a800a4d284f71  src/compiler.ts
6bd2b218df37fb1103bdc8a9032da6189b42ae5b44438638a458e1266ec889d8  tests/test262-runner.ts
0fc987ac9bfa1e11fcafadbf4a1afac5ca055f5b766c7f69acc97798af0d5a8a  src/codegen/expressions.ts
611458d9acc6e17cafc91b009e3548523d27727aff3ed20dfc50314f48e6b656  src/codegen/property-access.ts
672131e5bbc2fee2fdfd2f0cef5356778c49b38a8c0762de26618c309d909125  src/codegen/proxy-receiver-generic-read.ts
238af3d215394ef610a9f997d94318f0767bcee522be6c8f9a43c2db5444b596  src/codegen/proxy-value-provenance.ts
f98f5c5938294b60aab551ea873b1e31e1a7d0d290b10d2608731404fbdb83bc  src/codegen/expressions/assignment.ts
a64b0209aec8e46acdc3590f0f2a8a6e53d30c2d70e545cf23917477de89161a  src/codegen/object-runtime-proxy.ts
22a4ec05ea8abadf5e82540818fdcebdae8676fc46a99ea57c121fd62ba48fb7  src/codegen/object-runtime-proxy-chain.ts
5c5784882eca1bb0c474a1d1ffe6d9b55c09867fc2c4f913c7ba4d5e529d6a9a  src/codegen/object-runtime-ordinary-set.ts
07aa19b88a66ce56764c63e8060d5853250bd264c54d0d112f1ed3868b6df2a9  src/codegen/object-model/proxy-trap-read.ts
793d9e27b75c3474a15bfaf86f43587b9bcfceaf752342c2791feec2b8889be8  src/codegen/object-model/proxy-forward-carriers.ts
92bd1b419222c200af68869fbdc4801d3c1dec806d3b5420a2b19530a08fc2e1  src/codegen/object-runtime.ts
2c25d4c8bdb1031f897d8e8b9bad1df1e65c83807207bd3b5bec3214fa5f127c  src/codegen/accessor-driver.ts
c35903cf2e8e401a8b4db33bc809fbe72ce4d5a48d5b599b3cc74224ee0beef5  src/codegen/object-runtime-strict-set.ts
438ae563cd41ea337a818da8e3d0b317d00fbd2f36db86cb824a95c8cdc45357  src/codegen/array-holes.ts
3808982faddae077f9e928069cc838b344d5181616d1b357c38cb44c1db409e3  src/codegen/context/create-context.ts
06d69d8a29ad7efff8187d8788e84a0a531f6d574c283a88c37e1b787f9300b5  src/codegen/proto-index-store.ts
c144a5567e8d4cb98e58e23b14187cba9dd05b34cc219f5d1faa527a165f86eb  src/codegen/proto-index-read-bindings.ts
03f1804d815f315ded693f09a549c3b9a55c5f750b5032b05af437c4dacc816f  src/codegen/native-proto.ts
fc5e904c51c562382056b0c3cf9e82a913f42095cac56bf2a404ec0f1e63b1a5  src/codegen/regexp-standalone.ts
90102eef4604141ebe5b42cfced591ed76fb1ba9c988ae4475b3294521ddf3fd  src/codegen/regexp-untyped-receiver.ts
fbe080f0a74a5ee2ae9971e9a20a44da25ce8b0f982ff1e5c4efd854f05ecbd5  src/codegen/closure-props.ts
10f40997751c85ed7cb2da6c618486a3a6f1d66766c38f34679251ffc05102c8  src/codegen/vec-props.ts
e51b65ed7b8af03737795cdb7e3ea8d798075618210b7b0fa975b0c0f56942cd  src/runtime/wasmgc/values/object-get-arms.ts
c1f50f664b802b2e21e1088cd1e4bad01c123feb6e28f234620261eb73ad34db  src/runtime/wasmgc/values/object-get-bodies.ts
1312e20ae2fd2a87a2df8ec43fa835c4bd5d1361297c7da9260d1fac27197aa9  src/runtime/wasmgc/values/prototype-read-bodies.ts
37a66a9d45df1160a1ed0000b14eac768bd68a60f13f0e36556066d48e4961b8  src/ir/program/native-prototype-requirements.ts
056588e83a474e6673ea9d94f248ec397e7b92d961b56eab4e31414ad0fa70c0  src/backend/wasmgc/resources/native-prototype-seeder-bindings.ts
```
