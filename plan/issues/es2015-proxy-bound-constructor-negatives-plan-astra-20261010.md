# ES2015 Proxy/indexed-set, recursive realm, and bound NewTarget negatives

## 2026-10-10 array inherited indexed HasProperty trap (nonpass85)

Root fully read unchanged
`test/built-ins/Proxy/has/call-in-prototype-index.js`, SHA256
7ec953f47cf141a4720a66f11b176cfc67523c7223b52bc426682d1813805ea1,
and full proxyTrapsHelper.js SHA
0fb687804ab799e320c5dc4a0d4316162e6a14c286873405d881a151cb15787a.
Frozen38901fff honest14/providersauto
standard official standalone strictboth FAIL09:35:53 local, reachedtrue,
compile3233ms/exec83ms: handler is context, actualundefined vs handlerobject.
Actual missing handler value is compatible with trap never executing, not
proof the call bridge passes incorrect this. Actual strict calls UNKNOWN.

Original proto=[14], target=Object.create(proto), Proxy with only allowed has
trap, empty array whose prototype is that Proxy. `1 in array` must return
false but still invoke has with handler this, exact target and string key1.
Helper supplies throwing defaults for all other traps. First false-result
assertion can pass from an incorrect no-trap fast path; handler assertion is
the first visible failure, later target/key checks are masked. Trap returning
false cannot be replaced by simply computing false from array length.

Route to existing6770/6766 array-overlay/Proxy HasProperty ownership, keeping
distinct from earlier inherited indexed Set and new missing-trap Get/Set
negatives. After owner handover/root lease release, diagnose actual stored
array prototype, own-element presence/index admission, inherited HasProperty
walk, Proxy trap selection and closure handler/target/key call. Controls:
direct Proxy in, ordinary inheritor, array missing index vs own element,
traptrue/false/throw, numeric-to-string key, null/absent trap recursive fallback,
nonconfigurable/nonextensible invariant rejects and no extra default traps.
Trace selected branch before choosing narrow array/index/walk seam; preserve
real has invocation, side effects, abrupts and own-property precedence. No
global Proxy rewrite, source-name gate, hardcoded false or helper replacement.
Unchanged original A–C–A and array/Proxy/reflection neighbors required for credit.

At5066/11778:4981PASS74FAIL5CE6compile_timeout,6712unsettled,
zero accounting problems. SAME62071 LIVE seventh index6/PID64778; full
completion false. No source/original/helper/provider/runner/Git/PR/claim
mutation or execution; all85 non-passing originals tracked, no fix claim.

## Root source-review receipt: missing-trap diagnosis preparation

Root fully read382lines of Astra plan
es2015-proxy-missing-trap-reference-plan-astra-20261010.md, SHA
35ddddd52daa5f867cbcb92f8ac00a642c424cd6d4f82e6df0e0f1ccfff4fe95.
Set's three-argument absent-trap receiver observer omission and Get's native
symbol companion demand are source-supported candidates, NOT selected-path
proof. Shared runtime/IR ownership and terminal heavy-lease release remain
prerequisites; no independent production leaf was cleared.

Root then fully read Sol6.1High source packet433lines and handoff251lines in
isolated6878-boolean-property-carrier-sol61 checkout. Initial combined output
was truncated; separate untruncated reads1–240,241–433 and full251line handoff
completed the review. Hashes independently match:

- .tmp/es2015-proxy-reference-controls-sol61.ts SHA
  a86922ea3b3b8b3c30d6708d8658821f1b116cb083a5c09e838121a32fea5087.
- plan/issues/es2015-proxy-reference-controls-handoff-sol61-20261010.md SHA
  5dc50e8844fbafac00c9e80bdb75ba08af5de1b3db0a1a97efb233f08c12de64.

27Set+23Get+2instrument controls and3 unchanged-original registrations=55,
ALLUNRUN. Independent Scripts retain exact identities, trap/receiver/key/order
effects, absent/real-false strict/sloppy refusal, descriptor/mutation/throw and
reentrancy controls. P02 intentionally must reach runtime assertion failure;
compile refusal is not its successful negative outcome. Instrumentation demand
risks are explicit; do not concatenate sources or count helpers as original gains.

