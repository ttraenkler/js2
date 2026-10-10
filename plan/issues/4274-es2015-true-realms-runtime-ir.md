---
id: 4274
title: "ES2015 true realms: replace `$262.createRealm` pseudo-realm with IR/runtime realm identity (128 files)"
status: ready
sprint: current
created: 2026-08-09
updated: 2026-09-20
priority: high
horizon: xl
feasibility: hard
reasoning_effort: max
model: gpt-5.6-terra
task_type: feature
area: ir, runtime, test-runner
language_feature: cross-realm
es_edition: 2015
goal: es6
parent: 4273
related: [500, 1355, 1523, 2763, 2866, 2940, 2996, 3371]
assignee: "ttraenkler/codex-es6-realms"
test262_count: 128
origin: "2026-08-09 exact-ES2015 cross-realm feature cohort: GC 128/128 non-pass; standalone 121/128 non-pass. The completed $262 harness issue supplies only an empty self-referential object, not a distinct ECMAScript Realm."
---

# #4274 — Give `$262.createRealm()` real realm identity

## 2026-10-10 frozen-census String valueOf handoff

This is source grounding and a current negative receipt, not an implementation
claim or measured root cause. Existing IR/runtime coordination and ownership
gates above/below remain in force; no production files are adopted.

The live standalone census at `38901fff8f9a5ca029cbefcdaec5d8dd40949861`
(source digest `a6464ffb87f98d4984d2454a14bc95bd80c035c88e7905bd1465b484537738c8`)
recorded FAIL for `test/built-ins/String/prototype/valueOf/non-generic-realm.js`:
honest oracle 14, auto providers, strict both, reached_test true,
compile_ms 6511, exec_ms 198; error `Expected a  but got a undefined`.
Original SHA-256:
`1ea862a211937e790c07f3e66b5db8885ffa7289bb037e4810ea39f2ee54b067`.
Root fully read the unchanged original: cross-realm feature, no extra includes,
flags or negative expectation; eight `assert.throws(other.TypeError, ...)`
checks use the extracted foreign String valueOf. The row does not identify
which receiver failed or prove that all eight callbacks or both variants ran.

Current source differs materially from older empty-shim diagnoses:

- The maintained honest assembler's `harnessSourceParts` prepends
  `scripts/test262-fyi-runtime.js`, then the original assert/sta harness.
  The runtime shim forwards `String: globalThis.String` but independently
  mints anonymous error constructors through `mkerr()`. This is still not a
  realm-local intrinsic graph; do not replace the foreign TypeError with the
  current TypeError to make this row pass.
- `standalone-global-object-carriers.ts` already includes String in its
  runtime-eval-module extra seed list. The old missing-String hypothesis alone
  is therefore not a current-source diagnosis; actual carrier/readback and
  emitted routing remain to be observed.
- `array-object-proto.ts` routes reflective String valueOf to the wrapper
  this-value body; `wrapper-proto-value-of.ts` emits the native TypeError tail
  via the canonical throw helper. Its source signature has no foreign-realm
  parameter. This motivates, but does not prove, an error-realm loss hypothesis.
- In the original `assert.js`, the observed message shape belongs to the
  mismatched-constructor catch branch, not the no-exception branch. This is
  source-level discrimination only: lost constructor reads, a wrong thrown
  object, wrong receiver routing, or incorrect compiled harness behavior must
  still be distinguished with separate controls and actual runtime evidence.

The next diagnostic packet must separately observe foreign intrinsic identity,
extracted method identity/callability, caught object/constructor/prototype,
current-versus-foreign error constructors, and correct same-realm String
primitive/wrapper results. Preserve the unmodified original as the conformance
oracle; diagnostic probes are not substitute passes. A genuine foreign method
must execute in its own realm, including error allocation; see
[String valueOf/ThisStringValue](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.valueof)
and [builtin call realm selection](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-builtincallorconstruct).

Source pins at this execution epoch:

```text
fda934374318f6933cdec543faf0868b0c1be1554bd5c5ad90fa0de99454a177 scripts/test262-fyi-runtime.js
a7a9f9a3ebb0fe9ab3f25ee1e4a11dcde734561174de3d203e487a46e57d90f0 tests/test262-original-harness.ts
206e274ca325eb8a652e3911c3fbd090e2480d11ed7579dc17a5d17a2360ed48 test262/harness/assert.js
86211a25e0e158323e7a66a01b720e22ebe72522a884639ab7e16085597cfae8 src/codegen/wrapper-proto-value-of.ts
4914731198d91659127016d691b2a9c3da34922a95f546aaf0994b5a8e48c42a src/codegen/standalone-global-object-carriers.ts
c8436a1c83563d73e6f585bb6d852049c780780ec23ba0633d322a1d8614190d src/codegen/js-errors.ts
```

No tests, compiler, parser, builds, provider replacement, timeout changes, source
integration, Git mutation or publication were performed for this handoff.
Heavy execution is deferred while root's frozen census session 62071 remains
live. Requested Astra planner continuation was refused by the agent thread
limit; this root note does not replace the required Astra implementation plan
or grant a new Sol implementation lane. The canonical full ES2015 goal remains
11,778 unique originals INCLUDING all 74 Intl; this row/cohort is not completion.

## 2026-09-20 measured Symbol-realm handoff

The two official ES2015 originals `built-ins/Symbol/for/cross-realm.js`
and `built-ins/Symbol/keyFor/cross-realm.js` were rerun on upstream
`62221769a87acdc32759c656702eede64936feb5` and the isolated #5269
description-coercion candidate. Both runs finish **0 pass / 2 fail** with
`TypeError: Cannot read properties of undefined (reading 'for')` when using
the foreign `OSymbol`. This is an existing failure, not a regression attributed
to the description patch. Manifest SHA-256:
`2a4648073a41b6739f26bd5f72f72a09a419e9a14d796452eed8fc3bc55c7680`.

Both worktrees independently built and canary-verified their QuickJS adapters
through `scripts/build-quickjs-eval-provider.mjs`; the pinned artifact key is
`2e2d7736713beeda`, artifact SHA-256
`073742801ba76347371be277f6d275488badce1df6bfb480741548ec2a279d45`.
The earlier missing-provider errors are superseded by these measured runtime
failures. Exact terminal logs:

- `/private/tmp/js2-5269-symbol-matched-base-terra-20260920-crossrealm-baseline-20260920.log`
- `/private/tmp/js2-5269-symbol-controls-terra-20260920-crossrealm-candidate-20260920.log`

**Current harness attribution:** `run-test262-paths.mts --isolate --standalone`
calls `runTest262File`, which assembles the original harness through
`tests/test262-original-harness.ts::harnessSourceParts`. That route prepends
`scripts/test262-fyi-runtime.js`, whose `createRealm` currently forwards
`Symbol: globalThis.Symbol`. The empty `createRealm` stub in the deprecated
`wrapTest` path is not the cause demonstrated by this run. The exact lowering
that exposes the forwarded Symbol as undefined remains to be isolated.

Next implementation plan, subject to the existing IR coordination hold:

1. Reproduce the two originals plus direct `globalThis.Symbol` and returned
   realm-global property controls, preserving the authoritative harness route.
2. Trace the failed global/property lowering separately from realm identity.
   Repairing undefined exposure alone cannot satisfy the originals: they also
   require distinct foreign `Symbol.for`/`Symbol.keyFor` function identities.
3. Implement realm-local intrinsic facades with the existing planned explicit
   realm carrier and shared agent-level Symbol registry. Do not make the tests
   appear green by aliasing the current realm's Symbol namespace or weakening
   their identity assertions.
4. Rerun the frozen realm cohorts and ordinary current-realm Symbol controls;
   record exact per-file deltas. These two rows do not update the historical
   128/129-row cohort totals below.

This is a documentation handoff, not a new implementation claim or permission
to modify the parallel machine's IR migration.

## 2026-09-13 redispatch plan

**Coordination hold:** the user identified a parallel IR-migration session.
Do not claim or start this prepared-IR/runtime implementation until its active
owner agrees on boundaries and landing order. The older app task titled
`IR migration` confirmed it has handed off and cannot certify its successor's
reservations. This is queued design work, not an active implementation claim.

The canonical standalone baseline produced at
`e0023dbbe6c37e15c1f56ed0c8bc8d15d0afbac3` (JSONL SHA-256
`07c89a5c2626f3312ff611f008a69ed6d8826e9802da024df39726ddabc1e9ba`)
contains 129 official ES2015 files whose original source calls
`$262.createRealm`: 25 pass, 103 fail, and one compile error. This source-call
selection has been reconciled against the historical 128-file feature cohort.
The tagged cohort retains exactly the historical manifest hash below and now
has 25 pass, 102 fail, and one compile error. The sole additional source-call
file is `test/built-ins/Proxy/revocable/tco-fn-realm.js` (fail). The sorted
129-path source-call manifest, using `test/` prefixes and a final newline, has
SHA-256 `6fd14b2192e62853ae0c039b2efdd9e72c23c2e7bf43a917f4e7677f89e4b7a6`.
Retain both exact manifests; do not silently change the acceptance population.
The 104 nonpasses include 24 Proxy, 13 Function, 13 Symbol, ten Array, eight
RegExp, and six NativeErrors rows. These are overlapping family symptoms;
they do not establish that one realm change fixes all 104.

The existing claim was released; the 2026-09-13 live check found no active
owner. Keep the issue ready until a worker claims the first implementation
slice. Implement with Terra Max in an isolated worktree per user routing.

The next predispatch read at upstream
`e06f76745bb0008550d17df3c0c0dae35bed6c01` again found no active claim
(the old claim remains released) and no open PR matching issue 4274.
PR #5841 is open at `4a0f8a92c279a903e15762a77c9cc23cd5211c23` and
PR #5847 is open at `c0ca1a551012bc78ff491dae66068227e82c1bde`.
They own current-global/provider outlining and accessor population, not
distinct foreign-realm identity. Both touch context, index, registry, and
link-boundary modules; #5847 adds `native-globalthis-outline.ts`. Coordinate
those shared integration seams and keep the realm carrier in a separate
owner module. This read is not a claim or authorization to overwrite either
PR's implementation; recheck ownership when a worker actually starts.

Before implementing, reproduce two realm-identity failures and passing
controls using the maintained runner. Re-ground the explicit realm-carrier
and prepared-IR design below against current compiler/runtime ownership.
Deliver the carrier and identity controls first, then independently measured
constructor/prototype and shared-Symbol-registry behavior. Do not replace
foreign intrinsics with current-realm aliases or weaken the harness oracle.
Audit open global-realm/Temporal seed PRs #5847 and #5841 for ownership overlap;
their provider initialization work is not this separate cross-realm identity
implementation. Each finished slice needs an upstream PR and recorded exact
before/after rows, while the full issue remains open until all criteria pass.