No launcher implemented/imported/registered. Own runner hashfc526d5816a810e6e9507943f0d4ab5c9ef17494fa15d288be1c748b202a88b6
differs from frozen6bd2b218df37fb1103bdc8a9032da6189b42ae5b44438638a458e1266ec889d8;
root approved explicit launcher integration deferral to maintained official
assembly→unified worker→instantiate path after execution release, rather than
guessing API/provider behavior. Source-review acceptance is preparation only,
zero measured gains/no production fix or PR-readiness. Frozen62071 remainsLIVE.

## 2026-10-10 missing-set trap receiver identity negative (original 73)

Root fully read unmodified
`test/built-ins/Proxy/set/trap-is-null-receiver.js`, SHA256
`0138fa9eb9693ccf42eff4bfd3633d34291663e23902bbdb0ac591a271ad08ea`.
Frozen38901fff census FAIL08:40:19 local, honest14/providersauto standard
official standalone strictboth, reachedtrue, compile2070ms/exec41ms:
`Test262Error: Expected SameValue(«[object Object]», «[object Object]») to be true`.
Original setter records this; first assignment via a Proxy with set:null
must record that Proxy, then assignment through an object inheriting a
second empty-handler Proxy must record the inheriting object. Both assertions
render identically on failure: actual failing ordinal and carrier identities
are UNKNOWN. Do not infer target-as-this or second-case failure from text.

Keep distinct from the missing-get symbol-method row and array-hole indexed
write. Diagnose both original assertions independently after heavy-lease
release: null/undefined GetMethod semantics, target accessor selection,
original Receiver operand forwarding through each prototype/Proxy hop,
call bridge this and sameValue object identity. Controls: direct setter;
Proxy set:null vs absent; explicit Reflect.set with a distinct receiver;
ordinary/Proxy/inheriting-object receivers; nested Proxy; trap getter throw;
real set trap observing all arguments/handler this; getter followed by setter;
strict rejection and throwing setter. Preserve identities and side effects,
not just matching printed objects. Coordinate6770/6766/5316 ownership and
only patch the demonstrated narrow receiver/key/call seam, then unchanged
original A–C–A plus value/identity/error controls. No global Proxy rewrite.

At4280/11778:4207PASS63FAIL4CE6compile_timeout,7498unsettled,
zero accounting problems. Same62071 LIVE/shard5/PID47243; full completion
false. No production/original/provider/runner/Git/PR change or validation;
all73 known non-passing originals now have MD custody, not verified fixes.

## 2026-10-10 nested Proxy missing-get trap negative (original 72)

Root fully read the unchanged original
`test/built-ins/Proxy/get/trap-is-missing-target-is-proxy.js`, SHA256
`b21e11a498cd25d168f9b772007a678b92dddf21827c1f99bbcd78736f408970`.
The frozen38901fff census records FAIL08:39:26 local, honest oracle14,
providersauto, standard official standalone strictboth, reached_test true,
compile1921ms/exec29ms. Actual first visible error:
`Test262Error: Expected SameValue(«undefined», «function () { [native code] }») to be true`.

Original constructs two empty-handler Proxies around `/(?:)/i`; checks an
object inheriting the outer Proxy has lastIndex0, then compares the outer
Proxy's Symbol.match with RegExp.prototype[Symbol.match]. Finally two Proxies
around function(_arg){} must expose length1 through an inheriting object.
The displayed native-function expectation matches the second assertion;
the final function-length assertion is masked. Actual variant-call counts
and earliest lowering divergence remain unknown; reached_test does not prove
both variants completed. Metadata2020 does not remove this selected original.