Source ownership was rechecked at the pinned baseline before redispatch:
`tests/test262-runner.ts` still emits an empty self-referential realm global.
`src/codegen/property-access-dispatch.ts::tryConstructorPrototypeIdentity`
still aliases the foreign TypedArray prototype shape to current-realm
singletons. Also audit
`src/codegen/proxy-value-provenance.ts::isRealmGlobalExpression`: it treats a
`.global` read from a method named `createRealm` as native Proxy provenance.
This additional shortcut means a passing Proxy construction row does not
prove foreign constructor or error-realm identity. Preserve its ordinary
Proxy behavior when replacing the alias with real realm provenance; include
an unrelated user-defined `createRealm` method as a negative provenance
control. Existing canonical-global plumbing serves the current realm and
must not be mistaken for a multi-realm carrier merely because its name
contains `realm`.

## Exact impact

Against #4273's pinned exact-ES2015 population, the `cross-realm` feature tag
selects **128 files**. The sorted path list has SHA-256
`abb9905b0a56748eb3be2100d80d7cd408747bc5453ecce61f9885ac1f1d2aff`.

| Lane | Pass | Fail | Compile error | Non-pass |
| --- | ---: | ---: | ---: | ---: |
| GC/host | 0 | 128 | 0 | **128** |
| Standalone | 7 | 92 | 29 | **121** |

The GC failures are unusually concentrated: 112 report `Cannot access property
on null or undefined`, with another five location-decorated forms of the same
error. In standalone, the pseudo-realm fans out into downstream failures:

- 46 `__module_init` null dereferences;
- 21 missing expected TypeErrors;
- 15 values observed as `undefined` instead of the foreign object;
- 14 distinct-NewTarget `Reflect.construct` refusals across three signatures;
- 7 Array harness concat/import leaks; and
- smaller `instanceof`, constructor, and object-carrier failures.

All 128 files call `createRealm()` and read `.global`. Within the same cohort,
58 inspect prototypes, 42 call `Reflect.construct`, 39 exercise Proxy, seven
use `instanceof`, and two exercise `Symbol.for`. The largest path families are
Proxy (36), Array (16), Function (13), Symbol (13), RegExp (8), NativeErrors
(6), and TypedArray constructors (5).

The seven standalone passes are not evidence of real realm support. They pass
despite the stub or through narrow current-realm shortcuts; the cohort-level
identity and intrinsic requirements remain absent.

## Root cause

#1523 correctly made `$262` available, but deliberately implemented
`createRealm()` as an empty object whose `global` points back to itself:

```ts
const realm: any = {};
realm.global = realm;
```

That object has no realm-local Array, Object, Function, Error, Proxy, RegExp,
TypedArray, or other intrinsic constructors and prototypes. Consequently
`$262.createRealm().global.Array` and similar reads are `undefined`, and
prototype/constructor assertions fail before testing the intended operation.

Standalone also contains a narrow property-access shortcut that treats a
binding initialised from `$262.createRealm().global` as the current native
global for a TypedArray constructor-prototype shape. That was useful for
unblocking #3371, but it explicitly collapses the distinction this cohort
tests. Adding more constructor names to the empty object or extending this
shortcut would create more pseudo-passes while preserving the root defect.

An ECMAScript Realm needs distinct intrinsic object identities and its own
global object, while sharing agent-level facilities where the specification
requires it. In particular, constructors and prototypes are realm-local, but
the global Symbol registry used by `Symbol.for`/`Symbol.keyFor` is shared across
realms in the same agent. This cannot be represented faithfully by a plain
empty `$Object` or by aliasing every foreign intrinsic to the current one.

## Required IR/runtime design

This is an IR/runtime substrate, not a test-runner-only shim.

1. Add an explicit realm carrier containing a stable realm identity, realm
   global, and intrinsic constructor/prototype table. `createRealm` allocates a
   new carrier; repeated access to its global and intrinsics is identity-stable.
2. Add prepared IR operations/providers for realm creation, global access, and
   intrinsic lookup. The `$262` preamble may call those providers, but it must
   not embed compiler filename/path knowledge or construct the realm by a
   legacy-only object-literal special case.
3. Represent each foreign constructor as a callable/constructible facade tied
   to its realm carrier. Its `.prototype` is the corresponding foreign
   intrinsic, distinct from the current realm's intrinsic, while its executable
   implementation can share code.
4. Propagate the selected realm through allocation and construction, including
   `Reflect.construct(target, args, newTarget)`. Objects must receive the
   correct foreign prototype, and errors created by realm-defined operations
   must carry the correct foreign Error prototype.
5. Make dynamic property access, Proxy trap calls, `instanceof`,
   `Object.getPrototypeOf`, and constructor/prototype reads understand realm
   facades through normal runtime MOP dispatch. Remove the current-realm
   TypedArray shortcut once the genuine path covers it.
6. Keep well-known symbols and the `Symbol.for` registry in the correct
   agent-wide store so same-key registry Symbols compare equal across realm
   carriers, while ordinary `Symbol()` calls still create unique identities.
7. Preserve host and standalone parity. Host embedding may delegate realm
   execution to a host realm only if values cross the boundary through the same
   explicit carrier/identity contract; standalone must require no `env::`
   imports.

Dynamic source evaluation is not exercised by this exact 128-file cohort, so a
general `evalScript` engine is not required for the first scored slice. It must
remain a separately explicit capability rather than being faked as a no-op.

## Delivery slices

1. **Realm carrier and identity controls:** create two realms; prove distinct
   globals/intrinsics, stable repeated reads, and shared `Symbol.for` registry.
2. **Constructor/prototype allocation:** Array/Object/Function and native Error
   families, then the `proto-from-ctor-realm` tests that do not need Proxy.