Route via existing3371/6770/6766 Proxy/reflective ownership, not a realm or
bound-construction cause inferred from this shared planning file. After root's
terminal-census heavy-lease release, diagnose target-chain identity, missing
GetMethod trap, recursive target [[Get]], original Receiver forwarding,
Symbol key identity and inherited native RegExp method lookup independently.
Controls must include direct RegExp symbol lookup, one/two Proxies, empty vs
get:null handlers, a real get trap recording target/key/receiver, inherited
getter receiver identity, throwing trap getter, revoked inner Proxy, ordinary
string keys and native function length. Preserve exact callable identity;
do not substitute a method answer, collapse Proxy layers, or route by test
name. Release only the demonstrated narrow getter/key/forwarding seam after
owner handover, then unchanged-original same-epoch A–C–A and neighbor controls.

At4261/11778 settled:4189PASS62FAIL4CE6compile_timeout,7517unsettled,
zero accounting problems, LIVE_PARTIAL_NOT_COMPLETION. Same native62071 is
LIVE on shard5/PID47243. No source/original/runner/provider/Git/PR mutation
or competing validation is performed; this is custody, not a verified fix.

Neighbor `test/built-ins/Proxy/ownKeys/trap-is-missing-target-is-proxy.js`
is PASS08:39:39 local, compile4236ms/exec106ms, same row configuration.
Root fully read its unmodified original, SHA256
`96f6a83af4670ed3214cfab22d49354392ffec6b7f388dd9e8b0e451e20f3c3e`:
two empty-handler Proxies around a String wrapper with a Symbol own property
must preserve exact Reflect.ownKeys order0,1,2,length,symbol. This is a useful
measured neighboring positive, not proof nested [[Get]]/RegExp method identity
or all internal methods work, and not substitute acceptance for original72.

Source-only Astra High planning handoff, 2026-10-10. Pending normal numeric
allocation, claim, semantic-owner handovers, verification, and publication.
This document does not claim an implementation or release any existing owner.

## Frozen evidence and limits

EXEC is `/Users/thomas/Code/js2/.codex-worktrees/6878-delete-result-boolean-sol61`,
HEAD `38901fff8f9a5ca029cbefcdaec5d8dd40949861`, with root-supplied source-map
digest `a6464ffb87f98d4984d2454a14bc95bd80c035c88e7905bd1465b484537738c8`.
HEAD was independently read at the beginning and end of this source audit.
The source-map digest and runtime receipts are root-supplied, not recomputed here.
Root's native full-census session 62071 remains live and owns the sole heavy
lease. No Node, parser, compiler, types, tests, builds, installs, hooks, formatter,
profiling, signals, Git mutations, network Git, or production edits ran here.
The existing isolated planning checkout is reused; no worktree was created.
Peer plans and root's edits to issues 4274 and 6775 remain untouched.

Root's canonical partial census at 675 unique rows is 662 PASS, 6 timeout,
7 FAIL. This is an unfinished census, not a final rate. These three rows are
FAIL, reached_test true, standalone, honest oracle 14, providers auto,
strict both. Reported compile/exec milliseconds and first visible errors:

- `test/built-ins/Proxy/set/call-parameters-prototype-index.js`: 2918/142;
  handler context was undefined, expected the handler object.
- `test/built-ins/Proxy/get-fn-realm-recursive.js`: 3677/160;
  expected true, got false.
- `test/built-ins/Function/prototype/bind/instance-construct-newtarget-self-reflect.js`:
  3487/196; newTarget was undefined, expected the function value.

These are negative observations, not ECMAScript negative-flag tests. A row-level
reached_test flag does not establish every assertion or both strict variants
executed. Primary strict variant, retry provenance, exact error bytes, and raw
receipt locations were not supplied to this planner; preserve them as unknown
until root pins the canonical records. No retry or variant identity is invented.
First error text identifies where execution stopped, not a causal bucket.

The full objective remains 11,778 unique ES2015 originals including 74 Intl.
This packet does not extend or replace the four-original timeout packet.

## Unchanged original source pins

Fully read originals from `/Users/thomas/Code/js2/test262`; SHA-256:

```text
f69a027216c275ed17696a137bc50658ee3a6022bc8476eccfaf92a8aeae6d7a  test/built-ins/Proxy/set/call-parameters-prototype-index.js
fb08fbf7b19066b012d3a5feef78f9f077dfc340c8985f1067f752e10592afc5  test/built-ins/Proxy/get-fn-realm-recursive.js
329e7733c6ca21e008f2ebc1ea1cd5e3a3f37e8f7bf2a633026acf51d5302c21  test/built-ins/Function/prototype/bind/instance-construct-newtarget-self-reflect.js
```

The indexed-set original includes `proxyTrapsHelper.js` (also fully read).
`allowProxyTraps` returns a new handler containing the override and throwing
defaults for all other traps. The test makes a holey `new Array(1)`, installs
the Proxy as its prototype, assigns index 0, then checks handler, target,
string key `"0"`, value 1, and original array receiver, in that order.
Undefined `_handler` is compatible with the trap never executing; it does
not prove the call bridge supplied an incorrect `this`.

The realm original creates four realm globals; constructs a Function in realm1,
sets its prototype to null, wraps it in realm2/realm3 Proxies, and constructs
realm4.Boolean with that twice-wrapped function as NewTarget. Both instanceof
realm1.Boolean and exact prototype identity to realm1.Boolean.prototype matter.
The first assertion can mask the second. Features: cross-realm, Reflect, Proxy.

The bound original defines A storing `new.target`, B=A.bind(), C=B.bind(),
then `Reflect.construct(C, [], C)`. It checks the captured value is A and
the resulting object's prototype is A.prototype. Features: Reflect, new.target.
No one may replace these originals, includes, assertions, or expectations.

## Ownership and custody

- Issue 6651, "ES2015 standalone → 100%: cluster execution plan from the
  2026-09-20 census", is the coordinating objective, not a blanket file lease.
- Issue 6770, "ES2015 standalone built-ins/Object + built-ins/Reflect residue",
  owns lazy trap lookup and shared reflective surfaces. Issue 6766, "a Proxy as
  [[Prototype]] — link carrier ... receiver-threaded [[Set]]", and issue 5316,
  "standalone proxy — r4 ... Reflect.set receiver, [[Construct]] NewTarget
  forwarding", own adjacent dispatch/prototype machinery. Seek their handover
  before any runtime patch; inspect array-overlay ownership as well.
- Issue 3371, "standalone: Reflect.construct arbitrary distinct NewTarget still
  refuses 33 ES2015 rows", explicitly lists recursive Proxy realms and bound
  NewTarget rows. Issue 6775, "built-ins misc residue (70 rows) ... bound-fn
  new.target ...", S15 explicitly names self-reflect. These semantic claims
  remain authoritative even where historical frontmatter or mechanisms lag.
- Issue 4274, "ES2015 true realms: replace `$262.createRealm` pseudo-realm with
  IR/runtime realm identity (128 files)", owns real realm identity. Coordinate
  its runtime/IR interface; do not adopt another machine's IR work.
- Read-only custody check of issue 6929, "function-tostring canonical residual
  plan", used `/Users/thomas/.codex/worktrees/6929-native-function-constructor-fix/js2`.
  HEAD is `6f9288f886034430e0166a4257dc8422e7276690`. The observed dirty tracked
  set is its plan, `expressions/new-super.ts`, and `expressions/non-constructable.ts`;
  untracked diagnostics are `issue-6929-constructor-live-binding-route.test.ts`
  and `issue-6929-method-getter-route.test.ts`. Its production diff recovers
  prototype-initialized bindings for live runtime constructor admission.
  It does not edit `construct-bound.ts` or implement bound NewTarget threading.
  Its comment about preserving bound-driver reservation order is not a fix
  for this original. No code or local pass was adopted or credited here.