3. **Reflect construction and TypedArray facades:** preserve distinct
   NewTarget/prototype semantics without current-realm aliases.
4. **Proxy and error-realm semantics:** route traps, invariant errors, and
   thrown TypeErrors through the correct realm.
5. **Residual built-ins:** RegExp, Date, JSON, Map/Set, Promise, and the small
   language tail; rerank after each exact two-lane measurement.

Each slice must prove prepared IR ownership for its realm operations. A test
that passes only because foreign and current identities were collapsed is a
regression, not a win.

## Acceptance criteria

### 2026-10-10 ThrowTypeError per-realm negative

Same frozen standalone epoch38901fff records
`test/built-ins/ThrowTypeError/distinct-cross-realm.js` FAIL04:06:56 local,
honest14auto standard official strictboth reachedtrue,compile5384exec244,
`TypeError: value is not a constructor`. OriginalSHA
`7a8c4f7ed4dd85e5fb8393cc1c8841999e1ed366f6311ce0f027fecc4bc3890e`.
Root fully read unchanged original: local strict arguments plus two foreign
Function constructions producing strict arguments; own callee getters;
correct local/foreign error constructors; local-vs-foreign ThrowTypeError
distinctness and repeated getter stability. The original reads otherArgs
(not otherArgs2) for the second getter; preserve original, do not strengthen
or edit scored assertions. Actual failure ordinal/constructor route is not
identified by this error; do not claim per-realm uniqueness checks executed.

Existing5158 explicitly defers this test to genuine4274realms. Coordinate
Function provider construction/arguments poison accessor/foreign error identity
owners; genuine per-realm ThrowTypeError must not be synthesized solely to
answer this test, nor foreign/current TypeErrors collapsed. Existing ownership
and root release prerequisites remain. Second shard now terminal with721P15F
736registered/canonical; aggregate1472/11778 has1437P28F1CE6timeouts and is
unfinished. No source/runner/original/Git/claim/heavy/PR-readiness change.

### 2026-10-10 RegExp unicode cross-realm receiver negative

Same frozen standalone epoch38901fff8f9a5ca029cbefcdaec5d8dd40949861
records `test/built-ins/RegExp/prototype/unicode/cross-realm.js` FAIL04:01:12
local, honest14auto standard official strictboth, reached_test true,
compile9847ms/exec756ms. Actual first error:
`Test262Error: cross-realm RegExp.prototype Expected a TypeError to be thrown but no exception was thrown at all`.
Original SHA256
`48d8a4700997cfdfde20c5aa365bdab756861ebf3cb2d5bf892332f5aedb0fc9`.
Root fully read unchanged original: extract current RegExp.prototype.unicode
getter; obtain foreign prototype/getter; current getter on foreign prototype
must throw current TypeError; foreign getter on current prototype must throw
foreign TypeError. The first call fails for not throwing; the reciprocal call
and error-constructor identity assertions are masked, not established passes.

Preserve this distinct test under the existing genuine-realm owner; coordinate
RegExp accessor/intrinsic identity ownership before implementation. Trace actual
foreign/current prototype distinction, getter identity/defining realm, receiver
slot check and intrinsic-prototype exemption. Missing TypeError is not proof
which route failed: an alias collapsing foreign/current prototypes could make
an otherwise special intrinsic case appear valid. A universal prototype throw
or foreign/current TypeError alias is not an acceptable repair. Controls must
include current intrinsic getter on its own prototype, real current/foreign
RegExp instances/flags, unrelated objects, reciprocal prototype calls and exact
caught error constructor/prototype identities through the maintained runner.

At1419/11778 originals, partial1393PASS19FAIL1CE6timeouts has zero accounting
problems,10359unsettled. SAME62071/shard1PID53943 confirmedlive, fullverification
unfinished. No source/runner/original/Git/IR claim/heavy execution/PR readiness
change made for this handoff; existing ownership/release requirements remain.

### 2026-10-10 frozen-census foreign class-call error handoff

Same-epoch neighboring positive receipt, not genuine-realm completion:
`test/built-ins/TypedArrayConstructors/ctors/typedarray-arg/proto-from-ctor-realm.js`
PASS at03:39:51 local, honest14auto standard official standalone strictboth,
reached_test true, compile28083ms/exec641ms, originalSHA
`15cfe4861a6823ddcac164ba0bdc1beb9fa4407f0749b1bb9c4d69389f3eb6f1`.
Root fully read original: foreign Function with null.prototype used as
NewTarget for Reflect.construct(TA,[new TA()],C), comparing result prototype
with other[TA.name].prototype. Source requests testWithTypedArrayConstructors
with passthrough factories; runtime callback counts and both-variant execution
are not established by the row. Existing current-realm TypedArray alias caveat
still applies: that comparison alone does not prove foreign/current identities
are distinct. Preserve this baseline positive during real-realm replacement;
do not weaken the negative foreign class-call test or count this as a fix.

The same frozen standalone census records
`test/built-ins/Function/internals/Call/class-ctor-realm.js` FAIL at03:35:41
local, honest oracle14/providersauto, standard official strictboth,
reached_test true, compile13313ms/exec1630ms. Exact first error:
`Test262Error: Expected a  but got a TypeError`.
Original SHA256:
`c4c3528193adef8fa55841e19930d9dbdf897a52a58a913089f200571f875732`.
Root fully read the unchanged original: createRealm(); obtain C by foreign
global.eval('(class {})'); capture foreign global.TypeError; assert.throws
that exact constructor when C is called without new. This tests defining-realm
class [[Call]] error identity, not new.target or a bound function's [[Construct]].

The error establishes the original failed its throw assertion; it does not
prove the complete foreign evaluation/class-carrier route or which constructor
read is wrong. Existing genuine-realm plan/IR ownership remains load-bearing:
preserve the foreign defining realm through class call rejection and allocate
its genuine TypeError. Aliasing foreign TypeError to the current constructor,
answer-shaped harness substitution, or changing original asserts is not a fix.
After owner handover/root execution release, compare direct/current and
foreign class-call controls, caught constructor/prototype identity, and the
eval-produced class carrier before changing the smallest responsible route.

At1248/11778 unique originals, partial1225PASS16FAIL1CE6timeouts with zero
accounting problems is unfinished, not acceptance. No source/Git/IR claim,
heavy execution, restart, PR readiness or completion change made here.

- [ ] The pinned 128-file list and both-lane baseline above are reproduced
      before implementation; missing rows or a mismatched Test262 gitlink fail
      the measurement loudly.
- [ ] `$262.createRealm()` returns a distinct, identity-stable realm carrier
      with a distinct global and realm-local intrinsic constructor/prototype
      graph.
- [ ] Cross-realm construction, prototype selection, ordinary property access,
      Proxy dispatch, `instanceof`, and Error identity use normal IR/runtime
      semantics rather than Test262-shaped shortcuts.
- [ ] `Symbol.for`/`Symbol.keyFor` use one agent-wide registry across realms;
      ordinary Symbols remain unique.
- [ ] The current-realm TypedArray prototype alias is removed when its genuine
      realm-backed replacement lands.
- [ ] The exact 128-file cohort is rerun in both lanes after every slice, with
      file-level flips and regressions reported. The eventual target is 128/128
      pass in both lanes with zero new `env::` imports in standalone.
- [ ] Targeted realm terminals are owned once by prepared IR; no targeted body
      is also emitted by legacy codegen.

### 2026-10-10 frozen-census revoked Proxy tail-call realm negative

Existing tracked original `test/built-ins/Proxy/revocable/tco-fn-realm.js`
now has a fresh FAIL at 04:52:50 local in frozen epoch 38901fff, honest
oracle 14, providers auto, standard official standalone, strict only,
reached_test true, compile 4374 ms and execution 175 ms. Exact error:
`Test262Error: Expected a  but got a TypeError`. Original SHA-256:
`dfd2d5bfc39ea689f7bb9fcde6a6f72644a8a9ba64a982a38b36e778570a11b3`.

Root fully read the unchanged original: create a foreign realm; evaluate a
function there which creates Proxy.revocable, revokes it, and returns proxy()
in tail position. Calling that foreign function must throw the exact foreign
global.TypeError accepted by assert.throws. This is not the earlier Proxy
constructor default-prototype test, nor proof that a revoked call succeeded.
The visible TypeError means the throw assertion rejected the actual result;
the foreign expected constructor read, evaluated function's defining realm,
revocation/dispatch route, tail-call transition and actual error constructor
identity remain separate attribution questions.

After actual ownership handover and root execution release, compare same-realm
and genuine foreign revoked calls, tail and non-tail calls, direct callable
and nested Proxy controls, and caught constructor/prototype identity. Preserve
the defining realm across the call transition and allocate its genuine error.
Do not alias foreign TypeError to the current intrinsic, suppress revocation,
rewrite the original/assertion, or claim a tail-call implementation from this
row alone. Existing shared realm/IR ownership and acceptance requirements stand.

At 1814/11778 originals: 1777 PASS, 30 FAIL, 1 compile_error, 6 timeouts;
9964 unsettled and no accounting problems. SAME session 62071 returned actual
running-not-final shard-2/PID13477. This adds the 37th canonical non-pass;
no source, runner, original, Git, claim, PR readiness or heavy execution changed.

### 2026-10-10 frozen-census foreign Proxy descriptor-result rejection

Fresh frozen epoch 38901fff records
`test/built-ins/Proxy/getOwnPropertyDescriptor/result-type-is-not-object-nor-undefined-realm.js`
FAIL at 04:54:30 local: expected TypeError, no exception thrown. Honest oracle
14, auto providers, standard official standalone, strict both, reached_test
true, compile 7114 ms, execution 933 ms. Original SHA-256:
`6098533ffa101b3b337eb52d4140271ed4fa68b59000a6b4e641117fee49d9fa`.
Root fully read its unchanged source: construct p using a foreign realm's
Proxy but current-realm target/handler; the handler's getOwnPropertyDescriptor
returns null. Current-realm Object.getOwnPropertyDescriptor(p, 'x') must throw
the CURRENT execution context's TypeError. The original has one throw assertion.

Do not unify this first stop with the previous wrong-constructor failures.
Here rejection is missing, so error identity is masked; this does not prove
whether the trap was reached or what physical value carried its result. After
actual owner handover and root execution release, preserve a trap invocation
counter and explicit key/target/receiver controls; distinguish undefined from
null and other primitives, valid descriptor objects and absent-trap fallback.
Compare local/foreign Proxy constructors with the same current caller, plus
foreign caller controls. Apply normal Proxy [[GetOwnProperty]] trap-result type
validation before descriptor conversion/invariants and allocate errors from the
current execution realm, not indiscriminately the Proxy constructor's realm.
No prototype alias, null-to-undefined normalization or assertion weakening.

The existing descriptor/Proxy semantic owner must establish its narrow route
before shared realm/IR changes; this handoff does not grant either ownership.
At 1830/11778 originals: 1792 PASS, 31 FAIL, 1 compile_error, 6 timeouts,
9948 unsettled, no accounting problems, SAME62071/shard-2/PID13477 confirmed
live. This is canonical non-pass38; no source/runner/original/Git/claim/readiness
or heavy-execution mutation occurred.