Conclusion: do not dispatch an independent duplicate bound-constructor fix or
credit unpublished issue-6929 binding admission as one. Semantic ownership
(3371/6775 S15) and shared-file overlap (6929/new-super) are separate gates.
Network assignment/PR state was not refreshed under the freeze. Root must
complete its normal current-main/PR/claim checks before releasing a worker.

## Mechanism A: array hole write misses inherited Proxy [[Set]]

The standard requires a missing own descriptor to forward to the prototype's
[[Set]] with the original receiver; the Proxy trap call uses its handler as
this. See [OrdinarySetWithOwnDescriptor](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinarysetwithowndescriptor)
and [Proxy [[Set]]](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-proxy-object-internal-methods-and-internal-slots-set-p-v-receiver).

Frozen source supports an earlier-divergence hypothesis:

- `expressions/assignment.ts:5999` admits a vec; around 6015 it optionally
  routes through `emitOverlayRoutedElementSet`, otherwise numeric stores reach
  raw backing writes around 6189/6378. A length-one hole is not an own property.
- `typed-lane-overlay-route.ts:63` enables that route only from standalone plus
  accessor/delete/proto-index dirty flags. `array-holes.ts:124` marks explicit
  prototype numeric writes; around 217 Proxy presence marks proxy/ownKeys dirty.
  Do not assume these flags for the assembled original: the honest prelude
  can add other syntax and activate routes. Capture the actual decision later.
- `object-runtime-ordinary-set.ts:38` already describes a per-hop Proxy guard;
  `object-runtime-proxy.ts:1235` registers the explicit-receiver setter.
  Its trap arm around 372 loads F_PHANDLER and around 391 passes the original
  receiver parameter. This discourages guessing a missing handler argument.

After terminal census, first distinguish: prototype link not stored/read,
hole mistaken for own data, raw-store bypass, trap not selected, or callable
bridge losing this/arguments. Observe actual selected route and carrier, own
presence before/after, stored prototype identity, trap entry count, and all
five arguments. Run separate sound controls: direct Proxy write; ordinary
object inheriting Proxy; array hole versus existing own element; explicit
Reflect.set receiver; trap false/throw; inherited accessor; ordinary dense
array without custom prototype. Controls must assert values and effects.

Conditional repair boundary: a worker owns only the demonstrated array-write
admission or vec prototype/descriptor seam, plus focused tests and its issue.
Prefer wiring the existing receiver-aware operation for a possibly inherited
write, with already-evaluated receiver/key/value locals. Preserve own writable
elements, holes, length rules, assignment result, strict rejection, and abrupt
completion. Do not globally alter Proxy calls, scan test names, or force every
array store onto the general path without causal evidence. If the trap does
run with bad this, route that distinct result to the existing call/Proxy owner.

## Mechanism B: recursive constructor realm and Boolean prototype

GetPrototypeFromConstructor uses the constructor's realm when its prototype
is not an object; GetFunctionRealm recursively follows bound/proxy targets and
checks revoked proxies. See [GetFunctionRealm](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-getfunctionrealm)
and [GetPrototypeFromConstructor](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-getprototypefromconstructor).

Frozen `scripts/test262-fyi-runtime.js:15–81` creates fresh global wrapper
objects but forwards Boolean, Function, and Proxy from globalThis; only error
constructors are separately minted. Thus an unchanged row becoming green
under this shim alone would not demonstrate distinct realm identity.
`object-runtime-proxy-construct-chain.ts:29–36` also documents a live-proxy
nonobject-prototype fallback that cannot reach the realm's default prototype.
`expressions/reflect-construct-newtarget.ts:138` reads `.prototype` then uses
`construct-default-proto.ts` to normalize null to an ordinary implicit
Object.prototype terminal. Neither mechanism establishes a realm1 Boolean
prototype. These are source-supported gaps, not the observed first runtime
divergence of this exact Boolean construct route.

First diagnose separately: identities of the four intrinsic graphs, actual
Function carrier/realm, each Proxy target, null prototype propagation,
Boolean native/provider construct route, final Boolean brand and prototype,
then instanceof implementation. A same-realm no-Proxy/one-Proxy/two-Proxy
matrix isolates constructor forwarding from true foreign identity. Add a
custom object prototype, primitive fallback, getter throw, and revocation
during prototype access. Never turn these diagnostics into substitute passes.