### 2026-10-10 RegExp multiline reciprocal-realm receiver negative

Same frozen epoch38901fff records
`test/built-ins/RegExp/prototype/multiline/cross-realm.js` FAIL05:22:41 local,
honest14/auto standard official standalone strictboth reachedtrue,
compile4152ms/exec115ms. First error: cross-realm RegExp.prototype expected
TypeError, no exception thrown. Original SHA256:
`ff97216dec91f7236f72c877fa2f3a4a5afb42e6a7fea65da419127bf3cd2972`.
Root fully read the unchanged original: current multiline getter applied to
foreign RegExp.prototype must throw current TypeError, then foreign multiline
getter applied to current prototype must throw foreign TypeError. Only the first
stop is observed; reciprocal getter/error identity and actual variants remain
unverified. This is a separate original from the already recorded unicode row,
not proof of a common lowering defect merely because its first error matches.

Use the existing accessor/realm ownership and matrix: local getter/local intrinsic
prototype returns undefined; genuine RegExp instances keep normal flag answers;
unrelated receivers and the other realm's intrinsic prototype reject with the
getter's realm TypeError. Independently trace getter and prototype identities,
internal-slot presence, realm-local prototype exemption and allocation route.
Do not reject all RegExp prototypes, alias foreign prototypes/getters or replace
assertions with expected strings. Actual source repair awaits ownership/root
execution release and unchanged originals/positive controls.

At2087/11778 originals:2046PASS34FAIL1CE6timeouts9691unsettled,zeroaccounting
problems; SAME62071 confirms live shard2PID13477. Canonical negative41 is tracked;
no source/runner/original/Git/claim/readiness/heavy mutation occurred.

### 2026-10-10 Symbol.keyFor intrinsic identity negative

Frozen epoch38901fff records `test/built-ins/Symbol/keyFor/cross-realm.js`
FAIL05:29:49 local, honest14/auto standard official standalone strictboth
reachedtrue,3996/83ms. First error: notSameValue of the two native function
values is false. OriginalSHA
`09cc1f4a55c2c82472b65f417945d4253cecbc515637e144e2a6964b6385db73`.
Root fully read original: foreign OSymbol, local Symbol.for('parent'), foreign
OSymbol.for('child'), then require distinct keyFor functions, followed by
reciprocal registry key lookup. The first assertion observes aliased keyFor
identities; the later shared-registry checks remain masked. The older foreign
Symbol undefined-at-for stop is not this epoch's first stop or proof of progress.

Existing genuine-realm plan requires BOTH distinct realm-local intrinsic
functions and one agent-wide Symbol registry. Trace actual foreign constructor,
keyFor callable identity and registry storage separately. Do not duplicate the
registry per realm, fabricate distinct wrappers only for this assertion, alias
foreign Symbol to the current constructor or infer reciprocal key lookups pass
because creation completed. Keep both Symbol for/keyFor originals and ordinary
unregistered Symbol identity controls in later owner-reviewed verification.

At2161/11778:2117PASS37FAIL1CE6timeouts9617unsettled0accountingproblems;
SAME62071 live shard2PID13477. Canonical negative43 tracked; no source/runner/
original/Git/claim/readiness/heavy mutation.

### 2026-10-10 Error stack-setter foreign Object construction host leak