Implementation belongs to 4274 plus the 3371 constructor consumer contract:
real realm identity on function values; recursive target-realm lookup; actual
per-realm intrinsic default selected for Boolean; preserved brand and slots.
The diagnostic worker initially owns observations only. Release a concrete
constructor leaf/interface patch only after the realm owner supplies its
contract and root grants that file boundary. No copied current-global answer,
hard-coded instanceof result, or harness remapping counts as the repair.

## Mechanism C: bound [[Construct]] loses the NewTarget value frame

[Bound [[Construct]]](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-bound-function-exotic-objects-construct-argumentslist-newtarget)
replaces NewTarget with the target at each layer where it equals that bound
function. In this original C becomes B, then A. A distinct NewTarget must
survive unchanged; bound arguments prepend and bound this is ignored.

Frozen `construct-bound.ts:158` reserves only `(callee, args)`; its loop around
442 unwraps targets/prepends arguments, then around 486 obtains target.prototype
and around 498 calls `__apply_closure` without a NewTarget frame. This is a
strong candidate for the undefined value if that driver is selected.

Crucial update to historical S15: `closures/ordinary-new-target.ts` ALREADY
provides `__ordinary_construct_target`, activation-local `#new.target`, a
consume-and-clear initializer, and exception-safe `ordinaryConstructTargetFrame`.
`native-construct.ts:428/812` uses the frame; `expressions.ts:1687` reads that
local before the fallback value reader. The older claim that every ordinary
function only has an i32 class ID is stale. Do not introduce another global.
The current frame publishes local 0 as target; explicit distinct NewTarget
requires a reviewed operand interface rather than blindly reusing local 0.

After owner handover, trace Reflect.construct(C,[],C) to its actual branch and
driver, verify both bound layers and the target activation reader. Initial
source ownership proposal: `construct-bound.ts` and the smallest shared
ordinary-target-frame operand extension; minimal Reflect.construct call-site
wiring only if the trace requires it. Coordinate all consumers before any ABI
change; preserve existing two-argument callers by an explicit default or
adapter, not an overloaded null value that can hide a real invalid NewTarget.
No broad new-super rewrite is authorized by this packet.

Use a per-layer effective-NewTarget local and existing native construction
semantics, including appropriate prototype selection. Publish the effective
value only around the actual ordinary target activation, restoring on throws
and nested calls; never expose it during prototype getters or argument work.
Retain constructor validation, object-return override, ignored bound this,
argument order, recursion, and native/class/proxy target distinctions. If
support needs a broader general Construct ABI, return that explicit dependency
to the owner instead of silently routing every target through [[Call]].

Controls: unbound new A; one/two bound layers; self-new and self-reflect;
distinct NewTarget with different prototype; NewTarget equal to an inner bound
layer; bare calls before/after; nested construction; throwing constructor then
plain call; lexical arrow new.target; bound arguments; returned object; bound
nonconstructor rejection. Read current test originals before selecting exact
neighbor paths. Current diagnostics and sibling failures are not new passes.

## Verification and release protocol

1. Wait for terminal census and root's explicit heavy-lease release. Pin raw
   receipts, per-variant/retry identities, honest-harness assembly, providers,
   runtime identity, and original hashes. Preserve every unknown as unknown.
2. Complete numeric allocation/claim and owner handovers. One Sol6.1 worker per
   released non-overlapping mechanism; serialize shared constructor/runtime
   edits. This document does not spawn workers or make those claims.
3. Run unchanged originals and meaningful controls through the maintained
   canonical standalone path. Record exact HEAD plus dirty-source digest,
   lane, harness, oracle 14, providers auto, strict both, and all outcomes.
   A missing row, timeout, invalid artifact, or unreached assertion is not PASS.
4. For each actual fix, perform unchanged-original A–C–A on identical pinned
   configuration: frozen baseline A, candidate C, restored baseline A. If
   integration changes the base, give that base its own A epoch. Restore only
   owned changes in an isolated checkout; never mutate the live EXEC tree.
   Include positive controls plus a diagnostic failure sentinel to prove the
   instrument still reports failure. Do not edit original assertions.
5. Keep compile, execution, strict-variant, retry, and artifact identities
   separate. Record first divergence and later masked failures. Preserve the
   three mechanisms separately unless same-epoch evidence proves a common one.
6. Run proportionate neighboring controls and repository-required gates after
   source validation; root decides broader execution scheduling. No host fallback,
   helper-answer substitution, provider replacement, exclusions, weaker asserts,
   timeout expansion, or partial-count extrapolation. Only measured original
   transitions receive credit; realm authenticity needs its own identity proof.
7. Publication remains pending review and current ownership checks. No commit,
   PR, merge, or task completion is claimed by this source-only handoff.

## Current source SHA-256 pins (EXEC)

```text
2fe05439fb7cb33ce3e677d56e78acf838705dacb25f677def1562f1fb8b4900  src/codegen/construct-bound.ts
920a6c1e0dc351b35d1ea183b5b67fba4f4807b932e44076b42ba321c2a03826  src/codegen/closures/ordinary-new-target.ts
0f3bf08c77a6cf5efe9d7a9177ed5aac845d51cc1a3191a82e9b258a4729ca2f  src/codegen/native-construct.ts
0fc987ac9bfa1e11fcafadbf4a1afac5ca055f5b766c7f69acc97798af0d5a8a  src/codegen/expressions.ts
ed3b7435a4c0ce3c8e8ba6ba9512f398cc3a50abdd94361ac8fbb9919ca95a87  src/codegen/expressions/new-target-value.ts
f98f5c5938294b60aab551ea873b1e31e1a7d0d290b10d2608731404fbdb83bc  src/codegen/expressions/assignment.ts
04d8d48a4e1c2130c62ad0ef8ca0aaa207114561a4d44ce90d511d08588d23f2  src/codegen/typed-lane-overlay-route.ts
438ae563cd41ea337a818da8e3d0b317d00fbd2f36db86cb824a95c8cdc45357  src/codegen/array-holes.ts
a64b0209aec8e46acdc3590f0f2a8a6e53d30c2d70e545cf23917477de89161a  src/codegen/object-runtime-proxy.ts
5c5784882eca1bb0c474a1d1ffe6d9b55c09867fc2c4f913c7ba4d5e529d6a9a  src/codegen/object-runtime-ordinary-set.ts
dfc1485533fac46c2012a9d4f1f8aa5d8f195323f0a40f7b88a5314b43273f2b  src/codegen/object-runtime-proxy-construct-chain.ts
13f3a25fdbdabba3d7ebf71570df711d2ee0a64ba14934880a4a6a242b6d9ee0  src/codegen/expressions/reflect-construct-newtarget.ts
fda934374318f6933cdec543faf0868b0c1be1554bd5c5ad90fa0de99454a177  scripts/test262-fyi-runtime.js
```

## 2026-10-10 additional unchanged-original bound-target negative

Root's same frozen census epoch now records
`test/built-ins/Function/prototype/bind/instance-construct-newtarget-boundtarget-bound.js`
FAIL at03:35:25 local, honest oracle14/providersauto, standard official
standalone strictboth, reached_test true, compile13074ms/exec843ms. First
visible assertion expects the native function value but receives undefined.
Original SHA256:
`29e76bb592c8e83a70abc1c810b75573fc4f516c6774d811e0035e67af1e8509`.
Root fully read the unchanged original: A captures new.target; B=A.bind();
C=B.bind(); Reflect.construct(C,[],B); then captured value must equal A and
the instance prototype must equal A.prototype. Unlike the earlier self-reflect
original, explicit NewTarget is the INNER bound function B, not outer C.