Frozen epoch38901fff records
`test/built-ins/Error/prototype/stack/setter-cross-realm.js` COMPILE_ERROR
05:33:21 local, honest14/auto standard official standalone strictboth,
reached_test false, compile6617ms. Exact leak: env::Object_new (#2961).
OriginalSHA
`c5f285647e114e5a388b711308aac5afa26066a2984746353dc468e9e801c8d5`.
Root fully read unchanged original. Keep this selected error-stack-accessor/
cross-realm original in the canonical frozen manifest despite its newer metadata;
no feature/year exclusion or scope redefinition is authorized.

The original extracts current stack setter, requires distinct Error prototypes,
uses foreign Error and Object constructors, checks installed own stack data
descriptors, requires distinct setters, and checks delegation to the foreign
setter on foreign Error.prototype with foreign TypeError, plus local home-object
TypeError. ALL runtime assertions are unmeasured because import admission failed.
Foreign `new realmB.Object()` is a source candidate for attribution, not proof
of the exact emitting lowering or only remaining semantic defect.

After constructor/realm ownership and root execution release, identify the
actual imported call site and physical constructor carrier; preserve genuine
foreign prototype allocation and normal Object-constructor semantics through
the native route. Retain the strict host-import leak scan and verify zero env
semantic imports. Do not allowlist Object_new, supply a host constructor,
alias realmB.Object to the current intrinsic, suppress the construct expression
or declare stack-setter semantics repaired when compilation alone recovers.
Then run the unchanged descriptor/home-object/delegation/error-identity checks
and local/foreign constructor positive controls under normal providers.

At2196/11778:2151PASS37FAIL2CE6timeouts9582unsettled0accountingproblems;
SAME62071 live shard2PID13477. Canonical negative45 tracked; no source/runner/
original/Git/claim/readiness/heavy mutation.

### 2026-10-10 Function apply noncallable foreign-realm observation

Frozen epoch38901fff records the unchanged original
`test/built-ins/Function/prototype/apply/this-not-callable-realm.js` FAIL at
06:52:26 local: honest oracle14/auto providers, official standard standalone,
strictboth, reached_test true, compile3727ms/execute82ms. Error is
`TypeError: Cannot access property on null or undefined at 340:18`.
Whole-original SHA256
`bb0d017c7a90944e03bbad786e26ac9427b989d5bd44540e78fd88e093c0e630`;
root fully read it without edits.

The original retrieves foreign Function.prototype.apply, then expects foreign
TypeError from calling it with undefined, null, ordinary object and RegExp
receivers. The reported nullish access does not establish which expression or
assertion stopped, whether the foreign intrinsic was available, or its error
allocation realm. Later cases remain unproven. Do not classify this as merely
wrong TypeError identity or assume the failing receiver from the error string.

After actual owner handover and root execution release, discriminate the foreign
Function/prototype/apply carrier and ordinary call lookup, then each noncallable
receiver with distinct current/foreign error constructors. Preserve callable
positive controls, argument-list evaluation ordering and abrupt completions.
Realms must be genuinely distinct, not aliased to pass assertions. Integrate the
narrow native property/call/realm correction only after the observed route is
attributed; rerun the unchanged original and realm/callable neighbors.

SAME62071 remains live fourthshardPID21569; this is canonical nonpass51, not
runtime repair or completed acceptance. No execution/source/Git/claim mutation.

### 2026-10-10 foreign-eval generator body prototype observation

Frozen38901fff canonical original
`test/language/expressions/generators/eval-body-proto-realm.js` FAIL at
07:13:14 local, honest oracle14/auto providers, official standard standalone,
strictboth, reached_test true, compile3390ms/execute255ms. Error states
Expected SameValue([object Object],null) true. OriginalSHA256
`7d6320e7ec53e14dc44e685a92fb89685168ce5fb61b96b6a95652735f6bf5c4`;
root fully read the unchanged original.

The source creates foreign g by other.eval, captures GeneratorPrototype as
Object.getPrototypeOf(g.prototype), then sets g.prototype=null, calls g and
requires instance prototype equal that captured intrinsic. The observed expected
null is an important discriminator: do not assume the original captured a valid
foreign intrinsic and only instance fallback is defective. Actual provider-return
g/prototype carrier, intrinsic prototype chain, captured identity stability after
mutation and GetFunctionRealm/fallback allocation must be inspected separately.
Stringified object/null does not establish which representation lost identity.

After actual eval/realm/generator/callable owner handover and root execution
release, preserve distinct current/foreign generator intrinsics and test capture
before mutation, mutation isolation, ordinary object-prototype override positive
and each primitive fallback. Use the maintained auto-provider assembly and
unchanged original with requested strict variants; no realm aliases, fabricated
prototype, host provider fallback or test-body rewrite. Coordinate shared IR and
generator state rather than adopting another author's active surfaces.

Canonical nonpass59 tracked. At3113/11778:3054PASS50FAIL3CE6timeouts8665unsettled,
no accounting problems. SAME62071 fifthshardPID36154 confirmed live; no competing
execution/source/Git/claim/PR mutation and no completed realm fix is claimed.

### 2026-10-10 foreign NewTarget SyntaxError default prototype negative

Frozen38901fff canonical nonpass62:
`test/built-ins/NativeErrors/SyntaxError/proto-from-ctor-realm.js`, SHA256
9e3dd8bba96fd1d68647db3686dbd37f0ec44286c69c97d6186f951c50ee045f.
Root fully read original unchanged. FAIL07:45:07 local, honest14/auto,
standard official standalone, strictboth, reachedtrue, compile5612ms/exec149ms.
First error: newTarget.prototype is undefined, expected SameValue(SyntaxError,
[object Object]) true. Rendered names do not prove prototype or realm identity.

The original makes newTarget with other.Function, sets its prototype undefined,
uses Reflect.construct(current SyntaxError,[],newTarget), then compares actual
prototype to other.SyntaxError.prototype. First case failed; later null, true,
empty string, Symbol and Infinity cases are masked, not passes. Actual strict
variant calls and constructor/carrier route remain UNKNOWN from row labels.

After current callable/realm/Reflect owner handover and root execution release,
discriminate foreign Function's returned constructor realm, mutable prototype
read, current NativeError construct route, foreign SyntaxError intrinsic carrier,
GetFunctionRealm/NewTarget fallback selection and Object.getPrototypeOf readback
identities independently. Preserve positive object-valued NewTarget.prototype
override and same-realm default, distinct foreign intrinsic identities, abrupt
prototype getter and argument evaluation order. Fix the proven allocation/read
site, not a stringified-name comparator or current/foreign prototype alias.
Use unchanged six-case original and adjacent NativeError/Reflect/realm controls;
coordinate shared constructor/IR paths, no duplicate owner claim implied.

SAME62071 explicitly remainsLIVE shard4/PID36154. Partial3580/11778 is3518PASS
52FAIL4CE6timeouts8198unsettled, accounting problems[]. No competing execution,
source/runner/original/provider/Git/claim/PR readiness mutation or fix credit.

### 2026-10-10 GeneratorFunction foreign NewTarget fallback negative

Frozen38901fff canonical nonpass63:
`test/built-ins/GeneratorFunction/proto-from-ctor-realm.js`, SHA256
0bf3df05dad6588fc43731d450a3b4038010a5f2eefea8727ba3f79c962fd145.
Root fully read original unchanged. FAIL07:49:52 local, honest14/auto,
standard official standalone, strictboth, reachedtrue, compile5354ms/exec240ms.
Single assertion observes actual null versus expected [object Function].
The expected rendering does not alone prove a genuine foreign intrinsic.

Original gets current GeneratorFunction from a generator function's prototype,
gets OtherGeneratorFunction through other.eval and prototype.constructor,
creates C using other.Function, sets C.prototype=null, and Reflect.constructs
current GeneratorFunction with C as NewTarget. It compares the resulting
FUNCTION's [[Prototype]] with OtherGeneratorFunction.prototype. This is not
the earlier eval-body-proto-realm check of a generator ITERATOR's prototype;
do not merge those allocation sites based only on realm/prototype symptoms.

After actual callable/eval/realm/Reflect owner handover and root execution
release, inspect provider-returned generator-function constructor/prototype
carriers, C's realm after foreign Function construction, mutable prototype read,
CreateDynamicFunction generator-kind construct and fallback, then function
prototype readback identity. Preserve distinct current/foreign intrinsics;
pair same-realm fallback and explicit object-valued C.prototype overrides,
ordinary/generator dynamic-function controls, and adjacent iterator allocation
controls without conflating them. No synthetic prototype alias or provider
fallback may substitute for true GetFunctionRealm semantics. Exact official
original plus same-epoch controls/gates required before credit.

SAME62071 has no terminal result and canonical rows continue advancing.
Latest3635/11778:3572PASS53FAIL4CE6timeouts8143unsettled, problems[].
No source, runner, original, provider, Git, claim, competing test or PR mutation.

### 2026-10-10 EvalError foreign NewTarget prototype fallback (nonpass82)

Root fully read unchanged
`test/built-ins/NativeErrors/EvalError/proto-from-ctor-realm.js`, SHA256
9d9ada2e228c6f939884adda8e576cd862d6596e9b82ede2360053b92727baae.
Frozen38901fff honest14/providersauto standard official standalone strictboth
FAIL09:23:44 local, reachedtrue, compile4551ms/exec174ms. First actual error:
newTarget.prototype is undefined; expected SameValue(EvalError,[object Object])
true. Rendered names do not establish actual prototype/carrier/realm identity.

Original makes newTarget via other.Function and Reflect.constructs current
EvalError with that foreign NewTarget. Its prototype is successively undefined,
null, false, str, Symbol and0; each constructed error's actual prototype must
be other.EvalError.prototype. First undefined case fails; five subsequent cases
are masked, not passes. Actual variant calls and selected construct/readback
routes remain UNKNOWN. Keep distinct from earlier SyntaxError original with
different intrinsic and primitive values; do not infer identical cause from
similar rendered expectations.

After actual callable/realm/Reflect owner handover and root heavy-lease release,
diagnose foreign Function defining realm, mutable prototype lookup, EvalError
native allocation/ErrorData, GetFunctionRealm fallback and exact per-realm
EvalError prototype, then prototype readback boxing independently. Controls:
same-realm default, foreign object-valued override, all six primitive defaults,
abrupt prototype getter and genuine distinct foreign/current identity. Preserve
ordinary construction, argument order and NativeError neighbors. Patch only
the demonstrated constructor/carrier/lookup seam; no aliasing intrinsics,
string-name comparison, test-specific prototype or provider substitution.
Unchanged original same-epoch A–C–A and realm authenticity proof required;
historical shim passes/source-only packets do not close genuine realm work.

At4966/11778:4884PASS71FAIL5CE6compile_timeout,6812unsettled,
zero accounting problems. SAME62071 LIVE seventh index6/PID64778; complete
false. No source/original/provider/runner/Git/PR/claim mutation, execution or
fix credit; all82 non-passing originals have existing issue custody.

### 2026-10-10 RegExp ignoreCase foreign prototype brand (nonpass84)

Root fully read unchanged
`test/built-ins/RegExp/prototype/ignoreCase/cross-realm.js`, SHA256
7fbf1d7343da590d301ad6792c383fffc4e29dfe24579e4c3a31e3680cffcff5.
Frozen38901fff honest14/providersauto standard official standalone strictboth
FAIL09:29:17 local, reachedtrue, compile5230ms/exec349ms. First error:
cross-realm RegExp.prototype Expected a TypeError to be thrown but no exception
was thrown at all. Primary getter called on other.RegExp.prototype fails to
reject; the reciprocal foreign getter/current prototype case is masked.

The original obtains ignoreCase accessors from both realm prototypes and
requires primary TypeError in the first direction, other.TypeError in the
second. Each accessor's special prototype exception is restricted to its own
realm's intrinsic prototype, not any object lacking OriginalFlags. Distinguish
true intrinsic identity/defining realm, slot/brand checks, accessor call's
receiver and TypeError allocation. Shared intrinsic aliasing or broad prototype
admission are candidates, not observed runtime causes. Keep this independently
tracked beside earlier unicode/multiline foreign-prototype failures; a shared
nullish/error signature or source gap does not prove their same divergence.

After actual realm/RegExp/accessor owner handover and root lease release,
inspect genuine current/foreign prototype and getter identities and selected
call/read route; preserve both exact error constructors. Controls: own prototype
returns undefined, true current/foreign RegExp instances return their flags,
ordinary object/primitive receivers reject, both cross-prototype directions
reject using getter-defining realm's TypeError, altered object prototype and
borrowed accessor. Patch only demonstrated identity/brand/exception seam;
do not reject valid foreign RegExp instances or alias foreign intrinsics.
Byte-unchanged original A–C–A and related flag/realm controls required before
credit. Original/provider/harness/error comparator remains unchanged.

At5020/11778:4936PASS73FAIL5CE6compile_timeout,6758unsettled,
zero accounting problems. SAME62071 LIVE seventh index6/PID64778; full
completion false. No source/runner/original/provider/Git/PR/claim mutation
or competing execution; all84 known non-passing originals tracked.