Keep this as a distinct original in the already planned per-layer NewTarget
matrix, not an error-signature-derived cause or new implementation claim.
At C, NewTarget B must survive because C differs; at B it must become A.
The second prototype assertion and actual strict-variant calls remain
unproven by the first failing row. Do not collapse all incoming NewTargets
directly to the final unwrapped target; distinct unrelated NewTarget controls
must still retain their own identity/prototype. Existing constructor/Reflect
ownership and terminal-census heavy-lease prerequisites remain unchanged.

At1248/11778 unique originals, canonical partial is1225PASS16FAIL1CE6timeouts,
10530unsettled, zero accounting problems. This is LIVE_PARTIAL_NOT_COMPLETION,
not final scope verification or retry-free acceptance. No original, source,
runner, claim, PR or production branch was changed for this handoff.

## 2026-10-10 single-Proxy Array constructor-realm negative

Same frozen epoch records `test/built-ins/Proxy/get-fn-realm.js` FAIL04:03:18
local, honest14auto standard official standalone strictboth,
reached_test true, compile10045ms/exec1751ms. First actual error:
`Test262Error: Expected true but got false`.
Original SHA256:
`476e4df4f17891f95bc31b5e57e4f0b4699ebe1aa80b4d8d1812a3f203216221`.
Root fully read original: three realm globals; realm1.Function newTarget with
prototype=false; realm2.Proxy around it; Reflect.construct(realm3.Array,[],
newTargetProxy); then instanceof realm1.Array and exact realm1.Array.prototype.
Unlike the earlier recursive original, this uses one Proxy and Array rather
than two Proxies and Boolean. Only the first instanceof assertion's failure
is established; exact prototype identity and actual variant execution remain
unknown, not independently failed or passed.

Route through existing mechanismB/4274/3371 semantic ownership, not a new
claim. Add this unchanged original to the explicit single-vs-nested Proxy,
Array-vs-Boolean constructor/default-prototype matrix; preserve actual array
brand/contents, target-function defining realm and original error/realm graphs.
Do not collapse foreign intrinsics or hardcode instanceof true. Diagnose
intrinsic identities, ordinary Function's primitive prototype, Proxy target
realm, actual Reflect.construct default-prototype selection, final array
prototype and instanceof separately before drawing a causal boundary.

At1428/11778 originals, partial1401PASS20FAIL1CE6timeouts has zero accounting
problems,10350unsettled; SAME62071/shard1PID53943 remainsLIVE. No source,
runner, original, Git, claim, PR-readiness or heavy-execution change made here.

## 2026-10-10 explicit unbound-target NewTarget through nested bindings

Frozen epoch38901fff records
`test/built-ins/Function/prototype/bind/instance-construct-newtarget-boundtarget.js`
FAIL05:30:08 local, honest14/auto standard official standalone strictboth,
reachedtrue,compile2782ms/exec55ms: captured newTarget undefined versus A.
OriginalSHA
`4e9514ea1011a057438267bf30499b5f2639dc59ab566d2bf835c179aa09c358`.
Root fully read original: A captures new.target; B=A.bind(),C=B.bind();
Reflect.construct(C,[],A) must retain A and create A.prototype instance.
Unlike earlier explicit B case, incoming NewTarget A is already the final
UNBOUND target. At both C and B, the bound function differs from A, so A must
survive unchanged; no replacement is needed. The prototype assertion and actual
variant calls remain unverified after the first failure.

Add this distinct original to the existing per-layer NewTarget matrix alongside
outer C, inner B and unrelated NewTarget controls. Compare captured invocation
frame and final prototype separately; do not collapse every NewTarget to A or
infer a common cause solely from identical undefined text. Existing constructor/
Reflect ownership and root execution gates stand; no new implementation claim.
At2161/11778:2117PASS37FAIL1CE6timeouts9617unsettled0accountingproblems,
SAME62071 live shard2PID13477. Canonical negative44 tracked; no source/runner/
original/Git/claim/readiness/heavy mutation.
