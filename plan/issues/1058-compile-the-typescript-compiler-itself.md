---
id: 1058
title: "Compile the TypeScript compiler itself to Wasm — self-hosting stress test"
status: in_progress
created: 2026-04-11
updated: 2026-09-28
priority: high
feasibility: hard
model: fable
reasoning_effort: max
goal: compiler-architecture
sprint: Backlog
depends_on: [1042, 1044, 1046]
required_by: [1059, 1066, 1165, 1584]
loc-budget-allow:
  # Main integration: move the four-line physical receiver metadata to its new owner.
  - src/ir/core/nodes.ts
  # 2026-09-09: +2 lines import/call the leaf adapter for shared dynamic binding planning.
  - src/codegen/destructuring-params.ts
  # 2026-09-08: one import for the physical-field verifier rule; implementation is in its IR subsystem.
  - src/ir/verify.ts
  # 2026-09-08: typed ref-cell construction keeps logical dynamic payloads
  # intact until carrier resolution; the scalar API delegates to this builder.
  - src/ir/builder.ts
  # 2026-09-08: +14 lines declare source object field order, callable-field
  # allocation metadata and equality; allocation logic remains in leaf modules.
  - src/ir/nodes.ts
  # 2026-09-08: +2 lines each to import/call the shared declaration-only
  # return-suffix normalizer. Implementation stays in its own small IR module.
  - src/ir/select.ts
  - src/ir/from-ast.ts
  # 2026-09-08: pass the existing ref-cell registry into prepared callable slots (+1 line).
  - src/ir/integration.ts
  # Wire the receiver-aware variadic Function.prototype.call body.
  - src/codegen/array-object-proto.ts
  # Open index-signature objects must use runtime own-property enumeration.
  - src/codegen/object-ops.ts
  # Reified Date.now shares the direct-call clock policy instead of throwing.
  - src/codegen/builtin-value-read.ts
  # Source-level Map.get values must leave the kernel's anyref storage plane.
  - src/codegen/map-runtime.ts
  # The for-of planner shares the generator's region/unwind cursor; its
  # instruction emitter is isolated in generators-native-for-of.ts.
  - src/codegen/generators-native.ts
  - src/codegen/generators-native-consumer.ts
  # Preserve undefined versus null in the native JSON value dispatcher.
  - src/codegen/json-codec-native.ts
  - src/codegen/expressions/call-namespace-static.ts
  # 2026-08-29: the deferred object-literal method install (the Tier-3
  # createIdentifier null-deref fix) adds the patch-up block to
  # compileObjectLiteralForStruct.
  - src/codegen/literals.ts
  # This is a consolidated TypeScript-parser stress harvest. The branch predates
  # the change-scoped file/function ratchets and intentionally spans the
  # compiler frontiers documented in the implementation handoff below.
  - src/codegen/declarations.ts
  - src/codegen/expressions/new-super.ts
  - src/codegen/closures.ts
  - src/codegen/stack-balance.ts
  - src/codegen/expressions/operator-assignment.ts
  # 2026-09-24: checker compile cost — native-strings.ts reads a string
  # constant still waiting in the end-of-bodies batch (3 lines);
  # registry/imports.ts and identifiers.ts (listed below) add the batching.
  - src/codegen/native-strings.ts
  # 2026-09-23: checker slice — index.ts and property-access.ts each import
  # the fnctor-name helper so NodeLinks resolves one way for the whole compile.
  - src/codegen/index.ts
  - src/codegen/expressions/call-identifier.ts
  - src/codegen/statements/nested-declarations.ts
  - src/codegen/property-access.ts
  - src/emit/binary.ts
  - src/codegen/property-access-dispatch.ts
  - src/codegen/expressions/assignment.ts
  - src/codegen/binary-ops.ts
  - src/codegen/type-coercion.ts
  - src/codegen/expressions/calls-closures.ts
  - src/codegen/expressions/calls.ts
  - src/codegen/literals.ts
  - src/codegen/expressions/call-tail-dispatch.ts
  - src/codegen/closure-exports.ts
  - src/codegen/class-bodies.ts
  - src/codegen/registry/imports.ts
  - src/codegen/expressions/eval-inline.ts
  - src/codegen/expressions/identifiers.ts
  - src/codegen/context/types.ts
  - src/codegen/extern-declarations.ts
  - src/codegen/typeof-delete.ts
  - src/codegen/statements/variables.ts
  - src/compiler.ts
  - src/codegen/expressions/call-receiver-method.ts
  # 2026-08-29: the main merge composes this branch's runtime-namespace capture
  # guard with main's funcMap identity guard, crossing the 1500-line god-file
  # threshold in the closure capture-analysis phase file.
  - src/codegen/closures/arrow-phases.ts
  # 2026-08-30: the runtime parser follow-up adds narrow module-scale,
  # constructor-ABI, nullable-result, and fresh generic-factory handling at the
  # compiler frontiers documented in the current handoff below.
  - src/codegen/expressions.ts
  - src/codegen/generic-callback-result.ts
  - src/codegen/generic-struct-factory.ts
  - src/codegen/module-scale-profile.ts
  # 2026-09-05: direct Program/namespace functions now share the same
  # optional-scalar forwarding analysis as lifted declarations, so a parser
  # helper can preserve its incoming argc before forwarding an optional flag.
  - src/codegen/function-body.ts
  # 2026-09-01: the binder runtime reaches TypeScript's bounded
  # `Debug[AssertionKeys]` self-replacement protocol. The namespace-value
  # subsystem now materializes that checker-proven callable projection.
  - src/codegen/module-namespace-value.ts
  - src/codegen/native-construct.ts
  # 2026-09-01: the binder runtime's exported computed-option callback is a
  # cross-source callable snapshot. Keep its module-init read on the Wasm
  # carrier path and invoke it through a finalize-filled, ABI-complete driver.
  - src/codegen/property-access-exact-shapes.ts
  - src/codegen/host-fnctor-method-driver.ts
  - src/codegen/object-runtime.ts
  # 2026-08-31: projected NodeArray vecs retain their host-backed sidecar/MOP
  # identity so parser metadata survives element-type widening.
  - src/runtime.ts
  # 2026-09-23: the binder symbol-table slice adds small hooks to
  # call-identifier.ts, property-access.ts, binary-ops.ts, assignment.ts,
  # expressions.ts and runtime.ts (all listed above); the logic lives in new
  # subsystem modules (declaration-bound-callee, undefined-holding-variable,
  # null-ref-undefined-box, unmatched-closure-host-call).
func-budget-allow:
  # Runtime enum object read dispatch adds one line at the property entry point.
  - src/codegen/property-access.ts::compilePropertyAccess
  # 2026-09-09: +1 call settles destination locals before alternative arms; implementation is in a leaf module.
  - src/codegen/destructuring-params.ts::destructureParamArray
  # 2026-09-08: one context field threads the explicit inferred carrier provider; logic stays in leaf modules.
  - src/ir/from-ast.ts::lowerFunctionAstToIr
  # 2026-09-08: one resolver callback reads exact symbolic struct fields; no inline allocation algorithm.
  - src/ir/integration.ts::makeResolver
  # 2026-09-08: +9 lines detect/reserve the canonical undefined IR provider
  # before lowering; its adapter implementation stays in a separate module.
  - src/ir/integration.ts::preregisterDynamicSupport
  # 2026-09-08: +29 lines wire late-placeholder lifetime, withdrawn lifted
  # families and deferred binding of reused unpublished candidate slots.
  - src/ir/integration.ts::compileIrPathFunctions
  # 2026-09-08: one normalization call shared with the AST lowerer; no inline algorithm.
  - src/ir/select.ts::isPhase1StatementListInScope
  # Select the extracted native collection-size reader for an optional chain's saved receiver.
  - src/codegen/property-access.ts::compileOptionalPropertyAccess
  # Four additional hash instructions honor the string view's length/offset.
  - src/codegen/map-runtime.ts::ensureMapHelpers
  - src/codegen/array-object-proto.ts::makeGlue
  - src/codegen/object-ops.ts::compileObjectKeysOrValues
  # Twelve lines select Date.now's existing clock policy in the static closure owner.
  - src/codegen/builtin-value-read.ts::ensureStandaloneBuiltinStaticMethodClosure
  # Captured native Set lookup is extracted; the optional-call owner must
  # select its boxed boolean/undefined branch result and admit abstract refs.
  - src/codegen/expressions/calls-optional.ts::compileOptionalCallExpression
  # Register tuple numeric-index arms in the existing finalize-time reader.
  - src/codegen/object-runtime.ts::fillExternGetIdxVecArms
  - src/codegen/generators-native.ts::buildNativeGeneratorPlan
  - src/codegen/generators-native.ts::compileState
  - src/codegen/json-codec-native.ts::emitJsonStringifyValue
  # 2026-09-05: prototype presence/storage and inherited lookup share the
  # existing vec side-table reserve/fill lifecycle; native operation wiring
  # is kept separately in vec-prototype.ts.
  - src/codegen/vec-props.ts::fillVecPropHelpers
  - src/codegen/expressions/call-namespace-static.ts::compileNamespaceStaticCall
  # Resolve user-defined Buffer bindings before the generic builtin fallback.
  - src/codegen/expressions/call-receiver-method.ts::compileReceiverMethodCall
  # 2026-09-24: the literal-promotion guard learns to leave a capture cell's
  # type alone (3 lines).
  - src/codegen/statements/nested-declarations.ts::compileNestedFunctionDeclarationInScope
  # 2026-09-23: binder slice. compileIdentifierCall's body moves verbatim into
  # compileBoundIdentifierCall behind the declaration-bound callee wrapper; the
  # numeric-key switch learns enum keys and an undefined miss.
  - src/codegen/expressions/call-identifier.ts::compileBoundIdentifierCall
  - src/codegen/property-access.ts::compileElementAccessBody
  - src/codegen/expressions.ts::compileExpressionBody
  # 2026-09-23: the dynamic-call arm ladder moves verbatim out of
  # tryEmitInlineDynamicCall (which shrinks by the same amount) so a large
  # ladder can be emitted once as a shared helper instead of per call site.
  - src/codegen/expressions/calls.ts::buildInlineDynamicDispatch
  # 2026-09-01: the standalone apply bridge rejects a local closure whose live
  # declared arity exceeds its fixed eight-position ABI while preserving the
  # existing full-vector linked/native fallback.
  - src/codegen/object-runtime.ts::fillApplyClosure
  # 2026-08-31: parser carrier preservation adds the narrow vec-projection
  # sidecar copy and its runtime import dispatch arm.
  - src/codegen/type-coercion.ts::coerceType
  - src/runtime.ts::resolveImport
  # 2026-08-31: parser runtime identity preservation extends both host closure
  # dispatchers with facade unwrapping and explicit-undefined normalization.
  # Keeping the free and method bridges structurally symmetric is intentional.
  - src/codegen/closure-exports.ts::emitClosureCallExportN
  - src/codegen/closure-exports.ts::emitClosureMethodCallExportN
  # 2026-08-29: same change — the deferred install lives at the end of this
  # function, where the literal's method funcIdxs are finally resolvable.
  - src/codegen/literals.ts::compileObjectLiteralForStruct
  - src/codegen/declarations.ts::collectDeclarations
  - src/codegen/expressions/call-identifier.ts::compileIdentifierCall
  - src/codegen/declarations.ts::compileDeclarations
  - src/codegen/property-access-dispatch.ts::finalizeStructAndDynamicMemberGet
  - src/codegen/expressions/new-super.ts::compileNewExpression
  - src/codegen/expressions/new-super.ts::emitDynamicNewFallback
  - src/codegen/expressions/call-tail-dispatch.ts::compileTailDispatch
  - src/codegen/class-bodies.ts::collectClassDeclaration
  - src/codegen/expressions/assignment.ts::compileElementAssignment
  - src/codegen/property-access-dispatch.ts::tryIdentifierNamespaceAndStaticReceiverRead
  - src/codegen/expressions/calls-closures.ts::compileCallablePropertyCall
  - src/codegen/ir-inline.ts::inlineUserFunctions
  - src/codegen/expressions/assignment.ts::compilePropertyAssignment
  - src/codegen/index.ts::resolveWasmType
  - src/codegen/index.ts::planIrOverlay
  - src/codegen/expressions/identifiers.ts::compileIdentifierCore
  - src/codegen/expressions/eval-inline.ts::tryStaticEvalInline
  - src/codegen/binary-ops.ts::compileBinaryExpression
  - src/codegen/index.ts::generateMultiModule
  - src/codegen/statements.ts::compileStatementInner
  - src/codegen/statements/nested-declarations.ts::compileNestedFunctionDeclarationInScope
  - src/codegen/statements/nested-declarations.ts::hoistFunctionDeclarations
  - src/codegen/member-set-dispatch.ts::fillMemberSetDispatch
  - src/codegen/expressions/calls.ts::compileIIFE
  - src/codegen/expressions/calls.ts::ensureFuncValueWrappersRegistered
  - src/emit/binary.ts::emitBinaryWithSourceMapUnguarded
  - src/codegen/closures/arrow-phases.ts::planClosureCaptures
  - src/codegen/function-body.ts::compileFunctionBody
  - src/codegen/typeof-delete.ts::compileTypeofComparison
  - src/codegen/member-get-dispatch.ts::fillMemberGetDispatch
  - src/codegen/statements/variables.ts::compileVariableStatement
  - src/codegen/typeof-delete.ts::compileTypeofExpression
  - src/codegen/index.ts::ensureStructForType
  - src/codegen/registry/imports.ts::addUnionImportsAsNativeFuncs
  - src/codegen/expressions/operator-assignment.ts::compilePropertyCompoundAssignmentExternref
  - src/codegen/index.ts::generateModule
  - src/compiler.ts::runPipeline
  - src/codegen/context/create-context.ts::createCodegenContext
  - src/codegen/native-construct.ts::fillNativeConstructDrivers
  - src/codegen/closures.ts::promoteAccessorCapturesToGlobals
  - src/codegen/expressions.ts::compileExpressionInner
oracle-ratchet-allow:
  # The parser stress harvest predates the ctx.oracle migration and exposes
  # TypeScript checker queries across these existing codegen paths.
  - src/codegen/declarations.ts
  - src/codegen/declarations/struct-type-registration.ts
  - src/codegen/expressions/assignment.ts
  - src/codegen/expressions/call-identifier.ts
  - src/codegen/expressions/calls.ts
  - src/codegen/expressions/identifier-module-storage.ts
  - src/codegen/expressions/new-super.ts
  - src/codegen/expressions/operator-assignment.ts
  - src/codegen/extern-declarations.ts
  - src/codegen/index.ts
  - src/codegen/literals.ts
  - src/codegen/property-access-dispatch.ts
  - src/codegen/property-access.ts
  - src/codegen/generic-callback-result.ts
  - src/codegen/generic-struct-factory.ts
  # 2026-08-31: the parser runtime follow-up extends the same reviewed
  # checker-backed specialization harvest across these four existing paths.
  - src/codegen/binary-ops.ts
  - src/codegen/expressions/calls-closures.ts
  - src/codegen/expressions/misc.ts
  - src/codegen/statements/nested-declarations.ts
  # 2026-09-01: admit a runtime-namespace function projection only when the
  # computed write key's checker constraint is a finite string-literal set and
  # every member has one exact executable Program ABI declaration.
  - src/codegen/module-namespace-value.ts
  # 2026-08-30: distinguishing a compiled Scanner implementation from an
  # ambient object requires checker-backed declaration and initializer
  # provenance. This is deliberately local to callback classification.
  - src/codegen/closures/callback-classification.ts
---
# #1058 — Compile the TypeScript compiler to Wasm (self-hosting stress test)

## Main synchronization and incremental-parser trace — 2026-09-27

### Latest accepted milestone and live work

At `bbedc0f5bc`, the checked-in source-unit runner passes all **153/153 original
incremental-parser callbacks** natively and in standalone Wasm, with **zero
imports**. The durable O1 artifact is **23,649,983 bytes**, compilation
**669,890 ms** (`.tmp/incremental-durable-runner-o1.log`, completed handle
**40524**). This confirms admission of the tenth source-unit file, not
completion of the 256-file goal. The nine earlier files' 1028/1028 result is
historical and has not been rerun at this HEAD; do not present an aggregate
1181/1181 as one current measurement.

The full standalone checker, handle **13735**, is terminal with an out-of-frame
local error (`.tmp/checker-standalone-full.log`). Original semantic-version
baseline **25190** failed initialization; the uncommitted tuple-row candidate
**72621** now registers all **692** callbacks and passes **368/692** in
zero-import standalone Wasm. Its mutation/identity controls still fail, so it
is NOT accepted. Neither completed build needs restarting without a change.
The full checker must execute all three exact diagnostic oracles, not merely
compile; self-hosting and the remaining original unit files stay OPEN.

Latest upstream verification: `git ls-remote https://github.com/loopdive/js2.git
refs/heads/main` still reports **f17af38a810e8ce8a3aa3b33c994a9a9965331ec**.
Ancestry verification confirms that commit is already incorporated by signed
merge **2dcdffaa33** on `codex/1058-typescript-standalone`; no second merge or
stash was needed, and the unrelated original checkout was left untouched.

### Tuple-row candidate follow-up — not ready to commit

Original-source semver O1 candidate run **72621** completed: native
**692/692**, Wasm **368/692**, valid **6,927,382-byte** standalone binary,
**135,946 ms** compilation, **zero imports**. All 692 callbacks register;
324 assertions fail. This is measured partial progress, not unit-file
acceptance (`.tmp/semver-tuple-rows-o1.log`).

Expanded two-module controls in `tests/issue-1058-generic-tuple-rows.test.ts`
pass **10/16**, versus **4/16** on exact HEAD **12384dd522**, in standalone
IR-off/on lanes using the same Vitest harness. Vite's baseline transform
restores the three candidate production files without overwriting the worktree.
Logs: `.tmp/generic-tuple-rows-controls.log` and
`.tmp/generic-tuple-rows-baseline.log`. Failures remain ordinary failing tests,
not skipped/expected-failure rows. Native oracles pass all rows. The candidate
fixes mixed tuple reads, outer row identity, and readonly tuple reads; callback
identity, indexed mutation, and callback-visible mutation still fail in both
lanes. Baseline throws in the mutation cases; candidate silently returns zero,
which is not an acceptable repair even though the upstream count increased.

Further concrete evidence: `.tmp/tuple-control.wat` retains captured `row` as
externref, but the callback wrapper's third parameter is `(ref null 2)`, the
vector carrier. The shared HOF correctly supplies its original receiver as
argument three; the callback boundary narrows that tuple to a vector. Tuple
registration in `getOrRegisterTupleType` also explicitly marks its fields
immutable. A read-only tuple brand arm alone therefore cannot establish the
mutable Array contract. Next repair must preserve raw callback receiver
identity and provide coherent tuple writes/readback, or decline this candidate;
do not copy tuples into unrelated arrays or weaken the controls.

Checker diagnostic localization: the first invalid `local.get 284` is at
`body[90].then[6]`; the same instruction list also contains parent-frame locals
412 and 424. The failure is not just one off-by-one slot. It occurs while
`shouldRemoveDeclaration` calls enclosing `checkComputedPropertyName` inside
`createNodeBuilder`; preserve this nested capture topology in a reduction.
The full checker remains uncompiled and all three Wasm oracles unexecuted.

### Callback receiver ABI follow-up — 2026-09-27

An additional uncommitted candidate in shared frontend semantics now identifies
the original-array parameter of native Array/ReadonlyArray callbacks. It uses
resolved declaration provenance (all declarations must belong to the built-in
library interface), not a method-name-only assumption. The existing closure
signature planner retains that parameter as externref so both tuple and vector
carriers cross unchanged. Reduce/reduceRight use position three; the other
supported Array callbacks use position two. Custom methods, missing provenance,
and non-callback arguments are excluded. No mutable compiler-context override
or new checker query was added. The implementation is
`src/frontend/ts/array-callback-parameter.ts`, consumed by `closures.ts`.

Measured candidate: map callback identity now passes in both IR modes; reduce
identity also passes. Expanded matrix is **14/20**, with six ordinary failing
rows retained: tuple indexed mutation, tuple callback mutation, and a new
vector callback-mutation control, each in both modes
(`.tmp/generic-tuple-rows-callback-controls.log`). Tuple callback result is now
**300 instead of 1311**, proving all three callbacks observe the original row
but writes still disappear. Vector result **311 instead of 1311** proves
mutation is visible through the helper's row and mapped result but not through
the caller's original vector. Do not attribute that last failure to immutable
tuple fields; inspect the container projection/alias write boundary next.
The previous 4/16 exact-HEAD baseline predates these four additional rows and
does not constitute a 20-row baseline. Four frontend classification tests and
10 adjacent callback/collection tests pass. Typecheck passes before diagnostic
instrumentation; fresh final typecheck is logged separately. Full original
semver has NOT been rerun with this additional callback change.

Full-checker diagnostic handle **21488** is now active:
`.tmp/checker-missing-capture-trace.log`. It uses the same official standalone
probe and all three required exact oracles, with
`JS2WASM_TRACE_MISSING_CAPTURE=1`. Temporary instrumentation in
`src/codegen/closures/capture-source-slot.ts` only logs unresolved out-of-frame
capture names and frame information; it does not suppress or repair the
failure. **Remove that temporary logging before committing.** This run differs
from completed handle 13735 because it can identify the missing bindings, not
merely report their numeric slots. Do not restart while the handle is live.

Further vector evidence (`.tmp/vector-control.wat`): the outer container
projection boxes the existing inner-vector reference with `extern.convert_any`;
it does not clone that row. Thus the failed caller read is not yet attributable
to copying the inner vector. A trial adding the existing `__any_from_extern`
conversion to `unboxExternrefToVecElement` made **no difference** (still
14/20, `.tmp/generic-tuple-rows-union-store.log`) and was removed immediately.
Next distinguish physical store, dynamic overlay, and typed union comparison
before choosing a repair. Do not ship that unproven inverse-conversion trial.
Fresh typecheck, oracle ratchet and coercion gates pass against main
`f17af38a81` (`.tmp/tuple-callback-final-typecheck.log`,
`.tmp/tuple-callback-oracle-main.log`, `.tmp/tuple-callback-coercion-main.log`).

### Mixed-vector write-back and dynamic read coherence — 2026-09-27

The boundary probe `.tmp/vector-mutation-boundaries.mts` separates views of
the SAME vector after the generic callback writes index 1. Before repair,
typed reads report `'b'` (code 98), while dynamic reads report `'z'`. This
is lost physical write-back, not string comparison or inner-vector copying.
`carrierRefWriteBack` in `vec-overlay-carriers.ts` explicitly returned no
instructions for the tagged-union (`kind: "any"`) carrier.

Candidate uses the existing honest externref classifier to write that value
back through the existing vector element setter. The overlay remains responsible
for descriptor validation and refusal; only its successful physical store is
completed. The shared helper is minted append-only at finalization, only for
an already registered tagged-union carrier; no ad-hoc tag conversion is added.
This alone made typed reads correct but exposed a second defect: dynamic reads
returned the tag box itself (String converted it to `'z'`, but typeof and strict
equality rejected it). `boxVecElementToExternref` merely looked up
`__any_to_extern`; if no earlier expression registered it, the box fell through
to raw `extern.convert_any`. It now ensures the existing projection helper and
declines an unavailable conversion instead of exposing a box as the JS value.

With both changes, the original vector callback mutation control returns the
exact **1311** in both IR modes. The 20-row tuple matrix now passes **16/20**;
the four remaining failures are the two tuple mutation cases in both modes.
Log: `.tmp/tuple-overlay-roundtrip.log`. Initial dedicated union-vector checks
pass **16/16**, including string/boolean/number/object/null/undefined stores,
descriptor writes, and refused writes. Those checks have now been strengthened
to test dynamic reads/typeof alongside typed reads; native oracles and zero-
import validation remain mandatory. Current candidate/adjacent run is handle
**24127**, `.tmp/union-vector-writeback-adjacent.log`; exact-HEAD three-file
A/B baseline is handle **84086**, `.tmp/union-vector-writeback-baseline.log`.
Do not count the earlier 16/16 as verification of the strengthened assertions.
The ongoing full-checker trace started BEFORE these write-back/read changes;
its result cannot validate them.

Strengthened union-vector tests now pass **16/16**, versus **4/16** with the
three changed storage/read files restored from exact HEAD **12384dd522** by
the Vite baseline transform (same standalone IR-off/on harness). Combined
adjacent run passes **32/32 executed tests**, with **three existing skipped
tests** in `es5-standalone-vector-expando-descriptors.test.ts` providing no
coverage. Logs above are terminal. Fresh typecheck, LOC/function budgets and
coercion-site gate pass; no allowances were added. This validates the separate
mixed-vector repair, not the still-failing tuple write candidate or full goal.
Additional mixed-literal tag and JS-host controls pass **13/13**
(`.tmp/union-writeback-carrier-controls.log`).

### Source tuples use the native array carrier — candidate 2026-09-27

Signed checkpoint **f2f3e2b2a1** retains the mixed-vector repair above. The
remaining tuple problem is the representation itself: immutable fixed fields
cannot satisfy mutation, growth, or actual optional-tuple length. The new
candidate lowers standalone SOURCE tuple types and literals to the existing
resizable externref-element vector. Both IR modes consume this same physical
type/literal boundary; no second array runtime or legacy-only tuple setter is
introduced. Other targets retain their previous packed tuple representation.
Internal tuple constructors are not claimed migrated by this source-type change.

After this change the initial **20/20** two-module controls pass, including all
mutation/identity cases. Six further cases per lane exposed a stale `.length`
constant fold: tuple growth really stored the new element, but a source tuple's
length was still emitted as its annotated arity. Standalone now declines that
packed-tuple-only shortcut and reads the vector's live length. Expanded matrix
passes **32/32**, zero imports, both IR modes, native oracle for every row
(`.tmp/source-tuple-live-length.log`). It covers growth (including empty tuples),
readonly compile-time views, absent optional elements, tuple spreads, and an
ordinary-object Array.isArray negative control. Typecheck passes.

The earlier `fnctor-array-prototype.ts` tuple-brand HOF workaround has been
removed: source tuples now use the existing vec brand and need no new packed-
tuple admission arm. The earlier generic-element erasure, join carrier fix,
and callback receiver ABI candidate remain under test.

Adjacent tuple/rest/nested/destructuring measurements are in
`.tmp/source-tuples-native-array.log` and `.tmp/source-tuple-expanded.log`.
The JS-host exhausted-tuple test fails identically (31 vs 63) with the two
source-type/literal files restored from **f2f3e2b2a1**, so it is pre-existing.
That exact two-file baseline passes **8/32** new matrix rows, versus current
**32/32**; other candidate files remain present in that isolated A/B.
Six old host fixture failures (five configuration errors in issue 648 and one
missing string_constants import in issue 582) are being checked against the
same baseline in `.tmp/source-tuple-host-baseline.log`; do not dismiss them
without that result. A fresh full original-source semver O1 run is active in
`.tmp/semver-native-tuples-o1.log`; no new full-suite result credited yet.

Host A/B is terminal: the six additional failures reproduce with exactly the
same configuration/import errors (`.tmp/source-tuple-host-baseline.log`).
Do not count these fixture failures as passes or silently delete their tests.
The fresh original semver run is handle **49427**; the checked-in 153-callback
incremental-parser runner is also active, handle **96333**, logging to
`.tmp/incremental-native-tuples-o1.log`. Both began with the complete native
tuple/live-length/callback candidate and the committed mixed-vector repair.

The function-size gate caught three lines of growth in `compileArrayLiteral`.
Instead of adding an allowance, extracted its existing open-object element
classification into `arrayHasHostPathObjectElement`, preserving the exact
predicate and oracle calls. This coherent helper extraction was made after the
full builds started; fresh reduced tests and function gates are in
`.tmp/native-tuple-refactor-controls.log` and
`.tmp/native-tuple-functions-final.log`. Prior typecheck, LOC, oracle and
coercion checks passed; rerun gates for the final candidate before committing.

### Terminal diagnostic results after upstream sync verification

Upstream `loopdive/js2` main remains **f17af38a810e8ce8a3aa3b33c994a9a9965331ec**,
verified by `ls-remote` and local ancestor check; HEAD already contains it.
The extracted-helper controls pass **40/40** and the function-size gate passes.

Semver handle **49427** is terminal: native **692/692**, standalone **368/692**,
all 692 callbacks registered, **324 assertion failures**. Compilation validates,
zero imports, **6,912,190 bytes**, **171,033 ms**, O1
(`.tmp/semver-native-tuples-o1.log`). This preserves the previous result rather
than improving it; source tuple mutation correctness is established by the
reduced matrix, not by a new semver acceptance claim. First failures include
numeric constructor assertions (`0 !== 1`) and comparison (`0 !== -1`).
Incremental-parser handle **96333** remains active; do not restart it.

Full-checker trace **21488** is terminal after **1,505,128 ms**, no timeout,
peak **4145.6 MiB**. Same invalid local 284 in
`SyntacticTypeNodeBuilderResolver_shouldRemoveDeclaration`; no Wasm binary or
invocations. Unlike the earlier streaming inspection, the final log DOES
contain missing-capture rows: `error` (284), `isArrayOrTupleType` (412),
`isTupleType` (424), `hasInferenceCandidates` (482), `isSyntacticDefault` (294),
`grammarErrorOnNode` (535), and others, all with no lifted capture names in
this method frame. Investigate transitive nested-function capture sourcing
across `createTypeChecker` / `createNodeBuilder` / object method, not a local
count off-by-one. Temporary logging removed after collecting the trace.
This full build began before the tuple and mixed-vector fixes; it is not a
validation of the current candidate. Log: `.tmp/checker-missing-capture-trace.log`.

Incremental-parser **96333** is now terminal, **FAILED validation** on the
combined current candidate: compile output **36,586,418 bytes** in **447,349 ms**,
but `__module_init_chunk_31` has `struct.new[1] expected type (ref null 1),
found local.get of type f64` (function 14175, offset 31493779). No Wasm callback
executed; the previous accepted 153/153 result is historical, not current.
Do not commit/accept the tuple migration on the 32 reduced controls alone.
The full current-vs-last-accepted attribution remains open: both the committed
mixed-vector repair and the uncommitted tuple/callback changes occurred since
the accepted parser run. Final candidate typecheck, LOC, function-size,
coercion and oracle gates pass (`.tmp/tuple-final-*.log`), which does not
override the full-workload validation failure.

Diagnostic build **35364** is active, preserving the exact checked-in runner's
generated entry and O1/source-map/deferred-init settings, plus selective WAT
for `__module_init_chunk_31`. Artifacts and command are in
`.tmp/incremental-tuple-validation.mts` / `.log` / `.wasm` / `.wat`; no execution
acceptance is claimed from this capture-only instrument.

Semver reduction now isolates a second independent defect: **8/16** controls
pass, and all eight failing controls are constructor text/union-parameter
reassignment shapes, in both IR modes (`.tmp/semver-ctor-reduction-expanded.log`).
Regex parsing alone, a generic checked parsed result, numeric constructor
arguments and ordinary union-local assignment pass. Even replacing parsing
with `if (typeof major === 'string') { major=1; minor=2; patch=3; }` gives
**23 rather than native 123**. The WAT shows assignment updating the temporary
`__typeof_major` slot, followed after the branch by `this.major` reading the
unchanged original AnyValue parameter. `applyTypeofNarrowing` in
`src/codegen/statements/control-flow.ts` remaps the local for the branch and
restores the original mapping without preserving writes. This identifies a
concrete write-loss mechanism, not a regex or generic-return defect. Do not
claim all 324 semver failures share it without rerunning the original file.
Scratch reproducer/config/WAT: `.tmp/semver-ctor-reduction.test.ts`,
`.tmp/semver-reduction.config.mts`, `.tmp/semver-constructor.wat`.

Candidate repair reuses the existing declaration-aware single-assignment
analysis before copying a typeof-narrowed binding. Writable or unresolved
bindings retain their original storage rather than a discarded branch-local
copy. The cached write scan also now visits the left side of destructuring
defaults (`[value = 7] = ...`); its existing readers were enumerated before
this correction. No context map or new checker query is introduced. Added
zero-import/native-oracle branch-write controls in both IR modes; validation
pending. This is shared lowering, not a new parallel legacy-only mechanism.

The constructor reduction now passes **16/16** (baseline **8/16**),
`.tmp/semver-ctor-write-fix.log`. Expanded branch-write controls pass **18/22**
vs **8/22** with only `control-flow.ts` and `single-assignment-binding.ts`
restored to **f2f3e2b2a1**. Four remaining failures are array destructuring and
for-of writes to the union parameter; both also failed on baseline (the loop's
wrong result changes from 0 to NaN). Do not call this matrix fully passing.
Existing typeof parameter/narrowing suites pass **10/10**. Logs:
`.tmp/typeof-write-controls.log`, `.tmp/typeof-write-baseline.log`.
Original semver O1 recheck is active as **38985**, log
`.tmp/semver-typeof-write-o1.log` (started after the entries repair below).

The parser capture **35364** is terminal, reproducing the exact invalid module
in **403,614 ms**. Binaryen refuses optimization and the returned 36,586,418-byte
artifact is **UNOPTIMIZED**, despite O1 being requested. Selective WAT identifies
`Object.entries` construction: a numeric property value is placed directly in
the canonical tuple vector's data field. `compileObjectKeysOrValues` assumed
every resolved entry reference was a packed tuple. Candidate now consults the
existing vector layout and constructs a two-element backing array before its
length/data wrapper, using shared coercion for keys and values. No new carrier
or runtime helper. Typecheck passes.

Named-object entries controls pass **8/8** (numeric/string values, mutable
growing pairs, Map initialization, both IR modes),
`.tmp/named-entries-controls.log`. Separate inline-literal forms fail **8/8**
before and after this entries repair: an unregistered literal struct is sent
to the dynamic-object runtime enumeration path and produces no entries.
The adjacent host comparator failure (`aAbB` vs `bBaA`) also reproduces with
`object-ops.ts` restored to **f2f3e2b2a1**. Logs:
`.tmp/tuple-entries-controls.log`, `.tmp/entries-baseline.log`. These failures
are retained, not skipped or counted as passes. Named-object entries A/B
is active, log `.tmp/named-entries-baseline.log`.
Fresh original incremental-parser O1 recheck (including both repairs) is
active, logging to `.tmp/incremental-entries-typeof-o1.log`.

Original semver **38985** is terminal: native **692/692**, standalone
**594/692**, up from **368/692**, with **98 remaining failures**. All callbacks
register; binary validates, zero imports, **6,912,017 bytes**, **150,519 ms**,
O1 requested (`.tmp/semver-typeof-write-o1.log`). This is a measured original
suite improvement, not acceptance of the complete file. Remaining failures
begin with minor/patch wildcard range parsing and range.test null-property
errors. Named-object entries A/B is terminal: **0/8** with `object-ops.ts`
restored from **f2f3e2b2a1**, versus candidate **8/8**, reproducing the full
parser's exact `struct.new` invalid-value shape in the reduced controls.
Incremental-parser handle **1356** is active; do not restart it.

Incremental-parser **1356** is now terminal **PASS**: original/native
**153/153**, standalone **153/153**, valid binary, zero imports,
**23,486,086 bytes**, **525,971 ms**, O1. The entries repair restores the
accepted parser workload with the native tuple migration still enabled.
Log: `.tmp/incremental-entries-typeof-o1.log`.
The LOC gate initially rejected six lines in the control-flow driver. Moved
the typeof-condition recognizer into `src/frontend/ts/typeof-narrowing.ts`
with the immutable-binding proof supplied by the existing cached analysis;
no new allowance. Final typecheck, LOC/function budgets, coercion and oracle
gates pass (`.tmp/entries-typeof-*.log`). Full builds preceded that mechanical
frontend extraction; recheck focused controls on the final source before
committing. The failing inline-literal entries and union array/loop-write
controls remain open and uncommitted.

Array-destructuring write follow-up: `.tmp/type-write-carrier.wat` proves
`[value]=[7]` stores 7 correctly in an externref vector, then the resolved
identifier write converts that externref to AnyValue with the legacy tag-5
wrapper. `Number(value)` subsequently reads the unused zero numeric payload.
Candidate uses the existing honest runtime classifier specifically at the
resolved identifier write boundary when its source is externref and its target
is AnyValue; the globally load-bearing default in `boxToAny` is NOT changed.
This is additional to the full-suite measurements above and needs revalidation.
Focused controls active in `.tmp/typeof-write-classifier-controls.log`.

Classifier follow-up is terminal: new branch matrix **20/22**, existing
narrowing controls **10/10**, leaving only the two for-of cases. Formatting,
lint and diff checks pass. Inspection of `compileForOfArray` finds two
consecutive coercions: an explicit `coerceType(readElemType, elemLocalType)`
followed by `emitCoercedLocalSet(..., readElemType)`, which performs the same
coercion again. Removed the redundant first conversion; testing in
`.tmp/typeof-write-loop-controls.log`. No globally shared boxing policy changed.

The branch-write matrix now passes **22/22**, plus **10/10** adjacent typeof
controls, on the extracted frontend recognizer and both write repairs
(`.tmp/typeof-write-loop-controls.log`). Thus all **32/32** in that run pass;
the inline-object entries cases remain a separate open failure.
Additional loop/destructuring and mixed-vector controls are running as
**60651**, `.tmp/typeof-write-loop-adjacent.log`; final source gates as
**95600**, `.tmp/branch-writes-final-*.log`. Original semver revalidation after
the two additional write repairs is running as **89639**,
`.tmp/semver-branch-write-final-o1.log`. Do not restart these handles before
their terminal state is confirmed. The earlier 594/692 and 153/153 full-suite
measurements precede these last two repairs; do not relabel them as fresh HEAD
validation. All current follow-up source remains uncommitted.

Adjacent **60651** is terminal **32/32 PASS**, giving **64/64** executed
focused+adjacent checks across the two final runs. Gates **95600** are terminal
PASS (typecheck, LOC, function-size, coercion and oracle); no new allowance.
Final original incremental-parser recheck is now active as **45176**, log
`.tmp/incremental-branch-write-final-o1.log`, alongside semver **89639**.
These are the only new full-suite runs to poll for the current write repairs.

Next semver reduction uses the original four regex declaration lines, not
replacement patterns. **16/18** cases pass (`.tmp/semver-range-reduction.log`):
wildcard regex captures, absent operator `=== undefined`, plain parameter
comparison, explicit operator, whitespace split and range split loops all
pass in both IR modes. Only `switch(operator:string) { case undefined: ... }`
misses (returns 0 rather than 1). The switch boxes a nullable AnyString local
to externref; its ABI null means an unmatched/undefined string, but bare
`extern.convert_any` turns it into JS null before strict case comparison.
Plan: preserve the existing local carrier's undefined meaning at the switch
operand boundary, without changing general externref boxing or conflating
explicitly nullable string types with undefined.

REJECTED candidate: a switch-local native-string null→undefined conversion
made the original **18/18** reduced cases pass (`.tmp/semver-switch-boundary.log`),
but the expanded **22**-case matrix caught **2 regressions**, one per IR mode:
passing `null as any` to the string-annotated parameter must still match
`case null`, and instead matched `case undefined`. Explicitly declared
`string | null` controls passed, proving the failure is lost runtime value
identity behind the annotation, not merely a missing nullability guard.
The candidate helper and its call sites were removed; do NOT re-add it.
Log: `.tmp/semver-switch-null-controls.log`. Correct follow-up requires
preserving distinct null/undefined at the parameter/producer carrier boundary
before information is lost, with the negative controls retained. Do not
accept a higher semver count purchased by a new null/undefined confusion.

Final semver recheck **89639** is terminal: **594/692** standalone vs native
**692/692**, same as before the last two write fixes; valid zero-import
**6,912,017-byte** binary in **148,631 ms**. Log:
`.tmp/semver-branch-write-final-o1.log`. Incremental **45176** still live at
last handle poll; no restart.

### Checkpoint before the next requested upstream merge

Incremental-parser handle **45176** is terminal **PASS**: native **153/153**,
standalone **153/153**, valid **23,486,086-byte** binary, **zero imports**, O1,
**531,902 ms** (`.tmp/incremental-branch-write-final-o1.log`). This includes
the identifier-classifier and loop double-coercion repairs, but predates the
last wrapped-write scan correction.

The expanded wrapped-write controls are terminal **22/26**, not fully passing
(`.tmp/typeof-wrapped-write-controls.log`): parenthesized increment produces
0 instead of 3, and asserted increment is rejected, in both IR modes. The scan
now conservatively recognizes these writes, but update lowering remains open.
The eight inline-object entries failures also remain open. Preserve these
failing controls in this work-in-progress checkpoint; it is not a merge-ready
acceptance claim.

The semver switch reduction passes **24/26** with the rejected switch-local
conversion removed (`.tmp/semver-switch-carrier-baseline.log`). Only the plain
string-annotated parameter loses the missing regex capture. Unknown and
nullable-union parameter controls preserve it, including explicit null.
Next investigate shared parameter representation selection, keeping null and
undefined distinct before switch lowering; do not patch the switch comparison
to reinterpret every null as undefined.

The next requested sync fetched upstream main **c2601efa8948c46515c96cad15da92a93c71fbde**.
Its three new commits change website/compatibility artifacts, not compiler
source. Checkpoint the current candidate before merging; full TypeScript and
self-hosting acceptance remain open.

### Upstream merged; nullish parameter follow-up

Signed checkpoint **ba45600413** preserves the tuple/write candidate and its
known failing controls. Merge **e37978eccd** contains upstream main
**c2601efa8948c46515c96cad15da92a93c71fbde**, verified by ancestor check; clean
merge, no compiler-source conflicts. The original workspace remains untouched.

The new shared frontend predicate `parameterObservesNullishSwitch` keeps a
plain string parameter in the dynamic representation when its own binding is
observed by a nullish switch case. It is consulted by declaration and closure
signature construction, nested declarations, and the IR parameter projection.
This preserves null and undefined before information is lost; no switch-local
null reinterpretation and no change to global boxing policy. Unresolved binding
identity widens conservatively; known unrelated same-spelling bindings do not.
Explicit native annotations are outside this predicate's plain-string scope.

The original semver file now passes **684/692** standalone, versus native
**692/692**, up from **594/692**. All callbacks register; valid zero-import
**6,912,288-byte** binary, O1, **161,893 ms**. Eight failures remain, beginning
with null/undefined property accesses. Log: `.tmp/semver-nullish-param-o1.log`.
This full run predates the final nested-declaration consult (its reduced
reproducer required that additional integration); do not relabel it as a
full validation of the final source.

Focused durable controls pass **32/32**, covering top-level/nested declarations,
arrows, function expressions, missing captures, explicit undefined/null, matching
captures and empty strings, both IR settings, native oracle and zero imports.
Log: `.tmp/nullish-switch-nested-candidate.log`. The first 16-case matrix passed
**16/16** versus **8/16** with the three initial signature integrations restored
to merge **e37978eccd** (`.tmp/nullish-switch-durable-baseline.log`). Expanded
four-file A/B and adjacent controls are recorded separately, not folded into
the full semver count.

Important IR limitation: `.tmp/nullish-ir-outcomes.log` shows the mixed-type
switch witness rejected by IR selection (`body-shape-rejected`, with caller
`call-graph-closure`), then handled by shared lowering. Passing with IR enabled
does **not** prove an IR body was emitted. The shared frontend/IR parameter
projection avoids conflicting representation choices, but strict IR closure
and actual mixed-switch IR support remain open.

Validation process note: the first scratch reduction command omitted its
explicit test-file filter; configuration merging added the base test list and
started an unintended broad run (**86140**, `.tmp/semver-nullish-param-candidate.log`).
The user was asked for permission to stop it; no test process was killed.
Do not use that run as targeted acceptance or launch another broad run. The
subsequent scratch command explicitly names `.tmp/semver-range-reduction.test.ts`.

Expanded signature A/B is terminal: candidate **32/32**, baseline **16/32**
with only `declarations.ts`, `closures.ts`, `index.ts` and
`statements/nested-declarations.ts` loaded from merge **e37978eccd** through the
same Vitest standalone/native-oracle harness. The three host optional-parameter
import failures and one standalone shadowed-undefined failure reproduce on
that baseline too; they are not counted as passes or attributed to this fix.
Log: `.tmp/nullish-param-expanded-baseline.log`. The original-regex reduction
now passes **26/26** after the nested-declaration integration, versus the
earlier **24/26** (`.tmp/semver-nullish-param-nested-scoped.log`).

The eight remaining original semver failures are callback indices **8–15**:
`<`, `<=`, `>`, `>= works`, and the corresponding `with prerelease` tests.
Their reported source location is the returned callback's
`ts.VersionRange.tryParse(version)` call in `assertVersionRange`, generated
entry line **1001:31**. This is a diagnostic lead, not proof that parsing itself
is broken: distinguish captured namespace/static-method receiver access from
the parse result before changing semver or its assertions.

Final post-integration original semver rerun is terminal: native **692/692**,
standalone **684/692**, valid zero-import **6,912,288-byte** binary, O1,
**163,833 ms** (`.tmp/semver-nullish-param-final-o1.log`). Final focused run is
**44/44**: 32 runtime cases, 5 frontend predicate checks, and 7 existing IR
tail-switch checks (`.tmp/nullish-param-final-focused.log`). Typecheck,
format/lint, LOC/function budgets, coercion and oracle gates pass, with no new
allowance. Dead-export preservation witnesses pass, but its strict modeled
graph remains **OPEN/FAIL**; do not call that strict closure.

### Remaining semver static class access investigation

Current HEAD **edc1f023e0** is signed and the prior goal turn made verified
progress (semver 594→684/692). The accidental broad run **86140** was confirmed
live again; no kill permission received and no restart/termination performed.

Reduced namespace/static-class matrix is **4/12 PASS**
(`.tmp/semver-callback-static-expanded.log`): ordinary class static calls and
namespaced construction pass in both IR settings; namespaced static calls fail
even without a callback, including a static method returning a scalar. Thus a
callback capture is not necessary for this reduced failure. ESM namespace
attribution to the original TypeScript barrel remains to be verified; TypeScript
runtime namespaces and ESM namespace objects are distinct paths.

Existing property access projects exact namespace function and variable exports
without materializing the entire namespace. Class exports lack that projection;
static call lowering evaluates its class receiver even for a direct known call.
Investigate exact class-object identity at this shared value-read boundary,
retaining ordinary receiver side effects, namespace/class rebinding semantics,
and same-named class separation. Do not replace the class read with a bare-name
call shortcut or remove receiver evaluation globally.

The ESM reduction confirms an unrelated exported enum is enough to trigger the
failure: **4/8 PASS**, with all four class-only cases passing and all four
class-plus-enum cases failing, direct and barrel imports, both IR settings
(`.tmp/semver-esm-static-baseline.log`). The namespace object's export planner
declines the entire surface when an export has no supported representation.
This causes the static call's otherwise-unused receiver evaluation to throw.

**REJECTED class projection candidate:** adding exact class-declaration
projection to `tryEmitRuntimeNamespaceVariableValue` made ESM controls **8/8**,
runtime-namespace controls **12/12**, and the original semver **692/692** with
zero imports (**6,914,530 bytes**, **155,156 ms**, O1), log
`.tmp/semver-namespace-class-o1.log`. It is NOT retained and NOT acceptance:
negative controls found namespace-before-initialization reads returning 1 rather
than throwing, and later namespace/class-method replacement being ignored.
The source change was removed completely; current accepted semver remains
**684/692** on **edc1f023e0**.

One-file baseline attribution (`property-access.ts` from **edc1f023e0**, same
standalone/native-oracle Vitest harness) proves the early-read regression:
baseline throws and passes both IR modes; candidate silently returns 1 and
fails both. Replacement cases were loud failures on baseline and became quiet
wrong values with the candidate. Ordinary getter/call receiver side effects
pass before and after. Logs: `.tmp/namespace-class-negative-baseline.log` and
`.tmp/namespace-class-negative-candidate.log`. Do not re-add the shortcut even
though it makes the semver file green.

Durable controls now extend `issue-1058-namespace-classes.test.ts` with static
reads, method replacement and early reads; `issue-1058-module-namespace-factory.test.ts`
retains the class-plus-enum/direct/barrel matrix. Known failures remain active,
not skipped. The next implementation must represent observable namespace/class
values with initialization and mutation semantics, or extend complete namespace
materialization. Existing `runtime-enum-object.ts` already provides declaration-
owned live enum storage and source-position initialization using the shared IR
enum plan; reuse that ownership instead of eagerly snapshotting enum values.
Its current census omits enum exports demanded only by namespace materialization.
Runtime namespace class bindings likewise lack ordinary live binding cells;
their canonical lazy class singleton is not proof of initialization or immutability.

The checked-in expanded suites are terminal **51/63 PASS** on the restored
compiler (`.tmp/namespace-evidence-durable.log`): twelve active failures are
eight runtime-namespace static-read/replacement cases and four ESM enum-neighbor
cases. All four early-read controls pass. Formatting and lint pass. No compiler
source differs from **edc1f023e0**; only these tests and this issue are changed.

### Unfinished required-field checkpoint before upstream sync

Follow-up: native-oracle recursive-field controls show an actual wrong value,
not only an IR-ownership demotion. Before the finalizer fix, candidate passes
15/16 but the mutually recursive IR-on case returns 1 instead of native 11;
IR-off returns 11. The two-module pre-candidate substitution passes 0/16.
`finalizeForwardClassFieldLayouts` narrows an undefined-preserving externref
to a nullable class reference solely because its target is declared later.
The finalizer must consult the existing shared undefined-write evidence before
narrowing; preserving semantics takes precedence over retaining an invalid
typed layout. This does not by itself solve the remaining IR representation
work. Logs: `.tmp/required-recursive-candidate.log` and
`.tmp/required-recursive-baseline.log`.

With the finalizer guard, field-value tests pass **16/16**. The combined
constructor-ownership run is **54/65**, with the exact same 11 failures as
before this guard (`.tmp/required-recursive-finalizer.log`). Adjacent tests
report 47 rows: **43 ordinary passes and four expected scalar failures**
(`.tmp/required-finalizer-adjacent.log`). Lint passes for both edited code files.
The original 153-callback incremental suite was started at `bfcf63f5d4`, before
the finalizer guard, with `DOGFOOD_OPTIMIZE=1` and the unchanged native-oracle
driver. Its current log is `.tmp/incremental-required-field-bfcf63f5d4.log`;
session 48933 subsequently finished with exit 1. Result: valid standalone O1,
**26,177,801 bytes, zero imports, 614,263 ms**, native **153/153**, Wasm
**0/153**. Exact failure histogram: 83 property-access errors at 149:38,
one at 8564:12 (callback 52), and 69 destructuring-null/undefined errors
(first at callback 69). The prior `b2ff16e061` run had 152 errors at 149:38
and one at 8564:12. Changed errors are not passing tests or root-cause proof.

Diagnostic capture at current `4e3b9c2fbf` is running separately (session
52156, `.tmp/incremental-capture-4e3b9c2fbf.log`, requested artifact
`.tmp/incremental-raw-4e3b9c2fbf.wasm`). Next bounded probes: callbacks 0 and
69, with 52 as the diagnostic-array follow-up. An attempt to read the original
optimizer's temporary input lost the cleanup race and exited ENOENT; it
produced no trace or artifact and must not be treated as evidence. Do not
restart the live diagnostic capture merely because observation times out.
The finalizer fix typecheck exited zero (`.tmp/required-finalizer-types.log`).
The capture subsequently completed successfully: 41,909,013 bytes in
366,415 ms, seven diagnostic-only imports. Bounded probes 0, 69, and 52 all
finished (sessions 89891, 50801, 18249; no loop-reset patch applied).
Callback 0 now reports null **`commentDirectives`**, not `symbol`, at the
original `isNodeOrArray` invariant. Callback 69 reaches
`getNewCommentDirectives` before the null/undefined destructuring error;
callback 52 reaches `attachFileToDiagnostic` before its 8564:12 failure.
Logs: `.tmp/incremental-4e3b9c2fbf-trace-0.log`,
`.tmp/incremental-4e3b9c2fbf-trace-69.log`, and
`.tmp/incremental-4e3b9c2fbf-trace-52.log`. These diagnostic builds do not
satisfy standalone acceptance. Next reduction isolates optional scanner-array
returns and captured array elements across the getter/append boundary.

The initial eight scanner/getter/append controls pass. Adding interface-typed
object receivers reproduces the failure: baseline 10/14, with object-field
assignment losing undefined in both modes and a separate class-to-interface
receiver trap in both modes. A field-only carrier change is insufficient:
emitted `scanner` stores its uninitialized captured array in a typed nullable
vec and the getter returns that null before assigning the field. Candidate
shared IR carrier selection therefore also preserves undefined at nullable
reference type-resolution boundaries. Expanded controls are 16/18, with only
the two class-to-interface traps remaining. Adjacent matrix is 53/54 (four
expected scalar failures included), with a GC optional-Map-size failure still
awaiting exact baseline attribution. This candidate is not yet validated for
the original parser or broad conformance.

Exact `ea0b45516e` substitution confirms the expanded scanner matrix improves
**12/18 → 16/18**; both class-to-interface traps remain on both trees. The GC
optional-Map-size failure also reproduces unchanged. Logs:
`.tmp/scanner-carrier-exact-baseline.log`,
`.tmp/scanner-carrier-control-matrix.log`, `.tmp/scanner-carrier-adjacent.log`.
Constructor ownership remains **62/73**, with the same 11 failure identities
(`.tmp/scanner-carrier-ownership.log`). Typecheck and lint pass; no budget
allowances were added. Preserve the two class-to-interface tests as explicit
failing regressions, not hidden expected-failure credit. Original parser
acceptance must be rerun after this candidate; no pass-count claim yet.
LOC/function budgets, coercion vocabulary, and oracle ratchets pass against
`c603404b4f` without new allowances. Reachability preservation passes, but the
strict modeled closure remains **FAIL/OPEN**, not a closed-IR result.

An added explicit `class Node implements N` receiver follows TypeScript's
real `NodeObject`/`SourceFileObject` interface boundary. Both modes fail on
the `ea0b45516e` substitution and pass with `e82d957d28`; expanded matrix is
now **12/20 → 18/20**, with only the two implicit structural class-to-interface
traps remaining. `.tmp/scanner-implementer-baseline.log` and
`.tmp/scanner-implementer-candidate.log`; formatting/lint pass. Current-commit
diagnostic capture: session 90410, `.tmp/incremental-capture-e82d957d28.log`,
target `.tmp/incremental-raw-e82d957d28.wasm`; still active at this update.
That capture subsequently failed (session 90410 terminal exit 1), with one
error-severity diagnostic: **for-of requires an array expression** at
`src/services/codefixes/addMissingAwait.ts:183:5` in the pinned TypeScript
source. The expression is `identifiers.identifiers` after narrowing an
`Identifiers | undefined` result; the member is a readonly Identifier array.
No current-commit raw artifact or parser trace was produced. This is a real
compile regression requiring a consumer fix before the carrier change can be
considered accepted. `compileForOfArrayTentative` probes an expression and
recompiles after rollback/head setup, so a representation mismatch between
those passes is a hypothesis to verify, not an established cause.
The second-stage vec attempt now returns refusal after rollback instead of
emitting an error, allowing the existing iterator route to consume the value.
Pre-materialized vec contract violations still emit errors. Self-contained
receiver-scope controls caught an important intermediate regression: the
boolean-only fallback compiled `for (const values of values)` but returned
the wrong result instead of throwing ReferenceError. Both routes now share
the existing lexical-head TDZ setup. The final focused matrix is **30/32**:
six new loop controls, four equivalence controls, and 20/22 scanner controls;
only the two known implicit class-to-interface traps remain. Log:
`.tmp/forof-head-shared-tdz.log`. Twelve fixture-backed loop rows could not
run because their test262 source files are absent; they are unmeasured, not
passes. Fresh typecheck exited zero
(`.tmp/forof-shared-tdz-types-verified.log`); LOC/function gates pass with no
new allowances.

Diagnostic capture with `e82d957d28` plus the **boolean-only fallback**, before
the shared TDZ correction, compiled successfully: **38,823,405 bytes**,
**391,081 ms**, seven diagnostic-only imports. Artifact:
`.tmp/incremental-raw-e82d-forof-candidate.wasm`; log:
`.tmp/incremental-capture-e82d-forof-candidate.log`. This is not standalone
acceptance and does not validate the final TDZ correction in the large graph.
Callback 0 on that artifact reaches `findChildName` and throws
**Could not find child in parent**, rather than the earlier null
`commentDirectives` failure (`.tmp/incremental-e82d-forof-trace-0.log`). A
changed stopping point is not a passing original test. Callback 69 now also
reaches the same parent/child failure; callback 52 still fails at 8564:12
after `attachFileToDiagnostic`, with iterator helpers immediately before the
throw. Logs: `.tmp/incremental-e82d-forof-trace-69.log` and
`.tmp/incremental-e82d-forof-trace-52.log`. Next: trace the parent/child
identity mismatch and diagnostic iteration, then rerun the final candidate
through the original zero-import suite without diagnostic substitutions.

Added explicit and implicit derived-constructor controls shaped like
`NodeObject`/`SourceFileObject`, including inherited symbol/original fields and
own readonly-array/string fields. All **20/20** field-value rows pass
(`.tmp/required-inherited-candidate.log`); simple inheritance alone therefore
does not reproduce the remaining full-suite failure. This does not prove
the original parser's more complex constructor/allocation paths correct.

Follow-up after `6013592a494`: standalone parent/child identity reductions
reproduce **6/12 failures** (IR off/on). Optional plain-object node, class
array, and derived-class array cases fail; plain arrays, class nodes, and
arrays with properties pass. An isolation matrix with IR enabled shows all
six receivers enumerate the expected child property, while direct property
comparison and removal of the own-property check retain the same three
failures. This narrows the next investigation to value/identity at the read
or call boundary, not absent enumeration keys. Logs:
`.tmp/parent-child-identity.log` and
`.tmp/parent-child-identity-isolation.log`. No production fix claimed yet.
The original optimized zero-import suite is running against `6013592a494`
in session 51976 (`.tmp/incremental-forof-shared-tdz-o1.log`); poll that
handle, do not restart on an observation timeout.

The array reductions identify a missing consumer of the existing projection
identity map: standalone `__extern_strict_eq` compared physical vec views,
while property sidecars already used their canonical root. Candidate shared
helper normalizes both equality operands through that existing root helper;
non-array values retain their original references. New native-oracle tests
are **6/10 on exact 6013592a494 → 10/10 with the candidate**, including
distinct-array and NaN/null/undefined/primitive controls, in both IR modes.
Adjacent nullable/NodeArray matrix yields **13/14 overall**, with a GC
shared-metadata failure awaiting baseline verification. Logs:
`.tmp/array-identity-baseline-tests.log`,
`.tmp/array-identity-candidate-tests.log`.

This does **not** close the original parser failure: applying the same
normalization diagnostically to the captured full artifact still throws
`Could not find child in parent` for callback 0
(`.tmp/incremental-e82d-canonical-eq-0.log`). The remaining plain-object
reduction is not merely a distinct reference: the callback receives **null**
while the parent's dynamic property still holds the live child (native mask
48, Wasm 34 in `.tmp/parent-child-value-shape.log`). Next trace checks whether
the full parser sees the same null child. The first diagnostic equality-patch
attempt omitted Binaryen feature flags and failed instrumentation validation;
only `.tmp/parent-child-canonical-eq-valid.log` is usable evidence.
The full artifact's first `findChildName` receives **non-null parent and
child**, so the plain-object null reduction is not that observed stopping
point (`.tmp/incremental-e82d-child-null-0.log`). Do not conflate them.
The GC shared-metadata failure reproduces on exact `6013592a494`
(`.tmp/array-identity-adjacent-baseline.log`). Equality helper extraction into
`extern-strict-eq.ts` retains the old exported API, avoids increasing the
oversized `any-helpers.ts` budget, and keeps both IR modes on one helper.

The full original incremental suite on `6013592a494` finished, session 51976
exit 1: valid optimized standalone **24,303,961 bytes**, **653,610 ms**,
**zero imports**, native **153/153**, Wasm **0/153**. Errors are now
`Could not find child in parent` and the 8564:12 diagnostic failure. Log:
`.tmp/incremental-forof-shared-tdz-o1.log`. This verifies compilation recovery,
not unit-test acceptance; the newer array identity candidate was not loaded
by that already-running compiler and is not credited with these results.

Final equality body extraction leaves registration (including the existing
coercion-engine helper lookup) in `any-helpers.ts`; only instruction building
moves. This avoids both a circular registration import and a false new-site
charge from moving a sanctioned coercion lookup. No allowance was added.
Fresh typecheck passes; four-file identity/BigInt/NaN/fast-equality controls
pass **37/37** (`.tmp/array-identity-body-tests.log`). LOC, function,
coercion, oracle, and preservation-only reachability gates pass; strict graph
closure remains **FAIL/OPEN**.

More precise full-graph tracing identifies the first parent as kind 308,
positions 0–109; the child is an array of length 1 with the same positions.
The parent-property trace reads no `statements` property before failing
(`.tmp/incremental-e82d-parent-properties-0.log`). A new reduction now matches
that distinction: a derived class with `children!: N[]`, initialized after
construction, passes direct identity but **fails enumeration**, whereas an
inline `children = []` initializer passes (`.tmp/parent-child-required-field.log`).
Inspect `collectClosedStructEnumerationEntries`: its first-match arms currently
follow struct insertion order without ordering subtype before supertype. A
base `ref.test` can capture a derived instance and omit the derived fields;
this is the next hypothesis to verify, not yet a production fix. The first
`hasProperty` instrumentation assumed an externref key and failed validation;
the typed-key retry also failed during Binaryen instrumentation (session
91482 terminal exit 1, `.tmp/incremental-e82d-parent-has-property-valid-0.log`)
and yields no runtime evidence. The scratch tracer now targets the native
`__hasOwnProperty` helper with an explicit externref-signature guard instead.
It must distinguish an absent enumeration key from an own-property rejection
before attribution.

The native-own-property trace completed (`.tmp/incremental-e82d-parent-native-own-0.log`):
only 22 base/optional names reach `hasOwnProperty`; `statements` is absent,
so the full failure is missing enumeration, not rejection of that key.
The derived-field reproduction confirms the ordering defect: **0/12 before,
12/12 after** testing physical descendants before ancestors across `for-in`,
`Object.keys`, and `Object.getOwnPropertyNames`, with two hierarchy depths
and both IR modes. Combined with array identity, **22/22 pass**
(`.tmp/derived-enumeration-baseline.log`, `.tmp/derived-enumeration-candidate.log`).
Candidate ordering lives in shared IR `struct-dispatch-order.ts`, using the
actual Wasm supertype graph rather than source registration order. It rejects
invalid/cyclic hierarchy records and preserves same-heap shape/stamp ordering.
The existing collector is extracted from the oversized runtime module without
changing field membership, presence guards, or builtin filtering. Both existing
reflection consumers use the same ordered entries; no parallel legacy body.
Original-suite acceptance and broader reflection regressions remain pending.

Reflection matrix is **59/60**, with the one `computedWriteCtorField`
failure (expected 11, got 1) reproducing unchanged on exact `fadf85262fb`.
Additional layout/cold-tail/closed-struct controls pass **19/19**. Logs:
`.tmp/derived-enumeration-reflection.log`,
`.tmp/derived-enumeration-adjacent-baseline.log`,
`.tmp/derived-enumeration-layout-controls.log`. Typecheck, lint, LOC/function,
coercion and oracle gates pass with no new allowances. Reachability is still
preservation-only PASS / strict closure FAIL/OPEN.
The optimized original suite runs in session 28132, log
`.tmp/incremental-derived-enumeration-o1.log`; the raw diagnostic capture runs
in session 70809, log `.tmp/incremental-capture-derived-enumeration.log`,
artifact `.tmp/incremental-raw-derived-enumeration.wasm`. Both started with
`fadf85262fb` plus the complete enumeration-order candidate; later edits only
relocated a comment or recorded evidence. Do not restart a live handle.

Both builds are now terminal. Raw capture: **38,824,332 bytes**, **519,552 ms**,
seven diagnostic-only imports. All three bounded callbacks finished: 0 and 69
now fail the invariant on null **`_declarationBrand`** (149:38), while 52 still
fails at 8564:12. Logs `.tmp/incremental-derived-enumeration-trace-0.log`,
`.tmp/incremental-derived-enumeration-trace-69.log`, and
`.tmp/incremental-derived-enumeration-trace-52.log`.
The original optimized suite compiled valid standalone **24,303,975 bytes**,
**750,949 ms**, **zero imports**, native **153/153**, Wasm **0/153**:
152 failures at 149:38, one at 8564:12. Error movement is not a passing test.

The enumeration candidate is **unfinished**: it exposes physical `declare`
brand slots that are type-only, not runtime own properties. New tests require
that a declare-only field be absent initially but appear after an explicit
write; the expanded matrix is **12/14**, both declare-field rows failing
(`.tmp/derived-enumeration-declare-fields.log`). A static blacklist of declared
names would be insufficient because later writes must create the property.
Investigate shared field-presence state across initialization, typed/IR writes,
dynamic writes and reflective reads; do not merely skip the TypeScript brand.

The other failure has an independent reduction: assigning a rest vector,
pushing one item, or looping over rest items all preserve the diagnostic;
`relatedInformation.push(...related)` and a local-alias spread instead store
**null** (native 7, Wasm -3). Source:
`.tmp/diagnostic-related-push.mts`; baseline log:
`.tmp/diagnostic-related-mutation-isolation.log`.
The old spread router excludes standalone/WASI and externref-shaped receivers,
then the fallback treats the spread vector as a single element. Removing only
the target exclusion fixes the local-alias case, not the property receiver.
Current uncommitted experiment admits native-only receivers through the
existing spread router; evaluate `.tmp/diagnostic-related-mutation-native-candidate.log`
before accepting it. No new spread lowering body or upstream workaround.

The final spread routing candidate passes **18/18** new native-oracle tests
versus **8/18** on exact `fadf85262fb`'s `array-methods.ts`, plus **8/8**
existing spread tests. Native-only opaque sources (e.g. generators) must use
the existing iterator-aware argument builder, not the indexed host bridge;
the intermediate widened router failed both generator rows until this was
corrected. Typed native vec sources retain the existing fast path, and host
externref receivers retain their existing guard. Logs:
`.tmp/diagnostic-push-spread-baseline-tests.log`,
`.tmp/diagnostic-push-spread-iterator-candidate-tests.log`.
This spread fix is separable from the unfinished enumeration candidate and
does not establish a pass for the original callback 52 until rerun in the
full graph. Preserve the declare-field failures as ordinary failing tests.
The same **26/26** spread tests pass with the unfinished enumeration change
substituted away (`.tmp/diagnostic-push-without-enumeration-candidate.log`),
so the spread repair can be checkpointed independently. Current combined
typecheck and lint pass (`.tmp/derived-and-push-types.log`,
`.tmp/derived-and-push-lint.log`). The declaration-presence work remains
uncommitted and must not be described as ready to merge.

### Follow-up upstream sync and declaration-presence investigation

Authoritative `loopdive/js2` main advanced by eight commits to
`bc73c88a67b017522c4e1d53a28a1d675bec3e5b`. The pending spread fix was saved
separately in `10af848c16`; the unfinished enumeration candidate and its
ordinary failing regressions were preserved in `2c7ed4a75a`. Signed merge
`12bfa72f46` incorporates that main tip without conflicts. Neither checkpoint
claims full upstream unit acceptance; the enumeration work is not merge-ready.

Post-merge typecheck passes. The six-file focused matrix passes **47/49**:
all 26 spread tests, all six incoming higher-order/reduce-as-value tests,
all three dispatch-order tests and the 12 established enumeration tests pass.
Only the two known declare-presence cases fail (expected 11, got 1).
Logs: `.tmp/post-bc73-sync-types.log`, `.tmp/post-bc73-sync-tests.log`.

Continuation expanded the enumeration matrix to **14/22**. All eight
declare-presence variants fail identically: typed/dynamic writes of either
9 or `undefined`, with IR off/on. Both added controls preserving an existing
base field through a derived `declare` redeclaration pass. Thus presence must
be independent of stored value and must not erase an inherited runtime field.
Log: `.tmp/post-bc73-declare-presence-matrix.log`. These tests deliberately
remain ordinary failures, not expected-failure markers.

Next implementation boundary, grounded in the current source:

- Class layout collection includes declaration-only slots, while shared IR
  `collectClassInstanceInitializerSources` correctly omits their initialization.
  Establish source-owned presence metadata before `commitClassStructLayout`
  publishes the exact allocator object to the ABI sidecar.
- Existing `FieldDef.presenceTracked`/`presenceBit` consumers cover reflective
  enumeration, property reads, direct property assignment, member dispatch and
  dynamic closed-struct writes. Their current writers are the function-constructor
  layout builders, not class collection. Audit inherited packed-word ownership
  and layout signatures before adding class writers.
- `IrClassLowering` currently exposes field indices but no presence operation;
  `class.get`/`class.set` in `lower-generic.ts` emit raw struct access. A class-only
  layout flag is therefore insufficient: carry the contract through the exact
  IR class resolver and shared lowering, including reads of absent fields.
- Forward-field finalization shares parent `FieldDef` objects with descendants;
  preserve those identities and the undefined carrier. Do not substitute a
  name blacklist or a tombstone initializer without matching every write path.

### Declaration-presence candidate after the sync

The shared IR layout planner now assigns packed own-presence bits to new
`declare`/`abstract` slots before publishing the class allocator layout. It
preserves the inherited field objects, leaves existing runtime fields alone,
and defaults absent numeric storage to the existing undefined sentinel.
`IrClassLowering` exposes the exact presence slot; shared IR field stores set
it after storing the value, saving the receiver once. The implementation is
extracted into `lower-class-field-store.ts`, not added to the oversized driver.
Direct constructor initialization uses the same packed-bit helper.

Additional observations required repairs beyond the initial layout change:
nominal class reads bypassed presence and read raw null; several presence-miss
branches used a flag-gated null fallback instead of canonical undefined; and
statically typed `Object.keys` expanded physical fields, including hidden
presence words. Tracked receivers now use the existing runtime enumerator.
An intermediate experiment writing canonical undefined into every absent
externref allocation slot caused exceptions and did not repair reads; it was
removed. Absence is represented by the bit and handled by the read path.

Current focused values: **36/36** across enumeration and lifecycle tests,
versus **22/36** on exact `12bfa72f46`. The lifecycle test additionally asserts
that the numeric method-write body is emitted by IR with no legacy body.
Removing only the IR store repair gives **12/14**, failing the constructor
write and method write in IR mode; the candidate gives **14/14**. The fixture
returns a number so the existing unrelated void-return selection refusal
cannot make that assertion vacuous. Logs:
`.tmp/class-presence-init-candidate.log`, `.tmp/class-presence-ir-owned.log`,
`.tmp/class-presence-final-baseline.log`,
`.tmp/class-presence-ir-store-removal.log`.

The layout planner's word-boundary/idempotence and inherited-prefix controls
pass **2/2**. Adjacent reflection, expando and undefined-storage suites pass
**70/70**; the initial combined **83/84** run had only the now-corrected
void-return fixture's IR-ownership assertion failure, not a value failure.
The existing proven-receiver census remains **4/5** on both candidate and
exact baseline (expected at least four inline observations, observed three).
Existing class compile-once ownership gives **33/42**, with the nine failure
rows recorded in `.tmp/class-presence-plan-ownership.log`; the exact baseline
also gives **33/42** with the same nine rows
(`.tmp/class-presence-ownership-baseline.log`, session 11514 terminal).
Do not treat these ownership failures as accepted or repaired by this slice.

Typecheck, changed-file lint/format, LOC/function, coercion and oracle gates
pass without new allowances. Reachability remains preservation-only PASS,
strict closure FAIL/OPEN. Original-suite run **37047** is now terminal:
`.tmp/incremental-declare-presence-o1.log` records valid O1 standalone Wasm,
**24,314,217 bytes**, **673,104 ms**, **zero imports**, native **153/153**,
Wasm **0/153** (all illegal casts). This is the presence repair committed as
`aec14ef7ca`, not the later generic comparer candidate. Diagnostic capture
**43464** is also terminal: `.tmp/incremental-raw-declare-presence.wasm`,
**38,846,942 bytes**, **479,950 ms**, seven diagnostic imports; log
`.tmp/incremental-capture-declare-presence.log`. It is not standalone acceptance.
Unmodified callback 0 and 52 traces pass the previous declaration-invariant
and spread stops and reach `compareTrees → reusedElements → filter → contains`;
both stop in `__call_fn_method_2` with an illegal cast. Trace logs are
`.tmp/incremental-declare-presence-trace-0.log` and
`.tmp/incremental-declare-presence-trace-52.log`.

### Shared generic comparer argument carrier

The actual raw binary specializes `contains<T>`'s value parameter to f64 and
`equateValues<T>`'s arguments to string references (`__str_equals`), based on
the first local calls. The same shared functions later receive AST nodes in
`reusedElements`. Preserve direct, unconstrained function type parameters as
externref in the existing shared declaration ABI planner, before first-call
specialization can replace them. Constrained parameters are unchanged. Both
compiler paths consume this planner; no parallel legacy-only lowering is added.

`tests/issue-1058-generic-comparer-carrier.test.ts` compares native ES2022 values
and zero-import standalone values in IR-off/on modes: **16/16**, versus **8/16**
with only `declarations.ts` restored from exact `aec14ef7ca` via a Vite transform.
The cases exercise numeric and object identity, default and explicit callbacks,
filter/contains nesting, and earlier string/numeric calls followed by objects.
Logs: `.tmp/generic-comparer-candidate.log`, `.tmp/generic-comparer-baseline.log`.

Nine adjacent files initially give **129/132**. All three failing rows reproduce
against exact `aec14ef7ca` in the two affected files (**7/10** on baseline).
The optional-reference callback test expected an obsolete bail; checking its
actual value instead gives the correct **42** on both candidate and baseline
(`.tmp/generic-comparer-undefined-value.log` and its `-baseline.log` counterpart).
That assertion is corrected, not counted as a production repair. The generic
object-table callback and constrained factory flag failures remain OPEN.
Source typecheck and LOC/function/coercion/oracle gates pass; reachability remains
preservation-only PASS, strict closure FAIL/OPEN. No new allowances.

Original-suite O1 run **58719** is terminal: native **153/153**, standalone
**90/153**, valid **24,313,652-byte** binary, **667,459 ms**, **zero imports**.
`.tmp/incremental-generic-comparer-o1.log` records all 63 remaining assertion
mismatches in comment-directive scenarios, beginning at callback 69; no illegal
casts remain in this run. Original `verifyCommentDirectives` compares
`incrementalNewTree.commentDirectives` with `newTree.commentDirectives` at
upstream incrementalParser.ts:877. Sample errors are undefined versus object
and object versus object, not proof that they share one root cause.

Diagnostic capture **40357** is terminal: **38,846,418 bytes**, **444,438 ms**,
seven diagnostic imports (`.tmp/incremental-capture-generic-comparer.log`,
`.tmp/incremental-raw-generic-comparer.wasm`). Callback 0 and 52 both return 1
without reset patches; callback 69 reproduces the first assertion mismatch.
Logs: `.tmp/incremental-generic-comparer-trace-0.log`,
`.tmp/incremental-generic-comparer-trace-52.log`,
`.tmp/incremental-generic-comparer-trace-69.log`.
Both full builds use exactly the production repair committed in `5bc11fda58`,
not the later optional-nested-object candidate below. All 256 upstream
source-unit files and self-hosting remain in scope; 90/153 is not completion.

### Optional nested object construction follow-up

The finalized generic-comparer regression run is **146/148** across ten files
(`.tmp/generic-comparer-final-regression.log`); both failure rows also occur
on baseline. The visitor-table failure is not missing callback dispatch:
both callbacks execute once and one element is collected. Its node is lost
at a typed storage boundary. Removing the table/callbacks still reproduces;
declaring the nested child separately or making its parent property required
repairs it. This reproduces in GC-host and zero-import standalone, IR-off/on.

At exact `5bc11fda58`, the reduced optional recursive interface literal uses
the inferred one-field struct for `{ value: 7 }` inside `tail?: N`, rather
than the contextual `N` layout. Direct `root.tail!.value` returns 7; assigning
it to `N` or pushing into `N[]` returns NaN; passing to `(node: N)` traps.
The emitted conversion tests the `N` runtime layout and substitutes null for
the smaller layout. Evidence: `.tmp/optional-nested-node.log` and its emitted
WAT files; `.tmp/generic-visitor-expanded.log` and
`.tmp/generic-visitor-properties.log` separate callbacks from construction.

Candidate: share the existing spread-literal single-non-nullish contextual
type selection with ordinary object construction. The pure checker helper
does not change multi-shape unions, add checker queries, or mutate compiler
registries; existing allocation machinery owns registration/emission in both
compiler modes. Validation is in progress; do not attribute this later source
edit to the already-running generic-comparer full builds.

Initial candidate regression values: **26/32** new cases versus **10/32** on
exact `5bc11fda58` (only `literals.ts` restored by a Vite pre-transform).
All nine existing multi-file callback tests now pass, including the original
visitor table. Logs: `.tmp/optional-nested-candidate.log`,
`.tmp/optional-nested-baseline.log`. Six raw semantic failures remain:
four missing-own-property
checks return 21 instead of 11, and two GC-host distinct-union controls return
NaN instead of 7 (also wrong on baseline). A direct own-keys control is being
added to test whether allocating the contextual layout introduces an own-key
visibility regression even though the old typed alias already failed. That
additional A/B gives **0/4 on both baseline and candidate**, both returning 2
instead of 1 (`.tmp/optional-nested-ownkeys-candidate.log` and `-baseline.log`).
Thus the property-presence defect is also independently pre-existing.
The finalized test retains desired native values for all **36** cases, with
**10 explicitly expected failures** (eight own-key observations and two GC-host
union cases). These are not accepted semantic behavior or goal completion;
their markers must be removed when the underlying behavior is fixed. The
initial raw-failure logs remain evidence independent of those markers.
Final focused run: **35 ordinary passes + 10 expected failures** across the
36-case carrier file and nine existing callback tests
(`.tmp/optional-nested-final.log`); the reporter's 45 green rows must not be
reported as 45 semantically passing programs.

Seven adjacent files give **45/49** (`.tmp/optional-nested-adjacent.log`). All
four failure rows reproduce on exact baseline in the three affected files
(**5/9**, `.tmp/optional-nested-adjacent-baseline.log`): generic factory flags,
shadowed undefined in a nested optional parameter, and two nullish-spread cases.
Typecheck and LOC/function/coercion/oracle gates pass without new allowances;
reachability remains preservation-only PASS, strict closure FAIL/OPEN.
The optional construction experiment is separate from the proven comparer
repair. Next full-suite failure investigation is the actual upstream
`getNewCommentDirectives` body, initially isolated in
`.tmp/comment-directive-merge.mts` with native value controls.
The actual extracted merge body passes deletion, all-deleted and new-only
reductions in both IR modes; insertion traps in both (**6/8**,
`.tmp/comment-directive-merge.log`). This does not yet reproduce the full
suite's undefined-vs-object deletion mismatch; do not equate the stopping points.

### Erased vector receiver during comment merging

Continuation after `16b003286c`: original-suite O1 session **83937** is terminal
with that exact production state (`.tmp/incremental-optional-nested-o1.log`):
native **153/153**, standalone **90/153**, **24,186,486 bytes**, **589,353 ms**,
valid O1 binary, **zero imports**. The same 63 comment-comparison failures remain
(27 undefined/object at assertion 421, 27 object/object at 422, nine at 683).
Do not attribute the later spread candidate to this run.

The insertion reduction traps in `addNewlyScannedDirectives`: its captured
`commentDirectives` is an externref cell holding the generic `append` result,
but spread-push casts it to the checker-inferred `Directive[]` vector layout.
Those are distinct valid runtime vectors. The dispatch probe additionally
looked at the capture CELL type rather than its value type. Evidence is in
`.tmp/comment-directive-merge-stacks.log` and
`.tmp/directive-reduced-insertion-false.wat`. Scanner-style producers do not
reproduce the full deletion mismatch either (**8/10**, insertion alone traps;
`.tmp/comment-directive-scanner-style.log`).

Candidate: consult the existing boxed-capture value type and route native
externref spread receivers through the existing `__vec_push`/`__vec_len`
dispatch helpers and the shared spread-argument builder. Do not cast the
receiver to its checker element view or duplicate iterable expansion.
The extracted original merge body now gives **10/10** native-matching,
zero-import results in both IR modes (`.tmp/comment-directive-erased-spread.log`).
New durable reduction and adjacent spread checks are still in progress.
This does not yet establish repair of any of the full suite's remaining 63 rows.

Final focused evidence: **14/14** durable erased-vector cases, versus **6/14**
with both changed lowering files restored from exact `16b003286c` by Vite
pre-transform. The first candidate was **12/14**: a canonical undefined receiver
was not caught by a raw null-pointer guard. Reusing the existing native nullish
method-receiver guard restores a catchable TypeError BEFORE argument evaluation.
The controls cover insertion, deletion, empty insertion, absent old input,
self-spread identity and receiver-before-argument ordering in IR-off/on modes.
Together with adjacent diagnostic/rest/splice spread files: **45/45** ordinary
passes (`.tmp/erased-spread-guarded.log`, baseline
`.tmp/erased-spread-controls-baseline.log`). No expected-failure markers here.

This reuses the existing shared argument builder and vector dispatch providers.
The current IR AST selector explicitly declines spread-push in
`array-element-lowering.ts`; IR-on tests therefore also exercise the existing
fallback, not a new claim that spread-push bodies are entirely IR-owned.
No parallel expansion loop or new runtime array representation was introduced.
LOC/function/coercion/oracle gates pass without new allowances; strict
reachability remains FAIL/OPEN (preservation-only PASS).
Diagnostic-only instrumentation of the earlier `5bc11fda58` binary confirms
callback 69 supplies three old directives and undefined fresh directives to
`getNewCommentDirectives` (`.tmp/incremental-directive-inputs-69.log`). The
snapshot's object-field decoder did not expose their fields; its object strings
do not prove the entries are empty or well-formed. The precise full-suite
deletion defect still needs stronger evidence.
Post-candidate source typecheck, changed-file format/lint and issue check pass.
Original-suite O1 run **70877** is terminal:
`.tmp/incremental-erased-spread-o1.log`, native **153/153**, standalone **90/153**,
valid **24,189,083-byte** O1 binary, **653,827 ms**, **zero imports**, same
27/27/9 comment-assertion mismatch rows. Diagnostic capture **81816** is also
terminal: **38,672,300 bytes**, **456,750 ms**, seven diagnostic imports
(`.tmp/incremental-capture-erased-spread.log`,
`.tmp/incremental-raw-erased-spread.wasm`). Both use the complete production
state committed as `db38cfd0f7`, not the guarded-receiver repair below.

### Guarded structural field recovery investigation

The improved callback-69 diagnostic reads native keys built with the binary's
own string constructors, verifies their rendering, then uses the dynamic field
getter. All three old directive entries are valid: ranges **43–56**, **137–150**,
**233–246**, each type **1**, with undefined fresh directives
(`.tmp/incremental-directive-fields-69.log`, artifact from `5bc11fda58`). Thus
the previous object-field snapshot was incomplete, not evidence of empty data.
An additional runtime-layout predicate experiment aborted inside Binaryen
validation (`.tmp/incremental-directive-range-carrier-69.log`); it supplies no
valid runtime evidence and must not be reported as a successful type test.

The actual merge body's WAT uses a guarded cast for the destructured `range`.
`emitNullGuardedStructGet` has a concrete control-flow defect: on cast mismatch
it computes a read using the saved original receiver, then unconditionally
dispatches again on the cast's null result, overwriting that recovered value.
Candidate removes the duplicated recovery dispatch: after checking the backup
is not genuinely nullish, replace the dispatch receiver with that backup and
run the normal primary/alternate/dynamic lookup once. This changes no layout
metadata or coercion vocabulary. Original-suite verification is pending.

Durable zero-import/native-oracle controls now give **12/12**, versus **6/12**
with only `property-access.ts` restored from exact `db38cfd0f7`. The six repaired
rows cover a factory's wider physical layout passing through an optional field,
nested destructuring, and zero/negative values, in IR-off/on modes. Exact-layout
and genuinely null/undefined throwing controls continue to pass. Logs:
`.tmp/guarded-receiver-candidate.log`, `.tmp/guarded-receiver-baseline.log`.
Earlier raw-any/JSON variants do not reach this repair and still trap; do not
claim general structural-cast completeness from this slice.

Diagnostic-only capture **42724** writes
`.tmp/incremental-capture-guarded-receiver.log` and
`.tmp/incremental-raw-guarded-receiver.wasm`; original-suite O1 run **5466** writes
`.tmp/incremental-guarded-receiver-o1.log`. Both start from `db38cfd0f7` plus this
complete recovery repair. Do not restart live handles or call the 63 upstream
rows fixed yet.

Adjacent seven-file run reports 102/104 passes (includes explicit expected
failures, not 102 semantic passes). Both failures reproduce with the exact
`db38cfd0f7` property reader: the presence-read inlining census expects at least
four but sees three, and the module-scope undefined receiver in the member-read
suite unexpectedly passes its stale `it.fails` assertion. Neither is a new
regression or repair credit. Logs: `.tmp/guarded-receiver-adjacent.log` and
`.tmp/guarded-receiver-adjacent-baseline.log`. Typecheck, formatting, lint, LOC,
function, coercion and oracle gates pass. Reachability is preservation-only
PASS; strict modeled closure remains FAIL/OPEN. No new allowance was added.

The next requested upstream sync fetched authoritative main at
`f17af38a810e8ce8a3aa3b33c994a9a9965331ec`: one new baseline-refresh commit.
Repair checkpoint `d737e40205` preceded clean signed merge `2dcdffaa33`.
Post-merge guarded-receiver and erased-spread controls pass **26/26**
(`.tmp/guarded-receiver-post-main.log`). The original-suite runs above remain
pre-merge measurements; upstream changed baselines, not compiler sources.
Raw capture completed: **37,257,961 bytes**, **471,286 ms**, seven diagnostic
imports. Original callback **69 now returns 1** with no reset patches
(`.tmp/incremental-guarded-receiver-trace-69.log`), versus its earlier assertion
failure. This is diagnostic evidence, not a zero-import full-suite result.
Callback **73 also returns 1**, with no reset patches
(`.tmp/incremental-guarded-receiver-trace-73.log`).

Full original incremental-parser O1 run **5466 completed successfully**:
**153/153 native and 153/153 standalone Wasm**, **zero total imports**, valid
**23,656,173-byte** binary, **610,873 ms** compilation. This is up from
90/153 at `db38cfd0f7`, using the original assertions and all registered
callbacks (`.tmp/incremental-guarded-receiver-o1.log`). The measured compiler
is the guarded-receiver checkpoint, before the overloaded-append candidate.
The durable source-unit runner still needs to admit this complete suite;
the 256-file goal and self-hosting are NOT complete.

### Overloaded append receiver follow-up

The extracted real comment-directive merge body with all three upstream
`append` overloads still passes only **4/10** standalone IR-off/on cases on
`2dcdffaa33`; six trap inside `append`. This is not attributed to the full
parser suite. Its `to` parameter is externref, but the method probe narrows it
to an incompatible checker-selected vector before plain `push`. Candidate
preserves erased-storage evidence specifically for native push and reuses the
existing runtime-layout spread builder for ordinary argument lists too.
No new vector layout, runtime helper or iteration implementation is added.
Extracted-body verification is now **10/10** versus baseline **4/10**;
baseline `.tmp/comment-directive-overloaded-recovery.log`, candidate
`.tmp/comment-directive-overloaded-erased-push.log`. Durable standalone
native-oracle matrix is **14/14** versus **8/14** with exact `2dcdffaa33`
array-methods restored by a Vite pre-transform. Repaired rows are optional
directive lists, generic multiple-argument pushes and zero-argument pushes,
each IR-off/on. Numeric/string alias and undefined-value controls remain
passing. Three-file check passes **46/46**; final seven-file adjacent check
passes **63/63** with no expected-failure markers in that set.
Logs: `.tmp/overloaded-append-{baseline,final,adjacent}.log`. No claim that
this slice owns pure IR emission: IR-on may use the shared method fallback.
The nearby ref-kind probe no longer tests an optional `typeIdx` via `any`;
both typed ref variants require that field. LOC/function gates and typecheck
pass without new allowances. The original 153-callback suite is being rerun
against this candidate in `.tmp/incremental-overloaded-append-o1.log`, handle
**8238**. Do not restart while live. Next integration step after retaining
153/153: admit `incrementalParser` to the durable source-unit runner with
original Utils imports/assertions, then move to additional original files.

### Durable incremental-parser source-unit admission

Candidate admits the original `incrementalParser.ts` with a **153 callback**
floor. Only namespace import paths are redirected: services and the original
Utils module, whose invariant/structural comparison routines remain intact.
The existing standalone assertion implementation is also bound globally for
Utils. Native bundling resolves real chai/diff from the installed pnpm
dependency links, without replacing them or installing dependencies. New
runner checks require the unchanged test body and reject drifted imports;
the common verdict tests require all 153 callbacks and zero imports.
Durable-run validation is pending; earlier scratch-driver 153/153 is not
automatically credited to this adapter.

Native generated adapter now passes **153/153**. Independent negative controls
inject a throw into each original `assertInvariants` and
`assertStructuralEquals` function: each produces **0/153 passes**, with all
153 failures attributed to the injected sentinel, so neither tree check is
silently bypassed. Logs `.tmp/incremental-durable-native.log` and
`.tmp/incremental-durable-killswitch.log`. Runner tests pass **14/14**.
Durable standalone O1 handle **40524** remains live, logging to
`.tmp/incremental-durable-runner-o1.log`; earlier-driver candidate rerun
**8238** is separate. Do not restart either based on quiet output.

The earlier-driver follow-up **8238 is now terminal and passes**: native
**153/153**, standalone **153/153**, zero imports, valid **23,649,979-byte** O1
binary, **598,327 ms** compilation. This revalidates `a1d142d1a1`'s generic
push change. Durable-adapter run **40524** subsequently also passed
**153/153 native and 153/153 standalone**, zero imports, valid **23,649,983-byte**
O1 binary, **669,890 ms** compilation. Its 14 runner tests, unchanged original
tree checks, and negative-control failures above remain part of the evidence.

Next compiler stage is the full checker, whose older measurement stopped at
an out-of-frame local in `shouldRemoveDeclaration`. A tracked standalone
checker wrapper now keeps all three existing oracle strings inside Wasm,
instead of crossing the host boundary with JS strings. Its fixture test
requires byte-for-byte equality with all three existing inputs. Expected
numeric oracles remain **67858 / 0 / 133394**, not weaker compile-only checks.
Native wrapper returns all **3/3** expected numbers
(`.tmp/checker-standalone-native.log`); combined adapter/fixture tests pass
**17/17**. A fresh full-checker standalone build with all three required
zero-argument invocations is now running through the existing build probe
(`.tmp/checker-standalone-full.log`, handle **13735**, one-hour timeout,
8192 MB worker heap).
No fresh full-checker compilation or Wasm execution is yet credited.

### Next original unit file: semantic versions

While those builds run, the unmodified `semver.ts` callback body is being
measured against the original compiler namespace and original Utils.theory.
Native requires the existing registration functions bound on globalThis so
the separately imported theory helper can register its callbacks; without
that binding, native initialization correctly fails rather than reporting an
empty pass. With those bindings it registers and passes **692/692** callbacks
(`.tmp/semver-native.log`). Standalone original-source O1 run **25190** is
active in `.tmp/semver-original-o1.log`; no Wasm coverage credited yet and the
file has not been admitted to the durable accepted-file list. The scratch
driver is `.tmp/next-source-unit.mjs`; its initial diagnostic exit code remains
1 regardless of success, so inspect result rows and provenance, not that code.

Semver O1 run **25190 is terminal**: valid zero-import **6,924,238-byte** binary,
**174,962 ms** compilation, native **692/692**, but Wasm initialization throws
`TypeError: Array method called on null or undefined` before registration
completes. Its reported Wasm count is **0**, not a passing empty suite:
acceptance is **0/692**. Tracing later confirms some earlier callbacks had
registered before the exception; the fatal result does not expose that partial
registration count.
A diagnostic-only deferred-init capture is active in `.tmp/semver-capture.log`,
artifact `.tmp/semver-raw-bbedc0f5bc.wasm`. Next locate the original call chain
with `.tmp/source-unit-init-trace.mts`, then reduce it without weakening the
original theory helper or callback assertions.

Raw capture completed: **9,281,033 bytes**, **119,606 ms**, zero imports.
Entry tracing reproduces the same startup TypeError inside original `theory`,
after its first call from the semantic-version comparator table. The caller's
WAT builds **610 tuple rows**, then projects the outer vector to a vector of
inner vectors; each tuple fails the inner vector `ref.test` and is replaced
with null. `theory` then throws on `entry.map(...)`. Evidence:
`.tmp/semver-init-trace.log`, `.tmp/theory-full-caller.wat`,
`.tmp/theory-full.wat`. This is concrete representation loss, not a missing
test registration or Version constructor failure. A same-file reduction also
fails but uses dynamic tuple-method lookup, so do not conflate that path with
the original nested projection. A two-module projection reduction fails in
both IR modes (`.tmp/theory-projection.log`, expected value 17). Any repair
must retain array identity and mutation behavior, not merely copy tuples into
fresh unrelated arrays to make this read-only test pass.

Candidate investigation now separates three boundaries. In the shared type
resolver, retain erased elements for `T extends Array/ReadonlyArray/tuple`
constraints instead of narrowing each tuple to a vector. This preserves the
row but exposes a second illegal cast: nested native join skips the unsafe
closure-producing receiver probe yet assumes the checker's vector layout,
where the dynamic map actually returns ObjVec. Route that already-skipped
probe shape through the existing array-like join, still evaluating once.
That produces 0 instead of 17 because dynamic HOF dispatch recognizes vec and
ObjVec but not native tuples. Candidate adds tuple brands to its existing
finalize-time predicate and reuses the original HOF implementation.

No shared metadata is mutated. `tupleTypeMap`'s sole setter is tuple
registration in `index.ts`; its values are the exact tuple carrier types.
The existing dynamic indexed-reader finalizer already uses the same map to
provide tuple length, Get and HasProperty. The new predicate is also filled
at finalization and remains below user closed-method arms. Tests must verify
callback receiver identity and visible mutation; candidate is NOT accepted.

With all three boundaries repaired, the two-module reduction returns native
**17** in both IR modes. Durable 12-row identity/mutation/readonly/vector
controls are running in `.tmp/generic-tuple-rows-candidate.log` (**4651**),
and original semver rerun in `.tmp/semver-tuple-rows-o1.log` (**72621**).
No 692-callback coverage is yet credited to this candidate.

Fresh full-checker run **13735 completed unsuccessfully**, not timed out:
**1,480,800 ms**, **4,224.8 MiB** observed peak RSS, zero binary bytes and no
Wasm invocations. It reproduces the old out-of-frame access, now with
**3 parameters + 27 locals**: `SyntacticTypeNodeBuilderResolver_shouldRemoveDeclaration`
references local **284**. There is one non-warning error (29 accompanying IR
lowering warnings); the input/oracle wrapper is not the blocker. The method
body is embedded in `.tmp/checker-standalone-full.log` for frame attribution.
This measurement predates the current tuple-row candidate and does not
certify any checker execution. Do not restart unchanged compilation.

Earlier requested upstream sync completed: authoritative `loopdive/js2` main at
`c603404b4f2258ed59377bd591a287523e4af99b` merged cleanly in signed commit
`c6d4582ccf`. The unfinished candidate was preserved first in `55261207d1`.
Post-merge eight-file run: 125 rows, 110 ordinary passes, four expected
boolean/bigint failures, and the same 11 unexpected failures listed below
(`.tmp/required-field-post-main.log`). All seven host-import-policy tests pass.
Four additional source-proof checks now cover safe constructor prefixes,
observation barriers, derived super/private fields, and conditional writes;
the source-proof file passes 8/8 (`.tmp/required-field-proof-tests.log`).
No new full TypeScript parser acceptance claim follows from these reductions.
Post-merge TypeScript typecheck also exits zero
(`.tmp/required-field-post-main-types.log`); the additional proof tests pass lint.

The required-field candidate is **not ready to merge**. The native-oracle
regression file passes 12/12 with the candidate versus 0/12 with the two
production modules substituted from `8eb72dd5cc`. The six-file candidate run
finishes at 78/89, with 11 failures: five previously recorded constructor
failures plus six additional IR-ownership failures (base-before-derived work,
mutually recursive layouts, and self-recursive layouts, in both lanes).
Logs: `.tmp/required-field-candidate.log` and
`.tmp/required-field-baseline.log`. Both runs are terminal, not still running.
Preserve this checkpoint for the requested upstream merge, then resolve the
extra IR regressions before publishing this candidate as a fix. Original
incremental-parser acceptance has not been rerun with this candidate.

Fresh bounded tracing of the `8eb72dd5cc` raw diagnostic build identifies
**`symbol`**, not `emitNode`, as the next null child (`isNodeOrArray`, callback
0). Artifact **41,909,421 bytes**, compile **370,312 ms**, seven throwing
diagnostic-only Node imports; initialization reaches 153 callbacks and the
traced callback reaches the original invariant. This is not standalone
acceptance. `.tmp/incremental-current-null-key.log`.
The original `NodeObject` declares `symbol!: Symbol` without assigning it in
the constructor. Next implementation: include required implicit field writes
in the shared IR plan, while preserving precise storage for fields whose
undefined initialization is provably overwritten before any observation.
Use only a side-effect-free constructor prefix of own-field assignments from
plain parameters/literals, reject elision if any instance initializer exists,
and account for the first derived `super()` boundary. Arbitrary later writes
are not such proof. Keep the constructor ownership controls unchanged.

IR follow-up inspection at `8eb72dd5cc`: `buildIrClassShapes` records source
field types through `tsTypeToClassPositionIr`, which does not represent
optional unions. Its fallback `valTypeToIrField` accepts only f64/i32,
despite an older comment mentioning reference types. Widened externref fields
therefore reject the complete class projection before constructor lowering.
Do not merely admit every externref as `dynamic`: the dynamic backend carrier
depends on `ctx.fast` (`resolveIrDynamicCarrierType`), so parity with an
externref struct slot must be proved. General required-field initialization
needs a compatible field representation and read/write conversions, not a
weakened ownership or ABI guard. This is an implementation constraint, not
attribution of the pending fresh parser trace.

Full original-suite rerun at `b2ff16e061` is terminal: valid standalone O1,
**26,195,509 bytes, zero imports, 608,287 ms**, native **153/153**, Wasm
**0/153**. `.tmp/incremental-implicit-plan-o1.log`. The optional-field reduction
improvements have not yet changed original-suite outcomes. The `149:38`
location alone does not prove the remaining property is still `emitNode`.

Next reductions on `b2ff16e061`: a required definite-assignment class field
enumerates as null rather than undefined; a populated recursive diagnostic
array yields a null item; and a function-constructor alias yields a null
result. Each fails with IR disabled and enabled. The omitted-diagnostic-array
control passes both modes (`.tmp/incremental-next-fields-guest.log`). These
are measured reductions, not yet attribution of the current full-suite errors.
Array stage controls show length 1 and one iteration, but both indexed and
iterated item reads fail (`.tmp/incremental-array-stages.log`). The generated
`make` body constructs anonymous struct 64, then converts its vector into
Diagnostic struct 57 using a failing `ref.test` and substitutes null
(`.tmp/incremental-array-make-wat.log`). The contextual reference-carrier query
ignores the optional `Diagnostic[] | undefined` union. A scoped substitution
experiment strips nullish context before that existing selection. It preserves
the previously null array item in both modes, but a subsequent `.file ===
undefined` comparison still fails: this is a second field-representation gap,
not proof that the original diagnostic callback passes. Production source is
unchanged during that experiment. The durable matrix then measured **2/10
baseline, 10/10 candidate** (standalone, IR disabled/enabled), covering optional,
explicit undefined/null unions, readonly arrays and a non-nullable control.
The first draft supplied the nested optional field explicitly and passed on
both sides; it was corrected to retain the omitted field that reproduces the
layout mismatch. `.tmp/nullable-array-context-real-baseline.log`,
`.tmp/nullable-array-context-real-candidate.log`.
The production correction normalizes the contextual type at the existing
array-carrier selection boundary in `literals.ts`; it does not add a parallel
lowering or a new runtime conversion. Adjacent array checks have one failure
on both baseline and candidate: #2021 — “array literal [new Subclass(), new
Base()] traps 'dereferencing a null pointer' — element type taken from first
element, contextual annotation ignored”, subclass-first ancestor-field method read.
`.tmp/nullable-array-context-candidate.log` (42/43 before the corrected matrix).
The production rerun likewise gives **42/43**, with that same baseline failure
(`.tmp/nullable-array-context-production.log`).

Follow-up sync: fetched `loopdive/js2` main at
`05f3f5e8e5f94669ad9b9d5cf0f633455106d1a5` and merged without conflicts as
`b5c8e93e40`. The pending reproductions/handoff were preserved first in
`83b253043e`. Post-merge policy and field checks: **33 ordinary passes and
5 expected failures**, not 38 semantic passes (`.tmp/main-sync-05f3-focused.log`).

Resumed implementation uses an absent expression in the shared IR constructor
plan to represent an implicit undefined write, anchored to the original field
declaration. Selection and both direct-call/dependency-root collectors skip
these non-expression operations. The IR lowers them through the canonical
undefined producer or the exact numeric undefined sentinel; the direct adapter
consumes the same plan. No synthetic TypeScript nodes or weakened ownership
checks. Type-only/static declarations remain excluded.

The admitted scope is **optional fields only**. Widening required reference
fields disturbed existing exact-layout class projection, so that broader
attempt was narrowed. Required uninitialized fields remain follow-up work.
On the merged baseline, the 73 constructor ownership checks yield **68 passes,
5 failures** (`.tmp/implicit-ir-plan-baseline-tests.log`); the narrowed candidate
retains those same five failures (`.tmp/implicit-ir-plan-optional-tests.log`).
The original 18 reference runtime rows now pass. Two string rows also improve;
numeric rows preserve baseline behavior after retaining the exact sentinel.
An explicit numeric constructor proves `irBodyEmitted: true` and
`legacyBodyEmitted: false` (`.tmp/implicit-ir-plan-numeric-tests.log`). The
interface-reference example still rejects class projection and uses the direct
adapter even with IR enabled; do not claim that example is IR-owned.
Four boolean/bigint optional-field rows fail on both baseline and candidate
and remain expected failures, not semantic passes
(`.tmp/implicit-ir-plan-scalar-baseline.log`).

Final focused matrix: **97 ordinary passes, 4 expected scalar failures, and
the same 5 baseline constructor failures**, 106 total
(`.tmp/implicit-ir-plan-acceptance.log`). This includes both derived optional
field checks: initialize after `super()` but before the following field.

The full original incremental suite has **not** been rerun on this new attempt;
the last full result remains the 0/153 measurement below. Strict modeled
reachability closure remains OPEN; preservation checks do not certify deletion.

At `acb870289f`, original-suite session **64524** completed: O1 standalone
compiles and validates **26,194,816 bytes**, **zero imports**, **599,745 ms**;
all **153 callbacks execute, 0/153 pass**, with the same `149:38` / `8564:12`
error locations (`.tmp/incremental-field-storage-o1.log`). Thus the explicit
field fix's reduced wins are not yet full-suite wins.

Next measured gap: a declared reference field with **no initializer** also
reads null instead of undefined. Four new native-oracle rows fail on the
committed compiler: dynamic/descriptor reads, IR off/on. An implicit-field
experiment made all **18/18** runtime reduction rows pass, but was **withdrawn**:
fabricated `void 0` AST nodes violate exact IR source ownership. Giving them
parent pointers only reduced the constructor failures to **36/73**, versus
**5/73** on the unchanged `acb870289f` baseline (31 new failures). Production
files were restored exactly; no regression is shipped. Evidence:
`.tmp/implicit-field-baseline.log`, `.tmp/implicit-field-candidate.log`,
`.tmp/implicit-field-parented-tests.log`,
`.tmp/implicit-field-constructor-baseline.log`.
The rejected experiment is preserved in `.tmp/implicit-field-synthetic-attempt.patch`.
Four runtime rows and one source-order-plan row remain explicit expected
failures, **not semantic passes**.

Implementation handoff: represent implicit initialization as an explicit IR
plan alternative anchored to the existing property declaration, not a synthetic
expression. Update `collectClassInstanceInitializerSources`, constructor
selection, imported-call dependency roots, and `lowerConstructorFieldInitializers`
to distinguish implicit undefined from executable source expressions. Preserve
source order, parameter-property order, type-only/static exclusions and numeric
storage semantics; re-run the exact 73-test constructor baseline before shipping.

The one different original callback, index **52**, “Removing block around
function declarations”, fails while attaching diagnostic related information.
Bounded raw tracing reaches `attachFileToDiagnostic`; source `utilities.ts:8564`
is `isDiagnosticWithDetachedLocation` reading `diagnostic.file` inside the
related-information traversal. `.tmp/incremental-callback-52.log`.
This is diagnostic evidence, not a standalone acceptance result; preserve the
original invariant instead of adding null guards to the upstream tests.

Follow-up after `0299ff2656`: bounded raw instrumentation identifies the next
bad property as **`emitNode`**, read as null before original `isNodeOrArray`.
`.tmp/incremental-null-key.log`. A native-oracle class reduction proves
**8/12 baseline, 12/12 candidate** for dynamic/property-descriptor reads, IR
off/on, undefined/null/live-object controls. Declaring the reference as
nullable masks the failure; an optional reference without null loses the
explicitly assigned undefined. `.tmp/optional-field-nonnull-baseline.log`,
`.tmp/optional-field-candidate.log`.

The candidate moves the existing void-cleared class-field storage analysis
from `class-bodies.ts` into `src/ir/class-field-undefined-storage.ts`. It also
accepts oracle-proven undefined assignments and explicit property initializers,
so the shared physical class layout retains their values in dynamic storage.
It preserves lexical-arrow ownership while excluding ordinary nested functions,
classes, object methods and static members. It does not normalize every null
field to undefined, weaken assertions, or add a second property-read lowering.
The expanded runtime reduction measures **8/14 baseline, 14/14 candidate**,
including repeated undefined/object/null transitions and object identity.
The three IR-plan scope tests and eight existing field-union tests pass.
Adjacent uninitialized-field tests remain **62/64 on both baseline and
candidate**: two old tests expect the formerly broken callable parameter
property result 0, but both versions correctly return native result 6.
These are stale expectation failures, not newly introduced regressions.
`.tmp/optional-field-expanded.log`, `.tmp/optional-field-expanded-baseline.log`.
Typecheck passes; scoped lint passes with 14 existing warnings in
`class-bodies.ts` (`.tmp/optional-field-typecheck.log`,
`.tmp/optional-field-lint.log`).

Original-suite run **90753** is terminal exit 1: the loop-reset candidate
compiles and validates **26,196,119 bytes**, **zero imports**, in **597,199 ms**,
initializes and executes **153 callbacks**, but **0/153 pass**. Error locations
are `149:38` and `8564:12`; it no longer hangs at callback 31.
`.tmp/incremental-loop-reset-o1-tsx.log`. This is not a measurement of the later
field-storage change. Its corrected O1 run, session **64524**, subsequently
completed; see the `acb870289f` measurement above.

Follow-up candidate after `d5565d3da7`: the existing variable initializer now
resets bare lexical nullable-reference locals on every declaration execution,
using the existing undefined producer and storage coercion. Bare `var`
redeclarations retain their values. IR already emits the scalar initialization;
the reference reductions currently fall back because their assignments are not
admitted by IR, so this is a fallback correctness repair, not an IR migration
claim or a new duplicate lowering path.

Bounded native-oracle reduction, standalone with IR off/on, arrays, nominal
arrays, objects and numbers, `let`/`var`, captured/uncaptured: baseline
**22/32**, candidate **28/32** (`.tmp/loop-local-reset-expanded-baseline.log`,
`.tmp/loop-local-reset-expanded.log`). Six uncaptured lexical-reference cases
flip. The remaining four optional-number closure cases fail identically on
both sides: undefined returned through the closure is not recognized by
`=== undefined`. These are explicitly retained as expected-failure tests,
not counted as semantic passes. Existing adjacent suites for captured
initialization, bare `var` redeclaration and closure struct types pass **22/22**.
The first candidate also passed the existing explicit IR initialization suite
**10/10** (`.tmp/loop-local-reset-candidate.log`).
Final regression command reports **64/64** across five files, which explicitly
includes **four expected failures**, not 64 semantic passes. The scalar loop
control asserts actual IR body emission. Typecheck and scoped lint pass (two
pre-existing `noExplicitAny` warnings in the variable compiler).
`.tmp/loop-local-reset-final-tests.log`, `.tmp/loop-local-reset-typecheck.log`,
`.tmp/loop-local-reset-lint.log`.

The diagnostic reset's next guest error decodes to
`Cannot access property on null or undefined at 149:38`, original harness
`isNodeOrArray`: `a !== undefined && typeof a.pos === "number"`.
`.tmp/incremental-reset-decoded.log`. Do not weaken this original invariant.
A first original-suite launch exited before compilation because its worker
lacked the TypeScript loader (`.tmp/incremental-loop-reset-o1.log`, session
54748 terminal exit 1). The corrected original 153-callback O1 run with the
production reset candidate completed as session **90753**;
`.tmp/incremental-loop-reset-o1-tsx.log`, results above.

Merged authoritative `loopdive/js2` main `349eab3bf5` into
`codex/1058-typescript-standalone` as signed merge `52af6cfb3e`.
All 15 incoming commits merged without conflicts; no compiler-source files
changed on the incoming side. Post-merge focused regressions pass **40/40**
across module/global bindings, initialization error rendering, nominal-array
descriptors and own-field write coherence. Typecheck passes.
Artifacts: `.tmp/main-349eab3-postmerge-tests.log` and
`.tmp/main-349eab3-postmerge-typecheck.log`.

The initial implicit-read-only O1 run below has now terminated at its
**1,200,000 ms execution timeout** (`.tmp/incremental-source-binding-o1.log`).
It is not a measurement of the final binding fix and supplies no callback
pass count. A raw diagnostic build of `7fea568309` initializes and registers
**153 callbacks**, then stalls at index **31**, “Test generic invocation to
contextual shift”. Callbacks 0–30 returned, but this driver deferred their
results until the end, so their pass/fail counts are not available.
Artifact `.tmp/incremental-raw-7fea568309.wasm` has seven throwing diagnostic
Node imports; it is **not** zero-import standalone acceptance.

Do not attribute this stall to string comparison: its inspected loops
terminate normally. The first one-million-event fuel bound also stops the
callback-0 control, so its stack is not causal evidence. A subsequent
30-second bounded trace repeatedly visits `parseCallExpressionRest`,
`parseArgumentList`, error recovery and call-node construction
(`.tmp/incremental-fuel-31-timed.log`). A second bounded trace observes
unchanging position **22**, token **1 (end-of-file)** throughout the repeated
call parsing (`.tmp/incremental-fuel-31-position.log`). Generated
`parseCallExpressionRest` has no reset of local 2 for the loop's bare
`let typeArguments`; the source requires a fresh undefined binding each
iteration. A diagnostic reset experiment completed:
`.tmp/incremental-fuel.mts 31 --reset`, log
`.tmp/incremental-fuel-31-reset.log`. Exactly one loop reset was inserted;
callback 31 no longer exhausts the bound and reaches original
`assertInvariantsWorker` / `isNodeOrArray`, then throws a guest exception
(904,558 instrumented events). This attributes the stall to the missing reset,
but is **not a passing callback**. Next: add a bounded reduction, prefer shared
IR initialization ownership, and decode the subsequent invariant failure.
All Binaryen instrumentation is diagnostic-only and remains in `.tmp/`.
The original source suite is not yet admitted as a passing standalone suite.
Post-merge ratchet checks exited successfully; reachability remains only
**preservation-only PASS, strict modeled closure FAIL/OPEN**, not proof of
complete closure (`.tmp/main-349eab3-postmerge-gates.log`).
Earlier unbounded diagnostic processes were not killed; user permission to
stop stalled runs remains outstanding. Check live processes before reruns.

## Remaining scanner errors: descriptor-aware nominal-array rollback — 2026-09-27

Follow-up at `ccca001c45`: incremental-parser O1 compiles and validates
**26,138,018 bytes**, **zero imports**, **464,240 ms**; initialization throws,
so **0/153 callbacks executed** (`.tmp/incremental-source-o1.log`, session
59834 terminal exit 1). This is not a standalone pass. A two-module reduction
finds a separate binding defect: `function assert` followed by
`globalThis.assert = assert` causes the property-name prescan to redirect the
module-local function read through an absent global property. Initialization
throws `ReferenceError: assert is not defined` with IR both off and on.
Renaming only the local function restores positive and negative assertion
behavior. `.tmp/global-assert-original.log`, `.tmp/global-assert-decoded.log`,
`.tmp/global-assert-renamed.log`. Next: honor the resolved module-function
binding before the implicit-global read; preserve script global replacement
semantics and original cross-module assertions. Full-suite attribution awaits
remeasurement; the reduction alone does not prove the full init failure's cause.

The candidate shares an exact source-function ownership predicate between
the existing implicit-global read and function shadow read/call guards. It
keeps module functions separate from realm properties while preserving
script top-level function replacement. This repairs existing fallback binding
resolution; it adds no duplicate AST lowering. Running with IR enabled is not
claimed as proof that these functions have fully migrated to IR ownership.

Durable binding suite: baseline **2/8**, candidate **8/8**; the two script
controls stay passing, four cross-module assertion cases and two module
replacement cases flip. Baseline substitution uses Vite's pre-transform hook
to read the exact three affected source files from `ccca001c45`, without
changing the live compiler tree. `.tmp/global-assert-final-baseline.log`.
Final focused and adjacent checks: **59/59**, seven files, including native
oracles, missing-global checks, cross-module collisions and error rendering.
`.tmp/global-binding-final-tests.log`. Typecheck and scoped lint pass:
`.tmp/global-binding-final-typecheck.log`, `.tmp/global-binding-final-lint.log`.
Uncaught guest exception text is now decoded through existing bounded numeric
exports, including initialization errors; unavailable/invalid renderers retain
the original failure. No host imports or assertion suppression are introduced.

Original-suite run **81151** (`.tmp/incremental-source-binding-o1.log`)
loaded the **initial implicit-read-only candidate**, before the later shadow
read/call guard and error-renderer edits. It subsequently terminated at its
execution timeout; see the synchronization entry above. Do not attribute
its result to the final candidate. The final guard still needs a completed
zero-import original-suite run with improved diagnostics.

At `1bb2797b9b`, a six-context original-source probe shows that speculative
diagnostics are retained, not merely missed by `find`: array context retains
code **1181** at position 2, property context retains **1003** at position 8,
where native returns **1161**. The two more deeply nested passing contexts
also retain extra diagnostics (3 and 4 entries versus native 1). Thus the
656 passing callbacks do not imply exact diagnostic-array equivalence.
`.tmp/scanner-context-1bb279.log`; source `.tmp/scanner-context-entry.ts`.
The raw probe has seven throwing Node imports, none invoked; it is diagnostic
evidence, NOT standalone acceptance. A first typed-global probe failed graph
compilation; the executed probe uses an `any` diagnostic observation global
and the source-suite `allowJs` option, without changing upstream sources.

Root boundary: an unrelated accessor definition arms
`vecAccessorDescriptorDirty`. The shared length store then delegates to
`__vec_dp_value`, but `allowedCarriers` excludes nullable nominal-object
vectors. Its whitelist silently returns without shrinking `Diagnostic[]`.
TypeScript's duplicate-position error suppression then retains the speculative
error instead of appending the expected regexp diagnostic. Binary tracing
confirms regexp rescanning occurs; a diagnostic-only physical length repair
at parser rollback restores exact native diagnostics in all **6/6** contexts.
`.tmp/scanner-context-trace.log`, `.tmp/scanner-context-force-length.log`.
This intervention is attribution, not a production fix or acceptance result.

Candidate: extend the existing shared vector descriptor carrier classification
to nullable nominal references, with correctly typed default values and
brand-checked physical write-back. No AST-specific duplicate lowering or
descriptor bypass is introduced. Both direct and IR lowering consume the
shared runtime helper. Non-nullable internal representations are not newly
admitted because they cannot store a hole default.

Durable rollback matrix: **8/16** at the unchanged baseline, **16/16** with
the candidate; all eight accessor-overlay cases flip, while the unarmed
controls stay passing. An earlier generic/optional-array reduction passed
until the unrelated accessor trigger was added. Logs:
`.tmp/ref-overlay-rollback-baseline.log`, `.tmp/ref-overlay-focused.log`.
Baseline was measured by removing only `vec-overlay-carriers.ts` changes.
Adjacent array-length suites plus rollback pass **28/28**.

Scratch descriptor controls improve **2/12 to 10/12**. The remaining two
regrow cases are identical on baseline and candidate: shrinking then growing
nominal-reference arrays exposes stale elements instead of holes (score 1
versus native 31). `buildVecLengthHoleFill` currently supports numeric and
externref storage, not nominal reference storage. This remains OPEN; do not
claim full reference-array hole semantics. Logs:
`.tmp/ref-overlay-controls-baseline.log`, `.tmp/ref-overlay-controls-bits.log`.
Durable coverage also pins compatible/incompatible data defines, readonly
length, and non-configurable-index refusal.

The frozen production candidate completes original scanner O1 at **984/984**
native and **984/984 Wasm**, valid **26,033,438-byte** module with **zero imports**,
**488,162 ms** compile/optimization. `.tmp/source-scanner-ref-overlay.log`.
The independently compiled six-context source probe also matches native
exactly (one code-1161 diagnostic per context, correct start and length),
including removing the extra errors in formerly passing contexts.
`.tmp/scanner-context-ref-overlay.log`; its raw seven-import artifact remains
diagnostic-only, unlike the zero-import original-suite acceptance run.

Final focused checks pass **58/58** across rollback, reference descriptors,
own-field coherence, and the two existing length suites. Typecheck, lint,
LOC/function/coercion/oracle gates pass with no allowance growth.
Reachability is preservation-only PASS; strict modeled closure remains OPEN.
Logs: `.tmp/ref-overlay-final-focused.log`, `.tmp/ref-overlay-final-typecheck.log`,
`.tmp/ref-overlay-final-gates.log`.

Broader six-file batch: **29 passed / 14 failed / 4 skipped**, plus a suite-level
missing-harness error. All 15 failure headings reproduce against the exact
`1bb2797b9b` carrier implementation: stale prescan test contexts omit the
per-key set, the host-mode descriptor fixture has the same shrink/grow mismatch,
and the pregrow fixture lacks `test262/harness/propertyHelper.js`. Baseline
substitution uses a Vite alias to an unchanged-logic copy (only import paths
relocated), leaving the live source-suite compiler tree frozen; the rollback
positive control reproduces **8/16**, matching the prior physical-removal run.
`.tmp/ref-overlay-adjacent.log`, `.tmp/ref-overlay-adjacent-baseline.log`.

The eight other original source suites completed revalidation under session
**56632** (terminal exit 0), `.tmp/source-ref-overlay-<suite>.log`: factory
**3/3**, compilerCore **11/11**, diagnosticCollection **5/5**, base64 **1/1**,
comments **3/3**, parsePseudoBigInt **5/5**, paths **14/14**, asserts **2/2**.
Every native and Wasm callback passes; every module validates with zero imports.
Together with scanner recovery this is **1,028/1,028** callbacks across the
**nine admitted source files**, not the full 256-file inventory.

Next: finish that revalidation, then expand beyond the nine admitted original
files. `incrementalParser.ts` is a relevant next target: it exercises parent
links and incremental tree equivalence through original `Utils.assertInvariants`
and `Utils.assertStructuralEquals`. Preserve these checks, resolve the original
Utils namespace and shared assertion bootstrap, and measure native callback
count before declaring a floor. Initial native measurement now passes
**153/153** original incremental-parser callbacks, retaining original Utils
tree checks (`.tmp/incremental-native.mjs`, `.tmp/incremental-native.log`).
The native-only probe resolves existing Chai 5.3.3 and diff 8.0.3 dependencies
from the shared dependency store; no dependencies were installed and no
upstream assertions were removed. First source-graph standalone attempt
completed as session **53971**, `.tmp/incremental-source-initial.log`:
O0 compiles and validates **41,866,012 bytes** in **290,521 ms**, but seven
Node-environment imports remain (filename, dirname, cwd, platform, argv,
stdout, exit). The import gate correctly refuses execution: **0/153 measured
Wasm callbacks**, not 153 runtime failures and not standalone acceptance.
O1 remeasurement is running as session **59834** in
`.tmp/incremental-source-o1.log`; resume the
existing process rather than restarting it. Scanner recovery required O1 to
eliminate the same import names, but this is not evidence it will do so here.
Native anti-vacuity controls inject a throw into each original Utils check
independently: both `assertInvariants` and `assertStructuralEquals` change
**153/153** passing callbacks into **0/153**, with the injected error in all
153 rows. `.tmp/incremental-invariant-control.log` and
`.tmp/incremental-structural-control.log`. These controls modify only the
in-memory diagnostic bundle, not the pinned upstream files or live compiler.
**The 256-file unit inventory and standalone
self-hosting goal are still OPEN**; scanner recovery completion is not parser
or full-TypeScript completion.

## Upstream merged; original scanner reaches 656/984 — 2026-09-27

Fetched `loopdive/js2` main `dbba95acb11b525b03b5739469d0c4f132fb0474`
and merged it without conflicts as `800ad598b4`. The own-field write candidate
was checkpointed first as `4e5fd3657d`; both commits are signed. Worktree:
`/private/tmp/ts2wasm-ts5-1058-20260927`, branch
`codex/1058-typescript-standalone`. No stash restore, force push, or budget
allowance increase was used.

On this merged candidate, the pinned original `regExpScannerRecovery.ts`
suite now passes **656/984**, versus the previously recorded **0/984** on
`bb26a90c26`. Native passes **984/984**. The new standalone O1 artifact
validates, has **zero imports**, is **25,923,526 bytes**, and compiles/optimizes
in **475,278 ms**. Log: `.tmp/source-scanner-own-write-post-sync.log`.
This is a before/after progress observation across an upstream merge, not a
same-base claim that this fix alone caused all 656 gains.

All **328** remaining errors are assertion 1: the expected unterminated-regexp
diagnostic is absent (`object:null`). Reading the individual rows against the
original six-source loop isolates two failing forms, each **0/164**:
`([<regex>]);` and `({prop: <regex>});`. The declaration, parenthesized,
nested-parenthesized property, and computed-property forms each pass
**164/164**. Next diagnose why these two parse contexts lose the diagnostic;
do not infer a common root solely from the shared error text.

Original `factory.ts` remains **3/3**, zero imports, 15,840,571 bytes,
121,949 ms; `.tmp/source-factory-own-write-post-sync.log`. Full TypeScript
unit-suite acceptance and self-hosting remain OPEN.

Durable regression: `tests/issue-1058-own-field-write-coherence.test.ts`
contains **20** native-vs-zero-import-Wasm tests, both IR toggles, covering
undefined/null/wrong-carrier to Map, runtime-selected keys, alias and physical
slot identity, writable data descriptor fidelity, and strict readonly refusal.
On this same merged base, removing only the two production wiring changes
gives **4/20**; restoring them gives **20/20**. Logs:
`.tmp/own-write-twenty-baseline.log`, `.tmp/own-write-twenty-restored.log`.
The IR composer stays present but unused during the removal control.
The prior seven focused files plus the initial twelve new cases pass **95/95**
(`.tmp/own-write-post-sync-focused.log`). IR ownership probes still report
direct-body fallback for the Map writer (body-shape/parameter resolution), so
these toggles are NOT evidence of an IR-emitted writer body. Shared instruction
composition is in `src/ir/`; full frontend IR adoption remains follow-up work.

Adjacent checks and limitations:

- First five-file batch: **36/37**. The computed fnctor read returns 1 rather
  than 11 in the existing computed-write test, identically with the candidate
  wiring removed (`.tmp/own-write-post-sync-baseline.log`).
- Reflection/data-define/per-key checks plus the twenty new cases pass
  **63/63**. The larger batch is **73 passed / 14 failed / 12 skipped**:
  twelve failures lack the local test262 harness; two inherited-set runtime
  failures reproduce with the candidate wiring removed (exception in physical
  field precedence and flow-slot score 6 rather than 7). Logs:
  `.tmp/own-write-post-sync-descriptors.log`, `.tmp/own-write-inherited-baseline.log`.
- Scratch descriptor controls still expose undefined-valued readonly descriptor
  readback and accessor installation/callback failures. Explicit strict mode
  confirms refusal throws; using a Map-valued readonly descriptor passes.
  Accessor failure remains even with function-valued descriptor properties.
  Do not claim these residuals fixed. `.tmp/own-write-descriptor-probe.log`,
  `.tmp/own-write-descriptor-functions.log`.
- Post-merge typecheck, lint, LOC/function/coercion/oracle gates pass. Reachability
  is preservation-only PASS; strict modeled closure remains FAIL/OPEN.
  `.tmp/own-write-post-sync-typecheck.log`, `.tmp/own-write-post-sync-gates.log`.

## Own-field write checkpoint before upstream sync — 2026-09-27

Candidate reconciliation lives in `src/ir/existing-own-field-write.ts` and is
shared by named member writes and closed-struct dynamic writes. It consults
the existing descriptor decision before mirroring a compatible value into the
physical slot. No generic-getter bypass or new runtime imports are introduced.

Pre-sync measurements against `58210511af`: the linked pragma reduction goes
from **4/8 to 8/8**; the broader own-write/descriptor scratch matrix goes from
**4/24 to 16/24**. The remaining eight readonly/accessor failures occur on both
baseline and candidate and still need attribution. The computed scratch key
is constant, so it is not proof of the dynamic-key path. Evidence:
`.tmp/pragma-map-own-write-candidate.log`,
`.tmp/own-write-descriptors-baseline.log`, and
`.tmp/own-write-descriptors-candidate.log`.

This is a work-in-progress checkpoint, not acceptance. Next: merge fetched
upstream main `dbba95acb11b525b03b5739469d0c4f132fb0474`, promote durable
regressions with genuinely dynamic keys, resolve descriptor controls, and
rerun original source scanner/factory suites. The previous scanner result
remains **0/984**; no full scanner result exists for this candidate.

## Pragma failure isolated to undefined-to-map write coherence — 2026-09-27

Further diagnostic instrumentation at `bdeb3ce09d` disproves the hypothesis
that the generic getter simply lacks SourceFileObject coverage. A directly
constructed SourceFileObject, assigned a new native map, is read correctly by
both generic and named getters. Capturing the actual failing parser receiver
shows the **same fifth named-getter class arm**, but its generic read returns
the canonical undefined value while the named getter returns a non-null map.
`__carrier_bag_has(receiver, "pragmas")` returns **1**. Logs:
`.tmp/diagnose-pragma-carrier.log` and
`.tmp/diagnose-pragma-captured-bag.log`; instrumentation source
`.tmp/diagnose-pragma-carrier.mts`. These are diagnostic-only binary exports,
not compiler changes or standalone acceptance.

The source reduction now reproduces the failure by adding
`context.pragmas = undefined` before `context.pragmas = new Map()`:
**4/8** pass, with every class-backed case trapping on an illegal cast and all
plain-object controls passing, independent of IR toggle and explicit Map type
arguments. Without that first assignment the same separate-source matrix is
**8/8**. All native references pass. Logs:
`.tmp/pragma-map-undefined-overwrite.log` and
`.tmp/pragma-map-separated-sources.log`.

Root boundary to fix: the member setter sends an incompatible value such as
undefined to the property bag, then writes a compatible Map directly into the
physical class slot without reconciling the existing bag entry. The generic
reader correctly gives the own bag descriptor precedence and sees the stale
undefined. Do NOT fix this by bypassing the generic getter: that would erase
legitimate own descriptor precedence. Next use the existing shared descriptor
write authority (`__extern_set_decide` / `__extern_set_own`) to keep member and
generic writes coherent, including strict refusal/accessor semantics, and
retain native controls for undefined, null, data descriptors and aliases.
No production changes made in this diagnostic turn.

## Scanner pragma-field diagnostic and source-suite results — 2026-09-27

At signed `bb26a90c26`, scanner session `41973` completed exit 1: native
**984/984**, standalone Wasm **0/984**, valid zero-import O1 output,
23,839,560 bytes, 462,390 ms. The optimized source-map annotation is not
authoritative after Binaryen renumbers functions. The raw diagnostic locates
the new first failure in `processPragmasIntoFields`, after token construction:
an illegal cast on the value returned by `__extern_get(context, "pragmas")`.
Raw artifact `.tmp/source-scanner-bb26a90-raw.wasm` has SHA-256
`ed424eeeb612d62ccaa8dcb79c2b07841da4d74f359edff19ac3c43d33fe599e`.
Raw diagnostic `85266` also registers/executes 984 and passes 0; its seven
throwing imports are not invoked, and it is NOT standalone acceptance.

Diagnostic-only binary intervention `.tmp/diagnose-pragma-get.mts` changes
exactly that read to the existing `__get_member_pragmas` getter, validates and
runs the resulting module without changing production. Session `30895` then
reaches the first upstream assertion instead of the cast: expected an
unterminated-regexp diagnostic, got null. Still **0/984**; this is attribution
evidence, not an accepted fix. Log
`.tmp/source-scanner-bb26a90-direct-pragma-get.log`. Binaryen's experimental
custom-descriptor feature must remain disabled when re-emitting this diagnostic
module for Node 24. The initial All-features attempt did not execute.

The simplified pragma-map matrix passes **8/8** at every measured refinement:
plain/class receiver, typed/inferred Map construction, generic overloaded map
methods, inherited/merged interfaces and separate parser/services sources.
Logs `.tmp/pragma-map-field-baseline.log`, `.tmp/pragma-map-generic-methods.log`,
`.tmp/pragma-map-inherited-field.log`, `.tmp/pragma-map-linked-outcomes.log`,
`.tmp/pragma-map-separated-sources.log`. These do NOT reproduce the full-source
failure; tracked outcomes show the reduced read/initialize functions use direct
bodies even when experimental IR is enabled. Next inspect generic closed-field
reader registration/guards against the successful named getter, including
`fillClosedStructExternGetArms` allocation filtering and structural-contract
reads. Do not patch all Map operations based on the failed full-source cast.

Frozen source batch `22636` completed successfully at `bb26a90c26`:
compilerCore **11/11**, diagnosticCollection **5/5**, base64 **1/1**, comments
**3/3**, parsePseudoBigInt **5/5**, paths **14/14**, asserts **2/2**, all zero
imports. Logs `.tmp/interface-refinement-source-<suite>.log`. With the factory
result below, eight original source suites pass **44/44**; scanner remains
**0/984**. This is nine measured files, not the full 256-file upstream scope.
No source test process from these runs remains live.

## Class-backed interface refinement continuation — 2026-09-27

Frozen scanner session `55011` completed exit 1 on `61d5930e0a` compiler
sources: native **984/984**, Wasm **0/984**, valid standalone O1 output,
**zero imports**, 30,374,920 bytes, 571,009 ms. Both first errors are the
explicit guest null-property exception at `1276:9`; this is not merely a raw
diagnostic anymore. Log: `.tmp/source-scanner-heritage61d593-o1.log`.

Fresh raw WAT `.tmp/scanner-heritage61d593-token-wat.log` shows
`createBaseTokenNode` and `createBaseToken` return externref, but
`createRegularExpressionLiteral` guard-casts the result to its closed literal
interface struct and substitutes null. The service class implements Node/Token,
not every interface used to refine a token after allocation.

Native-oracle reduction `.tmp/service-token-refinement.test.ts` crosses IR
on/off, direct/generic mapped return and explicit literal implementation.
Baseline with class `implements Node` versus `implements Node, Literal` is
**4/8**: only the explicit literal implementations pass. The shared IR heritage
index now closes named interface inheritance in both directions: base views and
derived refinements of a class-backed interface preserve the dynamic instance
carrier. The same reduction passes **8/8**; no new backend lowering or array
materialization is added. Logs `.tmp/service-token-refinement-direct-control.log`
and `.tmp/service-token-refinement-heritage.log`.

Permanent linked native/Wasm tests additionally cover a class implementing only
the derived interface, method calls, alias identity and field mutation: **12/12**.
Source-index controls cover transitive inheritance, unrelated components,
cycles and ambient exclusions. Initial focused/adjacent run is **42/43**; the
sole failure is the same existing Greeter-only IR field-read/parity error
previously measured on the baseline, not a newly attributed regression.
Typecheck, format/lint and all five architecture gates pass against main
`5ad53338fe`; no allowances increased. Reachability remains preservation-only
PASS, strict closure OPEN. Full source confirmation is pending: scanner
session `41973`, `.tmp/source-scanner-interface-refinement-o1.log`; factory
session `91395`, `.tmp/source-factory-interface-refinement.log`. Preserve these
runs and keep compiler sources frozen until their results are read. Final
focused integration run passes **83/83** across seven files
(`.tmp/interface-refinement-final.log`), including the new inheritance controls.
Factory session `91395` then completed successfully: native and Wasm **3/3**,
zero imports, 14,308,828 bytes, 114,741 ms. Only the scanner run remains live.

## Latest main sync and continuation — 2026-09-27

Merged upstream main `5ad53338fe27735305bf656c931df7f46f785e1d` into
`codex/1058-typescript-standalone` as signed `d5f5a33cbe`, without conflicts.
Ancestry verified; this main delta changes only six npm-compat benchmark
artifacts, not compiler or test sources. Post-merge namespace/carrier integration
checks pass **44/44** (`.tmp/main5ad533-integration.log`).

The frozen `61d5930e0a` original factory source run finished **3/3**, zero
imports, 14,308,932 bytes, 111,293 ms
(`.tmp/source-factory-heritage61d593.log`). Its full optimized scanner run
remains live as session `55011`; preserve it and inspect
`.tmp/source-scanner-heritage61d593-o1.log` for the final result.

Preserved that scanner run's pre-optimization binary as
`.tmp/source-scanner-heritage61d593-raw.wasm`, SHA-256
`eaf52098b242740b046df1be237836070eafdcb0e1439dfcb8bed7cc297bbaf7`.
Diagnostic session `61482` completed: registered/executed **984**, passed **0**.
Its seven throwing Node imports were not invoked; this is not standalone
acceptance. The first two errors now report a guest null-property exception at
`1276:9`, matching `createRegularExpressionLiteral`'s `node.text = text` in
the pinned node factory. Fresh identifier-factory WAT shows
`createBaseIdentifierNode` now returns `externref`, so do not assume the prior
closed Node return cast remains the root cause. Next inspect token construction
and its interface carrier before changing production. Artifacts:
`.tmp/source-scanner-heritage61d593-raw-diagnostic.log` and
`.tmp/scanner-heritage61d593-baseidentifier-wat.log`.

## Namespace-class work in progress and main sync — 2026-09-27

The namespace candidate extends existing class collection, exact declaration
identity and runtime namespace initialization; it does not add a separate
constructor lowering algorithm. On `0d666f5e85` plus the uncommitted candidate,
`.tmp/namespace-classes-identity-candidate.log` measures **15/16** native-oracle,
zero-import checks (eight shapes, IR on/off). The remaining IR-on case has two
same-named namespace classes with different parameter-property layouts and
reports duplicate direct-body receipts. This is unfinished, not accepted.
Exported namespace function registration in the IR-off snapshot probe also
remains open (the earlier separate matrix was **4/8**).

User requested another main merge: fetched upstream main
`7443ab4826fde65b72f875e0af12337a35520932` (six new commits). Preserve this
candidate as a checkpoint before the merge, then finish exact body ownership
and rerun focused checks on the merged tree. No new full scanner run has been
completed; the last accepted result remains **0/984** callbacks passing.

Checkpoint validation: namespace classes now defer their bodies to the existing
in-scope class route, removing the duplicate receipts. Permanent regression
tests pass **17/17**, including a shape-index conflict control; together with
parameter-property tests, **37/37** (`.tmp/namespace-sync-tests-final.log`).
The shape index is an IR-owned leaf keyed by class identity, refuses conflicting
projections, and permits repeated aliases of the same shape object. Exact
declaration ownership and source checks remain at the resolver boundary.
Five adjacent files pass **22/22**; the broader module-bindings file passes
**44/55** both with the candidate and on exact `0d666f5e85` production sources
(all four tracked source diffs removed and verified clean for the baseline).
The same eleven failing test names and failure messages reproduce; logs are
`.tmp/namespace-sync-adjacent.log` and
`.tmp/namespace-sync-bindings-baseline.log`. These failures are not resolved.
Typecheck, lint, formatting and five architecture gates passed; no budget
allowances increased. Reachability is preservation-only PASS, strict closure
still FAIL/OPEN. This checkpoint is not a full upstream unit-suite pass.

Main merge completed cleanly as signed `a1c55a375b`, with fetched upstream
`7443ab4826fde65b72f875e0af12337a35520932` verified as an ancestor. On that
tree, eight integration files pass **66/66**
(`.tmp/main7443-namespace-integration.log`), typecheck and five architecture
gates pass (preservation-only reachability caveat unchanged), and the pinned
original compiler-core suite passes **11/11**, zero imports, 1,574,704 bytes.

Corrected attribution for the remaining snapshot failure: namespace export is
not the discriminator. A crossed export/tracking matrix is **2/4**: both
unexported and exported namespaces fail with IR disabled and tracking off,
and both pass with tracking on (`.tmp/main7443-namespace-tracking.log`). The
eight snapshot cases remain **4/8** without tracking. `generateModule` and
`generateMultiModule` currently create planning identities only for IR or
outcome tracking, but namespace body emission requires the exact callable
registry. Tracking therefore changes runtime behavior. Next: make that shared
identity available for runtime namespaces independently of diagnostic tracking;
test both toggles and ambient exclusions without introducing a name-based
legacy fallback. The full scanner result is still not remeasured.

The tracking-independent identity fix now passes **4/4** toggle controls and
**8/8** snapshot variants. Linked-module testing additionally caught the
telemetry-only lifecycle condition in `createMultiPreparedProgramOwner`; a
non-IR owner now seals its body boundary regardless of telemetry, retaining
the same lifecycle checks rather than bypassing them. Permanent tests cross
IR on/off, tracking on/off, namespace export, class identity and initialization;
they also cover linked sources, ambient exclusions and conflicting projections.
Final focused run is **80/80** across four files, including the 18 existing
whole-program lifecycle/census checks:
`.tmp/namespace-tracking-lifecycle-final.log`. Format/lint and five gates pass
against main `7443ab4826f`; no allowances increased, strict closure still open.

Original factory source on the signed merge passes **3/3**, zero imports,
14,308,932 bytes in 107,733 ms (`.tmp/main7443-source-factory.log`). It predates
the tracking follow-up, so is not a final-tree source claim. Full scanner O1
was started on the frozen tracking candidate as session `78623`, output
`.tmp/main7443-namespace-source-scanner-o1.log`. Do not restart or kill it;
poll that handle to completion. No scanner improvement is claimed yet.
Final-tree typecheck also completed successfully (`20297`,
`.tmp/namespace-tracking-typecheck-final.log`).

Continuation at signed `603e65dcb9`: original paths suite passes **14/14**,
zero imports (`.tmp/namespace-tracking-source-paths.log`). The full scanner
handle `78623` was re-polled and remains live; keep that run, not a replacement.
While its compiler source stays frozen, the MultiMap reduction still measures
**4/8** (`.tmp/main7443-multimap-return.log`): attached-method presence and
registration followed by `Map.get` pass in both lanes; consuming the array
returned directly by the attached method fails in both lanes. All eight native
oracles return 42. Fresh binary inspection confirms the method trampoline
constructs a generic vector, but the caller's differently typed vector result
has dispatch arms that discard the value and substitute null. Fresh isolated
WAT is in `.tmp/main7443-multimap-trampoline-wat.log` and
`.tmp/main7443-multimap-run-wat.log`; do not reuse older full-WAT type numbers.
Any fix must reuse shared vector materialization/identity support and reserve
it before function-index freeze, not introduce another array-copy algorithm
or late imports in the callable dispatcher.

Full scanner session `78623` finished exit 1 on production tree `603e65dcb9`:
native **984/984**, valid optimized standalone Wasm **30,240,946 bytes**, zero
imports, compilation **785,885 ms**, callbacks **0/984**. Log:
`.tmp/main7443-namespace-source-scanner-o1.log`. The optimized source-map text
still describes pre-optimization indices and is not a trustworthy location.

Preserved pre-optimization module `.tmp/source-scanner-namespace603e-raw.wasm`
has SHA-256 `0906bc224ba9ffc6818db60ce95b5bca646db840abca944e69c4fc3ffd837f0a`.
Diagnostic `88403` also registered and executed all 984 callbacks, **0/984**,
with seven throwing Node imports that were never invoked. This is diagnostic
evidence, NOT standalone acceptance. Unlike the previous `fromString` trap,
the first raw failures are now `createBaseIdentifier` and
`createRegularExpressionLiteral`. The former receives null from
`createBaseIdentifierNode`; isolated WAT shows a dynamic constructor result
guard-cast to a closed Node carrier and defaulted to null on mismatch. Files:
`.tmp/scanner-namespace603e-factory-wat.log` and
`.tmp/scanner-namespace603e-basefactory-wat.log`.

Do not infer the cause solely from that cast: reduced native-equivalent
service allocators pass **32/32** across IR, dynamic/cached construction,
generic inheritance and a same-named function constructor; a separate linked
module version passes **2/2**. Logs `.tmp/service-node-factory-shadow-baseline.log`
and `.tmp/service-node-linked-baseline.log`. Next isolate full-source Node
carrier selection and class-implementer collection timing, including recursive
Node fields. No compiler change for this new failure has been made yet.

The linked reduction still passes **2/2** after adding a recursive optional
parent, but adding `getKind(): number` to Node and its class implementer makes
it fail **0/2**, with both native references still passing. Logs:
`.tmp/service-node-linked-recursive.log` and
`.tmp/service-node-linked-method.log`. This isolates the method-bearing
interface boundary, not generic construction alone. Implementation experiment:
derive implemented-interface names from the stable source population before
layout allocation, through a shared IR-owned syntax index. The current helper
caches answers over the incrementally populated class-declaration map, so an
early false answer can persist while later classes require dynamic carriers.
Keep ambient declarations excluded and test class/interface name controls.

Frozen source batch `85170` completed exit 0: diagnosticCollection **5/5**,
base64 **1/1**, comments **3/3**, parsePseudoBigInt **5/5**, asserts **2/2**;
all zero imports, at `603e65dcb9`. Logs
`.tmp/namespace-tracking-source-<suite>.log`. No full source runs remain live.

Source-heritage candidate fixes the method-bearing linked reduction **0/2 →
2/2** (`.tmp/service-node-linked-source-heritage.log`). New shared IR-owned
`class-interface-heritage.ts` indexes runtime class implementations from the
fixed source population before layout collection. The existing carrier helper
uses that index instead of memoizing the growing class registry; contexts
without a source population retain an uncached registry check. Ambient classes,
declaration files, ambient/string/global namespaces stay excluded. Existing
nominal-class guards and name-matching semantics are unchanged.

Permanent `tests/issue-1058-service-node-interface-carrier.test.ts` covers the
linked native/Wasm case in both lanes, pre-registration evidence, nested/class
expression/namespace cases, ambient exclusions and an initially empty registry.
Initial focused/adjacent checks measured **99/100**: the sole failure is the
existing Greeter-only IR field-read case in the interface-dispatch suite, which
also fails on exact `603e65dcb9` production sources (candidate helper reverted,
tracked source diff verified empty, then restored). Failure sections match
exactly; `.tmp/service-node-heritage-dispatch-baseline.log` is **9/10**.
Typecheck and five gates pass, as do lint/format; no allowance increases and
strict reachability closure remains OPEN. Full scanner acceptance still needs
remeasuring on this new candidate, not inference from the reduction.

## Resumed main integration — 2026-09-27

Continuation verification: pinned original `factory.ts` passes **3/3** source
callbacks in standalone mode at `b740f04b75` (107,942 ms compile, 14,091,233
bytes, zero imports). `compilerCore.ts` passes **11/11** (3,667 ms, 878,075
bytes, zero imports). Both preserve original assertions and native callback
counts, at TypeScript pin `c63de15a992d37f0d6cec03ac7631872838602cb`.
The prior parser/binder host-lane evidence does not establish standalone
acceptance. The other four source-unit files are being measured separately.

Enum binding/constant evidence now crosses the shared oracle boundary while
retaining the IR-owned enum plan, exact source binding checks and assignment
order. The in-house oracle declines unsupported evidence; the differential
backend compares results. Oracle/enum-plan/reference tests pass **19/19** and
source typecheck and scoped lint pass. Execution regressions pass **30/32**;
the two failing ordinary-object namespace cases reproduce at unmodified
`b740f04b75` in a separate checkout with the same standalone lane and Vitest
configuration (**10/12** in that file). They are not new enum-query regressions.
The change-scoped oracle gate improves from ctxChecker +5 to **+2**, with
getTypeAtLocation still **+1** (generator and structural receiver queries).
Inventory still fails for older unclassified branch modules; the new enum
binding leaf is explicitly registered, without claiming architecture completion.

Fresh remaining-source measurements: base64 **1/1** and parsePseudoBigInt
**5/5** pass with zero imports; diagnosticCollection is **0/5** despite valid
standalone compilation. A diagnostic copy preserves all original assertions
and adds input checks: all five native callbacks pass; all five Wasm callbacks
report `probe: parent null` after statement count, presence and kind checks pass.
Logs: `.tmp/diagnostic-parent-probe.log`, `.tmp/standalone-*-current.log`.
Comments fails compilation with stack overflow in `fixupExternConvertAny`.
Its postorder instruction-array traversal is now iterative in the shared Wasm
model, preserving DAG visitation and cross-function ownership refusals. A
20,000-level regression passes. Original comments improves from compile failure
to **3/3 standalone**, zero imports (83,029 ms, 7,566,274 bytes). Focused
traversal/fixup controls pass **53/53**, including the unchanged canonical-walker
migration receipt; the new postorder algorithm lives in a separate shared-model
leaf. The six-file source sample is now **23/28**: factory 3, compilerCore 11,
base64 1, comments 3, parsePseudoBigInt 5; diagnosticCollection remains 0/5.
This is only six files of the 256-file pinned inventory, not goal completion.
Next: diagnose why the full diagnostic graph loses the parsed statement parent,
using `.tmp/diagnostic-parent-probe.mjs` and the committed source-parent workload.

Parent triage at `112e76feb6`: the standalone source-parent workload still passes
**3/3**, including parent identity and ancestor lookup. A diagnostic copy of the
five original collection callbacks compares no repair, direct assignment,
`setParent`, `setParentRecursive(false)`, and `setParentRecursive(true)`.
Native passes 5/5; Wasm outcomes are parent-null, later null-property error,
later null-property error, pass, pass. Recursive repair restores the last two
original callbacks without changing their assertions. This is diagnostic
evidence, not acceptance: the unmodified suite remains 0/5. Next inspect the
emitted parser parent-setup calls and default-boolean transport in the larger
graph; don't patch upstream tests to insert the repair.

Follow-up argc fix: a minimal standalone IR callback reproduced an explicit
`true` becoming `false`. `tryRuntimeNamespaceMemberCall` projected the exact
function handle but cleared optional-parameter metadata: only TS namespace
declarations had saved metadata, not ordinary ESM declarations reached through
`import * as ts`. The callee consequently consumed the zero-argument callback's
stale argc and overwrote the supplied fourth argument with its false default.
Top-level registration now captures the same declaration-owned metadata used
by namespace projection; no new legacy-only lowering branch was added.
Explicit true/false and omitted true/false controls pass **4/4**, namespace
regressions **23/23**, source typecheck, scoped lint and both size gates pass.
Explicit `undefined` still returns 0 instead of the expected 42 in the callback
fixture and is an explicit pending test, not passing coverage. The legacy
non-IR version of the original minimal callback throws before and after this
fix; that separate problem remains unaddressed.

The unmodified pinned `diagnosticCollection.ts` now passes **2/5** (the final
two callbacks), native **5/5**, valid standalone Wasm, **zero imports**,
137,610 ms compile and 17,150,148 bytes. The first three retain null-property
errors. Latest six-file sample is therefore **25/28**, not full-inventory
acceptance. Evidence: `.tmp/standalone-diagnostic-argc-network.log`,
`.tmp/callback-default-verified.log`, `.tmp/namespace-metadata-fixed.log`,
`.tmp/argc-related-tests.log`. Next locate the remaining three exceptions;
preserve original assertions and exact callback counts. The initial rerun hit
the system Git/Xcode license issue and the setup harness removed its generated
upstream cache before failing to clone offline. The retry used bundled Git,
restored the pinned checkout with network access, and verified its inventory.
No project source or user work was removed.

Remaining-diagnostic triage at `88aa732158`: all five parent/ancestor guards now
pass. Wrapping only `collection.getDiagnostics()` in a diagnostic copy identifies
that call as the failure in each of the first three callbacks (native 5/5,
Wasm 2/5, valid zero-import module). `.tmp/diagnostic-stage-probe.log` records
the result. A small captured collection reproduces a null dereference before
entering the overloaded getter: callable-property planning uses the first
overload's required string parameter even though the zero-argument overload
allows omission. Padding emits `ref.null` followed by `ref.as_non_null`.
The candidate widens such reference slots when another overload omits them,
preserving the full wrapper arity and supplied-argument transport. The small
standalone IR reproduction now returns the expected two diagnostics. Original
upstream rerun and broader callable regressions are pending; don't credit the
three upstream callbacks until their unchanged assertions pass.
The first candidate left the original suite at 2/5 (135,057 ms, same binary
size): the real `DiagnosticCollection` interface lists its zero-argument
overload first, unlike the inferred local function type. An explicit interface
with that ordering reproduces failure in both IR and non-IR standalone lanes.
Callable-property planning now retains the widest overload argument list while
allowing reference slots omitted by shorter overloads. Both overload orderings,
omitted and supplied arguments pass on both paths; the focused regression set
passes **13/13**. The original suite is being rerun again; this intermediate
evidence does not supersede the measured 25/28 source sample.

Final overload-order measurement: the unchanged original collection suite
improves to **4/5**, native **5/5**, valid standalone module with **zero imports**
(133,100 ms compile, 17,176,898 bytes). Only `keeps equivalent diagnostic with
elaboration` fails, now at its original `deepEqual` assertion rather than a
null-property exception. The six-file measured sample is **27/28**; this does
not establish the complete 256-file goal. `compilerCore.ts` was rerun as an
original-source control and remains **11/11**, zero imports (2,916 ms,
878,360 bytes). Focused overload tests also pass **4/4** after strengthening
the body to distinguish `undefined` explicitly, covering both overload orders
and both compiler paths. Typecheck, lint and both size gates pass.
Evidence: `.tmp/diagnostic-overload-order-fixed.log`,
`.tmp/compilerCore-overload-control.log`, `.tmp/overload-order-regressions.log`,
`.tmp/overload-order-strict-undefined.log`.
Next inspect the first callback's actual diagnostic list and replacement of
the plain `dy` by the richer `dyBetter`, retaining the original assertion.
The helper/dispatch code is shared by both paths; no parallel legacy-only
implementation or upstream test relaxation was added.

Content triage at `f6c6c0c7e3`: the first callback's returned list has **three**
entries, rather than the expected two. A diagnostic copy retains every original
assertion and adds guards; native remains 5/5. Identity checks additionally
reject the first result element in callbacks two and three, although their
original structural assertions pass; that is separate evidence, not yet an
attributed root cause. `.tmp/diagnostic-content-probe.log` records both facts.
A small generic array insertion/replacement control returns the correct result,
so do not infer a general splice defect from the ordering difference alone.
A parser-free source-module diagnostic fixture returns 2110 natively but traps
in `compareMessageText` in Wasm; it is not yet a faithful reproducer of the
original non-trapping mismatch. Next compare the original diagnostic equality
and ordering results before changing insertion code.
The direct diagnostic equality and ordering checks pass for both original and
stored diagnostics. A subsequent original-source probe finds `binarySearch`
returns **-1**, where native returns **-2**, before the richer diagnostic is
added. This changes the next investigation to callback/search transport rather
than equality or splice semantics. `.tmp/diagnostic-equality-probe.log` and
`.tmp/diagnostic-search-probe.log` preserve these measurements; both diagnostic
copies execute all five callbacks, pass natively, and keep all original
assertions. Standalone generic insertion, message-equality, and simplified
sorted-diagnostic controls pass, so they are controls, not reproducers.
The callback-dispatch probe then shows the first stored `a` diagnostic compares
as greater than the richer `y` diagnostic in both direct and dynamic calls;
identity selection itself is correct. A faithful small reproduction of
TypeScript's overloaded `compareComparableValues` returns +1 for `a` vs `y`
in both compiler paths. Its implementation parameters are mixed primitive
unions, which bypass the string/any/object relational gates and get a numeric
hint. Candidate: admit primitive unions capable of holding strings on both
sides into the existing native runtime-dispatched relational path, preserving
the numeric fast path when both-string comparison cannot occur. No new
comparison runtime is introduced. A 12-by-12 operand matrix for all four
operators passes on both paths (**1,152 operator results**, zero imports).
The focused suite has 25/26 passing tests; the remaining any-local numeric
string case is being checked against an exact detached `f6c6c0c7e3` control.
Original diagnostics and source typecheck are still running; don't credit
upstream completion from the small matrix alone.
Final original-source result: `diagnosticCollection.ts` now passes **5/5** in
both native and standalone lanes, with original assertions unchanged, valid
Wasm and **zero imports** (136,211 ms compile, 17,177,134 bytes), recorded in
`.tmp/diagnostic-union-relational-fixed.log`. Source typecheck, scoped lint,
LOC and function budgets pass. The focused relational suite is **25/26**:
the sole `any` local numeric-string failure reproduces identically in the same
Vitest configuration at exact pre-fix `f6c6c0c7e3` (**6/7** in that file), in
`/private/tmp/ts2wasm-ts5-relational-control-f6c6`; evidence is
`.tmp/primitive-union-control-f6c6.log`. Do not mark that pre-existing case fixed.
The predicate reuses the established shared runtime comparison dispatch and
does not introduce a separate IR/legacy runtime implementation; both compilation
modes have the matrix coverage. The other five source files are being freshly
revalidated in isolated invocations, serially, with logs under
`.tmp/source-revalidation-<suite>.log`. Their prior passing results plus the
new 5/5 account for 28 callbacks, but wait for revalidation before claiming a
fully fresh six-file sample. Even that is not the complete pinned inventory.

Coverage expansion after `09f0b662cd`: add the original `paths.ts` source unit
to the full-source runner, with its **14** direct callback registrations as an
explicit count floor. This exercises the compiler's path normalization,
root/URL handling, relative paths and case handling without replacing their
implementations or assertions. Native passes **14/14**; standalone compiles to
valid Wasm with zero imports (81,420 ms, 7,659,194 bytes) and passes **12/14**.
The failing callbacks are `getPathRelativeTo` (null-property exception at
`path.ts:1016:31`) and `toFileNameLowerCase` (third assertion leaves `UserName`
unchanged). Evidence: `.tmp/source-paths-first.log`.
The runner's provenance/count tests must reject incomplete path results just
as they do the existing sample. Broader harness-dependent suites remain in
scope; this is an expansion step, not a replacement completion criterion.

The serial revalidation at `09f0b662cd` completed successfully: factory **3/3**,
compilerCore **11/11**, base64 **1/1**, comments **3/3**, parsePseudoBigInt **5/5**,
all with zero imports. Together with diagnostics **5/5**, the freshly measured
six-file sample is **28/28**. Adding paths makes the measured seven-file sample
**40/42**, not completion of the 256-file inventory.

Path-failure triage: `.tmp/path-primitives.mts` reproduces both mechanisms in
zero-import standalone modules with IR enabled and disabled. Passing generic
`identity<T>(x: T): T` to a `(string) => string` callback traps, even without the
boolean/function union used by the original path API. Non-generic identity and
inline-arrow controls return the expected 11. Separately, the original global
regex case-normalizer passes on an isolated Unicode input but fails after the
preceding two inputs: its three-result mask is 3 instead of native 7. A simpler
`/[A-Z]+/g.test('Ab'); 'Ab'.replace(re, lower); return re.lastIndex` yields 1
instead of native 0. The original pattern leaves lastIndex 7 after replacement.
This is stateful regex replacement, not evidence of incorrect Unicode matching.
Next: investigate the generic callable ABI and the static function-replacer
walk in `src/codegen/regex-replace-fn.ts`. Do not merely reset lastIndex after
callbacks: global replacement must finish collecting matches before invoking
replacers, and callbacks can observe or mutate the regex state. Preserve the
existing shared runtime/protocol semantics and validate original paths again.

Candidate after `bf4199a646`: prefer the existing standalone dynamic replacement
protocol before the static function-replacer shortcut. The shared protocol
already collects all matches before calling replacers; no new runtime or
legacy-only implementation is added. The isolated sequence now returns 7 and
lastIndex controls return 0 in both compiler modes. New regression coverage
checks callback-visible state, callback writes, no match, non-global preservation
and throwing callbacks. All **51/51** focused replacement tests pass; source
typecheck, scoped lint and LOC/function budgets pass. Original paths improves
from **12/14 to 13/14**, including the unchanged case-normalization assertions;
native remains 14/14. The binary is valid with zero imports (83,943 ms,
7,660,215 bytes). Evidence: `.tmp/source-paths-protocol.log` and
`.tmp/regexp-protocol-regressions.log`. The remaining `getPathRelativeTo` failure
is unchanged. Next: resolve the generic identity callback representation and
rerun the original suite; no claim that all TypeScript units pass.

Generic callback continuation after `7cf98cb97e`: the minimal `identity<T>`
callback fails only when no unrelated direct call specializes its ABI. With a
pure callback use, the implementation returns externref and the declared
callback returns a native string; candidate admission lacks that inverse bridge
and omits the live function signature. A shared Wasm-model instruction plan now
preserves native string references across erased callable slots with an exact
cast, not ToString coercion. The small reproducer now returns 11 instead of
throwing. Regression tests deliberately omit direct generic calls and cover
empty/Unicode strings and the boolean/function selection used by paths.
Original paths remains **13/14**, but now reaches assertion 4 in
`getPathRelativeTo`: `/a` to `/` produces `""` instead of `".."`, replacing the
previous callback exception. All original assertions remain; compile is valid,
zero imports, 84,421 ms and 7,660,787 bytes. This is a removed blocker, not an
additional passing upstream callback. `.tmp/source-paths-string-bridge.log`
records the result. A control of the comparison loops, slice, push and spread
alone passes (`.tmp/relative-components.mts`, result 21 and spread length 2),
so trace original path helper outputs rather than assuming spread is broken.
Focused tests pass **15/16**; the sole expected-throw assertion in multi-file
generic callback registration fails identically in a detached exact pre-fix
`7cf98cb97e` checkout at `/private/tmp/ts2wasm-ts5-string-control-7cf9`
(**8/9**, `.tmp/generic-control.log`). No claim that the stale refusal test is
fixed by this patch. The final new/string plus overloaded-property tests pass
**7/7**, both compiler modes. Source typecheck and size checks pass. The shared
model leaf is registered and depends only on model instruction types; the full
boundary gate still reports older unclassified modules and IR object-layout
paths, so publication architecture remains incomplete.

Relative-path continuation at `f11cfa18e9`: the original-source probe proves
normalized components are correct, then `getPathFromPathComponents(['','..'])`
returns empty. A small faithful join reproduces this: `slice(1, length)` with an
omitted optional length returns empty, unlike `slice(1)`. The existing static
undefined-token exception misses runtime undefined (and ignores shadowing).
Checking the f64 sentinel after numeric conversion also fails: undefined has
already become ordinary NaN. Candidate evaluates the end once as externref,
uses the existing undefined provider before numeric conversion, and passes the
result into the unchanged AST-free slice core. This also preserves NaN/null
as numeric zero. The small probe now passes; tests cover optional/erased end,
NaN, null, numeric strings, negatives, side effects and shadowed undefined.
The new argument leaf is explicitly marked unmigrated in the boundary inventory;
it does not introduce a second runtime or claim IR architecture completion.
Original paths now passes **14/14** in native and standalone lanes with unchanged
assertions, valid Wasm and zero imports (84,415 ms, 7,660,835 bytes), recorded in
`.tmp/source-paths-slice-end.log`. The new optional-end and existing sparse-copy
tests pass **10/10**; an additional slice-name-filtered existing array-method
run passes **3/3 executed**, with **45 skipped** (not credited). Typecheck,
scoped lint and LOC/function gates pass. The previously measured six-file
sample plus paths accounts for 42 callbacks, but revalidate those six files
after these shared changes before claiming a fresh 42/42 sample. This remains
only seven files of the 256-file pinned upstream inventory, not completion.

Coverage expansion after `00fe83b397`: original `asserts.ts` has two callbacks.
Its array-extra-properties check exposed a missing harness requirement: upstream
`src/harness/harnessGlobals.ts` wraps Chai deepEqual to compare enumerable
non-numeric array properties. The generic dogfood shim compares elements only.
The source runner now extracts the original augmentation block from the pinned
checkout, rejecting missing/ambiguous blocks, and prepends it without changing
its implementation. Shared generic assertion behavior remains unchanged.
Native negative/positive controls cover the missing extra-property check;
original asserts native/Wasm execution is pending. The six-suite revalidation
started before this harness change may span both harness revisions; do not call
it a uniform post-augmentation sample. Revalidate all eight source suites with
this stronger harness before claiming a fully current count.

First original asserts run: native **2/2**, standalone **1/2**, valid zero-import
Wasm (110,557 ms, 14,157,268 bytes); the deepEqual callback reports "expected
matching throw". The isolated original augmentation fails similarly. Metadata
reads and local for-in controls pass, but a `readonly unknown[]` parameter's
for-in skips its non-index properties: `.tmp/array-metadata-enumeration.mts`
returns 1 rather than 11. The same runtime value through an `any` parameter
correctly enumerates metadata. The typed array fast path explicitly excludes
native sidecars, while the existing native `__object_keys_forin` path already
handles them. Candidate routes native-first typed arrays through that existing
runtime and leaves host array lowering intact. The small probe now returns 11.
Original-source rerun and wider loop regressions are pending; do not weaken
upstream assertion semantics to make the original tests pass.

Current **uncommitted candidate** audit: original asserts still **1/2** after
native typed-array enumeration (110,500 ms, 14,157,239 bytes, zero imports).
The existing for-in regression files pass **49/49**, but new strict matrix
checks fail for sparse and inherited keys: the shape probe reports
`0,1,2,tag,` after deleting index 1 and also after setting an inherited key.
The hidden non-enumerable property is correctly excluded. Do not commit this
candidate as finished until these failures are explained against a pre-fix
control or repaired. Evidence: `.tmp/array-enumeration-regressions.log`,
`.tmp/array-enumeration-matrix.log`, `.tmp/array-enumeration-shapes.log`.

The augmentation still does not throw on different metadata even though direct
reads and local for-in checks pass. A second independent small reproduction
isolates shorthand-method replacement: `const o={m(a,b){return a+b}}; const
alias=o; const saved=alias.m; alias.m=(a,b)=>saved(a,b)+10; alias.m(1,2)` returns
**3 instead of 13**, in both IR modes, including calls through the original
object. The same example with an arrow-valued property returns 13. The generic
shim's `deepEqual` is a shorthand method, so the upstream wrapper assignment
is bypassed by stale direct-method dispatch. Evidence:
`.tmp/callable-property-reassign-method.log`, compared with
`.tmp/callable-property-reassign.log`. Next inspect the static struct-method
selection in `call-receiver-method.ts`, preserving receiver semantics and
using source/IR mutation evidence instead of globally disabling optimization.

The original six-suite post-path batch completed with all **28/28** callbacks
passing, zero imports (`.tmp/source-postpaths-<suite>.log`), but it spans harness
and compiler edits and is not a uniform final-revision sample. No runner is
still live from that batch. The new harness runtime control and the new array
metadata matrix deliberately remain failing in the worktree as regression
targets; native harness validation/count tests pass. HEAD remains `00fe83b397`.

Further uncommitted continuation: source-resolved method writes now invalidate
the stale shorthand-method fast path. The source fact lives in
`src/frontend/ts/object-method-writes.ts`, without codegen context mutation;
the existing receiver-binding owner consumes it in both IR modes. The focused
replacement regression passes **2/2**, covering aliases, pre-write calls,
unrelated methods and a replacement reading `this`. This is a resolved-dot-write
fact, **not** a general immutability proof (computed/reflective writes remain
outside its coverage). Type checking and focused lint pass.

The broader five-file method regression run is **86 passed / 13 failed /
3 skipped**. The 12 IR ownership expectation failures also occur in the
`7cf98cb97e` control (**58 passed / 12 failed**); its direct factory-method
capture control independently returns 7 instead of 107, matching the thirteenth
failure. Evidence: `.tmp/method-write-regressions.log` and the control checkout's
`.tmp/method-ownership-control.log`, `.tmp/method-direct-control.log`.

Original asserts after only that method fix still measures native **2/2**,
standalone **1/2**, zero imports (108,003 ms, 14,198,831 bytes). A separate probe
then found that the generic deep-equality helper considers `{flag:true}` and
`{flag:false}` equal even **without** the TypeScript augmentation. Its absent
dynamic `.length` incorrectly has `typeof "number"`, activating the array-like
comparison branch. Computed-key reads preserve absence. Evidence:
`.tmp/source-asserts-method-write.log`, `.tmp/harness-object-probe-details.log`,
`.tmp/harness-object-bracket-probe.log`.

The current candidate routes opaque standalone `.length` reads through the
existing shared `emitDynGet` reader, retaining the old fallback if unavailable.
The new dynamic-length regression passes both IR modes (missing, string-valued
and fractional lengths), and the full augmentation control now passes:
**5/5** combined. Existing any-length, function-name/length and reified typed-array
constructor metadata regressions pass **27/27**. No generic assertion semantics
were weakened. Evidence: `.tmp/dynamic-length-candidate.log`,
`.tmp/dynamic-length-regressions.log`. Original asserts revalidation now passes
native **2/2** and standalone **2/2**, valid zero-import Wasm, 109,558 ms,
14,203,058 bytes (`.tmp/source-asserts-dynamic-length.log`). Final type checking
passes (`.tmp/dynamic-length-tsc.log`). This is not a full-suite pass or a fresh
revalidation of all previously passing source files.

The sparse/inherited enumeration failures are now compared to the same exact
`7cf98cb97e` control: both produce `0,1,2,` there and `0,1,2,tag,` here. The new
metadata key is observed, but deleted index 1 and inherited keys were already
wrong before the candidate. They remain unfixed, with strict failing regression
expectations retained. Evidence: `.tmp/array-forin-control.log`. LOC and function
budget gates now pass without new allowances after simplifying the loop branch;
this does not certify the still-failing boundary/oracle publication gates.

Next continuation resolved the sparse-enumeration cause: `delete a[1]` itself
works (`delete` true, `1 in a` false, indexed read undefined), but passing the
array to `readonly unknown[]` creates a physical vec projection. Bag properties
already resolve through `__vec_projection_root`; descriptor-overlay lookup and
creation did not. The same for-in probe passes with `any` or `readonly number[]`
and fails only with `readonly unknown[]` before the fix. Evidence:
`.tmp/array-state-descriptor-probe.log`, `.tmp/array-enumeration-parameter.log`.

The current uncommitted fix canonicalizes overlay lookup, ensure and fresh
ensure keys through the projection identity. A non-vec guard on the root helper
preserves other carrier inputs. The lookup instructions now live in the
AST/context-free `src/wasm/model/vec-overlay-lookup.ts`, consumed by the existing
runtime owner shared by both compiler modes; the large overlay builder shrank.
New regression **2/2** covers deletion before projection, deletion/descriptor
writes through a projection, and independent arrays, in both IR modes.
Nullable-projection and the then-current deep-equality harness controls make
**7/7** (`.tmp/projection-final-regressions.log`). Final type checking, focused
lint and LOC/function gates pass. This does not clear existing publication gates.

The wider projection matrix is **14 passed / 5 failed**: both remaining
enumeration failures are now **inherited keys only**, not sparse indices. The
other three failures reproduce on exact `7cf98cb97e`: gc NodeArray metadata (-2
instead of 1), standalone user class named Map (invalid Wasm), and standalone
user interface named Map (module-init stack underflow). Evidence:
`.tmp/array-projection-descriptors.log`, and the control checkout's
`.tmp/array-projection-control.log` (**10 passed / 3 failed**).

Inherited-key follow-up: explicit `Object.setPrototypeOf(array, p)` is visible
to a property read, but not `in`, prototype identity comparison, or for-in in
the probe (`inherited` bit result 1 instead of 111). `buildVecEnumerationTail`
consults `protoIndexForInPushInstrs`, whose implementation walks the implicit
brand companion, not `VEC_PROTO_HAS`/`VEC_PROTO_GET` explicit vec prototypes.
Do not solve only the for-in snapshot and leave its `__extern_has` liveness
check inconsistent. This remains a runtime-protocol defect, not a source-test
adapter exception.

The stronger original harness also exposes a separate omission-ABI frontier:
fresh `compilerCore` is native **11/11**, standalone **6/11**, zero imports.
All five failures call upstream's replacement `assert.isFalse(expr, msg: string)`
without a message. The old shorthand method was bypassing this replacement.
A minimal replacement with an optional original message and a string-typed
replacement traps in **both IR modes** when omitted, while an explicit message
passes. Emitted `run` shows the omitted externref undefined being narrowed with
`ref.cast` to non-null `$AnyString` in callable-property candidate dispatch.
Do not substitute an empty string or disable the original wrapper: the native
call's value is undefined. Inspect physical closure parameter admission and
`callablePropertyRefBridge` in `expressions/calls-closures.ts` next. Evidence:
`.tmp/replaced-method-missing-argument.log`, `-stack.log`, `-wat2.log`, and
`.tmp/source-postasserts-compilerCore.log`.

The harness regression fixture previously included only the deepEqual portion
of the upstream block; it now also includes the original isFalse replacement
and checks an omitted message. It correctly fails that call (native controls
**2/2**, standalone control fails), while its preceding metadata assertions
still pass. Evidence: `.tmp/harness-omitted-message.log`. The seven-test result
above predates this deliberate strengthening and must not be reported as the
current full harness result.

Original-source revalidation completed; session `41399` is terminal (exit 1),
with logs `.tmp/source-postasserts-<suite>.log`: factory **3/3**, diagnostics
**5/5**, compilerCore **6/11**, base64 **1/1**, comments **3/3**, parsePseudoBigInt
**5/5**, paths **10/14** — **33/42** total, against native **42/42**, all modules
zero-import. Paths has two omitted-message illegal casts (`isUrl`,
`isRootedDiskPath`) plus two distinct wrong answers (`resolvePath`,
`getNormalizedAbsolutePath`: `//b` instead of `/b`). The latter need separate
isolation against the length-reader and projection edits; do not attribute all
failures to omitted messages. This batch spans the projection edits and is not
a uniform final-revision sample. No runner remains live from this batch.

The omitted-message frontier is now fixed in the working candidate. The assigned
callable's original parameter contract can be any/unknown even when its new
implementation annotates that parameter as string. The new frontend fact
`assignedCallableParameterIsDynamic` reads that contract through the existing
oracle signature-position API, keeping the replacement's physical parameter
externref. The same fact prevents an unsound static typeof fold; the first
candidate preserved the value but still called a numeric argument a string.
Regression **2/2**, both IR modes, checks omitted/explicit undefined, null,
string and numeric arguments plus the exact isFalse shape. Together with method
replacement and the strengthened harness, **7/7** pass
(`.tmp/replacement-open-parameters-final.log`). Original compilerCore now passes
native/standalone **11/11**, zero imports, 3,010 ms, 957,012 bytes
(`.tmp/source-compilerCore-open-parameter.log`). No missing value is replaced
with an empty string, and no upstream assertion is changed.

Nearby parameter regressions are **16 passed / 4 failed**. All four failures
reproduce on exact `7cf98cb97e`: three legacy optional-param tests instantiate
without required `string_constants` imports, and the standalone shadowed
undefined test returns 0 instead of 2. Evidence: `.tmp/open-parameter-regressions.log`
and control `.tmp/open-parameter-control.log`, `.tmp/open-nested-parameter-control.log`.

With the omission fix, paths improved to **12/14**, leaving only the `//b`
normalization results. These were isolated to the earlier ordinary dynamic
length-reader change: `length(value:any){return value.length}` returns NaN for
`'/'`, while arrays and ordinary `{length:1}` objects work. The shared
`__extern_get` protocol lacked primitive and boxed String length. The new pure
Wasm model helper `src/wasm/model/string-exotic-length.ts` resolves string data
and reads its UTF-16 length in the existing String-exotic runtime owner; both
compiler modes consume it. The first primitive-only version restored paths
**14/14** (native **14/14**, zero imports, 81,114 ms, 7,938,647 bytes), but a wider
matrix caught boxed String still returning NaN, so the final helper handles
both. The final string/ordinary-length/harness matrix passes **7/7**, including
empty strings, Unicode surrogate pairs, concatenation, computed keys, boxed
strings, absent unrelated properties and arbitrary ordinary-object length
values. Evidence: `.tmp/dynamic-string-length.log`,
`.tmp/source-paths-open-parameter.log`, `.tmp/source-paths-string-length.log`,
`.tmp/string-exotic-length-final.log`. The full path source measurement predates
the boxed-string unification; fresh final-source cohort validation is still
required. These remain uncommitted candidates, not a full TypeScript-suite pass.

Final nearby String/any-length/function-metadata regression run passes **38/38**
(`.tmp/string-length-neighbor-regressions.log`). Type checking and LOC/function
gates pass (`.tmp/string-exotic-length-tsc.log`, `.tmp/string-exotic-final-*.log`).
The two new frontend facts now import the clean canonical
`frontend/typescript.ts` namespace rather than the legacy runtime-selection
shim; this removes their newly detected boundary violations rather than granting
exceptions. Focused source-fact regressions pass **4/4**. Older boundary debt
elsewhere still prevents claiming a clean full architectural gate.

A uniform final-candidate source batch is running in session `20694`, writing
`.tmp/source-final-abi-<suite>.log` for compilerCore, paths, asserts, factory,
diagnosticCollection, base64, comments, parsePseudoBigInt. Keep runtime/compiler
sources frozen until that batch completes; inspect the existing live handle,
do not restart merely because a poll times out. Its full denominator is **44**
callbacks, not the entire upstream inventory. The next expansion candidate is
original `regExpScannerRecovery.ts`; its generated cases call Chai's callable
`assert(...)`, whereas the current adapter only supplies an assertion-method
object. Implement and verify faithful callable assertion support before running
that file; do not delete or rewrite its original checks.

While the frozen 44-callback batch runs, a separate callable assertion adapter
was added in `tests/dogfood/typescript-source-assert.mjs` (not yet wired into the
production source runner). It delegates truthiness and methods to the existing
checked shim operations and then allows the unchanged upstream augmentation.
Native plus both-IR callable controls and object/callable augmentation controls
pass **8/8** (`.tmp/typescript-callable-assert-augmentation.log`). Negative
controls require rejection of false, zero, empty string, null, undefined,
unequal scalars and unequal arrays, so successful calls alone cannot certify it.

Original `regExpScannerRecovery.ts` registers and passes **984/984** native
callbacks against the pinned source (`.tmp/regex-scanner-native.log`). It needs
the **services** namespace re-export, not only compiler: the original calls
`createLanguageServiceSourceFile` and `ScriptSnapshot.fromString`. No original
checks or service calls are substituted. A standalone probe using that namespace
and the callable adapter first completed in session `32981`, log
`.tmp/regex-scanner-standalone.log`, with a **launcher failure before compilation**:
the omitted `--import tsx` prevented the worker from resolving
`src/bundle-manifest.js` to its TypeScript source. This is not a compiler failure.
The corrected invocation, `RUN_STANDALONE=1 node --experimental-wasm-exnref
--import tsx .tmp/regex-scanner-native.mjs`, is running in session `17545`, log
`.tmp/regex-scanner-standalone-tsx.log`. Native callback count is measured, not an
estimate from source registration sites. Wasm compilation/runtime results are
still pending. The frozen final-candidate batch completed with exit zero:
**44/44** original callbacks across all eight files pass in native and
zero-import standalone Wasm. Each report independently passes
`sourceUnitFileSucceeded`, including exact callback counts, validation, target
and import provenance; this is not the full TypeScript unit inventory.

After that batch completed, the source runner gained an explicit
`regExpScannerRecovery` entry with the measured **984** callback floor, services
namespace and callable assertion bootstrap. The eight compiler-only entries
retain their measured bootstrap. Its count-floor regression rejects partial
results just like the existing entries. The corrected standalone scratch probe
remains running; do not count its native 984 successes as standalone successes.
Runner count/provenance guards, callable assertions and original augmentation
integration pass **20/20** tests in three files
(`.tmp/source-scanner-adapter-integration.log`, session `38030`, exit zero).

The corrected scanner probe (`17545`) is now terminal: compilation took
**304,245 ms**, returned no binary and reported **three errors** (plus warnings).
Original native cases still pass **984/984**; no Wasm callbacks executed.
The errors are `flatMapIterator` in `compiler/core.ts:437` (generator lowering
rejects the loop's conditional `continue`), and physical-ABI changes between
reservation and emission for nested `addArrayBindingPatterns` in
`services/codefixes/fixMissingTypeAnnotationOnExports.ts` and
`getFunctionFromCalls` in `services/codefixes/inferFromUsage.ts`. Both latter
errors change an array parameter's nullable reference type from type index 2
to a subsequently registered specialized type; preserve the signature invariant,
do not silence the guard. Host-import warnings are additional unresolved
evidence, not a measured import list from a valid binary. Focused pre-change
generator worklist/callback/open-object controls pass **11/11**
(`.tmp/generator-oracle-prechange.log`). Next reduce the original iterator
shape without dropping its `continue`, delegation or iterator-close behavior.

`tests/issue-1058-flat-map-iterator.test.ts` now reproduces that first error
independently: **1 native control passes; both standalone IR settings fail
compilation** (`.tmp/flat-map-iterator-prechange.log`, session `33500`, terminal
exit one). The original generic signature/body is unchanged; the callers test
undefined mappings being skipped, both array and generator delegates, normal
exhaustion and early-return cleanup. This is deliberately a red regression, not
a claimed fix. The immediate refusal is `loopBodyHasUnsupportedJump` at the
source-iterable admission and `lowerForOfWithClose`. Simply removing it is
unsound: `lowerStatements` currently treats yield-free `if (!iter2) continue`
as an ordinary statement, and its native continue would target the generated
resume loop rather than the source iterator header. Add an explicit state-plan
continue destination, preserve nested-loop ownership, and handle or reject
crossed finally regions until their completion routing is represented. The
existing iterator close states must remain on abrupt return/throw, but must not
run for a continue targeting the same source loop.

Candidate continuation fix: shared frontend `sourceLoopContinues` identifies
unlabelled continues owned by the source loop, excluding nested loop/function
ownership and declining labelled destinations/breaks. The existing generator
state planner binds them to that loop's iterator-step header and forces their
enclosing conditionals/blocks through structural lowering. A differing unwind
chain still refuses compilation rather than skipping a finally. Both compiler
modes pass the new before/after-suspension and early-return controls (**2/2**);
source ownership controls pass **9/9**. The new frontend leaf is registered as
clean in the compiler boundary manifest, with no codegen-context dependency.

The unchanged generic flat-map body then exposed a second defect: opaque
delegation operands had supplied no carrier evidence, defaulting the generator
to f64 and producing invalid Wasm at the externref delegation boundary. Such
operands now conservatively select the boxed-any carrier. The original focused
case now **compiles and validates but throws `Invalid iterator protocol` before
its first value**, in both modes; it is still red, not a passing test. A four-way
probe (`.tmp/flat-map-iterator-protocol-matrix.log`) reproduces this with array
and generator inputs and with/without skipped mappings. Stage instrumentation
confirms the mapped result is an actual array before generic `yield*` fails
(`.tmp/flat-map-iterator-stage.log`, -13). Merely mentioning array Symbol.iterator
in source does not repair it (`.tmp/flat-map-iterator-reflect-control.log`).
Investigate the generic delegation getter/start protocol for builtin arrays;
do not substitute eager flattening or remove original iterator checks.

Combined flat-map, existing worklist/callback/open-object and equivalence tests
are **18 passing / 2 failing**, the two being this remaining runtime frontier
(`.tmp/generator-continue-carrier.log`). Typecheck, focused lint, whitespace,
LOC and function-size gates pass (`.tmp/generator-continue-{tsc,lint,loc,func}.log`);
broader protocol regressions also pass **43/43** across four files
(`.tmp/generator-continue-protocol-regressions.log`, session `88031`, exit zero).
A fresh full source-unit scanner run has been launched through the production
runner, writing `.tmp/source-scanner-continue-candidate.log`; its result is
now complete (session `60203`, exit one). Native reference remains **984/984**.
Compilation took **296,901 ms** and now reports **two errors instead of three**:
the `flatMapIterator` refusal is gone; the two previously identified nested
array-parameter ABI mismatches remain. No Wasm binary/callback result exists.
The compiler freeze for this run is released; retain its report as evidence for
this candidate, not for subsequent edits.

Further runtime reduction: `tests/issue-1058-opaque-builtin-delegation.test.ts`
removes flat-map/callback/continue entirely and uses `yield* input` with an
`any` parameter. Native array, Unicode string and set controls pass **3/3**;
all **6** standalone mode/case combinations compile to valid zero-import Wasm
but throw before their first value (`.tmp/opaque-builtin-delegation-prechange.log`,
session `13028`, terminal exit one). The string case requires Unicode code-point
iteration, not merely the expected UTF-16 concatenation.

Two separate runtime layers are now directly observed. An ignored diagnostic
script `.tmp/inspect-builtin-delegation.mjs` adds exports to existing functions
and exception tag 0 in the compiled binary (in memory only), then calls the
actual getter, invocation and start helpers. Without explicit prototype
initialization, `__gen_delegate_get_iterator` and ordinary `__extern_get` both
return canonical undefined for an array. With Array/ArrayIterator prototype
initialization, the getter becomes callable, but invoking that actual closure
throws **`Array.prototype.values is not yet callable as a value in --target
standalone`** (`.tmp/inspect-builtin-delegation-exception.log`). This is the
explicit refusal in `emitArrayProtoMemberBody`, not a callback ABI failure.
The next runtime work needs both proper implicit iterator-member dependencies
and a real reflective Array values/keys/entries implementation using shared
iterator machinery. Preserve override lookup and lazy/live iteration; do not
short-circuit builtins directly into snapshot flattening. Existing direct array
iterator production is in `array-methods.ts::compileNativeArrayIterator`;
generic borrowed Array iterator methods must also support array-like receivers.

Do **not** reuse that producer unchanged: it eagerly copies the array into an
externref vector. New `tests/issue-1058-reflective-array-iterators.test.ts`
measures the resulting semantic gap independently: **4/4 native controls pass;
0/8 standalone combinations pass** (`.tmp/reflective-array-iterators-baseline.log`,
session `55290`, terminal exit one). The direct values/for-of mutation control
returns a wrong value in both modes; the six reflective values/keys/entries
cases throw. Controls require post-creation mutation/extension visibility,
exhaustion, deferred length reads/coercion, no indexed reads for keys, and fresh
entry pairs with undefined holes. An initial extra assertion about length-getter
counts *after* exhaustion did not hold in the Node reference and was removed;
the retained getter assertions cover creation, yielded keys and first completion.

Implementation direction from actual runtime inspection: keep the existing
`__IterRec` layout stable (kind=0, vec=1, i32 index=2, userIter=3, family=4).
A live Array iterator needs an independent payload retaining the original
receiver, a full ToLength-range cursor, and values/keys/entries mode; the i32
snapshot cursor cannot represent generic array-like lengths. Add its pure body
builder in the Wasm/IR model owner with thin resource registration, not another
copy of the AST-driven snapshot loop. `__iterator_next` and strict step dispatch
must agree; `__iterator_rest` has an explicit step-driven-kind allowlist and
must also include the new carrier. `%ArrayIteratorPrototype%.next` already calls
`__iter_next_result` after family validation (`iterator-proto-next.ts`), so keep
that shared result/prototype path. Reuse ordinary Get and full ToLength coercion
(`object-runtime-enumeration.ts::buildArrayLikeToLengthFromExternref`), preserving
observable getters and abrupt completion; do not use raw vec length for generic
receivers. The existing arguments iterator length helper shows the required
provider checks and scratch-local ABI. No production iterator implementation was
changed in this investigation; these regressions remain deliberately red.

Live iterator implementation candidate now added. New context-free
`src/wasm/model/live-array-iterator.ts` owns the stepping and provider dispatch;
`src/codegen/live-array-iterator.ts` is the explicitly unmigrated resource bridge.
The immutable existing record layout is unchanged; kind 10 stores a live payload
with receiver, f64 next index and mode in `userIter`. Both direct standalone
Array iteration and reflective values/keys/entries construct it. Each step
performs ordinary length Get plus the existing full ToLength provider, advances
before indexed Get, skips indexed Get for keys, creates fresh entry vectors, and
clears its receiver upon completion. Nullish receivers throw on creation.

The existing rest/drain body and its local ABI moved mechanically from the large
iterator module into `src/wasm/model/iterator-rest.ts`; initial and step-driven
builders both remain shared. This removes more legacy code than the integration
adds, rather than granting larger budgets. Both model leaves are classified
clean; the context-bearing registration bridge remains explicitly unmigrated.
The first extraction missed exporting the initial vec-only builder; corrected
before the final verification, not accepted as a regression.

The expanded live-iterator suite passes **21/21** (seven native cases plus both
standalone modes), including length/indexed getter throws and nullish creation.
Together with Array.from driver and iterator-prototype tests, final corrected
checks pass **40/40** (`.tmp/live-array-iterator-model-corrected.log`, session
`36648`, exit zero). LOC/function gates and focused lint pass without added
allowances. Broader final regressions and typecheck are still being collected.
Opaque delegation remains separate: an explicitly seeded diagnostic now
successfully invokes Array.values and obtains an iterator object, but generic
`__gen_delegate_get_next` still returns a non-callable value
(`.tmp/live-array-iterator-protocol-seeded.log`). The implicit iterator lookup
dependency must also be fixed. This candidate does not establish complete
ToObject boxing for borrowed primitive receivers; the pre-existing standalone
Object(any) implementation itself uses an identity fallback, and that wider
primitive-wrapper behavior must not be claimed as covered by object-only tests.

Final candidate verification completed: broader iterator/generator regressions
are **138 passing, 8 failing, 2 skipped across 14 files**
(`.tmp/live-array-iterator-final-regressions.log`, session `61735`, exit one).
Failures remain the six opaque builtin-delegation cases and the two original
flat-map cases, not the new live iterator controls. Source typecheck and all
eight edited-file lint checks pass (`.tmp/live-array-iterator-final-{tsc,lint}.log`).
Fresh original `compilerCore.ts` still passes **11/11** native and **11/11**
validated zero-import standalone callbacks (`.tmp/source-compilerCore-live-array.log`,
session `2362`, exit zero). This is the only original-source file rerun on the
live-iterator candidate; do not relabel the older eight-file 44/44 batch as fresh.

### Fresh main synchronization checkpoint (2026-09-27)

Fetched `loopdive/js2` main at
`2a58b9fe9f95dc17bd5d2ba44ecd564b9695356b`. The current branch is
41 commits ahead and 42 behind that fetched tip. This fresh tip is **not yet
merged**; the earlier merge below covered `dc7eb2c1e3`, not this new tip.
The dirty TypeScript candidate is preserved in the isolated worktree. Main
overlaps its array prototype, generator, object runtime, finalization and
boundary-manifest changes. Do not stash or overwrite those files to merge.

The required pre-checkpoint checks were rerun before attempting to commit:
LOC and function budgets pass against the previous merged main base; coercion,
oracle and dead-export checks fail (`.tmp/sync-pre-{loc,func,coercion,oracle,exports}.log`).
Specifically: the live-array bridge directly checks three conversion-provider
names; generator array layout adds one direct checker query; structural-class
receiver admission adds another checker use. Three old helpers are unreferenced:
`isGeneratorClosureDeclaration`, the separate `function-proto-call.ts` emitter,
and `registerResolvedRestParam`. The dead-export command additionally reports
incomplete moved-runtime evidence for nonliteral dynamic imports in
`optimize.ts` and `runtime/platform-capability-adapter.ts`. Do not weaken these
gates or misrepresent the checkpoint as merge-ready. No staging, commit, merge
or push was performed during this synchronization attempt.

An additional uncommitted delegation dependency fix now reserves
`ensureIterRecPrototypeHelper` before ordinary object runtime setup. With
explicit Array/ArrayIterator prototype initialization, the diagnostic getter
finds callable `next` and delegation yields both values
(`.tmp/live-array-next-getter-demand.log`). Unseeded opaque builtin and flat-map
tests still fail: implicit builtin prototype-member demand remains unresolved.
This new dependency fix has not received the full earlier regression run.

Checkpoint cleanup continuation: removed the three unused superseded helpers
and their stale imports/manifest entry; their previous versions remain in git.
Moved the live iterator's full-conversion dependency requirement into the shared
array-like ToLength builder. Its existing numeric clamp now lives in the
context-free `src/wasm/model/to-length.ts`, without new legacy size allowances.
Generator numeric classification and delegated declaration lookup now use the
existing oracle queries. The physical array-layout query and structural-class
predicate remain migration debt; this is not a claim that all checker uses are
gone. LOC, function, coercion and oracle gates pass against `dc7eb2c1e3`.

The configured dead-export command also exits zero after cleanup: its
`preservation-v1` contract passes 6/6 full and 6/6 cut witnesses. The strict
modeled-closure diagnostic remains OPEN, but is not a failure of that configured
contract. The earlier record conflated the printed diagnostic with the overall
command status before the orphan-helper cleanup.

New executed clamp/missing-provider tests plus live iterator regressions pass
**35/35** (`.tmp/sync-cleanup-model.log`). Generator/oracle checks pass **50/52**
(`.tmp/sync-cleanup-generator.log`): the old string-outer refusal expectation
now observes compilation success, while a resume binding before delegation
still refuses compilation. Both failures reproduce with the two new oracle
query substitutions removed (**32/34**, `.tmp/sync-cleanup-generator-query-control.log`),
so they precede this cleanup. A clean `7cf98cb97e` control passes **34/34**
in the same standalone Vitest suite (`.tmp/sync-cleanup-generator-control.log`
in the retained string-control worktree). Therefore the resume-binding failure
is a regression within the intervening candidate, not an upstream baseline
failure. Preserve this explicit handoff; do not publish the checkpoint as a
finished or fully passing TypeScript implementation.

The local candidate was preserved in signed checkpoint `3c2aaad5a804` after
all five configured ratchet commands passed. Integrating fetched main
`2a58b9fe9f95dc17bd5d2ba44ecd564b9695356b` produced one content conflict,
in the inliner. Preserve both mechanisms: this branch's iterative caller walk
and main's per-call reset of defaultable locals at loop sites. The reset
analysis/emission now lives in `src/wasm/model/inline-local-resets.ts`; its own
walk is iterative too. The old driver does not receive a larger size allowance.

Post-resolution focused tests pass **58/58** across seven files, including
12,000-level reset analysis, main's repeated-call reset regressions, existing
deep instruction walks, generator worklist delegation and live array iterators
(`.tmp/sync-merged-final-focus.log`). Five additional upstream regression files
pass **24/24**: dynamic slice/reentry, computed this-key methods, wide property
dispatch, and the cross-bucket reflection/iterator cases
(`.tmp/sync-merged-upstream.log`). All five configured ratchet commands pass
against the new fetched main SHA (`.tmp/sync-merged-{loc,func,coercion,oracle,exports}.log`).
These are integration checks, not the full TypeScript upstream unit suite.
Merge committed and SSH-signature/ancestry verified as `58fce98114`; fetched
main `2a58b9fe9f` is now an ancestor. Final source typecheck passes. Fresh
original `compilerCore.ts` passes **11/11 native and 11/11 validated zero-import
standalone callbacks** on that merged commit
(`.tmp/source-compilerCore-main-2a58.log`, session `87622`, terminal exit zero;
compile 2912 ms, binary 967689 bytes). The scanner and complete original-unit
batch have not been rerun on this merged tree. The recorded resume-binding and
implicit-delegation frontiers remain the next implementation work.

#### Post-merge implicit builtin delegation continuation

On `58fce98114` plus the current iterator candidate, implicit `yield*` now
requests ordinary builtin prototype members. String iteration returns a real
iterator record and uses the shared native string step implementation. Map/Set
dispatch defers to an actually seeded ordinary `@@iterator` property instead of
resurrecting the synthetic legacy closure after replacement or deletion. The
decision reads the seeded-symbol registry, not an approximate demand flag.
The dispatch guard is extracted without increasing function-size allowances.

Measured before that behavior-preserving extraction: **143/143 tests in 11
files**, including the original TypeScript `flatMapIterator`, opaque Array,
String, Map and Set delegation, prototype replacement/deletion under both IR
modes, and nearby iterator/generator protocol tests. Source typecheck and lint
passed. Evidence: `.tmp/implicit-builtin-final-regression.log` and
`.tmp/implicit-builtin-{tsc,lint}.log`. This is not the complete upstream suite.
After the guard extraction, the same **143/143 tests in 11 files** pass again
(`.tmp/implicit-final-extraction-tests.log`, terminal exit zero), source
typecheck and lint pass (`.tmp/implicit-final-extraction-{tsc,lint}.log`),
and the function-size gate passes without a new allowance
(`.tmp/implicit-extraction-func.log`).

The fresh original `regExpScannerRecovery.ts` run finished with **984/984 native
callbacks passing**, but compilation failed after **304032 ms**, emitted zero
bytes, and therefore executed **no standalone callbacks**. Evidence:
`.tmp/source-scanner-implicit-iterators.log`, session `25551`, terminal exit 1.
The two remaining errors are full physical ABI changes after nested-function
reservation: `withContext/addArrayBindingPatterns` changes an array parameter
from nullable type 2 to 11167; `inferTypeFromReferences/getFunctionFromCalls`
changes its final array parameter from nullable type 2 to 11251. These numeric
indices are from this run, not stable identities. Investigate lazy array element
layout publication before reservation; retain the loud ABI guard. Host-import
warnings also remain, so fixing these two errors is not evidence of standalone
readiness. The previously recorded generator resume-binding regression remains
unresolved separately.

#### Array-element signature registration candidate

The scanner ABI failure now has a reduced witness in
`tests/issue-1058-nested-array-parameter-abi.test.ts`: a nested function takes
`Item[]` before a direct `Item` parameter, where `Item` is a local interface.
Before the fix, both IR modes reproduce the exact numeric-vector-to-struct-vector
reservation mismatch (`.tmp/nested-array-abi-before2.log`, **0/2 passing**).
`ensureStructForType` skipped array carriers without registering their element
structure. The later direct parameter registered it after the array signature
had already been published. The shared registration owner now prepares array
elements with its existing per-compilation cycle guard. No ABI assertion is
weakened, and both compilation paths use this preparation.

The expanded Array/ReadonlyArray/derived-array matrix passes **6/6** in
standalone with validated zero-import modules and checked return values
(`.tmp/nested-array-abi-matrix.log`). Existing reservation tests pass **7/7**.
The nearby array/identity/recursive-structure batch passes **24/27**; all three
failures reproduce on clean merged commit `58fce98114` in the same harness:
two generic node-array factory illegal casts and the GC-lane shared metadata
failure. Control: `/private/tmp/ts2wasm-ts5-array-control-58fc`,
`.tmp/array-registration-control.log`, **11/14**. Candidate:
`.tmp/nested-array-registration-regressions.log`. These remain unresolved,
not credited as passing. Typecheck, lint (two existing warnings), and all five
configured source gates pass; the reachability contract is preservation-only,
not strict graph closure (`.tmp/array-registration-*.log`). The 143 iterator and
generator regression tests also pass after this change
(`.tmp/array-registration-iterator-regressions.log`).

The fresh full scanner compile finished (session `24411`, exit 1): **both
reservation errors are gone**, compilation succeeds in **328844 ms** and emits
**54800535 bytes**, but Wasm validation fails before any standalone callback.
The new concrete frontier is `SourceFileObject_new`, function 2597:
`struct.new[28] expected type (ref null 657), found local.get of type i32`.
Native callbacks still pass **984/984**. This is compile-frontier progress,
not a standalone test pass. Evidence: `.tmp/source-scanner-array-registration.log`.
Fresh original `compilerCore` passes **11/11 native and standalone** with zero
imports (3355 ms, 1573325 bytes); original `factory` passes **3/3** in both lanes
with zero imports (111897 ms, 14199584 bytes). Evidence:
`.tmp/source-{compilerCore,factory}-array-registration.log`. The seven-file
source batch finished (session `74296`, exit 0). Together with compilerCore,
all eight source files pass **44/44 native and 44/44 standalone callbacks**;
each module validates with zero imports. This measurement predates the
constructor-default fix below. Logs: `.tmp/source-<suite>-array-registration.log`.
The diagnostic-only source compile finished as session `42141`, exit 0, using
`.tmp/inspect-sourcefile-constructor.mjs` with the same runner options plus
`emitWatOnlyFunctions` for `SourceFileObject_new`/`SourceFileObject_init`.
`.tmp/sourcefile-constructor-wat.log` identifies the mismatched field and its
producer. No compiler ABI assertion or validation was disabled.

#### Constructor-default counting repair

The emitted `SourceFileObject_new` contains the complete default operands,
followed by five duplicate trailing defaults. `fixupStructNewArgCounts` stops
its backwards count at the `f64.reinterpret_i64` used for optional numeric
`id`'s undefined sentinel. It counts only the suffix, appends five defaults,
then stack coercion spills/reloads the shifted values. Field 28,
`libReferenceDirectives`, consequently receives an i32 instead of its vector.
The class layout itself has the expected 57 fields.

The count now lives in the shared, AST-free Wasm model and treats
`i64.const; f64.reinterpret_i64` as one default expression. The codegen pass
consumes that helper; no allowance increase or validation suppression is used.
`tests/issue-1058-struct-default-count.test.ts` includes an executable Wasm
fixture and an idempotence check. Clean `58fce98114` turns its complete
seven-instruction constructor into nine instructions and invalid Wasm
(`/private/tmp/ts2wasm-ts5-array-control-58fc/.tmp/constructor-default-control.mjs`).
The candidate retains seven instructions, validates with zero imports, and
returns 7. Together with model, constructor, and existing shared-body checks,
**8/8 tests pass** (`.tmp/constructor-default-after.log`). The small source
constructor smoke already passed before this fix; it is nearby coverage, not
credited as a regression flip. An earlier variant exposed a separate existing
optional self-reference/undefined comparison failure and was not used as
evidence for this default-count defect.

A fresh original scanner run finished as session `47314`, exit 1, log
`.tmp/source-scanner-constructor-defaults.log`: the constructor error is gone,
but validation now fails in function 2605,
`SourceFileObject_computeNamedDeclarations`, where `struct.new[0]` expects
`ref null 276` and gets an i32 local. Compilation succeeds in **314861 ms**,
emits **54799018 bytes**, native callbacks pass **984/984**, and standalone
callbacks remain unexecuted. Do not count the frontier movement as a runtime
pass. Fresh `compilerCore` passes **11/11 in both lanes** on checkpoint
`3a49c5bc96` with zero imports, 3580 ms, 1573325 bytes
(`.tmp/source-compilerCore-constructor-defaults.log`).

All five configured source gates and typecheck/lint passed (sessions
`78179` and `21824`, terminal exit 0; `.tmp/constructor-default-*.log`). Lint
reports existing warnings, not errors. The class/optional-field regression
batch finished **35/35**, session `53914`, `.tmp/constructor-default-regressions.log`.
The fixes and prior evidence are committed, signed, and locally verified as
`3a49c5bc96e18f50b9d6fd7e7a65ed147f9b79f1`; not pushed.

The diagnostic-only compile finished as session `3805`, exit 0, with the same
options plus WAT selection for `SourceFileObject_computeNamedDeclarations`
and `SourceFileObject_new`. Its log is
`.tmp/sourcefile-named-declarations-wat.log`; the updated ignored diagnostic
script also preserves `.tmp/sourcefile-named-declarations.wasm` for subsequent
inspection without recompiling. Binaryen cannot parse this saved invalid module
(empty-stack parse exception at offset 29719212), so do not assume its text
emitter can replace compiler-selected WAT for the remaining failures.

#### Class method nested-callback hoisting candidate

The WAT shows `SourceFileObject_computeNamedDeclarations` allocating `visit`'s
closure with captures `bestResult` and `lastNodeEntirelyBeforePosition` from an
unrelated nested `visit` in `compiler/parser.ts`. Its own callback should capture
the local declaration map and sibling helpers. Ordinary class methods hoisted
var/let/const bindings but omitted `hoistFunctionDeclarations` before the
statement loop, so their first callback-value read reached a stale graph-wide
name entry before their own declaration had been registered.

`tests/issue-1058-class-nested-function-hoist.test.ts` reproduces the wrong
callback in both modes (**0/2**, null-pointer runtime failures), then passes
**2/2** after ordinary class methods use the existing shared declaration-hoisting
step following local binding setup. The ordered three-step preparation is
extracted into a small method helper; there is no new capture representation or
ABI lookup algorithm. Combined nearby class/capture coverage passes **31/31**
(`.tmp/class-nested-hoist-{before,after,regressions}.log`). All five configured
source gates pass (`.tmp/class-hoist-{loc,func,coercion,oracle,exports}.log`);
Initial typecheck (`68492`) caught the helper's overly broad readonly-array
parameter annotation. It now accepts the actual `ts.NodeArray<ts.Statement>`
passed at the call site (erased, runtime-identical change). Recheck passed,
session `20439`, `.tmp/class-hoist-{tsc2,lint2}.log`; all source gates also passed
with `2`-suffixed logs after that annotation change (session `95846`). Expanded
instance/static × direct/transitive sibling capture × both-IR coverage passes
**8/8**, `.tmp/class-hoist-matrix.log`, session `12149`, exit 0.

The fresh original scanner run finished as session `52443`, exit 1, log
`.tmp/source-scanner-class-hoist.log`: the callback allocation failure is gone;
the next validation error is function 2943 `doChange`, where
`extern.convert_any` receives an already-externref `struct.get`. Compilation
succeeds in **314199 ms**, emits **54828548 bytes**, native passes **984/984**,
and standalone callbacks remain unexecuted. The saved binary is exactly
54828548 bytes, matching the runner report.
An ignored preloader only records the bytes submitted to the original
`WebAssembly.compile` and forwards the call unchanged, preserving validation
and runtime semantics. Expected artifact: `.tmp/source-scanner-class-hoist.wasm`.
Do not claim full scanner success from the reduced callback test.

The ignored `.tmp/inspect-binary-function.mjs` preserves type/import/name
sections and the selected function body, replacing other bodies with
`unreachable` solely for disassembly. This lets Binaryen read the selected
function without encountering unrelated invalid later bodies; the isolated
module is never executed or counted as a compiler result. Inspection of index
2943 completes in under a second (`.tmp/doChange-binary-inspect.log`). The
source is `services/codefixes/fixForgottenThisPropertyAccess.ts`, destructuring
`{ node, className }: Info`. The physical field `node` is externref but its
destructuring read adds `extern.convert_any`. Next inspect
`destructureParamObject`: it chooses the heap type from `paramType` but reads
field metadata through the name-keyed `ctx.structFields`, rather than the
physical `ctx.mod.types[structTypeIdx]`. Prove the metadata drift and add a
regression before replacing that reader; do not merely delete the emitted
conversion from the binary.

### Physical destructuring layout continuation (2026-09-27)

Fetched `loopdive/js2` main again at
`2a58b9fe9f95dc17bd5d2ba44ecd564b9695356b`; it is already an ancestor of
`1b64a7d668`, so the requested merge reports already up to date. Work remains
in the isolated TypeScript checkout; the unrelated original checkout is untouched.

The initial two-lane source smoke test passes before any change and is **not**
a regression reproducer. A targeted emission fixture with a physical externref
field and a stale name-keyed ref field fails with the exact `extern.convert_any`
validation error (`.tmp/destructure-physical-regression-before.log`: **1/3 fail**).
After routing the destructuring read through the module-owned physical layout,
the fixture validates with zero imports and preserves a supplied object's
identity. Layout selection is shared with the new IR field owner via
`physicalObjectFields`; no second legacy-only lookup algorithm or metadata-map
mutation is introduced. The struct name remains only for open-class semantics.

Focused candidate tests pass **61/61 across 7 files**, including symbolic IR
field lowering, default/absent bindings, nested patterns, and both source lanes
(`.tmp/destructure-physical-shared-ir.log`). An earlier wider batch is **54/57**:
the three null-destructure host tests fail on missing `string_constants` imports;
the same **3/3 failures** reproduce unchanged on clean `58fce98114` with the same
Vitest configuration (`.tmp/destructure-null-control.log` in the retained array
control checkout). These are not credited as candidate successes.

A pre-fix full scanner rerun remains byte-identical at **54,828,548 bytes**, native
**984/984**, invalid at `doChange` after **311,369 ms**
(`.tmp/source-scanner-field-trace.log`). Temporary logging at the parameter-hint
site did not produce metadata evidence and was removed. The reduced fixture
proves the emission seam; original-source attribution still requires the
post-fix full scanner run, started in session `58994` with report
`.tmp/source-scanner-physical-fields.log` and unchanged-validation binary capture
at `.tmp/source-scanner-physical-fields.wasm`. Do not claim standalone callbacks
passed while this verification is pending.

Candidate type-checking, lint, formatting, and all five source gates pass
(`.tmp/destructure-physical-shared-{tsc,lint,loc,func,coercion,oracle,exports}.log`);
no allowance was added. Dead-export verification uses the configured
preservation-only contract, not a claim of strict closure. A fresh original
`compilerCore` run passes **11/11 native and standalone callbacks**, zero imports,
**1,573,325 bytes**, **3,539 ms** (`.tmp/source-compilerCore-physical-fields.log`).

### Object-spread carrier continuation (2026-09-27, in progress)

Signed checkpoint `4913aa84f1` completes the physical destructuring repair.
The original scanner verification above terminated with native **984/984**,
**54,829,428 bytes**, **323,462 ms**, but still invalid Wasm. Its first error
moved from `doChange` to function 3080 `getRefactorActionsToRemoveFunctionBraces`:
`fallthru[0] expected (ref null 6), got externref @+12991388`.
Saved-binary inspection confirms `doChange` now reads the externref directly,
without the invalid conversion. The new module still has 11 raw function imports:
`Set_forEach`, `Set_add`, `__get_filename`, `__get_process_cwd`,
`__get_process_platform`, `__get_dirname`, `__get_process_argv`,
`__get_process_stdout`, `__process_exit`, `__js_array_new`, `__js_array_push`.
No standalone scanner callback has executed.

Diagnostic-only isolated-function validation identifies both failures as the
`name` copy in `{ ...addBracesAction, notApplicableReason: info.error }` and its
remove-action counterpart (`.tmp/scanner-remove-braces-validation.log`). The
spread helper assumes the source field has the destination's carrier. A source
`{ name: any }` spread into a typed `{ name: string }` return reproduces the exact
validation error in **both lanes (0/2)** (`.tmp/spread-field-carrier-before.log`).
The candidate reads source layout through the shared IR physical-field owner,
tests absence using the source representation, and converts only the present
value to the destination representation. Coercion keeps detached fallback
bodies visible to late-import fixups. Both original reductions then pass **2/2**.

Expanded carrier checks pass **12/12** for opaque/string, string/opaque,
number/opaque, opaque/number, boolean/opaque, and object/opaque identity.
Two exploratory optional-source cases still trap with `illegal cast`; the
existing nullish-source suite also fails **2/2**, identically reproduced on
clean `58fce98114` (`.tmp/spread-nullish-control.log` in the retained array control).
Do not claim optional/nullish sources fixed by this carrier change. Testing
absent properties separately exposed a second real defect: the "spread overrides
a named writer" shortcut also ran when there was **no named writer**, discarding
all earlier spreads. It now requires a named writer; spread-only literals use
the existing ordered fallback chain. Both copies of that chain are kept visible
to coercion-time import fixups. The final matrix passes **14/14**, including
named fallback and earlier-spread fallback (bitmask **15**, previously **7**).

Final focused tests pass **45/45 across four files**
(`.tmp/spread-field-carrier-final-tests.log`), covering the new matrix, ordinary
object literals, the prior destructuring fix, and symbolic IR field access.
The generic spread/rest suite fails **13/13** on missing `string_constants`
test imports; all 13 reproduce on clean `58fce98114`, while ordinary object
literals pass **21/21** there (`.tmp/spread-generic-control.log`). This is
separate from the two reproduced optional-source casts above.
Type-checking, lint and all five source gates pass on the final production edit
(`.tmp/spread-field-carrier-{tsc,lint,loc,func,coercion,oracle,exports}2.log`),
without allowance growth. Dead-export checking remains preservation-only.

Frozen-candidate full scanner verification is running in session `66192`,
report `.tmp/source-scanner-spread-fields.log`, binary
`.tmp/source-scanner-spread-fields.wasm`. Fresh compilerCore/factory verification
is running in session `48211`, `.tmp/source-<suite>-spread-fields.log`.
Keep this frontier open until the real scanner result is read; a reduced test
passing is not proof the complete scanner now validates or runs.

The source-unit loop (session `2269`) spans this next edit and is diagnostic,
not a single frozen-candidate batch. Before the spread edit, factory **3/3**,
diagnosticCollection **5/5**, and base64 **1/1** completed standalone with zero
imports on `4913aa84f1`; compilerCore **11/11** was already verified above.
The loop subsequently completed (exit 0); comments **3/3**, parsePseudoBigInt
**5/5**, paths **14/14**, and asserts **2/2** each passed with zero imports.
These later results must retain their mixed-edit provenance and must not be
combined into a claimed post-spread **44/44** without a fresh frozen-candidate run.

### Published constructor ABI continuation (2026-09-27, in progress)

Signed checkpoint `e3b786c6c6` completes the spread-field repair. The frozen
scanner run terminates with native **984/984**, **54,831,929 bytes**, **316,209 ms**,
but still invalid Wasm. It passes the earlier refactor spread failures and now
stops at function 5267 `__closure_846`: `ChangeTracker_new` argument 1 expects
`ref null 3004` but the emitted argument is `ref null 1622`
(`.tmp/source-scanner-spread-fields.log`). Binaryen diagnostic-only isolation
confirms the exact constructor call (`.tmp/scanner-closure-846-validation.log`).
No standalone scanner callbacks execute. Fresh source controls on the same
checkpoint pass compilerCore **11/11** and factory **3/3**, both with zero imports;
factory emits **14,199,590 bytes** in **112,449 ms**, compilerCore **1,573,325 bytes**
in **3,261 ms** (`.tmp/source-<suite>-spread-fields.log`).

The constructor trace proves a phase-order defect, not a stale function-index
lookup. Collection publishes `ChangeTracker_new(string, ref __anon_69)` with
the FormatContext argument at pre-emission index **1624**. Dynamic constructor
arms, including `__closure_846`, emit against that live published signature.
Class-body compilation then re-resolves the same source annotation to named
`FormatContext` at **3011** and overwrites the function signature. The old and
new layouts have the same three properties but differ in identity and reference
nullability. `.tmp/scanner-constructor-abi-trace.log` records collection,
dispatch, replacement, and later dispatch using the changed signature. Direct
compile emits the same **54,831,929-byte** binary. Type details are retained in
`.tmp/scanner-constructor-types.tsv`.

The first trace attempt through the unit runner (session `90053`, exit 1)
does not preserve successful-worker stderr; the direct diagnostic above
(session `96831`, exit 0) is the authoritative trace. All temporary logging
has been removed. A cyclic-module source probe validates but throws at runtime
in both lanes, so it is **not** a reproducer of this ABI validation defect;
retained only as `.tmp/constructor-interface-smoke.test.ts`.

The targeted owner regression reserves an anonymous interface layout,
collects a constructor, then registers the named interface before compiling
the body. Before the change the published parameter changes **6 → 10**
(`.tmp/constructor-interface-owner-before.log`, **0/1**). The candidate binds
constructor frame names to the published physical signature through the shared
class-callable ABI owner and removes body-time signature replacement. Existing
pre-emission forward-class ABI planning remains responsible for deliberate
finalization. The new regression and adjacent IR/host class-ABI tests pass
**7/7** (`.tmp/constructor-interface-owner-after.log`). Broader constructor
regressions pass **31/32** across eight files, including inherited constructors,
native annotations, overload ownership, imported class identity, and the earlier
class-callback hoisting regression (`.tmp/constructor-interface-regressions.log`).
The sole built-in-parent forwarding failure reproduces unchanged on clean
`58fce98114` (**4/5**, `.tmp/constructor-2086-control.log` in the array control
checkout). It is not a new regression or a claimed success.

Type-checking, lint, formatting and all five source gates pass on the final
constructor edit (`.tmp/constructor-interface-{tsc,lint,loc,func,coercion,oracle,exports}2.log`),
with no allowance growth and preservation-only dead-export verification.
Full scanner verification completed (session `3633`, exit 1): native **984/984**,
**54,834,035 bytes**, **316,204 ms**. The `ChangeTracker` constructor call now
passes validation, but a later function 6240 `__closure_1231` fails: fallthrough
expects `ref null 2`, receives `ref 1524`, offset **28,546,240**. No standalone
scanner callbacks execute; import closure remains unverified. Report:
`.tmp/source-scanner-constructor-abi.log`; binary:
`.tmp/source-scanner-constructor-abi.wasm`.
Fresh frozen-candidate compilerCore **11/11** and factory **3/3** pass with zero
imports (`.tmp/source-<suite>-constructor-abi.log`): **1,573,325 bytes / 3,354 ms**
and **14,199,590 bytes / 111,560 ms**, respectively. This is **14/14**, not a new
full-suite result. A fresh fetch and merge of `loopdive/js2` main confirms
`2a58b9fe9f95dc17bd5d2ba44ecd564b9695356b` is already an ancestor; merge reports
already up to date. The next task is the callback return-carrier mismatch.

Signed constructor checkpoint: `03fe514745`. The next diagnostic isolates
`__closure_1231` to `trackChanges` in `src/services/codefixes/addMissingAsync.ts`
line 71: `cb => (cb(t), [])`. Diagnostic-only binary isolation confirms the
result block expects the externref-element vector while its tail constructs a
different vector. A source-shaped reduced test reproduces the validation error
in both IR modes (**0/2**); the exploratory array-return matrix is **0/8**, with
four validation failures and four runtime exceptions, not eight equivalent
failures (`.tmp/closure-return-carrier-exact-before.log`). The closure source
mapping run is session `80480`, `.tmp/scanner-closure-return-source-map.log`.
Investigation now checks concise-body coercion's kind-only comparison, which
ignores different physical heap types sharing a reference kind.

The two concise-body consumers now compare full physical value types and call
the existing shared coercion engine, rather than introducing an array-specific
conversion. The permanent source-shaped regression executes the callback
directly, checks its captured side effect and the returned empty array, and
requires zero imports in both IR modes. Before: **0/2**, invalid return heap
type (`.tmp/closure-array-return-before.log`). Candidate: **2/2**. The broader
six-file batch passes **35/37** (`.tmp/closure-array-return-after.log`); both
failures reproduce on clean `58fce98114` (**9/11** in the two affected files,
`.tmp/closure-array-return-control.log` in the array control checkout): the GC
parser-list illegal cast and an expected generic-callback rejection that no
longer throws. Neither is credited as fixed.

The exploratory indirect-call variants remain **0/8** with runtime exceptions
after the conversion (`.tmp/closure-return-carrier-direct-after.log`, including
the two passing direct cases gives **2/10**). These are unresolved callback
dispatch failures, not passing array-return tests. Source mapping session
`80480` terminated with heap exhaustion (exit 134) after emitting the necessary
`trackChanges` mapping; it provides source attribution only, not a completed
compile. Full scanner verification of the candidate is running in session
`89089`, `.tmp/source-scanner-closure-return.log`, with binary preservation at
`.tmp/source-scanner-closure-return.wasm`. Fresh compilerCore/factory controls
are session `15653`. Additional closure-ABI regressions pass **41/41** across
three files (session `16512`, `.tmp/closure-return-abi-regressions.log`).
Type-checking, lint, formatting and all five source gates pass without allowance
growth (`.tmp/closure-array-return-{typecheck,lint,loc,func,coercion,oracle,exports}.log`).
Dead-export verification remains preservation-only, not strict closure proof.

Signed concise-return checkpoint: `e37238aaec`. Fresh source compilerCore and
factory controls completed successfully (**11/11 + 3/3**, zero imports; factory
**14,199,590 bytes / 116,774 ms**, `.tmp/source-factory-closure-return.log`).
The indirect `Track` reproducer is now attributed more narrowly: the generated
`execute(track)` dispatch tests six function signatures, none matching the
actual closure's `(root, externref) -> vec_externref` signature (type 68 in the
reduced binary). Its declared result is `Change[]` (vector type 50). The
terminal branch throws `TypeError` before invoking the callback, confirmed by
an in-Wasm catch returning **-2** (`.tmp/indirect-closure-return-wat.log`, script
`.tmp/inspect-indirect-closure-return.mjs`). Direct invocation passes. This is
an omitted callable-dispatch candidate/return bridge, not evidence that array
conversion corrupts the callback's captured state. Keep the scanner candidate
frozen until session `89089` completes before selecting the next implementation.

Scanner session `89089` completed with native **984/984**, **54,836,001 bytes**
in **320,602 ms**, still invalid and with no standalone callbacks executed.
It advances beyond `trackChanges` to function 6242 `__closure_1228`
(`getAllCodeActions`, addMissingAsync line 62): closure construction field 2
requires externref but receives `ref null 1517` (CodeFixAllContext), offset
**28,547,149**. `.tmp/scanner-closure-1228-validation.log` isolates the bad bag
operand in the closure passed to a `return_call codeFixAll`.
The exact call-argument model advertises `return_call` support, but its stack
effect function rejects that terminator, so it never records its arguments.
The unsafe legacy backward fallback then walks inside the boxed closure
argument and retags its unrelated bag null. Next implementation will make the
shared forward producer model record terminal direct-call operands exactly.
The remaining six original compiler-suite checks started on `e37238aaec`
in session `60679`, `.tmp/source-<suite>-closure-return.log`; the subsequent
tail-call edit overlapped this loop, so do not combine it into a frozen 44/44
checkpoint result.

The tail-call model regression demonstrates both missing attribution and
corruption of an unrelated closure bag (**0/2** before,
`.tmp/tail-call-arg-producers-before2.log`). The shared forward model now records
the known direct tail-call parameters and stops after that terminal instruction.
The initial four-file batch passes **19/19**
(`.tmp/tail-call-arg-producers-after.log`); the expanded owner tests pass **4/4**
(`.tmp/tail-call-arg-producers-after2.log`), including stop-at-terminator and
positive actual-null repair controls. Full scanner verification and source
gates are running: scanner session `39100`
(`.tmp/source-scanner-tail-args.log`, `.tmp/source-scanner-tail-args.wasm`),
type-check session `22738`, five-gate chain session `22214`
(`.tmp/tail-call-arg-producers-{typecheck,gates}.log`). Formatting/lint already
pass (`.tmp/tail-call-arg-producers-style.log`). No real-source success is
claimed yet; the tail-call candidate is not committed until verification finishes.
The five-gate chain and initial type-check completed with exit 0; preservation-only
dead-export verification remains the limit. Expanded owner tests now pass
**5/5**, including an emitted, zero-import Wasm module that executes the tail
call and observes the original null bag (`.tmp/tail-call-arg-producers-runtime.log`).
Formatting and lint pass after that test addition. The broader six-file
tail-call/stack/coercion batch is session `96439`
(`.tmp/tail-call-arg-producers-broad.log`); final test-inclusive type-check is
session `86623` (`.tmp/tail-call-arg-producers-typecheck2.log`).
That final type-check passed. The broader batch is **34/36**; both failures
reproduce on clean `58fce98114`: the tail-call guard's stale IR allocation
provenance rejection (**6/7**, `.tmp/tail-call-2554-control.log`) and the stack
test's missing host `__get_caught_exception` import (**14/15** including the
passing call-argument suite, `.tmp/tail-call-arg-producers-control.log`).
These are baseline failures, not new successes. Control logs live in the array
control checkout. No production changes were made while scanner `39100` runs.

Scanner `39100` is now terminal (exit 1): native **984/984**,
**54,835,934 bytes / 326,033 ms**, still invalid. The closure bag corruption is
gone; validation advances to function 7269 `invokeCallbacks`, offset
**29,722,240**: a call needs three stack arguments but only two are available.
No standalone callbacks execute; zero-import closure is not established.
Keep `.tmp/source-scanner-tail-args.log` and `.tmp/source-scanner-tail-args.wasm`
as this candidate's authoritative full-source result. The shared tail-call
repair is ready for a checkpoint; next work is the missing call operand.

Signed checkpoint: `969ef8964c`. Raw bytes at the failing offset identify
`call 0`, the `Set_forEach` host import, not a user callback. Optional-chain
lowering calls the declared external method with only the receiver and callback
and omits its third `thisArg` slot. More importantly, standalone must route
this operation through native collection iteration rather than merely padding
the host import. The source is `cache.get(dirPath)?.links?.forEach(...)` in
compiler/sys.ts. Binaryen cannot parse the stack-invalid isolated function;
direct selected-function WAT capture is session `83620`
(`.tmp/scanner-invokeCallbacks-wat.log`, 8 GiB diagnostic heap).
Next task: preserve optional-chain short-circuiting/single receiver evaluation
while reusing the existing native collection forEach implementation.

The selected-function WAT capture completed successfully with the identical
**54,835,934-byte** binary and confirms `Set_forEach` import 0 in
`invokeCallbacks`. A small optional Set parameter did not import the host
helper, but silently skipped the live call (**0/2**, returned 0 instead of 20);
this is the same missing optional native dispatch with a different downstream
fallback (`.tmp/optional-collection-foreach-direct-before.log`). The earlier
nested Map/optional-property probe also returned 0; preserve it as
`.tmp/optional-collection-nested-probe.test.ts`, not a successful control.

Optional collection lowering now passes its already-evaluated receiver local
to the existing native forEach owner. No second iteration algorithm was added.
That owner skips receiver re-evaluation even on its non-callable-argument throw
path. The expanded source tests pass **6/6**, covering Map and Set in both IR
modes, receiver evaluation once, skipped arguments on a missing receiver,
value/key/collection arguments, `thisArg`, and undefined return values, all with
zero imports (`.tmp/optional-collection-foreach-matrix.log`). The initial
adjacent batch is **12/13**: its GC optional-size failure reproduces on clean
`58fce98114` (**3/4**, `.tmp/optional-map-size-control.log` in the control checkout).
LOC/function gates pass without allowance changes. Full scanner and remaining
gates are pending; do not claim its Set_forEach host leak removed until measured.

Full scanner run is session `20318`, `.tmp/source-scanner-optional-foreach.log`
and `.tmp/source-scanner-optional-foreach.wasm`. The seven-file collection batch
passes **85/87** (`.tmp/optional-collection-foreach-regressions.log`); the two
unexecuted rows require the absent Test262 file
`built-ins/Set/prototype/forEach/callback-not-callable-symbol.js`, rather than
failing compiler behavior. The direct Symbol-callback checks in that same test
file passed. A baseline check of the fixture availability is session `96845`.
The first lint run rejected a comma expression in the receiver-loading code;
it was rewritten to a separate load followed by the same saved type (no
semantic change). Lint now passes. Type-check session `68653` is still running;
the other three gates passed, and refreshed size gates are session `72754`.

The nested optional Map.get/Set case now passes **2/2** with the same native
dispatch change and was promoted to
`tests/issue-1058-optional-nested-foreach.test.ts`. Together the permanent
optional-iteration tests pass **8/8** (`.tmp/optional-collection-foreach-final2.log`),
all zero-import runtime assertions. Final type-check passed (session `86682`,
`.tmp/optional-collection-foreach-typecheck2.log`); refreshed source gates passed
(sessions `72754`/`6380`, `loc2`/`func2`/`gates2` logs). No allowance growth.
Baseline Symbol-callback tests are also **2/4**, with the same two missing
Test262 fixture errors (`.tmp/optional-foreach-5091-control.log`). Fresh
compilerCore/factory source controls run in session `72747`,
`.tmp/source-<suite>-optional-foreach.log`; scanner `20318` remains running.
The fresh controls completed: compilerCore **11/11**, **1,573,325 bytes /
3,322 ms**; factory **3/3**, **14,199,590 bytes / 109,328 ms**. Both native and
standalone counts match and both standalone modules have zero imports. This
is **14/14**, not proof of the pending scanner or full upstream unit suite.

Signed checkpoint `f8f456b626`. Scanner `20318` completed with native
**984/984**, **54,837,450 bytes / 326,007 ms**, still invalid. It passes
`invokeCallbacks` and advances to function 10866 `__closure_4199`: fallthrough
expects externref but receives `ref null 113`, offset **37,975,863**.
No standalone scanner callbacks execute, and total imports remain unverified.
Next diagnostic: `.tmp/scanner-closure-4199-validation.log`, using the preserved
`.tmp/source-scanner-optional-foreach.wasm` candidate binary.

The failing expression is `realpathsWithSymlinks?.size` in exportInfoMap.ts
line 512, where the receiver is TypeScript's `MultiMap` interface extending
`Map<K, V[]>`. It already lowers to the native Map carrier. Optional size
recognition only admits directly named ambient Map/Set symbols, rejects the
refining interface, and leaves the receiver on an externref-result branch.
Reuse the existing shared Map-inheritance proof (`hostMapCarrierClassName`)
instead of inventing a second heritage traversal. Raw binary inspection also
confirms the prior Set_forEach import is gone: ten imports remain, beginning
with Set_add. This is not a zero-import scanner result.

The source-shaped inherited Map/ReadonlyMap size tests fail validation **0/4**
before the change (`.tmp/optional-inherited-map-size-before.log`) and pass
**4/4** after reusing the inheritance proof, in both IR modes with zero imports.
They distinguish a missing receiver, an empty Map, and a populated Map through
two levels of interface inheritance. The adjacent five-file batch passes
**22/23** (`.tmp/optional-inherited-map-size-after.log`); the sole GC optional
Map.size mismatch is the previously reproduced clean-58fce98114 baseline failure.
User-defined Map and Set size getters still pass their negative-admission tests.
Type-checking, formatting/lint, and all five source gates passed without
allowance growth (`.tmp/optional-inherited-map-size-{typecheck,style,gates}.log`).
The frozen scanner rerun completed (session `35023`, exit 1): native
**984/984**, **54,837,485 bytes / 305,574 ms**, and the full module now
**validates**. Report `.tmp/source-scanner-inherited-size.log`, preserved
binary `.tmp/source-scanner-inherited-size.wasm`. The standalone import gate
correctly rejects ten remaining imports: Set_add, __get_filename,
__get_process_cwd, __get_process_platform, __get_dirname, __get_process_argv,
__get_process_stdout, __process_exit, __js_array_new, and __js_array_push.
**Zero standalone scanner callbacks executed**; validation is not unit-test
success or standalone completion. Next work must remove these dependencies
through their native owners, not bypass the import gate.

Independent next-target probe: optional `Set.add` produces a wrong answer
in both IR modes (**0/2**, `.tmp/optional-collection-mutation-before.log`);
the original TypeScript sources contain five `?.add(...)` sites, and Set_add
is still a raw scanner import. The ignored reduced source is
`.tmp/optional-collection-mutation.test.ts`. Native optional mutation dispatch
and chainable receiver identity need repair after the frozen scanner run;
no production mutation fix has been attempted yet.

Inherited-size checkpoint saved and SSH-signature verified: `8cbaead03d`.
Continuation adds `Set.add` to the existing shared optional native collection
owner, invoking `__set_add` and converting its returned receiver to the
optional-chain result carrier. It reuses the native Set kernel; there is no
second mutation algorithm or IR-mode-specific implementation.
The final four regressions check actual membership/size, present receiver
identity, undefined short-circuit result, single receiver evaluation, and
skipped argument evaluation. Disabling only the new admission yields **0/4**
(`.tmp/optional-set-add-disabled.log`, all return -1 at present identity);
enabling it passes **4/4**, and the six-file adjacent batch passes **29/29**
(`.tmp/optional-set-add-final.log`).

The initial probe combined those semantics with a distinct representation
problem: comparing the short-circuit result directly to a typed optional
receiver containing undefined returns false. The diagnostic test returns -2
at that comparison (`.tmp/optional-set-add-diagnostic.log`); the preserved
`.tmp/optional-collection-mutation.test.ts` still records it. The focused
mutation tests compare the missing result to the literal `undefined` and
the present result to the receiver. This does **not** fix or establish baseline
attribution for the typed-undefined equality defect.

Frozen Set.add scanner run: session `78300`,
`.tmp/source-scanner-set-add.log`, preserved binary
`.tmp/source-scanner-set-add.wasm`. Completed at signed checkpoint
`3e95bf6008`: native **984/984**, **54,837,517 bytes / 529,082 ms**, valid
WebAssembly. Set_add is removed; **nine** host imports remain (the prior
list minus Set_add), and the import gate still prevents all standalone
scanner callbacks from executing. Fresh compilerCore/factory controls run in
session `57773`, `.tmp/source-<suite>-set-add.log`. The controls completed:
compilerCore **11/11**, **1,573,325 bytes / 3,375 ms**; factory **3/3**,
**14,199,590 bytes / 110,216 ms**. Both match native counts with zero imports.
Type-check session `31698` passed; all five source gates completed successfully without allowance
growth (`.tmp/optional-set-add-gates.log`), including preservation-only (not
strict closure certification) for the legacy reachability gate.

Next-target reduction: TypeScript core.ts `isNodeLikeSystem()` checks
`typeof process`/`require`; sys.ts calls `getNodeSystem()` behind that guard.
The ignored `.tmp/node-environment-dead-branch.test.ts` reproduces a retained
`__get_process_cwd` import in **0/2** zero-import checks across both IR modes
(`.tmp/node-environment-dead-branch-focused.log`). No environment/DCE fix yet.
The diagnostic runtime variant supplies a throwing process.cwd import; both
IR modes return 1 without calling it, then still fail only the zero-import
assertion (`.tmp/node-environment-dead-branch-runtime.log`). That proves the
small reproduction's dependency is unused at runtime, not that the complete
scanner can run with a stub or that all nine other imports share this cause.
The first diagnostic invocation accidentally concatenated the base Vitest
include list and selected the full repository suite (session `65915`,
`.tmp/node-environment-dead-branch.log`); this run remains live and is not
attributable as a focused regression result. Asked permission to stop only
that accidental run, not the intended source runs. The ignored config is
corrected to replace the include list, and the focused rerun explicitly
filters to its one file.

Continuation: direct Binaryen call-graph extraction from the frozen Set.add
binary completed (`.tmp/scanner-import-callgraph.dot`). Both host-array imports
are called by `checkForUsedDeclarations` and `__closure_4712`. These are the
narrowed `.includes` calls in extractSymbol.ts and fixUnusedIdentifier.ts;
the `includes` arm alone routes an externref receiver through the host array
argument builder even on standalone. A candidate using native ObjVec argument
builders removed the imports but returned false for present members (**0/2**,
`.tmp/extern-array-includes-after.log`); it was withdrawn, and
`array-method-host.ts` is unchanged from the signed checkpoint.

The working candidate routes only host-free externref `includes` through the
existing `compileArrayLikePrototypeSearch` core. That core now receives method
arguments separately from the receiver, so borrowed `.call` and direct method
calls share the same search loop and SameValueZero implementation. Native
includes permits explicit null/undefined search values (unlike the historical
host HasProperty-based nullish bailout). Host dispatch and typed-vec includes
are unchanged. Source-shaped identity tests fail the import gate **0/2** before
the fix and execute **2/2** after it. The expanded tests also cover NaN, null,
undefined, offsets, empty arrays, and one-time receiver/argument evaluation in
both IR modes. Five files pass **53/53** (`.tmp/extern-array-includes-regressions.log`).
The final test-only simplification removes an unrelated instanceof guard from
the empty-array check; the final new tests and borrowed-call controls pass
**80/81, one existing skipped test** in session `32671`,
`.tmp/extern-array-includes-borrowed.log`. The skip is the existing array-like
filter thisArg case in issue-2036.test.ts, not an includes exclusion.

Frozen production scanner run: session `5493`,
`.tmp/source-scanner-includes.log`, preserved binary
`.tmp/source-scanner-includes.wasm`. Type-check `87086` found the search
helper's historical return annotation incorrectly included VOID_RESULT;
inspection confirms it returns only a ValType or undefined. Narrowed that
type-only annotation while the source runs were live; emitted implementation
is unchanged. Type-check rerun `.tmp/extern-array-includes-typecheck2.log`
(session `83277`) and five-gate rerun `.tmp/extern-array-includes-gates2.log`
(session `22702`) passed;
five-gate batch `80644` passed without allowance growth
(`.tmp/extern-array-includes-{typecheck,gates}.log`, reachability preservation
only). Fresh compilerCore/factory controls completed in session `38613`,
`.tmp/source-<suite>-includes.log`: compilerCore **11/11**, **1,573,325 bytes /
10,025 ms**; factory **3/3**, **14,199,590 bytes / 268,164 ms**. Both native and
standalone counts agree, and both modules have zero imports. This is 14/14
source callbacks, not evidence of scanner execution. Keep production unchanged while measuring
this candidate. The accidental full-suite run `65915` is concurrent, so these
wall-clock timings are not controlled performance comparisons.

Signed and SSH-signature-verified checkpoint `eff7752105`. The full scanner
completed: native **984/984**, **54,837,434 bytes / 702,777 ms**, still valid.
Both host-array imports are removed. **Seven imports remain**:
__get_filename, __get_process_cwd, __get_process_platform, __get_dirname,
__get_process_argv, __get_process_stdout, and __process_exit. The zero-import
gate still correctly prevents execution: **0 standalone scanner callbacks**.
All intended candidate tests and source runs above are terminal; the accidental
full-suite run is separate and must not be mistaken for this checkpoint's proof.

Next diagnostic is live in session `33552`: the production
`optimizeBinaryAsync` at its default optimization level (3), applied to the
frozen `.tmp/source-scanner-includes.wasm`, reporting to
`.tmp/scanner-optimized-imports.log` and saving successful optimizer output as
`.tmp/source-scanner-includes-optimized.wasm`. Script:
`.tmp/optimize-scanner-imports.mts`. This only measures whether the existing
optimizer removes the Node dependencies. It supplies no host imports and
executes no callbacks; it is not a passing suite, nor a substitute for the
normal compile pipeline's runtime-rec-group fingerprint guard. Session `65915`
was re-polled and remains live; no permission to stop that accidental full
suite has arrived. Do not restart either live process.

The next goal turn re-polled optimizer `33552` and confirmed it is still live.
A frozen six-file source recheck is running in session `70275`:
diagnosticCollection, base64, comments, parsePseudoBigInt, paths, asserts;
reports `.tmp/source-<suite>-includes-full.log`. This will supply the remaining
30 callbacks needed to remeasure the established eight-file/44-callback slice
on this checkpoint. Do not count the 30, or the combined 44, before the actual
per-file reports show successful execution and zero imports.

Main-sync continuation: fetched `loopdive/js2` main at
`688eb4de4184a6f8db74ff1ed73ab9612289e99c`, newer than the previously integrated
`2a58b9fe9f95dc17bd5d2ba44ecd564b9695356b`. Preserve this checkpoint before
merging. Optimizer session `33552` is terminal: its 600-second limit was reached
(`optimized: false`, 600,489 ms); the fallback is the original 54,837,434-byte
binary with all seven Node imports. No optimized scanner or callback result
was produced. In the six-file recheck, diagnosticCollection **5/5**, base64
**1/1**, and comments **3/3** have completed with zero imports; parsePseudoBigInt
is running, paths and asserts have not yet started. No test process was stopped.
The merge began before this sequential recheck ended, so its later files must
not be combined with pre-merge results as a single-checkpoint 44/44 claim.

Main integration at `688eb4de4184a6f8db74ff1ed73ab9612289e99c` resolved two
conflicts: keep main's equivalent terminal-call operand attribution in
`call-arg-producers.ts`; retain both the projection identity imports and main's
length-hole-fill import in `vec-overlay.ts`. No allowance increase. Typecheck,
format/lint on both resolved files, LOC/function/coercion/oracle gates pass;
reachability passes preservation-only (strict modeled closure remains open).
Six focused files: **35/37** (`.tmp/main-688eb-integration.log`). The two failures
are the standalone user-defined class/interface named Map controls in sibling
projection tests: invalid Wasm and a module-initializer stack underflow,
respectively. Both reproduce on exact pre-merge `2f3a7f6829` in isolated
`/private/tmp/ts2wasm-ts5-pre688-control` with the same harness and exception
flag (**9/11**, `.tmp/pre688-projection-control.log`); neither is a new merge
regression. Do not claim the entire regression set passes.

Continuation diagnostic: the real module resolver plus multi-source analyzer
reports 253 scanner sources and **zero runtime-eval boundary sites**, agreeing
with the earlier raw TypeScript program probe (`.tmp/resolved-runtime-eval-plan2.log`).
This rules out the suspected type-only Function boundary false positive as the
cause in that measured graph; no production boundary-plan change was made.
The reduced type-only Function false positive is still a separate finding,
not evidence that changing it would remove these seven Node imports.

Merge finalized as signed `a95249cd80`; fetched main ancestry and embedded SSH
signature verified. Six-file source loop `70275` is terminal: all six files
passed their **30/30** callbacks with zero imports. It spans the merge, so this
is not one-checkpoint evidence: diagnosticCollection/base64/comments and the
already-loaded parsePseudoBigInt run are pre-merge; paths/asserts finished
after source integration. Prior compilerCore/factory results are not a fresh
post-merge eight-file claim. Full scanner post-merge recheck is now live in
session `73290`, log `.tmp/source-scanner-main688-run.log`, capturing its binary
at `.tmp/source-scanner-main688.wasm` via
`.tmp/preserve-scanner-main688-binary.mjs`. No result yet; do not restart it.
An initial launch exited before running because Node disallows the exception
flag in NODE_OPTIONS; the live launch supplies that flag on the CLI and only
the binary-preservation preload through NODE_OPTIONS. The accidental older
full-suite process remains separate; it has not been stopped.

Post-merge scanner recheck `73290` completed: native **984/984**, valid Wasm
**54,841,590 bytes / 319,499 ms**, unchanged seven Node imports, **0 standalone
callbacks**. A targeted Binaryen diagnostic on the frozen pre-merge includes
artifact completed (`65409`): `--precompute-propagate --optimize-instructions
--dae-optimizing --remove-unused-module-elements`, all features except custom
descriptors, names retained. Output `.tmp/source-scanner-targeted-opt.wasm`
validates at **33,900,766 bytes with zero imports**. This is diagnostic
post-processing, not yet a supported compiler/harness optimization route.
The canonical runtime-type fingerprint guard applies only to explicit linked
runtime boundaries (`canonicalRuntimeTypes`); the ordinary unlinked standalone
runner does not request that boundary. Do not disable the guard for linked code.

Executing that import-free artifact with `{}` and the existing sequential
callback protocol fails in `__module_init_chunk_9`, before registering/executing
callbacks: null dereference at function 8016 / offset `0x19d4c6a`. Diagnostic
WAT isolates an unconditional `ref.as_non_null` on the still-undefined local
returned by the sys initializer, after its guarded Node setup. Upstream
`src/compiler/sys.ts` says `return sys!;` from an IIFE: the assertion is erased
by TypeScript, so it must not itself throw. Regression reduction being tested
in `tests/issue-1058-iife-asserted-undefined.test.ts`; no production fix yet.
Logs `.tmp/optimized-scanner-callbacks.log`, `.tmp/scanner-opt-init9-wat.log`.
The minimal committed-scope regression file currently remains uncommitted and
red **0/2** on IR enabled/disabled (`.tmp/iife-asserted-undefined-before.log`):
`const system: System = (() => { let candidate: System | undefined;
return candidate!; })()` traps at module init. A trial making every inline
reference return slot nullable removed the trap but changed the failure to
`system === undefined` returning false (**0/2**, adjacent controls **47/47**,
`.tmp/iife-nullable-after.log`). That candidate was withdrawn completely:
`call-tail-dispatch.ts` has no working diff. Do not ship only the trap removal
or weaken the assertion. The return carrier AND the null-vs-undefined identity
must agree across the IIFE and its consuming variable. Relevant owners are
`compileTailDispatch`'s inline return slot/`fctx.returnType`,
`undefined-holding-variable.ts`, and IR `tryLowerUndefinedCompare`; put any
new semantic fact in shared IR/oracle analysis instead of duplicating scans.
Production level-1 optimizer diagnostic on the post-merge artifact is live in
`26342`, `.tmp/scanner-main688-o1.log`; do not restart it. The reduced Node guard
with ambient process but undeclared require still retains cwd under optimize
true (**0/2**, `.tmp/node-require-terminal-guard2.log`).

Inventory correction: the first resolver probe used default barrels. Repeating
with the actual consumer-driven-barrel option yields **179** source files and
still **zero runtime-eval boundary sites** and no implicit process/require
bindings (`.tmp/resolved-runtime-eval-consumer-plan.log`). Keep the earlier
253-file observation attributed to its default resolver setting.

Asserted-IIFE continuation candidate: new shared IR analysis
`src/ir/analysis/asserted-iife-result.ts` detects own synchronous IIFE returns
whose erased non-null assertion can carry undefined (excluding null/unknown
ambiguity, nested function returns, async functions, and generators). The inline
return slot is nullable only for this fact; the consuming variable's strict
nullish comparison consults the same fact. No duplicate AST scan in codegen.
Original reduction **0/2 → 2/2**; expanded execution cases **4/4** preserve absent
undefined versus null and present object identity. Six analysis controls also
pass. Adjacent IIFE controls **47/47**; combined regression/protocol/source-suite
contracts **26/26** (`.tmp/iife-asserted-fact-controls.log`,
`.tmp/iife-asserted-and-worker.log`). This does not establish arbitrary
assertion/boxing behavior; it addresses the measured native-reference return
slot and strict-comparison boundary.

The production level-1 diagnostic `26342` completed on pre-fix merged main:
**30,009,564 bytes, 468,744 ms, zero imports**, valid
(`.tmp/scanner-main688-o1.log`). The ordinary upstream worker now accepts
`DOGFOOD_OPTIMIZE=0..4` (default 0), passes it to both compiler entry routes,
and records requested optimization in provenance. Invalid values are rejected.
This uses the normal optimizer and runtime-rec-group guard, not the diagnostic
custom passes. Full source scanner with this candidate and production O1 is
live in session `85299`, `.tmp/source-scanner-iife-o1.log`, with the existing
zero-import gate and 984-callback denominator unchanged. Source compilerCore
recheck is **11/11**, zero imports, 1,573,166 bytes / 3,498 ms; factory continues
in session `61365` (`.tmp/source-<suite>-iife.log`). Do not restart live jobs.
An initial typecheck found only a helper expression-variable annotation error;
the type-only correction is in, recheck `35282` pending. Four size/coercion/oracle
gates passed; reachability reported source mutation during its child run
because of that annotation edit, so its result must be rerun on frozen source.

Final focused verification: **74/74 across six files**, final typecheck exit 0,
format/lint and all five selected gates exit 0; reachability is preservation-only
PASS, not strict closure certification. No allowance changes. A final safety
guard excludes consuming variable annotations that admit null; its explicit
analysis control passes. This guard was added after scanner `85299` and the
source controls had loaded the earlier candidate, so those live/source results
must not be presented as an exact final-checkpoint verification. CompilerCore
and factory completed **14/14** with zero imports; compilerCore additionally
passed **11/11** through the production O1 worker route, 1,096,104 bytes /
7,539 ms, `requestedOptimization: "1"`. Source logs retain their exact options.
Keep scanner `85299` running to learn its next execution frontier, then rerun
on the final source before claiming scanner acceptance.

Checkpoint signed as `e169d3aa68`, embedded SSH signature verified, working tree
clean immediately after commit. Scanner `85299` was re-polled and remains live.
The accidental full-suite session `65915` is now terminal (exit 1), without
intervention. Its mixed-source aggregate is not candidate or baseline evidence;
do not use it to attribute regressions. No tests were stopped or restarted.

Scanner `85299` is in the production O1 subprocess (verified active PID 79900,
parent 72124). Its raw optimizer input was preserved as
`.tmp/source-scanner-iife-pre-guard.wasm`, SHA-256
`2ad90a8190faa4538548bab7f603585b01cef295379cce2f561911c47709eaf4`, matched
against the live compiler temporary input. Initialization-only attribution
of that raw seven-import binary supplied throwing diagnostic implementations
for exactly those seven Node imports; this is NOT the standalone harness and
executes **zero callbacks**. It now reaches a guest
`TypeError: Cannot access property on null or undefined`, rather than the
prior `ref.as_non_null` trap. Message decoded with the module's existing
`__exn_render_prepare`/`__exn_render_char` exports. Logs:
`.tmp/scanner-iife-initializer-rendered.log`; script
`.tmp/inspect-scanner-initializer-only.mts`. This is the next diagnostic lead,
not an import-free pass or attribution of the property access to a source line.

Scanner `85299` has now completed (exit 1): native **984/984**, production O1
compile succeeds and validates, **29,754,836 bytes / 777,366 ms**, requested and
actual target `standalone`, **zero imports**. Initialization throws a guest
exception before callback registration/execution (**0/984**). This is the
pre-final-consuming-slot-guard candidate described above, not exact checkpoint
acceptance. The import gate was neither bypassed nor relaxed.

Next-failure attribution uses only the preserved raw binary, not an acceptance
artifact: `.tmp/trace-scanner-init.mjs` appends a diagnostic marker global and
instruments initializer entries; all original function bodies remain present.
The instrumented binary validates. Startup reaches function **14197**, named
`__module_init_chunk_42`; the Diagnostics object (global 167), MultiMap (520),
and first registration's error-code array (524) are non-null. Instrumenting
`registerCodeFix` entry and normal exit then leaves marker **2640**, establishing
the guest TypeError occurs inside that call rather than its caller's subsequent
diagnostic reads. No Node capability was reached; **zero callbacks executed**.
WAT: `.tmp/scanner-init-14197-wat.log` and
`.tmp/scanner-register-codefix-wat.log`. Upstream
`src/services/codeFixProvider.ts:51` calls the custom `add` method attached by
`src/compiler/core.ts:1542` (`createMultiMap`). Whether that method or another
registration access is responsible remains unproven. A focused two-lane
MultiMap-registration reduction completed **0/2** (IR on/off): valid zero-import
modules throw a guest exception during initialization. Log
`.tmp/multimap-init.log`, explicit test-only config
`.tmp/multimap-vitest.config.mts`. A follow-up first verified native execution
returns 42 for both cases; its attempted guest-message renderer was unavailable
in this smaller binary (`__exn_render_prepare` absent), so the full scanner's
rendered TypeError must not be attributed to the reduction yet. Follow-up log
`.tmp/multimap-init-rendered.log`, terminal session `71925`. The reduced shape is:

```typescript
interface MultiMap<K, V> extends Map<K, V[]> { add(key: K, value: V): V[]; }
function createMultiMap<K, V>(): MultiMap<K, V> {
  const map = new Map<K, V[]>() as MultiMap<K, V>;
  map.add = multiMapAdd;
  return map;
}
function multiMapAdd<K, V>(this: MultiMap<K, V>, key: K, value: V) {
  let values = this.get(key);
  if (values !== undefined) values.push(value);
  else this.set(key, values = [value]);
  return values;
}
interface Registration { errorCodes: number[]; }
const registrations = createMultiMap<string, Registration>();
function register(reg: Registration) {
  for (const error of reg.errorCodes) registrations.add(String(error), reg);
}
register({ errorCodes: [42] });
export function run(): number { return registrations.get("42")![0].errorCodes[0]; }
```

Next: distinguish attached-method preservation from callable receiver binding
and body execution, using native positive controls before changing production
code. Prefer the shared IR/native collection owner. No production changes were
made for this new frontier; no standalone scanner callback has passed yet.

Continuation: the eight-case MultiMap reduction completed **2/8** on the signed
checkpoint (IR on/off each: presence, constant method body, receiver get/set,
original registration). The presence check uses statically typed `typeof` and
is not storage proof. The other six cases throw. Independent dynamic-key reads
and function-identity comparisons subsequently establish that native collections
drop own properties: baseline **4/12** in `.tmp/collection-own-baseline.log`,
with scalar/identity, function identity, own keys/descriptors, and defineProperty
all failing in both lanes. The baseline delete checks pass vacuously because the
write was dropped; strengthen them with a pre-delete presence assertion before
using them as delete acceptance evidence. Native controls return the expected
value before every compiled run.

A **withdrawn** six-line candidate admitted `ctx.mapTypeIdx` to
`instanceCarrierTypeIdxs` in `src/codegen/instance-props.ts`, reusing the existing
identity bag instead of inventing collection-specific storage. Readers were
enumerated: own get/set/method call, carrier-bag visibility/define, integrity,
and Reflect target classification; deletion has a separate narrower inventory.
The candidate gave **8/12** (`.tmp/collection-own-candidate.log`): own properties
were retained, but deletion failed and assignment to the inherited getter-only
`size` accessor created an own property (the latter is a genuine newly introduced
regression relative to the passing baseline). **The candidate is removed.**
Do not restore it without descriptor refusal and deletion parity.

The candidate's MultiMap matrix still scored **2/8**, but failures moved from
guest exceptions to null dereferences (`.tmp/multimap-carrier-candidate.log`).
WAT proves another boundary: `__fn_tramp_multiMapAdd_cached` reads its explicit
`this` from `__current_this`, whereas `calls-closures.ts` only installs a receiver
when `planObjectLiteralMethodReceiverBind` admits the property declaration.
An interface `MethodSignature` such as `MultiMap.add` is currently refused.
The constant-returning method additionally crosses a generic ObjVec to typed
Vec return boundary; its exact failure mechanism still needs attribution.
No count improvement is claimed for these changed signatures.

Current production source remains exactly signed checkpoint `e169d3aa68`.
Diagnostic matrix source is retained in `.tmp/multimap-init.test.ts` and
`.tmp/collection-own-diagnostic.test.ts` (not default-suite failing tests).
Next implementation must preserve ordinary collection own-property semantics
end-to-end (especially the inherited `size` accessor and delete), then address
method receiver installation and the measured return boundary through shared
owners. No full scanner job is live; its authoritative last result remains
zero imports, startup failure, **0/984 standalone callbacks**.

Further descriptor attribution: briefly re-enabled the same collection-carrier
candidate for diagnostic tests only, then removed it again. Calling
`Object.getOwnPropertyDescriptor(Map.prototype, "size")` directly did **not**
repair the failing write. Nor did adding an unrelated non-writable descriptor
definition to activate the shared inherited-Set resolver. Both variants remain
**0/2** for the size case (IR on/off). Distinguishing return values shows native
size still reads 1, but `Object.hasOwn(map, "size")` becomes true: a hidden own
property is incorrectly deposited, not a change to the entry count.

WAT `.tmp/collection-size-armed.wat` showed `__instance_prop_set` correctly calls
`__extern_set_decide`, which reaches `__protoidx_set_r`; no Map companion seeder
was emitted. The direct descriptor expression uses the compiler's synthesized
descriptor path and does not materialize a runtime Map prototype. Passing
`Map.prototype` through an ordinary `opaque(value: any)` function before the
descriptor query **does** materialize it, and the same size assignment then
passes **2/2**, with both runtime lanes still using the candidate own-property
storage. Log `.tmp/collection-size-opaque.log`. This is a diagnostic lever, not
an acceptable source workaround: TypeScript must not need extra prototype
reflection for ordinary assignment semantics.

Implementation lead: collection own-property admission requires intrinsic
prototype descriptor availability as well as enabling the shared inherited-Set
decision. The existing authorities are `inherited-set-gate.ts` (early reservation),
`native-proto.ts:ensureNativeProtoCompanionSeeder` (demand/materialization),
`array-object-proto.ts:ensureMapNativeProtoGlue` / `ensureSetNativeProtoGlue`,
and `proto-index-store.ts:fillSetRBody` (nearest descriptor decision). Reuse these;
do not add an unconditional name-based `size` write refusal, which would be wrong
after prototype descriptor replacement/deletion or an own writable definition.
The full `__reflect_set_receiver` helper cannot simply be called from the
instance write helper: its successful ordinary-receiver tail calls
`__extern_set` again, creating recursion at that insertion point.

Deletion's exact native-generator identity inventory in
`carrier-bag-delete.ts:fillCarrierBagDelete` provides the neighboring pattern for
collections, but must stay separate from the callable closure classifier. Keep
the original no-reflection size control, strengthen delete with a pre-delete
read, and test prototype/own-descriptor overrides before accepting any candidate.
All diagnostic jobs from this continuation are terminal; production source is
still unchanged from `e169d3aa68`.

New candidate (not yet accepted): native collection allocation now materializes
the existing lazy Map/Set prototype companion, paired with early reservation
of the inherited `size` descriptor decision. Native collections join the
existing identity-bag carrier and its exact-type deletion lookup. This reuses
`buildLazyNativeProtoGetInstrs`, the existing collection prototype glue and
shared ordinary-property store; no duplicate collection property table or
name-only size refusal. The pre-scan over-approximates Map/Set identifier use
(a shadowed spelling reserves helpers but does not claim runtime values).
The unmodified no-reflection diagnostic controls pass **12/12**, including
strengthened deletion with a pre-delete value assertion:
`.tmp/collection-own-intrinsic-candidate.log`.

Permanent candidate tests are in
`tests/issue-1058-native-collection-own-properties.test.ts`; they now add own
writable size, writable prototype replacement, prototype deletion followed by
another constructor, and Set/WeakMap property identity. Native prototype edits
in the JS oracle are restored in `finally`. Expanded candidate and adjacent
instance/optional Map tests run as `83536`, `.tmp/collection-own-expanded.log`.
No scanner callback improvement is claimed until the real source run executes.

The expanded controls initially exposed six size-override failures: the native
dynamic read shortcut answered intrinsic size before consulting ordinary own
properties/prototype changes. `map-runtime.ts` now excludes seeded Map/Set
brands from that shortcut, using the same seeded-descriptor evidence pattern
as its existing iterator shortcut. Own writable size, writable prototype
replacement, and deletion followed by another constructor now pass. The
prototype-initialization instruction builder is shared by direct construction
and **`ir-native-map.ts`**, so this is not a direct-codegen-only repair.

Verification before the final standalone-only admission guard:
- **36/36** focused own-property, adjacent instance-expando and optional Map-size
  tests; `.tmp/collection-own-final36.log`.
- **47/48** broader IR/native collection/iterator tests;
  `.tmp/collection-own-ir-broad.log`. The one imported user-class `Map` failure
  (`__sget_value`, expected f64/got ref) independently reproduces with the same
  filtered harness at pre-merge `2f3a7f68291c` in the separate control worktree:
  `.tmp/collection-own-pre688-map-control.log`. It predates this work; not fixed.
- Original TypeScript compilerCore **11/11**, zero imports, 1,573,470 bytes,
  3,357 ms; `.tmp/source-compilerCore-collection-own.log`.
- Typecheck and lint clean. Five selected gates exit 0 after extracting the
  size shortcut guard to satisfy the function budget; no allowance growth.
  Reachability remains **preservation-only PASS**, strict closure FAIL/OPEN,
  never a deletion certificate (`.tmp/collection-own-*-2.log` naming is not
  literal: actual gate logs end in `loc2`, `func2`, `coercion2`, `oracle2`,
  `reachability2`).
- MultiMap reduction remains **2/8**, six null-pointer failures after property
  retention; `.tmp/multimap-after-own-properties.log`. Receiver binding and
  generic callable array-return adaptation are still open. The presence-only
  passes are not evidence of working registration.

Final guard restricts collection identity-bag admission and early descriptor
reservation to standalone, matching the existing prototype seeder's supported
lane; WASI must not gain writes without matching descriptor initialization.
Reverification completed as session `30740`, exit 0: **36/36**, typecheck, all five
gates, `.tmp/collection-own-*-scoped.log`. No allowances changed. Reachability
remains preservation-only, not strict closure. No tests have been stopped. Full
scanner acceptance is still unmeasured on this candidate; last measured
standalone callback count remains **0/984**.

Receiver continuation after signed property checkpoint `ab37a4c1e2` (clean tree,
embedded SSH signature verified): the shared callable-property receiver planner
now admits erased interface `MethodSignature` declarations. The call already
evaluates/captures the receiver once; this admission reuses its existing
save/install/restore sequence after argument evaluation rather than creating a
second dispatch algorithm. The named-function trampoline was already reading
`__current_this`; the caller had not installed it for interface declarations.

The first eight-case probe measured **2/8 → 6/8** with the receiver admission.
Its two unresolved cases used a scalar-returning inherited `Cache.put` method
and retain `env::Cache_put` (both a concrete and generic Cache declaration), a
separate dispatch/import defect. Preserve that finding; do not claim every
interface-on-Map method works. Permanent regression now uses TypeScript's
actual MultiMap-shaped registration path, whose array return is ignored, plus
ordinary declaration-valued interface methods, receiver/argument evaluation
order, caller-this argument reads/normal restoration, and a captured lexical
arrow. These **10/10** pass on IR on/off; with existing object-literal receiver
and collection own-property tests the candidate scores **48/48** across three
files (`.tmp/interface-method-receiver-final-candidate.log`).

The original MultiMap diagnostic is now **4/8**:
`.tmp/multimap-receiver-candidate.log`. The two actual registration cases pass
(previously failed); two typed `typeof` presence checks also pass but remain
weak evidence. Four cases that consume the generic returned array still trap;
do not confuse ignored-return startup success with correct callable array-return
adaptation. Existing receiver helper documentation retains its exceptional-
unwind restore limitation; this continuation has not repaired that global issue.

Full source scanner O1 is live as **session `49543`**, log
`.tmp/source-scanner-method-receiver-o1.log`, launched after final formatting.
The normal compiler target/import guards and **984 callback denominator** are
unchanged. Do not restart or stop this run. No production changes after launch
are planned while it establishes the next execution frontier.

Final receiver-candidate verification (`13898`) completed exit 0: **48/48**,
typecheck, all five selected gates; lint/format clean, no allowance growth.
Reachability again means preservation-only PASS, strict closure FAIL/OPEN.
The eight previously accepted original source suites are also rechecking on
the frozen candidate as **session `16922`** (compilerCore, factory,
diagnosticCollection, base64, comments, parsePseudoBigInt, paths, asserts), logs
`.tmp/source-<suite>-method-receiver.log`. This loop stops on first failure;
do not infer all 44 callbacks have passed until every report is present.

Next generic-array-return lead, without changing the running compiler:
`expressions/calls-closures.ts:emitRootFuncrefDispatch` asks
`callablePropertyRefBridge` for a return conversion. That bridge only handles
equal types and concrete-ref/externref crossings, not distinct vector carriers.
An unmatched reference return falls to `drop` plus `defaultValueInstrs`, losing
the real return value. Inspect the exact matched funcref arm in
`.tmp/multimap-constant.wat` before implementing; use the existing IR/native
vector projection authority and preserve identity rather than adding another
copy loop or asserting the two vector layouts are the same.

Continuation — 2026-09-27, main `4418cd8510877c0fd5a3aab8a543934167e95c8c`:

- Frozen signed receiver checkpoint `7423709086`: the eight source suites
  completed **44/44 callbacks**, all valid zero-import standalone modules.
  Session `16922` exited 0; individual source logs above contain the reports.
- Full original scanner run `49543` completed exit 1: native **984/984**;
  standalone compiled successfully to **29,815,452 bytes**, validated, and
  retained **zero imports** (production O1, 788,113 ms). Startup now completes
  and all **984 callbacks execute, 0/984 pass**. The first failures are Wasm
  `unreachable`; do not interpret the stale optimized source-index annotation
  as attribution without a matching optimized name/index map.
- The preserved raw module (SHA256
  `7c0f923bd1814aec927fae6aa4438b5574c4a4e4c8042ce5a5fa40981b6e9693`)
  independently initializes and registers 984. Diagnostic execution with
  exactly seven **throwing** Node-import implementations also scores 0/984;
  the first stack points to `fromString`, function 2151. This diagnostic is
  NOT standalone acceptance. `.tmp/scanner-fromString-wat.log` shows that
  function returning `ref.as_non_null(ref.null)`, not constructing its
  namespace-local `StringScriptSnapshot` class. Session `79893` exited 1.
- Reduced native-oracle namespace/class tests reproduce **0/4** (exported and
  unexported classes, IR on/off), `.tmp/namespace-snapshot-premerge.log`.
  Their JS controls return 5; compiled execution traps. Class collection and
  body emission currently recurse ordinary blocks/functions but omit runtime
  ModuleBlocks, while namespace function registration already traverses them.
  Next work must preserve exact declaration identity, namespace collisions,
  initialization order and shared IR class-body ownership, not add a second
  class compiler or weaken the standalone guard.
- Fetched the requested main and merged after both original source jobs
  finished. The sole conflict is adjacent imports in `call-identifier.ts`;
  retain both the branch's source-call/capture helpers and main's new String
  conversion helper. Integration checks run against the fetched main SHA;
  no allowance growth and no dependency reinstall.

The TypeScript standalone goal remains open. Scanner startup is repaired, but
its assertions are not passing; the generic callable array-return defect above
also remains open. No tests were stopped or restarted mid-run.

Namespace follow-up at signed merge `e8b1b85fa4`: the four-case reduction still
fails **0/4** after merging (`.tmp/namespace-snapshot-postmerge.log`). A temporary
candidate reused the existing class collection and body emission for each
`runtimeModuleDeclarationGroups` block, with `withRuntimeModuleBindings` around
body emission. This makes `fromString` actually call `StringScriptSnapshot_new`
with IR enabled, but the original reduction still scores **0/4**: the emitted
class struct has no `text` field and its `_init` body merely returns `self`.
`constructor(private text: string) {}` is a second, independent unsupported
shape, not evidence that namespace collection had no effect.

Expanded diagnostic matrix (explicit field plus `this.text = text` versus
parameter property, exported/unexported class, IR on/off) scores **2/8** with
the temporary candidate. Only IR-on explicit-field cases pass. The IR-off
namespace function still has an empty/default body, a separate namespace
function-registration issue. Logs: `.tmp/namespace-snapshot-fields-candidate.log`;
WAT: `.tmp/namespace-snapshot-<IR>-<exported>-<parameterProperty>.wat`.
**The candidate was removed**: production remains exactly signed `e8b1b85fa4`.
Do not land the two extra traversal loops alone; they do not address namespace
class collisions, initialization order, or parameter properties.

### Next implementation plan: constructor parameter properties through shared IR

1. Establish top-level class controls independently of namespace registration.
   Cover string/numeric properties, defaults, readonly/public/private/protected,
   ordinary non-property parameters, derived `super()` ordering, and field
   initializer/body observations. Native TypeScript 5.9.3 ES2022 output for
   `class C { x=this.p; constructor(public p=42){} }` declares `p`, evaluates
   `x`, then assigns `this.p=p` in the constructor; do not reorder that assignment
   ahead of ordinary class field initializers.
2. Extend the shared source plan in `src/ir/class-instance-initializers.ts`,
   currently PropertyDeclaration-only, to represent parameter-property writes
   with exact declaration identities. Both layout collection and constructor
   lowering must consume this plan; reuse `lowerConstructorFieldInitializers`
   and its existing class-field set operation, not a new constructor algorithm.
   Preserve plan ordering, defaults, base/derived timing, and exact field types.
3. Remove the explicit parameter-property refusal in `src/ir/select.ts` only
   when preparation/layout and lowering provide that complete contract. Require
   measured `irBodyEmitted` evidence, zero imports and value equality, not merely
   a fallback-backed pass. The backend class layout currently collects only
   constructor `this.x=` assignments and PropertyDeclarations; it must reserve
   the same parameter-property slots before ABI/layout freeze. Use oracle-owned
   declaration typing, no additional direct checker queries.
4. Then return to exact namespace class identity/initialization registration and
   re-run the unmodified upstream scanner. Retain the independent IR-off
   namespace function failure and generic array-return finding; do not claim
   the complete TypeScript goal from the prerequisite tests.

Parameter-property candidate — 2026-09-27:

- Implemented the shared source inventory and initializer plan in
  `src/ir/class-instance-initializers.ts`. Only the actual non-static,
  body-bearing constructor contributes public/private/protected/readonly
  parameter properties; overload signatures and ordinary parameters do not.
  The plan appends exact parameter identifier writes after ordinary field
  initializers. Both existing IR lowering and direct constructor emission
  consume the same source ordering. Dynamic-name IR refusal remains atomic.
- Class layout and IR field projection now consume the same instance-field
  declaration inventory. Registry-coupled field type resolution reuses their
  existing query sites; the native-annotation lookup uses the oracle. No new
  direct checker query site or separate field-storage algorithm was added.
- Numeric parameter-property slots start with the existing undefined sentinel,
  not zero: an ordinary field initializer that snapshots `this.value` must
  observe undefined before the parameter-property write. Defaults and derived
  `super()` timing remain in the existing constructor control flow.
- Initial six-shape, IR-on/off native-oracle matrix: **0/12** on exact signed
  `25ca284a57`, then **12/12** with the candidate. The baseline was measured by
  temporarily removing all four candidate production diffs, verifying a clean
  `src` diff, running the same test, then restoring those exact diffs. Logs:
  `.tmp/parameter-property-baseline.log` and
  `.tmp/parameter-property-shape-candidate.log`.
- Permanent `tests/issue-1058-constructor-parameter-properties.test.ts` adds
  **20 tests**: nine execution shapes in both lanes plus source-plan identity,
  overload/static exclusion, ordering and atomic-refusal checks. Seven IR-on
  shapes require actual `C_new` emission; default-argument and `any`-field
  shapes retain existing IR class-shape refusals and prove runtime fallback
  semantics only. Do not report those two as new IR coverage.
- After extracting the common field inventory (the first candidate exceeded
  `buildIrClassShapes` by one line), focused/adjacent tests pass **49/49**, log
  `.tmp/parameter-property-shared-source49.log`, session `10318` exit 0. This
  includes string-field class projection, inheritance, overload ownership and
  nested implicit constructors. No allowance increase.
- Final typecheck/five-gate chain `76592` completed exit 0, logs
  `.tmp/parameter-property-<gate>-final.log`; lint/format clean. Reachability is
  preservation-only PASS, strict modeled closure FAIL/OPEN, not a deletion
  certificate. No allowances increased. A further **111/111** adjacent field
  tests pass (`63858`, `.tmp/parameter-property-field-adjacent.log`), bringing
  the final candidate's focused/adjacent total to **160/160** across ten files.
- Factory original-source smoke run `90801` passes **3/3**, valid zero-import
  standalone Wasm, 14,287,142 bytes, 114,677 ms;
  `.tmp/source-factory-parameter-properties.log`. It started before the final
  common-inventory extraction, so this is not a final-tree source-suite claim.

Namespace collection is still unchanged from the signed merge. No scanner
callback gain is claimed from this prerequisite fix; its last full result
remains **0/984**, and namespace class identity/registration is the next step.

The environment diagnostic has two distinct outcomes: with explicit ambient
declarations in the input, `optimize: true` still retains process.cwd (**0/2**);
without those declarations, the optimized reduction passes **2/2**. The actual
scanner's function 230 `isNodeLikeSystem` reads the dynamic native realm global
for process and ends with a constant-false require test (isolated WAT in
`.tmp/scanner-node-environment-wat.log`). It is not sound to replace its global
reads with a blanket false. New-IR selection currently rejects the reduction's
environment and Node helper bodies (`.tmp/node-environment-outcomes.log`).

The user requested a main merge and continuation. The former temporary checkout
was cleaned out, but branch `codex/1058-typescript-standalone` retained the signed
handoff at `efd9aca79c5aba4bfd6670847be925a027ed219f`. Work now lives in
`/private/tmp/ts2wasm-ts5-1058-20260927`; the unrelated dirty Deno checkout is untouched.
Fetched `loopdive/js2` main at `dc7eb2c1e382acc9f586d22c7bb372a9932bf8eb`.
The merge initially conflicted in 25 files and completed in signed commit
`43e67c7f8f`, with formatting/lint and both size gates passing.
Ported object layout/signature/physical-field semantics into main's new IR core,
analysis and generic lowering owners; legacy entry modules remain compatibility
exports, rather than restoring their old monolithic implementations.
Preserve both the historical measurements below and main's newer parser/binder/
checker findings. None of those earlier results establishes post-merge correctness.
After verification, resume shared-oracle publication repair and real-source units.

Integration checks: source typecheck passed. The generator factory lookup now
resolves disambiguated state-machine names by exact source declaration ownership;
all 17 worklist, for-of suspension and generator receiver tests pass. The earlier
focused suite passed 28/29: captured binder GC with a constructor still traps.
A detached `efd9aca` control reproduces that cast failure (and two additional
failures fixed by this integration), so it is not a new merge regression.
Do not treat these targeted checks as the full TypeScript unit suite. Budget
checks use the fetched main SHA explicitly because the local origin base is stale.

Continuation: accessor parameter preparation now uses shared oracle declaration
and native annotation queries, removing its three direct checker accesses. Its
declaration/shadowing/native-carrier test rejects any direct checker use, and
the execution test continues to require an IR-emitted body. The bytecode IR
proof and accessor tests pass 25/25 after this change as well.
The oracle ratchet against fetched main still fails: getTypeAtLocation +1 and
ctxChecker +5, in generator, runtime enum and structural receiver source queries.
Remaining publication work includes those queries, boundary inventory, and
reconciliation with the remote PR head (observed
`dc16de194f` on 2026-09-27). No force push is authorized or required.

## Wrap-up handoff — 2026-09-09

**Publication blocked; implementation is committed locally, not pushed.**
Checkpoint `d45ba31dfc014cc66fb6a4731a73ea6fa6c819a0` and conflict-free signed
merge `351c2405451f26d4a7d1a47d890dc742fd86e2f0` are on local branch
`codex/1058-typescript-standalone` in `/private/tmp/ts2wasm-ts5-1058-resume`.
The PR description carries the handoff, but its remote head remains `49a37ae`.
The normal pre-push hook rejected net direct checker growth (+6):
`src/codegen/accessor-parameter-carrier.ts`,
`src/codegen/expressions/call-receiver-method.ts`, and
`src/codegen/runtime-enum-object.ts`. Route the new source queries through
`ctx.oracle`; do not bypass the hook or relax its baseline to publish.
Post-merge source typecheck and 19 focused tests across five files pass.
The local compiler-boundary inventory gate fails with 55 unclassified modules
and 110 unclassified-target references. Both publication and CI repairs remain
for the next lane; the user requested wrap-up rather than further implementation.

Publication check: the existing PR's head `49a37ae` contains a newer main merge.
Its CI quality job `102258710224` is red; the shepherd reports 31 unclassified
compiler modules plus target references in inventory artifact `10079198885`.
Reconcile new modules with their intended architecture layers and rerun the
inventory gate; do not weaken it. This wrap-up does not claim CI is green.
Final local source typecheck and numeric regression rerun pass after replacing
an unavailable TypeFlags aggregate with the existing conservative object check.

Work is paused at the user's request. PR: https://github.com/loopdive/js2/pull/5753.
The standalone TypeScript 5 goal remains incomplete; neither the complete upstream
unit suite nor self-hosting is proven. Prefer shared IR planning for follow-up work.

Latest complete full-source measurement (TypeScript 5.9.3,
`c63de15a992d37f0d6cec03ac7631872838602cb`): **20/28 callbacks pass across 6 of
256 upstream unit files**. Factory is 3/3, compilerCore 11/11, base64 1/1,
comments 3/3, diagnosticCollection 0/5, and parsePseudoBigInt 2/5. Every selected
file compiles to valid zero-import standalone Wasm; native controls pass 28/28.
The separate projection suite passes 25/25 across five files; these overlapping
results must not be added to the full-source denominator. The source-runner
verification tests pass 9/9 and enforce per-file callback floors.

This snapshot includes stack-safe physical instruction traversals; shared IR
closure, signature, enum, undefined and recursion planning; exact accessor
parameter carriers; demand-driven runtime enum objects; and dynamic tuple binding
destination planning. The latter takes the original factory source tests from
0/3 to 3/3. Detailed positive controls and removal-attribution evidence follow
below. Narrow backend adapters remain where the current compiler requires them;
this is not a claim that the entire compiler now routes through IR.

The newest fix rejects primitive receivers as structural evidence for an unrelated
user class. Its numeric `toString(radix)` regression passes 2/2 (GC and standalone),
with an actual class-method positive control in each. The full-source radix suite
has **not** been rerun with this fix; keep its recorded result at 2/5 until measured.

Next steps, in order:

1. Run `node --experimental-wasm-exnref --import tsx tests/dogfood/typescript-source-unit-suite.mjs parsePseudoBigInt`
   to validate the latest fix against the unchanged upstream callbacks.
2. Investigate diagnosticCollection parent propagation. All five diagnostic
   probes pass statement count, non-null node and VariableStatement kind, then
   fail `node.parent === file`. Native passes 5/5. Separate direct parent
   assignment, `setParent`, `setParentRecursive`, and parser parent setup using
   `tests/dogfood/fixtures/typescript-source-node-parent-workload.ts`.
3. Resolve the remaining IR acceptance failures before claiming full IR coverage:
   multi-module factory routing, source object position, nested result carriers,
   optional closure length, and imported-class Map field construction.
4. Expand the full-source unit denominator, then attempt the full standalone
   compiler/self-hosting milestone. Do not infer runtime correctness from successful
   compilation or zero imports alone.

Known red neighbors are retained, not silently skipped: seven typed-object
destructuring cases in #1553b and three explicit-undefined cases in #1553e are
unchanged with the dynamic binding fix removed. The broader run was 41/51; the
focused binding controls were 17/17. Enum formatting has three pre-existing
plain-object failures (9/12 total, all eight enum cases pass). Full test262 and
the full upstream unit suite have not been run. Local `.tmp` logs and generated
diagnostic copies are intentionally not committed; the commands, committed
regressions and evidence in this issue are the durable handoff.


## Main synchronization check — 2026-09-08

### Full-source upstream unit expansion

After the main sync, add a separate source-module runner for the unmodified
upstream `factory.ts` (three callbacks) and `diagnosticCollection.ts` (five).
These import the real compiler namespace with consumer-driven barrel resolution,
not the utility projection. The established 25-test gate is unchanged; these
new files are exploratory until native and zero-import Wasm results agree.
Command: `node --import tsx tests/dogfood/typescript-source-unit-suite.mjs factory`.
The runner retains every original assertion and has an explicit callback floor.

Native source reference is bundled with esbuild (including Node globals needed
by upstream `sys` initialization); the Wasm input remains the source graph.
Direct native execution passes **3/3 factory** and **5/5 diagnostic collection**
callbacks. The new verdict rejects partial callbacks, wrong target, failed
validation, and entry or linked-module imports. Harness controls pass **24/24**
(`.tmp/ts5-source-suite-controls.log`); the final verdict-only rerun passes 3/3.

Both initial full-source runs completed: factory compiles and validates at
**63,631,844 bytes / zero imports / 408,182 ms**, but **0/3 Wasm tests pass**;
diagnostic collection compiles and validates at **89,253,806 bytes / zero imports
/ 399,899 ms**, but **0/5 Wasm tests pass**. Logs are
`.tmp/ts5-source-factory.log` and `.tmp/ts5-source-diagnostics.log`; both drivers
exit 1. All eight throw opaque WebAssembly exceptions, not assertion passes.
These source results do not increase the accepted 25-test count.

Checkpoint `07a6a23cadc41e` records the new runner. Typecheck passed before the
diagnostic addition (`.tmp/ts5-source-suite-typecheck.log`). The next run adds
guest-side message capture, rethrows the same exception, and exposes text through
bounded numeric UTF-16 exports. No host imports or assertion changes. Its raw
Wasm sentinel verifies that the exception still escapes and its exact message
is readable; the diagnostic/worker controls pass **10/10**
(`.tmp/ts5-source-error-controls.log`). Typecheck after the diagnostic addition
also passes (`.tmp/ts5-source-errors-typecheck.log`).

Instrumented factory run completed in **158,195 ms**, valid **63,632,570-byte**
standalone module, **zero imports**, still **0/3 Wasm / 3/3 native**. Each guest
message says `Cannot access property on null or undefined`, at generated
819:27, 849:23, and 860:25: respectively the FIRST `ts.factory` access in each
callback (`createClassExpression`, `createObjectLiteralExpression`, and
`createIdentifier`). This is before any parenthesizing assertion. Next reduce
the namespace-imported exported factory value/initialization path; do not infer
the diagnostic-collection failure has the same cause without its own evidence.
Log: `.tmp/ts5-source-factory-error-text.log`; persistent report:
`tests/dogfood/report/typescript-source-unit-factory.json`. All compilation and
typecheck processes from this expansion are terminal; no live handle to resume.

Reduced the factory failure to a module exporting an accessor-bearing factory
alongside an unrelated mutable export. Both direct and barrel namespace imports
trap before the fix (**0/2**). Namespace-object materialization deliberately
declines when it cannot publish live bindings, but static variable reads also
declined source-module namespaces and fell through to a null receiver.
`tryEmitRuntimeNamespaceVariableValue` now resolves exact source-module export
declarations through the oracle and reads their program-ABI global, retaining
the dynamic TDZ check. Ambient and non-top-level declarations still decline;
the existing runtime-namespace ownership checks remain unchanged. The reduced
cases now pass **2/2**, zero imports, and the LOC/function gates pass without
new allowances. Added a same-named cross-module live-binding control as well.

Namespace fix checkpoint: `59dad92583ede4`. Real-source reruns are terminal:
factory **74714** (`.tmp/ts5-source-factory-binding.log`) compiles/validates in
184,181 ms at 63,616,239 bytes, zero imports, still **0/3 Wasm / 3/3 native**.
Its first/third failures moved past the initial factory reads to
`ts.SyntaxKind.StaticKeyword` (generated 820:78) and `ts.SyntaxKind.CommaToken`
(874:22). The second advances into `createArrowFunction`, where it traps with
an illegal cast (wasm-function 3010 at 0xdd4e8d, through
`__fn_tramp_createArrowFunction_1383`). Diagnostics **38802**
(`.tmp/ts5-source-diagnostics-binding.log`) compiles/validates in 236,473 ms at
89,255,662 bytes, zero imports, still **0/5 Wasm / 5/5 native**. All five fail
at `ts.ScriptTarget.ESNext` on the first `createSourceFile` call (generated
808:73, 830:73, 862:73, 885:73, 904:73). Next reduce qualified namespace enum
reads, then the arrow-factory cast separately. No imported-factory failure
remains at the original three sites; no new upstream pass is claimed.

Namespace controls pass **19/19**
(`.tmp/ts5-namespace-value-controls.log`), including exact cross-module identity,
existing namespace constructor controls and TDZ. Typecheck and scoped lint pass
(`.tmp/ts5-namespace-value-typecheck.log`). All runs from this expansion are now
terminal. The qualified enum dispatch currently calls `getConstantValue` in
`property-access-dispatch.ts`; inspect its receiver guard before changing it.

### Qualified const enum reads — 2026-09-08

Both direct and barrel imports of `ts.Kind.Next` / `ts.Kind.Text` reproduce
the null-namespace failure (**0/2 before**). The exact const-enum member branch
was enclosed in an identifier-only receiver guard, excluding `ts.SyntaxKind`.
It now accepts statically proven namespace qualification via
`static-enum-receiver.ts`. Qualification must resolve to namespace imports or
module declarations, not calls, getters or ordinary object bindings; the
existing exact const-enum declaration check and constant-value emission remain.
Direct/barrel reductions plus the existing nested const enum test pass **3/3**;
LOC/function gates pass without new allowances.

The enum-fixed source runs completed. Factory compiles/validates at 63,606,833
bytes, zero imports, 172,239 ms, still **0/3 Wasm / 3/3 native**. Its first case
now reaches a null dereference in the parenthesizer trampoline, the second still
traps inside `createArrowFunction`, and the third reaches `ts.Debug.formatSyntaxKind`
(generated 806:60), another nested namespace value path. Log:
`.tmp/ts5-source-factory-enum.log`. Diagnostics now fails compilation after
179,705 ms with `Maximum call stack size exceeded (at src/codegen/fixups.ts:207:17)`
(`.tmp/ts5-source-diagnostics-enum.log`); no binary or new pass is claimed.
Expanded enum/worker controls pass **12/12**, and typecheck passes.

The fixup recursion independently reproduces at 20,000 nested shared instruction
bodies (the 28-level and cross-function safety controls pass before the fix).
`repairBody` now uses an explicit child-first stack and a separate unchanged
pattern scan. It marks physical arrays on entry, preserves first-owner order,
and retains the cross-function refusal/diagnostic before traversal. Its child
enumerator is shared with the ownership scan and also covers `catchAll`.
Initial fixup controls pass **16/16**, including the deep graph; function/LOC
gates pass without new allowances. Added idempotence and catch-all coverage.

Both full-source retries completed, confirming stack-safe diagnostic compilation:
**89,252,855 bytes / validates / zero imports / 220,668 ms**, but still **0/5 Wasm
/ 5/5 native**. All five now reach `createDiagnosticForNode` and null-dereference;
the nearest source mapping is utilities.ts:2364 (`getSourceFileOfNode(node)`).
Log: `.tmp/ts5-source-diagnostics-stack-safe.log`. Next distinguish an absent
statement from a broken parent chain or diagnostic argument carrier; the shared
error signature alone does not prove which value is null.

Factory remains **0/3 Wasm / 3/3 native**, with a valid zero-import 63,606,837-byte
module in 164,782 ms (`.tmp/ts5-source-factory-locations.log`). The arrow cast
maps to nodeFactory.ts:3260, the parenthesizer call/body assignment. The first
failure is in `__fn_tramp_parenthesizeExpressionOfExportDefault_675`; its mapping
lands on parenthesizerRules.ts:668 (a different sibling), so treat that source
location as approximate rather than attributing the failure to that statement.
The third still fails at the original assertion's `ts.Debug.formatSyntaxKind`
read (generated 806:60). Investigate qualified runtime namespace function reads
and the lazily created parenthesizer's captured factory independently.

Final controls pass **21/21**, and typecheck passes (logs
`.tmp/ts5-enum-stack-final-controls.log`, `.tmp/ts5-enum-stack-typecheck.log`).
The final catch-all fixture/idempotence rerun passes **4/4**
(`.tmp/ts5-fixups-last-controls.log`). Source and regression formatting, scoped
lint, and function/LOC gates pass. No allowances or upstream assertions changed.
All handles from this turn are terminal. No additional upstream passes claimed;
the established projected suite remains the previously verified 25/25, with the
remaining full 256-file requirement and self-hosting goal still open.

### Qualified namespace and parenthesizer triage (2026-09-08, uncommitted)

Qualified runtime namespace reads/calls now use the static namespace proof for
`ts.Debug.format`, mutable `ts.Debug.enabled`, and direct calls. Direct/barrel
regressions improved from 0/2 to 2/2; focused namespace controls pass 21/21
(`.tmp/ts5-qualified-runtime-final.log`). Typecheck completed successfully
(`.tmp/ts5-qualified-runtime-typecheck.log`). Full factory remains 0/3 Wasm
versus 3/3 native, but the third failure advances into debug.ts:445, which
reflects `(ts as any).SyntaxKind`; runtime enum objects remain unsupported.
The zero-import factory module validates (63,605,817 bytes).

Full-source parser-parent triage passes 3/3: statement existence, parent
identity, and `getSourceFileOfNode` identity (83,351,219-byte valid zero-import
module; `.tmp/ts5-source-node-parent.log`). This rules out a universally broken
parent chain, not the full diagnostic unit's argument transport.

The shorter-arity parenthesizer fixture fails in both GC and standalone.
Standalone inspection independently gives realRules failure / nullRules=421;
disabling experimental IR retains the same result. Staged instrumentation
shows the memoizer callback returns, but the real parenthesizer method is never
entered. Generated Wasm proves the caller dispatch expects `(Node, i32)`, while
the named callback wrapper has `(Node, externref)`. The optional-declaration
parameter policy widens the implementation boolean, whereas
`compileCallablePropertyCall` resolves its interface parameter directly to i32.
The reference-only candidate bridge rejects that scalar/externref mismatch.

Diagnostic A/B on the current working tree, standalone raw Wasm, same extracted
fixture and compiler: changing only `optionalChain?: boolean` to required
`optionalChain: boolean` makes realRules=421 and nullRules=421 (2/2).
Logs: `.tmp/ts5-parenthesizer-no-ir.log`, `.tmp/ts5-parenthesizer-stage2.log`,
`.tmp/ts5-parenthesizer-required.log`; inspector
`.tmp/ts5-inspect-parenthesizer.mts`. This is diagnostic evidence, NOT a source
workaround or an upstream pass. Preserve optionality in the actual fix and cover
named/arrow callbacks, boolean/number values, missing arguments, and side effects.
Do not assume this optional-boolean defect explains every full factory failure.
All processes started during this triage are terminal. Full upstream unit-suite
acceptance and self-hosting remain unfinished.

### Optional callable ABI implementation (2026-09-08, uncommitted)

Callable property and element signature lowering now applies the same optional
scalar policy as named declaration wrappers. Arrow/function-expression wrappers
also apply that policy, and explicit scalar `T | undefined` syntax retains the
dynamic carrier just like `T?`. The latter is required by TypeScript's scanner:
its interface uses optional parameters while its implementation uses explicit
undefined unions. Native annotations and parameters with defaults keep the
existing policy. No runtime dispatch fallback or upstream source workaround was
added.

The original real/null parenthesizer regression passes in GC and standalone
(2/2). New optional-property tests exercise named and arrow boolean/number
callbacks, omission, explicit undefined, false/true/zero, and side-effect count;
they pass in both lanes. Array-held optional callbacks also pass (2/2 updated
tests, `.tmp/ts5-optional-elements.log`). Broader controls pass 27/27 across
eight files (`.tmp/ts5-optional-abi-final-controls.log`), plus optional direct
closure calls 2/2. An intermediate arrow-only NaN result and scanner-padding
failure drove the uniform ABI policy; both now pass.

An additional legacy `tests/optional-params.test.ts` run fails 3/3 during host
instantiation because it supplies only hand-written console imports and omits
the generated `string_constants` imports. Its first expected value also treats
`10 + undefined` as 10 rather than NaN. It was not changed or counted as passing;
baseline attribution has not been measured. Final post-element-edit scoped lint,
typecheck, diff whitespace check, and LOC/function gates pass (logs
`.tmp/ts5-optional-abi-complete-{typecheck,loc,func}.log`).

The first full-source factory retry, launched before the arrow/union alignment,
compiled a valid zero-import 63,092,533-byte module but remains 0/3 Wasm versus
3/3 native (`.tmp/ts5-source-factory-optional-abi.log`, 163,987 ms). Same three
runtime boundaries remain, so the reduced fix is not evidence that the full
factory failures are resolved. The aligned retry completed: valid zero-import
62,956,028-byte module, 155,404 ms, still 0/3 Wasm versus 3/3 native, with the
same null-pointer, arrow-body cast, and debug enum-reflection failures. Log:
`.tmp/ts5-source-factory-optional-abi-final.log`; it started before the final
element-access alignment. All processes from this implementation turn are now
terminal. Next isolate the actual full-source factory node/callback carrier,
not the already-fixed reduced optional-parameter mismatch.

### IR-first alignment directive (2026-09-08)

User direction: align this work with the new IR path early to avoid duplicate
implementation. Before the next compiler fix, identify which failing source
functions are selected/prepared by IR and which fall back, including the reason
for that fallback. The production compiler defaults `experimentalIR` on
(`src/compiler.ts`), so existing source probes already enable the IR overlay;
that does not prove a particular failing function is IR-owned.

Prefer fixes in shared semantic/callable ABI planning or the prepared IR
lowering path. Reuse exact prepared callable bindings and component ownership
instead of adding another legacy dispatch heuristic. If a missing IR capability
prevents the real TypeScript function from using that path, assess closing that
gap before extending legacy emission. Keep a legacy-only change only where the
measured current execution boundary requires it, and document why. Preserve the
existing standalone no-import and upstream correctness oracles; do not equate
enabling IR with proving its ownership or widening claims without preparation.
Relevant integration points: `src/ir/prepared-callable-resolution.ts`,
`src/ir/integration-options.ts`, and `src/codegen/ir-legacy-caller-abi.ts`.
The latter deliberately excludes optional/default/rest signatures from its
syntax-only cross-path ABI certification; do not relax that guard speculatively.

IR ownership measurement is now wired into the source-build worker behind
`JS2WASM_TYPESCRIPT_PROBE_IR_OUTCOMES=1`: it requests the compiler's existing
`trackIrOutcomes` ledger and preserves the complete rows in the result. Missing
ledger data is null, not a fabricated empty success. Acceptance logic is
unchanged. A fresh run compares cached and freshly constructed parenthesizer
rules (session 3860, `.tmp/ts5-factory-ir-ownership.log`) while collecting the
source-qualified emission/refusal evidence. This run completed with a valid
60,002,638-byte zero-import module (154,146 ms), but 0/4 checks pass: fresh rules
and cached rules have identical concise-body cast and export null-pointer
failures. The cache is not necessary to trigger the defect.

The full-source ledger contains 607 rows, 578 reporting legacy body emission,
and zero reporting IR body emission. `memoize` is rejected for type parameters;
`createParenthesizerRules` and `createNodeFactory` report body-shape rejection,
with direct-body=1 / IR-body=0. Nested parenthesizer functions have no separate
rows here, so do not invent individual nested-unit ownership receipts. A
standalone scalar positive control (`add(19,23)=42`) reports one prepared
IR-emitted function, direct-body=0 / IR-body=1, validating that the observation
path can report actual IR ownership (`.tmp/ts5-ir-ownership-positive.log`).

Reduced shape diagnostics (`.tmp/ts5-reduced-ir-shape.log`) identify
`nontail-unhandled-stmt:ReturnStatement` for createParenthesizerRules: returning
the method table before nested declarations is outside the current sequential
statement-list selection/lowering contract. createNodeFactory rejects at
`closure-return-type:ArrowFunction`; memoize rejects generic parameters.
`src/ir/select.ts` and `src/ir/from-ast.ts` currently process nested declarations
in statement order. A safe IR-first next slice therefore needs matching
declaration-hoisting/capture and selector/lowerer support, not merely removing
the return rejection. Evaluate that slice before more legacy-specific fixes;
retain the actual-source cached/fresh and no-wrap controls as correctness
oracles. The current evidence does not yet identify the exact failing capture
or return-carrier instruction.

Harness verdict controls pass 18/18; formatting, scoped lint, and whitespace
checks pass. All processes from this measurement turn are terminal. No new
upstream unit passes or IR coverage gains claimed.

### IR declaration-only return suffix (2026-09-08, uncommitted)

Added shared `src/ir/tail-function-declarations.ts` ordering used by both
selection and AST-to-IR lowering. A declaration-only function suffix following
the final return is presented before that return, retaining original AST node
identities and leaving every executable statement in order. This addresses the
measured non-tail-return gate without changing legacy code or relaxing
preparation proofs. It is not general declaration hoisting across executable
statements.

The standalone immutable-capture witness now returns 42 and records a prepared
IR-emitted owner with no direct body emission. The mutable-local witness returns
42 through the existing fallback: the builder refuses a slot capture as
`captures non-local binding "offset"`. That unresolved capture-storage gap is
explicitly tested, not replaced with an unsafe value snapshot. Added AST identity,
idempotence, and executable-suffix controls. Existing returned/lifted closure
ownership controls plus the initial witnesses pass 11/11 across three files.
The final helper/runtime rerun passes 3/3, typecheck and scoped lint pass, and
the projected standalone adapter remains 25/25 with 251/256 files deferred.
Logs `.tmp/ts5-ir-tail-*` and `.tmp/ts5-projected-after-ir-tail.log`.
Size gates initially rejected +2 integration lines in each large IR file and
+1 line in the selector function. Added explicit change-scoped allowances above
for those import/call sites only; the algorithm lives in the new 15-line module.
No baseline budget file was changed. Both gate reruns passed; all processes
started in this IR implementation turn are terminal. Changes are uncommitted.

The reduced actual parenthesizer shape advances beyond its non-tail-return
refusal but is still rejected inside nested-function checking; its optional
parameter and broader callable/object shape are not newly supported. No full
TypeScript factory IR claim or upstream pass is inferred from this first slice.
Next align nested optional signatures/capture storage with shared ABI planning,
then remeasure the full-source ownership ledger before extending legacy code.

### IR named method-table boundary investigation (2026-09-08, in progress)

Post-PR continuation: rerun the original full-source factory unit file against
f350cf36dc5bbf (`.tmp/ts5-factory-after-pr5753.log`). In parallel investigate the
IR failed-owner placeholder defect exposed by the method-table experiment:
late synthetic allocations use type index zero, which may name a struct rather
than a function. The cleanup deliberately declines non-function types, leaving
an invalid retained artifact. Prove this with an unmodified-selector witness
before changing placeholder allocation; keep ABI withdrawal intact.
The fresh full-source run remains **0/3 Wasm, 3/3 native**, with a valid
62,956,028-byte standalone module, zero imports and 152,298 ms compilation.
The errors remain default-export parenthesizer null dereference, arrow factory
illegal cast and enum-formatting null access; no factory-unit gain is claimed.

Reduced withdrawal witness now reproduces the defect without extending the
selector: an out-of-order numeric object return and captured nested `add`
withdraw on ABI parity, stranding `make__nested_add_0` at a non-function type
zero (`.tmp/ts5-ir-withdrawal-direct.log`). Fix uses a valid temporary empty
function signature and an explicit unsettled-late-unit set to defer publication
of that provisional signature. Merely making type zero valid was insufficient:
it first falsely published the provisional source binding, then exposed an
inlined caller using a withdrawn lifted callee and returning 3 instead of 5.
The same source with IR disabled returns 5 (`.tmp/ts5-ir-withdrawal-ab.log`).

The ABI-withdrawal set now includes the failed owner's lifted artifact units,
so callers retaining such references after inlining withdraw together. This
keeps the existing parity guard and healthy-owner behavior intact. Controls
pass **26/26 across five files** (`.tmp/ts5-ir-withdrawal-family.log`), and the
final 2/2 regression asserts both runtime parity and make/run withdrawal
(`.tmp/ts5-ir-withdrawal-final.log`). The local patch is not yet published.

Next IR prerequisite: object construction currently assumes canonical logical
field order equals physical layout order, whereas get/set already consult the
resolver. Test and correct construction using an explicit reversed layout,
including mixed field types and observable operand order. Do not change
anonymous-struct selection by guessing the first order-insensitive match:
the registry also publishes declared shapes and method-signature metadata.
Both closure preparation and final lowering will need the same exact source
layout binding before the production factory can use this capability.
The broader bytecode control exposed an outdated hand-built call reference
without the now-required binding (the same dereference exists at HEAD).
Update that fixture to an exact test unit reference without changing its
expected opcode sequence; also exercise reordered objects through the real
bytecode lowerer/VM, not just the emitter's primitive unit tests.

IR construction now uses a validated physical-index permutation supplied by
the resolver (`src/ir/object-construction-order.ts`); logical shape ordering
and both production object registries are unchanged. The before-patch reduced
Wasm witness returned `[23,17]` instead of `[17,23]` with equal field types and
failed validation with mixed i32/f64 fields
(`.tmp/ts5-ir-object-order-before.log`). Afterward the real IR lowerer passes
reversed/canonical layouts, mixed types, repeated side-effectful calls,
mutation, invalid indexes, and the bytecode VM: **13/13 new tests**.
Combined controls pass **45/45 across four files**
(`.tmp/ts5-ir-object-order-final.log`). Source typecheck, scoped lint/format,
LOC/function budgets and diff checks pass. The selected standalone adapter
remains **25/25, 251/256 files deferred**
(`.tmp/ts5-ir-object-order-projected.log`); no new full-source factory gain is
claimed. The factory's latest full-source measurement remains 0/3 Wasm vs
3/3 native. These changes and the withdrawal fix remain local/uncommitted.

Resume at the source-to-IR object carrier binding: `IrObjectShape` currently
contains only canonical fields, while `ObjectStructRegistry` and
`prepareClosureObjectType` independently choose an exact order-sensitive hash.
Carry an exact source ABI layout through preparation into both resolvers;
do not replace either with an ambiguous registry scan. The new construction
permutation can then consume that layout without corrupting field values.

Source-order experiment in progress: carry the exact declared data-field order
beside canonical logical fields, use it in both existing order-sensitive
allocation keys and callable support keys, and contextualize object literals
from their expected object type. No registry scan, new checker query, or legacy
emission change. Distinguish representation-incompatible orders in IR equality
so an unconverted value cannot silently cross the boundary. Verify annotated
returns, parameters, nested shapes and closure signatures; retain a genuinely
late withdrawal witness for the earlier cleanup defect.

Source-order checkpoint implemented (2026-09-08): `IrObjectShape.fieldOrder`
retains declared data order while logical fields stay sorted. Both object
allocators consume that order. IR equality, monomorphization keys and prepared
object-support keys distinguish incompatible representations; the final object
registry uses the same complete support key, including scalar brands.
Contextual object literals inherit the declared shape, including nested fields.
The shared source data-hash implementation moved unchanged to
`src/codegen/registry/data-fields-key.ts`; both IR copies now use it. ABI debug
proved two additional drifts: IR dropped boolean branding, and hashed nested
references after widening them to nullable storage. Both are corrected on the
IR path, with storage widening still performed after computing the source key.

Five source-level regression fixtures (not upstream compiler tests) now execute
their selected owner through IR: captured nested-function return, mixed-field
argument, object captured by an explicitly typed escaped closure, nested
layouts, and two different declared orders in one module. These are late IR
overlays where indicated by the ledger, not a claim of zero direct emission.
Metadata/key and malformed-order checks bring the new source-layout file to
**7/7**. Final combined controls pass **56/56 across six files**
(`.tmp/ts5-ir-source-order-final-verified.log`), including actual Wasm and
bytecode execution. Typecheck completes successfully
(`.tmp/ts5-ir-source-order-typecheck-final.log`); scoped lint/format,
LOC/function budgets and the oracle ratchet pass without new checker-query
allowances. The selected standalone upstream adapter remains **25/25 with
251/256 files deferred** (`.tmp/ts5-ir-source-order-projected.log`).

The original annotated withdrawal witness now succeeds in IR. An inferred
return variant was rejected before lowering, and polymorphic variants either
used early IR or converged; none was accepted as a withdrawal control. The
regression now injects a valid-but-incompatible lowered signature for the
late `make` owner only, leaving original source/runtime assertions unchanged.
Removal controls prove it remains load-bearing: removing valid placeholder
types causes the retained nested function to reference non-function type zero
(`.tmp/ts5-ir-fault-withdrawal-no-valid-placeholder.log`); removing lifted-family
withdrawal returns **3 instead of 5**
(`.tmp/ts5-ir-fault-withdrawal-no-family.log`). Both implementations were
restored before final validation.

Fresh full-source factory run remains **0/3 Wasm vs 3/3 native**: valid
62,956,028-byte standalone module, zero imports, 156,175 ms compile
(`.tmp/ts5-ir-source-order-full-factory.log`). It began before the final
object-cache-key consolidation, so this is that source-order checkpoint's
measurement, not a full-suite claim for later edits. Errors remain the same
default-export null dereference, arrow-function illegal cast and enum-format
null access. Next: typed callable fields in returned method tables, exact
callable packing/signature keys, then renewed real factory ownership/runtime
measurement. Inferred object-return selection and unannotated arrow admission
remain separate gaps; do not blanket-admit them or mark this issue complete.

Callable-field continuation (2026-09-08): the actual
`ParenthesizerRules` interface uses method signatures, overloads, recursive
node types, optional parameters and higher-order returns. Primitive method
tables alone therefore cannot establish real-factory coverage. First make the
existing named-table witness require IR execution, then connect explicit
function/method signatures, canonical callable packing, and the source
method-signature hash suffix. Keep unsupported overload/recursive signatures
explicit; do not make an erased externref field masquerade as an exact closure.

Primitive callable-field checkpoint implemented on the **IR path**: explicit
function-property and method signatures map to exact IR callables; returned
named closures are packed at the declared object boundary. Source-order method
hashes and declared-interface allocation metadata preserve the existing source
layout contract. The `src/codegen/index.ts` changes are the source-to-IR bridge,
not a new legacy direct-emission implementation.

Validation: **28/28 tests across four files** pass, including actual IR owner
execution for anonymous and named-interface tables, shared captured state,
layout/withdrawal controls, and unsupported-signature/key checks
(`.tmp/ts5-ir-callable-field-validated.log`). Source typecheck, scoped formatting
and lint, LOC/function budgets, oracle and coercion ratchets pass. The selected
standalone upstream adapter remains **25/25**, with **251 upstream files
explicitly deferred** (`.tmp/ts5-ir-callable-projected.log`). The full-source
factory has **not** been remeasured for this checkpoint; its previous 0/3 Wasm
result above remains the last measurement. Next: receiver-sensitive negative
runtime controls, richer callable signatures/recursive source carriers, then
real factory ownership and original-assertion validation. Do not infer full
TypeScript factory support from these primitive table witnesses.

Next validation pass (2026-09-08, in progress): rerun the complete factory
source graph with IR ownership reporting on the published callable-field
checkpoint, retaining all three original assertions. Add an IR-enabled versus
disabled receiver-sensitive table control before expanding callable admission.
The complete run remains 0/3 Wasm versus 3/3 native (62,956,028 bytes,
157,595 ms, valid, zero imports; `.tmp/ts5-ir-callable-full-factory.log`).
Its ownership field was absent: the full-source unit driver uses
`upstream-suite-compile-worker.mjs`, not the build-probe worker that already
supports the opt-in flag. Wire the same existing compiler ledger into this
driver, preserve null for unavailable data, and verify it with an actually
IR-emitted positive control before rerunning the graph. No acceptance changes.

Completed ledger retry: **661 rows, zero IR-emitted rows, 633 legacy-emitted
rows**. The 607-row measurement above used a different triage entrypoint and
is not the denominator for this original-unit graph. `memoize` and
`memoizeOne` reject generic parameters; `createParenthesizerRules` and
`createNodeFactory` reject body shape, all at selection. The complete factory
again measures **0/3 Wasm vs 3/3 native**, valid 62,956,028 bytes, zero imports,
155,936 ms (`.tmp/ts5-ir-source-ledger-factory.log`). Do not infer actual-source
IR coverage from the primitive table controls. Next obtain the current precise
shape-rejection arms for these original functions, then close their source
carrier/signature preparation gaps rather than adding more primitive-only
witnesses or another direct-emission workaround.

The driver now requests/preserves the existing ledger in both source/project
compilation modes only when opted in. Unavailable data stays null; default
reports remain unchanged. An actual `upstreamTestCount` IR emission proves the
project-worker reporting path. Worker and receiver controls pass **14/14**
(`.tmp/ts5-ir-source-ledger-controls.log`); runner/protocol controls pass
**25/25** (`.tmp/ts5-ir-source-ledger-protocol.log`). The receiver-sensitive
table returns 42 with IR enabled and disabled; its owner safely declines IR.
Formatting, scoped lint and whitespace checks pass. All processes are terminal.

Precise original-source selection pass (2026-09-08, in progress): run the
same factory driver with both the verified ownership ledger and
`JS2WASM_IR_SHAPE_DIAG=1`. Check the actual first refusal before changing
local interface erasure, uninitialized cache variables, or closure annotations;
source-text candidates alone do not establish which transformed node is seen
by the production selector.
The measured first refusal is `nontail-unhandled-stmt:InterfaceDeclaration`
for `createParenthesizerRules`; `createNodeFactory` first reports
`expr-ident-not-in-scope:Identifier` (661 rows, 149,491 ms;
`.tmp/ts5-ir-original-shape-factory.log`). Implement matched IR erasure for
local interface/type-alias declarations without introducing value bindings or
moving executable statements, then remeasure the next original-source gate.
Implemented shared erasure before declaration-suffix ordering, plus matched
selector/body-lowering no-ops for nested blocks. Only interface/type-alias
statements are erased; enums and executable trailing statements remain in
place. Original runtime node identities are retained and normalization is
idempotent. The standalone control failed IR ownership before the fix and now
returns 42 through IR with no direct body; it also checks a type alias sharing
a runtime binding name. Initial focused controls pass 18/18. A full-source
retry is in progress in `.tmp/ts5-ir-type-erasure-factory.log`.
Retry completed: the original `createParenthesizerRules` now advances to
`vardecl-noinit:VariableDeclaration`, confirming removal of its interface gate.
`createNodeFactory` remains at `expr-ident-not-in-scope:Identifier`. Still
**0/3 Wasm vs 3/3 native**, 661 rows with zero IR emissions, valid 62,956,028
bytes, zero imports, 159,070 ms. Next represent the initially undefined cache
locals and their later captured Map writes correctly in IR; do not substitute
numeric zero or erase their initialization semantics. Final typecheck,
lint/format, LOC/function gates pass; final erasure/worker controls pass 10/10
and the standalone selected adapter remains 25/25 with 251 files deferred.
All processes from this erasure pass are terminal.

Undefined-cache implementation pass (2026-09-08, in progress): the next gate
requires several matched capabilities, not a removed initializer check.
Current shared-capture installation accepts scalar cells only; native Map
methods are module-binding/number-value specific; ordinary `void` lowering
still uses a numeric approximation. First extend exact logical dynamic-cell
storage through the existing canonical carrier/ref-cell registries, then
materialize true undefined for uninitialized locals and preserve later writes.
Do not claim native local Map support from the existing module-only adapter.

Dynamic-cell substrate implemented, not yet source-admitted: the builder now
has exact logical-payload construction, lowering resolves that payload for all
new/get/set/signature paths, and prepared closure support uses the same
`resolveIrDynamicCarrierType` as ordinary IR. No alternate ref-cell registry or
raw module-index payload is introduced. The first source witness did not reach
cell lowering: it was rejected at `param-type-not-resolvable`
(`.tmp/ts5-ir-dynamic-capture-before.log`). Do not label that a cell regression
or relax the dynamic-use selector just to accept the witness.

Hand-built IR tests exercise actual zero-import Wasm with both canonical
carriers: externref preserves JS undefined, a Map reference, strings/numbers,
null and booleans; the native carrier preserves the real reserved undefined
singleton distinctly from null. Reads before and after a second function's
write retain order and share one cell across the call. These are storage tests,
not source-level Map execution. Canonical dynamic-type/linear-plan controls
pass **27/27**, and named/tail capture controls initially pass **20/20**.
Source typecheck passes. Next wire true undefined production and captured
local initialization/updates through this storage, with source-level controls
before admitting the actual TypeScript cache declarations.
Final storage/capture/type/allocation matrix passes **45/45 across five files**
(`.tmp/ts5-ir-dynamic-cell-final.log`). The selected standalone adapter remains
**25/25 with 251 upstream files deferred** (`.tmp/ts5-ir-dynamic-cell-projected.log`).
Typecheck, formatting, scoped lint, LOC/function budgets and whitespace checks
pass. This kernel does not yet change the source initializer/capture gates;
the previous full factory 0/3 result remains the last original-source result.
All processes are terminal; this dynamic-cell checkpoint remains local.

Source initialization pass (2026-09-08, in progress): connect local lexical
declarations without initializers to the existing undefined producer and a
logical dynamic slot/cell. Preserve module-init ownership, const rejection,
and temporal-dead-zone scope checks. First test true undefined observation,
then assignment and shared closure writes before widening native Map calls.

Source initialization checkpoint (2026-09-08, local and not ready to publish):
canonical undefined now comes from an IR-owned runtime adapter, reserving the
native singleton or the exact host provider before lowering. Flush host late
imports before minting the adapter; otherwise GC function signatures/indices
are corrupted. The unchanged source matrix passes **6/10** across GC and
standalone: undefined observation, subsequent assignment, and strict null
distinction pass in both lanes. Captured reads and writes remain red.
The captured-write arithmetic classifier inspected the ref-cell storage kind
instead of its logical payload; it now recognizes boxed dynamic locals and
uses the existing runtime dynamic-add path. The failure consequently advances
from `operand-coercion-unsupported` to the same retained-source-callable exact
allocator error as captured reads (`.tmp/ts5-ir-capture-payload-dispatch.log`).
No test assertions were weakened and this is not a source-capture success.

Diagnostic instrumentation (removed after measurement) recorded incomplete
early prepared dependencies: `__ir_undefined_value` has no prepared structural
binding, and dynamic carrier/box/tag-test support lacks symbolic evidence
(`.tmp/ts5-ir-capture-failure-trace.log`). Follow the prepared dependency and
source-callable publication lifecycle; do not relax the exact allocator guard.
Reusing an already observed source slot for every non-derived lift did not
fix captures and additionally withdrew five previously passing returned-table
owners on signature parity. That experiment was removed, not accepted as a
fallback solution (`.tmp/ts5-ir-capture-exact-source-slot.log`: 36/45).
The source typecheck passed (`.tmp/ts5-ir-uninitialized-typecheck.log`).
After removing the slot-reuse experiment, the exact five-file storage,
named-table, tail-declaration, allocation, and dynamic-type control matrix
passes **45/45** (`.tmp/ts5-ir-capture-dispatch-final-controls.log`). This does
not include or supersede the failing 6/10 source-initialization matrix.
Formatting and whitespace checks pass; all processes from this checkpoint
are terminal. Changes remain local pending correct prepared capture support.
The original full factory remains last measured **0/3 Wasm vs 3/3 native**;
no new full-factory run or publication is justified by these failing controls.

Prepared capture ownership root cause confirmed (2026-09-08): the first
registration of `run__closure_0` comes from
`prepareDependencyCompletePreparedComponents`' pre-scope callable loop,
via the early free-function preparation path. It calls
`planProgramAbiUnitCallable` before dependency completeness is known
(`.tmp/ts5-ir-capture-plan-stack.log`; temporary stack logging removed).
Aborting the subsequent component scope does not undo those earlier writes.
The new `issue-1058-ir-capture-preparation-abort.test.ts` observes actual scope
aborts and checks the session at abort time, before fallback can legitimately
replan. Both GC and standalone retain the exact source arrow binding when
they should not: **0/2**, with the expected leaked binding printed in
`.tmp/ts5-ir-capture-abort-baseline.log`. The test also requires successful
fallback execution returning 12 and zero standalone imports once rollback is
fixed; it does not treat compilation alone as correctness.

Next implementation boundary: stage candidate source-callable contributions
through the existing prepared-component planning overlay, rather than writing
them into the live session before opening a scope. Dependency discovery needs
the provisional draft and structural-reference view; successful sealing must
publish the exact allocator and signature atomically with the rest of the
component. Abort must leave existing source plans untouched and discard only
the provisional contributions. The affected shared contracts are drafts,
draft-order ownership, locators and reverse ownership, structural references,
and callable type contracts (already grouped by
`PreparedProgramAbiPlanningOverlay`). Extend that authenticated descriptor
boundary; do not add an ad-hoc session snapshot, relax exact locator checks,
or replace a retained source ABI with a different IR closure ABI.

Transactional source-callable implementation, first part (2026-09-08):
extracted `describeProgramAbiUnitCallable` from the existing publishing
planner. It produces the same provisional draft, structural reference,
allocator locator, and cloned signature without changing session state.
The publishing API now consumes that description, preserving its exact-unit
and conflicting-allocator checks. This is shared Program ABI planning for IR
preparation, not a legacy AST code-generation extension. Three new controls
check all absent session views with an actual publication as the positive
control, independent cloned contracts, and rejection of unknown/non-unit or
conflicting allocator ownership. Together with existing prepared-provider
transaction tests, **24/24** pass (`.tmp/ts5-ir-callable-description.log`).
This supplies the side-effect-free contribution needed by the authenticated
scope descriptor; it does not yet replace the leaking pre-scope loop, so the
two abort regressions and four source-capture failures remain unresolved.
Existing callable-planning/session controls also pass **27/27**
(`.tmp/ts5-ir-callable-description-abi-controls.log`), including production IR
replacement-object publication. Source typecheck passes
(`.tmp/ts5-ir-callable-description-typecheck.log`); scoped lint/format,
whitespace and LOC/function gates pass. The function grant covers the measured
nine-line undefined-provider preregistration growth, not a baseline edit.
All processes from this checkpoint are terminal; no changes were published.

Transactional candidate-callable wiring (2026-09-08, local): added an opaque
`PreparedUnitCallableDescriptor` with authenticated session/terminal/allocator
ownership, cloned signatures, one-shot claim/consume, and stale-state checks.
The existing prepared batch now stages its drafts, locators, reverse ownership,
structural references and contracts through the shared planning overlay.
Dependency discovery sees provisional descriptions without writing the live
session. Retained terminal/class/module callable reservations remain on their
existing path: moving those too broke the ReferenceError setter controls,
because direct fallback requires their pre-existing exact reservations.
Only candidate nonterminal lifts use the new contribution. An allocated slot
left by aborted early preparation also retains the late path's deferred-binding
rule when reused; allocation alone is not proof of published source ownership.

Measured result: captured writes now execute through IR and return 142 in both
GC and standalone. The unchanged source initialization matrix is **8/10**;
captured reads still fail. Their error has advanced from duplicate source
callable ownership to an abandoned required closure-support type whose
allocator is removed from the final module. Both forced-abort tests now pass
their at-abort source-binding check but still fail the required successful
runtime result for that type-lifecycle reason (**8/12** combined, not success;
`.tmp/ts5-ir-unit-callable-transaction-final-source.log`). The abort test now
derives exact arrow binding IDs from the scope's frozen inventory and requires
an observed abort containing that arrow; it no longer depends on the old
publishing method being called or on a display-name match.

Descriptor tests cover abort/commit, consumed-token replay, forged tokens,
stale exact allocators and no publication on failures. They pass together with
returned-table and provider-transaction controls: **38/38**
(`.tmp/ts5-ir-unit-callable-transaction-retained.log`). Source typecheck,
scoped lint/format, whitespace and LOC/function gates pass. Next inspect
`prepareDependencyCompleteClosureSupport` calling
`prepareClosureSupportLayouts` and `prepareRefCellSupportTypes` before the
candidate's dependency verdict. Their required type registrations are a
separate lifecycle from callable ownership and must not survive an abandoned
candidate merely because its types were allocated. Do not suppress the missing
allocator assertion or preserve dead types as a substitute for exact ownership.
No full factory rerun or push; original factory remains last measured 0/3.
All processes from this checkpoint are terminal.

Closure-type lifetime checkpoint (2026-09-08, local): the strengthened
forced-abort regression records the actual captured-subtype references returned
by `prepareClosureSupportLayouts` and checks their session ownership at abort.
It floors both the observed arrow scope and allocated captured-type population.
Source callable bindings are absent as intended, but the captured subtype is
still required in both lanes: **0/2** at the new type assertion, not merely a
later DCE error (`.tmp/ts5-ir-support-type-description.log`). No missing-type
assertion was weakened and no dead type was pinned to manufacture validity.

Extracted `describeProgramAbiSupportType` from the type registry's publishing
helper. It produces the same draft, structural key and exact session-owned
type-cell locator without marking the type as required. The old publishing
helper consumes that description, preserving normal behavior. A new control
checks every absent ownership view, then uses real publication as a positive
control; foreign-session cells and mismatched allocator types are rejected.
All seven description/transaction controls and all twelve existing closure
support tests pass (**19/19**); the two intentional end-to-end abort regressions
remain red. The next step is to stage closure/ref-cell/object support type
descriptions via authenticated prepared-scope descriptors, keeping the stable
batch keys/ordinals and canonical type-cell aliases. Merely adding provisional
descriptions without changing the batch cache's immediate-publication behavior
would not fix the leak: `closureSupportBatchPlanned`, `refCellSupportBatchPlanned`
and `objectSupportBatchPlanned` also govern repeated requests and role expansion.
Original source initialization remains last measured **8/10**, factory **0/3**;
this refactoring alone claims no additional TypeScript test gain.
Source typecheck, scoped lint/format, whitespace and LOC/function gates pass
(`.tmp/ts5-ir-support-type-description-typecheck.log`, `-loc.log`, `-func.log`).
All processes from this type-description checkpoint are terminal; changes
remain local and unpublished.

Undefined local/capture checkpoint completed (2026-09-08, local): closure,
ref-cell and object support preparation now has a provisional mode. Candidate
type descriptions and canonical type-cell aliases stay in the registry until
an authenticated `PreparedSupportTypeDescriptor` stages exactly the component's
referenced types through the existing prepared planning overlay. Committing
publishes required ownership; abort consumes the descriptor without publishing
it. Default immediate preparation remains available, including promotion of a
previously described cached layout without changing its identity. Batch key
ordering and refusal of later role/layout expansion remain unchanged.

The unchanged source initialization/capture matrix now passes **10/10** through
IR in GC/standalone, and both forced-abort controls pass their callable/type
ownership checks and execute the fallback result 12 (**2/2**). Together with
the closure-support and returned-table tests, this run passes **35/35**
(`.tmp/ts5-ir-support-type-provisional-first.log`). A separate regression matrix
passes **79/79 across seven files** (`.tmp/ts5-ir-uninitialized-final-controls.log`).
Descriptor controls additionally cover commit/abort, a disjoint scope abort
preserving an already committed shared type, default promotion after a
provisional request, and stale type-shape rejection; the full description
control file passes **10/10** (`.tmp/ts5-ir-support-type-descriptor-final.log`).
Source typecheck, scoped lint/format, whitespace and LOC/function gates pass.

Original factory remeasurement (`.tmp/ts5-ir-uninitialized-full-factory.log`):
**0/3 Wasm vs 3/3 native**, valid 62,956,028-byte standalone module, zero imports,
154,866 ms; 661 ownership rows, zero IR emissions, 633 legacy emissions.
`createParenthesizerRules` advances from `vardecl-noinit:VariableDeclaration`
to **`unattributed-arm:helper-internal`**. `createNodeFactory` remains at
`expr-ident-not-in-scope:Identifier`. The three runtime failures are unchanged.
The selected adapter still passes **25/25 with 251 upstream files deferred**
(`.tmp/ts5-ir-uninitialized-projected.log`). Thus the source initializer gate
is removed, not the full factory failure. Next give the helper-internal
selector refusal an exact diagnostic and implement the actual original-source
requirement it identifies; do not infer local Map/recursive Node support from
the now-green scalar capture controls. No completion claim for the full goal.
Oracle and coercion ratchets also pass (`.tmp/ts5-ir-uninitialized-oracle.log`,
`.tmp/ts5-ir-uninitialized-coercions.log`), without new checker allowances or
baseline edits. All processes from this checkpoint are terminal. The changes
remain local pending publication review; PR #5753 has not been updated by this
checkpoint.

Original nested-helper attribution (2026-09-08): the nested-function selector
now records exact first-wins labels for missing/unsupported return types,
parameter shapes/types, modifiers, names and body failures. It does not change
admission or generated code. Two focused tests prove those labels, preserve a
deeper expression failure, and compare claims/reasons with diagnostics off.
The older diagnostic control had stale expectations: the safe `for (var ...)`
fixture is already admitted by HEAD's var proof, and the Promise fixture now
fails at typed constructor capability rather than generic new-expression
shape. Both fixtures remain, with current positive-admission/exact-reason
assertions. Combined diagnostic controls pass **4/4**
(`.tmp/ts5-ir-nested-shape-controls-verified.log`).

The original factory retry confirms
`createParenthesizerRules`: **`nested-function-return-type-missing:FunctionDeclaration`**
(`.tmp/ts5-ir-nested-shape-full-factory.log`). The first source helper,
`getParenthesizeLeftSideOfBinaryForOperator`, has an inferred return type and
returns a callback cached in a local Map. Both `isPhase1NestedFunc` and
`lowerNestedFunctionDeclaration` currently require an explicit return annotation;
address-taken declarations also reach `lowerClosureExpression`'s explicit
annotation gate. Matching signature inference must cover selector and both
lowering paths, retain canonical callable/Node representations, and not invent
a numeric signature for this higher-order return. Full factory remains **0/3
Wasm vs 3/3 native**, valid zero-import 62,956,028 bytes, 146,541 ms, 661 ledger
rows with zero IR bodies. `createNodeFactory` remains out-of-scope identifier.
Publication preparation: PR #5753 was verified open, ready and not queued at
head `a38afaea15187581c98e7a6c3cb4e8f962acb0b0`; no full-goal completion claim.

Higher-order signature continuation (2026-09-08, in progress): the checkpoint
above is published as signed commit `5be04db2a76714911efbbf7e0c496c9cde2ff078`
on PR #5753. The next IR prerequisite is retaining the returned callback's
signature: `TsCheckerOracle.signatureOf` currently classifies its return as
`{ kind: "function" }`, losing the `Expression -> Expression` boundary. Audit
existing signature consumers before adding registry-free nested signature
facts; do not substitute `dynamic` or a scalar signature for this source.
Selection, direct-only nested lifting and address-taken closure lifting must
ultimately consume the same exact source-owned plan. This prerequisite alone
does not remove the local Map or recursive Node representation requirements.

Implemented the fact prerequisite locally: signature positions retain nested
fixed-arity callback signatures, using instantiated parameter symbols instead
of their generic source declarations. Ordinary `typeFactOf` remains shallow;
no source selection or direct-codegen emission was changed. Unsupported
overloads, generic call signatures, optional/rest/default parameters, explicit
receivers and constructor-only types retain a function tag **without** a
signature. Expansion has an active-type cycle guard, depth ceiling six and
64-signature budget; truncation likewise does not invent an ABI.

Consumer audit: existing production `signatureOf` readers test availability,
return kind or callable-boundary presence, rather than nested signatures.
The new facts do not authorize those callers to allocate a carrier. The
differential signature serializer did erase this new evidence via the shared
`factKey`; it now includes nested signatures without changing `factKey`'s
in-house join/intern semantics. Differing nested metadata is surfaced as a
conservative disagreement (the string classifier does not yet distinguish
missing callback metadata from a genuinely incompatible callable signature).

Validation: the pre-change focused run had **4 failures / 10 tests**, all
missing higher-order facts. Final bounded controls pass **33/33 across five
files**, including **12/12** new controls, instantiated generics, conservative
refusals, recursive and branching expansion and differential visibility
(`.tmp/ts5-higher-order-facts-bounded.log`). Typecheck, scoped Biome/Prettier,
LOC/function and oracle/coercion gates pass without new grants or baseline
edits. Dead-export preservation passes **6/6 full + 6/6 cut**, still not a
strict graph-closure or deletion certificate.

The real source was inspected through `analyzeFiles` on the original factory
entry, not an extracted replacement (`.tmp/ts5-original-signature-facts.mts`).
Both cached helpers now report `(Expression) -> Expression` returned callbacks
and non-nullish numeric enum unions of **42** parts for their operator input;
`mixingBinaryOperatorsRequiresParentheses` reports two numeric enum unions of
**360** parts and a boolean return. Class-name facts do **not** identify a
canonical Node layout: the next IR step still needs source-position-owned
carrier resolution shared across selector and both nested lowering routes.
Do not register by spelling `Expression`, widen it to dynamic, or declare the
factory admitted based only on these facts.

Full-factory verification before adding the expansion-budget hardening remains
**0/3 Wasm vs 3/3 native**, same 62,956,028-byte valid zero-import module,
151,985 ms (`.tmp/ts5-higher-order-full-factory.log`). This is no factory
runtime gain. The selected adapter remains **25/25**, with **251 upstream
files deferred** (`.tmp/ts5-higher-order-projected.log`). The final bounded
original-source fact probe and final typecheck/gates are recorded separately;
do not mislabel the earlier full-module run as testing later edits.
The bounded source probe matches the earlier three-helper facts byte for byte
(`cmp` exit 0); final typecheck, LOC and function gates all terminate with
exit 0 (`.tmp/ts5-higher-order-typecheck-final.log`,
`.tmp/ts5-higher-order-loc-final.log`, `.tmp/ts5-higher-order-func-final.log`).
All verification processes are terminal. These five files remain uncommitted
on `codex/1058-typescript-standalone`; PR #5753 still contains `5be04db2`.

Exact signature-position continuation (2026-09-08, in progress): add a
registry-free oracle query for a parameter/return path through nested callable
signatures. It must retain an opaque type identity and expose a source type
annotation only when that annotation resolves to the **same instantiated
type**, not merely the same name. This lets a later IR signature planner use
the existing position resolver where proven and refuse missing recursive
carrier evidence. In-house resolution must abstain where it cannot prove
identity; neither a generic declaration's `T` nor a same-named interface from
another scope is a valid substitute.

The query is implemented as `signaturePositionOf(node, path)`, where a path
uses zero-based parameter indexes and `"return"` steps. Checker types stay in
the checker implementation; consumers receive a registry-free fact, an opaque
key interned through the existing `typeKeyOf` cache, and an annotation only
after exact type-identity verification. Empty/out-of-range/deep paths,
non-callable intermediates, overload sets and unresolved generic signatures
abstain. The in-house backend explicitly abstains rather than reusing its
structural type interning as nominal/source identity. Differential queries
return the primary key unchanged and compare facts/source coordinates rather
than comparing generated symbol labels.

Fresh original-source evidence: **6/6 requested positions** in the two cached
parenthesizer helpers resolve to verified `BinaryOperator`/`Expression`
annotations in `parenthesizerRules.ts`. All **4/4 callback input/result
positions** share the same `Expression` type key
(`.tmp/ts5-original-signature-positions.log`; probe exits 0 and asserts both
denominators and identity equality). This is stronger than same-name evidence
and does not claim an IR Node layout exists. New tests distinguish same-named
types in separate scopes, reject a generic `T` annotation for an instantiated
`number` position, check invalid paths and overload abstention, and retain the
primary identity through differential mode. An initial parameterized invalid-
path test accidentally spread path arrays into test arguments; it was corrected
to use object rows before the final **44/44 across six files** run, including
**11/11** signature-position controls (`.tmp/ts5-signature-position-verified.log`).

Typecheck, scoped lint/format, LOC/function, oracle/coercion and dead-export
preservation gates pass (`.tmp/ts5-signature-position-*.log`). No new checker
allowances, baseline changes, source selection or legacy emitter edits. All
verification processes are terminal. The eight-file combined fact/identity
checkpoint is ready to commit. Next integrate one source-owned inferred
signature plan into selection and both nested lowering routes, resolving
nominal/recursive leaves only from exact prepared carrier ownership. The
existing finite object expander rejects recursive shapes; merely feeding it
the now-verified `Expression` annotation is not the remaining implementation.
Local Map adapters are still needed, and the full standalone TypeScript goal
remains incomplete.

IR symbolic carrier implementation (2026-09-08, in progress): reuse existing
`IrType.val.typeRef` and its Program ABI type-cell relocation rather than add
a second recursive object representation. Closure support preparation must
resolve the exact owned binding, preserve nullability, and refuse raw indices
or scalar attachments. Allocation-cache keys opt into symbolic identities;
ordinary semantic keys retain their existing contract. Kernel tests are next;
this does not yet admit the original factory or implement local Map support.

Verified checkpoint: `lowerPreparedClosureSupportType` now resolves an owned
symbolic physical reference through its current Program ABI type cell, and
canonical closure/ref-cell keys accept symbolic references while still
rejecting unbound physical indices. `irPhysicalTypeKey` is used only by the
closure allocation registry; `irTypeKey` and prepared-callable semantic
fingerprints retain their previous behavior. No direct AST emitter changes.

The new six-case `issue-1058-ir-symbolic-closure-carrier.test.ts` proves key
identity/nullability, whole-layout relocation, cache reuse, refusal of an
unowned same-index carrier (including after cache population), and rejection
of scalar attachments/raw indices. Two real zero-import Wasm runtime cases
pass a recursive Node-shaped struct through a closure argument/result and a
capture/result, checking reference identity with distinct parent/child nodes
in both orders. These are hand-built IR kernel proofs, NOT original factory
admission or TypeScript unit-suite completion.

Verification: **42/42 across six files** in
`.tmp/ts5-symbolic-closure-verified.log`; after adding the cache-refusal control,
**19/19 across two files** (six carrier cases plus thirteen prepared-callable
boundary controls) in `.tmp/ts5-symbolic-closure-boundary.log`. Typecheck,
targeted lint/format, LOC/function budgets and diff checks pass. Initial
failures were fixture defects: the layout omitted context-created types, then
the runtime module omitted the lifted function's declarative `ref.func` entry;
both are corrected and rerun. No allowance/baseline updates.

Next: attach exact source-owned carrier
references using the measured top-level slot witnesses, then provide one
shared inferred-signature plan to selection and both nested-function lowering
routes. Do not use raw positional matches for hidden-capture signatures, and
do not treat opaque reference transport as support for Node field access or
local Map operations. Full factory results have NOT been rerun for this kernel
change; the last original-source measurement remains 0/3 Wasm versus 3/3 native.

Shared inferred-signature integration is now in progress. A pure plan cached
by the exact compilation oracle and AST declaration is consumed by selection
and both nested lowering routes. Scalar/literal-union and higher-order callable
positions are resolved through exact signature-position facts; object/any facts
still cannot establish a Node representation. Keep unsupported defaults,
optional/rest/generic/async/generator declarations out of this new route.

Initial source integration verifies **13/13** new tests: four zero-import
standalone source programs emit their owner through IR only (direct nested
call, address-taken declaration, arrow, returned callback), eight unsupported
boundary controls refuse the plan, and one exact higher-order plan is reused.
The selector now projects the exact inferred callable result at a call site,
and no longer applies the stale prohibition on aliases of nested declarations:
`nestedFunctionUsedAsValue` already lifts those through closure objects.

Broader run: **58/60 across seven files**, with two failures in existing GC
destructuring import-parity assertions (object: extra `__unwrap_for_wasm`;
numeric array: that plus `__copy_wasm_struct_sidecar`). Both standalone rows
pass. A paired candidate control disables BOTH new inference entry points and
reproduces the same two failures (**2/4** in the destructuring file), while the
new direct-nested positive test loses IR admission as expected (**0/1**, twelve
other tests filtered). Thus those two GC import failures are independent of
the new inference route; this is a kill-switch comparison on the candidate,
not an assertion that a separate pristine HEAD was tested. Temporary control
returns are removed. Logs: `.tmp/ts5-inferred-regression.log`,
`.tmp/ts5-inferred-destructuring-control.log`, and
`.tmp/ts5-inferred-disabled-positive-control.log`.

The function-budget allowance for `planIrOverlay` covers precisely the two
new selector resolver callbacks (+2 lines), not a new direct-codegen emitter.
Inference itself lives in the new IR module, with bounded traversal, exact
oracle-position evidence, and no checker calls added under codegen. Original
factory execution still needs exact Node carrier/field-layout integration and
local Map support; the full TypeScript goal is not complete.

Final restored-candidate check: **56/56 across six files**, including the
13 new inference tests, returned/literal closure ownership in both lanes,
signature facts/positions and source object layouts
(`.tmp/ts5-inferred-final-tests.log`). The separately attributed two GC
destructuring import failures remain unresolved; excluding that file from the
final six-file run does not turn the broader 58/60 measurement into green.
Typecheck, lint/format, LOC/function budgets, oracle/coercion ratchets and diff
checks pass. All current test/gate handles are terminal; changes are not yet
committed. Before adding nominal carrier support, construct its exact source
evidence before the first inference query (or explicitly revise the cache
contract): the current pure per-oracle/node cache retains negative results.

Original-source revalidation after inferred-signature integration (2026-09-08):
the direct project worker completed in **146,998 ms**, emitting valid
**62,956,028-byte**, zero-import standalone Wasm. Runtime remains **0/3**;
all three failures are unchanged (export-assignment parenthesizer null
dereference, arrow-factory illegal cast, and null/undefined guest property
access). The complete ledger contains **661 rows, 0 IR bodies, 633 legacy
bodies**. `createParenthesizerRules` still first rejects at
`nested-function-return-type-missing`; `createNodeFactory` still rejects at
`expr-ident-not-in-scope`. Log: `.tmp/ts5-factory-inferred-signatures.log`.
This direct worker does not run native reference tests; the earlier 3/3 native
measurement is not a new result from this run. Worker handle 81756 is terminal.

An independent original-AST probe verifies all six exact signature positions
and shared Expression identity again, then invokes the new inference planner
on the three real helpers: `mixingBinaryOperatorsRequiresParentheses` now has
the exact `(f64, f64) -> i32` plan; both cached parenthesizer helpers correctly
decline Node-bearing callbacks without carrier evidence. Log:
`.tmp/ts5-original-inferred-plans.log`; probe handle 93048 is terminal.

Representation boundary traced for the next implementation: `object.get` in
`lower.ts` requires an `IrType.object`, and `ObjectStructRegistry.resolve` in
`integration.ts` derives/reuses storage from the logical field shape.
`from-ast.ts::lowerPropertyAccess` likewise reads fields only from known
logical object/class shapes (or other explicit supported families). A plain
symbolic `val.typeRef` solves closure transport, but cannot by itself lower
`node.kind` or repeated `node.parent` reads. The exact source-owned carrier
adapter therefore needs a field-layout contract as well as the signature
position witness; do not substitute dynamic values or manufacture an
anonymous recursive struct expansion. No temporary production instrumentation
was used for this rerun; only the worktree-local original-AST probe changed.

Physical Node field kernel (2026-09-08, in progress): reuse `object.get/set`
with a bound `val.typeRef` receiver instead of introducing cyclic anonymous
object shapes. The final resolver resolves the symbolic carrier through its
existing scoped Program ABI path, then reads the exact allocated struct's
unique named field. Missing/duplicate fields, unbound receivers, mismatched
physical value types and immutable writes fail explicitly. A non-null ref may
widen to the same nullable field type on writes; unrelated carriers cannot.
Prepared instruction support records the receiver's explicit type reference,
so existing ABI ownership validation remains authoritative.

Reader audit: object operand walkers in `nodes`, `verify`, inline-small,
monomorphize and async-linear preparation preserve instruction metadata;
ownership records reads/writes and escape records stored values independently
of receiver shape. Mutable heap reads/writes remain ordered by `effects.ts`.
No shared allocation map is added or mutated. The audit exposed the existing
DCE policy that drops dead logical-object reads even when they can trap.
New physical reads therefore carry `physicalReceiver: true`: the builder sets
it, the verifier requires it for bound physical receivers, the effect model
records control effects, and DCE retains them. Existing logical reads are
unchanged; this does not claim to repair the broader historical trap policy.

Verification so far: **53/53 across three files** (seven carrier tests,
35 prepared-component dependency tests, eleven effect/scheduler controls) in
`.tmp/ts5-physical-object-effects-tests.log`. The new real zero-import Wasm
kernel relocates a recursive struct from index 1 to 0 while IR retains stale
candidate index 99, traverses `parent`, mutates its numeric field, replaces
the parent's reference, and verifies both mutation directions. An unused
nullable field read survives DCE and traps on null; missing control metadata
is rejected by verification. This is IR-kernel evidence, NOT source Node
admission, and the original factory has not been rerun for this field change.
Next supply source-owned nominal parameter/field type evidence to the
inferred-signature and property-access producers. Keep literal/anonymous
object allocation unchanged and do not invent dynamic carriers for Node.

The physical-field rule/lookup now lives in `physical-object-field.ts`.
Shared object get/set dispatch was extracted there so `lower.ts` shrinks
instead of growing its large emission function. Verification adds only one
import and delegates through its existing rule-dispatch line; the two new
narrow driver allowances cover that import and the one integration resolver
callback, not an expanded verifier/emitter body. Final validation follows.

Final kernel checkpoint: **86/86 across seven files** in
`.tmp/ts5-physical-object-final-tests.log`, including ordinary source object
layouts, the inferred-closure source tests, and closure ownership in GC and
standalone. Typecheck, lint, formatting, LOC/function budgets and diff checks
pass. All handles from this checkpoint are terminal; changes remain
uncommitted. The two previously attributed GC destructuring import failures
are not covered by this final seven-file run and remain unresolved.

This supersedes the earlier assumption that field access must build an
`IrType.object` shape for Node: the new symbolic physical get/set path avoids
that expansion entirely. Next steps are producer integration, not another
kernel representation: establish exact source-parameter-to-physical-slot
witnesses and stable Program ABI type-cell references before inference is
cached; resolve nominal signature positions using their opaque oracle keys;
then let source property access obtain exact named-field types. Self-reference
fields can retain the same symbolic type ref and physical nullability. Other
reference fields require their own owned type ref, and externref/dynamic
fields require an explicit value-representation contract rather than guessing
from a TypeScript property name. No original factory rerun is warranted until
those source producers can emit this newly supported IR form.

Integration trace: `select.ts::isPhase1NestedFunc` rejects missing returns,
and `isPhase1ClosureLiteral` separately requires annotated returns/parameters.
`from-ast.ts::lowerNestedFunctionDeclaration` (direct-call capture parameters)
and `lowerClosureExpression` (address-taken closure objects) independently
reconstruct signatures. The shared plan must reach all four sites, not merely
relax selection. Production selection gets evidence through `IrSelectionOptions`
in `planIrOverlay`; nested lowering already receives `oracle` and exact
`identityContext` through `LowerCtx`. Existing top-level `overrideMapByUnitId`
does not automatically supply nested positions. Keep source-to-physical slot
witnessing separate from closure allocation; a `val.typeRef` can transport a
Node but does not supply field-layout metadata for object operations.

Recursive Node carrier investigation (2026-09-08, in progress): verify whether
already-allocated exact source callable parameter slots provide consistent
physical evidence for the inferred callback's `Expression` type. A match by
opaque source type identity may reuse an existing recursive layout without
expanding it, but mismatching carriers or hidden-parameter offsets must not be
silently accepted. Instrument the actual original factory graph read-only at
IR planning, then remove the temporary instrumentation before publication.

Measured result: the original graph has **8/8 matching top-level parameter
slots** with identical physical carrier, a `ref` to the same ten-field
recursive struct (index 216 in this particular pre-lowering snapshot; **never
hardcode that index**). Source and physical arities match in all eight:
`isCommaExpression`, `isCommaSequence`, `getRightMostAssignedExpression`,
`getExpressionAssociativity`, `getExpressionPrecedence`, `getOperator`,
`getLeftmostExpression`, and `addDefaultValueAssignmentForInitializer`.
The match used `signaturePositionOf(helper, ["return", 0]).typeKey`, queried
each source parameter through the same oracle, joined declarations/units
bidirectionally through the planning inventory, and read the exact allocated
source function through `programAbiSourceCallables.functionForUnit`.

The layout has numeric `pos`, `end`, `kind`, `flags`, `modifierFlagsCache`,
`transformFlags`; externref `id`; self-referential `parent` and `original`;
and a reference to `emitNode` storage. Thus an already-allocated recursive
carrier exists; the next implementation need not invent a recursive expansion
of `IrObjectShape`. Treat these as planning-time observations, not immutable
final indexes or field-nullability contracts: type relocation, field storage
normalization and prepared-scope ownership still have to be respected.

The complete raw scan has **160 matching source positions**, but only the
eight top-level slots above are valid same-index carrier evidence. Nested
parenthesizer functions have one extra physical capture parameter (e.g.
`parenthesizeLeftSideOfBinary` has source arity 2 versus physical arity 3).
Reading their same-numbered slots reports unrelated `f64` or capture-struct
carriers. That is a diagnostic indexing error, **not** proof of conflicting
`Expression` layouts. A production adapter needs an exact source-to-physical
slot map before it can include those witnesses; arity guesses are insufficient.

Probe provenance and controls:

- The first probe incorrectly attempted to iterate
  `sourceFunctionHandleByDeclaration`, which is a WeakMap. Its compile failure
  (`.tmp/ts5-source-carrier-probe.log`) is instrumentation-only and supplies no
  carrier evidence. The corrected walk enumerates `declarationByUnitId` and
  uses the weak map only for lookup.
- The normal suite discards worker stderr on successful compilation, so its
  corrected run is only a regression result: **0/3 Wasm vs 3/3 native**, valid
  zero-import 62,956,028 bytes, 158,108 ms
  (`.tmp/ts5-source-carrier-probe-fixed.log`).
- Direct worker capture preserves the actual diagnostic rows:
  `.tmp/ts5-source-carrier-direct.log` contains **1/1 probe event**, target
  found, the 160 raw rows and 8 top-level witnesses. The same original
  generated factory entry compiled to the same valid zero-import byte size
  in 154,102 ms and executed **0/3** successfully. It does not run the native
  reference; the native denominator above belongs to the normal-suite run.
- Temporary instrumentation was removed with an exact patch; `git diff --
  src/codegen/index.ts` is empty. Both worker processes are terminal. Upstream
  main was rechecked and remains `04c8e72156cf576cf584a3ed3a5a66ec5a2b91b0`.

Next implementation direction, now backed by original-source evidence:
introduce exact prepared-carrier reuse for an IR object boundary, analogous
to existing string/vec carrier references. Preserve the original type cell
and physical field order instead of minting a structural duplicate. Cover
`lowerPreparedClosureSupportType`, `ObjectStructRegistry`, object-shape
identity/equality and prepared type dependency collection together. Current
closure preparation rejects raw `val(ref)` leaves and the object registry
hashes/reallocates structural shapes, so merely passing physical type indexes
would not be a sound bridge. Test relocation, scope abort, stale/mismatched
field layout and self-referential storage, then connect the proven source
signature positions to this carrier route in selector and both nested
lowering paths. This remains IR work, not a legacy emitter fix; the full
factory and overall standalone TypeScript goal are not yet passing.

Final publication-query migration in progress: indexed record element facts now
come from TypeOracle (property names, scalar/union facts and optionality; no
checker types or Wasm indexes escape). JSON preflight uses source facts, then
the emitter validates the expression's actual compiled storage. The existing
speculative transaction rolls back a declined storage path; successful
materialization compiles/evaluates the input once. Validate nullable/optional
fields, field order, classes/accessors and observable evaluation count before
calling this publication-ready.
The oracle ratchet now passes with no new exemptions or baseline edits
(`.tmp/ts5-json-oracle-ratchet.log`: +0 getTypeAtLocation, -1 ctxChecker after
the branch's pre-existing allowances). The namespace legend required the
dispatcher's already-resolved declared array carrier for an erased value;
that carrier is threaded into JSON materialization without another checker
query. All seven tracing/JSON standalone tests pass, including single
evaluation, null arrays/elements, optional-field omission, type assertions and
namespace declaration ordering (`.tmp/ts5-json-oracle-carrier.log`).
Final broader controls pass **40/40 across seven files**
(`.tmp/ts5-oracle-json-broad.log`), and the corrected typecheck completes
successfully (`.tmp/ts5-oracle-json-typecheck.log`). Scoped lint, formatting,
diff, LOC and function gates pass. This supersedes the earlier pending
typechecks and seven-file publication-blocker notes, which remain historical.

Second oracle migration slice: add registry-free exact call-declaration,
non-nullish type-declaration and tri-state index-signature queries. Differential
mode compares these facts; the in-house oracle explicitly reports unavailable
information rather than claiming a type is closed. Generic scalar result tags,
optional native collection provenance and spread enumeration consume these
queries. In particular unknown spread shape must retain dynamic enumeration.
Validation now passes **17/17 across four files**
(`.tmp/ts5-oracle-second-verified.log`). Exact-fact tests cover overload selection,
non-nullish receiver declarations, any/unknown and a mixed open/closed union,
plus checker/in-house/differential behavior. The index query checks unknown
before non-nullish narrowing (which otherwise turns unknown into `{}`), and
declines to prove a type-parameter or ambiguous union closed. Resolved-call
declarations include JSDoc signatures in their AST-only return type.
The ratchet now flags only json-record-array.ts (+1 getTypeAtLocation, +2 net
ctxChecker; `.tmp/ts5-oracle-second-ratchet.log`). Formatting and lint pass.
The pre-correction typecheck completed with the JSDocSignature return-type
omission (`.tmp/ts5-oracle-second-last-typecheck.log`). After it became terminal,
started validation of the corrected AST return type (session 69630,
`.tmp/ts5-oracle-second-corrected-typecheck.log`); observe this same handle.
JSON must separate source field facts from allocated
Wasm layouts; do not return checker types from TypeOracle to clear the gate.

PR checkpoint (user request): new implementation belongs in IR wherever possible.
Final checkpoint validation: **32/32 tests across six files** pass
(`.tmp/ts5-ir-pr-verified.log`); typecheck, scoped lint, formatting, diff and
both size gates pass after removing the experimental object-field changes.
The experimental callable-object extension was removed before publication;
it is not part of the verified closure slice. A single-method witness reached
late IR emission after matching the legacy callable-signature suffix, but still
compiled a direct body first (`return-signature-unstable`). A two-method witness
failed ABI parity and stranded a placeholder function type. Logs:
`.tmp/ts5-ir-method-fields-key.log`, `.tmp/ts5-ir-pr-controls.log` (30/32).
The attempted source-order fix accidentally targeted the lattice resolver,
not the checker object resolver; both it and all speculative field-admission,
packing and key changes were removed. Next work must cover contextual field
order, exact source layout identity, early preparation and failed-owner slot
cleanup together. Keep the single- and multi-method runtime controls, without
mislabeling their current legacy fallback as IR ownership.

Publication gate rechecked: `.tmp/ts5-pr-oracle.log` rejects direct checker
growth in expressions.ts, optional-native-set.ts, generic-scalar-union-result.ts,
indexed-object-spread.ts, json-record-array.ts, optional-declaration-parameter.ts
and uninitialised-variable-undefined.ts. These predate the IR slice. They need
registry-free TypeOracle facts, not moved checker queries or new allowances.
No gate bypass or new oracle exception is authorized by this handoff.

Oracle migration continuation: replace undefined-identifier and uninitialized
binding queries with existing TypeOracle facts and exact declaration lookups.
Reuse the native-annotation resolver with oracle declaration lookup rather than
duplicating its alias proof. Unknown facts must decline the optimization.
This slice removes three of the seven flagged files without exemptions:
expressions.ts, optional-declaration-parameter.ts and
uninitialised-variable-undefined.ts. The remaining ratchet is +4 direct
getTypeAtLocation / +8 ctxChecker, in optional-native-set,
generic-scalar-union-result, indexed-object-spread and json-record-array
(`.tmp/ts5-oracle-first-ratchet.log`). The native-annotation helper accepts
oracle declaration lookup while retaining the existing checker API for older
callers; it does not duplicate native alias resolution.
Validation: 16/16 compiler controls across four files, plus 1/1 exact-binding
oracle test covering nullable/optional/unknown/any/initialized locals, shadowed
undefined and native annotation parity. Logs `.tmp/ts5-oracle-first-controls.log`
and `.tmp/ts5-oracle-boundary.log`. Scoped lint, formatting, diff and size gates
pass. Changes remain local pending the rest of the publication migration.

Current continuation: admitting a function-typed object field as an internal
`closure` reaches preparation but fails source ABI parity (`IR=140, legacy=45`),
then exposes a retained lifted-function type error. Evidence:
`.tmp/ts5-ir-method-fields.log`. Do not ship that representation. Testing the
existing source `callable` carrier plus exact-signature packing when constructing
a contextually typed object literal; this shares the established closure ABI.

The next reduced witness returns `{ add }` where `add` is a trailing named
function capturing a numeric parameter. Standalone execution returns 42 via
legacy, but IR ownership is **0/1**: resolution rejects the annotated object
because its function-valued field is not an IR object field type. Evidence:
`.tmp/ts5-ir-method-table-before.log`. Address-taken function materialization
alone does not change this result (`.tmp/ts5-ir-method-table-after.log`).
Any implementation must resolve the callable field ABI and materialize the
closure through the shared IR machinery, with runtime and ownership assertions;
do not count legacy fallback as migration success.

The bounded implementation now materializes an address-taken named declaration
through the existing IR closure-expression path, preserving its original AST
identity and the shared capture-cell machinery. Direct-only named functions
retain their existing lifted-call path. Discovery uses exact checker symbols,
including shorthand property symbols; missing checker evidence does not guess.
This supports returning the function itself, without adding a second closure ABI.

Validation: `.tmp/ts5-ir-named-final.log` passes **29/29 across six files**.
The new named-function tests assert runtime values and actual IR ownership in
both GC and standalone: immutable capture returns 42; escaped mutable closures
remain live and isolated per factory instance (714). Only standalone asserts
zero imports; GC uses the standard runtime imports. The method-table test is
explicitly runtime-only and makes no IR ownership claim. The original table
ownership failure above remains the next implementation boundary, not fixed by
this slice. Typecheck, scoped lint, diff check, LOC and function gates pass.
An additional binding-discovery test covers direct calls, shadowed references,
shorthand fields and escaped values; see `.tmp/ts5-ir-named-discovery-final.log`.
These changes remain local and uncommitted; no full-source factory gain or full
upstream-suite completion is claimed.
The post-change selected standalone adapter remains **25/25**, with **251/256
upstream files deferred** (`.tmp/ts5-projected-after-ir-named-values.log`).

### Provisional physical carrier preparation (2026-09-08, uncommitted)

The next source Node bridge must not publish required type bindings during
selection: rejected candidates can lose their allocations to DCE. Existing
`candidateSupportTypes` and `candidateTypeOwners` already retain read-only
descriptions; prepared component sealing selects the consumed bindings, and
`describePreparedSupportTypes` authenticates their cells before the transaction
publishes them. Their writers remain the type registry's support preparation
and promotion paths; this change adds a read-only preparation consumer.

`resolvePreparedPhysicalType` now lets closure preparation resolve an exact
candidate type without `ensurePlan`, structural-reference registration or
locator publication. Published bindings retain the existing session resolver.
Candidates must belong to this session, match the exact symbolic key and shape,
and retain their session-owned allocator cell in the current module. Candidate
IR indexes are never authority. A stale allocation, changed shape or foreign
registry fails closed. Final emitted IR continues to require scoped ABI
resolution; this is not permission to emit unpublished bindings.

Tests cover index movement, shape/allocation/session refusals, nullable closure
results and captures, and resolution before and after both scope abort and seal.
The first run was **30/34**: four new assertions incorrectly assumed the fixture
carrier was at index 1, but context initialization allocates preceding types.
Tests now record the exact fixture allocation before moving/replacing it; the
production resolver was unchanged by that correction. Final verification:
**35/35 across three files** (`.tmp/ts5-provisional-carrier-final-tests.log`),
plus **35/35 prepared dependency tests**
(`.tmp/ts5-provisional-carrier-dependencies.log`). Source typechecking, lint,
formatting, LOC/function budgets and `git diff --check` pass. No new budget
allowance was needed; the large closure support module shrinks. All processes
are terminal. Changes remain uncommitted. No original-source factory rerun is
claimed: source identity mapping and inference-provider wiring are still the
next implementation step.

### Exact source parameter carrier evidence (2026-09-08, uncommitted)

`collectSourceParameterCarriers` implements the read-only source-to-allocation
join needed by the Node inference provider. It uses TypeOracle's opaque exact
signature-position key, inventoried declaration identity in both directions,
the source declaration's handle, and the structural callable registry's exact
handle/function agreement. Only ordinary top-level functions with matching
source/physical arity contribute. Nested, async, generator, generic, optional,
rest, default, destructured and explicit-this boundaries are not slot evidence.

All eligible witnesses for one source type must agree on the identical allocated
struct and nullability. Scalar or conflicting layouts invalidate that key;
display names and structural similarity never merge allocations. Deterministic
unit order selects the anchor when witnesses agree. This is a current planning
snapshot, not a final type binding, and performs no type-cell creation or shared
registry mutation. Allocation/ownership mutations remain with the existing
source callable registry, function allocator and type registry; callers must
authenticate the snapshot again when creating a provisional binding.

**6/6 tests** pass in `.tmp/ts5-source-carrier-evidence-tests.log`, including
same-display-name functions, a recursive allocation, conflicting layout,
nullability and scalar witnesses, hidden capture slots, wrong arity and aliased
declaration handles. Source typechecking and lint pass. The collector is not yet
wired into production selection: next add provisional source-owned type binding
reuse, then provide those symbolic types to inference without retaining an old
negative cache entry. No TypeScript factory execution gain is claimed here.

### Source-owned provisional carrier bindings (2026-09-08, uncommitted)

`ProgramAbiTypeRegistry.prepareSourceParameterCarrier` now re-collects exact
source evidence before creating a symbolic `IrType.val` reference. An unowned
allocation receives a provisional binding ordered by its inventoried source
function and parameter index (type role 14). An already owned allocation reuses
its exact support binding after shape/key validation. The existing support type
description helper now accepts either a source anchor or a unit anchor; existing
source-anchored callers retain their previous order.

This adds one writer to the existing candidate-support and candidate-type-owner
maps, not a new publication path. Their prepared dependency/sealing readers and
promotion paths remain unchanged. Repeated requests reuse one candidate;
changed source evidence is rechecked, and replacement of an already described
slot fails before a new type cell is created. Scope abort/seal coverage uses
the actual source-owned description and the existing transaction implementation.

The first focused run passed **32/32 across three files**. The replacement guard
now runs before type-cell creation. An initial LOC gate rejected the registry
crossing 1,500 lines; the implementation was extracted to
`source-parameter-carrier-binding.ts`, retaining the registry entry point and
central role ordinal. No budget allowance was added. The extracted final run
passes **67/67 across four files**
(`.tmp/ts5-source-carrier-binding-extracted-tests.log`); lint and LOC/function
gates pass. Post-extraction source typechecking also passes
(`.tmp/ts5-source-carrier-binding-extracted-tsc.log`); all processes are terminal.
Tests cover owner reuse, no duplicate assignment, no publication
before acceptance, abort, seal and changed source evidence.
Inference-provider integration remains next; this method is not yet called by production selection. Preserve cache
lifetime explicitly when connecting it, and require an original factory ledger
before claiming additional TypeScript source functions are IR-owned.

### Source carrier inference provider wiring (2026-09-08, uncommitted)

Selection and AST lowering now share an explicit context-scoped
`InferredClosureCarriers` provider. Only exact object/class signature facts may
request a symbolic physical reference; any, unknown, unsupported unions and raw
unbound references remain refused. Provider plans are cached separately from
analysis-only plans, authenticated against the same oracle, and negative carrier
lookups are not cached because source allocations can arrive after an earlier
selection pass. Existing positive plans are shared by selection and both nested
lowering routes. The provider is passed explicitly through AST options and both
lifted contexts, not installed in global oracle state.

The production planner and integration's standalone selector both use the
provider; all four integration AST entry paths receive it. The new lifecycle
test first caches an analysis-only refusal, then tries the carrier provider
before allocation, adds an exact source witness, and verifies successful
inference and actual nested AST lowering with bound physical parameters. A
different compilation's provider is refused. **31/31 across three files** pass
(`.tmp/ts5-inference-carrier-wiring-tests.log`); source typechecking and lint pass.
The function gate requires a one-line context-field allowance for
`lowerFunctionAstToIr`; no inference implementation was placed in that driver.

The original generated factory project worker completed with the full IR ledger
enabled (`.tmp/ts5-factory-source-carrier-wiring.log`, handle 49043 terminal):
**149,963 ms**, valid zero-import **62,956,028-byte** standalone Wasm, still
**0/3 runtime tests**. Its **661 rows contain 0 IR bodies and 633 legacy bodies**.
`createParenthesizerRules` still rejects at `nested-function-return-type-missing`;
`createNodeFactory` still rejects at `expr-ident-not-in-scope`. The export-default
parenthesizer null dereference, arrow-factory illegal cast, and guest null
property access remain. This direct worker does not execute a native reference.

This falsifies any claim that wiring alone admitted the actual factory. Next
inspect the exact failing original nested declaration, requested opaque type
key, current carrier witness population and allocation timing at that selector
query. Both production registries are constructed with the same identity context
in `create-context.ts`, so a different context instance has not been established
as the cause. Do not loosen ownership or slot checks based on the unchanged
generic rejection text. Source property producer work is still outstanding.

Additional dependency/description checks pass **50/50 across two files**
(`.tmp/ts5-inference-carrier-wiring-dependencies.log`), for **81/81 focused tests**
across five files. Formatting, lint, source typechecking, LOC/function gates and
diff checks pass. All processes are terminal; changes remain uncommitted. No
legacy emitter was extended.

### Demanded type alias dependency loss (2026-09-08, uncommitted)

The original selector trace identifies the immediate inference blocker:
`getParenthesizeLeftSideOfBinaryForOperator` at parenthesizerRules.ts:95 has
an `any` fact for its `BinaryOperator` parameter in the actual pruned graph.
Its returned callable and Expression parameter/result identities are present;
the provider is installed. Inference refuses the `any` before asking for those
Node leaves. Both registries share the same identity context. Trace log:
`.tmp/ts5-factory-carrier-trace.log` (worker 39477 terminal). Temporary tracing
was removed completely from production files before the fix below.

Two regression tests reproduce the mechanism in module and namespace barrels:
a demanded exported alias is retained but the private aliases it references are
blanked. Both checker signature facts become `any` (**0/2**, 14 unrelated tests
filtered, `.tmp/ts5-demanded-type-chain-before.log`). The existing checker-only
closure already follows dependencies of exported variable annotations; it now
also follows retained interface/type-alias roots. Runtime roots and unrelated
function signatures remain unchanged. Both tests require the transitive aliases
to survive and dead types/functions to remain pruned.

After the fix, **40/40 across three files** pass
(`.tmp/ts5-demanded-type-chain-after.log`), including all 16 barrel tests and
the inferred/source-carrier suites. An independent probe of the actual
consumer-driven factory graph (**30 files**) now gets numeric union operator
facts for **both original helpers**, rather than any
(`.tmp/ts5-demanded-original-types.log`). This is source fact evidence, not an
IR body or runtime pass claim. No legacy emission was added; this repairs the
shared checker input that IR inference consumes.

The fresh original factory worker (58000 terminal) now moves the parenthesizer
rejection to **`nontail-compound-or-binary-stmt:BinaryExpression`**, past the
missing inferred signature. The node factory still rejects the out-of-scope
identifier. However, the candidate **does not compile successfully**: after
**151,391 ms**, binary emission fails with `RangeError: Maximum call stack size
exceeded`, repeatedly alternating `encodeInstrArray` (binary.ts:1164) and the
block arm of `encodeInstr` (binary.ts:1203). There are **662 ledger rows, 0 IR
bodies and 633 legacy bodies**; no binary/import/runtime success is established
for this candidate. Log: `.tmp/ts5-factory-retained-type-chain.log`.

Next priority is to restore real-factory compilation by removing recursive
structured-control traversal in the shared binary encoder while preserving
the existing instruction-DAG byte cache, cycle detection, per-function
validation and source maps. Cover blocks, loops, if/else and try/try_table. The
existing `tests/issue-1058-binary-emitter-dag.test.ts` only tests depth 18, so it
does not protect a deeply nested non-shared chain. Do not paper over this with
a larger process stack or drop the now-correct type facts. Then resume the
parenthesizer's logical-assignment admission on IR.

Broader barrel checks: **9/10 across three files**, with the standalone
computed-option arity-cap case trapping in `__module_init`. Removing only the
four-line retained-type closure change leaves the same trap, while the two new
alias tests revert to `any` (**0/3 control tests**, 21 filtered;
`.tmp/ts5-demanded-type-chain-disabled-control.log`). Restoring it makes the
alias tests **2/2** again (14 filtered;
`.tmp/ts5-demanded-type-chain-restored-control.log`). This is a mechanism
kill-switch control, not pristine-HEAD attribution; the unrelated trap remains
unresolved and tests were not weakened. The four-line change is restored.
Typechecking, lint, formatting and LOC/function gates pass. All processes are
terminal. Changes remain uncommitted and are not ready to claim factory success.

### Iterative binary instruction-array emission (2026-09-08, uncommitted)

A 10,000-level block/loop chain reproduces the factory's emitter failure
(**0/1**, 3 filtered, `.tmp/ts5-deep-binary-before.log`). Shared-DAG depth 18
coverage did not protect deep non-shared structured control.

`src/emit/instruction-arrays.ts` now drives emission with an explicit task stack
for arrays, delimiters and catch headers. Blocks, loops, if/else, try and
try_table no longer recurse through the JavaScript stack. Ordinary instructions
still use the existing encoder. Only multiply referenced arrays get separate
byte buffers; the existing per-function cache, incoming-edge use accounting,
inline validation and source map behavior remain. Active arrays are checked
for cycles even when they are not shared, and failure clears active cache state.
The old large binary module shrinks instead of gaining another traversal.

**9/9 tests** pass (`.tmp/ts5-deep-binary-controls.log`): deep controls, exact catch
and table clause bytes, the valued-if missing-else trap, cycle refusal, invalid
tag/local checks, reuse after failure, shared-DAG byte parity and source maps.
Broader binary/exception tests pass **27/27 across four files**, including the
binary emitter self-compilation acceptance test
(`.tmp/ts5-deep-binary-regressions.log`). Source typechecking, lint, formatting,
LOC/function budgets and diff checks pass. No size allowance was added.

The original factory worker completed (92368 terminal): **159,382 ms**, valid
zero-import **63,780,391-byte** standalone Wasm, restoring compilation with the
correct retained type chains. Log: `.tmp/ts5-factory-iterative-emitter.log`.
Runtime remains **0/3**, with the same parenthesizer null dereference,
arrow-factory illegal cast and guest null property access. This direct worker
does not run a native reference. The ledger contains **662 rows, 0 IR bodies
and 633 legacy bodies**; the parenthesizer still rejects at
`nontail-compound-or-binary-stmt`, and the node factory at the out-of-scope
identifier. Next return to the IR logical-assignment boundary (`||=` in the
parenthesizer cache), not a legacy emitter workaround. All processes are
terminal. Changes remain uncommitted; the full TypeScript goal is incomplete.

### IR local logical-assignment statements (2026-09-08, uncommitted)

The selector and lowerer now share `localLogicalAssignment` for identifier
`||=` and `&&=` statements. Admission retains exact local-scope, module-storage
and projection-mutation guards and rejects unsupported RHS expressions. The
builder reads the old value once, uses the existing conditional ToBoolean path,
and emits the existing identifier write only on the required branch. Branch
string-encoding facts are joined afterwards. No AST rewrites or legacy emission
were added. Property targets, expression-result uses and `??=` remain outside
this statement plan.

The mutation/capture audit finds logical operators already inside the shared
PlusEquals-through-CaretEquals token range; those collectors need no widening.
**6/6 initial tests** pass with zero imports and IR-only owner emission:
numeric truthiness, skipping a throwing RHS, captured outer writes and loop
placement (`.tmp/ts5-ir-logical-assignment-string-throw-tests.log`). Numeric
throws and Error construction were unsuitable test instruments because existing
IR gates refuse them; the final tests use the existing string-throw path without
weakening IR ownership assertions. Two typecheck errors in the first lowerer
draft were corrected by supplying its normal condition hint and `if` context.

Expanded tests pass **8/8** (`.tmp/ts5-ir-logical-assignment-final-tests.log`),
including signed zero, NaN, fractions/infinities and explicit member/result
refusals. The broader run is **63/65 across three files**: two existing
`issue-5163-mutating-statements` rows expect `unsupported` but observe `emitted`
for a boolean field write and a nested-receiver property compound. Neither
source contains logical assignment. No expectations were changed and no
pristine-HEAD baseline is claimed; these assertions remain to be revalidated
against actual runtime/ownership evidence. Log:
`.tmp/ts5-ir-logical-assignment-regressions.log`. Source typechecking, lint,
formatting, LOC/function budgets and diff checks pass.
The original factory worker completed (23329 terminal): **162,204 ms**, valid
zero-import **63,780,391-byte** standalone Wasm. Runtime remains **0/3** with
the same three errors. The **662 ledger rows contain 0 IR bodies and 633 legacy
bodies**. `createParenthesizerRules` now rejects at
**`constructor-resolution-unsupported`**, past the logical-assignment statement;
the node factory still rejects the out-of-scope identifier. Log:
`.tmp/ts5-factory-ir-logical-assignment.log`. The direct worker does not run a
native reference. Next trace the actual cache's `new Map()` constructor binding
and add the missing IR native Map construction/storage plan; do not assume a
global constructor by display name. All processes are terminal. Changes remain
uncommitted; full TypeScript standalone/runtime acceptance is still incomplete.

### Empty native Map construction in IR functions (2026-09-08, uncommitted)

The existing native Map allocator already lowers empty Maps for module
initializers. Function-level selection now admits that same producer through
an explicit native-storage capability, sharing a pure identity/shape predicate
with lowering. The predicate requires positive ambient binding evidence,
zero runtime arguments and zero or two erased type arguments. Lowering no longer
treats a missing identity resolver as authorization. Native runtime allocation
still happens only after proof, through the existing materializing resolver;
ordinary method/type queries remain non-materializing.

**14/14 across two files** pass (`.tmp/ts5-ir-map-construction-tests.log`):
two IR-only function executions with zero imports, identity/argument refusals,
same-named local-class non-pollution, and all five existing native Map tests.
Source typechecking passes. This does not implement local Map methods or Map
callback-value storage: those existing adapters are module-binding-only and
number-key/value-oriented. Lint and LOC/function budget gates also pass.

The factory worker completed in **156,740 ms**, producing a valid standalone
binary of **63,780,391 bytes with zero imports**
(`.tmp/ts5-factory-ir-map-construction.log`). Its 662 outcome rows still record
**0 IR bodies and 633 legacy bodies**. `createParenthesizerRules` still rejects
at `constructor-resolution-unsupported`; `createNodeFactory` still rejects at
`expr-ident-not-in-scope:Identifier`. Runtime remains **0/3**, with the same
parenthesizer null dereference, arrow-function cast failure, and guest null
property access. The focused constructor coverage is not evidence that the
real cache is admitted. Next work must investigate that remaining IR selection
boundary before claiming progress on factory execution. Per user direction,
new support belongs in IR/shared planning, not legacy direct codegen.

### Preserve native Map identity in multi-source IR selection (2026-09-08, uncommitted)

The constructor refusal above was not missing ambient checker evidence. Both
original parenthesizer Map expressions resolve to ambient `lib.d.ts` symbols
(`.tmp/ts5-map-identity.mts`). A temporary selector trace in the real factory
recorded native capability `true`, local class `false`, but ambient identity
`false` (`.tmp/ts5-factory-map-selection-trace.log`). Multi-source preselection
deliberately disables module-storage resolution; the old Map selector obtained
ambient identity only through that disabled resolver.

The Map capability is now a pure expression predicate, combining the target
capability with checker-only constructor identity and the shared empty-Map
shape proof. It does not enable module storage, other constructor families, or
legacy codegen. Lowering independently requires the same positive identity.
The temporary production trace is removed.

A multi-source exported entry function now emits an IR overlay and executes
to 42 without imports. This driver still emits a direct body before the IR
overlay (`r2Withdrawal: multi-source-driver`); it is not IR-first routing.
The original cross-file-call probe instead reached the separate conservative
final-preparation boundary; no cross-file-call support is claimed here.
Disabling only the independent ambient proof makes the isolated positive
control fail again with constructor-resolution-unsupported (0/1, nine filtered,
`.tmp/ts5-map-multi-disabled-control.log`). This is a mechanism kill-switch,
not a pristine-HEAD baseline. The proof has been restored.

The initial focused suite passed 15/15 across two files. The additional imported
class named Map negative/runtime control exposes an unresolved invalid-binary
failure: `__sget_value` expects f64 but receives `(ref null 57)`.
The final focused result is **15/16 across two files**
(`.tmp/ts5-map-multi-final-controls.log`). That same validation failure occurs
with the independent ambient proof disabled (0/1, ten filtered,
`.tmp/ts5-map-imported-runtime-disabled.log`); again, mechanism attribution,
not a pristine-HEAD baseline. The failing runtime assertion remains in the test.
An earlier whole-binary absence assertion for `__map_new` also failed with the
proof disabled; the test now checks absence of the specific `__ir_map_new`
adapter instead, without claiming whole-module native-helper absence.
The proof is restored, and no temporary production trace or switch remains.
Source typechecking, lint, formatting and LOC/function budgets pass.

The real factory rerun completed in **164,831 ms**, with a valid standalone
**63,780,391-byte, zero-import binary**
(`.tmp/ts5-factory-map-identity-fixed.log`). The parenthesizer now advances to
**call-resolution-unsupported**; nodeFactory still reports
`expr-ident-not-in-scope:Identifier`. The 662 ledger rows still contain
**0 IR bodies and 633 legacy bodies** and runtime is unchanged at **0/3**.
This proves the constructor-selection boundary moved, not that the factory
works. Next work must resolve the parenthesizer's call boundary in IR and
retain the imported-class invalid-binary regression as an explicit open check.

### Exact parenthesizer call boundary and sibling graph (2026-09-08)

The real factory trace now identifies the rejected call, not merely its reason
category: **expr-nested-call-before-binding: parenthesizeLeftSideOfBinary**
(`.tmp/ts5-factory-call-selection-trace.log`). The trace worker completed in
174,637 ms with the same valid 63,780,391-byte binary and 0/3 runtime results.
The temporary production trace was removed after capturing this evidence.

The original pruned checker graph contains **39 nested declarations, 37 with
bodies** inside `createParenthesizerRules`. Exact checker-symbol dependency
analysis (`.tmp/ts5-parenthesizer-dependencies.mts` and its matching `.log`)
finds two self-recursive helpers: `getLiteralKindOfBinaryPlusOperand` and
`hasJSDocPostfixQuestion`. It finds no mutual-recursion cycle. The first cache
helper depends on `parenthesizeLeftSideOfBinary`, which depends on
`parenthesizeBinaryOperand`, then `binaryOperandNeedsParentheses`, including
the recursive literal-kind helper. Therefore merely moving the later sibling
before its caller is insufficient for the actual parenthesizer.

The shared `orderTailFunctionDeclarations` helper currently moves the function
suffix before the terminal return but retains source order. Selection binds
each nested declaration only after checking its body and explicitly rejects
self-reference. Direct nested lowering already allocates a symbolic lifted
target before building its body and prepends captured parameters, but does
not install a self binding in the lifted scope. That is the relevant shared
IR mechanism to extend, with captured-parameter forwarding and direct-call
identity proofs, before dependency ordering can admit the real graph. Closure
value recursion must not be assumed to use the same ABI. The two bodyless
overload declarations also need explicit handling; they are not extra runtime
functions. Keep original AST identities for all ordering/planning work.

Next implementation: prove and lower direct nested self calls in IR, with
runtime recursion and mutable-capture controls; then add checker-identity
sibling dependency ordering shared by selection and lowering. Do not treat
Map method work as the next observed rejection: the current measured stop is
the sibling call above. Map callback storage remains an additional known gap.

### Direct nested recursion through symbolic IR targets (2026-09-08, uncommitted)

Added a checker-identity proof for nested self calls that use only the direct
lifted-function ABI. Escaped function values, aliases, shorthand escape,
optional calls and self references from a further nested callback do not get
this proof. Missing checker identity refuses admission. The same proof gates
selection and the self binding installed in the lifted function's scope.
Recursive calls use the already allocated symbolic unit target and existing
capture-parameter forwarding; mutable captures reuse their refcell rather than
allocating a fresh recursion-local cell. No legacy emitter change is involved.

The original checker graph confirms **both actual recursive parenthesizer
helpers** meet this identity proof (`.tmp/ts5-parenthesizer-direct-recursion.log`):
`getLiteralKindOfBinaryPlusOperand` and `hasJSDocPostfixQuestion`. This is identity
admission evidence, not complete lowering/execution of those helpers.

Initial standalone verification is **11/11 across two files**, including
factorial, immutable capture, mutable captured counter, repeated exported calls
and existing tail-declaration/capture tests. All three new positive runtime
cases require IR-only body emission and zero imports. Source typechecking
passes. The expanded proof/closure regression run passes **30/30 across three
files** (`.tmp/ts5-direct-recursion-regressions.log`). Removing only the lifted
self binding makes all three new recursive runtime controls fail (0/3, seven
filtered, `.tmp/ts5-direct-recursion-disabled.log`); restoring it passes all
10 recursion tests (`.tmp/ts5-direct-recursion-restored.log`). This is a
mechanism kill-switch, not a pristine-HEAD baseline. No temporary switch
remains. Formatting, lint, source typechecking, LOC/function budgets and
`git diff --check` pass; no new budget allowance was required.
Sibling dependency ordering remains necessary before the actual factory can
reach this new recursive-call support. Full factory runtime remains unproven
beyond the earlier 0/3 measurement.

### Shared sibling declaration ordering (2026-09-08, uncommitted)

IR selection and lowering now use the same checker-backed declaration ordering.
Each contiguous function-only run is ordered by exact sibling symbol references;
shorthand function values count, type-only references do not. No declaration
crosses an executable statement. Original nodes are preserved. Missing
declaration identity, duplicate implementations and mutual recursion retain
the source order; direct self edges stay with the self-recursion support above.
An explicit stack orders dependencies without recursive graph traversal.
Only signature-only overloads with their exact implementation in the same run
are erased. The IR-first nested-executable guard now recognizes these bodyless
declarations as non-executable after enclosing selector admission.

Verification: **53/53 across five files** pass
(`.tmp/ts5-sibling-order-final-tests.log`), including a 1,200-function ordering
chain, shadowed parameters, executable barriers, mutual recursion, paired and
unpaired overloads, closure captures, recursion and consumer-driven barrels.
New runtime tests require IR-only body emission, zero imports and result 42.
The overload runtime test initially exposed the IR-first guard above; the guard
was fixed rather than weakening its no-legacy assertion. An initial source
typecheck rejected an unjustified Statement-array cast; a type-guard filter
replaced it and the subsequent source typecheck passed.

The factory run completed in **167,507 ms**, producing the same valid standalone
**63,780,391-byte zero-import binary** (`.tmp/ts5-factory-sibling-order.log`).
The parenthesizer advances from the sibling call-order failure to
**expr-ident-not-in-scope:Identifier**. NodeFactory has that same coarse arm.
The 662 ledger rows still contain **0 IR bodies and 633 legacy bodies**;
runtime remains **0/3**. This run preceded the final bodyless-overload IR-first
guard correction; it is not an execution claim for either factory function.
Next diagnosis must identify the exact identifier and its binding authority.

Removing only sibling ordering makes the closure runtime control fail (0/1,
six filtered, `.tmp/ts5-sibling-order-disabled.log`). This is a mechanism
kill-switch, not a pristine-HEAD baseline. The temporary early return is
removed and the ordering is restored; all **7/7** sibling-order tests pass
again (`.tmp/ts5-sibling-order-restored.log`). Final source typechecking,
formatting, lint, LOC/function budgets and `git diff --check` pass.

### Checker-backed const enum values in IR (2026-09-08, uncommitted)

The exact identifier trace confirms the preceding scope refusals name erased
enum bindings: `SyntaxKind` in parenthesizerRules, and `NodeFactoryFlags`,
`TransformFlags` and `SyntaxKind` in nodeFactory
(`.tmp/ts5-factory-identifier-trace.log`). The temporary production trace is
removed. Shared `constEnumValue` now requires a checker-proven const enum
receiver and static identifier/namespace chain before reading its constant
value. Numeric and string values use the same IR literal producers as source
literals. Ordinary runtime enums, variable aliases, calls/getters/casts as
receivers, optional access and nonliteral computed access are not folded.
No enum runtime storage or legacy emitter support is added.

Two multi-source safety consumers also needed exact erased-value evidence:
the import-use walker ignores a certified constant access, and imported-name
collection now distinguishes a resolved module with only erased exports from
an unresolved callable surface. Runtime-valued exports retain the previous
conservative behavior; merged runtime flags do not qualify as erased.
The namespace-import test exposed this distinction: the old scan marked every
function as cross-file when a fully resolved namespace had zero functions.

The initial focused regression set passes **33/33 across three files**
(`.tmp/ts5-const-enum-regressions.log`), including numeric/string/zero/computed
constants and named/namespace imports, with actual zero-import execution.
The tests require IR body emission, not IR-first routing. Disabling only the
constant resolver makes both imported-enum controls fail (0/2, eight filtered,
`.tmp/ts5-const-enum-disabled.log`). This is mechanism attribution, not a
pristine-HEAD baseline. The temporary switch is removed. A function-budget
failure at `lowerExpr` was addressed by extracting shared constant lowering,
not granting growth. The existing module-consumer predicate was also extracted
to avoid expanding the large selector function. The expanded post-extraction
runtime regression set passes **51/51 across five files**
(`.tmp/ts5-const-enum-final-regressions.log`). The subsequent affected
constant/Map-consumer tests pass **15/15 across two files**
(`.tmp/ts5-const-enum-module-consumer.log`). Final source typechecking,
formatting, lint, function-budget and diff-whitespace checks pass; the LOC
budget also passed before the size-reducing extractions. No new allowance
was added. There are no pending factory workers or temporary production traces.

The real factory run completed in **154,093 ms** with a valid standalone
**63,780,391-byte zero-import binary** (`.tmp/ts5-factory-const-enum.log`). The
parenthesizer now reaches **nested-function-return-type-missing**; nodeFactory
still has an identifier-scope refusal. The ledger remains **662 rows, 0 IR
bodies, 633 legacy bodies**, with **0/3 runtime**. This run preceded the
namespace-only cross-file guard correction and literal-helper extraction.
Next diagnosis: identify the nested declaration whose inferred signature is
not available after dependency ordering, and inspect its exact oracle facts.

### Optional Expression boundary and first-class undefined prerequisite (2026-09-08, uncommitted)

The real trace identifies **binaryOperandNeedsParentheses** as the missing
signature (`.tmp/ts5-factory-missing-signature.log`): its fourth parameter is
required but typed **Expression | undefined**, not an optional parameter.
The original pruned graph oracle still reports precise number-enum, Expression,
boolean and undefinable Expression facts, with a boolean result
(`.tmp/ts5-parenthesizer-signatures.log`). This is a representation/inference
gap, not lost checker types. The next helper `parenthesizeBinaryOperand` also
has an optional Expression parameter, which introduces an additional arity
requirement. Existing signature planning and source-carrier evidence reject
these unions. Do not equate undefined with a raw null GC reference: existing
strict null/undefined tests and source argument bridges need preserved meaning.

Added the prerequisite to materialize an ambient `undefined` expression using
the existing canonical undefined provider and boxed dynamic carrier. Checker
`isUndefinedSymbol` proves the binding; a same-named parameter or missing
checker does not qualify. Selection requires the dynamic runtime capability.
Explicit expressions and uninitialized locals now share one producer helper.
No new singleton, host import in standalone, or legacy emission arm is added.

**33/33 across four files** pass (`.tmp/ts5-undefined-value-regressions.log`),
including explicit initialization/assignment, strict undefined versus null,
parameter shadowing, existing uninitialized/captured locals in both gc and
standalone, logical assignments and const enums. The new standalone tests
execute the IR body with zero imports and return 42. The provider currently
defers IR-first sealing: tests explicitly record both legacy and IR body
emission with `r2Withdrawal: unsealed-component`. This is IR overlay support,
not an IR-first claim. Early fixtures using explicit any annotations and
dynamic typeof exposed separate unsupported paths; the final value tests use
inferred locals and strict tag comparisons. Those broader paths remain open.

The signature trace worker finished in **159,600 ms**, with the same valid
63,780,391-byte, zero-import binary and **0/3 runtime**; this predates the
undefined expression change. The new producer does not by itself admit
Expression | undefined signatures. Next work remains explicit union carrier
planning and argument/guard semantics, followed by optional-parameter calls.

Disabling the ambient proof makes both new value controls fail (0/2, three
filtered, `.tmp/ts5-undefined-value-disabled.log`). This is a mechanism
kill-switch, not a pristine-HEAD baseline. The proof is restored; no temporary
production switch or trace remains.

The restored value suite passes **5/5** (`.tmp/ts5-undefined-value-restored.log`).
Final source typechecking, formatting, lint and `git diff --check` pass;
LOC/function budgets passed without a new allowance.

### IR optional reference union arguments (2026-09-08, uncommitted)

New work remains in shared IR signature planning and IR call lowering, not the
legacy direct emitter. The backend carrier provider explicitly opts into boxed
object/class unions with null or undefined. Plain oracle consumers retain their
refusal. Nested direct and closure calls use the existing canonical IR boxing
operation; no new runtime representation or legacy codegen arm was added.

`issue-1058-ir-reference-union.test.ts` passes **5/5**: capability refusal/control,
direct and closure calls distinguishing object/null/undefined, separately boxed
object identity, and guarded field access. Each runtime test checks emitted IR,
zero imports and actual results. These are not assertions of IR-first execution.
Source typechecking, lint and LOC/function budgets pass without a new allowance.
Evidence: `.tmp/ts5-reference-union-fields.log`,
`.tmp/ts5-reference-union-tsc.log`, `.tmp/ts5-reference-union-func.log` and
`.tmp/ts5-reference-union-loc.log`.

The real standalone factory probe completed in **161,938 ms**: valid
**63,780,391-byte** Wasm, **zero imports**, **662 outcome rows**, **0 IR bodies**,
**633 legacy bodies**, and **0/3 runtime checks passing**. The parenthesizer's
selection boundary moved from missing nested signature to
`switch-case-test-nonliteral:PropertyAccessExpression`. Node factory still stops
at `expr-ident-not-in-scope:Identifier`. Evidence:
`.tmp/ts5-factory-reference-union.log`. Compilation is not runtime acceptance.

The combined reference-union, inferred-closure and undefined-value regression run
passes **23/23 across 3 files**
(`.tmp/ts5-reference-union-regressions-final.log`). Formatting and
`git diff --check` also pass after formatting the new field-access test.

Next: reuse the checker-proven const-enum value resolver for IR switch cases.
Required union arguments are distinct from optional-parameter arity, which remains
unsupported here. Dynamic-to-physical argument conversion, concrete object return
boxing, and actual TypeScript Node field access are not proven by this slice.
The full TypeScript unit suite and self-hosting goal remain incomplete.

### IR const-enum switch cases (2026-09-08, in progress)

Addressing the measured parenthesizer selection boundary using a shared
`switch-case-value.ts` proof for selector and builder. Existing literal cases
and checker-proven erased enum values use the existing numeric/string dispatch
lowering. Runtime enum reads are not folded. Initial validation passes **14/14**
across existing const-enum and new switch tests; the wider switch regression run
passes **76/76 across 3 files**. The final new suite passes **5/5**, including an
additional proof control for absent checker evidence, runtime enum and variable
alias refusal, zero and empty-string values. Runtime coverage checks actual
values and IR emission for numeric/string duplicate cases, default placement,
fallthrough and named/namespace imports, with zero standalone imports.
These assertions do not claim IR-first execution.

Source typechecking, scoped lint, formatting, `git diff --check` and both size
gates pass without new allowances. Logs: `.tmp/ts5-const-enum-switch-tests.log`,
`.tmp/ts5-const-enum-switch-regressions.log`,
`.tmp/ts5-const-enum-switch-final.log`, and
`.tmp/ts5-const-enum-switch-{tsc,func,loc}.log`.

The real factory probe completed in **163,285 ms**, producing valid
**63,780,391-byte** standalone Wasm with **zero imports**, **662 outcome rows**,
**0 IR bodies**, **633 legacy bodies** and **0/3 passing runtime checks**
(`.tmp/ts5-factory-const-enum-switch.log`). The parenthesizer now stops at
`tail-switch-falls-through:SwitchStatement`; node factory retains its identifier
scope refusal. This advances selection, not factory runtime acceptance.

Disabling only the two enum-resolver calls in the new shared switch helper makes
all **4/4 runtime positives fail** (one proof test filtered out), demonstrating
that they depend on this mechanism rather than silently passing via fallback
(`.tmp/ts5-const-enum-switch-disabled.log`). The production calls are restored;
the restored suite passes **5/5** (`.tmp/ts5-const-enum-switch-restored.log`),
with scoped lint and `git diff --check` also passing.

Next inspect tail-switch completion. The source's `binaryOperandNeedsParentheses`
ends in a switch over `compareValues(...)` with all three `Comparison` enum cases
but no default. The current selector requires an explicit default regardless of
checker exhaustiveness. Do not simply treat annotations as runtime proof or add
an unreachable default: preserve JavaScript's unmatched-path semantics and align
the selector, inferred result representation and builder's tail handling.

### IR tail-switch undefined completion (2026-09-08, in progress)

Implementing boxed inferred results for nested functions ending in a switch
without a default. This preserves the actual unmatched-path undefined value
even when TypeScript treats the enum cases as exhaustive. The shared signature
provider must explicitly support implicit undefined results; selector admission
uses that same dynamic result plan, and IR lowering materializes the canonical
undefined singleton on fallthrough. No legacy direct emitter change.

Initial runtime suite passes **5/5**; the wider regression run passes **67/67
across 4 files** (tail-switch completion, inferred closures, reference unions and
existing switch/control-flow tests). Final new suite passes **7/7**, adding
capability refusal/positive proof and break/empty-last-case completion. Runtime
checks cover numeric zero, false, empty strings, other matched values and actual
undefined for unmatched inputs, through direct nested, address-taken nested and
arrow calls. Each runtime fixture asserts emitted IR and zero module imports,
not IR-first execution. Logs: `.tmp/ts5-tail-switch-undefined.log`,
`.tmp/ts5-tail-switch-regressions.log`, `.tmp/ts5-tail-switch-final.log`.
Source typechecking, scoped lint, formatting, diff checking and both size gates
pass without new allowances (`.tmp/ts5-tail-switch-{tsc,func,loc}.log`).
Fully annotated return
signatures are not widened by this inference path; returned callback signature
propagation and other implicit-return statement shapes are not proven here.

The real factory run completed in **171,868 ms** with valid **63,780,391-byte**
standalone Wasm, **zero imports**, **662 outcome rows**, **0 IR bodies**,
**633 legacy bodies**, and **0/3 runtime checks passing**
(`.tmp/ts5-factory-tail-switch-undefined.log`). The parenthesizer's refusal moved
past tail-switch completion to `nested-function-return-type-missing`; the node
factory still has its identifier-scope refusal. Identify the exact next nested
declaration before widening signatures further. The source contains optional
parameters and callback-valued returns that remain separate proof obligations.

Attribution: disabling only the backend's implicit-undefined-return capability
makes the numeric runtime positive fail (**0/1**, six filtered out;
`.tmp/ts5-tail-switch-disabled.log`). The capability is restored, with no
production kill switch remaining. The restored suite passes **7/7**
(`.tmp/ts5-tail-switch-restored.log`); final formatting, scoped lint and
`git diff --check` pass.

### Next signature diagnosis and optional-argument audit (2026-09-08, in progress)

The diagnostic run `.tmp/ts5-factory-next-signature.log` identifies
`parenthesizeBinaryOperand(binaryOperator: SyntaxKind, operand: Expression,
isLeftSideOfBinary: boolean, leftOperand?: Expression)` as the next missing
signature. Temporary declaration-name instrumentation has been removed.

If optional arguments are confirmed, `IrClosureSignature.defaultParamStart` is
not a drop-in representation: its readers pad omitted numeric expression-default
arguments with a reserved sentinel, check exact default plans during closure
construction, compare signatures, reject unsupported object-method/class-field
plans and emit JavaScript function length. An optional TypeScript parameter has
no runtime expression default and does not reduce function length. A separate
minimum call arity must preserve those semantics, pad with canonical undefined,
and be checked by signature equality, both direct and closure call lowerers,
selector callable projections and unsupported consumers. Current nested direct
calls require exact arity; closure calls only support the expression-default
suffix.

Implementation now adds separate `optionalParamStart` signature metadata.
Only an explicitly capable provider plans a trailing optional suffix; these
parameters use boxed dynamic values. Signature equality distinguishes optional
from exact arity, selector projections carry minimum/maximum arity, and direct
and closure calls pad omitted optional arguments with canonical undefined.
Concrete primitive arguments use existing tagged boxing; dynamic refinements
are accepted by the shared assignability relation. Expression-default metadata
and emitted function length remain unchanged. Object-method/class-field plans
that cannot handle this calling convention explicitly refuse it.

The initial object direct/closure tests pass **2/2**, while a numeric test exposed
a missing concrete-to-dynamic argument box. After that fix, runtime positives
pass **3/3** (`.tmp/ts5-optional-arguments-boxed.log`). The wider run is **22/23
across 3 files**: the new function-length runtime test retains a failure because
IR property access on closure `.length` is unsupported, not because the new
metadata reduces length (`.tmp/ts5-optional-arguments-regressions.log`).
Capability and signature-equality controls pass. This is not a green full suite.

An ordinary, fully annotated non-optional closure produces the same `.length`
IR property-access refusal, valid zero-import fallback Wasm and actual value 2
(`.tmp/ts5-ordinary-length-control.log`). This is a same-worktree shape control,
not a pristine-HEAD baseline. The optional length test retains its IR-positive
assertion; it is not skipped or weakened. Expression-default closure ownership
regressions pass **8/8** (`.tmp/ts5-optional-default-regressions.log`). Source
typechecking, scoped lint, diff checking and both size gates pass without new
allowances (`.tmp/ts5-optional-arguments-final-{tsc,func,loc}.log`).

The real factory run completes in **158,725 ms**, with valid **63,780,391-byte**
standalone Wasm, **zero imports**, **662 outcome rows**, **0 IR bodies**,
**633 legacy bodies**, and **0/3 runtime checks passing**
(`.tmp/ts5-factory-optional-arguments.log`). Parenthesizer selection advances to
`nested-function-param-type:UnionType`; node factory retains its scope refusal.
Next inspect fully annotated nested declarations: the shared inference entry
currently bypasses them even if a parameter is an optional-reference union.
The source's `parenthesizeRightSideOfBinary` has a required Expression-or-undefined
parameter and explicit Expression return. Confirm the exact next declaration
before broadening this bypass. Closure `.length` remains an additional open IR
property-read boundary.

Attribution: disabling only `supportsOptionalArguments` makes both optional-object
runtime positives fail (**0/2**, three filtered out;
`.tmp/ts5-optional-arguments-disabled.log`). The capability is restored. The
restored new suite is **4/5**, with only the documented closure-length IR claim
failure (`.tmp/ts5-optional-arguments-restored.log`). That test now verifies the
actual zero-import fallback value 2 before checking IR emission, so the value is
measured even while the IR route remains unsupported. Final formatting and
`git diff --check` pass; no diagnostic or kill switch remains in production.

### Annotated reference signatures (2026-09-08, in progress)

Three focused runtime tests reproduce the fully annotated signature bypass
(**0/3**, `.tmp/ts5-annotated-reference-before.log`): direct and closure calls
through an aliased reference-or-undefined parameter, plus an explicitly annotated
optional numeric parameter. Shared signature planning now checks whether a fully
annotated declaration requires a supported boxed reference boundary or optional
argument plan before bypassing it. Ordinary annotated scalar signatures retain
their existing path. The optional-reference fact predicate is shared with the
actual position planner; no legacy codegen change. The same three tests now
pass **3/3** (`.tmp/ts5-annotated-reference-after.log`). The real diagnostic run
confirms `parenthesizeRightSideOfBinary`, parameter `leftSide: Expression |
undefined`, as the exact refusal (`.tmp/ts5-factory-annotated-signature.log`).
Temporary diagnostic instrumentation has been removed.

The expanded suite initially passed **30/31 across 4 files**: its union-result
test exposed strict equality between a boxed result and a concrete object
(`.tmp/ts5-annotated-reference-regressions.log`). Extracted the existing bound
reference boxing predicate from nested call arguments and reused it only for
strict dynamic equality. Unbound raw references still refuse; loose equality
and arithmetic retain the old conversion path. Source operands are already
evaluated before boxing and the canonical equality runtime observes identity.
The new result test checks both operand orders, same-object equality and a
distinct object. The final expanded suite passes **31/31 across 4 files**
(`.tmp/ts5-annotated-reference-final.log`), including inference, reference unions
and expression-default closure ownership. No IR-first claim is made by the new
runtime tests; they assert actual values, emitted IR and zero module imports.

Equality regressions pass **27/27 across 3 files**
(`.tmp/ts5-annotated-equality-regressions.log`). Final source typechecking,
scoped lint, formatting, diff checking and both size gates pass without new
allowances (`.tmp/ts5-annotated-reference-final-{tsc,func,loc}.log`).

The factory probe started after the annotation fix but before the strict-equality
follow-up. It completed in **160,826 ms** with valid **63,780,391-byte** standalone
Wasm, **zero imports**, **662 outcome rows**, **0 IR bodies**, **633 legacy bodies**
and **0/3 runtime checks passing** (`.tmp/ts5-factory-annotated-reference.log`).
The parenthesizer advances to `nested-function-param-shape:Parameter`; node
factory retains its identifier-scope refusal. Identify the exact next parameter
and whether its full signature could be planned before further arity changes.

Attribution: restoring only the unconditional fully-annotated bypass makes all
three annotated-call positives fail (**0/3**, two tests filtered;
`.tmp/ts5-annotated-reference-disabled.log`). The carrier-aware gate is restored,
with no production diagnostic or kill switch remaining. The restored new suite
passes **5/5** (`.tmp/ts5-annotated-reference-restored.log`); final formatting and
`git diff --check` also pass.

### Result-only physical carrier evidence (2026-09-08, in progress)

The exact refusal is `parenthesizeLeftSideOfAccess`: its optional boolean is
supported, but the signature planner lacks a physical carrier for its
`LeftHandSideExpression` result (`.tmp/ts5-factory-next-parameter.log`). The
30-file source-graph probe found **0 eligible top-level parameter witnesses and
0 eligible top-level result witnesses** for that type
(`.tmp/ts5-parenthesizer-result-evidence.log`). Simply adding top-level results
would not address this boundary.

Added read-only result evidence from exact registered source function
declarations, including nested functions. Unlike parameters, the single result
has no hidden-capture offset. Generic/async/generator functions remain excluded;
declaration, inventory, session, handle, function and exact struct allocation must
agree. Multiple, scalar, missing or conflicting physical result witnesses refuse
the key. Result-only evidence supplements absent parameter keys, never overrides
or redeems a present conflicting parameter entry. Binding uses a separate stable
source-result role while retaining existing provisional ownership checks and
revalidation; original parameter role/label remain unchanged.

Carrier tests pass **18/18** (`.tmp/ts5-result-carrier-tests.log`), including
nested hidden-capture isolation, layout/nullability/scalar/arity conflicts,
parameter-conflict non-redemption, and allocation replacement before publication.
The combined run is **25/26 across 3 files**
(`.tmp/ts5-result-carrier-regressions.log`). All evidence and symbolic-carrier
tests pass; the new end-to-end class identity test remains IR-rejected. Focused
diagnosis shows its nested declaration has **no registered handle or function
allocation at selection time**, not an incompatible result layout
(`.tmp/ts5-result-carrier-runtime-witness.log`); selection reports missing nested
signature (`.tmp/ts5-result-carrier-runtime-diag.log`). Keep the runtime-positive
assertion and address allocation timing in future work; do not fabricate evidence
or weaken the test. Temporary diagnostics were removed.

The real factory run **does advance** past the carrier/parameter-shape boundary
to `logical-value-unsupported` in `createParenthesizerRules`. It completed in
**162,230 ms**, with valid **63,780,391-byte** standalone Wasm, **zero imports**,
**662 outcome rows**, **0 IR bodies**, **633 legacy bodies**, and **0/3 runtime
checks passing** (`.tmp/ts5-factory-result-carriers.log`). Node factory retains its
identifier-scope refusal. Thus this result evidence is available in the factory
workflow even though the isolated fresh nested-allocation case remains open.
Next identify the exact logical-value selection reason in the real parenthesizer.

Source typechecking, scoped lint, formatting, diff checking and both size gates
pass without new allowances (`.tmp/ts5-result-carrier-{tsc,func,loc}.log`).
Attribution: disabling only result-evidence supplementation makes its positive
control fail while the original parameter-evidence control still passes
(**1/2**, sixteen filtered; `.tmp/ts5-result-carrier-disabled.log`). Restoring it
returns the evidence suite to **18/18** (`.tmp/ts5-result-carrier-restored.log`).
Final formatting, scoped lint and `git diff --check` pass. No production
diagnostic or kill switch remains.

### Mixed truthiness in IR conditions (2026-09-08, in progress)

The real refusal is the `parenthesizeLeftSideOfAccess` condition combining
`isLeftHandSideExpression(...)`, an optional arguments array and `optionalChain`
(`.tmp/ts5-factory-logical-diagnosis.log`). Selector treated logical operators as
value-producing boolean-only expressions even in condition position.

Condition selection now recursively checks logical operands through the existing
condition-leaf gates. A shared IR condition lowerer short-circuits each operand
and uses the existing ToBoolean operations. Wired into if, loops and conditional
expressions; value-position `&&`/`||` retain their old representation rules.
Right-side instructions live only in the selected branch, and encoding facts
join across executed/skipped paths. No legacy direct-codegen change.

Initial tests pass **4/5**: numeric/string/negated conditions handle 0, -0, NaN
and nonzero values; mixed loop and ternary conditions also pass. The effect-count
fixture exposed an independent unsupported capture of a sibling nested function
declaration. It now uses an arrow closure binding to isolate the intended
short-circuit behavior without removing the effect-count assertion. The wider
run then passes **66/66 across 3 files**, including existing truthiness and
tail-switch tests (`.tmp/ts5-logical-condition-regressions.log`). The final new
suite passes **6/6**, adding both AND and OR effect-count controls
(`.tmp/ts5-logical-condition-final.log`). Runtime assertions require emitted IR,
zero module imports and actual results; they do not claim IR-first execution.

Typechecking, scoped lint, formatting, diff checking and both size gates pass
without new allowances (`.tmp/ts5-logical-condition-{tsc,func,loc}.log`).
Temporary source diagnostics were removed.

The factory run completes in **172,130 ms**, with valid **63,780,323-byte**
standalone Wasm, **zero imports**, **662 outcome rows**, **0 IR bodies**,
**633 legacy bodies**, and **0/3 runtime checks passing**
(`.tmp/ts5-factory-logical-condition.log`). Parenthesizer selection advances to
`body-return-context:ReturnStatement`; node factory retains its scope refusal.
Next locate the exact return context and its control-flow obligation rather
than treating this selection advance as runtime acceptance.

Attribution: bypassing only `lowerConditionExpression` back to ordinary value
lowering makes the three mixed-condition positives fail (**0/3**, three filtered;
`.tmp/ts5-logical-condition-disabled.log`). The condition lowerer is restored;
no production diagnostic or kill switch remains. The restored condition suite
passes **6/6** (`.tmp/ts5-logical-condition-restored.log`), and final formatting
and `git diff --check` pass.

### Partial returns in structured guards (2026-09-08, in progress)

The real parenthesizer refusal is a return of
`factory.restoreOuterExpressions(expression, updated,
OuterExpressionKinds.PartiallyEmittedExpressions)` with return-admitting depth
0 and barrier depth 0 (`.tmp/ts5-factory-return-diagnosis.log`). A partial guard
does not terminate on every path, so it enters the existing structured body-if
route, whose selector formerly rejected returns outside loops/switches.

Three focused tests reproduce the refusal (**0/3**;
`.tmp/ts5-guard-return-before.log`). Scoped guard-body admission now enables the
existing IR early-return instruction for normal partial guards and non-tail
if/else branches. Generator and cleanup barriers remain unchanged, and the
temporary depth increment is restored in finally. This is a selector change,
not a new legacy lowering path. Tests check all branch outcomes and that
continuation side effects execute only on fallthrough paths. Wider regressions
pass **22/22 across 4 files** (`.tmp/ts5-guard-return-regressions.log`). Final
focused suite passes **4/4**, including a finally barrier control that remains
IR-rejected and proves cleanup effects on returned and fallthrough paths
(`.tmp/ts5-guard-return-final.log`). New positive tests assert actual values,
emitted IR and zero imports, not IR-first execution. Source typechecking,
scoped lint, formatting, diff checking and both size gates pass without new
allowances (`.tmp/ts5-guard-return-{tsc,func,loc}.log`). Temporary diagnostics
were removed.

The factory run completed in **157,699 ms** with valid **63,780,323-byte**
standalone Wasm, **zero imports**, **662 outcome rows**, **0 IR bodies**,
**633 legacy bodies** and **0/3 runtime checks passing**
(`.tmp/ts5-factory-guard-return.log`). Parenthesizer selection advances to
`nested-function-param-type:TypeOperator`; node factory retains its scope
refusal. Next identify the exact parameter annotation and required storage
representation before extending signature admission.

Attribution: disabling only the scoped guard return-depth increment makes all
three positive guard tests fail (**0/3**, one filtered out;
`.tmp/ts5-guard-return-disabled.log`). The scoped increment/decrement is restored;
the restored suite passes **4/4** (`.tmp/ts5-guard-return-restored.log`). Final
formatting and `git diff --check` pass. No production diagnostic or kill switch
remains.

### Readonly array signatures and IR-first direction (2026-09-08, in progress)

User direction: put new work in IR/shared planning where possible, not the
legacy direct codegen path. Keep legacy fallback distinct from evidence of
IR execution; no new legacy implementation was added for array signatures.

The diagnostic identifies `parenthesizeConstituentTypesOfUnionType` and its
`members: readonly TypeNode[]` parameter
(`.tmp/ts5-factory-array-diagnosis.log`). The temporary production trace is
removed. Shared signature-position evidence now projects exact array element
identity; the inferred IR closure planner uses an explicit array capability
and constructs vector signatures only for supported element representations.
The codegen-side change supplies the capability to shared IR planning.

Focused verification passes **15/15 across 2 files**: 12 signature-position
tests and 3 array runtime tests (`.tmp/ts5-array-signature-tests.log`). The
runtime cases cover direct and aliased calls with readonly numeric array
parameters plus a readonly array result. Each requires emitted IR, zero
imports and the actual value 42. This does not yet prove TypeNode object-array
support or factory runtime success.

Expanded tests pass **34/34 across 4 files**
(`.tmp/ts5-array-signature-regressions.log`), including explicit capability and
oracle identity controls, and refusal of unresolved object elements, nested
arrays, callback arrays and tuples. A subsequent optional-array planning
control passes **1/1**, four filtered out, and retains the dynamic boundary
needed for omitted arguments (`.tmp/ts5-array-optional-before.log`). Disabling
only the production array capability makes all three numeric-array runtime
positives fail their IR-emission assertions (**0/3**, two filtered out;
`.tmp/ts5-array-signature-disabled.log`); the capability is restored, and the
final suite passes **35/35 across 4 files**
(`.tmp/ts5-array-signature-restored.log`). Source
typechecking, scoped lint, function and LOC gates pass with no new allowances
(`.tmp/ts5-array-signature-{tsc,func,loc}.log`).

The fresh factory run completes in **158,171 ms**, validates a
**63,780,323-byte** standalone module with **zero imports**, and records
**662 rows / 0 IR bodies / 633 legacy bodies / 0/3 runtime checks**
(`.tmp/ts5-factory-array-signatures.log`). Parenthesizer selection advances from
`nested-function-param-type:TypeOperator` to
`nested-function-param-type:UnionType`; node factory retains
`expr-ident-not-in-scope:Identifier`. The source-only 30-file oracle probe
confirms exact `TypeNode` element identity and a separate `NodeArray<TypeNode>`
class result, not an intrinsic array
(`.tmp/ts5-parenthesizer-array-evidence.log`). Next identify the exact union
parameter and its required representation; do not treat crossing a selector
boundary as runtime success.

### Multiple-reference union signatures (2026-09-08, in progress)

Following array signature support, the real source contains non-optional
`TypeNode | NamedTupleMember` parameters in the tuple parenthesizer and
`hasJSDocPostfixQuestion`. The 30-file source oracle probe reports two class
parts, not a single optional reference
(`.tmp/ts5-parenthesizer-union-evidence.log`). A temporary trace identifies the
exact refusal as `hasJSDocPostfixQuestion(type: TypeNode | NamedTupleMember)`
(`.tmp/ts5-factory-union-diagnosis.log`); the trace is removed.

The shared planner now admits unions with multiple object/class parts via its
existing explicit tagged-reference capability. It does not merge physical
layouts or infer a common raw reference type. Mixed primitive/reference
storage remains refused. Three focused tests initially fail **0/3**
(`.tmp/ts5-multi-reference-before.log`), then pass with the shared gate widened.
The expanded four-file suite passes **19/19**, including distinct-layout
direct and aliased argument/result identity, field reads, and null/undefined
distinction (`.tmp/ts5-multi-reference-final.log`). All runtime positives
require IR emission, zero imports and actual expected values. No new legacy
direct codegen implementation was added.

A recursive discriminated-union test initially hits the separate
`vardecl-typenode:TypeReference` restriction on explicitly typed local object
variables (`.tmp/ts5-multi-reference-recursion-diagnosis.log`). Passing the same
nested object directly into the typed parameter instead exercises recursion;
the final focused file passes **5/5**
(`.tmp/ts5-multi-reference-recursion-contextual.log`). This does not resolve the
local annotation restriction. Source typechecking, scoped lint and both size
gates pass (`.tmp/ts5-multi-reference-{tsc,func,loc}.log`).

The factory remeasurement completes in **157,141 ms**, validates the
**63,780,323-byte** standalone module with **zero imports**, and records
**662 rows / 0 IR bodies / 633 legacy bodies / 0/3 runtime checks**
(`.tmp/ts5-factory-multi-reference.log`). Parenthesizer advances from the
identified union parameter to `nested-function-param-type:TypeOperator`;
node factory retains `expr-ident-not-in-scope:Identifier`. Identify this next
readonly annotation before extending vector element storage; the source has
a readonly array of `TypeNode | NamedTupleMember`, but the exact new refusal
has not yet been traced.

Attribution: restoring only the former single-optional-reference gate makes
all five new tests fail while all five existing optional-reference tests
still pass (**5/10 overall**, `.tmp/ts5-multi-reference-disabled.log`). The
multi-reference rule is restored; the final four-file suite passes **20/20**
(`.tmp/ts5-multi-reference-restored.log`). No temporary production trace remains.

### Reference-union array elements (2026-09-08, in progress)

After multi-reference signatures, investigate the next readonly-array
annotation. IR vectors currently resolve physical scalar/string element
storage but not the dynamic tagged element type produced by a reference union
signature. Audit construction, layout preparation and reads together; preserve
the packed-array widening guard unless elements are explicitly boxed into the
canonical dynamic representation. Add direct and aliased standalone runtime
tests requiring actual field values, IR emission and zero imports. This work
stays in IR and shared preparation, not legacy direct codegen.

The exact refusal is
`parenthesizeElementTypesOfTupleType(types: readonly (TypeNode | NamedTupleMember)[])`
(`.tmp/ts5-factory-array-union-diagnosis.log`). The temporary trace is removed.
Initial direct/aliased reference-array tests fail **0/2**
(`.tmp/ts5-reference-array-before.log`). Shared signature planning now permits
dynamic elements only when the existing reference-union capability proves that
representation. IR array construction boxes each such element explicitly,
preserves the logical vector type, and uses the canonical dynamic storage
type. Scalar/string construction is unchanged; the packed widening guard is
bypassed only with an explicit dynamic-element plan.

Preparation now accepts this element carrier and includes `dynamic` in the
deterministic depth-major vector ordering (existing leaf relative ordering is
preserved). Dynamic async fulfilled resumes remain refused because they lack
a proved host materializer. Tagged reads preserve the logical element type;
bounds checks use canonical undefined for missing elements and additionally
require an exact numeric-index round trip, rejecting fractional indices and
NaN rather than truncating them into valid elements. The existing indexed
undefined-comparison refusal remains for non-dynamic reads.

Construction/preparation positives pass **2/2**
(`.tmp/ts5-reference-array-prepared.log`). The expanded run initially passes
**100/101 across 4 files**, with only the new indexed-undefined comparison
control refused (`.tmp/ts5-reference-array-regressions.log`). After the
representation-specific comparison fix, bounds/widening regressions pass
**24/24 across 3 files** (`.tmp/ts5-reference-array-bounds.log`). The new tests
cover distinct layouts, direct/aliased calls, array results, element identity,
empty arrays, negative and fractional indices, NaN, infinity, and negative
zero. They require IR emission, zero imports and actual result 42.

The factory run (before the final indexed-undefined comparison follow-up)
completes in **175,425 ms**, validates a **63,780,323-byte** standalone module
with **zero imports**, and records **662 rows / 0 IR bodies / 633 legacy
bodies / 0/3 runtime checks** (`.tmp/ts5-factory-reference-array.log`).
Parenthesizer advances to `tail-if-noelse:IfStatement`; node factory retains
`expr-ident-not-in-scope:Identifier`. Next diagnose the exact trailing guard
and its implicit completion; do not conflate selection progress with a
working compiler.

Attribution: disabling only dynamic-element signature admission makes all
three new runtime tests fail while all five existing numeric-array/planning
controls pass (**5/8 overall**, `.tmp/ts5-reference-array-disabled.log`). The
dynamic-element admission is restored; the final regression suite passes
**122/122 across 6 files** (`.tmp/ts5-reference-array-restored.log`). Final
source typechecking, scoped lint,
formatting, diff checks and size gates pass with no new allowances
(`.tmp/ts5-reference-array-final-{tsc,func,loc}.log`). No production trace or
kill switch remains.

### Trailing guards with undefined completion (2026-09-08, in progress)

The parenthesizer source has exactly one function declaration ending directly
in an if without else: `parenthesizeTypeArguments`, line 668. Its guarded
factory result is annotated `NodeArray<TypeNode> | undefined`; the other path
falls through. Current selector and builder admit this tail only for void
returns, despite shared planning already carrying the optional reference
result as dynamic. Extend the IR structured guard route with canonical
undefined completion and test both returning and fallthrough paths. Preserve
generator/cleanup barriers and avoid a legacy direct-codegen implementation.

The initial tests fail **0/3** (`.tmp/ts5-tail-guard-before.log`). Shared
completion planning now recognizes direct trailing guards as well as switches
without defaults. Selection admits a non-void trailing guard only with a
proved nested dynamic result and checks its body through the scoped
return-admitting helper. Construction emits the existing structured guard
followed by canonical undefined on fallthrough. Fully annotated scalar
signatures keep their existing route; generator and cleanup exclusions stay
in force.

The first expanded run passes **13/14**, exposing a separate concrete-object
return boxing gap (`.tmp/ts5-tail-guard-after.log`). Dynamic return coercion
now reuses the same exact-layout reference boxing helper as call arguments and
strict identity, still refusing unbound raw refs. The suite then passes
**20/20** (`.tmp/ts5-tail-guard-boxed.log`). Final focused regressions pass
**21/21 across 4 files** (`.tmp/ts5-tail-guard-final.log`), covering direct,
aliased and arrow calls, both condition outcomes, an entered guard that falls
through its inner condition, object identity and captured side effects,
capability refusal, existing switch completion and finally-barrier controls.
Every new runtime positive requires emitted IR, zero imports and actual
expected values.

The full factory run completes in **157,482 ms**, validates a
**63,780,323-byte** standalone module with **zero imports**, and records
**662 rows / 0 IR bodies / 633 legacy bodies / 0/3 runtime checks**
(`.tmp/ts5-factory-tail-guard.log`). Parenthesizer clears the body-shape
refusal and now reports `type-resolution-unsupported` with
`object TypeNode TypeReference could not be lowered to IrType.object`.
Here `TypeNode` is part of the diagnostic wording; inspect the actual source
annotation before assuming it names TypeScript's `TypeNode` interface. Node
factory retains `expr-ident-not-in-scope:Identifier`. Next trace this object
annotation resolution and its physical carrier evidence in the shared IR path.

Attribution: disabling only non-void trailing-guard admission makes all four
new runtime cases fail, while the pure planner control and all seven existing
switch tests pass (**8/12 overall**, `.tmp/ts5-tail-guard-disabled.log`). Guard
admission is restored; the restored suite passes **21/21 across 4 files**
(`.tmp/ts5-tail-guard-restored.log`). Source typechecking, scoped lint, formatting, diff and
size gates pass without new allowances
(`.tmp/ts5-tail-guard-final-tsc.log`, `.tmp/ts5-tail-guard-{func,loc}.log`).

### Source object-position carrier resolution (2026-09-08, in progress)

After trailing guards, parenthesizer reaches source signature resolution but
its object annotation cannot be expanded to a finite IR object shape. Trace
the exact annotation and test whether existing source-parameter/result carrier
evidence can supply the same allocator-backed symbolic reference already used
by inferred nested signatures. Do not infer layouts from type names or bypass
physical ABI checks; preserve existing finite-object resolution first. This
is shared IR boundary planning, not new legacy direct codegen.

The diagnostic identifies `ParenthesizerRules` among failed source positions
(`.tmp/ts5-factory-object-position-diagnosis.log`); this is the factory's return
annotation, not TypeScript's `TypeNode` interface. Both temporary production
traces are removed. After finite shape expansion refuses, source position
resolution now consults existing allocator-authenticated parameter/result
carrier evidence by exact checker type key.

The focused recursive `Item` parameter test initially fails **0/1** at source
type resolution (`.tmp/ts5-source-object-position-before.log`). The fallback
advances it to field access. The AST resolver now connects exact symbolic
physical references to existing `object.get` lowering, only when the actual
field storage matches the semantic number/boolean fact. Reference fields and
packed-number widening remain unproved and refused. It resolves the exact
candidate allocation, not a provisional integer index or display-name alias.
Evidence/kernel tests pass **27/27 across 2 files**, including new checks for
missing symbolic identity, replaced allocations and mismatched packed storage
(`.tmp/ts5-source-object-position-evidence.log`).

The new runtime test is **still failing its IR-emission assertion**, not
skipped. Its caller creates `object{value:f64}` while the source callable
expects the registered `Item` reference, so that boundary is not sealed.
Initial wiring produced an unplanned-draft error while lowering a physical
field (`.tmp/ts5-source-object-position-stack.log`). Unscoped lowering now
withdraws with typed `type-resolution-unsupported` when the requested type is
an authenticated but unpublished candidate; it does not publish ownership or
bypass the sealed resolver. Unknown non-candidate references retain invariant
failure. Compilation succeeds again, but the focused function still falls
back (`.tmp/ts5-source-object-position-unsealed.log`). Next fix source-object
construction/call/result compatibility and inspect why the component is not
sealed. This is not yet an end-to-end IR source-object success.

The runtime control now executes before its still-required IR assertion:
it validates the zero-import module and gets **42**, then fails only on
`read.irBodyEmitted` (**8/9 across 3 files**,
`.tmp/ts5-source-object-position-runtime-control.log`). The full factory run
completes in **158,652 ms**, validates a **63,780,323-byte** standalone module
with **zero imports**, and records **662 rows / 0 IR bodies / 633 legacy
bodies / 0/3 runtime checks** (`.tmp/ts5-factory-source-object-position.log`).
Parenthesizer advances to `late-preparation-unsupported`:
`createParenthesizerRules failed final-context IR preparation`; node factory
retains its scope refusal. Trace the final-context rejection next; do not
claim a successful source-object boundary from this movement alone.

The resolver size gate initially flags one added line. Related physical-field
and dynamic-carrier callbacks are now extracted together, preserving their
context and existing behavior rather than adding a budget allowance. Both
size gates pass (`.tmp/ts5-source-object-position-final-{func,loc}.log`).
Post-extraction regressions pass **35/35 across 4 files**
(`.tmp/ts5-source-object-position-final-regressions.log`), excluding the
explicitly recorded failing end-to-end source-object test above. No production
diagnostic or kill switch remains. This slice remains in progress, including
end-to-end attribution once the IR assertion can actually pass.
Final source typechecking, scoped lint, formatting and diff checks pass
(`.tmp/ts5-source-object-position-extracted-tsc.log`).

### Final-context retention diagnosis (2026-09-08, in progress)

The first diagnostic run finds no attempted IR build/patch evidence for
`createParenthesizerRules` when the generic final-context failure is recorded
(`.tmp/ts5-factory-final-preparation-diagnosis.log`). Thus this verdict does
not itself prove an object construction failure: a retention filter can remove
the owner before construction. Trace the exact set mutation and R2 withdrawal
reason before changing ABI construction. Preserve dependency closure and
source identity checks; do not resurrect a removed owner without its required
component.

The completed retention diagnostic traces the removal to
`makeMultiIrSafeSelection` during `compileMultiIrOverlaySource`, not to an
attempted factory body build or an R2 withdrawal
(`.tmp/ts5-factory-retention-diagnosis.log`). Its multi-module filter checks
import use, nested runtime declarations, cross-file boundaries, name/slot
identity, and generic materialization, then closes the blocked dependency
component. The exact triggering predicate/component edge remains to be
isolated; do not bypass these checks based on this stack alone. The run
compiled valid 63,780,323-byte Wasm in 157,479 ms with zero imports, but
**0/3 runtime checks passed** and **0/662 outcome rows emitted IR bodies**
(633 legacy-body rows).

Separately, the small source-object-position witness has an R2 admission
withdrawal of `param-signature-unstable`, followed by the typed refusal
`provisional physical carrier requires a sealed IR component`
(`.tmp/ts5-source-object-r2-diagnosis.log`). This is a different blocker from
the factory's multi-module retention filter. The witness still returns 42
with zero imports, but its required IR-emission assertion fails. Temporary
diagnostic logging was removed after recording these findings.

User direction reaffirmed: implement new support in IR or shared planning,
not the legacy direct-codegen path. The next investigation is multi-module
IR retention with exact ownership and boundary evidence intact.

The predicate-level run (`.tmp/ts5-factory-multi-filter-diagnosis.log`) now
identifies **two independently true guards** for `createParenthesizerRules`:
cross-file target with conservative standalone callers and no program-callable
boundary, plus nested runtime declarations. It has exactly one registered
function with the expected name; collision, import alias, synthetic-name
collision, unsupported import use, generic materialization, and type-parameter
guards are all false. The owner was not already blocked by imported-call
checks. This rules out simply relaxing a name-collision check.

A new multi-module captured factory witness returns 42 with zero imports but
fails required IR emission (`.tmp/ts5-multi-module-factory-before.log`). Work
now checks whether already-proved program-callable components can own nested
functions without the older flat-name exclusion, with distinct modules using
the same nested function name as a collision control. Unproved cross-file
boundaries must remain excluded; this alone will not complete the real factory.

The completed factory run remains valid/zero-import/63,780,323 bytes,
158,985 ms, **0/3 runtime checks**, **0/662 IR-emitting outcome rows**.
The expanded witness has **0/2 tests passing**: both validate Wasm, have no
imports, and return 42 before failing their explicit IR-emission assertions.
Using a local `const add = makeAdder(40)` exposes the imported planner's
separate explicit refusal: `callable target ... returns a callable value`.

An experiment admitting nested declarations only when
`hasProgramCallableBoundary` is true still left **0/2 passing**. Diagnostic
evidence confirms that the scalar `left`/`right` owners DO have this boundary;
their aggregate then fails in `src/ir/integration.ts` declaration preflight:
`owner ... contains non-neutral FunctionDeclaration; retaining direct bodies`
(`.tmp/ts5-multi-module-nested-component-diagnosis.log`). This supersedes the
unverified hypothesis that the local dependency graph caused that refusal.
The next required work is explicit nested-function support in component
preflight, including its effects/ownership proof, not just changing the M0
filter. Returning a callable across imports remains a distinct follow-up.

The existing `stages one exact cross-source component` test in
`issue-3525-multi-prepared-callable-bindings.test.ts` passes **1/1 selected**
(51 unselected), proving the basic route is active on the same harness
(`.tmp/ts5-multi-module-callable-positive-control.log`). The ineffective gate
experiment and all temporary tracing were removed; no new legacy codegen
support or relaxed safety gate remains from this investigation.

Component allocator investigation (in progress):
`atomicDeferredComponentPreflightFailure` and the independent post-build
`atomicDeferredComponentIsAllocatorNeutral` currently restrict deferred
components to scalar operations. `prepareClosureTransaction` still calls
shared closure-support allocation and derived callable-slot allocation before
opening/sealing the component scopes. Thus allowing nested syntax alone
cannot establish atomic preparation: detached type/function allocation must
be supported first. Do not weaken either gate to claim captured closure support.

The adapter currently validates a complete, unsupported atomic-failure
population and then discards its precise outcomes. Preserve those outcomes
by exact unit ID in each candidate source plan, so the final public report
does not replace the actual refusal with a generic final-context failure.
The existing array-bearing multi-module test is being strengthened to assert
this evidence for all five owners, including duplicate source names, while
retaining its allocator-read-only and clean-fallback checks.

Implemented refusal preservation in the IR multi-module adapter. The first
attempt (writing only the early candidate's source plan) still failed the
new assertion: late overlays build new plans. Exact unsupported outcomes now
live in the private callable-attempt census, keyed by structural unit ID and
guarded by its existing graph/identity currentness checks. The late withdrawal
copies only source-local attempted failures into the new source plan and
preserves any earlier refusal. No executable body, type, import, or provider
is published by this evidence transfer. Atomic failure-population validation
was extracted intact before recording; foreign/duplicate/pending-artifact
failures still throw, not become ordinary fallback records.

Validation:

- Strengthened array-refusal test fails before the change with
  `same failed final-context IR preparation`; it now checks the actual
  `contains non-neutral ArrayLiteralExpression` reason for all five owners.
- Focused success/helper-fallback/array-fallback controls: **3/3 pass**.
- Full callable binding suite: **52/52 pass**, restored after attribution
  (`.tmp/ts5-callable-refusal-evidence-restored.log`). The first full attempt
  exhausted the configured 512 MB heap; the successful full runs use the
  repository-supported `VITEST_FORK_MAX_OLD_SPACE_SIZE=2048`, one worker.
- Removing only the late evidence transfer gives **2/3 pass**, failing just
  the new refusal assertion; restoring it restores **52/52**.
- Function/LOC gates pass for 125 changed source files, net +4724 LOC,
  with no new allowance. Formatting, lint, and diff checks pass.
- Source typecheck passes (`.tmp/ts5-callable-refusal-evidence-final-tsc.log`).

The closure-allocation implementation must cover the real shared mutations:
`ClosureStructRegistry` allocates wrapper/subtype definitions and updates
struct-name, reverse-name, and closure-info maps; derived-slot preparation
mints/pushes functions and updates `irUnitFuncMap`. Deferred preparation must
stage those effects and commit them with the existing authenticated receipt,
or abort with every prefix unchanged. Account for derived-unit registration,
ref-cell types, and wrapper-root allocation too. Do not implement this as
snapshot/restore of only `mod.types`, or merely whitelist nested declarations.
Both new captured-factory witnesses remain failing IR-emission requirements;
this evidence fix does not change the last measured real factory's **0/3**.

### Real factory runtime narrowing (2026-09-08, in progress)

The pinned `createNodeFactory` constructs a memoized callback over `factory`
before initializing that binding. Revalidated the existing forward-capture
control in both GC and standalone, explicitly enabling IR and checking zero
standalone imports. Added a closer four-module witness: the memoizer lazily
creates a rules object whose returned named function calls back into the
factory, and executes it twice. Both targets return the expected 84. Combined
base-node factory and lazy-parenthesizer controls pass **17/17 across two
files** (`.tmp/ts5-factory-forward-capture-controls.log`). Therefore a simple
forward capture or generic memoizer explanation is not established; do not
patch capture semantics based on the large factory's null error alone.

Added an uncommitted diagnostic probe at `.tmp/ts5-real-factory-stages.ts`
against the pinned TypeScript source namespace. Its six checks separate
string-literal creation, the original class-expression input, direct
parenthesizer invocation, export-assignment invocation, object-literal
creation, and arrow-function invocation. It retains the real factories and
checks node kinds; this is a diagnostic population, not upstream-suite
completion. The raw-source native import via `tsx` failed during namespace
initialization (`AssertionLevel.None`), before any check. A separate native
control uses the installed TypeScript 5.9.3 bundle (same reported version as
the pinned source); do not describe it as execution of the raw source graph.

The actual pinned source, bundled using the same esbuild approach as the
source-unit harness, also passes **6/6**
(`.tmp/ts5-real-factory-stages-source-native.log`). The first Wasm probe
compiled valid zero-import 60,762,534-byte output in 157,001 ms, but executed
**0 checks**: the standalone worker requires the numeric
`runStandaloneUpstreamTest(index)` export, not its host-lane boolean entry.
Added that exact wrapper before rerunning. Do not count the pre-wrapper
compile as runtime evidence or restart while its worker handle remains live.

The corrected numeric probe is terminal with a compile error (126,029 ms,
no binary): `Maximum call stack size exceeded` at
`src/codegen/ir-inline.ts:1170:25`, in recursive `rewriteBody`. Native bundled
pinned-source checks return **6/6 numeric ones** with the same wrapper.
This is a real-source compilation blocker, not a runtime result. Added a
12,000-region inliner witness requiring a real leaf call replacement and
preservation of the callee body. Replace depth-recursive traversal and
snapshot cloning while preserving existing shared-DAG exclusions, loop
depth, call-site order, and the rule against recursively inlining inserted
instructions during the same pass.

Implemented stack-safe inliner traversal in `src/codegen/ir-inline.ts`:
instruction counting/safety walks, cold-region size accounting, the two-round
loop-hotness propagation, copy-on-write body cloning, and the mutating
call-site walk now use explicit stacks. Rewrite frames retain the current
body/index/loop depth, traverse child bodies in the original order, and
advance past inserted instructions exactly as the former recursive loop did.
No cost rule, growth limit, shared-array exclusion, or runtime provider was
changed. The existing call-site relocation/specialization logic is unchanged.

Validation: the initial depth witness overflows in the hotness walk while
the shared-DAG/ordinary-call control passes (**1/2** before). Expanded block,
loop, and conditional depth witnesses pass **4/4**, each requiring an actual
call replacement and a 12,002-instruction result. Removing only iterative
hotness traversal causes **3 failures / 1 passing control**; restored inliner
and existing semantic/loop-callee tests pass **29/29 across three files**
(`.tmp/ts5-inline-deep-restored.log`). Source typecheck, formatting, lint,
diff checks, and function/LOC budgets pass (126 changed source files,
net +4763 LOC; no new allowance).

Real-source retry is `.tmp/ts5-real-factory-stages-stack-safe.log`, worker
handle 5930. It started only after the previous probe was terminal and the
attribution edit was restored. Keep the six-stage diagnostic separate from
the original three upstream callbacks; neither its compilation nor the
focused inliner results establish TypeScript runtime acceptance.

Retry 5930 is terminal: **compile success**, valid **60,762,625-byte** Wasm,
**zero imports**, 151,327 ms. The corrected real-source diagnostic now runs
and passes **3/6** against **6/6** from the bundled pinned source:

| Check | Standalone result |
| --- | --- |
| String-literal creation | pass |
| Original class-expression input with static property | pass |
| Direct `factory.parenthesizer.parenthesizeExpressionOfExportDefault` | null dereference in its trampoline |
| `factory.createExportAssignment` | same trampoline null dereference |
| Object-literal creation | pass |
| `factory.createArrowFunction` | illegal cast in `createArrowFunction` |

The stack fix therefore removes the measured compile blocker, not the
factory runtime defects. Direct parenthesizer invocation reproduces the null
without the original callback harness or the export-assignment wrapper; the
input node can be constructed and its kind read successfully. Next inspect
the exact parenthesizer trampoline's argument/environment ABI and nominal
node conversion. Do not blame the upstream assertion shim or forward capture
without new evidence. Source-map attribution still points to the trailing
type-arguments declaration, so use actual emitted trampoline instructions
rather than assuming that source line is the failing semantic operation.

After the inliner change, factory controls also pass **17/17**
(`.tmp/ts5-factory-controls-after-inline.log`), giving **46/46 focused checks**
across five files with the 29 inliner checks. The original three upstream
factory callbacks were not rerun in this diagnostic; their last measured
status remains **0/3**. No worker from this turn remains live.

### IR-first direction and parenthesizer handoff (2026-09-09)

### Enum-formatting boundary investigation (2026-09-09, in progress)

Numeric-method collision investigation: new focused test registers a Version
class with toString alongside a runtime `number.toString(radix)` call.
Both GC and standalone trap on the numeric call while the class control
passes (`.tmp/ts5-numeric-tostring-collision-before.log`). The final structural
class-inference fallback only excludes any/unknown and ignores callable
properties during its field comparison, so Number's method-only surface can
incorrectly match an unrelated class. Next exclude primitive receivers from
that shared eligibility decision and verify real full-source radix callbacks.

Next source-unit verification started: the existing source-unit runner is
running the five original diagnosticCollection callbacks against complete
compiler source modules, including its native reference and strict standalone
import policy. Worker 26447, `.tmp/ts5-diagnostic-collection-current.log`.
The pinned inventory remains 256 files/1,761 registration sites; the pin's
five selected projection files do not cover that full scope. Previous turn
made progress by fixing dynamic tuple destination identity and moving the
original factory file from **0/3 to 3/3**.

Projection regression remains **25/25** on the current tree
(`.tmp/ts5-projection-regression-current.log`, driver terminal), and source-unit
verifier controls passed **5/5**. Expanded the separate full-source runner to
compilerCore's **11 original callbacks**, after checking that its only import
is the same compiler namespace. Added a verdict control rejecting ten callbacks
for that file. Its projection status is not promoted to full-source success:
worker 85033 is now measuring the complete module graph in
`.tmp/ts5-compiler-core-source-current.log`. DiagnosticCollection worker 26447
remains live. Expanded verifier tests are in
`.tmp/ts5-source-unit-verifier-expanded.log` (worker 34490).

DiagnosticCollection completed **0/5 Wasm versus 5/5 native**, valid
89,514,526-byte standalone Wasm, zero imports, 213,751 ms. All five trap in
createDiagnosticForNode, source-attributed to utilities.ts:2364:5. Do not
assume a shared cause with factory formatting. A diagnostic copy now checks
statement count, node presence/kind/parent and diagnostic-message presence/code
before the original calls, retaining all assertions. Worker 60532 logs to
`.tmp/ts5-diagnostic-input-current.log` and requests emitted functions in
`.tmp/ts5-diagnostic-input-types.txt.wat`.

Full-source compilerCore completed **11/11 native and 11/11 standalone**:
valid 1,202,989-byte Wasm, zero imports, 3,391 ms. This is separate from its
projection run. Expanded verifier controls passed **6/6**. Added base64 (1),
comments (3), and parsePseudoBigInt (5) to the same full-source runner after
checking their compiler-only imports, with per-file callback-floor controls.
Worker 50444 runs them sequentially, logging to
`.tmp/ts5-source-{base64,comments,parsePseudoBigInt}-current.log`; worker 60532
continues the diagnosticCollection input probe. No full-scope success claim.

Input diagnostic completed **0/5**, all report `parsed node parent differs`.
Statement count, non-null node and VariableStatement kind checks passed first;
message checks were not reached. Valid 89,738,459-byte standalone Wasm,
zero imports, 229,830 ms; bundled native diagnostic reference **5/5**.
Emitted getSourceFileOfNode reads Node field 7 (parent) in its ancestor loop;
createDiagnosticForNode then asserts the returned sourceFile non-null. This
narrows the next investigation to parent linking / parent representation,
not diagnostic message objects or formatting. The full-source batch worker
50444 remains live; expanded verifier controls passed **9/9**.

Full-source base64 passes **1/1 native and standalone** (8,038,824 bytes,
91,692 ms); comments passes **3/3 native and standalone** (8,032,177 bytes,
88,808 ms). Both validate with zero imports. ParsePseudoBigInt is the remaining
live item in worker 50444's sequential batch. Reuse the existing
`tests/dogfood/fixtures/typescript-source-node-parent-workload.ts` for the next
parent investigation; its statement/parent/ancestor-lookup checks already
match the diagnosticCollection parser call. Extend diagnosis with direct
parent assignment versus generic setParent versus setParentRecursive, so a
physical-field failure is distinguished from traversal/callback failure.

Batch 50444 completed. Full-source parsePseudoBigInt is **2/5 Wasm versus
5/5 native**: decimal and large-literal callbacks pass, binary/octal/hex
callbacks trap in their closures. Valid 8,029,410-byte standalone Wasm,
zero imports, 87,331 ms. Its projection still passes **5/5**, so this is a
full-graph difference, not permission to drop those cases. The three failing
callbacks use `testNumber.toString(radix)`; next isolate numeric radix calls
in the presence of unrelated named toString methods. Earlier formatEnum WAT
also showed a suspicious Version-receiver call on its numeric fallback, but
that is a hypothesis until a focused test and fresh emission prove it.

Current full-source runner covers six of 256 files, **20/28 callbacks pass**:
factory 3/3, compilerCore 11/11, base64 1/1, comments 3/3,
diagnosticCollection 0/5, parsePseudoBigInt 2/5. The separate projection
suite remains 25/25; do not combine overlapping counts. Verifier tests 9/9,
format/lint/diff checks pass. All workers from this continuation are terminal.
No compiler production edits were made this turn; source-unit coverage and
failure attribution advanced. Remaining full scope and self-hosting are open.

Original factory callbacks now pass **3/3** with the binding plan, without
changing their source/assertions: valid 63,959,222-byte standalone Wasm,
zero imports, 164,661 ms (`.tmp/ts5-original-factory-binding-plan.log`).
The destination-allocation adapter has been extracted to
`src/codegen/dynamic-array-binding-locals.ts`; the existing emitter only
imports/calls it (+2 file lines, +1 function line, explicitly granted above).
Shared planning remains in IR. Removal attribution is running against the
focused regression and the two failing neighbor files; restore the planner
before further production verification. This is a factory-file milestone,
not completion of all 256 upstream unit files or the standalone compiler goal.

Removal attribution completed **12/23**: the same ten neighbor failures
remain, plus the new standalone tuple-binding regression returns 0 again
(`.tmp/ts5-dynamic-binding-removal.log`). GC remains the positive control.
Restored the planner; no removal switch remains. Final focused confirmation
is running in `.tmp/ts5-dynamic-binding-restored.log`; full typecheck and
function/LOC gates are rerunning after adapter extraction. The next upstream
source-unit target is diagnosticCollection (five original callbacks), then
continue expanding the full pinned scope rather than treating factory as
goal completion.

Final confirmation after extraction/restoration: **17/17 across four files**.
Typecheck, formatting/lint, diff and function/LOC gates pass (138 changed
source files, net +5,101 LOC). The two-line adapter hookup is the only new
growth allowance; implementation is in the new shared plan and leaf adapter.
All workers from this continuation are terminal. No commits or pushes were
performed in this continuation; the goal remains active.

Kind-versus-formatting follow-up: diagnostic copy now checks that node.kind
is numeric and equals the expected kind before formatting, and distinguishes
both names being undefined from only the actual name. Worker 21282 is running
this in `.tmp/ts5-factory-kind-diagnostic.log`. This does not modify upstream
source or relax any original assertions. Previous turn counts as progress:
it identified the undefined operand before concatenation, changing the next
investigation from string concatenation to its producer/input.

Worker 21282 completed: **0/3**, all report `both names undefined for correct
kind`; node.kind is numeric and equals expected before either name is formatted.
Valid standalone Wasm, 63,960,617 bytes, zero imports, 154,016 ms. Native
diagnostic reference remains **3/3**. The next diagnostic adds explicit enum
object/reverse-lookup and direct `formatEnum` checks before the two
`formatSyntaxKind` calls. It also requests existing emitter function dumps
for formatSyntaxKind/formatEnum/getEnumMembers/assertSyntaxKind at
`.tmp/ts5-factory-format-types.txt.wat`, with run output in
`.tmp/ts5-factory-enum-lookup-diagnostic.log`. Explicit enum use may itself
change graph demand; any success is diagnostic, not an original-test pass.

Lookup diagnostic completed **0/3**, all report `direct formatEnum is
undefined`; the enum-object and reverse-lookup checks passed first. Valid
63,995,443-byte standalone Wasm, zero imports, 162,061 ms. The emitted
`formatEnum` gives a concrete binding mismatch: the tuple-1115 arm stores
its string field into local 293 (WAT function-relative lines 4880–4882),
but the return reads local 323 (line 7149). `destructureParamArray` builds
multiple tuple arms and re-allocates a declaration binding when a later arm
has an externref field, redirecting localMap after earlier arm stores have
already been emitted (`destructuring-params.ts`, tuple widening near 2468).
Next establish a focused multi-carrier regression, then settle destination
representation before emitting alternative branches. Strengthened nested
namespace control passes **2/2**, using runtime numeric inputs and a circular
enum barrel (`.tmp/ts5-nested-namespace-enum-string.log`).

Focused regression established: a branded SortedReadonlyArray return forces
dynamic tuple dispatch; an ordinary readonly-array return stays typed and
passes. With the branded return, standalone reads the stale name slot and
returns 0 instead of 42 (GC passes). New shared
`src/ir/dynamic-array-binding-plan.ts` identifies dynamic declaration bindings
before branch emission; the existing destructuring adapter allocates their
common externref destination up front, leaving boxed captures and rest carriers
alone. The focused regression and existing declaration/generator controls now
pass **15/15** (`.tmp/ts5-destructuring-branch-after2.log`). An initial wiring
attempt hit the object-pattern branch and was corrected before this passing
run. Original factory callbacks are being rerun, without diagnostic source
changes, in `.tmp/ts5-original-factory-binding-plan.log`.

Broader controls measured **41/51 across eight files**; seven typed-object
checks in issue-1553b and three explicit-undefined checks in issue-1553e fail.
Attribution is pending removal of the new planning step after the live factory
worker completes (`.tmp/ts5-dynamic-binding-neighbors.log`). Typecheck, lint,
format and diff checks pass. Function budget currently rejects +15 lines in
destructureParamArray; plan to extract the allocation adapter before final
gates, rather than retain this inline block in the large emitter.

Full factory string-operand investigation: diagnostic copy
`.typescript-upstream-suite-generated/source-modules/factory-string-diagnostic.ts`
retains the original assertions but evaluates both formatted names into locals
and checks null/undefined before constructing their template. Worker 19408
is running it, logging `.tmp/ts5-factory-string-diagnostic.log`. A new
two-target nested callback/namespace string control is running separately in
`.tmp/ts5-nested-namespace-string.log`. These are attribution probes, not
upstream success evidence.

Diagnostic worker 19408 completed: **0/3**, each reports the explicit guest
error `actual name is undefined`. This identifies the actual-name operand
from `Debug.formatSyntaxKind(node.kind)` before concatenation; it does not
yet establish whether `node.kind` is correct or whether expected-name formatting
also fails. The same diagnostic copy passes **3/3** bundled pinned-source
JavaScript. The nested namespace/callback string control passes **2/2**
(GC and standalone), with formatting/lint/diff checks passing. Next inspect
the node kind and expected kind, then compare direct enum reverse lookup and
both formatted names within the full factory graph. Do not patch string
concatenation to hide the undefined result. All workers from this continuation
are terminal; original upstream status remains **0/3**.

Runtime integration update: shared `src/ir/enum-object-reference.ts` resolves
declaration identity and runtime demand; `src/codegen/runtime-enum-object.ts`
adapts the shared ordered plan to the existing module initializer. Top-level,
statically planned enums allocate at their declaration, with declaration-owned
globals shared by imports. New semantic work stays in shared IR planning;
the backend changes are initialization/read adapters, not a second enum planner.
The real-source formatting probe now passes **6/6**, up from **1/6**:
valid 8,114,807-byte standalone Wasm, zero imports, 90,954 ms
(`.tmp/ts5-real-enum-runtime.log`). The namespace matrix is **9/12**:
all eight enum cases pass; three pre-existing plain-object cases still fail.
Focused ordering/identity and enum controls are **24/25**; the combined GC
ordering/identity check returns 0 rather than 42, while standalone passes.
Investigate before declaring this adapter ready. Typecheck log is empty;
all three workers are terminal. Full TypeScript unit-suite success remains
unproven; the original factory callbacks still need a fresh run.

Split the combined runtime-order assertion into eight labeled checks per
target (`.tmp/ts5-enum-runtime-order-detail.log`): **15/16 assertions pass**,
with only the GC early-read `typeof` check failing. All identity, post-init,
reverse-alias and string-member checks pass in both targets, and the standalone
early read passes. This isolates the next investigation to early-read behavior
in GC, without yet attributing it to ordering versus undefined representation.

GC early-read fix: `canonicalUndefinedExternInstrs` only looks up the host
`__get_undefined` helper and otherwise emits null. The enum-read adapter now
registers/flushed-shifts that helper before requesting canonical undefined.
The runtime-order checks now pass in both targets, along with plan/IR enum
controls: **22/22 tests across four files**
(`.tmp/ts5-enum-runtime-undefined-controls.log`). Four new shared-demand tests
also pass: folded/type-only erasure, wrapped/reverse demand, shadow/getter
refusal, and exact namespace declaration identity
(`.tmp/ts5-enum-demand-controls.log`). The original upstream factory callbacks
are running in worker 3226, `.tmp/ts5-original-factory-runtime-enum.log`;
do not restart a silent worker. Formatting and lint pass for this increment.

Worker 3226 completed: original factory callbacks remain **0/3**, versus a
fresh bundled pinned-source native reference **3/3**. Compilation succeeds:
valid 63,959,234-byte standalone Wasm, zero imports, 161,467 ms. All three
now trap in `__str_concat` called by `assertSyntaxKind`, not the earlier
enum-formatting null-object location. Next probe separates formatting of
StringLiteral/ParenthesizedExpression/ArrowFunction from template concatenation
and repeated cached formatting (`.tmp/ts5-real-enum-template-stages.ts`).
Typecheck, diff and function/LOC gates pass (135 changed source files,
net +5,053 LOC; no new allowance).

The formatting/template boundary probe completed **8/8** in standalone and
**8/8** against bundled pinned source. Wasm is valid, 8,115,807 bytes,
zero imports, 84,065 ms (`.tmp/ts5-real-enum-template-stages.log`). It covers
StringLiteral, ParenthesizedExpression and ArrowFunction, dynamic function
parameters, both template substitutions, and repeated cache use. Therefore
the full factory trap is not reproduced by these operations alone; next
inspect the full factory calling context and its actual string operands.
The enum/parenthesizer neighbor run is **27/30**, with all 18 accessor/lazy
parenthesizer tests passing and only the same three plain-object namespace
failures (`.tmp/ts5-enum-and-parenthesizer-final.log`). Removing host undefined
registration reproduces exactly the GC early-read failure while standalone
and the other labeled assertions pass (`.tmp/ts5-enum-undefined-removal.log`).
Registration is restored; final confirmation is in
`.tmp/ts5-enum-undefined-restored.log`. No upstream assertion or harness was
weakened, and no production diagnostic switch is retained.

Restored confirmation completed **6/6 across two files** (worker 76395
terminal). Both real-source workers and all test/typecheck/gate workers from
this continuation are terminal. Full goal remains active and incomplete.

Enum object planning started in `src/ir/enum-object-plan.ts`. It produces
source-owned, ordered forward/reverse writes for checker-proven constant enum
members. Numeric aliases retain every write (last reverse name wins); string
members do not create reverse entries. Ambient/merged declarations and
runtime-valued initializers decline this static plan. The existing enum
constant collector now consumes its member values, retaining its prior
fallback for unplanned declarations. This is shared semantic planning, **not
runtime object materialization yet**, and does not fix the 1/6 formatting
probe. Runtime allocation must execute at the declaration's initialization
point; a namespace getter that eagerly synthesizes the object would incorrectly
move initialization. Next connect the plan to that source-ordered allocation
and to namespace export bindings, with early-read and shared-identity tests.

Tests compare ordinary/const enum planned assignments with actual TypeScript
emit (`preserveConstEnums: true`), plus aliases, string members, negative
values, ambient/merged refusal and same-name declaration identity. Controls
are running as worker 98006 in `.tmp/ts5-enum-plan-controls.log`.

Controls completed **23/23 across four files**, including existing IR enum
and imported switch cases. Typecheck, formatting/lint, diff and function/LOC
gates pass (132 changed source files, net +4,855 LOC; no new allowance).
Removing the planner result fails all three positive plan checks while the
two refusal controls pass (**2/5**, `.tmp/ts5-enum-plan-kill.log`, worker
30134 terminal). Restored the planner; final controls are in
`.tmp/ts5-enum-plan-restored.log`. No runtime-formatting gain is claimed.

Initialization integration location identified: the source-order collection
loop in `collectDeclarations` appends to `ctx.moduleInitStatements`, while
`collectRuntimeModuleInitializers` currently skips enum declarations. The
enum-object plan must be attached to declaration-owned storage and evaluated
in that ordering, not added as an arbitrary first-use namespace snapshot.

Restored confirmation completed **23/23** (worker 68319 terminal). The
planner-removal experiment is absent, and this turn has no live workers.

Stack-balancing continuation: six new 12,000-level local/call operand tests
across block/loop/if initially fail, while five existing ownership/diagnostic
controls pass (**5/11**, `.tmp/ts5-stack-balance-deep-before.log`). Both local
and call repair passes now consume a shared iterative physical-body postorder
in `src/ir/instruction-body-postorder.ts`, retaining their unchanged leaf
coercion logic and per-pass visited sets. That exposed the next recursive
`fixBody` diagnostic walk in the same tests. Converted its recursive child
calls into suspended generator steps driven by an explicit stack: diagnostic
push/pop placement, branch repair ordering, tag arities and fixup counts stay
in their original code. All **11/11** now pass, with no missing-value defaults
or validation bypass added (`.tmp/ts5-stack-balance-deep-all-walks.log`).

Real-source probe worker 81395 is running in
`.tmp/ts5-real-enum-stack-balance-safe.log`. Broader controls are worker 77523
in `.tmp/ts5-stack-balance-neighbors.log`; typecheck is worker 85918 in
`.tmp/ts5-stack-balance-final-tsc.log`. No full-source runtime success claimed.

Terminal result: the same real-source enum-formatting probe now **compiles
and validates**, 7,932,836 bytes, 87,689 ms, **zero imports**, and executes
all six checks. Numeric enum-member control passes; the five runtime
enum-object/formatting checks fail (**1/6**). Its 289 outcome rows still show
0 IR body emissions; these shared physical-IR traversal fixes remove compile
barriers, not the remaining source IR admission gaps. Worker 81395 is terminal.

Broader controls pass **40/40 across four files**. Independently restoring
recursion in the new postorder helper or in the diagnostic driver makes all
six deep tests fail while the five original controls still pass (**5/11**
for each removal). Logs: `.tmp/ts5-stack-balance-postorder-kill.log` and
`.tmp/ts5-stack-balance-branch-driver-kill.log`. Both experiments are restored;
final controls are running as worker 92316 in
`.tmp/ts5-stack-balance-restored.log`. Typecheck, formatting/lint, diff and
function/LOC gates pass (130 changed source files, net +4,807 LOC; no new
allowance). Next: runtime enum/namespace materialization, now reproducible
without the walker stack overflows. Full upstream suite remains unfinished.

Final restored confirmation: **40/40**, worker 92316 terminal. No removal
experiment remains, and no worker from this stack-balancing turn is live.

Stack-overflow fix in progress: replaced recursive cross-hierarchy operand
repair traversal with an explicit postorder work stack. The same shared-array
visited set, cross-function ownership refusal, diagnostics, operand producer
model and coercion rules remain in effect. Separated body admission from
single-body operand repair; no new coercion cases or legacy emission paths.
Three 12,000-level block/loop/if regressions fail on the old walker, while its
three original controls pass (**3/6**). After the change all **6/6** pass,
including idempotence and cross-function refusal
(`.tmp/ts5-cross-hierarchy-deep-before.log`,
`.tmp/ts5-cross-hierarchy-deep-after.log`). Real-source formatting probe worker
26641 is running in `.tmp/ts5-real-enum-stack-safe.log`; broader controls and
typecheck are running in `.tmp/ts5-cross-hierarchy-neighbors.log` (worker
88853) and `.tmp/ts5-cross-hierarchy-tsc.log` (worker 61204).
No compile/runtime gain claimed yet.

Terminal result: the real probe advances past this walker, then fails at
`src/codegen/stack-balance.ts:3234:23` in recursive `fixLocalSetCoercion`
(87,068 ms, no binary; worker 26641 terminal). That next walk is the concrete
continuation target, not a reason to weaken validation. Broader tests are
**31/32 across four files**. The call-argument producer value control still
fails validation (`probe`: struct.new expects externref but receives
`ref.null 6`). Removal of only the iterative traversal reproduces that exact
failure and restores all three deep-nesting failures (**5/9** across two
files, `.tmp/ts5-cross-hierarchy-kill.log`, worker 18239 terminal).
Thus the value-control failure is not attributable to the new walker.
Restored the iterative implementation; focused confirmation is running in
`.tmp/ts5-cross-hierarchy-restored.log`. Typecheck, formatting, lint, diff and
function/LOC gates pass (128 changed source files, net +4,868 LOC; no new
allowance). Existing cross-function-body refusal remains intact.

Restored confirmation completed successfully (worker 20933); all processes
from this operand-walker turn are terminal. The recursive removal experiment
is no longer present in source.

Added `.tmp/ts5-real-enum-debug-stages.ts`, separating a numeric enum-member
control, enum-object presence/reverse lookup, `Debug.formatSyntaxKind`, and
`Debug.formatEnum`. Its initial version also used `typeof ts.Debug`, demanding
the entire Debug namespace and bringing the checker into the source closure.
That version fails compilation with a stack overflow in
`src/codegen/cross-hierarchy-operands.ts:155:10`; no runtime result. Native
bundled pinned source passes all six initial checks. Removed the whole-Debug
probe (not a required upstream test) in favor of the numeric enum control;
member-only worker 64215 is live in
`.tmp/ts5-real-enum-debug-member-stages.log`. The stack-safe shared walk remains
a full-goal follow-up, not an excuse to exclude checker coverage.

New `issue-1058-enum-namespace-format.test.ts` distinguishes ordinary enum,
const enum and an explicit object with reverse keys; GC/standalone; direct
provider/circular barrel. Current **1/12**, only the direct-provider GC object
control passes (`.tmp/ts5-enum-namespace-object-controls.log`, worker 20091
terminal). All enum cases throw, including non-circular ordinary enums.
The direct standalone object case returns 0 rather than 42 (reverse-key read
does not match), while circular object cases also throw. Do not treat all
these signatures as one proven root cause.

Source inspection: `namespaceFunctionExports` in
`src/codegen/module-namespace-value.ts` admits immutable const globals and
functions but rejects enum declarations and runtime ModuleDeclarations,
declining the whole imported namespace. The existing enum declaration collector
populates constant member maps, not an enum object. This is the next missing
runtime-value capability to investigate through shared module/IR planning;
do not patch upstream assertions or change const enums to test-only objects.

Worker 64215 is now terminal: the member-only real-source diagnostic also
fails compilation at the same cross-hierarchy operand walk (81,680 ms,
checker source attribution, no binary or runtime result). Therefore removing
`typeof ts.Debug` did not isolate that compile failure; do not claim it was
the sole reason checker code remained reachable. Preserve both logs. A next
bounded route is adding just `formatSyntaxKind` to the already-compiling
ten-stage factory probe, or making the shared operand walker stack-safe with
an independently attributed deep-IR regression. Formatting, lint and diff
checks pass for the new matrix; its failures remain explicitly unresolved.
No worker from this enum-investigation turn remains live.

Implemented shared accessor-argument parameter-carrier planning in
`src/codegen/accessor-parameter-carrier.ts`. A pre-ABI source scan records
exact direct-call parameter declarations that receive an accessor literal,
directly or through its variable initializer. Imported callable aliases resolve
to their declarations; spelling alone is not authority. Spread positions,
generic functions, rest parameters and explicit native annotations do not gain
this evidence. Both source ABI selection and the IR parameter override consult
the same fact. Existing identity-preserving member dispatch handles the open
carrier, without a new legacy body-emission branch or changes to upstream TS.

The real-source ten-stage factory probe now passes **10/10**, previously
**7/10**, in valid zero-import standalone Wasm (60,768,178 bytes,
154,779 ms; `.tmp/ts5-real-factory-accessor-carrier.log`, worker 48211
terminal). This fixes the measured parenthesizer/export/arrow failures.
Its 601 outcome rows still show **0 IR bodies**: this runtime improvement
comes from the shared ABI used by the existing fallback, not full-factory
IR migration. A separate typed accessor reader is verified IR-emitted and
returns 42 in zero-import standalone mode.

The reduced matrix passes **16/16**. Mechanism removal (only the new query
returns false) yields **12/18**, with the four typed-getter cases and both
new planning/IR tests failing; the dynamic/non-getter controls remain passing
(`.tmp/ts5-accessor-parameter-kill.log`, worker 34829 terminal). Restored
the implementation. Full restored three-file controls are running as worker
32487 (`.tmp/ts5-accessor-parameter-restored.log`); original upstream factory
callbacks are running as worker 73501
(`.tmp/ts5-original-factory-accessor-carrier.log`). Do not restart them merely
because output is silent. Prior typecheck passed; final verification pending.

Terminal verification: restored controls **35/35 across three files**;
typecheck, formatting/lint, diff check and function/LOC gates pass (127 changed
source files, net +4,842 LOC; no new allowance). Original upstream factory
callbacks remain **0/3**, valid 63,770,828-byte standalone binary, zero imports,
160,865 ms. All three now report `Cannot access property on null or undefined
at 445:33`; worker 73501 is terminal. Do not infer that this location names
the root semantic operation, or that the assertion shim is at fault. The
ten-stage probe's 10/10 does not cover all upstream assertions.

Broader structural neighbors: **24/26 across four files**. The standalone
user-class-Map and user-interface-Map controls fail (invalid Wasm / module-init
stack underflow respectively). Removing only the accessor-carrier decision
reproduces the same two failures, **9/11** in their file
(`.tmp/ts5-accessor-map-neighbor-kill.log`, worker 71250 terminal); these are
not attributable to this carrier change. The mechanism is restored again;
final two-file confirmation is in `.tmp/ts5-accessor-final-restored.log`.
Other logs: `.tmp/ts5-accessor-parameter-final-tsc.log`,
`.tmp/ts5-accessor-func-gate.log`, `.tmp/ts5-accessor-loc-gate.log`, and
`.tmp/ts5-accessor-structural-neighbors.log`.

Final restored confirmation is **18/18 across two files** (worker 19547
terminal); no removal switch remains. The upstream callback source eagerly
formats both enum names in `assertSyntaxKind`'s message. Pinned
`src/compiler/debug.ts:445` is `return formatEnum(kind, (ts as any).SyntaxKind,
false)`. That is a concrete next probe for the reported 445:33 location,
not yet proof that namespace lowering causes the remaining failure. No worker
from this carrier-fix turn remains live.

User reaffirmed that new work should target IR/shared planning where possible,
not add parallel fixes to legacy direct codegen. Keep runtime diagnosis separate
from implementation placement: a failing legacy-emitted factory body does not
by itself justify extending that path. Prefer an IR regression that asserts
actual IR body emission as well as standalone execution; document any necessary
legacy exception before implementing it.

The retained inspection below is terminal. Its binary reproduces **3/6** with
zero imports. Parenthesizer failures both trap at byte offset 13,931,903,
opcode `0xd4` (`ref.as_non_null`), at the end of the inlined parenthesizer.
This rules out its earlier `getLeftmostExpression(...).kind` read as the trap
site. Next distinguish a failed `factory.createParenthesizedExpression`
callable lookup from a callable that returns null; neither cause is proved yet.
The arrow case separately traps at offset 14,155,207 on a Node cast.
Expanded factory/carrier controls pass **19/19 across two files** in
`.tmp/ts5-factory-carrier-expanded-controls.log`. These controls do not establish
that the real factory works or that all upstream unit tests pass.

### Parenthesizer trampoline trace (2026-09-08, completed diagnostic)

Further carrier isolation (2026-09-09): the reduced getter fixture's WAT
stores the factory in an `externref` local/cell, but `createRules` accepts
`(ref null 39)` (the nominal Factory struct) and forwards that typed value
into `wrap`. Trace: `.tmp/ts5-getter-capture-types.txt.wat`; worker 6186 is
terminal. Added a parameter-carrier control to the matrix: changing only
`createRules(factory: Factory)` to `createRules(factory: any)` makes all four
getter cases pass. Final matrix **12/16**, with exactly the four typed-getter
cases still failing (`.tmp/ts5-getter-parameter-carrier-matrix.log`, worker
6007 terminal). This is a source-variation control, not a compiler fix and not
permission to modify upstream TypeScript annotations.

The next implementation candidate is shared source-parameter ABI planning:
retain an open carrier when an exact direct-call argument is an accessor
object, including an identifier resolved to its accessor-object initializer.
`prepareIdentityPreservingStructuralParams` already scans the compilation's
source files before ABI selection and handles imported callable identity for
a different structural-identity case. Investigate its call order and consumers
before reusing that preparation seam; IR must receive the same carrier fact.
Do not merely widen all interface parameters or add a special case for the
name Factory. The reduced typed `wrap` also emits a discarded property lookup
and null return, so ABI admission and callable-member lowering both need
verification; the dynamic control avoids both and does not distinguish them.

Follow-up (2026-09-09): `.tmp/ts5-factory-dispatch-check.mjs` tests a copy
of the retained binary, changing only the three-byte `ref.null Node218`
non-callable arm at offset 13,931,895 to `unreachable; nop; nop`. Both
parenthesizer failures move to that exact unreachable instruction. The three
positive controls remain passing in both copies. This proves the lookup result
fails the callable-root test; it is not a null result returned by the method.
No production binary or compiler source was modified by this experiment.

Expanded the source diagnostic to ten cases. Native bundled pinned source
passes **10/10**; standalone is valid, zero imports, 60,777,307 bytes, and
passes **7/10** (`.tmp/ts5-real-factory-dispatch-stages.log`, worker 36424
terminal). All four added checks pass: method `typeof`, direct calls with
class/object nodes, and an extracted-method call. The same original three
cases still fail. The global factory method works; its lookup through the
parenthesizer's captured factory does not. This is diagnostic expansion, not
a runtime improvement from the previous 3/6.

Expanded `issue-1058-lazy-parenthesizer-runtime.test.ts` into an eight-case
matrix: GC/standalone, annotated/inferred factory, direct memoizer/getter.
All four direct-memoizer cases pass; all four getter cases fail. Repeating with
getter name `parenthesizer` distinct from the memoizer variable `rules` yields
the same **4/8** (`.tmp/ts5-lazy-factory-getter-distinct-name.log`, worker
89916 terminal). This removes a same-name collision as an explanation.
GC failures report a null/undefined receiver inside `wrap`; annotated
standalone returns NaN instead of 84. These are retained failing regressions,
not a claimed fix or proof of the full-source root cause. Next trace the
getter-bearing factory's forward-capture carrier through shared ABI planning;
do not add a legacy-only workaround on the strength of this correlation.

Started a bounded WAT/type trace of the same six-stage source probe using
the existing `JS2WASM_DUMP_TYPES`/`JS2WASM_DUMP_WAT_FN` hooks. Retain all
type declarations, but only the measured failing trampoline, its source
function, arrow factory, and probe caller bodies. Paths:
`.tmp/ts5-factory-trampoline-trace.log` and
`.tmp/ts5-factory-trampoline-types.txt.wat` (worker 76465).
No source compiler behavior is changed by the tracing hooks.

The existing diamond-interface and LiteralLikeNode carrier controls were
GC-only. Extended both to standalone, with explicit IR enablement and zero
import assertions, to test the nominal node-view hypothesis independently
of the large factory. Do not infer cross-target parity from their older GC
passes; the new measurement is in `.tmp/ts5-node-carrier-standalone-control.log`.

Both carrier controls pass in both targets (**4/4 selected**). Trace 76465
is terminal and reproduces the same **3/6**, valid 60,762,625-byte zero-import
binary. The emitted trampoline has its captured factory as `(ref null 526)`
and user node as `(ref null 218)` (the canonical Node). The source body is
inlined into that trampoline; there is no trampoline-side cast of the user
node to a distinct Expression carrier. Potential null sites include the
`getLeftmostExpression(...).kind` read and a failed factory-callable dispatch
followed by `ref.as_non_null`. WAT alone has not identified which traps.

Started `.tmp/ts5-factory-inspect.mts` (worker 17352), using the same source
probe and compile options, retaining `.tmp/ts5-factory-inspect.wasm` and
printing the actual trap offset and surrounding bytes per case. Its log is
`.tmp/ts5-factory-inspect.log`. Inspect the opcode before choosing a fix;
the stale trailing source position is not sufficient evidence.

### IR shared mutable captures (2026-09-08, uncommitted)

The previous scalar slot-capture refusal is now addressed in IR. Mutable local
declarations proven by checker binding identity to be captured by a nested
function allocate the existing ref-cell storage from initialization, before
any outer updates. This avoids converting an already-used slot into a snapshot
at closure creation and lets sibling closures and the outer body share updates.
Only scalar cells are admitted; unknown/shadowed bindings do not gain capture
authority, and i32 slot promotion is disabled for this shared-cell binding.

Named lifted functions initially exposed a preparation error: their signature
allocator called `lowerPreparedClosureSupportType` without the ref-cell registry
already used for dependency preparation. Threaded that exact registry through
derived callable slot/type allocation; no parallel layout registry or runtime
fallback was added. The signature and capture field now resolve the same cell.

The formerly refused mutable return-suffix witness now records IR body emission
with no direct body. New controls cover sibling writes/readback, closure
creation before an outer update, loop updates, and lexical shadow identity.
All 24 tests across five files pass, including existing returned/lifted/literal
closure ownership tests in GC and standalone
(`.tmp/ts5-ir-shared-cell-controls.log`). This supersedes the mutable fallback
boundary in the preceding subsection. The helper's no-checker result remains
conservative rather than guessing capture identity. Typecheck, scoped lint, and
size gates pass; the selected standalone adapter remains 25/25
(`.tmp/ts5-projected-after-ir-shared-cell.log`). Extracted cell installation to
a small helper to keep lowerVarDecl within its function budget; the one-line
integration registry argument has a documented file allowance above. Final
focused tests pass 7/7 (`.tmp/ts5-ir-shared-cell-final.log`). All processes from
this turn are terminal; these IR changes remain uncommitted.
No full-source TypeScript factory or checker pass is claimed yet.

### Actual-source parenthesizer boundary probe (2026-09-08)

Added `typescript-source-factory-parenthesizer-workload.ts` with six independent
numeric oracles against the pinned real compiler source: object/class creation,
direct concise-body/export parenthesizer calls, and arrow/export factory calls.
This avoids depending on debug enum formatting during triage without modifying
or accepting any upstream assertion. The initial probe completed: 2/6, valid
59,974,784-byte zero-import module, 162,709 ms compile. Object/class creation
pass; both direct parenthesizer calls fail just like the enclosing arrow/export
factory calls (concise body illegal cast; export parenthesizer null pointer).
Log `.tmp/ts5-factory-parenthesizer-source.log`. Thus neither upstream assertion
formatting nor its test callback harness is necessary for these failures.
Expanded the same fixture to ten cases: direct parenthesized node construction,
getLeftmostExpression identity, skipPartiallyEmittedExpressions identity, and
the no-parentheses-needed identifier path. The expanded probe completed 6/10:
all four added checks pass, while the same four original wrapping checks fail.
Valid 59,978,602-byte zero-import module, 156,217 ms compile. Log
`.tmp/ts5-factory-parenthesizer-source-expanded.log`. This distinguishes the
wrapping path from both traversal and no-wrap callback entry. Next compare
fresh `createParenthesizerRules(ts.factory)` with the cached factory getter,
then inspect the captured factory/method value and wrapping return carrier;
do not infer that ordinary node allocation or traversal is broken.

Signed implementation checkpoint: `2fbd0f2c7a3a2c7d6757d0c61c73d6efa235b341`.
Signature verified in the commit object; pre-commit lint and size gates passed.
All probe/test/commit processes from this turn are terminal. This paragraph's
expanded-probe result was recorded after the checkpoint.

Fresh namespace controls pass 21/21. The selected upstream adapter was first
run in its default GC lane: 14/25 (compilerCore 5/11, convertToBase64 0/5;
other files 9/9). This is not the standalone goal lane and has no measured
same-lane baseline in this turn. The explicit standalone recheck completed:
25/25 native and Wasm, 5/5 compiled modules, actual target standalone, zero
imports, 251/256 upstream files deferred. Log
`.tmp/ts5-projected-standalone-after-optional.log`. No full-source upstream
unit pass is inferred from this projected selection.

Main-sync verification (2026-09-08): fetched `https://github.com/loopdive/js2.git`
and independently checked live `refs/heads/main` at
`04c8e72156cf576cf584a3ed3a5a66ec5a2b91b0`. That commit is already an ancestor
of `codex/1058-typescript-standalone` HEAD `ac266354848de0`; zero incoming
commits, so no merge was needed. All pending implementation and test changes
were preserved; no tests rerun for this no-op synchronization.

Signed checkpoint: `ac266354848de0`. Post-checkpoint projected-suite regression
run completed with **25/25 native and Wasm**, **5/5 modules compiled/validated**,
**zero imports** (`.tmp/ts5-projected-after-enum-stack.log`, exit 0). This confirms
the existing slice remains intact; its inventory still explicitly defers 251
of 256 files. No live process remains from this turn.

### Source-defined collection carrier investigation (resumed)

Generator-method follow-up after `085c67795aad5e`: WAT for the real `*entries()`
method shows an ordinary closure executing its loop and dropping each yield,
then returning undefined. The open-object method path passes a MethodDeclaration
through the function-expression closure API, whose generator checks only
recognized FunctionExpression nodes. Testing recognition of MethodDeclaration
at signature selection, closure registration, and native frame emission; a new
regression checks lazy creation, captured state, tuple yields and exhaustion.
This fix now passes **25/25 selected upstream tests**, **5/5 modules compiled
and validated**, **zero imports** (`.tmp/ts5-upstream-all-selected.log`). This is
still only **5/256 upstream files**; the 251 deferred files and full compiler /
self-hosting acceptance remain open.

Open-method `this` now uses the existing frame-carried dynamic receiver when
there is no synthesized receiver parameter. Direct `.next()` also exposed a
dead host import retained by `__any_iter_next`; its final fill now includes the
legacy fallback only if a legacy generator factory actually emitted, matching
the native generator dispatcher's existing rule.

Focused final run: **24/24** across five files, including two new open-object
generator tests, lazy generator expressions, destructuring methods, dynamic
receiver capture, and collection iterator prototypes. Log:
`.tmp/ts5-open-generator-final-controls.log`. Shared generator-node recognition
was extracted into `closures/generator-declaration.ts` to keep the signature
and body paths consistent and satisfy the function budget without allowances.
Full parser recheck passed **3/3 exact fingerprints**, with a valid 80,351,322-byte
module and **zero imports**, in 461,664 ms (five warnings, zero errors).
Evidence: `.tmp/ts5-parser-open-generator-method.log`.

Requested main sync: fetched and independently checked live upstream main at
`04c8e72156cf576cf584a3ed3a5a66ec5a2b91b0` (six incoming commits). Saved the
generator-method changes in signed checkpoint `05a791a94bafcc`, then merged
without conflicts in signed merge `8e29e3a4136e2b`. Verified upstream is an
ancestor (zero commits behind). No manual stash or changes to the unrelated
dirty main checkout. Post-merge controls pass **14/14 across three files**:
open-object generator methods and the incoming conditional-alias property-write
tests, including console coverage (`.tmp/ts5-main-sync-controls.log`). The full
parser and selected upstream suite results above precede this merge; neither
was rerun as part of this sync-only request. No push or PR was performed.

Next-boundary investigation after checkpoint `9465e0c392cdd0`: the reduced real
factory probe's `arrayFrom(set.values())` returns all three values (sum 6), while
`forEach` throws `TypeError: Cannot access property on null or undefined` at the
callback invocation in release-core line 152. A separate native-Set callback
with three supplied arguments and a one-parameter consumer passes. These are
diagnostic controls, not evidence that the two remaining upstream cases share
a cause. Diagnostic logs: `.tmp/ts5-custom-set-error.log` and
`.tmp/ts5-collection-callback-minimal.log`.

The decisive reduction is a multi-file source `createSet<T, H>` with a captured
element and a `forEach(action)` method. The number-typed consumer failed while
an otherwise identical `any` consumer passed. Preserve the callback parameter
as externref only when the source factory method itself declares that callback
parameter using a type parameter owned by the factory. Inspect the source
method, not merely the ambient Set interface: the latter incorrectly widened
a non-generic source-method control. No new raw-checker query or shared mutable
registry is introduced.

Verified result after this follow-up: **24/25 original admitted tests pass**,
compilerCore **10/11**, all **5/5 modules compile and validate with zero imports**.
Only upstream `iteration` remains failing in this selected set. `forEach` now
passes unchanged; the adapter regenerated the release projection, removing all
temporary diagnostic edits before this run. Log:
`.tmp/ts5-upstream-source-callback-proof.log`. Scope remains 5/256 files admitted,
251 deferred; this is not completion of the standalone compiler/unit-suite goal.

Focused controls: **16/16** across the new five-case collection-callback test,
four collection-carrier checks, and seven optional standalone Set checks. The
callback cases include native and non-generic source controls plus later-module
number/any/Boolean consumers. Log: `.tmp/ts5-source-callback-final-controls.log`.
Format/lint and LOC/function budgets pass without new allowances. Full parser,
binder, checker and all-unit-suite acceptance have not been rerun or established.
The next reduced failure is `arrayFrom(set.entries())`: it throws
`TypeError: value is not iterable`, while `arrayFrom(set.values())` and `forEach`
each return all three values (sum 6) in the same real-factory probe. Inspect the
`*entries()` method's nested `getElementIterator()` loop next. Log:
`.tmp/ts5-custom-set-entries.log`; probe `.tmp/ts5-custom-set-probe.ts`.

The real `createSet` factory returns an open object, not native Set storage.
Reduced standalone probes now preserve initial size, mutation, and `return this`
identity. Added a durable four-case native-vs-Wasm regression covering a direct
factory, native Set, asserted object literal, and a shorthand callable property
inside a callback; all four pass with zero imports
(`.tmp/ts5-source-collection-test5.log`). Type assertions also need unwrapping
when selecting the local's physical carrier. The final four-case run also
exercises the source-defined `forEach` callback
(`.tmp/ts5-collection-foreach-controls.log`, 4/4 passing).

The selected upstream adapter creates `const ts = { createSet, ... }`, rather
than a module namespace. Its callable-property result ABI was still casting
the factory result to native Set. Resolving the shorthand through oracle
declarations and retaining an externref result exposed a compile-time stack
imbalance: the array `forEach` fast path tried to construct a five-field Map
using a two-field array layout. Declining array/native collection dispatch for
the source-object carrier resolves that compile failure.

Final upstream run: **23/25 passing, 5/5 modules compiled and validated, zero
imports**, up from **19/25** on the previous checkpoint. CompilerCore is **9/11**;
mutation, resizing, clear, and string-hash tests now pass. `forEach` and
`iteration` still throw opaque Wasm exceptions. The suite still admits only
5/256 upstream files; 251 remain deferred. See
`.tmp/ts5-upstream-source-collection-no-array.log` and the generated report.
No assertions or compiler verification gates were weakened. Full parser/binder
checks have not been rerun on this candidate.

Ancillary controls: Date/accessor-import files pass; the accessor-widening file
passes 13/14, with its GC-only data-property control returning 0 instead of 1.
That failure has not been A/B-attributed to this change. All seven standalone
cases in that file pass. Typecheck, scoped lint, LOC and function budgets pass;
no new allowance was added. Temporary stack-balance tracing was removed.
Additional collection/call controls pass 18/20: optional-method padding 7/7,
optional standalone Set 7/7, optional Map-size 3/4, Proxy carrier 1/2.
The remaining failures are GC Map-size (-1 vs 256) and a Proxy-global shape
assertion expecting a non-externref slot; neither is A/B-attributed here.
Log: `.tmp/ts5-collection-native-controls.log`.

Fetched `main` directly from `https://github.com/loopdive/js2.git` and
independently verified its live ref as
`16498efb481cb022ee5c4dcc9bb137b6d4c91a50`. The TypeScript worktree branch
`codex/1058-typescript-standalone` at `5e7d1d1302178a` already contains that
commit (8 commits ahead, 0 behind), so no merge was necessary. Preserved the
four uncommitted source-collection carrier investigation files unchanged.
This synchronization check does not constitute new compiler/test validation.

## PR handoff — 2026-09-06

### Resumed optional-parameter investigation — 2026-09-08

Typed-array delegation follow-up: the numeric-only slot registration hardcoded
the f64 vector even though slots already record an element type. Resolve the
source array's actual vector layout and coerce the loaded element to the
generator result carrier. Include delegated array element facts in carrier
selection (otherwise object-only `yield*` defaults to f64). The generic iterable
admission query now uses the oracle's well-known iterator fact instead of raw
checker property enumeration; this offsets the one layout-resolution query
without adding a checker-usage exception.
Fresh upstream run with typed slots reaches **19/25** tests, native 25/25,
compilerCore 5/11 and zero generator imports. The six now-executing failures
are illegal casts in mutation, resizing, clear, forEach, iteration and string
hash code. Expanded worklist controls are **7/8**: direct object-array iteration
returns 12 and writes back to both original objects; generic factory-backed
`runObjects` still throws a WebAssembly exception. Existing array/iterable/
try-region controls pass **32/32**. Logs: `.tmp/ts5-typed-delegate-carrier.log`,
`.tmp/ts5-typed-delegate-stable-controls.log` and
`.tmp/ts5-upstream-typed-delegate-final.log`. Typecheck/lint pass. Layout
resolution was extracted into a helper to pass the function-size gate, without
adding an exception. This is not a full-suite passing claim; 251 files remain
deferred, and the newly executable createSet tests expose the next cast frontier.

Generator frontier follow-up: fresh upstream adapter on `3e0d2386` still
measures native 25/25, standalone 14/25, 251/256 files deferred. The worklist
reduction reproduces generator imports (runAll) and rejected cleanup shapes
(runReturn/runThrow). Implementing structured unwind for numeric-vector
delegation, preserving the guard for generic/native-generator delegates until
their full return/throw/done-false forwarding is implemented. Array delegation
must replace a thrown value with TypeError when its iterator lacks `throw`,
then run enclosing cleanup; removing the admission guard alone is unsound.
The new path passes **6/6** standalone/native-oracle checks: complete worklist,
outer iterator close on return, missing-throw TypeError and cleanup, caught
TypeError followed by a yield, original thrown value before delegation starts,
and finally suspension with done=false before resuming the pending return.
The last case's generator declares a numeric return via `return 0` so its
`.return(9)` call is type-correct; expected native/standalone behavior is 1.
The existing array/generic iterable/try-region controls pass 32/32 separately.
Fresh upstream rerun remains **14/25**: compilerCore still imports four host
generator helpers. Its `getElementIterator` delegates generic `TElement[]`
after `isArray(value)`; widening typed vector delegation beyond numeric storage
and implementing general iterator protocol forwarding remain the next steps.
Do not claim the reduced numeric worklist resolves compilerCore yet.

The merged optional-vector reduction still returns `[7, 7, 8]` instead of
`[17, 7, 8]`. Its emitted WAT declares `wrap` with parameters `(ref null 50),
i32`, while nested `make` takes `(ref null 50), externref`: the omitted optional
boolean is already false before the factory sees it. Both resolved-generic
registration paths in `declarations.ts` bypass the existing optional declaration
parameter helper. Applying that helper to copied resolved parameter arrays
fixes both original failing cases without changing their expected values.
Added explicit-undefined boolean and optional-number controls in both lanes.
The expanded factory file plus generic identity/callback and main's dynamic
result/rest-callable controls pass **107/107**. Nested optional-parameter and
rest-vector controls measured **11/13** before the new tests: only the two
already documented absent optional-array-field assertions fail.
Full standalone parser acceptance on `3e0d2386f83a30` now passes **3/3**:
performance 49645738923599, builder 13386537220945, core 40098163538143.
The binary is **80,351,322 bytes**, validates and executes with **zero imports**.
Elapsed wall time 255,164 ms; five diagnostics are warnings, not errors.
Local log: `.tmp/ts5-parser-main-sync-optional.log`; process completed normally.
Typecheck, lint, formatting and file/function size gates pass. Full binder and
upstream unit-suite coverage still require fresh post-sync verification; the
next broad frontier remains generator support and expansion beyond 5/256 files.

2026-09-08: merging this work branch with fetched `loopdive/js2` main
`16498efb481cb022ee5c4dcc9bb137b6d4c91a50` (680 incoming commits).
The pre-sync measurements below are not validation of the merged candidate.
Resolved three textual conflicts, retaining both source-function shadowing and
main's WASI ArrayBuffer identity, both candidate snapshot and rest dispatch
support, and both object-spread/accessor imports. Removed a duplicate import
and an overlapping abstract-reference truthiness arm exposed by typecheck.
Focused merged-candidate check: 102/104 tests pass across six files. The two
optional-vector factory preregistration cases (GC and standalone) return 7
instead of 17; their origin has not been established by a baseline comparison.
Main's dynamic-result/rest-callable/ArrayBuffer tests and the branch's builtin
shadowing/module-function-identity controls pass. No full parser/binder rerun.

This is an incomplete checkpoint, not completion of the TypeScript 5 unit-suite
or self-hosting goal. Work is paused at the user's request. This summary
supersedes pending-run and binder-trap attribution in the chronological notes.

**Publishing blocker:** signed checkpoint `1e18c20f9740220425c3eb94c86789d1cb7130f9`
is local; no PR has been opened. Pre-push typecheck, lint and formatting pass,
but the oracle ratchet rejects net new checker usage in eight paths:
`expressions.ts`, `expressions/optional-native-set.ts`,
`generic-scalar-union-result.ts`, `indexed-object-spread.ts`,
`json-record-array.ts`, `optional-declaration-parameter.ts`,
`source-function-call.ts`, and `uninitialised-variable-undefined.ts`
(all under `src/codegen/`). The reported unallowed growth is five
`getTypeAtLocation` and fifteen `ctx.checker` references. Migrate these to
`ctx.oracle` while preserving source identity and ABI decisions, or obtain
explicit user approval for issue-scoped exceptions. Automated safety review
rejected adding those exceptions without approval; no exceptions were added
and neither hooks nor signing were bypassed.

### Measured state

- **Latest binder candidate: 5/5 exact checks pass**, including both original
  binder workload cases (2/2). It compiles to 88,010,457 bytes, validates and
  instantiates with **zero imports**. Results: diagnostic array before bind 0;
  push before bind 1; const-local fingerprint 65792; duplicate-let fingerprint
  131330; detailed duplicate diagnostics 1 (positions, messages and file identity).
  Local evidence: `.tmp/ts5-binder-rest-fixed.log`, completed run 85103.
- **Parser: 3/3 original fingerprints passed** at the earlier parser checkpoint:
  performance 49645738923599, builder 13386537220945, core 40098163538143;
  79,134,616 bytes, zero imports. This measurement predates the latest factory,
  rest-vector and stack-safety changes; rerun it on the final checkpoint.
- **Selected upstream unit adapter: native 25/25, standalone 14/25**, measured
  on an earlier candidate. Only 5/256 upstream files were selected; 251 files
  and 1,736 registrations remained deferred. All five modules compiled and
  validated; compilerCore's 11 cases stopped before execution on generator
  imports (`__gen_create_buffer`, `__gen_push_ref`, `__gen_yield_star`,
  `__create_generator`). This is not full-suite coverage.
- Latest source gates passed: TypeScript typecheck, function/LOC budgets and
  whitespace check. Focused results: WAT stack/format controls 21/21;
  peephole DAG/order controls 13/13 plus dead-load runtime controls 4/4;
  diagnostic array initialization 5/5; capture controls 2/2; formatter controls
  4/4. No full repository regression suite was completed for this checkpoint.

### What changed and what remains

The latest binder fix registers rest metadata for resolved generic signatures
and compiles the trailing spread against the callee's vector type. The old
illegal cast was **relatedInformation passed to addRelatedInfo**, not the
bindDiagnostics getter: exact trap bytes identified `ref.cast_null 517` with
the source vector stored as type 494. The latest full binder run confirms both
duplicate-diagnostic cases now execute successfully.

The checkpoint also preserves exact source-function identity across modules,
respects source shadowing of builtin Symbol, bridges tagged callback results,
preserves already-tagged AnyValue payloads, supports fresh asserted object
factories, and makes peephole traversal and diagnostic WAT printing stack-safe.
Earlier runtime/collection/Buffer and upstream-harness work is retained below.

Known red tests are deliberately retained, so this PR is genuinely WIP:

1. Rest-spread diagnostic reduction: **3/5 pass**. The empty optional array
   field reads as null instead of strict undefined; a no-rest control reproduces
   it independently. Do not misattribute this to the now-passing binder cast.
2. Generic scalar roundtrip: **1/2 pass**, dependent on first instantiation.
3. Source diagnostic constructor reduction: **1/2 pass**; explicit TypeScript
   `this` is treated as a user parameter in the failing constructor path.
4. Generator worklist delegation: native **3/3**, standalone **0/3**. Implement
   correct iterator return/throw, done-false and outer-unwind behavior; do not
   simply remove the state/finally guard.
5. Some GC/factory and legacy host-harness controls remain red as detailed
   below. Existing rest lowering also needs fresh-array semantics and general
   multiple-rest/spread handling; the latest fix does not claim to solve these.

Resume by rerunning parser acceptance on this checkpoint, fixing the retained
reductions and generator frontier, then expanding actual upstream unit coverage.
Checker compilation/execution, all 256 unit files and self-hosting remain open.
Keep the original fingerprints and strict assertions; do not weaken them.

### Reproduce the expanded binder check

Use the pinned runtime setup described in `tests/dogfood/README.md`, then:

```sh
node --experimental-wasm-exnref tests/dogfood/typescript-upstream-build-probe.mjs \
  --root tests/dogfood/.npm-upstream-suites/typescript --prepare-pinned-typescript \
  --mode source --entry ../../fixtures/typescript-binder-diagnostic-details.ts \
  --consumer-driven-barrels --target standalone --require-invocations 5 \
  --invoke-zero-case runDiagnosticArrayBeforeBind=0 \
  --invoke-zero-case runDiagnosticArrayPushBeforeBind=1 \
  --invoke-zero-case runConstLocal=65792 \
  --invoke-zero-case runDuplicateLet=131330 \
  --invoke-zero-case runDuplicateDiagnosticDetails=1 \
  --timeout-ms 1200000 --heap-mb 4096 --json
```

Generated `.tmp` logs, Wasm binaries and million-line WAT dumps are local
diagnostic artifacts, not PR contents. No verification process remains running.

## Goal

Use the actual [`typescript`](https://github.com/microsoft/TypeScript) npm package as the **fifth** real-world stress test for js2wasm, alongside #1031 (lodash), #1032 (axios), #1033 (react), and #1034 (prettier). The TypeScript compiler is the ultimate self-hosting milestone: **js2wasm compiling the compiler that js2wasm itself uses as its TypeScript frontend.**

This is distinct from the already-done **#452** ("Compile TypeScript compiler to Wasm"), which was a feasibility study using a hand-written 411-line toy scanner/parser that imitated TypeScript patterns. #452 concluded "95% of TypeScript patterns compile" — necessary validation, but not an attempt on the real thing. This issue is the real attempt.

## Why the TypeScript compiler specifically

- **~500K lines of mature production TypeScript** — biggest real-world corpus anywhere (vs 17K lodash, ~100K prettier, ~70K react, ~7K axios)
- **Exercises every language feature simultaneously** — parser, binder, type checker, emitter, language service, incremental compiler, module resolution
- **Self-hosting signal is the strongest correctness test possible**. If js2wasm compiles tsc, and compiled-tsc can then compile a non-trivial `.ts` file that matches native-tsc's output, that's a full round-trip semantic check of every path the compiler uses itself
- **No DOM, no Node builtins beyond `node:fs`** — clean host-import boundary (same approach as axios #1032 + WASI #1035 + #1044)
- **Recursive AST traversal + visitor pattern at massive scale** — surfaces every latent codegen issue
- **Huge switch statements on `SyntaxKind`** — hundreds of cases per binder/checker/emitter function; stresses large-switch codegen
- **Known challenges embedded:** template literals with `${}` interpolation (the 1/20 failure in #452), complex conditional/mapped types, recursive type definitions, AST node pool lifetime

## The moonshot — tiered acceptance

Escalating difficulty:

1. **Tier 1 (pattern validation — already done in #452):** TypeScript-compiler-shaped patterns compile. ✅ 19/20
2. **Tier 2 (real compiler leaves):** individual source files from `typescript/src/compiler/` compile without modification
3. **Tier 3 (scanner + parser):** compile `typescript/src/compiler/scanner.ts` + `parser.ts` so the resulting Wasm parses simple `.ts` source to an AST
4. **Tier 4 (checker subset):** compile enough of `checker.ts` to type-check `const x: number = "str"` and report TS2322
5. **Tier 5 (emit):** compile enough of `emitter.ts` to emit a `.js` file from a compiled AST
6. **Tier 6 (full round-trip):** compile a tsc subset end-to-end; hand it a `.ts` file, produce a `.js` file that matches native-tsc byte-for-byte (parallel to prettier's self-format diff #1034)
7. **Tier 7 — the moonshot (self-hosting):** compile js2wasm's own source with compiled-tsc and verify the second-stage js2wasm still compiles test262 correctly

**Tier 7 is aspirational. Tier 3 is the realistic sprint target. Tier 4 is the headline win.**

## Hard prerequisites

This issue depends on:

- **#1042 async/await state-machine lowering** — TypeScript's incremental compiler and project references use `async` extensively. Without real async, Tier 3+ is blocked.
- **#1044 Node builtin modules as host imports** — TypeScript uses `node:fs`, `node:path`, `node:util`, `node:crypto`. Required for loading the compiler's own source files from disk.
- **#1046 separate ES-module compilation with consumer-driven type specialization** — TypeScript's source is split across ~300 ES modules with a complex import graph. Current whole-program compile won't scale; this is a hard architectural blocker for Tier 2+.

Soft prerequisites (not strict blockers but would improve realization rate):

- **Template literal with `${}` interpolation** — #452's only known pattern gap. TypeScript uses these in hundreds of places for error message formatting
- **Large switch codegen scaling** — `binder.ts`, `emitter.ts`, and `checker.ts` each have switch statements with 200+ `SyntaxKind` cases. Our codegen currently emits linear if/else chains — won't fit
- **Recursive generic types** — `ts.Type`, `ts.Node`, `ts.Symbol` are deeply recursive with polymorphic `parent: Node | undefined` chains. If WasmGC struct layout doesn't support this cleanly, we hit walls in Tier 2
- **BigInt** — TypeScript uses BigInt in a few places (checksum/hash); not critical but breaks some modules

## Approach

### Step 1 — Start with leaf modules

Before touching the real compiler, pick the smallest self-contained files in `typescript/src/compiler/` with minimal external dependencies. Candidates:

- `typescript/src/compiler/core.ts` — pure utility functions (mapping, hashing, string helpers)
- `typescript/src/compiler/path.ts` — path manipulation (pure string operations)
- `typescript/src/compiler/debug.ts` — debug assertions
- `typescript/src/compiler/performance.ts` — performance instrumentation

Start with `core.ts` or `path.ts`. These are leaf dependencies with minimal external surface.

### Step 2 — Build a harness

Create `scripts/ts-compiler-stress.ts`:

```ts
import { compile } from '../src/index.ts';
import { readFileSync } from 'node:fs';

const tiers = {
  t2_leaf: [
    'node_modules/typescript/src/compiler/core.ts',
    'node_modules/typescript/src/compiler/path.ts',
  ],
  t3_scanner_parser: [
    'node_modules/typescript/src/compiler/scanner.ts',
    'node_modules/typescript/src/compiler/parser.ts',
  ],
  t4_checker_subset: [
    'node_modules/typescript/src/compiler/checker.ts',
  ],
  t5_emitter_subset: [
    'node_modules/typescript/src/compiler/emitter.ts',
  ],
};

for (const [tier, files] of Object.entries(tiers)) {
  console.log(`=== ${tier} ===`);
  for (const file of files) {
    const src = readFileSync(file, 'utf-8');
    const result = await compile(src, {
      fileName: file,
      esModulesAsHostImports: true,
      nodeBuiltinsAsHostImports: true,
    });
    console.log(result.success ? `  OK   ${file}` : `  FAIL ${file}: ${result.errors[0]?.message?.slice(0, 100)}`);
  }
}
```

### Step 3 — Categorize failures

Same as other stress tests (#1031-#1034): cluster by pattern, sample 2-3 per bucket, file follow-up issues for each concentrated cluster. Expected top buckets:

- Large switch dispatch codegen failures
- Template literal with interpolation (known #452 gap)
- Recursive generic types in declarations
- Module graph compile errors once #1046 lands
- New AST node kinds used internally by TypeScript that js2wasm doesn't handle

### Step 4 — The partial-compile validation

Once Tier 3 compiles (scanner + parser), build an incremental end-to-end test:

```ts
const compiledTs = await loadCompiledTypescript();
const sampleSource = 'const x: number = 1 + 2;';
const compiledAst = compiledTs.parseSource(sampleSource);
const nativeAst = ts.createSourceFile('sample.ts', sampleSource, ts.ScriptTarget.Latest);
assertASTEqual(compiledAst, nativeAst);
```

If compiled scanner+parser produces the same AST as native TypeScript for a set of representative input files, Tier 3 passes.

### Step 5 — Follow-up issues

Expected 5-15 new follow-up issues from Tier 2-3, each scoped narrowly enough for one sprint (one PR).

## Upstream-source experiment (2026-08-09)

### Provenance and comparison lane

The experiment used the exact upstream `microsoft/TypeScript` `v5.9.3` tag
(`c63de15a992d37f0d6cec03ac7631872838602cb`). The downloaded source archive
had SHA-256
`d371a2430d6305290d1bddaf195fdd629d1a8708cda08f4a72fc923b65d36c4a`.
Its checked-in `lib/typescript.js` and the pinned npm-compat fixture's
`package/lib/typescript.js` are byte-identical (both SHA-256
`3ae902c92cc44dace175c0e69e13a4b0899f6983c6121d76b9ab8dd5795e7675`).
This makes `--mode bundle` versus `--mode source` a representation comparison,
not a version comparison.

The committed worker-isolated probe runs both representations through the same
options:

```text
allowJs: true
skipSemanticDiagnostics: true
target: "gc"
platform: "node"
```

`allowJs: true` deliberately keeps the npm-compat diagnostic policy identical
for both lanes; `.ts` files are still parsed as TypeScript by extension. The
probe streams compiler phases and samples CPU, RSS, and worker event-loop
utilization, so a bounded timeout is distinguishable from an idle/deadlocked
process.

```bash
node tests/dogfood/typescript-upstream-build-probe.mjs \
  --root /path/to/TypeScript-5.9.3 --mode source \
  --timeout-ms 1800000 --heap-mb 4096 --json
```

### Full upstream source

`src/typescript/typescript.ts` resolves **280 input files / 13,780,098 bytes**.
On the clean overload-fix snapshot
`1d260d48a0d01ce3319f3017b81bf8f831f4f6f5`, the compiler passed the four
generic overload-owner frontiers recorded in #4267, #4268, #4270, and #4272.
At the 900-second cap it was actively emitting bodies: the last completed file
was `src/compiler/_namespaces/ts.moduleSpecifiers.ts`, followed by
`src/compiler/checker.ts`. At a near-terminal snapshot it had accumulated
11:22.67 CPU time; peak observed heap was 1,994.0 MB. This was a throughput
frontier, not a new semantic diagnostic.

A second run gave the source path twice as long and doubled the worker heap:

| budget | heap limit | result | CPU time | average cores | peak RSS | binary |
| ---: | ---: | --- | ---: | ---: | ---: | ---: |
| 1,800,000 ms | 4,096 MiB | bounded timeout | 1,681,964 ms | 0.93 | 2,531.7 MiB | 0 bytes |

That run remained CPU-active and repeatedly grew and garbage-collected its
heap through the exact 1,800,022 ms wall-clock cutoff. It was measured from the
npm-compat integration worktree at head
`8173091329ed37bf7e641e31456005e0e6e79aa4`; unrelated uncommitted dogfood
changes were present, so use the run as a scale/liveness measurement, not as a
stable performance baseline. It produced no result object or Wasm binary.

For comparison, the canonical published-bundle catalog run also produces no
binary before its 600,000 ms cap (`600,076 ms` observed). Upstream source is
therefore **not a compile-time shortcut today**. Its advantage is structural:
module boundaries turn the bundle's opaque large-IIFE frontier into named,
measurable source-file work and exposed four generic overload bugs that are now
fixed.

### Original parser-source slice

The smallest unmodified parser consumer used this wrapper only to make the
result observable:

```ts
import { createSourceFile } from "./src/compiler/parser.js";
import { ScriptKind, ScriptTarget } from "./src/compiler/types.js";

export function runCase(): number {
  const source = createSourceFile(
    "input.ts",
    "export const answer: number = 6 * 7;",
    ScriptTarget.Latest,
    true,
    ScriptKind.TS,
  );
  return source.kind * 1000 + source.statements.length;
}
```

Native TypeScript returns **308001** (`SourceFile.kind === 308`, one
statement). The unchanged upstream parser graph was compiled with:

```bash
node tests/dogfood/typescript-upstream-build-probe.mjs \
  --root /path/to/TypeScript-5.9.3 --mode source \
  --entry js2-parser-workload.ts --timeout-ms 900000 --heap-mb 4096 --json
```

The resolver admitted **82 input files / 82 user source files / 86 TypeScript
Program files** and planned 336 module-init statements. It reached the same
`ts.moduleSpecifiers.ts` → `checker.ts` boundary, then remained CPU-bound until
the exact 900,028 ms cutoff: 918,534 ms CPU, 1.02 average cores, 1,308.7 MiB
peak RSS, worker event-loop utilization 1.0, and no binary. Because no Wasm
module exists, **308001 is only the native oracle; no parser parity or package
test pass is claimed**.

The unexpected checker dependency is not inherent to parsing. Upstream
`parser.ts` imports `./_namespaces/ts.js`, and that generated barrel re-exports
`checker.ts`, the emitter, transformers, builders, watch support, and the rest
of the compiler. Direct parser source removes the `services`, `server`, and
`jsTyping` graphs (280 → 82 inputs), but the current recursive resolver retains
every re-export instead of only the named bindings consumed by the parser.

### Consumer-driven specialization slice

The first #1046-shaped slice is now implemented as an explicit
`resolve.consumerDrivenBarrels` mode. It tracks named demand through pure
import/re-export barrels, derives demand from static namespace property reads,
and specializes ordinary provider files by blanking unreachable function and
type declarations while preserving line positions. A dynamic namespace use,
an incomplete/cyclic export surface, or a side-effect-only import retains the
full edge. The option remains **off by default**: opting in is the caller's
explicit assertion that unused import/re-export targets and unreachable
declaration bodies in the generated source tree do not have required
initialization effects.

On the exact upstream `v5.9.3` parser wrapper this reduces the graph from **82
input files / 86 Program files to 31 input files / 35 Program files**. The
selected graph no longer contains the emitter, build, watch, or language-service
subsystems. `checker.ts` is still present only for the `getNodeId` leaf used by
`nodeFactory`; specialization blanks 98.3% of its non-whitespace source
(2,178,565 → 38,005 characters). The largest remaining provider is
`nodeFactory.ts`: its single demanded factory returns a large method object, so
declaration-level specialization cannot yet remove individual returned
properties.

The probe now accepts an invocation export, a runtime string, and a numeric
oracle. This keeps the parser input dynamic instead of embedding it in the
wrapper. Native TypeScript returns **308001** for
`"export const answer: number = 6 * 7;"` and **308002** for
`"let a = 1; let b = 2;"`; a future Wasm success must invoke the compiled
`runCase(sourceText)` export and match the requested value before the probe can
pass.

With the four generic overload fixes (#4267, #4268, #4270, #4272) layered for
validation, the specialized static-input wrapper reached final codegen in
251,093 ms at 555.5 MiB peak observed RSS instead of timing out at 900,028 ms
and 1,308.7 MiB on the unspecialized graph. It exposed two generic finalization
gaps: nested `InterfaceDeclaration` statements were incorrectly reported as
runtime statements, and the constant-box walker revisited shared instruction
arrays once per incoming edge. Focused fixes now ignore nested type-only
declarations and visit instruction-array DAG nodes once.

The authoritative **dynamic-input** run still produces no binary. With the
same 31-file graph it remained CPU-active through a 300,300 ms cap (264,014 ms
CPU, 609.5 MiB peak RSS) after compiling 3,252 function bodies. Disabling
constant-box hoisting also timed out after the last profiled
`declared-func-refs` phase (300,083 ms, 206,033 ms CPU, 643.6 MiB peak), proving
that the residual finalization tail is not solely that pass. Consequently
there is still **no 308001 Wasm parity claim**. The next leverage is
consumer-driven property specialization of returned method tables—especially
`createNodeFactory`—plus phase-level profiling of the post-body finalizers.

### Suspended handoff (2026-08-09)

The consumer-driven specialization is committed as `7a50f7fd9a34fd` on the
published `codex/npm-compat-handoff` branch. There is no later uncommitted
TypeScript experiment.
The authoritative dynamic probe remains CPU-active rather than idle: it has
compiled 3,252 bodies when the 300.3-second child budget terminates it, but it
never emits a binary. Therefore TypeScript does **not** compile yet and 308001
is still only the native oracle.

Resume with phase-level profiling after the final body and consumer-driven
property specialization of returned method tables, starting with
`createNodeFactory`. Recompiling the upstream TypeScript source is already the
preferred experiment; merely raising the timeout repeats the measured
post-body tail without addressing it.

### Decision

Keep the upstream TypeScript source route as the migration substrate, but do
not replace the npm-compat package result with it and do not claim that
TypeScript compiles. Land consumer-driven specialization as a measurable,
default-off #1046 slice: it removes 51 irrelevant files and more than halves
peak memory, but the remaining returned-method table and finalization work
still prevent a binary. Raising the timeout or heap alone does not close the
gap; both the 4 GiB / 30-minute full-source run and the 31-file dynamic run
prove that.

## Codex implementation handoff (2026-08-28)

Branch: `codex/1058-typescript5-selfhost`.

The pinned TypeScript 5.9.3 parser graph now compiles to a valid WasmGC module.
The latest authoritative run produced an 81,241,283-byte binary in 298,177 ms
(3,638.8 MiB peak RSS); compilation succeeded and `WebAssembly.validate`
returned true. This closes the former no-binary/finalization frontier, but Tier
3 is not complete because runtime AST fingerprints do not yet return.

```bash
JS2WASM_TYPESCRIPT_PROBE_DIAGNOSTIC=1 \
JS2WASM_TYPESCRIPT_PROBE_SOURCE_MAP=1 \
pnpm run dogfood:typescript-parser-source
```

Diagnostic artifacts are written to
`/private/tmp/ts2wasm-typescript-parser-latest.wasm` and the adjacent `.map`.

### Completed in this branch

- Pins/prepares the exact upstream source and adds a three-file AST fingerprint
  harness; consumer-driven barrel pruning and post-body DAG finalizers now
  complete within the five-minute worker budget.
- Repairs recursive layouts, mapped readonly erasure, constructor/factory
  identity, late fixups, nested captures, module initialization, enum aliases,
  and the large instruction graphs reached by the parser build.
- Preserves omitted optional numeric arguments as `undefined` at callable
  property boundaries (`scanner.setText(sourceText)` previously received zero
  and produced an empty AST).
- Widens mixed-`undefined` nested returns so `getDirectiveFromComment` no longer
  boxes the undefined f64 sentinel as a Number.
- Pre-registers safe zero-argument boolean/GC-reference callbacks and bridges
  erased generic results, clearing `scanner.speculationHelper<T>` and
  `parser.parseListElement<T>` without admitting unsafe argument-bearing ABIs.

The latest focused checkpoint passed 14/14 optional-padding, generic-callback,
and scalar-callable safety tests. `pnpm run typecheck` also passed.

### Remaining Tier-3 blocker

All three required inputs now converge on one runtime frontier:

```text
RuntimeError: dereferencing a null pointer
  at createIdentifier
  at parseIdentifier
  at parsePrimaryExpression
source: src/compiler/parser.ts:2649:9
wasm offset: 2106116 (source-map anchor 2098406)
```

`builderStatePublic.ts`, `corePublic.ts`, and `performanceCore.ts` therefore do
not yet return their expected fingerprints. Resume by extracting
`createIdentifier` (function index 927 in the latest diagnostic module) and
tracing the null receiver/argument at parser line 2649. Do not revisit the
resolved empty-AST, comment-directive, or generic callback paths unless their
focused regressions fail. After this frontier, rerun the three fingerprints,
then the strict 11-callback upstream suite and final TS5/TS7 typechecks/oracle
ratchet.

### PR refresh against current main (2026-08-29)

PR #5183 was refreshed onto `main` through
`81e54a98ebf95285e22bd2a82ff339cfd06a3fc8`. The merge keeps the parser
branch's nested-capture offset for spread calls while honoring main's newer
`arguments`-based spread path, uses the prepared multi-source module-init
finalizer, profiles both return- and parameter-unboxing statistics, and
combines inherited-array carriers with builtin-shadow protection. The latter
also guards recursive base-type discovery so a user-defined `Array` cannot be
reclassified as the intrinsic.

After the refresh, both TS5 and TS7 typechecks pass, repository lint reports no
errors, all 45 issue-1058 test files pass (151 tests), and the merge-sensitive
main regressions pass (8 files, 94 tests). The runtime `createIdentifier` null
deref above remains the only known Tier-3 fingerprint blocker; this refresh
does not claim it is resolved.

## Runtime parser handoff (2026-08-30)

Branch: `codex/1058-typescript5-runtime`, synchronized to `origin/main` at
`275216c74c7299ea07a72c8d5479f7e1a477000c`.

The canonical consumer-driven TypeScript 5.9.3 scanner/parser graph **compiles
and validates** after the sync. The authoritative diagnostic run on this tree
finished in 467,608 ms worker time / 468,686 ms wall time and produced an
**84,817,448-byte** Wasm module from 30 input/source files, 34 program files,
and 4,284 functions. Peak RSS was **3,848.6 MiB**, below the 4 GiB gate, and the
result contained 16 non-fatal IR/projection warnings. `compileSuccess` and
`WebAssembly.validate` are both true.

Runtime parser equivalence remains open. The same fresh build invoked all three
canonical inputs; none returned its required fingerprint:

- `builderStatePublic.ts = 13386537220945`
- `corePublic.ts = 40098163538143`
- `performanceCore.ts = 49645738923599`

`builderStatePublic.ts` and `performanceCore.ts` both reach semicolon recovery
with a missing Identifier whose `escapedText` is `undefined`, then fail in
`unescapeLeadingUnderscores` / `utilitiesPublic.ts:851`. `corePublic.ts` reaches
an `illegal cast` in `__call_fn_method_2` from
`parseBinaryExpressionRest`. The diagnostic Wasm and source map were preserved
at `/private/tmp/ts2wasm-typescript-parser-latest.wasm{,.map}` for the next
investigation; they match this exact source tree and must not be confused with
the earlier 83.6 MB artifact used for the size audit.

### Compiler fixes in this follow-up

- Generic calls returning callable values (TypeScript's `memoize` family) keep
  a callable closure carrier instead of freezing to the first apparent result.
- Fresh generic node factories use the exact checker declaration and explicit
  result type argument, recover a concrete binding destination during prepared
  program replay, and remain on the legacy materializing frontend when the IR
  overlay cannot preserve that proof.
- `Node -> Declaration -> StringLiteral/NumericLiteral/BinaryExpression` now
  materializes fresh structural extensions rather than performing a nominal
  guard-cast that can only yield null.
- Missing non-null reference fields are widened to nullable carriers across the
  highest owning nominal ancestor and its complete descendant subtree. This
  keeps mutable WasmGC prefixes exact for TypeScript's
  `IterationStatement -> Do/While/For*Statement` hierarchy.
- Interface layout stability now treats its set as an active recursion stack.
  Legal diamonds may revisit an already-completed `Node` branch, while genuine
  active cycles remain rejected. This preserves `StringLiteral`'s nominal
  `LiteralExpression` identity across `parseLiteralLikeNode`.
- Focused coverage includes cross-module memoizers, cached-getter freshness
  rejection, prepared multi-module factories, concrete nullable `Symbol`
  fields, sibling loop layouts, and the exact four-module literal/parser
  diamond that previously trapped.
- Callable-property invocation now bridges erased generic reference ABIs in
  both directions. In particular, a generic `(externref) -> externref`
  identity stored as `Rules.apply(Box): Box` no longer freezes or miscasts its
  argument/result carrier. The focused regressions in
  `issue-1058-generic-identity-return.test.ts` and
  `issue-1058-generic-base-node-factory.test.ts` compile, validate, and return
  their expected values.
- Callback ownership and registration now span the whole prepared source
  graph. Later-source named callbacks are discovered before an earlier generic
  dispatcher is compiled, while an inline arrow passed to a method declared by
  a compiled interface stays on the Wasm-closure path instead of being wrapped
  as a host callback. This is the exact TypeScript parser shape
  `scanner.tryScan(() => scanner.reScanInvalidIdentifier() === Identifier)`;
  before the fix `speculationHelper<T>` cast the host wrapper to a null Wasm
  closure root. All five focused cases in
  `issue-1058-multifile-generic-callback-registration.test.ts` now pass,
  including the inline-arrow case returning `42` and the later-source
  boolean/node/enum callback case returning `14243`.
- Cross-source callback discovery is cached graph-wide. Registration still
  runs per source so a later exact ABI can replace a conservative entry, but
  the compiler no longer walks the roughly 10 MB TypeScript graph once for
  every source.
- Body-proven generic identity helpers can recover the concrete input carrier
  after an erased `externref -> externref` call. The proof fails closed: every
  outer value return must name the same generic parameter symbol and the
  binding may not be assigned, updated, rebound, or used as a loop write
  target. Property writes remain valid for TypeScript's `finishNode<T>`.
  Negative regressions cover returning a fresh asserted value and rebinding
  the parameter before return.

Current-main validation is green for all **53** `tests/issue-1058-*.test.ts`
files (**183/183 tests**), including all **6/6** multi-file callback cases and
the new generic-identity safety controls. TS5 and TS7 typechecks, repository
lint/format, the IR fallback ratchet, the oracle ratchet, and
`git diff --check` pass. The strict upstream callback suite is intentionally
not claimed: its prerequisite parser fingerprints still fail as documented
above.

### Artifact size note

The roughly **84 MB** output is not an intrinsic cost of TypeScript's parser;
it exposes a js2wasm code-generation pathology. A measured 83,585,611-byte
diagnostic artifact has an **81,488,148-byte code section (97.49%)** and no
embedded source/data payload. Of that code, 1,176 generated `__closure_*`
bodies occupy 76,499,060 bytes. TypeScript's 88 KB `visitorPublic.ts` accounts
for **75,571,430 bytes** of closure code because its visitor callback cohort is
emitted during discovery and then twice during the final two-pass compile. The
two final cohorts include an exact byte-for-byte duplicated
**36,791,280-byte** block.

This is why comparison with an approximately 100 KB QuickJS parser is only
partly apples-to-apples: this gate links about 6.82 MB across 28 TypeScript
frontend modules, factories, utilities, diagnostics, and initialization, and
emits raw unoptimized WasmGC. Even so, the current size is not acceptable as a
normal parser baseline. Binaryen's `--remove-unused-module-elements` alone
reduces the measured artifact from 83,585,611 to **41,141,284 bytes**, proving
that almost half is removable duplicate/dead module code rather than required
runtime behavior.

Size follow-up priorities, in order, are:

1. Make callback discovery transactional/analyze-only, or prune the functions
   it emits, so the final pass does not retain the discovery cohort.
2. Reuse the final two-pass closure bodies instead of minting a second identical
   function for the same AST node and capture ABI.
3. Replace per-call expansion over roughly 1,034 closure candidates with shared
   or ABI-narrowed dispatch helpers.
4. Reduce exports and run unused-module elimination/optimization before
   delivery; pool the 12,057 imported string globals separately.

### Exact remaining work

1. Reduce the remaining `builderStatePublic.ts` / `performanceCore.ts`
   `undefined.length` failure through `unescapeLeadingUnderscores` and
   `parseErrorForMissingSemicolonAfter` (`utilitiesPublic.ts:851:5`). The
   optional-argument closure metadata now survives captured and constructible
   subtypes, so this later parser-list carrier miss needs a focused trace rather
   than another broad arity exception.
2. Reduce the independent `corePublic.ts` two-argument method cast in
   `parseBinaryExpressionRest` / `__call_fn_method_2`.
3. Make all three invocations return the expected fingerprints above, then run
   the strict 3-file / 11-callback upstream suite.

This is a real-package compile/validation milestone, not a claim that the
three AST fingerprints or the whole TypeScript unit suite pass yet.

## Runtime carrier follow-up handoff (2026-08-31)

Branch: `codex/1058-typescript5-runtime-followup`, synchronized to the actual
`loopdive/js2` `main` at
`b1085049ed2ed722c33480528b2741369ed73822`. This supersedes the earlier
handoff's `origin/main` wording; that remote points at the legacy
`loopdive/js2wasm` repository.

The final post-sync diagnostic run compiled and validated the canonical
TypeScript 5.9.3 parser graph. It produced an **84,901,009-byte** Wasm module in
363,428 ms worker time / 364,469 ms wall time from 30 source files, 34 Program
files, and 4,284 functions. Peak RSS was **4,027.9 MiB**, below the 4 GiB
worker cap, and the result retained 16 non-fatal IR/projection warnings.
`compileSuccess` and `WebAssembly.validate` are both true. The diagnostic Wasm
and source map are at
`/private/tmp/ts2wasm-typescript-parser-latest.wasm{,.map}`.

### Compiler fixes in this follow-up

- Fail-closed semantic recognition of generic callback-result helpers now
  preserves `<T>(callback: () => T): T` across nested/lifted declarations,
  runtime namespaces, forwarded scanner methods, and constraint-backed
  `current as T` parser fallbacks. `parseListElement` no longer freezes its
  result ABI to the first `Statement` instantiation and nulls a later sibling
  `VariableDeclaration`.
- Closure metadata records the minimum accepted source arity. Dynamic callback
  dispatch pads only proven omitted `externref` suffixes with the canonical
  JavaScript `undefined`, and captured/constructible closure subtypes preserve
  that metadata. Callable-property dispatch likewise accepts safe shorter
  runtime arities without widening scalar suffixes.
- Fresh generic Node/token factories preserve their declared source carrier,
  project concrete sibling results at the call site, and allow only proven
  fresh, non-escaping structural extensions. Arbitrary constructors,
  conditional fallthrough, nested mutator captures, and returned-factory
  escapes all fail closed in focused negative tests.
- Nested FunctionDeclaration result lowering, first-void runtime-namespace
  registration, lossless asserted reference-field export, and immutable
  hoisted-function rematerialization were repaired. Reassignment discovery now
  includes destructuring, updates, and loop assignment targets so a live
  replacement is not overwritten by a later rematerialization.

The former `createIdentifier`/factory failure and the later
`parseVariableDeclarationList` null dereference are both cleared. Runtime
fingerprint equivalence is still open:

- `builderStatePublic.ts` and `performanceCore.ts` stop with
  `TypeError: Cannot read properties of undefined (reading 'length')` through
  `unescapeLeadingUnderscores`, `parseErrorForMissingSemicolonAfter`, and
  `parseListElement` (source-map location `utilitiesPublic.ts:851:5`, Wasm
  offset 1,764,823).
- `corePublic.ts` advances through `parseVariableDeclarationList`, then reaches
  the known `illegal cast` in `__call_fn_method_2` from
  `parseBinaryExpressionRest` (Wasm offset 83,123,160; the retained source-map
  fallback anchor is `parser.ts:10709:1`).

All **56** `tests/issue-1058-*.test.ts` files pass (**285/285 tests**). The four
merge-sensitive dynamic-dispatch suites add **65/65** passing tests. TS5 and
TS7 typechecks pass. This remains a compile/validation and runtime-frontier
advance, not a claim that the three AST fingerprints or TypeScript's upstream
unit tests pass.

## Current-main parser and size handoff (2026-08-31)

The follow-up branch is now merged forward to `loopdive/js2` `main` at
`f08c7c62ce96ce4cbfe8ec89dc7ec2e9a5d10dba` (merge commit
`b8f25effd2826109075f5dba053b60b6841f68df`). The final post-merge canonical
source probe still compiles TypeScript 5.9.3 successfully and emits valid Wasm.
The latest run took 372,529 ms in the worker / 373,428 ms wall time, retained
4,283 source functions after body compilation, and produced an
**85,102,452-byte** module. Peak RSS was **4,379.1 MiB**: the worker completed
within its configured 4,096 MiB V8 heap limit, but process RSS exceeded the 4
GiB target and must not be reported as a memory-gate pass. Its SHA-256 is
`fb1fbb02d76f1e2a514325154bfffec6f45d2b0c936cde1105d3e97ed33b73b0`;
the artifact and source map are
`/private/tmp/ts2wasm-typescript-parser-latest.wasm{,.map}`.

The size is generated-code amplification, not 9 MB of source being copied into
the module. In the measured 84.9 MB predecessor (the same retained source
graph and code-generation regime), the code section was 82,807,923 bytes
(97.53% of the whole module). `visitorPublic.ts` alone accounted for 589
functions and 76,811,865 function-body bytes (90.47% of the module), while
`parser.ts` accounted for 9,579 functions but only 3,667,500 bytes (4.32%).
Exact duplicate function bodies represented 37,099,453 bytes (44.81% of all
body bytes); gzip reduced the raw module to 14,153,303 bytes. This is why an
approximately 100 KB hand-written QuickJS parser is not comparable to this raw
artifact: js2 currently specializes TypeScript's large visitor callback table
into hundreds of 0.5--0.87 MB closures and retains duplicate discovery/final
cohorts. The result has not received whole-module unused-function elimination,
identical-code folding, or ordinary Wasm optimization. Removing unused module
elements alone previously reduced the artifact to about 41.1 MB, so the first
size fix belongs in reachability/deduplication rather than parser semantics.

This round added focused fixes for four concrete compiler gaps:

- TypeScript's merged brand-only `TypeNode` interface now aliases its exact
  physical `Node` parent under the source-authored zero-runtime brand contract.
  Token identity and post-store mutations remain observable; spoofed or
  value-read brands fail closed and retain a real field.
- Generic factory/callback detectors avoid whole-program binding scans before
  resolving a declaration and treat non-mutating unary property reads as reads,
  not writes.
- Nullable vec-to-vec/tuple projections preserve `undefined` before reading the
  source length. This clears the `createInterfaceDeclaration` heritage-clause
  null dereference while retaining populated element projection.
- Minimum callback arity is persistent across replacement of a shared
  `ClosureInfo` record. Optional declarations discovered before their source
  function handle exists now remain in a small pending set; later calls revisit
  only that set and register the exact capture/TDZ-stripped physical ABI.
  Parameter-expanded linear `Uint8Array` ABIs retain both pointer and length
  slots. This clears the former `parseIdentifierName` candidate miss.

The three runtime fingerprints do **not** pass yet:

- `builderStatePublic.ts` and `performanceCore.ts` clear the former
  `parseModuleExportName` / `parseIdentifierName` miss. They now advance through
  `parseImportSpecifier` and stop in `parseImportOrExportSpecifier` with a
  terminal TypeError at `parser.ts:8614:13`. This later carrier/callable miss
  needs its own focused trace; it is not evidence that the earlier callback
  registration fix failed.
- `corePublic.ts` cleared the former illegal cast and nullable heritage-array
  dereference. It now finishes parsing and fails in `clearState`; the reported
  `parser.ts:1784:32` location is one call early. Runtime instrumentation proves
  `scanner.setOnError(undefined)` succeeds. The actual miss is the following
  `scanner.setScriptKind(ScriptKind.Unknown)`: the live captured closure and its
  finalized `__call_fn_1` arm work, but the earlier call-site-local ladder was
  frozen before `createScanner` published that exact nominal trampoline type.
  The sound follow-up is a deferred/finalized callable-property dispatcher, not
  another eager signature guess or a `setOnError` special case.

The next focused follow-up now implements both diagnosed parser seams:

- Conditional expressions joining different nominal reference siblings no
  longer select the first arm's concrete layout and guarded-cast the other arm
  to null. Each arm first honors a lossless contextual reference carrier; with
  no contextual carrier, the result uses the nearest declared common struct
  ancestor (or `externref` when no such ancestor exists). The exact
  `StringLiteral | Identifier` shape behind
  `parseImportOrExportSpecifier` is covered, as is the contextual vec-union
  counterexample that would regress Redux reducers if joined at `__vec_base`.
- Eligible externref-backed callable properties now reserve one typed private
  dispatcher per declared ABI/result while lowering early call sites, then fill
  its body from the complete closure registry after all source bodies have been
  emitted. This admits `createScanner`'s later-published `setScriptKind(number)`
  trampoline without guessing another eager signature or shifting already
  baked module indices. The order-independent path is deliberately limited to
  zero-argument or all-scalar signatures: any admitted reference parameter can
  be indistinguishable from a source-rest closure prefix and still needs an
  argc/argv-aware carrier before it can be widened soundly.

At this checkpoint all **59** `tests/issue-1058-*.test.ts` files pass
(**301/301 tests**). The merge-sensitive #3996/#4294/#4470/#4486/#5166 and
TypeScript verdict controls add **117/117** passing tests. Both TS5 and TS7
typechecks pass, as do the focused formatter/linter, issue-ID, IR-fallback,
LOC/function-budget, and oracle-ratchet gates. The bounded pinned TypeScript
5.9.3 upstream adapter now passes **14/14** native and **14/14** Wasm callbacks
across four selected original files, including all three admitted
`comments.ts` scanner callbacks; **252** files / **1,747** registrations remain
explicitly deferred. These are focused and inventory-honest results, not a
claim that TypeScript's complete upstream unit suite passes. The post-fix
canonical three-fingerprint parser run remains the next required measurement.

## Parser-first carrier checkpoint and module plan (2026-08-31)

The latest pre-fix canonical artifact is **84,770,324 bytes** with **4,298
functions** (SHA-256
`7f2a39eea88146b5c5b595b0dd576d9bd217e574d7b138468fb2fe9dc6c2f464`). It
compiles, validates, and all three
workloads enter the compiled parser. The two remaining failures were reduced to
exact representation/order boundaries rather than parser algorithms:

- `builderStatePublic.ts` and `performanceCore.ts` reached NodeFactory with a
  generic `PunctuationToken` allocation carrier, while the generated
  `createPropertySignature` / `createMethodSignature` ABI demanded a distinct
  nominal `QuestionToken` alias leaf.
- `corePublic.ts` reached `cast(value, isLeftHandSideExpression)`, but the
  generic predicate's callable ladder was finalized before the later imported
  `Node -> boolean` predicate wrapper was visible.

Direct object type-reference aliases now reuse the referenced declaration's
exact carrier when their field ABI and source-level scalar brands match. The
referenced declaration remains the sole owner of shared field metadata, so
sibling specializations such as `Box<A>` and `Box<B>` cannot rewrite each
other's generic field carrier. Cross-source callback discovery now resolves
import aliases to their exported declarations, records exact source-declared
reference predicates, and admits their guarded `externref -> ref` argument
bridge only inside a callable type-predicate signature. Focused coverage passes
in both GC and standalone lanes; all **61** issue-1058 files pass (**306/306
tests**), the nine merge-sensitive/verdict controls pass **117/117**, the pinned
TypeScript slice passes **14/14** native and **14/14** Wasm callbacks, and TS7
typecheck passes.

The subsequent canonical run at `4f153cc9eb4bac` compiled and validated but did
not pass parser acceptance. It took 495,805 ms in the worker / 496,708 ms wall
time, retained 4,301 functions, and emitted a **91,625,084-byte** module. Peak
RSS was **4,310.3 MiB**, so it again completed within the configured 4,096 MiB
V8 heap while exceeding the 4 GiB process-RSS target. All three invocations
failed:

- `builderStatePublic.ts` and `performanceCore.ts` reached the exact registered
  `createPropertySignature` / `createMethodSignature` method arms but trapped
  while converting a parser-produced token. TypeScript's overload exposes a
  `PunctuationToken<T>`, whereas the implementation deliberately allocates its
  generic `Token<T>` parent. `PunctuationToken<T> extends Token<T> {}` had no
  physical members but was emitted as a distinct WasmGC child, making the
  original parent allocation fail the child-typed argument cast.
- `corePublic.ts` reached `createExpressionWithTypeArguments` and the exact
  `isLeftHandSideExpression` predicate target was present in `cast`. The value
  came from TypeScript's generic base-`Node` allocator, then crossed the
  `Expression -> UnaryExpression -> UpdateExpression ->
  LeftHandSideExpression` checker-only brand chain. Those documented zero-cost
  brands had nevertheless become physical fields and distinct nominal WasmGC
  children, so the original base allocation failed the predicate's `Node`
  carrier conversion.

A runtime-empty, single-base interface with stable physical layout now aliases
its parent's exact carrier. The rule requires one unmerged base, no physical
members, and exact ordered field/mutability/physical-brand equality. A merged
brand-only alias also records its carrier provenance so a later single-base
descendant can link through that alias to the real parent instead of remaining
a flat sibling. TypeScript's single-underscore syntax brands are erased only
under the source-authored "never actually given values / zero cost" contract,
only for interfaces descending from `Node`, and only when the complete selected
source graph contains no runtime read or write of that brand. Ordinary brands,
value-observed brands, member-bearing shapes, multiple-base interfaces, and
unstable layouts remain physical.

Production-shaped regressions now cover `NodeFactory.createToken`, the fourth
`createPropertySignature` `TypeNode` argument through a merged base, and the
generic base-`Node` allocation entering `cast(...,
isLeftHandSideExpression)`. They pass in the canonical GC lane (the token and
merged-`TypeNode` cases also pass standalone), while the sibling generic object
specialization and value-observed-brand controls remain green. All **62**
issue-1058 files pass (**309/309 tests**); the nine
merge-sensitive/verdict controls pass **117/117**, and TS7 typecheck passes.
Another canonical three-fingerprint run remains required before parser
acceptance can be claimed.

The immediate product boundary is a runnable **parser-only** artifact. Its
entry graph should link scanner, parser, syntax/node factories, and only their
required core/diagnostic initialization. Binder, checker, emitter, and language
services are not parser-milestone roots. Subsequent public entry graphs should
layer these capabilities explicitly:

1. scanner/parser and AST construction;
2. binder over an existing AST;
3. checker over parser+binder;
4. language/editor/incremental/server services as an opt-in graph.

Source-graph elimination must start from the selected entry API. Type-only
imports disappear, and a runtime module that is neither reachable nor
re-exported may be omitted only when its top-level evaluation is proven
effect-free. Side-effect imports, observable initializers, and module evaluation
order remain roots. Consumer-driven barrels should retain the named parser
bindings, not every export from `_namespaces/ts.js`.

A second DCE pass is required after lowering. Its roots are public exports,
module/start initialization, host-visible callbacks, and functions genuinely
reachable through `ref.func`, tables/elements, or dynamic registries.
Unreachable functions, globals, types, data, and table entries should be
removed, followed by identical-body folding. Current barriers are the broad
`ts` namespace barrel, eager module initialization, runtime namespace and
callable-dispatch registries, conservative `ref.func` rooting, and duplicate
discovery/final closure cohorts. The measured reduction from roughly 83.6 MB
to 41.1 MB using unused-module elimination already proves that a large fraction
of the parser artifact is removable generated code.

## Parser runtime identity follow-up (2026-08-31)

The next canonical parser-only run compiled and validated a **89,140,516-byte**
module with **4,300 functions**, but did not yet pass runtime acceptance. It
took 520,426 ms in the worker / 521,733 ms wall time and peaked at **4,529.9
MiB RSS**. The three real parser invocations advanced beyond the earlier token,
TypeNode, generic-callback, and vec-carrier failures, then exposed two exact
identity boundaries:

- `builderStatePublic.ts` reached `forEachChildInInterfaceDeclaration`, but an
  `InterfaceDeclaration` stored in `NodeArray<Node>` had been structurally
  projected to a physical `Node`. The later syntax-kind handler therefore
  could not cast it back to `InterfaceDeclaration`.
- `corePublic.ts` and `performanceCore.ts` reached
  `parenthesizeTypeArguments`. The factory method dispatcher converted the
  host Array facade through a fresh vec materializer instead of recovering the
  original NodeArray, dropping its identity-bound `pos` / `end` properties
  before `isNodeArray` observed it.

Flattened multiple-heritage interfaces now consider stable, unmerged
**transitive** declared ancestors and install only the largest exact
mutable-field-prefix edge. The production-shaped hierarchy now remains
`InterfaceDeclaration -> Declaration -> Node`, so a derived allocation keeps
its runtime identity through a base Node array. Method closure dispatch now
mirrors free-call dispatch by unwrapping live host facades before concrete
reference conversion. It also normalizes both omitted and explicitly supplied
JavaScript `undefined` to a nullable Wasm ref before casting.

The parser's earlier `forEach<T, U>` frontier is handled by a narrowly
source-certified bridge for direct, capture-free, single-parameter callbacks
whose physical formal is a **non-null** declared ref. Nullable generic callback
formals are deliberately excluded: JavaScript `undefined` is not Wasm null,
and admitting them would reintroduce an unconditional `ref.cast_null` trap.
Constrained type parameters are resolved to their base constraint only in
array-element position. This establishes the canonical `readonly T[]` /
`NodeArray<Node>` carrier needed here; it is not a claim that multiple distinct
derived-array instantiations of the same generic body are fully canonicalized.
That pre-existing order-dependent specialization case remains follow-up work.

Zero-cost syntax-brand erasure is now limited to the known TypeScript Node
brand allowlist declared in `src/compiler/types.ts` under TypeScript's own
zero-runtime-cost contract. Direct and constant-computed runtime observation
disables erasure. This keeps the parser optimization package-scoped instead of
treating similarly named fields in ordinary programs as phantom state.

All **62** issue-1058 files now pass (**313/313 tests**). The nine
merge-sensitive/verdict controls pass **117/117**, and both TS5 and TS7
typechecks pass. Parser acceptance is still intentionally unchecked here: the
branch must first merge the current `loopdive/js2` main and then rerun all three
canonical fingerprints on that final tree. Checker, emitter, and language
services remain outside this parser-first gate.

## Synced parser-first canonical checkpoint (2026-08-31)

The follow-up branch was rebuilt directly on `loopdive/js2` main
`3193ca16685de143af1ae1d6066978b2590c687d`. The canonical consumer-driven
parser graph still contains only **30 input/source files** (**34** total program
files) and **310** module-initialization statements; checker, emitter, and
language-service entry points remain outside this gate.

The first synced run compiled and validated a **69,179,695-byte** module in
345,273 ms wall time and peaked at **3,684.7 MiB RSS**. All three invocations
reached NodeFactory, then converged on one producer defect: a valid
StringLiteral allocated through TypeScript's generic base-node factory was
tested against a separately materialized `LiteralLikeNode` WasmGC carrier and
became null. A TypeScript-only, unmerged `LiteralLikeNode -> Node` carrier alias
now follows the package's documented zero-runtime-cost syntax contract. A
production-shaped regression reproduces the original `parseLiteralLikeNode`
null dereference before the fix and returns the expected value afterward.

The post-fix canonical run again compiled and validated. It emitted a
**69,178,167-byte** module (SHA-256
`32f0ab847dc6c0a2760345cc3285f399e14c204812469d59689586444ba8d0bb`) with
**4,413** source functions after body generation and **16** non-fatal IR
fallback warnings. It took 326,946 ms in the worker / 328,038 ms wall time,
used 360,403 ms CPU (1.10 average cores), and peaked at **3,915.7 MiB RSS**,
inside the 4 GiB process-RSS gate. The literal/import failure is gone, but the
three fingerprints are not yet accepted:

- `builderStatePublic.ts` and `corePublic.ts` now expose the next exact syntax
  seam. Concrete property/index-signature nodes already use the shared Node
  carrier, while `parseTypeMember(): TypeElement` returned through a distinct
  physical `TypeElement` carrier and converted those valid members to null.
  The same tightly gated TypeScript allocation-view rule now covers the
  unmerged `TypeElement` interface. A focused regression exercises both
  PropertySignature and IndexSignatureDeclaration values through the
  TypeElement return/array boundary.
- `performanceCore.ts` reaches its first heritage clause, `Performance extends
  PerformanceTime`. `tryParseTypeArguments()` correctly takes the `undefined`
  source branch, but the externref-to-nullable-NodeArray coercion tests only
  Wasm null. Host JavaScript `undefined` is a non-null externref, so it falls
  through `__array_from_iter(undefined)` and fabricates a truthy empty vec with
  no NodeArray `pos` / `end` metadata. The later `isNodeArray` cast correctly
  rejects it. Exhaustive WAT inspection proves every cache writer and the
  executable funcref target the exact `isNodeArray` trampoline; the misleading
  `'map'` text is only stale reflective function-name metadata. Nullable
  externref-to-vec materialization must preserve both null and undefined instead
  of synthesizing an empty collection.

After the two syntax-view repairs, the focused carrier set passes **58/58**.
Before the TypeElement follow-up, the complete issue-1058 suite passed all
**62** files (**315/315 tests**), both TS5 and TS7 typechecks passed, and
Prettier plus `git diff --check` were clean. Parser acceptance remains
intentionally unchecked until the cached-function identity defect is fixed and
all three canonical fingerprints match in one final synced run. This is still
not a claim that TypeScript's complete upstream unit suite passes.

## Final parser-first handoff checkpoint (2026-08-31)

The final synced branch still **compiles and validates the complete selected
parser graph**. The canonical run retained the same 30 input/source files, 34
program files, and 310 module-initialization statements. It emitted a
**69,198,117-byte** Wasm module with **4,403** functions after body generation
and 16 non-fatal IR-fallback warnings. Compilation took 386,124 ms in the
worker / 387,478 ms wall time. Peak process RSS was **4,479.9 MiB** with a
4,096 MiB V8 heap limit, so the module completed but did not meet the stricter
4 GiB process-RSS target. The exact runnable artifact and source map are
preserved at `/private/tmp/ts2wasm-typescript-parser-latest.wasm` and
`/private/tmp/ts2wasm-typescript-parser-latest.wasm.map`.

Two production-shaped carrier defects were closed before this run:

- vec-to-vec element projection now preserves host-backed expando/MOP state on
  the new physical vec. The focused NodeArray regression covers direct
  `DerivedNode[] -> Node[]` widening and the `forEachChild` optional `cbNodes`
  callback path, retaining `pos`, `end`, `hasTrailingComma`, and indexed
  elements;
- TypeScript's `PropertyAccessChain` now follows its exact
  `PropertyAccessExpression`/`Node` allocation carrier. The focused multi-file
  regression uses the real `src/compiler/types.ts` zero-cost-brand contract,
  multi-heritage base, repeated `name` declaration, full wrapper writes,
  contextual `NodeFactory`, and destructured parser alias. Renaming the view to
  an unrecognized control reproduces the null carrier; the exact TypeScript
  name passes.

The final runtime gate nevertheless remains open:

- `builderStatePublic.ts` still returns **13,385,293,184,043** instead of
  **13,386,537,220,945**;
- `corePublic.ts` still returns **40,101,707,600,196** instead of
  **40,098,163,538,143**;
- `performanceCore.ts` advanced beyond the earlier optional-property failure at
  parser line 6421, then trapped while parsing an arrow-function expression at
  parser line 5566 (`parseArrowFunctionExpressionBody`).

The unchanged first two values prove the focused vec projector is not the last
canonical metadata-loss path. The saved prebuilt-module replay driver at
`/private/tmp/run-prebuilt-typescript-parser.mjs` reconstructs the import
manifest and reruns a selector in roughly 14 seconds, so the next pass should
trace the identity of the `NodeArray<Node>` received by the fingerprint
visitor and locate the additional materialization/copy boundary before another
full rebuild. The performance follow-up should breakpoint the line-5566 ternary
and determine whether the selected context callback or its returned expression
is null. The earlier detailed trace is preserved at
`/private/tmp/ts-parser-trace-result-final-20260831.log`.

The complete focused #1058 suite passes **67 files / 330 tests**, including the
new PropertyAccessChain file at **4/4**, and TS5 typecheck passes. This
checkpoint is therefore a real compiling,
validating, partly runnable parser artifact, not parser semantic acceptance and
not a claim that TypeScript's upstream unit suite passes. Binder, checker,
emitter, language services, and post-link DCE remain the explicit later module
layers described above.

## Current-main publication checkpoint (2026-08-31)

The publication tree is now fast-forwarded to `loopdive/js2` main
`c281669805ea987c0c5c08e4681370d199b77a34`. Reapplying the parser work was
text-conflict-free, but the post-sync suite correctly exposed two semantic
composition gaps. Runtime-namespace destructuring now records each exact
`BindingElement` in the Program ABI and accepts a bare projected global only
when its allocator belongs to that binding; this restores namespace-local
NodeFactory callables without leaking writes to same-named outer or sibling
bindings. The synthetic IR-inline DAG context also supplies main's new
`moduleInitChunkHelperNames` field instead of weakening production validation.

After those repairs, the complete focused suite passes **67/67 files and
330/330 tests**. The nine merge-sensitive controls pass **117/117**, and both
TS5 and TS7 typechecks pass. Prettier and `git diff --check` are clean.

The canonical consumer-driven parser probe was rebuilt on this exact main tip.
It still selects **30 source files**, **34 program files**, and **310** module
initialization statements. Compilation succeeded, the emitted
**69,187,969-byte** Wasm module validates, and body generation retained
**4,439 functions** with 16 non-fatal IR warnings. The worker completed in
487,770 ms / 489,550 ms wall time, used 539,981 ms CPU (1.10 average cores),
and peaked at **3,685.6 MiB RSS**, now inside the stricter 4 GiB process target.
The refreshed artifact and source map remain at
`/private/tmp/ts2wasm-typescript-parser-latest.wasm` and
`/private/tmp/ts2wasm-typescript-parser-latest.wasm.map`.

The semantic frontier is unchanged, rather than regressed by the sync:
`builderStatePublic.ts` returns **13,385,293,184,043** instead of
**13,386,537,220,945**; `corePublic.ts` returns **40,101,707,600,196** instead
of **40,098,163,538,143**; and `performanceCore.ts` reaches the same mapped
`parser.ts:5566` null dereference in `parseArrowFunctionExpressionBody`. This
proves the parser module compile/validate gate on current main, but it is still
not parser semantic acceptance and not a claim that TypeScript's complete
upstream unit suite passes.

## Runnable parser publication checkpoint (2026-08-31)

The final publication candidate remains based directly on `loopdive/js2` main
`c281669805ea987c0c5c08e4681370d199b77a34`. Two additional runtime boundaries
were closed after the checkpoint above:

- TypeScript's generic parser context helpers may bind `callback()` to a stable
  `const` inside a nested lexical block. Certifying that binding by its
  enclosing function, rather than requiring it to be a direct function-body
  statement, preserves the callback's result carrier across calls. In
  particular, `doInAwaitContext` / `doOutsideOfAwaitContext` may first return a
  `NodeArray<ModifierLike>` and later return an `Expression` without freezing
  the helper to the first array carrier. The former null dereference at
  `parser.ts:5566` is gone.
- A host-facing Array mirror now resolves back to its authoritative Wasm vec
  before ordinary-property sidecars are copied. Both the reserved
  `__vec_from_extern` materializer and the direct `externref -> vec` coercion
  copy that state to the fresh typed vec. TypeScript's `NodeArray` `pos`, `end`,
  `hasTrailingComma`, descriptor, prototype, and extensibility state therefore
  survive the `createSourceFile -> forEachChildInSourceFile -> visitArray`
  round trip.

The canonical three-case consumer-driven probe compiled and validated a
**69,196,938-byte** Wasm module (SHA-256
`adc32174d19dfa6f2dd98b1cea9d50d6c761175592792d82d705b56e5f03c27e`). It
retained **30 input/source files**, **34 program files**, **310** module
initialization statements, and **4,439 functions** after body generation. The
16 diagnostics are the same non-fatal IR fallback warnings; there are no
compile or validation errors. The worker completed in 367,871 ms / 369,064 ms
wall time, used 404,945 ms CPU (1.10 average cores), and peaked at **4,240.2 MiB
RSS** with a 4,096 MiB V8 heap limit. This completed reliably but remains 144.2
MiB above the stricter 4 GiB whole-process RSS target. The exact artifact and
its source map (SHA-256
`7e224bc5d9eb9efaaa437bcb1133ae83386042a5fd31dfe5e47a6c2a3b00d565`) are
preserved at `/private/tmp/ts2wasm-typescript-parser-latest.wasm` and
`/private/tmp/ts2wasm-typescript-parser-latest.wasm.map`.

All three workloads now execute the compiled parser without trapping. Two are
exactly native-equivalent under the canonical structural fingerprint:

- `builderStatePublic.ts`: **13,386,537,220,945** expected and actual;
- `corePublic.ts`: **40,098,163,538,143** expected and actual;
- `performanceCore.ts`: **49,594,442,228,282** actual versus
  **49,645,738,923,599** expected.

The remaining performance difference is bounded and reproducible rather than
an execution failure. Statement count is exact at 11; the compiled traversal
visits 283 nodes versus native's 295. Statement-prefix isolation accounts for
all 12 missing nodes as three four-node type-annotation subtrees: the top-level
`performance: Performance | undefined` declaration and two
`() => PerformanceHooks | undefined` return annotations. Each missing subtree
is `UnionType -> TypeReference -> Identifier` plus `UndefinedKeyword`; the
other top-level statements and all 18 minimized parser controls are exact.

The exact residual is a result-carrier projection, not deliberate annotation
elision or a traversal-table defect. `parseUnionOrIntersectionType` builds and
finishes the concrete `UnionTypeNode`, but its terminal `externref -> TypeNode`
`ref.test` rejects that allocation carrier and returns null. The parent
therefore never receives its `.type` subtree. The probe's CLI status is
non-zero only because this one semantic fingerprint is not yet accepted; its
worker exited normally with successful compilation and validation.

The publication tree passes all **67/67** focused #1058 files and **332/332
tests**. The production-adjacent NodeArray/context matrix passes **9/9 files and
139/139 tests**. TS5 and TS7 typechecks, Prettier, `git diff --check`, the LOC
and function budgets, and the checker-oracle ratchet all pass. The pinned
TypeScript 5.9.3 upstream adapter also passes **14/14** admitted original
callbacks natively and **14/14** in Wasm across four selected test files; 252
upstream files remain explicitly deferred.

This checkpoint establishes the requested first module boundary: the selected
TypeScript parser graph compiles, validates, and runs real parser workloads,
with two canonical files exact and one precisely localized union-result carrier
residual. It is not a claim that the entire TypeScript unit suite or parser
semantic surface is complete. Binder, checker, emitter, language services, and
post-link dead-code elimination remain the separately layered follow-up work
described above.

## Exact parser acceptance and binder handoff (2026-09-01)

The parser-only milestone is now accepted. A fresh build of the pinned
TypeScript 5.9.3 consumer-driven scanner/parser graph selected **30 source
files**, **34 program files**, and **310 module-initialization statements**. It
compiled successfully, validated, and emitted a **68,781,935-byte** WasmGC
module with **4,440 functions** after body generation and the same **16**
non-fatal IR fallback warnings. The worker completed in 366,821 ms / 368,018 ms
wall time, used 400,412 ms CPU (1.09 average cores), and peaked at **4,002.7 MiB
RSS** with a 4,096 MiB V8 heap limit. That peak is **93.3 MiB below the strict
4 GiB whole-process RSS target**. The artifact
SHA-256 is
`033de5a467fe492ba8bf531c9daa927c436ee1b43b0c7cc98467f72fd0c63f72`;
the adjacent 48,038-byte source map SHA-256 is
`52fbd62d169554bc5c8d2abbc51da37eb1b077aa52950e5669037d1df27c02d6`.

All three canonical real-source fingerprints are exactly native-equivalent:

| workload | native | Wasm | status |
| --- | ---: | ---: | --- |
| `builderStatePublic.ts` | 13,386,537,220,945 | 13,386,537,220,945 | exact |
| `corePublic.ts` | 40,098,163,538,143 | 40,098,163,538,143 | exact |
| `performanceCore.ts` | 49,645,738,923,599 | 49,645,738,923,599 | exact |

The final two defects were separate representation boundaries. TypeScript's
hosted `UnionTypeNode` and `IntersectionTypeNode` are explicit allocation views
of the exact merged `TypeNode`/`Node` carrier; standalone retains their concrete
physical `types` field. After that repair, the remaining hash difference was
one event: `VariableDeclarationList.flags` held `Ambient` instead of `Ambient |
Const`. Proven fresh generic factories now keep their physical source carrier
when the logical instantiation is opaque, and `finishNode<T>` compound writes
use the finalized typed-member dispatcher before its genuine-host-object
fallback. The exact full-layout flag repro now returns **33,554,434** as native
does. This establishes the selected parser module, not the complete upstream
TypeScript parser unit suite.

The publication tree passes all **69/69** focused #1058 test files and
**336/336 tests**. The nine merge-sensitive and TypeScript-verdict controls pass
**117/117**, and both TS5 and TS7 typechecks pass.

The next self-host slice is a separate binder entry over an already parsed
`SourceFile`. Root `createSourceFile` and `bindSourceFile` directly rather than
the broad `_namespaces/ts.js` barrel. The intended capability boundary excludes
checker semantics, emitter, services, and server code; the current graph still
retains a specialized checker shell solely for `getNodeId`/`getSymbolId`. The
first bounded native/Wasm binder smoke oracle is:

```text
symbolCount * 65,536 + locals.size * 256 + bindDiagnostics.length
```

This packed count is intentionally only a first smoke oracle: different binder
states can collide on the same number, so it is not a semantic fingerprint.
The tracked binder workload now pins two committed controls whose exact fixture
bytes are authoritative:

| committed fixture | native binder smoke oracle |
| --- | ---: |
| `tests/dogfood/fixtures/typescript-binder/const-local.ts` | 65,792 |
| `tests/dogfood/fixtures/typescript-binder/duplicate-let.ts` | 131,330 |

A third value, **459,008**, was previously measured for an exported-class case
with a nested declaration, but the exact source text was not recorded. It is
not an acceptance control: first commit the literal fixture, then remeasure and
record its native result. Acceptance requires compile+validate, unchanged
pre-bind parser fingerprints, and exact native/Wasm results for every committed
binder smoke fixture. The oracle must then grow a deterministic sorted
name-and-flags sequence (or its stable hash) for locals and exports so distinct
binder states cannot pass solely by colliding on the packed count.

`binder.ts` is the smallest next capability slice at approximately 199 KB /
4,008 lines. The tracked workload resolves cleanly to **32 source files / 36
program files**, **6,974,097 selected input source bytes**, and **312
module-initialization statements**. Native TypeScript 5.9.3 recomputes the two
table values exactly from the committed fixtures.

The first full 900-second-budget compile attempt did not time out: it completed
body generation for **4,827 functions** and all late codegen passes in 625,740
ms / 626,423 ms wall, used 692,469 ms CPU (1.11 average cores), and peaked at
**3,970.7 MiB RSS**, 125.3 MiB below the strict 4 GiB process target. It emitted
no binary (`compileSuccess: false`), so no validation or binder invocation is
claimed. The result contained 25 diagnostics; its original bounded report put
20 IR warnings first and hid the decisive tail diagnostics. The probe now
prioritizes non-warning failures, with a focused fail-closed regression.

After that reporting fix, a fresh diagnostic-prioritized rerun again completed
all codegen phases without timing out: **4,827 functions**, 615,304 ms worker /
616,254 ms wall, 656,412 ms CPU (1.07 average cores), and **3,778.9 MiB peak
RSS**, 317.1 MiB below 4 GiB. It still emitted no binary, so validation and
invocation did not run. The 25 diagnostics were **four instances of the same
hard error and 21 warnings**. Each hard error is the #2090 fail-closed
stack-balance diagnostic in `createBinder`: operand-stack underflow by 3 in an
empty-typed block (body delta -3, expected 0). The active binder blocker is
localizing and repairing the missing value producer; the repeated signature is
not yet evidence of four independent defects.

An instrumented localization rerun completed in 634,968 ms worker / 635,901 ms
wall, used 676,862 ms CPU (1.06 average cores), and peaked at **3,703.4 MiB
RSS**, 392.6 MiB below 4 GiB. It confirmed four distinct physical bodies, at
`function body[190].if.then`, `function body[231].if.then[5].if.then`,
`function body[293].if.then[14].if.then`, and
`function body[293].if.then[60].if.then[5].if.then`. Every body constructs the
same memoized nested-function closure and has the same first negative net
prefix: 37 live operands immediately before a 40-field `struct.new`, followed
by the memo-local `local.set`. The deficit is therefore exactly three closure
constructor operands, not a stack-diagnostic accounting artifact.

A producer-provenance rerun completed in 630,303 ms worker / 631,263 ms wall,
used 703,130 ms CPU, and peaked at **3,897.4 MiB RSS**, 198.6 MiB below 4 GiB.
It identified all four sites as memoized reads of `bind`: the current plan has
33 value captures, no TDZ-flag fields, and one constructibility field (37
fields with the three-field closure header), while the cached type was already
40 fields wide at each emission site (36 captures plus the same header and
constructibility field). This rules out late type growth, DCE, and net-delta
accounting. A ten-line reproducer confirmed the general failure mode: Phase 0
publishes a wider capture ABI; compiling an earlier sibling promotes three
owner locals; the real reserved-entry compile recomputes a narrower plan while
the already-minted closure type and trampoline retain the provisional ABI. The
repair must therefore make the reserved Phase-0 capture plan canonical for the
function body, metadata, trampoline, and every constructor rather than padding
only the failing `struct.new`.

The capability graph is also not honestly checker-free yet. `binder.ts` and
`nodeFactory.ts` obtain `getNodeId` through the broad namespace, while private
name binding reaches `getSymbolId` through `utilities.ts`; both allocators and
their counters live in `checker.ts`. Consumer-driven specialization already
blanks more than 99% of that file's semantic content (only 13,444 non-whitespace
characters, 20/4,547 function-like nodes, and 2,114/261,341 AST nodes remain),
so its 3,094,493 blank-preserved raw bytes are not the present codegen bottleneck.
Move both ID allocators to a small shared identity module and direct-import it
to make the parser/binder/checker module boundary truthful, not as a claimed
performance fix. A local extraction would forfeit the unmodified-upstream-source
claim, so treat it as an explicit module-hygiene follow-up (or upstream it), not
as the current stack-balance or performance repair.

### Binder compile, validation, and runtime-namespace frontier (2026-09-01)

This supersedes the earlier stack-balance frontier above. On snapshot
`0280bc394964f1`, the canonical TypeScript 5.9.3 binder workload selected **32
input/source files**, **36 Program files**, and **312 module-initialization
statements**. It completed body generation for **4,828 functions**, compiled
successfully, and emitted a **76,915,977-byte** module that
`WebAssembly.validate` accepted. The worker used 718,317 ms CPU (1.12 average
cores) and peaked at **3,850.2 MiB RSS**, 245.8 MiB below the strict 4 GiB
process target. The result had **21 non-fatal warnings and no hard compile
errors**.

Both committed binder controls instantiated and reached execution, but first
stopped at the same runtime boundary: `visitorPublic.ts:374:5` called the
overloaded `Debug.assertEachNode` through a null namespace receiver. TypeScript
nominates the first bodyless overload as that property's `valueDeclaration`,
so the static namespace-call path had declined to the extern-method bridge.
Commit `b0f313de1f8af204ace11750c3bda9012180b26c` selects the unique body-bearing
declaration and retains the exact Program ABI identity check. Its circular
export-star regression executes the call and emits no
`__extern_method_call_*` import.

A fresh post-fix run again compiled and validated successfully. It completed in
656,354 ms worker / 657,223 ms wall, used 718,349 ms CPU (1.09 average cores),
peaked at **3,494.3 MiB RSS**, and emitted a **76,914,855-byte** module with
**4,828 functions**, **21 non-fatal warnings**, and no hard compile errors. Both
fixtures then entered `Debug.assertEachNode` and reached the next shared
boundary inside `shouldAssertFunction`: the computed self-read `Debug[name]` at
`debug.ts:189:56` still treated the mixed runtime namespace as its legacy null
placeholder. The probe correctly rejected both invocations and did not publish
`/private/tmp/ts2wasm-typescript-binder-latest.wasm{,.map}`.

The focused repair materializes one symbol-keyed namespace function projection
only when the checker proves that every possible computed-write key is a finite
string-literal set of unique executable exports. It selects overload
implementations by their body-bearing declarations, re-resolves exact Program
ABI handles after late-import shifts, and never serves the partial projection
for a bare/escaping namespace value or a non-admitted member. The exact
`Debug[AssertionKeys]` circular-barrel regression now compiles, validates, and
executes.

The first full rerun after that lowering change remained byte-identical to the
previous module and stopped at the same `Debug[name]` boundary. The projection
had not been admitted because consumer-driven specialization retained the
exported runtime variable `Debug.loggingHost` but blanked its annotation owner,
`LoggingHost`. The checker consequently treated the member as `any`, collapsed
`MatchingKeys<typeof Debug, AnyFunction>` to `any`, and could no longer prove a
finite key set. Commit `2fb2e6281be880a15d07ee8d669e0933933732ee`
adds a checker-only type closure rooted narrowly at retained exported namespace
variable annotations. It keeps the transitive `HostAlias` / `LoggingHost` /
`LogRecord` chain without turning type-only declarations or exported function
signatures into runtime roots. All four real `Debug` index sites then resolve to
the same 51-member string-literal union, while the selected graph remains
exactly **32 source files / 36 Program files**.

The authoritative namespace post-fix run completed in 679,516 ms worker /
680,545 ms wall, used 725,668 ms CPU (1.07 average cores), and peaked at
**3,859.4 MiB RSS**, 236.6 MiB below the strict 4 GiB process target. It
compiled and validated a **77,236,087-byte** module with **4,862 functions**,
**21 non-fatal warnings**, and no hard compile errors. Relative to the
pre-admission module, the additional 321,232 bytes and 34 functions prove that
the bounded namespace projection reached the binary. Both committed fixtures
passed the former `Debug[name]` frontier and then stopped while invoking the
imported property-derived callback `getEmitScriptTarget(options)` at
`binder.ts:586:9` (Wasm offset 14,612,147, source-map anchor 14,612,053).

The callback itself was present, but its exported const snapshot had been
initialized to null. `_computedOptions.target.computeValue` is a Wasm closure
field on a generic object whose receiver is represented as externref. During
module initialization, the JS-host property bridge cannot inspect WasmGC fields
because instance wiring has not completed. Callable exact-shape reads now stay
on the Wasm carrier/member-dispatch path in the host lane. Cross-source const
aliases then invoke the stored snapshot through a finalize-filled driver rather
than a body-time signature ladder: this sees closures registered by later
source units, pads under-applied calls to the implementation arity while
preserving the true argument count, and falls back directly for genuine host
callables. Both host and standalone bridges now trap when the live closure
exceeds their eight-formal ABI cap, so contextual types, property replacement,
aliasing, or spreads cannot turn an unsupported closure into a silent undefined
result. Standalone keeps its existing structural property reads.

The focused multi-module regression now verifies the original computed-option
callback, snapshot identity after the source property is replaced, a preceding
truthy alias, positional argument order, under-application, the >8-formal
boundary, direct/escaped/hoisted/factory/spread replacements before snapshot,
and a host-free build with zero function imports (**8/8 passing**). A
narrow real-upstream TypeScript probe selected **17
source files / 21 Program files**, emitted and validated **2,465,088 bytes** in
7.6 seconds with an 819.4 MiB peak, and invoked the previously null alias with
the expected result **99**.

The next authoritative binder run completed in 638,618 ms worker / 639,467 ms
wall, used 720,370 ms CPU (1.13 average cores), and peaked at **4,089.9 MiB
RSS**. It compiled and validated a **77,013,373-byte** module with **4,863
functions**, the same **32 source files / 36 Program files / 312 module-init
statements**, **21 non-fatal warnings**, and no hard compile errors. Both binder
oracles passed `getEmitScriptTarget` and reached `bindSourceFileAsExternalModule`
before trapping with a null dereference at `binder.ts:3133:9` (Wasm offset
14,778,839; source-map anchor 14,778,791). Focused probes prove the allocator,
its `getSymbolConstructor()` result, the exact small-graph late-assigned
constructor, and the individual filename, symbol, declaration-array, and
export-table operations; the remaining investigation is whether the complete
closure registry changes that dynamic constructor ABI or whether another
operation inside the call is the first null. Until both exact binder oracles
match, the binder slice is not accepted and the failed invocation does not
publish the latest artifact.

### 2026-09-01 stop handoff — draft PR #5390

Work is published from `codex/1058-typescript-binder` in draft PR **#5390**.
The parser milestone remains accepted; this checkpoint fixes the next binder
runtime boundary but does **not** claim binder or full TypeScript completion.

Validated at handoff:

- `tests/issue-1058-barrel-computed-option-capture.test.ts`: **8/8 passing**
  across host and standalone, including snapshot identity, under-application,
  runtime arity overflow, and direct/escaped/hoisted/factory/spread mutation
  controls.
- `tests/standalone-shared-globalthis-import.test.ts`: **2/2 passing**, proving
  the arity guard preserves linked-realm callable delegation.
- `pnpm run typecheck:ts5` and `pnpm run typecheck`: passing.
- `pnpm run check:ir-fallbacks`, issue-ID validation, formatting, and diff
  checks: passing.
- A narrow real TypeScript callback graph compiles, validates, and returns 99;
  the latest full binder module compiles and validates before the runtime trap
  described above.

Non-authoritative broader checks still expose existing branch/environment
noise: the #1712 dynamic suite has its prior Acorn `parse is not a function`
failure, #4384 retains its prior native-array 0-versus-42 failure, and direct
#3592 execution requires Node's experimental Wasm exception-reference support.
None is on the focused #1058 path.

Resume at `binder.ts:3133:9` inside `bindAnonymousDeclaration`, using both
committed binder oracles. First distinguish the complete-graph dynamic
constructor ABI from the filename/symbol/declaration/export-table operations
already proven independently. Do not rerun the ten-minute authoritative binder
until a focused discriminator changes that boundary. After binder parity, move
to the checker TS2322 oracle, then printer/emitter, and only then self-hosting.

### 2026-09-05 current-main sync and resumed frontier

Branch `codex/1058-typescript-binder` is synchronized with loopdive/js2 main at
`0a5a3e87df074982cc3022a95899fc62ad69b036` by merge commit
`0c9f00a0f3fb4f`. The two content conflicts were resolved by composition, not
side selection: module namespace objects retain main's immutable-global and
Node-builtin re-export entries together with this branch's declaration-aware
callable-handle refresh, while nested declarations retain main's promoted and
forwarded pre-registration ABI together with this branch's canonical reserved
capture plan. The seven conflict-focused suites pass **34/34**.

Main advanced again during the resumed probe. Merge commit
`22c990ab481a0d` brings the branch through
`33a532e9344667`; that delta contains benchmark/edition artifacts and no
binder-path conflict. Its new edition import test passes and both compiler
typechecks remain green.

The sync exposed a TypeScript 5-only source typecheck regression inherited
from main: TS5's DOM declarations do not yet contain `WebAssembly.Tag`, while
TS7's do. Commit `45b7d783353d04` describes the feature-detected tag locally by
the only contract this runtime uses (constructible object identity). Both
`pnpm run typecheck:ts5` and `pnpm run typecheck:ts7` pass, and the linked
provider exception-identity suite passes **4/4**. `AGENTS.md` now uses
repository-relative memory links in commit `d3ff3a70028dd1`, so the documented
context resolves from every worktree rather than one retired checkout.

Current main also contains the focused discriminator for the prior
`binder.ts:3133:9` null-constructor hypothesis: a read-only GC-reference capture
whose declaring slot was boxed later is forwarded as its value instead of the
ref cell. The capture/constructor regression set passes **12/12**, including
both TypeScript late-constructor factories. This makes the mainline capture fix
a credible mover for the old runtime boundary, but it is not yet authoritative
proof for the full graph.

The first authoritative post-sync binder run used the same **32 source files /
36 Program files / 312 module-init statements** and remained actively in
codegen until the probe's 900,000 ms limit. It timed out after **900,044 ms**
wall / **647,781 ms CPU** (0.72 average cores), peaked at **1,882.5 MiB RSS**,
and last reported `src/compiler/parser.ts`; it produced no compile diagnostic,
no module, and therefore no binder invocation result. This is a measured
compile-time frontier, not evidence that the old runtime null survived. Resume
with a longer completion budget against this already-prepared pinned checkout,
then compare both exact binder oracle results. If construction succeeds but
each result is exactly 65,536 too high, inspect
`externalModuleIndicator`/`isExternalModule` before changing constructor
lowering.

The lower-load 30-minute rerun then completed in **680,967 ms** wall /
**766,863 ms CPU** (1.13 average cores), peaking at **3,784.5 MiB RSS**. It
compiled and validated a **75,812,899-byte** module with **4,864 functions**,
the same **32 source files / 36 Program files / 312 module-init statements**,
**21 non-fatal warnings**, and no hard compile errors. This is authoritative
evidence that main's read-only capture repair removed the old
`binder.ts:3133:9` constructor failure. Both binder inputs now enter the parser
and stop at the same earlier runtime operation: the destructured
`factoryCreateIdentifier(...)` call at `parser.ts:2657:31`.

That new frontier was reduced to the already-committed sub-second
`issue-1058-node-array-factory` regression and bisected to main commit
`c0213bad543aba2c74c8249bb314f49897f3a21a` (#5290's omitted-parameter ABI
repair). The public contextual signature widens an optional Boolean to
externref, while the lifted nested implementation intentionally retains its
branded i32 ABI and carries omission through `__argc`; the dynamic identifier
dispatcher consequently omitted the live funcref from its candidate set. The
candidate bridge now admits only a call-site-proven Boolean (including an
omitted or forwarded nested optional Boolean), uses the existing branded
`__unbox_boolean` helper for supplied values, and supplies i32 zero for an
omitted slot while preserving the real argument count. Unproven externref and
unbranded i32 candidates remain excluded. The affected #1058 factory,
contextual, forwarding, generic callback, and #5290 suites pass **116/116**;
both TS5 and TS7 typechecks pass. The next authoritative run must establish
whether both binder fingerprints now match or expose the next bounded runtime
frontier.

### 2026-09-05 standalone pivot and parser-wrapper frontier

The first authoritative run after the contextual optional-Boolean repair
completed in **992,561 ms wall / 1,065,682 ms CPU** (1.07 average cores),
peaked at **3,687.6 MiB RSS**, and compiled and validated a
**75,813,710-byte** module. The graph remained **32 source files / 36 Program
files / 312 module-init statements / 4,864 functions** with **21 non-fatal
warnings**. The two committed binder controls then exposed different later
parser call boundaries: `factoryCreateNumericLiteral(...)` at
`parser.ts:3768:50` and `factoryCreateVariableDeclaration(...)` at
`parser.ts:7659:22`.

Focused regressions identified two ABI gaps. A non-null union whose every
member is numeric is now sufficient call-site proof for unboxing a contextual
numeric enum such as `TokenFlags`; the ordinary static-JS-type oracle
deliberately reports all unions as mixed. Separately, a public omittable
reference parameter may select a nested implementation's exact nullable GC
reference ABI only when the actual argument is omitted, statically undefined,
or an identifier already backed by that exact physical local type. Asserted
host/plain-object values remain excluded. The focused and related #1058
callable suites pass **120/120**, and both compiler typechecks pass.

The next authoritative run completed in **786,825 ms wall / 857,649 ms CPU**
(1.09 average cores), peaked at **3,980 MiB RSS**, and compiled and validated a
**75,814,890-byte** module with the same graph shape and warning count. Both
old call boundaries are gone. Both binder inputs now converge on
`factoryCreateNodeArray(elements, hasTrailingComma)` at `parser.ts:2595:23`.
The exact sub-second reproduction is the parser wrapper around a destructured
generic node-array factory. It showed that the contextual signature exposes
both optional parameters as externref, while the live implementation expects
the exact node-vector carrier plus branded i32 Boolean. The exact vector bridge
was excluded, and direct namespace functions did not share lifted functions'
incoming-argc cache. The working-tree repair admits only the exact vector and
extends the declaration-identity-based optional-scalar tracker to direct
functions. Its focused omitted-versus-explicit-false oracle passes; a new full
binder run is still required before this frontier is considered cleared.

The deployment target is now explicit in the TypeScript build probe. `gc`
remains the default compatibility lane; `standalone` omits the Node platform,
records requested and actual target provenance, inventories the emitted
module's imports, requires **zero imports** for acceptance, and uses a separate
diagnostic artifact name. Unknown targets and JS-string runtime oracles in
standalone fail closed. Instead, tracked static fixtures embed the same pinned
input bytes and expose zero-argument numeric exports. A standalone canary
compiled, validated, instantiated with `{}`, reported zero imports, and
returned its expected raw-Wasm value. The real parser/binder workloads still
need that same proof.

The existing TypeScript upstream-unit adapter now has the same explicit target
and raw-Wasm lane. Its first standalone measurement compiled and validated all
**4/4** selected modules as actual target `standalone`, emitted **4,871,809
bytes** in aggregate in **12,279 ms**, and reported zero imports for every
module. The isolated Node 24.4.1 worker enables its experimental Wasm exnref
flag for this lane; without it, all four otherwise-emitted modules fail host
validation at opcode `0x1f`. Native remained **14/14**. Wasm passed **6/14**
callbacks: the base64 control and all five `parsePseudoBigInt` cases. The three
comment-scanner callbacks threw WebAssembly exceptions, and `convertToBase64`
threw during module initialization, making its five callbacks runtime-failed.
This is a real standalone frontier, not a suite pass. The adapter still covers
only 4 of 256 files and 14 of 1,761 static registrations, leaving 252 files and
1,747 registrations deferred. Standalone TypeScript 5 and its full unit suite
are therefore the active end goal, not a completed milestone.

The broad #1058 regression sweep also exposed an older module-evaluation
cycle, reproduced unchanged at the clean pre-checkpoint head: importing the
codegen index could reach collection-brand and standalone-subclass tables
before `map-runtime` had initialized `COLLECTION_KIND`. Both tables now resolve
their tags lazily. The scope-cache regression and the Map/Set subclass controls
pass, and the current checkpoint passes all **76** `issue-1058` files and all
**364** assertions. TS5/TS7 typechecks and the LOC, function-size, oracle, IR,
and codegen-fallback ratchets also pass.

### 2026-09-05 resumed standalone measurements

The omitted generic-vector review regression now passes in both GC and
standalone: omission, explicit `undefined`, and populated vectors preserve
their values (**11/11** node-array factory tests). The strict harness review
checks and upstream runner tests pass **41/41**. Missing target evidence,
orphaned legacy invocation flags, non-zero-argument standalone invocation
records, and mismatched native/Wasm callback counts are rejected.

A fresh upstream unit run (`DOGFOOD_TARGET=standalone DOGFOOD_SOURCE_DIAG=1
node --import tsx tests/dogfood/typescript-upstream-suite.mjs`) reproduces
**6/14** passing callbacks. A new working-tree reduction,
`tests/issue-1058-comment-accumulator.test.ts`, returns the expected **282**
in GC but throws in standalone. It retains the scanner's generic reducer and
six-argument callback with a defaulted array accumulator. The emitted
standalone dispatcher omitted the concrete append callback signature and ended
in its exception arm. The subsequent repair retains the vector's exact GC
carrier across the erased callback boundary, preserving accumulator identity
and its typed-null default sentinel. The inverse cast rejects incompatible
representations. This reduction now passes in both lanes; the node-array tests
pass **11/11**, and related callback/vector regressions pass **103/103**.

The authoritative upstream rerun after that repair improves standalone from
**6/14 to 9/14**: all **3/3** original comment-scanner callbacks now pass.
All **4/4** modules compile and validate with zero imports, emitting
**4,872,713 bytes** in **13,494 ms** aggregate compile time. The five
`convertToBase64` callbacks still fail during module initialization; their
upstream source reads the Node `Buffer` global before registration, which is
the next environment boundary to investigate. Coverage remains **4/256**
files and **14/1,761** static registrations. The full updated regression
sweep passes **77/77** files and **368/368** assertions; TS7 typechecking and
`git diff --check` pass.

The first full standalone parser probe completed in **255,435 ms wall /
267,141 ms CPU**, peaking at **2,945 MiB RSS**. Its graph contains **31 source
files / 35 Program files / 313 module-init statements / 5,581 functions after
bodies**. Compilation failed with **two errors and five warnings**, emitted
**zero bytes**, and executed **0/3** requested parser oracles:

- `core.ts:332:1`: `mapIterator` requires generator lowering beyond sequential
  numeric yields in standalone.
- `tracing.ts:356:38`: `dumpLegend` uses an unsupported native
  `JSON.stringify(legend)` shape.

Next work must determine whether these functions are semantically reachable
from the selected parser root before either implementing the capabilities or
removing proven-unreachable declarations before code generation. Merely
suppressing the errors would not establish parser correctness. The standalone
convertToBase64 initialization failure also remains open. No replacement PR
has been opened yet.

### 2026-09-05 standalone Buffer dependency investigation

The remaining unit file requires the Node `Buffer` global, whose current
compiler support delegates to the JavaScript host. An available `buffer@5.7.1`
package provides a real source implementation to investigate as a standalone
dependency. The diagnostic fixture
`tests/dogfood/fixtures/typescript-buffer-standalone-probe.ts` checks UTF-8
bytes for `hé` and the independent expected base64 string `aMOp`. It currently
uses the installed pnpm package path; packaging it as a reproducible harness
dependency remains follow-up work.

Its initial compile failed because generic method dispatch classified the
package's own `Buffer` function as a host builtin by name. The receiver path
now checks the resolved binding before requesting `__get_builtin`.
`tests/issue-1058-buffer-shadow-static.test.ts` reproduces the original failure
and now executes successfully with zero imports. All **7/7** existing host
Buffer tests and TS7 typechecking pass.

The real Buffer package now compiles and validates as **1,543,838 bytes** of
standalone Wasm with **zero imports**, but module initialization traps with
`illegal cast` before the oracle executes (**0/1**). A source-map-enabled rerun
points to the module-init chunk near
`buffer/index.js:16:1` (nearest mapping, not an exact statement attribution).
The source-map binary is **1,543,928 bytes** and still has zero imports. The
TypeScript unit result remains **9/14**. Commit and main
synchronization are still pending: signing failed, and the current process
cannot connect to an SSH authentication agent.

### 2026-09-05 Buffer initialization Symbol boundary

The module-init cast is reproduced by the Buffer source's guarded
`Symbol['for'](...) : null` initializer. Two repairs are required: preserve
the `symbol: true` marker on `Symbol.for`'s i32 result so conditional boxing
does not produce a Number, and register the native Symbol carrier before an
externref-to-symbol conversion instead of importing `__unbox_symbol` when
that carrier has not been registered yet. The focused initializer now runs
with zero imports. TS7 typechecking passes. The registry, symbol-array, and
host symbol regressions pass **72/73**; the remaining empty-string-description
test also fails with both repairs removed, establishing it as pre-existing
relative to this change.

The real Buffer package now initializes and reaches its oracle. It still
returns an incorrect result: the expanded five-export probe reports byte
length **0** (expected **3**), non-finite byte reads (serialized as `null`),
and an exception from base64 conversion (**0/5**). All four source modules
compile into a valid **1,552,698-byte** module with zero imports. Next work
must trace `Buffer.from`'s byte construction; initialization is no longer
the failing stage. This does not change the TypeScript unit score of **9/14**.

### 2026-09-05 Buffer prototype augmentation reproduction

The four additional real-package controls return `Buffer.byteLength('hé',
'utf8') === 3`, `Buffer.alloc(3).length === 3`, and
`Buffer.from([104, 195, 169])[0] === 104`; all three pass. The fourth,
`Buffer.TYPED_ARRAY_SUPPORT`, returns false instead of true. The module is
valid, has zero imports, and is **1,556,461 bytes**. These controls narrow
the next investigation to augmentation, not UTF-8 length calculation.

`tests/issue-1058-buffer-prototype.test.ts` reproduces the package's
`typedArraySupport` pattern without Buffer. It compiles and instantiates
with zero imports but returns **-2**: immediately after
`Object.setPrototypeOf(arr, proto)`, `Object.getPrototypeOf(arr) !== proto`.
The later checks separately distinguish a missing method (-3) from a wrong
call result (-1), with 42 as the required result. This regression currently
fails and the patch is not merge-ready.

Code inspection identifies the non-`$Object` return in
`src/codegen/object-runtime-prototype.ts`'s `__object_setPrototypeOf` as a
candidate write-side gap; standalone has no host boundary fallback there.
The receiver-method fallback also does not dispatch this native typed-array
receiver. Merely routing that call through the existing native dispatcher
still returns the wrong result, so that speculative change was removed.
Next: trace the actual typed-array prototype storage/read path and implement
identity-preserving set/get/prototype lookup before retrying method dispatch.
Do not hardcode the Buffer support flag or replace the upstream assertions.

Further emitted-Wasm inspection confirms the receiver is the packed-byte
`__vec_*` representation (length plus array), not `$__ta_dyn_view`. Therefore
adding only a dynamic-view prototype override cannot fix this source. The
`Object.getPrototypeOf(arr)` expression emits the intrinsic Uint8Array
prototype singleton directly, without a runtime receiver lookup; its fold is
in `expressions/object-get-prototype-of.ts` (the declared-name typed-array
arm). The writer passes the raw vec identity to `__object_setPrototypeOf`,
whose ordinary-object guard rejects it. Both write and read need repair.

A positive control in `tests/issue-1058-typed-array-expando-call.test.ts`
passes unchanged: an own method on `new Uint8Array(2)` receives ordered
arguments, reads `this[0]`, and writes `this[1]` on the original array.
Expected numeric oracle **1**, observed **1**, zero imports. This establishes
that own-method compilation and receiver identity work for that concrete
shape; do not replace that path wholesale while adding inherited lookup.

Implementation direction: extend the identity-keyed vec side-table substrate
in `vec-props.ts` with an explicit prototype override (distinguishing absent
from explicitly null), consult it before the declared-type intrinsic fallback,
and use the same link in inherited property lookup. Preserve own-property
precedence, getter receiver, extensibility refusal, and cycle checks. Include
both packed-byte vecs and dynamic typed-array views in the regression matrix,
but do not assume their storage layouts are interchangeable. The inherited
method call must then delegate only after existing compiled method paths
decline. The full Buffer prototype reproduction remains failing.

### 2026-09-05 prototype-store implementation checkpoint (not merge-ready)

Implemented an explicit prototype/presence pair on the identity-keyed vec
record, native get/set/status integration in `vec-prototype.ts`, inherited
lookup with the original receiver, and a packed-typed-array method fallback.
The declared-type getPrototypeOf path now consults the override before using
the intrinsic prototype. The Buffer prototype reproduction now passes (42),
and the own-method control still passes (1), both with zero imports.

Real Buffer measurements improve: `TYPED_ARRAY_SUPPORT` now returns **1**;
`Buffer.from('hé', 'utf8')` now reports length **3** and bytes **104, 195, 169**
instead of length 0/non-finite byte reads. The expanded byte/base64 probe is
**4/5**, valid **1,557,095 bytes**, zero imports. Base64 still raises a Wasm
exception; neither the full Buffer oracle nor the deferred TypeScript base64
unit file passes yet. Do not change the TypeScript **9/14** score from this.

Focused checks are **7/8**: null replacement, distinct identities, own-property
precedence, Buffer init, shadowed static binding, own method, and inherited
method pass. The new top-level-array/nonextensible check fails its identity
assertion immediately after setup, before checking refusal. It needs tracing;
do not claim full extensibility correctness. Also test a frozen array with its
unmodified intrinsic prototype: the generic runtime reader still lacks the
packed carrier's intrinsic kind, so SameValue handling needs scrutiny.

Existing nearby checks: **25/28** with a computed `length` write mismatch in
`issue-3537.test.ts` (not baseline-attributed yet) and two Node exnref-flag
failures in `issue-5194-es2015-typedarray-r3.test.ts`. Passing the flag on the
Vitest parent did not propagate it to that test's execution context. The
host expando and both-lane extensibility suites pass **7/7**. Next: repair the
top-level identity case, baseline-attribute the length failure, exercise dynamic
views and getter receivers, then diagnose Buffer's remaining base64 exception.

### 2026-09-05 integrity-fold repair and base64 isolation

The top-level identity failure was an earlier `getPrototypeOf` fast path:
`nonExtensibleVars` caused the compiler to emit `Object.prototype` for the
typed-array binding. Excluding typed arrays from that plain-object fold fixes
all **4/4** prototype-storage checks, including self-cycle refusal, unchanged
prototype acceptance after preventExtensions, and rejected replacement with
identity preserved. This does not yet settle the separate unmodified-intrinsic
SameValue concern above.

The computed-length failure is reproduced with `vec-props.ts` restored to
its HEAD version (f8ab271d), while all other worktree changes are held fixed:
the same single targeted test returns **2** instead of **1**. The edited
vec-props file was restored after this diagnostic. This attributes that
failure as independent of the new vec prototype storage/wiring, not as a
whole-branch clean baseline result.

Further real-package controls: base64-js `fromByteArray([104,195,169])` returns
the expected `aMOp` (**1/1**); Buffer's zero-argument UTF-8 `toString` oracle
returns **0** instead of **1**. The two-export module validates with zero
imports (**1,557,386 bytes**). A focused inherited-method
`slow.apply(this, arguments)` control also passes **1/1**. Emitted Wasm shows
the zero-argument Buffer `toString()` goes through `__extern_toString`, whereas
the encoding-argument call goes through `__call_m_toString_1`, whose body
delegates to `__extern_method_call`. Next trace that runtime member lookup and
Buffer's own toString closure; do not substitute the direct base64 control for
the failing upstream Buffer behavior.

### 2026-09-05 Buffer toString diagnostic refinement

The method-forwarding reproduction now includes a function constructor's
prototype, a named method expression, `this.length`, `arguments.length`, and
two omitted parameters of `slow.apply(this, arguments)`. Both `foo` and
`toString` pass when the receiver crosses an untyped identity function.
The concrete typed-array `toString` call fails where `foo` passes; preserve
both receiver forms in the regression matrix. This is evidence of a static
builtin fast-path defect, not evidence that generic apply is broken.

In the real Buffer package, method identity compares equal and callable-type
checks return the expected mask **7** for prototype toString, instance
toString, and prototype write. Directly calling
`Buffer.prototype.toString.call(bytes, 'base64')` returns a non-string; the
normal argument-bearing call throws. The exception-message diagnostic has
length **30** and begins `ca`, consistent with the native `called value is not
a function` guard (not a decoded full-message proof). Its numeric diagnostic
is **97099030**. These diagnostic exports are not upstream test passes.
The direct-base64 encoder remains a passing control. Next inspect the
prototype method value/body and its module-init assignment separately from
the static zero-argument `__extern_toString` shortcut.

### 2026-09-05 concrete toString dispatch checkpoint

`vec-prototype-method-call.ts` adds a guarded two-arm call for local packed
typed-array identifiers. An explicit prototype override resolves its method
before evaluating arguments and applies the captured callee to the original
receiver. The no-override arm retains builtin lowering. Spread, arbitrary
receiver expressions, and non-standalone lanes remain on their existing paths.
The four method/receiver combinations now pass **4/4**; builtin fallback and
two string-result ordering controls bring the focused file to **7/7**.

The initial ordering controls returned numbers from `toString` and assigned
the result to a variable inferred as string; those failed and diagnostic
arithmetic reached string coercions. The ordering controls now use string
results to isolate ordering. Numeric results in the direct comparison matrix
remain covered. A numeric override result stored in an inferred-string local
is a separate unresolved representation case, not claimed fixed by the
string-result controls.

The real Buffer module remains **0/2** for combined byte/base64 and no-argument
UTF-8 string conversion: base64 raises a Wasm exception and UTF-8 reports 0.
It validates with zero imports (**1,560,459 bytes**). The concrete-local fix
does not reach the package's erased-return call. WAT inspection locates its
actual toString implementation in `__closure_45`, which references
`__fn_tramp_slowToString_cached`; `__set_member_toString` is only the write
dispatcher, not the method body. Continue tracing the closure invocation and
runtime string-conversion path. Full upstream TypeScript score remains 9/14.
Retry verification: all **22/22** tests across the six focused Buffer/vec
files and the host-expando/both-lane-extensibility suites pass. TS7 typecheck
and whitespace validation pass. This does not cover the unresolved cases
explicitly recorded above or establish full TypeScript unit-suite completion.

### 2026-09-05 CommonJS dependency isolation

Temporary runtime error instrumentation (removed after measurement) identified
the failing Buffer base64 method as `fromByteArray`, called through the
`base64-js` CommonJS default object. Direct named ESM invocation of the encoder
works. A two-file standalone CommonJS control returns 299 for bytes 104/195;
adding a second CommonJS module makes the first import's method disappear
(`typeof` callable check returns 0) and the nested call throws. The focused
`issue-1058-cjs-dependency-method.test.ts` records these runtime expectations,
not merely validation. Investigating exact imported-variable storage instead
of graph-wide name aliases; no TypeScript-suite score improvement claimed yet.

WAT establishes the collision: both module initializer sections write globals
26/27/28 (`__cjs_default_export`, `exports`, `module`) and the imported read
uses global 26. The second object replaces the first. Program ABI's exact
declaration lookup also resolves to that same allocator object, so an
import-read-only patch was tested, did not fix either failure, and was removed.
`registerModuleGlobal` in `src/codegen/module-global-registration.ts` reuses
`ctx.moduleGlobals.get(name)` and observes the existing allocator under each
declaration. Next fix must isolate module storage and project each source's
bindings consistently for initialization, reads, writes, and import aliases.
Do not merely special-case `base64-js` or rename its method. Temporary debug
instrumentation is removed; the regression matrix includes a single-module
positive control, a sibling-module collision, and a nested dependency call.

Implementation checkpoint: module variable registration now allocates separate
cells for external-module declarations from different source files, retaining
same-source redeclaration reuse. Source-owned cells and import aliases are
projected before body compilation and each accumulated initializer statement.
The focused matrix is **4/4**, including independently mutable ESM bindings
and live import aliases across repeated calls. The real Buffer byte/base64
oracle now returns **1** (previously threw); UTF-8 no-argument conversion still
returns **0**. Thus actual Buffer is **1/2**, valid **1,560,672 bytes**, zero
imports. Nearby module tests are **51/53**: the two failures are missing local
Test262 `namespace/internals/set-prototype-of-null.js` fixtures, not runtime
verdicts. TS7 typecheck passes. Broader regression/TDZ and source-scoped metadata
coverage remains required before calling this storage change merge-ready.

Broad checkpoint verification completed: **84/84 `issue-1058` files, 387/387
assertions pass** (79.55 seconds). Formatting, whitespace, LOC and function
budget gates pass. This does not replace full module/TDZ conformance coverage.
Next goal-facing step: make the real Buffer polyfill an explicitly pinned
standalone test-environment dependency and wire it into the original
`convertToBase64` unit file, without changing its assertions. Current adapter
still has the previously measured 9/14 score; no new upstream-unit pass is
claimed from the separate Buffer probe. UTF-8 `.toString()` remains independently
open. The polyfill is currently available only under PNPM's transitive store,
not a root `buffer` package dependency; avoid baking that store path into the
production adapter.

### 2026-09-05 independent base64 oracle and 14/14 standalone unit checkpoint

The adapter's old `ts.sys.base64encode` called TypeScript's own base64 function,
so the convertToBase64 comparison was not an independent oracle. Restored the
Buffer-based system implementation while preserving the original test bodies
and assertions. `typescript-runtime-pin.json` pins buffer 5.7.1, base64-js 1.5.1,
and ieee754 1.2.1 as published npm tarballs with verified digests. Setup extracts
and links only its private cache; it does not install into shared node_modules.
The report now carries runtime oracle version **2**. A negative-control test
substitutes a broken TypeScript encoder and verifies that the comparison fails;
another test compares the pinned Buffer implementation with native Node Buffer.

`DOGFOOD_TARGET=standalone pnpm run dogfood:typescript-upstream-suite` now exits
0: **14/14 native and 14/14 standalone callbacks**, **4/4 modules compiled and
validated**, **zero imports**, **6,659,948 aggregate Wasm bytes**. Per file:
base64 **1/1**, comments **3/3**, convertToBase64 **5/5**, parsePseudoBigInt
**5/5**. Full inventory remains **256 files / 1,761 registrations**; selected
coverage is **4 files / 14 callbacks**, with **252 files / 1,747 registrations
deferred**. Do not mark the goal complete. Runtime/verdict regression tests
are **20/20**. Buffer's no-argument UTF-8 conversion is still open separately.

### 2026-09-05 fresh full standalone parser measurement

After the module-storage/runtime-oracle fixes, reran the documented three-case
standalone parser command against verified generated TypeScript diagnostics.
It completed (not timed out) in **238,296 ms**, peak RSS **2,837.4 MiB**, with
**31 source files / 35 program files**. Compilation still fails: **two errors**
(`core.ts:332` generator `mapIterator`, `tracing.ts:356` JSON.stringify legend)
plus five IR fallback warnings. No Wasm artifact and no parser invocation
results; the three required runtime cases are **unexecuted**, not passes.

Added focused reproductions for both remaining shapes. The legend test has two
variants: its declared TraceRecord[] type is refused at compile time; an
`unknown as object` assertion bypasses that gate but yields the wrong runtime
JSON (**0/2**). Thus removing the array refusal is NOT a fix. The codec has a
packed-vector normalization arm, but closed record elements still lack the
required serialization behavior. The generator reproduction checks laziness,
callback counts, two yields, and undefined completion, not merely compilation;
the needed implementation is resumable iterable-loop lowering, not eager
array buffering. These new regressions deliberately remain red pending fixes;
the earlier 387/387 checkpoint predates these newly added assertions.

### 2026-09-05 tracing-record JSON implementation checkpoint

Implemented compact/nullish-replacer serialization of flat data-record arrays
via the existing closed-record materializer and ObjVec codec. This path reads
the array once and preserves null arrays/elements; class records, nested field
carriers, and record `toJSON` members are not admitted by this bounded layout
check. Nullable string slots proven to represent optional/undefined properties
are restored to canonical undefined in the temporary open record. The native
JSON dispatcher previously serialized the undefined singleton as `null`; it now
returns an absent serialization piece, letting object callers omit it and array
callers emit null. Other replacer paths retain their existing behavior.

The exact legend tests and nullable controls pass **5/5**; the combined focused
JSON run passes **28/28**. An attempted dynamic-key record route was removed
after measuring `[{}]` (closed-record runtime enumeration exposes no fields),
not shipped as a substitute. Full-parser remeasurement is running; do not claim
the tracing error removed from that graph until its result is inspected. The
generic mapIterator standalone regression remains a known compile failure.
The expanded JSON matrix is now **6/6**, including side-effectful array
production (evaluated once) and boolean/numeric fields. TS7 typecheck,
formatting, whitespace and size/function gates pass. The independent-oracle
upstream slice was rerun after the JSON dispatcher change and remains **14/14
standalone**, with all four modules free of host imports.
The full issue-1058 regression run completed with **393/394 assertions across
86 files**: **85 files pass**, and the only failure is the explicitly added
generic `mapIterator` standalone reproduction. This is not an all-green run.
Full-parser remeasurement completed in **319,969 ms**, peak RSS **3,505.1 MiB**,
with the same **two hard errors plus five warnings**, no artifact and no
invocations. The tracing JSON error is **NOT removed from the complete graph**
despite the local runtime improvement. Next isolate the full graph's actual
namespace-record/vector carrier; do not widen the JSON gate without validating
the runtime representation. A namespace-scoped, declaration-after-functions
control is being added to distinguish that source shape from graph interactions.
That namespace control reproduced the refusal: its anonymous record layout uses
externref for optional string fields instead of nullable native-string refs.
The layout gate now accepts boxed fields only when the source property type is
provably a scalar JSON union (string/number/boolean/null/undefined). These fields
already preserve canonical undefined, so they do not use nullable-slot repair.
The expanded tracing suite now passes **7/7**, including the namespace case.
Temporary layout logging was removed. A new full-parser build is still needed
after this last boxed-field change; the prior full-graph failure remains the
latest authoritative full-parser result until that measurement completes.

The subsequent full-parser run (started 2026-09-05T17:58:24Z, recovered from
session 32215) completed in **260,376 ms**, peak RSS **3,088.9 MiB**. It now
reports **one hard error plus five warnings**: the tracing JSON refusal is gone;
`core.ts:332` generic `mapIterator` remains unsupported. There is still **no
Wasm artifact, no validation, and no invocation**. The next implementation is
resumable `for...of` lowering, preserving lazy iteration and IteratorClose on
abrupt completion; the module-initializer call must not be discarded as dead.

### Resumable for-of implementation checkpoint (2026-09-05)

The worktree now has synchronous iterator-init/step/close state terminators,
with separate instruction emission in `generators-native-for-of.ts`. The body
uses a state-lowered close region: normal exhaustion and IteratorStep failure
do not close; injected return/throw and body exceptions do. An existing throw
keeps precedence over a close error. Captured loop bindings, colliding frame
names, async iteration, and unsupported own break/continue remain declined.
The existing shared-pending-slot restriction also applies inside yielding
finally blocks. Explicit source returns through such a region remain refused
by the existing planner, rather than bypassing close.

Two representation fixes were necessary after the first emitted code:
generic generator callable parameters use the finalize-filled apply bridge
instead of a prematurely frozen ABI candidate list, and numeric `.value`
consumers include boxed result carriers rather than silently returning zero.

The new regression suite currently passes **12/14**. It validates Wasm and
asserts zero imports in a Node child with standardized exception handling
enabled (10-second runtime timeout). Numeric/generic reads, callback laziness,
normal exhaustion, return-before-start, return/throw close, body/next exceptions,
and close-error precedence pass. Two explicit regressions remain **failing**:

- TypeScript's inverse option Map initializer compiles but returns the wrong
  result; isolate tuple mapping versus Map's iterable constructor next.
- Mutating/appending to a numeric array between suspensions observes a stale
  element (`-2`): the shared native `__iterator` materializes a boxed copy of
  numeric vectors. A real iterator must retain the live original source.

This is an uncommitted implementation checkpoint, **not** a completed parser
or conforming generic-iteration claim. A fresh full graph is running in session
22820; recover that handle before starting another full build. Two accidentally
misconfigured Vitest launchers (sessions 1055 and 37949; PIDs 68543/69314) are
waiting for stdin, not executing tests. Permission to stop only those launchers
was requested; do not confuse them with the correctly completed 12/14 run.

The nearby compatibility run passes **172/172 tests in 8/8 files** (generator
carriers, terminal undefined, boolean done, try-regions, generic callback
results/registration, and the original host-lane inverse-Map fixture).
Typechecking, formatting, whitespace, and both change-scoped size budgets pass.
Further isolation adds a fifteenth regression: mapped heterogeneous Map entries
already have a wrong first key before the inverse Map constructor sees them
(`-20`). The initializer's first Map has size 2, but the inverse has size 1
(`-21`), consistent with key collapse; this is not yet a proven root cause.
That two-test isolation run is **0/2**, with 13 tests intentionally unselected;
do not report the entire new suite as green.

Full-parser session **22820 completed**: **275,557 ms**, **3,092.4 MiB peak
RSS**, **80,283,267 emitted Wasm bytes**, actual target **standalone**. Both
former hard errors are gone (**compileSuccess=true**, five warnings), but
**validation fails** in function 235, `measure`: `if[0] expected type i32,
found local.tee of type anyref`, Wasm offset 2,541,151. Therefore the parser is
**not runnable**, all **3/3 requested workloads fail before invocation**, and
the import count remains **unmeasured** (module construction failed). Diagnostic
artifact saving was disabled; do not claim that the emitted binary is saved at
the suggested artifact path. Next isolate `measure`'s optional performance
receiver/truthiness lowering, or rerun with environment variable
`JS2WASM_TYPESCRIPT_PROBE_DIAGNOSTIC=1` for the full
binary if needed. No second full-parser build is currently running.

The final combined new-suite run is **12/15 passing**, with exactly the three
Map/tuple and live-array failures described above. No tests are skipped in that
run. The 172/172 compatibility result remains separate from this failing suite.

The `measure` validation failure now has a small source-level reproduction in
`tests/issue-1058-performance-measure-standalone.test.ts`. It copies the upstream
optional-mark lookup/nullish fallback, numeric duration accumulation, and
optional performance method call. Compilation succeeds but validation reports
the same `if[0] expected type i32, found local.tee of type anyref` in `measure`
(function 51, offset 53,946 in this smaller module). This permits local
optimization/codegen isolation without another full-parser build.

The local WAT proves the malformed condition belongs to `durations.get(name)
|| 0`, not the optional performance receiver. `emitToBoolean` omitted abstract
`anyref`/`eqref`, leaving a reference directly on the `if` condition stack.
Both representations now externalize by identity and use the existing canonical
truthiness classifier. Optimization disabled also reproduced the invalid code.
After that fix, accumulation returned 40 but inline `Map.get(...) === 40`
still folded false: typed Map.get exposed its kernel anyref storage carrier to
source-expression dispatch. The Map.get boundary now returns externref, like
the existing IR Map adapter; keys and stored values are unchanged.

The initial combined Map/performance run passes **26/26**, including correct
duration accumulation, 13 truthiness/identity/short-circuit cases, and 12 nearby
Map/Set tests. Two direct emitter tests additionally pin abstract-reference
truthiness so normalizing Map.get cannot mask regression of the coercion fix.

The expanded performance test passes **16/16**, including both emitter controls.
Full-parser session **47254 completed** in **244,335 ms**, peak RSS **2,940.1
MiB**, with **80,283,472 Wasm bytes**. It now **compiles AND validates** under
the actual standalone target. It still has **one host import: `env.Set_has`**,
so the host-free gate correctly prevents all **3/3** workload invocations.
The five IR fallback warnings remain. Diagnostic publication is false (the
host-free/run verdict failed), so no newly saved artifact is claimed. This
measurement predates the subsequent tuple-index-reader edit. Next resolve the
source/ABI path retaining `Set_has`; do not provide a host shim to pass the gate.

The tuple failure was isolated by comparing a direct `.next().value` binding
with indexing through a saved IteratorResult. The yielded value was a physical
tuple struct; the dynamic `__extern_get_idx` reader knew vectors but not tuple
`_N` storage fields. New `tuple-index-read.ts` emits exact numeric-index arms
from `ctx.tupleTypeMap` into the existing finalize-time reader, using the actual
field carrier and preserving boolean brands/object identity. It does not change
the tuple allocation or copy the value. TypeScript's inverse option Map and
the intermediate mapped-entry regression now both pass.

Latest combined focused run: **31/32 passing** — performance **16/16** and
generator/tuple **15/16**. The one remaining failure is numeric-array mutation
between generator suspensions (shared iterator snapshot, `-2`). The escaped
tuple test checks string/number/boolean/object values and negative, fractional,
and out-of-range indices. Typechecking, formatting, whitespace and both size
budgets pass. No full-parser process is running; its latest complete-graph
measurement remains the validating, one-import session 47254 above.

### Optional native Set follow-up (2026-09-05)

The parser contains `notParenthesizedArrow?.has(tokenPos)`. Optional calls had
their own extern method dispatch, bypassing native Set helpers. Added a captured
native Set `has`/`delete` adapter, preserving receiver single evaluation and
argument short-circuiting. Its boolean result is boxed so the nullish arm can
return canonical undefined rather than false. Abstract-reference receivers now
participate in the existing null/undefined guard instead of being discarded.

Focused tests: **7/7**, validating, zero imports, correct return values. The
pre-change control loads `HEAD:src/codegen/expressions/calls-optional.ts` through
an ignored Vitest pre-load plugin without modifying any production files;
all other dirty worktree code is identical. That control fails **6/6** initial
new tests. A seventh concretely typed receiver test directly reproduces
`env.Set_has` in the control and passes import-free with the adapter. These
controls attribute both the semantic and host-import fixes to this change.
Neighbor run: **21/22** across four files (before adding the last three Set
cases). The `o.f?.(x)` case in `issue-2049.test.ts` returns -1 rather than 6 in
both candidate and the pre-change control: not introduced by this change,
but still open. Typechecking, formatting, whitespace and size gates pass.
Full parser session **55162 is complete**: started 2026-09-05T18:50:26.287Z,
**380,009 ms**, peak RSS **2,950.9 MiB**, **80,285,778 bytes**,
`actualTarget=standalone`, `compileSuccess=true`, `validates=true`,
**zero imports**. Same 31-source/35-program-file graph and five IR fallback
warnings. This is the first measured complete-graph zero-import result in this
handoff. It includes the tuple-index change as well as the optional Set fix.

All **3/3 requested invocations remain failing before invocation**: instantiation
throws `[object WebAssembly.Exception]` during module initialization, with no
stack/offset available from the current error formatter. No diagnostic binary
was published because the verdict failed. Next: expose the startup exception's
payload/source through a diagnostic-only path and fix the offending initializer;
do not weaken the raw instantiation/import/oracle gates or count this as a
working parser. No full-parser process remains live.

Startup diagnostic control: a standalone module whose initializer throws a
known Error reproduces an actual `WebAssembly.Exception` with no own properties
and no `.stack`; changing the formatter alone cannot recover a location. V8
tracing enabled only around instantiation reports `__module_init` and
`__new_Error` in that control. Added opt-in
`JS2WASM_TYPESCRIPT_PROBE_TRACE_STARTUP=1` to the build worker, resetting the
flag in `finally`. It leaves the original binary, imports, invocation handling,
and verdict gates unchanged. Do not use Node's global `--trace-wasm` flag for
this probe: that also traces tsx's compiler-side Wasm parser and floods output.
The actual probe control is now automated in
`tests/dogfood/typescript-startup-trace.test.ts`: **1/1** passes, with the known
startup throw still producing a failed verdict despite valid zero-import Wasm.
The existing harness verdict tests also pass **18/18**; typechecking and
formatting pass. Complete-graph traced session **50763 is complete**:
**380,866 ms**, peak RSS **3,215.1 MiB**, same **80,285,778 bytes**, validating,
zero imports, still failing all three cases at instantiation. No artifact
published and no full-parser process remains live.

The startup trace pinpoints:
`__module_init -> __module_init_chunk_1 -> Version_new -> Version_init -> every
-> __extern_get_idx -> __new_TypeError`. Actual pinned `semver.ts` initializes
`Version.zero = new Version(0, 0, 0, ["0"])`; its constructor calls
`every(prereleaseArray, s => prereleasePartRegExp.test(s))` and the equivalent
build predicate. Trace reaches the element read and TypeError without entering
the predicate, making callback dispatch/registration a candidate, not a proven
root cause. Do not broaden the generic-generator callback adapter merely on
this hypothesis.

`tests/issue-1058-version-startup.test.ts` currently provides **4/4 passing
controls**: exported generic every, static Version initialization, string/array
union narrowing and one-argument string/RegExp predicates, both single-file and
two-module compilation. These DO NOT reproduce the complete-graph failure.
Next reduction must preserve more real semver constructor overload/default and
module-scale callback registration context (including the module-level RegExp
binding) until it produces the same startup TypeError. No runtime fix claimed.

### Version initializer callback registration (2026-09-05)

The reduction now reproduces the startup exception when it retains every's
overloads, the five-parameter overloaded Version constructor, module-level
RegExp predicates, and the barrel import. Four simpler controls pass; the new
fifth case fails during instantiation with a WebAssembly.Exception.
Focused WAT (`.tmp/ts5-version-types.txt.wat`) proves the mismatch: `every`
accepts function types 124–132, none taking a native string, while Version_init
passes a later-created closure with function type 135
`(ref null 123, ref null 6) -> i32`. The closure struct is a valid subtype of
the shared closure carrier; the stale function-signature ladder cannot call it
and reaches `__new_TypeError` instead. This is not a RegExp parsing failure.

Extended the existing finalize-filled generic-generator callable adapter to
ordinary generic function/method parameters as well. The standalone, callable
parameter, no-spread and maximum-eight-arguments boundaries remain unchanged.
Focused Version plus neighboring callback suites initially passed **103/103**.
Additional negative controls found that the shared apply bridge deliberately
returns undefined for non-callables (it also serves optional probes). Generic
source calls now use the finalize-filled `__typeof_function` classifier and
throw TypeError after evaluating arguments when the value is not callable.
Current Version/callback suite **9/9**, including null, undefined, number and
plain-object callees plus an argument-side-effect check. Typechecking and
formatting pass. The nearby standalone suites remain **38/39**, with only the
known live-array iterator snapshot failure. After the callable guard, the
generic/multifile/iterator run is **113/114** with that same sole failure;
both size gates and typechecking pass on the guarded code.

Complete-graph session **98374 finished**, started
2026-09-05T19:15:26.084Z: **325,234 ms**, peak RSS **2,479.7 MiB**,
**78,984,248 bytes**, validates, zero imports, same five warnings. This run
contains the generic callback dispatch fix but **predates the new callable
guard**. The trace proves the Version failure is fixed in the actual graph:
`every -> __apply_closure -> __call_fn_method_2 -> __closure_671 -> __regex_search`
returns true, both assertions pass, and `Version_init` returns.

The next startup failure is
`tryGetPerformanceHooks -> tryGetPerformance -> __new_TypeError`, before any
workload invocation (**0/3 invoked**, all blocked by instantiation). No artifact
was published; no full-parser process is live. `performanceCore.ts` starts with
`isNodeLikeSystem()`; its real implementation in `core.ts:2586` tests
`typeof process !== "undefined" && !!process.nextTick && !process.browser &&
typeof require !== "undefined"`. Investigate ambient/global presence and the
call site rather than adding a performance host shim. Full guarded-compiler
measurement is still required.

### Standalone ambient capability presence (2026-09-05)

A three-case reduction found Node detection already correct, but absent
`declare const performance: Performance | undefined` incorrectly classified as
an object in standalone (**1/3 before**, **3/3 after**). The explicit ambient
identity helper was disabled for standalone, so both runtime lookup and typeof
anti-folding guards were bypassed. Standalone now uses the same explicit typed
ambient identity path, backed by its existing **native global environment**;
no host import or performance implementation is introduced. WASI/other strict
host-disabled lanes retain their prior gating. This also gives ambient reads
priority over unrelated flat-map locals, including the dead destructuring
binding in TypeScript's performanceCore.

Full traced run **16487 is complete** with this change and the generic-callable
guard: started 2026-09-05T19:25:38.471Z, **320,524 ms**, peak RSS
**2,783.3 MiB**, **79,395,997 bytes**, validates, zero imports, five warnings.
Version initialization still passes, but the same
`tryGetPerformanceHooks -> tryGetPerformance -> __new_TypeError` remains.
All three workloads fail before invocation; no artifact was published and no
full-parser process remains live. The ambient-presence defect is fixed in the
reduction, but **was not the only cause of this full-graph startup failure**.
Next run should use the existing `JS2WASM_DUMP_TYPES=<worktree>/.tmp/<name>`
and `JS2WASM_DUMP_WAT_FN=tryGetPerformance,isNodeLikeSystem` diagnostics to inspect
the emitted failing operation rather than infer it from adjacent source.
Runtime-presence/removal and
lexical-shadow controls plus the existing host ambient suite pass **13/13**
(5 standalone presence cases, 8 existing ambient cases). Supplied native
capabilities remain observable, deletion changes subsequent plain/compared
typeof results, and dead locals/real lexical shadows retain their behavior.
Typechecking, formatting, whitespace and both size gates pass.

Follow-up diagnostic session **13180 completed**, emitting focused WAT for
`tryGetPerformance,isNodeLikeSystem` to
`.tmp/ts5-performance-full-types.txt.wat` using the existing debug emitter.
The real pinned `performanceCore.ts`, compiled with its exact
`isNodeLikeSystem` function extracted from core.ts and a re-export barrel,
**initializes and returns 1** from a no-native-hooks check (scratch driver
`.tmp/ts5-performance-debug.mts`). Thus the remaining full-graph exception is
not reproduced by performanceCore source alone; inspect the full emitted call
and binding representation before changing the environment behavior again.

The full WAT identifies the mismatch precisely: `isNodeLikeSystem` begins with
`i32.const 1` for `typeof process !== "undefined"`, then loads `ref.null extern`
for process and throws TypeError before reading nextTick. The same body is
inlined into `tryGetPerformance`, explaining why the runtime trace did not show
an isNodeLikeSystem entry. The checker injects `__js2wasm_node_env.d.ts` when
the joined graph contains a `node:` reference; even a comment can trigger this
type-level hint. That declaration is not runtime provision of process.

Two focused controls reproduce both errors before the fix: absent process has
the wrong typeof, and an explicitly supplied native process value cannot be
read. Standalone ambient `process` variables from declaration files now enter
the existing native-global-environment reader and typeof anti-folding guards.
No unconditional absent/present answer is used. Both controls pass afterward;
the combined presence suite is **7/7** before adding the exact Node-detector
guard control. Existing host paths and concrete lexical shadows stay separate.
Full traced session **58591 completed** with the fix: started
2026-09-05T19:41:33.496Z, **274,238 ms**, peak RSS **2,858.1 MiB**,
**79,447,831 bytes**, validates, zero imports, five warnings. The trace now
gets through performance-hook detection and finishes module-init chunk 1.
Chunk 2 calls `__builtin_static_Date_now`, whose body throws TypeError.
All three workloads still fail before invocation; no artifact published and
no full-parser process remains live. Presence suite is now **8/8**, host ambient
suite **8/8**, typecheck and both size gates pass.

Next identified mismatch: first-class `Date.now` enters builtin-value-read.ts's
generic throwing static-method fallback, unlike direct Date.now() in
call-namespace-static.ts. The latter already has an explicit standalone clock
policy (legacy epoch-zero fallback, or certified clock capability); WASI uses
its clock helper. Reified Date.now should share the existing policy, not invent
a clock source or add an unapproved host import. Inspect
`standalone-clock-capability.ts` before wiring the extracted function path.

Follow-up: added typed and dynamic stored-Date.now module-initializer tests.
Both reproduce an instantiation exception before the fix. The value closure
now returns f64 through the existing standalone clock emitter (or existing
WASI helper), preserving singleton identity and the no-clock epoch fallback.
No new clock source or capability import is introduced. Both focused tests
now pass (2/2); the existing clock capability suite also passes (23/23).
TypeScript typechecking, whitespace, LOC and function-budget checks pass.

Full parser session 10479 completed (started 2026-09-05T19:54:54.481Z):
253,722 ms wall time, 2,631.3 MiB peak RSS, 79,447,650 binary bytes,
compileSuccess=true, validates=true, standalone, zero imports. Startup now
passes the former Date.now exception in chunk 2 and reaches chunk 5.
All three required oracle cases still fail at instantiation (0/3):
`RuntimeError: illegal cast` in `__module_init_chunk_5`, function 5464,
binary offset 47035288 (0x2cdb398). The final traced helper is `__map_new`.
The diagnostic publisher correctly did not publish the rejected binary.

Next: dump chunk 5's WAT and identify the cast immediately after Map creation;
reproduce its source initializer independently before changing carrier code.
The five existing IR fallback warnings remain. This is startup progress, not
parser-oracle or upstream unit-suite completion.

Diagnostic session 73633 reproduced the same binary and offset in 256,468 ms,
peak RSS 2,862.4 MiB. `.tmp/ts5-chunk5-types.txt.wat` identifies the first
scanner Map initializer: `new Map(Object.entries(textToKeywordObj))`.
The source is `MapLike<KeywordSyntaxKind>` with a string index signature;
the object literal is emitted through native dynamic-object writes. At WAT
line 25240 its externref global is cast to the empty MapLike struct (type 80),
before an incorrectly empty entries array is constructed. Thus the runtime
Map kernel is not the failing cast. Add single-/multi-module reproductions and
route open index-signature enumeration through the existing runtime helpers.
Both reproductions failed with `illegal cast` before the fix and pass afterward
(2/2), verifying three Map entries and ordered keys/values with zero imports.
The fix excludes string-/number-index-signature types from closed-struct
enumeration; their runtime own properties, not the checker's declared field
list, determine keys/values/entries. Typecheck, whitespace and both size gates
pass. Six neighboring test files: 57 passed, 2 failed, 17 skipped (76 total).
Both failures reproduce identically with object-ops.ts loaded from HEAD via
`.tmp/ts5-enumeration-baseline.config.mts`: host array hasOwnProperty returns
10 rather than 1, and the interface-slot sort returns `aAbB` rather than the
test's `bBaA`. The latter test explicitly pins an older broken no-op sort.
The same control makes both new MapLike regressions fail again, establishing
the enumeration change's causal effect without reverting production files.
Full parser rerun session 1077 completed: started 2026-09-05T20:08:04.921Z,
301,719 ms, peak RSS 3,167.9 MiB, 79,446,815 bytes, valid standalone Wasm,
zero imports. The trace now iterates and seeds the keyword Map successfully,
then creates the next Map and traps in chunk 5 at offset 47034701
(0x2cdb14d), still 0/3 oracles, no published artifact.

Next reproducer added to the same test: `new Map(Object.entries({ ...keywords,
extra: 4 }))`. Spreading alone passes, but adding the own field recreates
`illegal cast`; current test result is 2 passed / 1 failed (3 total).
`compileObjectLiteralForStruct` in literals.ts around line 3229 resolves the
index-signature spread source to the empty MapLike struct and stores its
dynamic-object value in `__spread_obj_*` with that static type. Inspect the
literal's runtime-spread routing and enumeration together: merely removing
the cast must not lose copied keys or property order. No spread fix yet.

Spread follow-up implementation: a shared indexed-spread predicate selects the
existing open-object builder even when generic contextual inference lists only
the added fields. Hoisted var storage follows the same decision; inline
keys/values/entries enumerate the runtime property set. Original three tests
pass, including single evaluation, insertion order, and later-field overwrite
checks. Neighbor suites: 30 passed, 10 pre-existing skips. Adding explicit
module-level `var`/`const` annotations found that moduleGlobalWasmType also
needed the shared predicate; both failed before that storage fix. The final
focused suite passes 5/5 afterward, all validated with zero imports.
Full probe session 13014 completed with the spread/enumeration fix but
predates the final module-global storage adjustment. Do not label that probe
as verification of the later storage edit. Started 2026-09-05T20:17:14.131Z,
273,735 ms, peak RSS 3,078.6 MiB, 79,411,211 bytes: compileSuccess=true,
validates=true, standalone, zero imports, unchanged five IR fallback warnings.
Startup passes chunk 5 and reaches chunk 10. All three oracles still fail at
instantiation: `illegal cast` in `__str_to_number` (function 50, offset
2427982 / 0x250c4e), called by `__module_init_chunk_10` (function 5470,
offset 0x2cdef4a). No diagnostic binary published. No full probe remains live.
Next dump chunk 10 and the string-number helper; identify the actual value
passed to conversion and reproduce that initializer without the full graph.
Latest focused suite 5/5, typecheck, formatting, whitespace and function-budget
gate pass after the module-global storage adjustment.

Chunk-10 diagnostic session 89444 completed on the latest storage code:
244,889 ms, peak RSS 2,874.2 MiB, same 79,411,211-byte valid zero-import binary
and same failure. `.tmp/ts5-chunk10-types.txt.wat` line 23099 calls
`__str_to_number` while converting makeReverseMap's string-vector return to
the numeric `regExpFlagCharCodes` vector. The preceding call initializes
`tokenStrings` using the same generic function. Scanner source line 401:
`makeReverseMap<T>(source: Map<T, number>): T[]` captures an empty T[] in
Map.forEach and stores each key at its numeric value index. First call has
string keys, second numeric enum keys. Added a small mixed-instantiation
regression to distinguish generic array specialization from numeric parsing.
The small test reproduced the same __str_to_number illegal cast. Generic
declaration return lowering now keeps the declaration's erased array carrier
for unconstrained T[] instead of the first call's concrete array element type.
Both call orders pass, along with 91 generic identity/callback neighbors
(93/93). An added array-identity control then caught a copying regression in
the broad result rule. The final rule preserves the agreed parameter carrier
when a parameter has the exact same array type as the declared return; only
otherwise does the unconstrained T[] result use the erased declaration carrier.
Both reverse-map call orders including identity now pass (2/2). Final
typecheck, whitespace and both size gates pass. Full probe session 72670
predates this final identity refinement; do not call it a full verification of
that later edit. It completed: started 2026-09-05T20:32:06.911Z, 245,593 ms,
peak RSS 3,010.6 MiB, 79,411,533 bytes, valid standalone Wasm, zero imports,
five existing IR fallback warnings. Startup moved beyond __str_to_number and
now throws a catchable TypeError (0/3 oracles, no published diagnostic binary).
Tail trace: __call_m_call_2 -> __extern_method_call -> __closure_method_call ->
__apply_closure -> __call_fn_method_2 -> __proto_method_-1073741805_call ->
__new_TypeError. Next identify the source .call receiver and inspect reified
Function.prototype.call support. The retained 100-line tail does not establish
which source initializer/chunk owns this call. No full probe remains live.

Stored hasOwnProperty.call repro (alias and holder property) reproduces the
startup exception, with Function.prototype.call explicitly reified. The
Function glue advertised call but supplied only the generic refusal body.
Added a receiver-aware variadic body: validate callable this, split the first
argument as thisArg (undefined if omitted), forward the remaining complete
argument list to the existing apply-closure bridge. Focused verification pending.
The first emitter test caught invalid branch field names (`labelIdx` instead
of IR `depth`); corrected before any full probe. The focused hasOwn tests now
trace directly into the separate hasOwnProperty refusal body, not call's
body. An isolated ordinary-function control using stored callValue.call
passes with zero imports. Added multi-argument forwarding and non-callable
TypeError checks; neighbor verification is running. Full probe rerun started
with filtered startup trace retaining chunk and hasOwnProperty/call events.
Ordinary-function control passes all added checks. Neighbor run: 21 passed,
10 failed (31 total). Two are the separately identified hasOwnProperty refusal;
eight cannot run because their Test262 source files are absent (ENOENT), not
compiler verdicts. The 7 closure-call/apply and 10 function-expression-this
tests pass, as do three self-contained null/undefined call/apply controls.
Final typecheck passes after the branch-field correction. Full probe session
13232 is live; no new hasOwnProperty implementation yet.
The ordinary-call control also passes strict omitted-this forwarding.
Loading HEAD's array-object-proto.ts through the Vitest pre-load control
`.tmp/ts5-call-baseline.config.mts` restores its startup exception, proving
the new call body is exercised rather than a pre-existing direct-call route.
Full session 13232 completed: started 2026-09-05T20:45:02.192Z, 248,855 ms,
peak RSS 2,804.2 MiB, 79,411,815 bytes, valid standalone Wasm, zero imports,
five existing warnings, 0/3 oracles (instantiation failure), no published
artifact. Filtered trace reaches __module_init_chunk_23 (function 5551),
hasProperty (119), the now-executing Function.prototype.call body (2705), then
__proto_method_-1073741806_hasOwnProperty (1510) -> __new_TypeError (56).
Next implement the reified Object.prototype.hasOwnProperty body through the
existing native own-property predicate, preserving ToPropertyKey-before-
ToObject ordering and nullish receiver errors. Its kernel alone returns false
for null, so wiring only a raw __hasOwnProperty call would be incorrect.

Resume checkpoint: implemented the reified hasOwnProperty body in
`object-proto-has-own.ts`, wired through the prototype closure factory. It
converts the key before rejecting nullish receivers, then calls the native
own-property predicate. Expanded the stored-function regression to exercise
primitive receivers, inherited properties, throwing key conversion, and
undefined receivers. Session 23830 measured 1/3 passing: ordinary call passes;
both native modes return -5 on primitive-string own properties. The predicate's
String-exotic helper only recognized boxed strings. Extended that helper to
recognize primitive strings too, using the same string-data representation and
canonical-index checks without allocating an unobservable temporary wrapper.
Session 56731 is testing this correction; no full-parser success claimed.

Session 56731 completed 3/3 passing. Expanded again for canonical-index
rejections, boxed strings, booleans, symbol keys, undefined-valued own
properties, and undefined keys: session 24487 passed 19/19 across the new
stored-function regression and hasownproperty-call, issue-2934 function
receiver coercion, and issue-4187 delete controls. The three issue-2934 cases
assert Wasm validity only; the new regression explicitly instantiates with
zero imports and checks returned values. Typecheck, formatting, whitespace,
and both size gates passed. Full real-source standalone parser session 73211
is live with the same three required fingerprints; verdict pending.

Full session 73211 completed (started 2026-09-05T20:58:07.818Z): 311,934 ms,
2,747 MiB peak RSS, 79,445,165 bytes, valid standalone Wasm, zero imports.
Startup now completes: every failure moved from instantiate to invoking the
requested parser workload. Still 0/3 matching fingerprints. All three fail
with `dereferencing a null pointer` at createIdentifier, function 885, binary
offset 0x34d445 (3462213), called by parseMemberExpressionOrHigher (1064),
parseLeftHandSideExpressionOrHigher (1063), parseUpdateExpression (1062).
The five existing IR fallback warnings remain. Diagnostic artifact was NOT
published because the verdict failed. Final typecheck session 8424 passed.
Next: inspect emitted createIdentifier and its factory receiver in standalone;
do not assume this is identical to the earlier GC-lane createIdentifier fix
merely because the function name matches. Full units and self-hosting remain
unverified and incomplete.

Next-turn diagnostic: full session 42468 rebuilds the same graph with only
createIdentifier WAT dumped to `.tmp/ts5-create-identifier-types.txt.wat`.
The earlier Identifier constructor regression is now parameterized for GC and
standalone (raw exports and asserted zero imports in standalone), to test
whether the existing factory controls reproduce this runtime frontier.
Session 49118 passed 6/6 (3 GC + 3 standalone), including the late-assigned
Identifier constructor, namespace factory destructuring, and generic
finishNode chain. These reduced factory cases do not reproduce the full
parser failure. Formatting and whitespace checks passed for the test change.

Session 42468 completed: 281,562 ms, peak RSS 2,960.6 MiB, identical
79,445,165-byte valid zero-import module and 0/3 invoke failures at 0x34d445.
The emitted parser createIdentifier (WAT line 22510 onward) guard-casts its
factory result from Node (219) to ArrayLiteralExpression (289), then executes
ref.as_non_null before finishNode. The declared generic constraint is Node;
the first caller's sibling specialization is not a sound shared ABI.
Changed the reduced test's primeFinishNodeSpecialization input from Node to
ArrayLiteralExpression: session 25375 measured 5/6 passing, with exactly the
standalone Identifier chain now reproducing a null dereference (GC passes).
Changed resolveGenericDeclarationCallSiteTypes to use the declared constraint
parameter carrier for native constrained object T -> T contracts, and keep
the matching reference result carrier. This does not open all native structs
or change unconstrained scalar generics. Session 5145 is testing this fix and
neighboring generic identity/factory/array controls; full post-fix run pending.
Session 5145 passed 11/11 across four files, including the newly failing
standalone sibling-prime case. Full post-fix parser session 75523 is live;
typecheck session 92371 and size/whitespace gates session 70839 are pending.
Sessions 92371 and 70839 completed successfully: typecheck, formatting, both
size gates, and whitespace checks pass. Parser session 75523 remains live;
resume that handle rather than starting another build.
Continuation regression session 88186 passed 107/107 across five files:
generic asserted write-through, nested asserted identity, nullable generic
results, generic base-node factories (including negative freshness controls),
and generic callback results. Parser session 75523 remains pending.

Session 75523 completed, started 2026-09-05T21:13:05.021Z: 281,689 ms,
peak RSS 2,950.5 MiB, 79,407,334-byte valid standalone module, zero imports.
All three workloads pass the former createIdentifier trap and now fail while
invoking unescapeLeadingUnderscores (317), offset 0x2cd231 (2937393), through
parseErrorForMissingSemicolonAfter (865), parseExpressionOrLabeledStatement
(1124), parseStatement (1140), and parseList (916). Still 0/3 fingerprints.
Next diagnose the missing identifier text and why semicolon recovery is
entered; do not patch unescapeLeadingUnderscores to hide the invalid value.

Added `typescript-parser-startup-probe.ts` as a diagnostic entry, re-exporting
the three unchanged acceptance workloads and adding scanner keyword/value
and single-Identifier parsing controls. Native `node --import tsx` session
46825 measured both controls returning 1. This diagnostic entry is not a
replacement for the canonical standalone acceptance entry. The next Wasm run
executes all five oracles and dumps unescapeLeadingUnderscores,
parseErrorForMissingSemicolonAfter, and createBaseIdentifier WAT to
`.tmp/ts5-parser-text-types.txt.wat` to locate the missing text upstream.
That live diagnostic build is session 54588; poll it on resume. No new
compiler fix has been made for the missing-text failure yet.
Expanded the Identifier factory regression with TypeScript's branded
string/void-intersection union for escapedText. Session 10828 passed 6/6
(3 GC + 3 standalone); the reduced branded field round trip is not the cause.

Diagnostic session 54588 completed: 307,972 ms, peak RSS 3,153.5 MiB,
79,430,783-byte valid zero-import module, 32 source / 36 program files.
Scanner control returns -1 (first token is not ImportKeyword); Identifier
control throws a Wasm exception. The three re-exported acceptance functions
were absent from the module, so these were lookup failures, NOT three new
parser verdicts. Replaced the diagnostic re-exports with explicit forwarding
functions; the canonical fixture remains unchanged. Missing re-export
emission is a separate unresolved compiler defect, not fixed by this wrapper.
The scanner control now reports the mismatched token as -1000-token.
Added a scanner-only real-source entry to split keyword recognition from
token text and parser factory behavior. Native session 43092 returns
importToken=102, importValue=1, identifierToken=80, identifierValue=1.
The scanner-only standalone probe is running with those four exact oracles,
and dumps getIdentifierToken/scan/setText and entry functions to
`.tmp/ts5-scanner-probe-types.txt.wat`.

Scanner-only session 55605 completed: 121,593 ms, 1,592.3 MiB peak RSS,
6,049,462-byte valid standalone module, zero imports, 18 source / 22 program
files. Three of four controls pass; importToken is 80 (Identifier), not 102
(ImportKeyword), while the text "import" is correct. Native corrected-wrapper
session 38143 passes all five controls/fingerprints unchanged.
The scanner lookup uses a substring token against literal Map keys.
Added a substring-key lookup to the indexed-object regression: session 92904
fails all six cases with -5 at that lookup, including a computed-key mode.
Found __hash_anyref hashes the entire NativeString backing array with no
offset. Changed it to hash exactly len code units starting at off; equal
literal and slice strings must choose the same bucket. Focused rerun pending.
Session 26968 passed 6/6 after the hash correction. Expanded Map replacement,
size, lookup and deletion plus Set deduplication/has/delete controls:
session 19900 passed 13/13 across indexed enumeration and optional Set tests.
Canonical three-workload full parser session 27660 is live after this fix;
typecheck/format session 15192 is also live. No post-hash parser success yet.
Typecheck/format session 15192 passed. Session 18281 passed whitespace and
file-size checks but flagged four lines of intentional ensureMapHelpers
growth for the substring hash instructions. Added the function-specific
allowance here (no baseline reseed); rerun pending.
Function gate rerun 26188 passed. Canonical parser session 27660 completed,
started 2026-09-05T21:33:08.076Z: 274,645 ms, peak RSS 2,891.6 MiB,
79,407,345-byte valid standalone module, zero imports. All three calls now
throw opaque WebAssembly.Exception instead of the previous null-pointer
stack; still 0/3. Added opt-in TRACE_INVOKE diagnostics around the actual
invocation only, always disabled in finally, with startup/invocation throwing
controls to ensure failures remain rejected. No acceptance logic changed.
Trace tests session 44943 passed 2/2. Canonical invocation-trace session 50947
is live (filtered source/call-dispatch/error-constructor entries, final 80
lines). Resume this handle rather than duplicate the build. Harness-verdict
regression session 19098 is pending; whitespace check passed.
Session 19098 passed 18/18 harness-verdict tests. While invocation-trace
session 50947 continues, rerunning the admitted four-file/14-callback original
upstream slice under DOGFOOD_TARGET=standalone after the recent compiler fixes.
This is regression evidence only, not the full 256-file unit acceptance bar.
Unit session 48639 was a launcher failure: omitted `--import tsx`, so all
four compiler children failed resolving bundle-manifest.js before compilation
(14/14 native, zero Wasm callbacks executed). This is not a code regression
measurement. Correct command is `DOGFOOD_TARGET=standalone node --import tsx
--experimental-wasm-exnref tests/dogfood/typescript-upstream-suite.mjs`;
session 43008 is now running that command.
Session 43008 completed successfully: native 14/14, standalone 14/14,
four valid modules with zero imports, 6,417,424 aggregate binary bytes.
Read-back report confirms actualTargets=[standalone], no missing result files,
and counts 1+3+5+5. Still 252 files / 1,747 registrations explicitly deferred;
the full upstream unit goal is not complete.

Invocation trace session 50947 completed: started 2026-09-05T21:40:10.501Z,
323,588 ms, 2,656.6 MiB peak RSS, same 79,407,345-byte valid zero-import
module and 0/3 fingerprints. Final traced call chain (performance workload):
createExpressionStatement (3586) -> __closure_612 (2578) ->
__get_member_parenthesizeExpressionOfExpressionStatement (3947), then
__new_TypeError (56). The missing callable belongs to memoized parenthesizer
rules. Added a raw zero-import standalone case to the existing parenthesizer
identity regression to distinguish the memoized object path from later
generic callable dispatch; test run pending.
Session 12073 measured 2/3 passing: the new raw standalone parenthesizer case
throws WebAssembly.Exception; both existing GC cases pass. A fast reduced
trace/dump is now running before any compiler change for this defect.
Reduced traces 7830/41542 reproduce the same getter failure. In
`.tmp/ts5-parenthesizer-types.txt.wat`, probe's live type-169 memoize arm
executes call_ref, drops its externref result, then pushes ref.null 40
(ParenthesizerRules). The later null fallback consults the original closure
as the receiver, explaining the misleading member-get trace. Memoized body
and callback dumps show a normal stored result. Added an import-free
externref-to-instantiated-reference return bridge restricted to bindings
proven to come from a generic callable factory. Focused rerun pending.
Session 17445 passed 94/94 (3 parenthesizer, 89 callback-result, 2 generic
identity tests). Typecheck/format session 50532 passed; size/whitespace gates
80300 completed. Full canonical invocation-trace session 53327 is live after
the return bridge; no post-fix parser fingerprint result yet. Resume 53327.
Function gate session 2487 passed. Post-bridge upstream unit rerun 97877
passed native 14/14 and standalone 14/14. Report read-back confirms four
zero-import standalone modules and unchanged byte counts totaling 6,417,424;
252 files / 1,747 registrations remain deferred. Updated the stale dispatch
comment that incorrectly asserted every live arm matched the public return
ABI; this comment-only follow-up does not affect the running parser binary.
Full session 53327 completed: started 2026-09-05T21:52:17.891Z, 290,908 ms,
2,717.4 MiB peak RSS, 79,407,481-byte valid zero-import module, still 0/3.
Final trace now runs createExpressionStatement -> __closure_612 -> TypeError
without the prior __get_member lookup failure. The real null parenthesizer's
expression-statement method is the generic `identity` function, unlike the
existing reduced cast-arrow methods. Added that exact callable property and
a raw numeric probe to the regression; measurement pending.
Both pending alias/property tests already capture this failure. No live probe.

Reduced generic-property runs 86139/94881 measured 2/3 passing, with the raw
standalone statement probe throwing before identity executes. The existing
callablePropertyRefBridge admitted raw ref/externref transport only in the host
lane (except native generator results), excluding the erased identity candidate
from standalone dispatch. Removed that lane-only restriction: raw references use
import-free extern.convert_any / any.convert_extern plus the declared result
cast. Tagged AnyValue carriers remain excluded in both directions. Expanded
generic identity controls to both gc and standalone, checking zero imports in
standalone. Focused generator/property tests and typecheck are running; this is
not yet evidence of a passing full parser workload.
Focused run 92971 passed 13/13 (3 parenthesizer, 2 pre-expansion identity,
8 generator receiver controls). Expanded run 52698 passed 115/115: 4 two-lane
identity, 89 generic callback, 4 deferred property, 5 property-wrapper, and
13 boxed-string controls. Typecheck 87389 and function/LOC/whitespace gates
23518 passed. Full canonical trace run 60073 is in progress after this fix;
resume its result before claiming any new parser fingerprint count.
Post-property-bridge upstream run 38417 passed 14/14 native and 14/14
standalone. Report read-back confirms all four modules have zero imports;
252 files / 1,747 registrations remain deferred. Formatting check 93717 passed.
Full session 60073 completed: started 2026-09-05T22:04:36.791Z, 265,130 ms,
2,815.4 MiB peak RSS, 79,595,968-byte valid standalone module, zero imports,
still 0/3 fingerprints. BuilderStatePublic and PerformanceCore now fail with
`illegal cast` at parser createNodeArray (function 881, offset 0x34efb1), called
from parseBlock -> parseList -> parseSourceFile. CorePublic still throws a Wasm
exception; the tail trace does not identify its separate cause. The performance
trace now passes createExpressionStatement's memoized rules call, writes its
expression, propagates flags, finishes the node, and reaches createNodeArray.
Next: reduce/dump parser createNodeArray's argument/return carrier at this site;
do not assume the reduced NodeArray controls cover the full graph's generic
array layout. No full build remains live. No new commit or PR in this checkpoint.

Next continuation: full createNodeArray dump run 57611 started on the same
compiler state. Expanded parser wrapper to standalone; run 59943 passes 12/12.
New parser-list-array-carrier regression reproduces illegal cast at createNodeArray
in both gc and standalone (63562: 0/2), adding a generic callback-built list and
sibling Parameter/Statement element types. Reduced standalone dump 77608 is
running to locate the precise carrier mismatch before a compiler change.
Full dump 57611 completed unchanged: 264,202 ms, 2,729.2 MiB RSS,
79,595,968 bytes, valid zero-import module, 0/3. Full and reduced WAT agree:
parser createNodeArray receives vec_externref; the live factory arm directly
casts its public externref argument to vec_ref_Node. Those vector types are
siblings, not cast-compatible. Added physical vector argument snapshots at
the original evaluation point and use existing vector coercion in the selected
candidate arm instead of the erased scalar cast. No source-name special case.
Run 95005 passed 14/14 (new regression both lanes + 12 factory controls),
typecheck 46444 and function/LOC/whitespace gates 45253 passed. Added an
argument-order regression that reassigns the source list in the next argument.
Broader regression run 10878, order check 94334, and full trace run 58034 are
in progress. Full parser success remains unproven.
Run 10878 passed 95/95 (89 callback, 1 NodeArray metadata projection,
2 reverse-map, 3 parenthesizer); order check 94334 passed both lanes. Upstream
rerun 48456 remains 14/14 native and 14/14 standalone; report read-back confirms
four zero-import modules, with 252 files / 1,747 registrations still deferred.
Formatting check 39662 passed. A subsequent comment-only change clarifies that
vector snapshots apply in both lanes; it does not change the running binary.
Full 58034 completed: started 2026-09-05T22:16:18.642Z, 275,907 ms,
2,895.2 MiB peak RSS, 79,599,898-byte valid zero-import standalone module;
still 0/3 (all Wasm exceptions). Performance trace confirms the former input
cast is cleared: parser createNodeArray invokes the real factory, isNodeArray,
aggregateChildrenFlags and attachNodeArrayDebugInfo, then reaches
setTextRangePosEnd -> setTextRangePos -> TypeError. Next reduce the generic
TextRange setter on the factory-returned vector; existing reduced tests set
array.pos/end directly, so they do not cover this boundary. No full run live.

Setter continuation: replaced direct metadata writes in the list regression
with the real generic setTextRangePos/End/PosEnd shape. Run 47475 passes gc
and fails standalone (1/2). Reduced WAT shows the standalone setter already
accepts externref but casts it to TextRange before writing, nulling a vector.
Allow the existing asserted-structural identity marker for native parameters
whose ABI is already externref/ref_extern; concrete native structs retain their
current dispatch. Focused run 90628 is in progress.
Run 90628 passed 9/9 (two-lane list/range regression, original asserted-write
control, six Identifier factory controls). Typecheck 27061 passed. Expanded
the original asserted-write control to standalone with zero-import checking;
broader run 11941 and full canonical trace 38098 are running. No post-fix
full parser fingerprint count yet.
Run 11941 passed 94/94 (2 two-lane asserted writes, 89 callbacks,
3 parenthesizer controls). Function/LOC/whitespace gate 26779 and formatting
44543 passed. Upstream rerun 5969 passed 14/14 native and 14/14 standalone;
report confirms four zero-import modules, 252 files / 1,747 registrations
remain deferred. Full trace 38098 remains live.
Full 38098 completed: started 2026-09-05T22:24:29.464Z, 259,593 ms,
2,837.7 MiB peak RSS, 79,640,038-byte valid zero-import standalone module,
still 0/3. BuilderStatePublic and PerformanceCore now null-trap in
unescapeLeadingUnderscores (317, offset 0x2cd51f), called by
parseErrorForMissingSemicolonAfter -> parseExpressionOrLabeledStatement.
CorePublic remains a Wasm exception with no stack. Trace confirms native
setTextRangePos/End now call the generated pos/end member setters successfully.
Next separate incorrect scanning/parsing (why a missing-semicolon recovery path
is reached) from identifier escapedText preservation. The earlier minimal
scanner probe has not been rerun after the string-view hash fix; it is a useful
control before attributing the new null to the older Identifier ABI defect.
No full build remains live at this checkpoint.
Pragma cast continuation: started full processCommentPragmas/
processPragmasIntoFields WAT dump and canonical trace in session 89274.
Expanded the reduced pragma callback to capture and mutate its context,
matching an additional full-source feature. Run 55754 passes both lanes (2/2),
including checking that the callback write is visible on the original object.
Context capture alone therefore does not reproduce the current full illegal cast.
Run 79300 also passes four reduced pragma cases with/without the TypeScript
shared-Node allocation-view representation, in both lanes. No compiler changes
were made in this continuation. Full dump 89274 completed: started
2026-09-05T23:32:21.785Z, 306,699 ms, 2,733.4 MiB peak RSS, unchanged
79,033,650-byte valid zero-import module, same 0/3 verdict and Builder illegal
cast at processPragmasIntoFields1271 offset0x3d8bf4. The function has an
unguarded native Map108 cast immediately after __extern_get(context,"pragmas")
and before callback construction. processCommentPragmas creates Map via call1283
and writes it through call4011. Inspect those full getter/setter paths next;
the reduced shared-Node and captured-context variants both pass, so neither
feature alone explains the mismatch. Started the fuller access-helper dump
with __set_member_pragmas/__extern_get/__map_new selected.
Access-helper dump session 96397 is active; output stem
`.tmp/ts5-pragma-access-types.txt`. Resume that handle rather than restarting it.
Bare-node allocation continuation: changed only the reduced shared-Node variant
to allocate kind/pos/end first, then assign SourceFile properties, matching the
factory's allocation order. Run 71955 reproduces the illegal cast in standalone
(3/4 pass), while object-literal initialization and both GC cases pass.
The instance-expando whitelist recognizes classes/fnctors/anonymous shapes but
not source-declared named interface structs. A bare Node consequently drops
its new pragma property. Added physical-type-object provenance for non-.d.ts
interfaces and object aliases; the existing shared user-struct predicate now
admits those exact carriers for both expando storage and enumeration. A builtin
later reusing the same display name does not inherit the provenance.
Run 82335 passes all four reduced pragma variants after this change. Broader
reflection/expando/inherited-set checks and typecheck are running. Full access
dump 96397 remains the pre-fix control, not evidence for this new change.
Typecheck 37303 and function/LOC/whitespace gate 57341 passed. Broader 22424
has passed 30/30 closed-struct reflection and 12/12 instance-expando tests;
computed-write suite is 2/3 (computedWriteCtorField returns 1 instead of 11).
Control 63762 disabled the new provenance admission and reproduced that same
computed-write failure, then the candidate admission was restored.
The inherited-set suite worker exited before ready; parent session 22424 is
still alive and has not yielded a usable verdict for that suite. Do not count
it as passed or launch a duplicate blindly. Added direct named-interface and
object-alias expando/visibility controls with Map/Date internal-slot negatives.
Direct named-struct expando controls passed 2/2 in 12451. The pre-fix full
access-helper dump 96397 ended without a runtime verdict: selected __extern_get
WAT formatting exceeded the JS string-length limit (RangeError in emit/wat.ts,
548,123 ms total, 3,878.2 MiB peak RSS). This is a diagnostic serialization
failure, not evidence of a new Wasm regression. Do not repeat that giant WAT
selection. Started the post-provenance-fix canonical run without WAT dumping,
plus a fresh upstream unit run.
Post-fix full parser session is 85869 and is active. Upstream rerun 34923
completed 14/14 native and standalone, still 252 deferred files. Formatting
checks passed. Requested permission to stop only the stalled inherited-set
runner (PID9805/session22424); do not kill it without an answer and rechecking
the exact process. Its beforeAll allows 600 seconds, so it may terminate itself.
Confirmed the inherited-set worker prerequisites scripts/compiler-bundle.mjs
and scripts/runtime-bundle.mjs were absent. Built both from the current worktree
using the repository esbuild commands (compiler build 73571 succeeded; runtime
build succeeded). They are ignored generated artifacts, not source changes.
Wait for 22424 to terminate (or approved targeted shutdown) before rerunning
that suite with the prerequisites present.

Resume verification: session 22424 is terminal (exit 1): 44 passed, one
computed-write failure, and 36 inherited-set tests skipped after the 600-second
beforeAll timeout. No process was killed. Session 85869 is no longer available;
process inspection confirms no matching parser worker remains, but its final
verdict was not recovered, so it cannot support an acceptance claim. Fresh
canonical parser run 81578 saves filtered invocation output and its JSON result
to `.tmp/ts5-parser-resume-provenance.log`. Inherited-set retry 33610 is running
with both generated worker bundles now present. The full goal remains open.
Run 76581 confirms 11/13 focused controls: named structural expandos 2/2 and
sibling projections 9/11, including all four pragma variants. Both previously
recorded standalone user-Map-name negatives still fail. Inherited retry 33610
now initializes but reports 10 passed, 14 failed, 12 skipped: twelve failures
are missing `test262/harness/assert.js`, while the physical-field/side-bag test
throws and fnctor flow-slot lookup returns 6 instead of 7. Linked the existing
main checkout's harness and test directories into this worktree's empty
Test262 directory for a complete retry; no fixtures were copied or modified.
Fixture-complete retry 68103 is terminal: 13/36 pass, 23 fail. Worker-backed
rows now reach compilation but this local Node 24 runtime rejects exception
opcode 0x1f: CompilerPool replaces execArgv without preserving the exnref flag.
Run 40477 uses an ignored `.tmp/ts5-enable-wasm-exnref.cjs` V8-flag preload,
inherited through NODE_OPTIONS, to enable the same runtime feature in child
workers. This is local diagnostic setup, not an acceptance waiver or compiler
change. Direct physical-field/side-bag and fnctor flow-slot failures are still
unattributed and are not explained by this worker-flag failure.
Run 40477 completed 34/36 after enabling exnref in children: all nine authentic
Test262 acceptance rows pass, while the two direct failures above remain.
Canonical run 81578 completed in 288,467 ms, peak RSS 2,733 MiB: valid
79,487,196-byte zero-import module, still 0/3 exact fingerprints. Builder now
returns 13,383,740,112,891 rather than trapping (expected 13,386,537,220,945).
Both decode to three statements and 44 visited nodes; their 32-bit hashes are
622,018,555 versus 3,419,126,609. Thus node/statement counts match, but AST
content/ranges/flags or hashing still diverge. Core and Performance still throw
Wasm exceptions. The filtered trace only contains Builder entry through its
first isNodeArray call, despite Builder returning a numeric result; do not
interpret that truncated trace tail as the other workloads' failure location.
Strengthened the reduced generic parser-list regression with the real
hasOwnProperty-based isNodeArray predicate and small-array slice branch;
run 25660 is pending. No full parser process remains live.
Run 25660 passed 2/2; formatting and whitespace checks pass. Control 42977
temporarily disabled only the new named-struct admission line and reproduced
both direct inherited-set failures unchanged (exception and 6 versus 7), then
restored the candidate. Those failures are not attributable to this admission
change. Started full run 82201 with Core first, then Performance and Builder,
keeping all three original expected fingerprints. This tests fresh parser
state as well as capturing the early Core trace without Builder preceding it.
Output: `.tmp/ts5-parser-core-first-provenance.log`. Resume that live handle.
Added a two-lane fingerprint arithmetic control: derive the numeric mix stream
from the tracked Builder fixture using installed TypeScript 5.9.3, assert the
native 44-node/three-statement/hash oracle, then hash that exact stream inside
Wasm using the same captured mix closure and unsigned arithmetic. This
separates hashing/packing errors from a wrongly constructed AST; it does not
replace the actual parser acceptance test. Run 76667 is pending.
Run 76667 passed 2/2: native stream hashing and packing reproduce the exact
Builder oracle in both lanes. Typecheck 89093 passed. Native diagnostic checks
also reject simple global substitutions (all node flags zero/synthesized,
array positions/ends zero/-1, all trailing-comma bits false, node positions or
ends zero) as explanations for the observed hash. No single mix-value change
to an integer in [-1, 4999] transforms the native 410-value stream into the
observed hash (reverse FNV check). These are hypothesis eliminations, not
proof of AST correctness. Core-first run 82201 remains active.
Core-first run 82201 completed: 252,158 ms, 2,823.9 MiB peak RSS, identical
79,487,196-byte valid zero-import module and identical 0/3 results regardless
of invocation order. Core's trace reaches variable-declaration-list completion:
createNodeArray, setTextRangePosEnd, setContextFlag, then __new_TypeError before
factoryCreateVariableDeclarationList enters. This is the next candidate ABI
boundary, not yet a proven cause. Added a reduced parsed-list / defaulted-flags
factory test, run 12494 pending. Gates 74143 passed. No full build remains live.
Reduced factory run 12494 stopped at minimal-lib never[] semantic diagnostics;
rerun 8007 with the full probe's skipSemanticDiagnostics policy reached a
namespace object null at Parser.parse before the intended factory boundary
(both lanes). Run 79440 uses default experimental-IR routing, matching the
full compileProject probe and existing namespace controls, to avoid attributing
that earlier namespace failure to the intended array/default-parameter call.
Run 79440 now passes GC and fails standalone at runtime (1/2); this is a
small lane-specific reproduction candidate. Started a standalone-only bounded
WAT dump selecting probe, parse, createVariableDeclarationList, with output
stem `.tmp/ts5-variable-list-factory-types.txt` for the next ABI inspection.
Dump 57452 confirms the actual wrapper accepts (vec, f64) while the public
interface dispatch only includes (vec, externref) candidates. Its TypeError
terminal is reached because standalone scalarBridgePlan admits proven Boolean
unboxing but not proven Number unboxing. Added the native __unbox_number bridge
under the existing call-site Number proof, retaining rejection of arbitrary
any/Boolean/BigInt and sentinel-branded target carriers. Candidate discovery
and invocation share this same plan. Run 6791 passes 2/2 after the change.
Strengthened the omitted-argument check with a nonzero default of 4 (oracle
221) so zero padding cannot masquerade as a working initializer. Broader run
34020 and typecheck/gates are running; post-fix full Core-first parser run
saves `.tmp/ts5-parser-numeric-factory.log` with all three original oracles.
Run 34020 passed 106/106 (90 generic callback, 12 node-array factory, two
literal factory, two variable-list factory including the nonzero default).
Typecheck, formatting, function/LOC gates, and whitespace checks 41582 passed.
Full run 82508 remains active; a fresh upstream unit adapter rerun is also
running. Neither the focused success nor the previous 14 admitted unit tests
establishes the full 256-file upstream goal.
Upstream rerun 40189 passed 14/14 native and standalone. Report read-back
confirms all four entry modules have zero imports, 256 total files, 252
deferred files and 1,747 deferred registrations. NaN/infinity supplied-argument
checks added to the numeric factory regression also pass in both lanes (1688,
2/2): neither takes the nonzero default intended for omitted arguments. Full
parser 82508 remains active.
Full numeric-bridge run 82508 completed in 312,201 ms, 3,073.4 MiB peak RSS:
valid 79,493,304-byte zero-import module, still 0/3 exact fingerprints. Core
now returns 40,099,680,121,158 (expected 40,098,163,538,143), clearing its
factory-call TypeError. Builder remains 13,383,740,112,891; Performance still
throws. Added diagnostic-only `typescript-parser-builder-fields.ts` to compare
separate hashes for node kinds/positions/ends/flags, array metadata/trailing
commas, and texts. Native evaluation uses installed TypeScript 5.9.3 and verifies
the embedded source equals the tracked canonical Builder input. Its seven
expected hashes are 356767627, 3958391185, 3952552808, 2614092085, 826173832,
953171930, 1233566727 respectively. Field diagnostic run saves
`.tmp/ts5-parser-builder-fields.log`; the original three full-AST oracles are
unchanged and remain the acceptance requirements.
Core's post-fix packed results both decode to nine statements and 120 nodes;
only the hash differs (1865445702 versus 348862687). Diagnostic session is
81072; resume that handle. No canonical parser run remains live.
While the field diagnostic runs, extended the existing NodeArray vec-projection
test from GC-only to both lanes. Standalone checks raw numeric exports for
direct, widened, and callback metadata reads plus zero imports; the host
mirror/host dispatcher checks remain GC-only because those APIs are not part
of the standalone contract. Run 88710 is pending.
Run 88710 passes GC but fails standalone: sourceMetadata returns 171591,
while widening the array makes test() return NaN. This isolates a real
metadata-loss path. emitVecToVecBody in type-coercion.ts copies ordinary
property sidecars only in host-backed mode; standalone's vec-props identity
table has no projection transfer hook. Before implementing one, preserve the
table's shared bag semantics and audit prototype/descriptor consumers rather
than copying only pos/end keys. The full field diagnostic remains active.
Field diagnostic 81072 completed: 254,058 ms, 2,747.4 MiB peak RSS, valid
79,489,179-byte zero-import module. Five of seven hashes match exactly: node
kinds, positions, ends, flags, and texts. Array metadata is 4096183195 instead
of 826173832; trailing-comma bits are 2138539933 instead of 953171930.
Implemented native projection-to-source identity registration for typed vec
conversions, with flattened aliases. Bag lookup/ensure and all prototype
read/write helpers canonicalize their lookup key; ordinary getters retain
their original receiver. This shares existing and future property state rather
than copying pos/end or taking a prototype snapshot. The identity registry
is append-only and used only for fresh physical projections; it does not
claim to fix indexed-element mutation aliasing or separate numeric overlays.
Run 90088 passes the reduced metadata test 2/2. Added shared-property write,
deletion, and bidirectional prototype-update controls; run 46258 and gates
22186 are pending. No full parser process remains live.
Run 46258: 3/4 pass. Both parser-list cases and the standalone projection
case pass, including shared writes, deletion and bidirectional prototype
changes. The strengthened GC projection case returns -2 on shared deletion;
the host sidecar path was not changed, but no dedicated removal-control run
has yet attributed that new assertion failure. Keep it visible, not waived.
Full parser run 17668 is active with Performance first and all three original
oracles, saving `.tmp/ts5-parser-vec-identity.log`. Broader vec-prototype and
instance-expando checks are running in 85065; gates 22186 remain active.
Run 85065 passed 16/16 (four prototype-storage, twelve instance-expando).
Typecheck and function/LOC gates 22186 passed. Full parser 17668 remains live.
Added an erased-metadata control to the projection test: makeDerived passes
through unknown and fingerprintFromExtern before its fields are read. This
checks the separate externref materialization path, which still transfers
sidecars only in host mode. Run 7141 is pending. If extending alias transfer
there, guard the source as a real vec first; non-array inputs materialize a
new array and must not inherit the input object's identity.
Run 7141 passes standalone, including the erased-metadata control. This
input does not demonstrate a remaining materializer defect, so no additional
source change was made to that path. Full parser 17668 remains active.
Post-identity upstream rerun 85405 passed 14/14 native and standalone, with
252 files still deferred. Formatting and whitespace check 61935 passed. Full
parser 17668 was revalidated live with active CPU use; wait on that handle,
not a duplicate build.
Full run 17668 completed: 290,566 ms, 2,740.4 MiB peak RSS, valid
79,497,551-byte zero-import module, still 0/3. Builder is unchanged at
13383740112891; Core changed to 40100245097399 but remains wrong; Performance
still throws. Its complete first trace reaches parseTokenNode/createToken,
then createNodeArray and setTextRangePosEnd, then TypeError (trace lines
6165–6194). The typed projection metadata fix alone is insufficient.
Added a dynamic assignment into a typed NodeArray property to exercise the
separate field-setter materializer; standalone run 10616 is pending. No full
parser build remains live.
Run 10616 passes standalone; the reduced typed-property assignment does not
reproduce the full remaining metadata loss. Native Builder has six visited
arrays. Its observed trailing-comma hash equals all six bits being false
(2138539933), losing the import-specifier list's sole true bit. Continue with
the full conversion/metadata evidence rather than assuming the reduced
assignment test covers that production path.
Native hash reconstruction reproduces the observed array-metadata hash exactly
when only the import-specifier and two modifier arrays have pos/end reset to
-1 (rows [8,53,2], [84,94,1], [220,230,1]); their other counts remain intact.
This suggests repeated factory reconstruction, not generic zero/undefined
reads, and remains an inference pending direct production verification.
Extended identity transfer to both remaining native externref-to-vec
materialization paths, matching the existing host sidecar transfer sites.
The alias helper now explicitly rejects non-vec sources before registration;
array-like non-array materialization cannot inherit the input's identity.
Helper indices are read after late-import flushing. Regression run 27909
is pending; no full build is active yet.
Run 27909: 15/16 pass; only the previously observed GC shared-deletion
assertion fails at -2. All standalone projection checks and the parser-list /
node-array factory regressions pass. Typecheck/gates 61262 and a full
Performance-first parser rerun are active. Full output saves
`.tmp/ts5-parser-all-vec-identity.log`; all three original oracles are retained.
Typecheck, function/LOC gates, and whitespace check 61262 passed. Full parser
session is 72044; resume it rather than starting another build.
Broader run 92997 is 8/9: nullable vecs, contextual factory, typed-array
expando, and prototype tests pass. Optional vec-factory preregistration's
host default run(0) returns 7 rather than 17; this failure is recorded but
not yet attributed by removal control. Upstream 17343 still passes 14/14
native and standalone with 252 deferred files.
Performance's preceding trace identifies parseUnionOrIntersectionType calling
its createTypeNode callback immediately after createNodeArray. Extended the
existing union-carrier test to exercise union/intersection callback paths in
standalone with raw exports/zero imports, not only its prior direct concrete
factory controls. Run 94838 is pending. Full 72044 remains active.
Run 94838 passes GC and fails the expanded standalone callback case (1/2).
Started a standalone-only bounded WAT dump of parseUnionOrIntersectionType,
createUnionTypeNode and createIntersectionTypeNode; output stem
`.tmp/ts5-union-callback-types.txt`. This is a reduced candidate for the
remaining Performance failure, not yet a verified root-cause attribution.
Full all-materializer run 72044 completed: 275,775 ms, 2,466.1 MiB peak RSS,
valid 79,509,039-byte zero-import module. Builder and Core now match their
original exact fingerprints: 2/3. Performance still throws. This validates
the missing native materializer identity transfer, without claiming full goal
completion.
Union callback dump 48798 omitted live concrete-return funcrefs from its
externref-result dispatch. Added lossless native reference export under the
existing declaration-proven factory-callback admission (excluding AnyValue).
Run 60799 still fails the full reduced factory, but dump 6040 confirms the
two real wrapper arms are now present. Added separate callback controls using
the already-working concrete constructors to distinguish dispatch from the
reduced generic union constructor's own narrowing failure. No full parser
build remains active; the reference-export candidate is not fully validated.
Concrete-constructor callback controls 91262 pass 2/2, checking both union
and intersection returns in each lane. The complete reduced generic-union
constructor failure remains visible. Started full Performance-first rerun
with all original oracles, saving `.tmp/ts5-parser-union-callback.log`, plus
broader callback/factory regressions. Typecheck/gates 64153 are pending.

Literal-factory continuation: added a two-lane regression matching
factoryCreateStringLiteral(text, undefined, hasExtendedUnicodeEscape()).
Run 44210 fails both lanes with Wasm exceptions (0/2). It explicitly checks
that the middle argument remains undefined while the later flag is true.
Reduced dump 67395 and full literal-factory dump 96208 are active; no new
compiler change yet for this defect.
Reduced WAT confirms createStringLiteral's implementation takes string/i32/i32,
while its public optional slots are externref. Explicit undefined in the middle
cannot be represented by an argument-count-only protocol, and candidate
discovery rejects it. Added a shared optional declaration scalar ABI helper,
used by both nested declaration phases and function-declaration closure wrapper
signature derivation. Optional booleans without initializers now retain
externref, like optional numeric declaration parameters; explicit native
annotations remain unchanged. Focused run 4287 and typecheck are running.
Run 4287 clears the exception but fails the undefined-field assertion in both
lanes (-1), with 12/12 factory neighbors passing. The second defect is declared
nullable boolean fields using i32, erasing undefined on assignment. Updated
their declared field carrier to externref; run 30261 passes 17/17 (2 literal,
12 factory, 3 parenthesizer). Added false-vs-undefined and omitted-tail controls.
The earlier full pre-fix dump 96208 completed: 308,622 ms, 3,271.5 MiB
peak RSS, 79,655,021-byte valid zero-import module, still 0/3 Wasm exceptions.
Expanded controls and callback/Identifier neighbors passed 98/98 in run 78383.
Both pending typechecks (78590 and 2315) completed successfully. Function/LOC
and whitespace checks 57286 passed without new allowances; formatting passed.
Post-fix canonical full parser invocation trace 12608 and upstream unit rerun
23498 are active. The post-fix full parser verdict is not yet known.
Upstream 23498 completed 14/14 in both lanes; report read-back still shows
252 deferred files / 1,747 registrations. Broader run 62405 passed 31/37:
one old scalar-ABI assertion, four descriptor tests in issue-2984, and the
standalone live-closure arity-cap control in issue-1058-barrel-computed-option-capture.
The arity control reproduced solo (91920); descriptor failures reproduced in
58019. Attribution to the current optional-boolean changes remains unproven.
Replacing the scalar-ABI assertion with the new shared ABI plus an actual
runtime check exposed a shadowed `undefined` equality defect (0 instead of 2).
The binary nullish shortcut recognized only the spelling, not the operand type.
It now requires the undefined type before using that shortcut; run 91030 checks
the shadowed parameter and literal-factory controls. Full 12608 began before
this separate equality change and must be labeled accordingly.
Full 12608 completed: started 2026-09-05T23:06:54.481Z, 362,612 ms,
2,823.4 MiB peak RSS, 79,233,535-byte valid zero-import module, still 0/3.
BuilderStatePublic now null-traps in parseSourceFile (806, offset 0x33dc72);
CorePublic and PerformanceCore remain Wasm exceptions. The last trace tail
ends in a TypeError after vec-property writes; its enclosing source caller
is not retained in this short tail. No full build remains live.
The shadowed-undefined runtime also required fixing the direct identifier
read in expressions.ts; equality-only run 91030 exposed the second spelling
shortcut (and a WAT regex that did not allow a named type). After both fixes,
25008 passed 7/7. The runtime control is now expanded to both lanes.
Control 33516 removed only the nullable-boolean-field change and reproduced
the same five descriptor/arity failures (19/24); that field change alone
does not explain those failures. A second control disables optional boolean
parameter widening as well before restoring both candidate changes.
Control 97843 disabled both optional-boolean changes and reproduced the same
five failures (19/24). Both candidate changes were then restored. Final focused
run 37303 passed 23/23: six optional-parameter checks (including both lanes for
the shadowed binding), two literal-factory, eight nullable primitive, and seven
loose-equality checks. Function/LOC/format/whitespace gate 8156 passed.
The old routing WAT suggests the next parseSourceFile null is a SourceFile
shape conversion (219 to 379) before metadata setters, but that is historical
evidence, not yet a confirmed cause in the current binary. Started a fresh
canonical dump of parseSourceFile/createSourceFile/createSourceFileWorker to
verify the current shape and caller. The trace filter now requires an
alphabetic first character after the function-name opening quote; the old
negated-underscore pattern also matched a closing quote and retained helper
noise instead of useful callers.
Fresh full dump/invocation run is session 45982, writing
`.tmp/ts5-sourcefile-post-literal-types.txt.wat`; it is still active.
Typecheck 65683 completed successfully.
Pragma identity continuation: historical WAT type 379 is PragmaContext,
not SourceFile. The parser deliberately passes `sourceFile as {} as
PragmaContext` to processCommentPragmas/processPragmasIntoFields. Added a
two-lane regression that writes a new referencedFiles array and boolean
through such a call, then reads the original object's fields and marker.
Run 22113 passed GC but returned NaN rather than 725 in standalone (3/4 total).
The existing double-assertion identity proof was disabled by a blanket
concrete-native parameter bail. Moved that restriction to the generic
asserted-write case only, so proven double-asserted mutable call parameters
use identity-preserving externref in both lanes. Full diagnostic 45982 began
before this change and remains the pre-fix control.
Pragma identity fix run 36572 passed 12/12 (four asserted-write, two parser
list, six Identifier tests). Typecheck 2506 and function/LOC/whitespace gate
2961 passed. Expanded the existing sibling-projection regression to both lanes
for Map-backed pragma writes and a cross-module ordinary caller. Run 60958
passed 97/98 (90 generic callback, one nested identity, six sibling checks),
with the new standalone Map-backed pragma case throwing; cross-module identity
passed both lanes. Reduced dump 35450 confirms the receiver is still cast to
the nominal PragmaMap interface even though new Map produces the native Map
struct. Testing native resolveWasmType inheritance recognition in 62930.
Full pre-pragma-fix dump 45982 completed: started 2026-09-05T23:16:08.165Z,
338,847 ms, 2,431.3 MiB peak RSS, 79,233,535 bytes, valid and zero imports,
still 0/3. Builder null remains parseSourceFile806 offset0x33dc72. Current WAT
confirms the PragmaContext379 guarded cast immediately before call1270.
No full build remains live; the Map-backed regression is the next local check.
Native carrier-only run 62930 still failed validation; diagnostic 62575 shows
processPragmasIntoFields constructing a five-field Map with a two-field vector
sequence. The unresolved refined-interface method was falling through to array
forEach lowering. Enabled the existing ambient-Map inheritance proof for method
and property dispatch in native mode too, while keeping host carrier resolution
externref and native resolution on the existing Map type. Real subclasses and
user-defined Map names remain excluded by the inheritance proof.
Run 18049 passes all seven sibling-projection checks, including the standalone
Map-backed pragma case. Canonical post-fix parser trace 32058, broader Map run
2769, and typecheck 5883 are active. No post-fix full fingerprint verdict yet.
Broader Map run 2769 passed 28/29 executable tests: seven sibling-projection,
six native Map.forEach, and 15/16 mapIterator. The known array-mutation-between-
suspensions test still returns -2 instead of 1. tests/map-set-basic.test.ts
did not collect because its ../../src/runtime.js import does not resolve from
tests/; this is not a passing control. Function/LOC/whitespace gate 60114 and
format checks passed. Upstream 75045 passed 14/14 native and 14/14 standalone;
252 files remain deferred. Full parser run 32058 is still active.
Typecheck 5883 completed successfully.
Expanded the user-class/interface Map-name controls to standalone and added
runtime checks (88 and 5), rather than accepting validation alone. Run 8729
passed 7/9; both new standalone name-shadow controls fail (class: invalid Wasm;
interface: module-init struct.new underflow by four). Control 68162 disabled
both native Map-inheritance carrier/dispatch changes and reproduced the same
two failures. Restored the candidate changes afterwards. These newly exposed
failures are retained as failing coverage, not waived or claimed fixed.
Upstream report read-back confirms all four artifacts remain zero-import,
6,424,494 bytes total, 14/14 passing with 252 files / 1,747 registrations deferred.
Full post-fix 32058 completed: started 2026-09-05T23:26:27.604Z,
313,770 ms, 3,132.8 MiB peak RSS, 79,033,650-byte valid zero-import module,
still 0/3. BuilderStatePublic clears the PragmaContext call-boundary null and
now illegal-casts inside processPragmasIntoFields (1271, offset0x3d8bf4),
called from parseSourceFile806 offset0x33db05. CorePublic and PerformanceCore
remain Wasm exceptions. Next dump processPragmasIntoFields and its concrete
Map/array/callback operands; the reduced Map-backed case now passes, so its
shape must be compared against the full source rather than assumed identical.
No full build remains live at this checkpoint.

Scanner/identifier continuation: expanded the minimal scanner fixture with an
eight-token import sequence control (including EOF). Native run 74569 matches
all five expected values (102, 1, 80, 1, 1); standalone run 29752 is active.
Added a minimal import-declaration AST control beside the existing identifier
and scanner controls in the full-graph diagnostic fixture; this does not
replace the three canonical real-source workload oracles.
Standalone scanner run 29752 passed 5/5: started 2026-09-05T22:30:51.273Z,
107,461 ms, 1,231.2 MiB RSS, 6,070,644-byte valid zero-import module.
This directly verifies the earlier keyword hash fix in the scanner-only graph,
including import/from classification and EOF sequencing. Full-graph native
controls 53612 pass all six expected values; standalone diagnostic run 80272
is active (three small controls plus all three original workload wrappers).
Reduced Identifier constructor run 5410 passes 6/6 after adding the real
factory's optional token-kind and Unicode-escape arguments. Now matching its
inferred createBaseIdentifier return (instead of an explicit Identifier
annotation) as another control while the full diagnostic graph compiles.
Inferred-return run 17771 passes 6/6; adding actual Map<string,string>
internIdentifier and a substring input also passes 6/6 (72005). Typecheck
67875 passed before the final interning-only fixture extension.
Full diagnostic 80272 completed: started 2026-09-05T22:32:32.818Z,
263,853 ms, 3,155.1 MiB RSS, 79,664,794-byte valid zero-import module,
1/6 invocations passing. The full-graph scanner control passes. `x;` parsing
null-traps in parseSourceFile (806, offset 0x33df57); minimal import and
BuilderStatePublic/PerformanceCore null-trap in unescapeLeadingUnderscores
(317, 0x2cd765) from missing-semicolon recovery; CorePublic throws a Wasm
exception. All original 3 fingerprints still fail. Scanner success in this
same graph rejects the simple keyword-map hypothesis. Next trace parser
lookahead/current-token routing for the minimal import and dump parseSourceFile
for the separate post-list null. No build remains live.

Routing continuation: full diagnostic trace/dump 99253 is running, selecting
parseSourceFile, isDeclaration/isStartOfDeclaration, token/nextTokenWithoutCheck,
and both speculation helpers. Inspection found the stateful scalar/TypeNode
callback regression used only target gc. Added a standalone variant with
zero-import verification; focused run 13290 is active before any new fix.
Focused run 13290 passes both lanes (2/2, 88 unrelated cases filtered out).
Whole generic-callback file run 23307 passes 90/90. The added native case
therefore does not reproduce the real parser failure; do not attribute the
failure to generic lookahead transport without the full trace/dump evidence.
Full run 99253 completed 0/2, same diagnostic binary 79,664,794 bytes,
302,210 ms, 3,635.7 MiB RSS. WAT at `.tmp/ts5-parser-routing-types.txt.wat`
shows parser lookAhead calls speculationHelper then returns i32.const 0;
speculationHelper has a void own result ABI. The generic callback proof is
not active for this full graph, letting the first void invocation freeze its
shared result. Real scanner installs a debug getter, whereas the passing
stateful reduced fixture installed a data value; changed that control to a
getter to test the fallback path before changing lowering.
Getter-only control 85044 passes both lanes, so that hypothesis alone was
rejected. Adding a globalThis reference to invalidate global builtin stability
exposes dropped node results in gc (50037); a first void instantiation makes
its later scalar result zero (15856). Standalone reduced control still passes,
but the real standalone dump directly demonstrates the same void result ABI.
Changed the unconstrained generic result fallback to externref when no earlier
identity/factory/array carrier applies; this preserves a shared T result even
without callback provenance. The conservative semantic detector is unchanged.
Focused regression run 51452 and typecheck are running.
Run 51452 passed 96/96 (90 callback/detector, 4 identity, 2 reverse-map).
Typecheck 90032 passed. Canonical full invocation trace 59790 is running after
the fallback fix; no post-fix full fingerprint verdict yet.
Function/LOC/whitespace gate 64235 and formatting 54972 passed. Upstream
rerun 58385 passed 14/14 native and 14/14 standalone; report read-back confirms
all four modules have zero imports. Still 252 files / 1,747 registrations
deferred. Full 59790 remains live.
Full 59790 completed: started 2026-09-05T22:49:41.200Z, 241,148 ms,
4,261.2 MiB peak RSS, 79,655,021-byte valid zero-import standalone module,
still 0/3 (all Wasm exceptions). Performance trace now reaches parseExpected,
scans the quoted module path, enters parseModuleSpecifier -> parseLiteralNode
-> parseLiteralLikeNode, then TypeError after getTokenValue/Unicode-escape
scanner calls. The prior import-as-expression/missing-semicolon null is cleared
on this trace. Next inspect the string-literal factory callable's argument ABI.
The separate simple `x;` post-list null has not been rerun after this change.
No full build remains live at this checkpoint.

The module plan remains capability-based: parser, binder, checker, and
printer/emitter are separate public roots. A runtime module that is neither
reachable from the selected runtime entry nor re-exported may be removed only
when its top-level evaluation is proven unobservable. A linked but otherwise
unused module remains rooted when import evaluation, an observable initializer,
or module evaluation order can affect behavior; side-effect imports therefore
remain roots. Post-lowering DCE starts from public exports,
module/start initialization, host callbacks, and genuine `ref.func`, table, or
dynamic-registry targets, then removes unreachable functions, globals, types,
data, and table entries before identical-body folding. The checker oracle after
the binder slice must be `const x: number = "str"` producing TS2322; `1 +
"str"` is valid TypeScript and is not a checker-negative control. Printer
equivalence should be a separate `createPrinter().printFile` slice before full
emit and self-hosting.

### Resume: Performance executes but its AST still differs

Full standalone run 19103 is terminal: 303982 ms, 79,578,110 bytes,
valid Wasm with zero imports. Builder and Core retain their exact fingerprints
(2/3 total). Performance now returns 49594410090848 instead of
49645738923599; clearing the exception is not a passing parser result.
The authoritative output is `.tmp/ts5-parser-union-callback.log`.
Callback/factory regression run 5895 passed 94/94. Gate handle 64153 is
no longer available, so its final verdict is not claimed.

Next diagnostic: partition Performance's AST into independently hashed node
kinds, positions, ends, flags, array metadata, trailing commas, and text using
`typescript-parser-performance-fields.ts`. Keep canonical acceptance unchanged;
native TypeScript supplies the diagnostic expectations, not the candidate.
The full 256-file unit-suite and self-hosting scope remains unfinished.

Native reconstruction now reproduces Performance's **exact** wrong packed
fingerprint by omitting its three UnionType subtrees. Native has 295 nodes and
11 statements; standalone has 283 nodes and 11 statements. Each union subtree
contains four nodes, at source positions 827, 1985, and 2992. Running the
unchanged canonical fingerprint with only those child callbacks suppressed
returns 49594410090848, exactly the candidate's result (normal native:
49645738923599). This is a focused attribution, not an acceptance workaround.

Reduced union test run 77145 is 3/4: both concrete-constructor callback lanes
and the host production-shaped factory pass; standalone generic union
construction fails. WAT `.tmp/ts5-union-construction-types.txt.wat` shows
createUnionOrIntersectionTypeNode retaining a base Node (heap type 38), storing
`types` through the open-property setter, and returning it as externref.
createUnionTypeNode then tests for the physical UnionTypeNode (heap type 40)
and replaces a failed test with null. The next implementation must preserve
the original object's identity and fields across this assertion; merely
copying fields into a new record would leave alias/mutation semantics broken.
The full diagnostic seven-field build 82742 completed in 262069 ms with a
valid 79,581,577-byte zero-import module, peak RSS 2862.1 MiB. All seven
field hashes differ from complete native TypeScript (0/7), and all seven
exactly match native TypeScript with only the three union subtrees omitted:
nodeKinds 1190267654, nodePositions 3306985177, nodeEnds 1648673728,
nodeFlags 3603851679, arrayMetadata 1555702382, trailingCommas 325998914,
texts 502775548. This independently corroborates the missing-union diagnosis;
none of those altered-native values replace acceptance expectations.
Output: `.tmp/ts5-parser-performance-fields.log`. No diagnostic parser run
remains live. Typecheck, fixture/test formatting, and whitespace checks 83075
all passed. Next: repair the generic union constructor's identity-preserving
carrier/narrowing behavior, then rerun the reduced union test and all three
original standalone parser fingerprints before expanding the upstream units.

### Native union allocation-view candidate

The existing proven shared-Node allocation-view registration already handles
UnionTypeNode and IntersectionTypeNode in the host lane, but explicitly excludes
standalone/WASI. Removed only that target restriction: the exact source contract,
single TypeNode base, and proven merged TypeNode-to-Node alias checks remain.
This keeps union nodes on their actual base allocation and uses the existing
native ordinary-property sidecar for `types`, instead of copying a new struct.
Reduced factory and alias/mutation tests plus full parser acceptance must verify
this candidate before claiming the third parser workload passes.

Initial reduced run 24442 passes 4/4. Expanded run 97887 passes 40/42,
including all 6 union tests with shared-reference equality, sidecar writes in
both directions, and base-field writes in both lanes. The two failures are
GC/Node literal diamond/Shared LiteralLikeNode tests in the generic-base-node
suite; neither fixture declares UnionTypeNode or IntersectionTypeNode, and
the host allocation-view predicate is unchanged by this candidate. They remain
visible unresolved failures, not waived acceptance. Token specialization,
property-access chain, shape DAG and NodeArray factory checks pass.
Typecheck, function/LOC gates and whitespace run 51098 passed. Upstream run
86846 remains 14/14 native and standalone, with 252 deferred files.
Full parser run 46082 is live with all three original expectations, output
`.tmp/ts5-parser-native-union-carrier.log`; poll the same handle.

Run 46082 completed successfully: **3/3 original standalone parser
fingerprints pass**, valid 79,155,162-byte Wasm, zero imports, 258041 ms total,
3094.6 MiB peak RSS. Performance 49645738923599, Builder 13386537220945,
Core 40098163538143 all match exactly. The five reported diagnostics are
IR-selection warnings, not compilation errors. No oracle or upstream source
was changed. The target-independent shared allocation view fixes the missing
union nodes without introducing copied-object aliasing.
Expanded union/intersection alias tests 83987 pass 6/6, and generic callback
regressions 27521 pass 90/90. Native TypeScript revalidated binder smoke
expectations from the committed fixtures: const-local 65792, duplicate-let
131330. Continue with the standalone binder entry, then broaden original
unit coverage; parser acceptance is not full TypeScript/unit-suite completion.
Standalone binder run 66820 is active, with both original smoke expectations
and zero-import enforcement; output `.tmp/ts5-binder-native-union-carrier.log`.
Resume this handle rather than launching another binder build.

### Broaden original upstream unit coverage after parser acceptance

Added the complete original `compilerCore.ts` unit file (11 registrations),
raising the adapter's required floor from 4 files/14 tests to 5 files/25 tests.
The exact release-source projection now includes arrayFrom, equalOwnProperties,
createSet and their original helper implementations. Test bodies/assertions are
unchanged. This exposes custom-set mutation, iteration, collision and object
equality behavior, not a hand-written substitute. Updated verdict canaries and
bumped the report oracle version to 3. The expanded run must report failures
honestly; selection is not a passing claim, and 251 files remain deferred.
Initial expanded run 62869 is active; binder run 66820 is still active.

Binder 66820 completed: compile succeeds, 88,206,186-byte module validates,
268063 ms total, 2990.4 MiB peak RSS. It still imports `env.WeakMap_get`,
so the zero-import gate correctly rejects both smoke invocations before
instantiation (0/2, no runtime result). Next binder repair is the native
WeakMap method routing, not changing import enforcement or adding a host shim.

Initial expanded unit run 62869 completed with 25 registered tests but only
15 native passes: 10 compilerCore tests exposed missing isTrue/isFalse in the
assertion adapter. Added exact-boolean assertion helpers and positive/negative
canaries (truthy/falsy substitutes must fail). Also split the exact core source
projection into its own module: importing its generator definitions into every
utility module introduced four host generator imports in otherwise independent
tests. CompilerCore retains its entire implementation, including generators;
those imports must be fixed, not hidden. Rerun 36448 is active, with unchanged
25-test/5-file gate and explicit 251-file deferral.

Run 36448 completed: **25/25 native, 14/25 standalone**. All original four
modules retain their zero-import passes. CompilerCore registers and passes all
11 original callbacks natively, but its compiled module is rejected for four
host generator imports: `__gen_create_buffer`, `__gen_push_ref`,
`__gen_yield_star`, `__create_generator`. The strict gate returns failure,
as required; none of the 11 newly exposed tests is silently deferred.
Report: `tests/dogfood/report/typescript-upstream-suite.json` (oracle version 3).
Harness/verdict/worker controls 28801 pass 24/24; typecheck and whitespace
22334 pass. No binder or upstream adapter run remains live at this checkpoint.

Next frontiers: (1) binder's single WeakMap_get import, with actual native
WeakMap semantics rather than a host shim; (2) the original core createSet's
nested getElementIterator/yield-star and generator entries method, which still
select host generator helpers. Preserve the 3/3 parser fingerprints and the
now-expanded 25-test denominator during these repairs.

### Binder WeakMap import investigation

Added captured WeakMap/getter and module-global cache controls. Run 25188
passes 2/2 in GC and standalone, checking object-key identity, cached strings,
and zero imports in the native lane. The reduced valid case does not reproduce
the binder's import. A full binder diagnostic now logs only native WeakMap/
WeakSet calls declined by the native emitter (`JS2WASM_TRACE_WEAK_DISPATCH`).
The temporary trace must be removed after locating the real fallback; no host
shim or import-gate relaxation is permitted.
Full diagnostic run is 76102, log `.tmp/ts5-binder-weak-dispatch.log`; it is
still live. Resume its handle. The source diagnostic in expressions/extern.ts
is temporary and must be removed after the observation.

Generator investigation correction: the early nested-declaration comment and
no-capture registration are not the complete implementation. The later
capturing branch (nested-declarations.ts around 2094) already passes captured
cells/TDZ flags into registerNativeGenerator, and resume restores them. Do not
implement duplicate capture machinery or claim capture alone is the root cause.
The host-import pre-scan still checks generatorCapturesOuterScope; determine
the actual rejected plan/emitter for the original core generators before
changing that admission or its imports.

Direct compilerCore diagnostic 58907 locates the actual rejection:
buildNativeGeneratorPlan -> lowerForOf -> lowerIf -> emitYield rejects
`yield* value` because its unwind chain contains the implicit IteratorClose
finally region from the enclosing for-of. Both the import pre-scan and real
nested-function registration hit that same rejection. The original nested
getElementIterator is the rejected generator; captures alone are not the
cause. Removed the temporary generator trace after collecting this stack.
Fix requires yield-star abrupt-mode forwarding through state-lowered unwind
regions, including inner completion/throw/return and outer IteratorClose; do
not merely remove the admission guard to pass normal-iteration tests.

Binder trace 76102 completed byte-identically (88,206,186 bytes; same lone
WeakMap_get import), with no direct native WeakMap-method fallback logged.
Removed that temporary trace and moved it to registry/imports.ts addImport
for WeakMap_get only. New full trace run 35445 is active; log
`.tmp/ts5-binder-weak-import-producer.log`. Remove this temporary registry
trace once its producer stack is known.

Run 35445 completed with the WeakMap_get registration stack in the extern
property-call pre-scan (registry/imports.ts visit/register). Removed the
temporary registry trace. TypeScript factory/nodeChildren.ts uses the exact
nested lookup `sourceFileToNodeChildren.get(sourceFile)?.get(node)`, and the
optional-call emitter had native Set.has/delete only before its extern path.
Extended the saved-receiver native helper to Map/ReadonlyMap/WeakMap get,
has/delete plus WeakSet has/delete, with declaration-file provenance to avoid
hijacking user classes sharing builtin names. get preserves its anyref payload
as externref; short-circuiting still returns canonical undefined.

Expanded regression 55154 reproduces an invalid standalone optional get
(externref import called with anyref receiver). Its GC lane separately returns
-2 at the missing-receiver key-evaluation check, retained as a visible failure.
Candidate test run checks the nested lookup, missing receiver key suppression,
array identity, has/delete booleans, and existing optional Set behavior.

Run 88617: all 7 existing optional Set checks pass. The expanded WeakMap
module now validates with zero imports in standalone, clearing its prior
externref/anyref call mismatch, but both lanes fail the local keyCalls control.
Diagnostic 79542 returns NaN for `-200 - keyCalls`: this is not evidence of an
extra key invocation. Preserve the captured numeric-counter failure and add
an independent object-state counter control (run 60802 pending) to test lookup
semantics without conflating the capture representation defect.
Full binder candidate run 99624 is active with the two unchanged smoke
oracles; output `.tmp/ts5-binder-optional-weakmap.log`. Typecheck/gates 47670
are also pending. All temporary WeakMap/generator tracing edits were removed.

### Resumed verification: optional collection runtime boundary

Recovered terminal binder run 99624: compile succeeds, 88,206,870-byte Wasm
validates with **zero imports**, but **0/2** unchanged binder invocations pass:
both throw a WebAssembly.Exception during invocation. Total 285514 ms,
peak 3161.6 MiB. This clears the host-import blocker, not binder acceptance.
Invocation-only trace run 18350 is investigating the exception, with output in
`.tmp/ts5-binder-optional-weakmap-invoke-trace.log`.

Missing handles 60802/47670 did not preserve a recoverable verdict. Fresh
WeakMap run 32626 established that the standalone object-backed counter
control passes while the numeric captured counter returns NaN. Split all three
exports into independent tests, keeping every failing assertion. Run 61014:
**10/13 pass** across WeakMap and optional Set tests; all seven Set tests pass,
ordinary captured WeakMap getter passes in both lanes, object-backed optional
WeakMap lookup passes standalone but traps with illegal cast in GC, and the
numeric-counter optional lookup fails with NaN in both lanes.

The existing `emitEagerCaptureBoxes` explicitly skips TDZ (`let`/`const`)
captures and documents conditional-call lazy boxing as residual follow-up.
This is a concrete lead for the numeric counter, not yet an attributed fix.
Do not weaken the counter assertion or substitute the object-backed control
for its semantics. Full upstream scope remains 256 files.

Reduced regression `tests/issue-1058-conditional-let-capture.test.ts` removes
collections and optional chaining entirely. Run 3799: **2/4 pass**; both `var`
controls pass, both `let` variants return NaN only when the capturing call is
skipped. The taken-call assertion passes for every variant. This isolates a
lexical-capture initialization defect independently of the new native lookup
helper. Fresh run 42250 passes TypeScript no-emit checking, function/LOC gates,
and whitespace checks; both new/updated regression files pass Prettier.

### Conditional lexical capture repair and binder exception trace

Direct nested-call boxing now records `rawLocalIdx` and uses a nullable cell,
matching the existing conditional capture repair contract. Already-boxed
direct calls repair the cell before forwarding it. This reuses the existing
identifier/assignment/update read and write repairs, rather than changing
lexical declaration timing. No context map is moved; the existing
`boxedCaptures` lifecycle and original-slot guards remain in force.

Run 67311: **23/25 pass**, including all four reduced let/var cases, all twelve
eager-box controls, three destructuring controls, and all three standalone
WeakMap exports. The two GC optional WeakMap exports still trap with illegal
cast; the numeric case now gets past the prior NaN failure. Expanded control
run 86815 passes **35/35**, including conditional-arm capture, lifted cell
identity and capture-depth suites. The reduced test also checks writes and
unconditional forwarding after a skipped first call. New gates run 84565 is
pending; formatting of the implementation and capture regression passes.

Binder trace 18350 completed: byte-identical 88,206,870-byte, zero-import,
valid Wasm; still **0/2** invocation matches. Total 279502 ms. Both trace paths
reach `bindJSDocImports`, which immediately constructs a TypeError. Its source
first guards `jsDocImports === undefined` and then iterates the array. Added
`tests/issue-1058-binder-pending-array.test.ts` to check an unset captured typed
worklist, population and reset across calls; run 99743 is pending. This trace
predates the direct-call capture repair, so it is not a full candidate verdict.

Run 99743 reproduces a WebAssembly.Exception in both lanes (**0/2**) for the
reduced binder pending-array case. It is retained as the next investigation,
not yet proof of the precise representation defect. Gates 84565 pass
typechecking, both code-size gates and whitespace checks. Pending-array test
formatting passes.

Parser compile recheck 62530 is running in
`.tmp/ts5-parser-conditional-capture-repair.log`, but its invocation arguments
were mistakenly named runPerformance/runBuilder/runCore. The actual exports
are runPerformanceCore/runBuilderStatePublic/runCorePublic, with unchanged
expected values 49645738923599/13386537220945/40098163538143. Consequently this
run can provide compile/validation/import evidence only, NOT parser invocation
acceptance; let it finish under the no-test-kill rule and use the correct
export names for the next full recheck. No parser regression verdict is yet
available for the capture repair.

### Binder unset worklist: strict comparison preserves declaration default

Diagnostic 22638 shows the reduced `flush` emits a captured array read followed
by `drop; i32.const 0` for `pending === undefined`; the following for-of throws
on the null vector. The physical slot uses ref.null for the unset value, but
the comparison relied only on the declared `Tag[]` type and folded the guard
away. This matches the full trace's `bindJSDocImports` entry shape.

Added `readsUninitialisedVariableSlot` for identifiers resolving to explicitly
typed variable declarations without initializers. Concrete reference strict
nullish comparisons now treat those declaration defaults as undefined.
Declarations admitting null/any/unknown stay out of this additional predicate;
the existing mixed-carrier policy remains unchanged. This is not a global
null-equals-undefined change and does not modify the externref comparison path.
Run 79732 passes the reduced binder lifecycle **2/2**, up from two exceptions.
Run 40049 adds an explicit nullable-array control and checks field and vector
nullish suites; gates 90172 are pending. No full binder acceptance credit yet.

Run 40049 completes **75/75** regression checks, including the explicit-null
variable control. The field suite intentionally includes known-divergence
assertions; these counts are regression stability, not 75 newly conforming
behaviors. Full standalone binder retry 45060 is running with the original
runConstLocal=65792 and runDuplicateLet=131330 oracles, logging to
`.tmp/ts5-binder-unset-worklist.log`. Parser compile-only diagnostic 62530 and
gates 90172 remain live at this checkpoint. All 256 upstream files and the
generator-delegation blocker remain in the goal's scope.

### Generator worklist delegation acceptance controls

Added `tests/issue-1058-generator-worklist-delegation.test.ts`: native-JS
oracles and strict zero-import standalone checks for Map.values()-backed
flattening (123), `.return(9)` closing the enclosing iterator once, and
`.throw(9)` on an array delegate producing TypeError while closing the
enclosing iterator once. Array iterators lack a throw method: do not replace
that TypeError with propagation of the original numeric payload.

Initial run 7728 exposed a test-source return-type mismatch; corrected the
generator's normal return to numeric 0 rather than suppressing semantic
diagnostics. Run 49509: all **3/3 native oracles pass**, all **0/3 standalone**
checks stop at the native-generator unsupported-shape diagnostic. The
planner's non-replay unwind guard remains intact: lifting that guard alone
would skip delegate abrupt-method semantics. These tests are not a substitute
for the eleven original compilerCore tests or the full 256-file unit scope.

Gates 90172 completed successfully. Parser run 62530 completed in 305896 ms,
peak 2837.8 MiB: 79,155,603-byte valid Wasm, zero imports; all three invocation
lookups failed solely on the documented wrong export names. Correct full
parser run 45226 is now active with runPerformanceCore/runBuilderStatePublic/
runCorePublic and the unchanged original fingerprints, logging to
`.tmp/ts5-parser-unset-worklist-repair.log`. Binder candidate 45060 remains
active. No runtime acceptance inferred from either pending run.

Binder candidate 45060 completed: **0/2** unchanged invocation oracles still
throw WebAssembly.Exception. Compile succeeds; 88,207,292-byte Wasm validates
with zero imports; total 319691 ms, peak 3232.2 MiB. The reduced worklist fix
is therefore not sufficient evidence of a full binder repair. Invocation
trace 18167 is now running on this candidate, logging to
`.tmp/ts5-binder-unset-worklist-trace.log`, to distinguish a moved exception
from a source-projection case missed by the reduction. Correct parser run
45226 remains active.

Generator implementation audit: `__iterator_return` is IteratorClose and
deliberately discards its result; it cannot implement yield-star forwarding
where `.return()` may yield `{ done: false }`. The iterable delegation state
only invokes `__iterator_next`, while the legacy native-generator delegation
abrupt arm drives the inner once and discards its result. A correct extension
must retain delegate results and route completion through the outer unwind
chain, including missing `.throw` producing TypeError and enclosing iterator
cleanup. Do not substitute `__iterator_return` or remove the planner guard
as if either were full delegation support.

Correct parser recheck 45226 completed successfully: **3/3 exact original
fingerprints match**, valid 79,155,603-byte standalone Wasm, zero imports.
Performance=49645738923599, Builder=13386537220945, Core=40098163538143.
Total 271764 ms, peak 3307.8 MiB. This verifies parser acceptance after the
conditional-capture and unset-worklist comparison changes; it does not prove
binder or upstream-unit completion. Binder trace 18167 remains live. A fresh
expanded upstream adapter run is logging to `.tmp/ts5-upstream-unset-worklist.log`.

Expanded adapter run 52174 completed on the current candidate: **25/25 native,
14/25 standalone**, five selected files and 251 explicitly deferred files.
All five modules compile and validate. Four modules run with zero imports;
compilerCore's eleven tests remain blocked before execution by exactly
`__gen_create_buffer`, `__gen_push_ref`, `__gen_yield_star`, and
`__create_generator`. Report retains oracleVersion 3 and all original counts.
No new unit acceptance credit; this is fresh evidence that the capture and
worklist fixes preserve the current floor and do not remove the delegation
blocker.

### Binder trace moves past binding; optional native collection size

Trace 18167 completes in 263472 ms on the same 88,207,292-byte candidate:
both invocations still throw, but now `bindSourceFile` RETURNS before the
failure. The tail reads `symbolCount` and `locals`, then attempts Map primitive
conversion via valueOf/toString and throws TypeError. The committed oracle
reads `source.locals?.size` before its range checks and arithmetic.

Reduced `tests/issue-1058-optional-map-size.test.ts` run 68974 reproduces
standalone's populated-size failure (-2); GC separately fails the missing
receiver case (-1). The optional-property extern reader emits no getter when
its host import is absent, leaving the collection receiver in place of size.
Added an extracted native size reader before that branch. It consumes the
saved non-null receiver, calls the existing `__map_size`, and requires actual
declaration-file Map/ReadonlyMap/Set/ReadonlySet symbols, excluding user classes.

Run 8961 passes **8/9**: standalone size now passes and all seven optional Set
controls pass; GC's initial missing-value failure remains. Expanded size
controls (read-only collections and getter receiver evaluated exactly once)
run 21012 is pending; typecheck 38770 is pending. Full binder retry 34787 is
active, logging `.tmp/ts5-binder-optional-map-size.log` with the unchanged two
smoke oracles. No binder acceptance credited until this full run succeeds.

Expanded run 21012 confirms the standalone read-only Map/Set and exactly-once
receiver controls pass; GC still fails the initial absent optional property
check. Both function and LOC gates pass (the combined command's exit 0 is
the gate result, NOT a green Vitest result). Typecheck 38770 passes. Binder
34787 remains the authoritative pending full candidate check.

Run 25536 adds and passes both user-defined Map/Set size-getter controls;
standalone collection-size test also passes (**3/4** total, the retained GC
missing-value failure is the fourth). Formatting and whitespace run 51918
passes. Split the generator normal-worklist source from cleanup sources to
avoid attributing a shared-module compile failure to every behavior. Run
24794 retains **3/3 native, 0/3 standalone** but now precisely distinguishes:
normal Map.values flattening compiles and validates, then fails the zero-import
gate on three generator imports; cleanup fixtures fail code generation.
Both kinds of missing support remain required. Binder 34787 is still live.

Binder 34787 has now completed: **both invocations execute without exception**,
but both return **0**, versus unchanged expected 65792 and 131330 (**0/2
matches**). Compile succeeds; 88,207,339-byte Wasm validates with zero imports.
Total 256928 ms, peak 3139.3 MiB. The optional-size repair clears the TypeError
but does not establish semantic correctness. Next diagnosis must separate the
symbol/local/diagnostic counts and verify binding ran on the returned source
object; retain original smoke expectations, never reseed them to zero.

### Binder zero counts: cross-module traversal-function collision

Diagnostic fixture `typescript-binder-fields.ts` decomposes the packed oracle
without replacing it. Native TypeScript 5.9.3 yields parse-shape 3080101,
const symbols/locals/diagnostics/has-x = 1/1/0/1, duplicate counts = 2/1/2.
Full standalone run 50234 (236551 ms, 88,208,095 bytes, zero imports) matches
only parse-shape and const diagnostics (**2/8** diagnostic matches); every
post-bind count and has-x is zero. Parser output is nonempty and initially
unbound, so missing symbols are not merely a packed-arithmetic problem.

Existing trace 18167 shows `bindEachChild -> forEachChild -> visitNodes ->
visitArrayWorker`. That last helper belongs to visitorPublic.ts's transforming
`visitNodes`, not parser.ts's same-named traversal function. Both declarations
have incompatible parameter order. This suggests a module-initializer closure
compiled under another module's bare-name function binding.

New multi-module regression 51158 reproduces exceptions in both lanes.
Candidate `fixedSourceFunctionCallHandle` uses the exact fixed-arity top-level
declaration's registered handle and suppresses stale name-keyed inlining and
nested captures. Run 85700 preserves five existing collision controls, but
the new two tests now trap with illegal cast in `__closure_16`; candidate is
NOT yet a verified fix. WAT diagnostic 47547 is examining the remaining call
ABI mismatch. Do not claim the new handle selection fully fixes module scope.

WAT diagnostic 89680 exposed one final `finalFuncIdx` lookup still reverting
to the bare-name map AFTER the arguments had been compiled for the exact
declaration; mismatch repair then cast the callback into the other function's
array parameter. Preserve the exact handle at that final emission too.
Run 1423 now passes **8/8**: both new module-initializer collision tests,
five existing module collision controls, and the nested factory-name control.
Formatting run 94096 passes. Wider generic-callback/capture run 14215 and
gates 6661 are pending. Full binder retry 95759 is active with unchanged
65792/131330 oracles, logging `.tmp/ts5-binder-source-function-identity.log`.
This is the first full binder run with the exact-call handle repair; its
success is not presumed from the reduced regression.

Wider run 14215 passes **94/94** (90 generic callback-result cases and four
conditional-capture cases). Full binder 95759 and gates 6661 remain pending.

Gates 6661 pass typecheck, function/LOC gates and whitespace checks. Parser
recheck 78543 is running in `.tmp/ts5-parser-source-function-identity.log` with
the three unchanged fingerprints. Binder 95759 remains live.

Expanded collision regression 40649 adds a same-named foreign rest function:
the two original rows pass, but both rest rows emit invalid calls (two required
operands versus one packed array). Exact function identity must also reject
the unrelated name-keyed rest/default metadata. The exact-handle predicate
already proves the source declaration has neither; suppress those two metadata
lookups for proven fixed-arity source calls. Run 80913 confirms all **4/4**
collision rows now pass; its source-callable ABI suite is still running.
Formatting passes; renewed typecheck 90998 is pending. Full compiler runs
95759/78543 began before this last metadata refinement; label their results
accordingly rather than presenting them as a final whole-candidate verdict.

Run 80913 completed **17/17** (four collision rows plus thirteen exact source
callable-ABI controls). Binder 95759 completed: valid 87,966,578-byte Wasm,
zero imports, total 304778 ms, peak 3237.5 MiB, **0/2** matches. Both cases now
trap at `declareSymbol` (offset 0x151b8ea / 22132970), reached through
bindBlockScopedDeclaration -> bindVariableDeclarationOrBindingElement ->
bindWorker -> bind -> forEach -> bindEach. This is a new, concrete downstream
failure: traversal now reaches variable declarations instead of silently
skipping them. Next diagnosis should inspect declareSymbol's null operand,
not revert expected counts or count an exception as acceptance.

Parser 78543 completes **3/3 unchanged exact fingerprints**, valid
79,099,700-byte Wasm and zero imports, total 261813 ms. This run includes the
exact source-handle selection, before the final rest/default metadata guard.
Typecheck 90998 passes after that guard. No full compiler process remains
running at this checkpoint.

### Binder Symbol constructor shadowing follow-up

Source-mapped trace 35124 completed with **0/2** unchanged binder oracles:
both traps map to binder.ts:889 after `createSymbol` returns without invoking
a constructor (`__closure_arity` returns -1). The reduced captured symbol-table
matrix (35281) passes the standalone object-literal control but traps with the
allocator-returned constructor; both GC rows also fail (1/4 overall).
Reduced WAT identifies the standalone defect: `() => Symbol as any` materializes
the builtin Symbol singleton instead of the source `function Symbol`. The bare
builtin value arm precedes source function wrapping and lacked a declaration
shadowing guard. Add the existing resolved-declaration/ambient check at that
arm; targeted and full-graph validation remain required. No acceptance values
or full-unit-suite denominators changed.

Validation after the guard: 10411 is **8/10** (both standalone symbol-table
cases plus all six existing constructor-factory tests pass; the two existing
GC symbol-table cast failures remain). Builtin identity controls 4268 pass
**14/14**. New source-function value controls 60552 pass **4/4** for Symbol,
Map, Set and RegExp. Typecheck 85145 passes. Full binder retry 6509 is live,
logging to `.tmp/ts5-binder-symbol-shadowing.log`, with original 65792/131330
oracles; do not infer a full binder pass from the reduced constructor result.
Typed-this twin and module-function collision controls 90172 pass **16/16**.
Function/LOC gates 11530 and `git diff --check` pass after the change.

Full binder 6509 is now terminal: **1/2** original acceptance workloads pass.
`runConstLocal` returns exactly **65792** (previously trapped); duplicate-let
still throws a WebAssembly.Exception rather than returning **131330**. Binary
size is 87,999,385 bytes. This establishes a real binder gain, not completion.
Next trace should target duplicate-declaration/diagnostic handling; the former
Symbol-constructor null trap is cleared for the const workload. No full build
process remains live at this checkpoint. Full 256-file upstream unit coverage,
generator delegation, checker and self-hosting remain unfinished.

Duplicate-declaration follow-up: trace/source-map retry 31476 is running at
`.tmp/ts5-binder-duplicate-trace.log`, retaining both original binder oracles.
Add a reduced diagnostic rest-argument/regexp replacement control while tracing
the real exception; it is a diagnostic hypothesis, not an attributed root cause.

31476 completed **1/2**, preserving const=65792. Trace stops at
`getTextOfNodeFromSourceText -> isJSDocTypeExpressionOrChild -> findAncestor ->
__new_TypeError`, before diagnostic formatting. `findAncestor` accepts a
boolean-or-"quit" callback; this caller passes the boolean type predicate
`isJSDocTypeExpression`. Add the ancestor predicate callback reduction next.
Separately, formatter matrix 66625 is **1/2**: direct indexed args pass,
generic `checkDefined(args[index])` fails. A character-code probe shows
`Cannot redeclare [object Object].` instead of `Cannot redeclare x.`; WAT
shows the already-tagged argument reboxed before stringification. This is a
separate defect, not evidence explaining the current binder exception.

Ancestor reduction initially throws (10912). Removing the zero-argument
restriction on externref Boolean boxing did not help (37232), so that edit
was reverted. WAT instead shows a callback result of `$AnyValue`, with an
i32 Boolean predicate omitted from the funcref dispatch ladder. Explicit
`__any_box_bool` adapts that proven result; matrix 84156 then passes match
and missing, while the string "quit" callback still throws (2/3). Add the
matching native-string-to-union result conversion via `__any_box_string`.
Both are representation-proven boxing, not arbitrary object downcasts.
Validation 85549 passes **93/93**: all three ancestor cases plus 90 existing
generic callback tests. Full binder retry is logging to
`.tmp/ts5-binder-predicate-union.log`; it must retain 65792/131330. Formatter
generic-return reboxing remains unfixed, and broader/full-graph acceptance
is not implied by the reduced tests.

Live handles at this checkpoint: binder **34295**, function/LOC/diff gates
**7039**. Typecheck and formatting **55951** completed successfully. Poll the
existing handles before starting replacement runs.

Gates 7039 completed successfully; binder 34295 remains live. Formatter
follow-up changes `__any_box_extern_s1` to recover an existing `$AnyValue`
for every tag instead of only undefined. This preserves compiler-owned
tagged values crossing erased generic ABIs without enabling honest
classification of arbitrary raw externrefs. The helper's emitting call site
is `value-tags.ts`; its contract comment is updated too. Targeted tests
77438 are pending; broader nullish/boxing regression checks are required.

77438 completes **95/95** (formatter direct/generic 2/2, ancestor 3/3,
generic callback controls 90/90). Nullish/boxing regression run 94696 passes
**27/27** across host default returns, hoisted regexp values, any-array tags,
undefined-singleton behavior and array absence/defaults. Binder 34295 began
before this boxing edit and must be labelled as the predicate-union candidate,
not as validation of the formatter repair.

Typecheck 77632, formatting/diff check 80963 and function/LOC/diff gates
72138 pass. Full parser regression 66724 is live with all three unchanged
fingerprints, logging to `.tmp/ts5-parser-union-box-roundtrip.log`; unlike
binder 34295, this run includes the formatter boxing repair.

Binder 34295 completed: **1/2**, const=65792 and duplicate-let still throws,
valid 88,001,151-byte Wasm, zero imports, 284714 ms. This predates formatter
boxing preservation; no assertion about the remaining exception's location
is justified without tracing again. A current-candidate trace is logging to
`.tmp/ts5-binder-union-box-trace.log` while parser 66724 remains live.
The binder trace handle is **18044**. Poll 18044 and 66724 on continuation;
do not replace either run merely because a polling interval expires.

Additional representation guard: `issue-1058-union-generic-roundtrip.test.ts`
passes runtime-selected string/number/true/false union-array elements through
generic `defined<T>` and checks both `typeof` and exact value. Run 41548 is
pending; parser 66724 and binder trace 18044 were confirmed live on resume.

Parser 66724 completes **3/3 exact original fingerprints**, valid
79,134,618-byte Wasm, zero imports, 300676 ms. This includes the predicate
union callback and existing-AnyValue preservation repairs. Broader union
roundtrip test 41548 fails number/boolean rows; split control 31877 is **1/2**:
direct reads preserve all four brands/values, generic-return reads give
[1,-2,-3,-4]. Thus formatting now works but general generic union brands are
not yet correct. Binder trace 18044 remains live.

Binder trace 18044 is terminal: valid 88,001,430 bytes, zero imports, **1/2**.
The trace now executes `__fn_tramp_isJSDocTypeExpression_cached` through the
ancestor walk, then reaches diagnostic formatting. The remaining throw is
`formatStringFromArgs -> __closure_861 -> checkDefined ->
__call_accessor_get -> __call_fn_method_0 ->
__proto_method_-1073741806_toString -> __new_TypeError`. The full-graph
formatter carrier still differs from the passing reduction; adding an
assertion-function-style guard passes all three formatter rows (69286).

For the separately measured generic scalar-brand loss, add
`generic-scalar-union-result.ts` at expression result coercion: only erased
externref results of generic calls with proven string/number/boolean union
types recover tags via the existing honest classifier. Unrestricted any
results retain their existing path. Test run 90074 is pending. Both full
build processes are finished; no new full acceptance result is claimed.

90074 passes **5/5**: generic/direct union brands and all three formatter
variants. Regression 48264 passes **108/108** (90 generic callbacks, three
ancestor cases, six constructor-factory cases, nine undefined-singleton
controls). Typecheck/format handle 71921 is still pending. Parser 66724's
3/3 result predates this latest generic-scalar-union-result helper.

71921 completed typecheck/format successfully. `builtin-brands.ts` identifies
the full-graph throw's brand -1073741806 as **Object.prototype.toString**,
not String.prototype. Its classifier can refuse unknown carriers. Next work
should inspect the diagnostic argument at the full graph's erased generic
return / concatenation boundary; do not "fix" it by swallowing this refusal
or accepting diagnostic counts with wrong message text. No full build is live.
Final function/LOC/diff gates 62241 pass after the scalar-union result helper.

Formatter graph diagnosis: 98591 runs `compileProject` on the same tracked
binder entry and standalone options, emitting only selected formatter/caller
function WAT into `.tmp/ts5-binder-formatter-wat.log` and then invoking both
original exports. This is diagnostic output, not an acceptance artifact.
Cross-module captured-rest/same-name diagnostic-function reduction 77245 is
pending in `issue-1058-diagnostic-module-forwarding.test.ts`.

77245 passes **1/1**. Native TypeScript **5.9.3** verifies the unchanged
duplicate-let input produces two code-2451/category-1 diagnostics at starts
4 and 94, length 1 each, both message `Cannot redeclare block-scoped variable
'x'.`. Add `typescript-binder-diagnostic-details.ts` to check these fields and
source-file identity; it reexports the original two count oracles rather than
replacing them. Its standalone detail export is not yet measured.

98591 completed: compile succeeds, 88,001,121 bytes, zero imports,
const=65792, duplicate-let throws. Full `__closure_861` WAT reads the captured
union vec through `__extern_get_idx`, calls erased `checkDefined`, then sends
the result straight to external string conversion. It never enters an
expected-AnyValue coercion site. Move proven generic scalar-union recovery
to the expression's natural result boundary, before expected-type coercion,
so concatenation receives a tagged scalar too. Targeted tests are pending.
The new detail fixture returns 1 under native TypeScript (53301); standalone
detail acceptance remains unverified.

Moving recovery to the natural result initially passed 95/96 (46574) but
regressed the standalone boolean-first parser scalar control from 1042 to
42. The checker represents boolean as `true | false`; the helper must not
change that homogeneous scalar ABI. Require at least two primitive brands
(string/number/boolean), not merely `type.isUnion()`. Rerun 58114 is pending.
Typecheck/format 15159 passes before this final classifier refinement.

58114 passes **96/96**, restoring the boolean-first parser control while
preserving all diagnostic/union tests. Full diagnostic-details trace is
running at `.tmp/ts5-binder-diagnostic-details.log`: original const=65792,
duplicate-let=131330, plus diagnostic details=1 (three required invocations).
The original two acceptance values are unchanged; the third strengthens
the result with message/location/category/file-identity checks.
Live handles: full binder **88439**, typecheck/format/function/LOC/diff gates
**70054**. Poll these handles on continuation instead of restarting them.
70054 has now passed all gates; only full binder 88439 remains live.

88439 is confirmed live on continuation. Start a current-candidate parser
regression at `.tmp/ts5-parser-natural-scalar-union.log`, retaining the three
original fingerprints, to check the natural-result recovery plus primitive
brand discrimination (the preceding full parser run predates that change).

Current parser handle is **97684**. Add homogeneous boolean/string-literal/
number-literal union checks to the generic-roundtrip regression, preserving
the existing heterogeneous-brand assertions. Test 42198 is pending; binder
88439 and parser 97684 remain live.

42198 completes **1/2** after strengthening the regression. With the earlier
heterogeneous generic call present, homogeneous checks pass; without that
call (direct-read control), homogeneous checks return [21,121] instead of
[22,111]. This is an additional first-instantiation-sensitive generic result
defect, not permission to remove the new assertion. Previous 96/96 predates
these additional assertions. Full binder/parser runs are still pending.

88439 completed: valid 88,009,347 bytes, zero imports, **0/3** matches.
Two rows did not execute: re-export-only count entrypoints were absent.
Replace those fixture reexports with explicit wrappers calling the original
functions; do not reinterpret missing exports as binder behavior. The detail
row executes and now passes `formatStringFromArgs -> checkDefined ->
__any_from_extern_honest`, then traps after `__get_member_bindDiagnostics`
with an illegal cast in declareSymbol (offset 22179008). The prior formatter
TypeError is cleared in this trace, but no diagnostic-detail pass is claimed.
Next inspect the diagnostic array's element carrier. Parser 97684 is live.

Parser 97684 completes **3/3 original fingerprints**, valid 79,134,616 bytes,
zero imports, 309909 ms, including the heterogeneous natural-result repair.
Add `issue-1058-source-diagnostic-array.test.ts` (7344) for empty diagnostic
array initialization on a constructor-backed extended Source node. Start
selected WAT diagnosis for declareSymbol/createFileDiagnostic/the diagnostic
array getter at `.tmp/ts5-binder-diagnostic-array-wat.log`, invoking all three
detail-fixture exports now that the count wrappers are explicit.

Source diagnostic array reduction 7344 null-dereferences. Split matrix 49967
is **1/2**: plain-object Source passes, constructor-backed extended Source
null-dereferences. This distinguishes constructor/projection setup from an
ordinary diagnostic-array push, but does not yet attribute the full graph's
illegal cast to the same cause. Full selected-WAT build **98119** is live at
`.tmp/ts5-binder-diagnostic-array-wat.log`; no other full build is running.
Formatting/diff check 17538 is pending. Keep the homogeneous generic failure
from 42198 as a separate remaining defect.

Reduced WAT 78331 attributes its null trap earlier than array access:
`new (Node as any)(308)` drops 308, emits `ref.null Node; ref.as_non_null`,
then calls the typed-this constructor with a zero numeric argument. This is
an erased direct-new/typed-this ABI defect, not evidence that the full
binder's diagnostic-array cast has the same cause. Keep the reduced test;
inspect full WAT 98119 before changing array conversion.

98119 completed: compile succeeds, 88,009,123 bytes, zero imports. Explicit
count wrappers now execute: const=65792; duplicate-let and detail both
illegal-cast in declareSymbol at 0x1526c05. Full WAT line 57825 reads
bindDiagnostics through getter 5445, then `any.convert_extern; ref.cast_null
494` before array push. Getter's direct SourceFile arm reads field 47 of
type 395; fallback reads through __extern_get. The selected-function log
discarded type declarations, so allocation-vs-read mismatch is not yet
attributed. A new selected type/parseSourceFileWorker WAT run is logging to
`.tmp/ts5-binder-diagnostic-types-wat.log` to recover that evidence.

On continuation, handle 31023 is missing and its log contains only
`COMPILE false 0` (the diagnostic command omitted errors). This is terminal,
not a live wait. Error-reporting retry **48505** uses the same entry/options
and selected parseSourceFileWorker WAT; inspect its errors before attributing
the failed diagnostic run. The prior approval-service usage-limit rejection
prevented the last handoff edit; tool reads and a subsequent test edit now
succeed. Strengthen the constructor reduction with `source.kind === 308` so
future repairs cannot pass while dropping the constructor's assigned value.

### Retry checkpoint: stack-safe peephole traversal

Type-inspection retry 48505 terminated with `success:false`, zero bytes and
`Maximum call stack size exceeded (at src/codegen/peephole.ts:114:10)`.
Replace recursive child-first optimization with an explicit postorder stack,
preserving physical-array deduplication and cross-function local-type guards.
Add a deep-nesting regression before retrying the full diagnostic compile.
The strengthened source diagnostic-array reduction remains 1/2: plain objects
pass, constructor mode traps. No new binder acceptance gain is claimed.

Implemented the explicit postorder traversal, retaining the shared child
enumerator and per-module visited set. The 20,000-level shared-body test first
failed with the original recursive optimizer, then passed with the fix.
Current focused checks: 13/13 DAG/order/catchAll/pattern tests and 4/4
dead-load runtime controls pass. The older ref-cast suite is 1/7: six cases
fail at instantiation on missing `string_constants` imports; this retry has
not attributed those failures. Full type-inspection retry is recorded in
`.tmp/ts5-binder-stack-safe-type-probe.log` (handle 27490), with typecheck and
quality gates running separately (74401). Do not infer full compilation or
diagnostic-array repair from the focused optimizer checks.

TypeScript `tsc --noEmit` passed. The first formatting gate caught the new
test's array layout; formatting was corrected and the rerun passed formatting,
function/LOC budgets, and `git diff --check`. Parser source initializes
`bindDiagnostics = []` inside `createSourceFile`'s nested `setFields`, not
directly inside `parseSourceFileWorker`; target that function for the next
allocation trace after obtaining the actual field/vector type declarations.

Retry 27490 is now terminal: compile **success**, **88,009,123 bytes**, no
error-severity diagnostics. The same direct compile that overflowed before
now completes. This diagnostic command did not instantiate or invoke exports;
do not promote it to runtime acceptance. Its name-filtered type output exposes
JsonSourceFile.bindDiagnostics as `(ref null 494)` but omits the main SourceFile
carrier (its emitted name does not match the filter). Next trace must retain
all type declarations (bounded extraction afterwards) and nested `setFields`
WAT, avoiding another misleading name-filtered view. No processes from this
retry remain live. Binder acceptance remains the previously measured 1/2,
expanded diagnostic-detail acceptance 1/3; all 256 upstream files remain the goal.

### Diagnostic field initialization trace

The previous turn made progress (stack-safe optimizer plus successful full
compile). Current full trace 33765 retains all emitted types and selected
`setFields`/`createSourceFile`/diagnostic getter WAT via the existing dump
hooks, and invokes all three binder exports. Logs are
`.tmp/ts5-binder-field-all-types.log` and `.tmp/ts5-binder-field-all-types.txt.wat`.
Upstream nodeFactory initially writes `bindDiagnostics = undefined!`, then
parser.createSourceFile.setFields writes `[]`. Added a focused matrix for
that initialization through nested functions, including a base-Node view.
This is separate from the explicit-this constructor reduction.

The new matrix measured 2/3: plain Source and a fresh Node returned through
a local both pass; directly returning the identical Node object literal
traps in factory before field initialization. Reduced WAT proves a nominal
test against the not-yet-allocated Source carrier falls back to null. Extend
the existing fresh-wrapper factory proof to direct returned object literals,
with the same source/target assignability checks. Full trace 33765 started
before this extension; keep its candidate provenance separate. Regression
checks are running before claiming the direct-return case fixed.

Full trace 33765 terminated: success, 88,009,123 bytes, imports `[]`, const
65792; duplicate-let and details both illegal-cast. Flat type 395 is actually
JsonSourceFile, not the general SourceFile carrier. `setFields` receives Node
223, allocates vector **494** (data array 493 / DiagnosticWithLocation 442),
then extern-converts it and calls setter 4160. Thus allocation agrees with the
failing expected vector type. The getter tests JsonSourceFile 395, otherwise
calls `__extern_get` (1495). Next inspect setter/property storage and the
fallback getter's result representation, not the empty-array type choice.

The direct-return factory extension passed the initialization matrix 3/3;
combined node-array/parenthesizer/sibling controls measured 27/29, with two
standalone user-Map failures (one invalid binary, one module-init stack
underflow). Temporarily remove only this turn's nine-line extension and run
the Map controls (25147) to attribute those failures before restoring it.
Typecheck, formatting, function/LOC budgets and diff checks passed with the
extension present. No binder acceptance gain is attributed to that extension.

Map A/B 25147 reproduces the identical two standalone failures with the
extension absent. Restored the extension; additional base-node and SourceFile
controls measured 16/18 (including initialization 3/3). Both failing diamond /
LiteralLikeNode cases also reproduce without the extension (40223, 0/2), so
neither pair is caused by this change. The extension is restored in the worktree.

Next storage trace **41081** runs the current candidate with the restored
extension and includes a new `runDiagnosticArrayBeforeBind` export. Native
TypeScript 5.9.3 confirms the expected pre-bind diagnostics length is 0.
The trace retains setter/getter and `__extern_set[_strict]`/`__extern_get`
WAT, plus all types, under `.tmp/ts5-binder-field-storage*`. It executes the
new pre-bind check and all three original binder exports. Await this live
handle; do not restart on an observation timeout.

Expanded initialization matrix now passes **4/4**, including dynamic expando
storage of the typed diagnostic vector on a base Node, identity equality,
push, and write-through. This rules out the simplest generic expando roundtrip
as a reproduction. Formatting and diff checks pass. Storage trace 41081 is
still confirmed live on the last poll; its log has no result yet. No source
change beyond the restored direct-object-literal proof was made while it ran.

### Stack-safe WAT diagnostic printer

Storage trace 41081 is terminal, but failed before invocation: the selected
`__extern_get` WAT dump overflows `formatInstrIndented` in src/emit/wat.ts.
This is a second recursive traversal issue, not a failed binary acceptance
run. Replace recursive formatting with an explicit work stack, preserving
child order, repeated shared-body occurrences, and exact empty-arm formatting.
Add deep nesting and formatting controls before retrying storage inspection.

The 3,000-level WAT test first reproduced the exact formatInstrIndented
overflow. Iterative string/instruction frames now pass it, preserving repeated
shared arms (not deduplicating semantic occurrences), catchAll and empty-arm
whitespace. WAT stack/escaping/SIMD/emit-option controls pass **21/21**.
The expanded diagnostic initialization matrix also passes **5/5**, including
overwriting an undefined dynamic entry after adjacent field writes.

Full storage retry **14691** runs with the stack-safe WAT printer; output is
`.tmp/ts5-binder-storage-stack-safe.log` and matching `-types.txt[.wat]`.
It retains all four requested runtime invocations and the same selected
storage functions. Quality gates are running separately as **64375**. Both
handles are live at launch; do not treat an empty log as a terminal result.

64375 completed successfully: typecheck, formatting, function and LOC budgets,
and diff checks all pass. Storage trace 14691 remains confirmed live; no new
runtime result has been reported yet.

14691 is now terminal: iterative traversal clears the stack overflow, but
the selected giant helper hits `RangeError: Invalid string length` at the
final chunks.join in formatInstrIndented. Cap cosmetic indentation at 64
levels to avoid quadratic whitespace growth; ordinary-depth output is
unchanged and no instruction is removed. Add output-size/indentation bounds
to the 3,000-level regression before retrying the same storage trace.

Bounded-indentation printer checks pass **21/21**, and formatting/function/LOC
budgets/diff checks pass (82609). The previous typecheck passed before this
Math.min-only printer adjustment. Full retry **16992** uses
`.tmp/ts5-binder-storage-bounded.log` and matching `-types.txt[.wat]`, with the
same four runtime exports and selected helpers; it remains live on the latest
30-second wait. This retry is diagnostic infrastructure progress, not a new
binder acceptance claim.

16992 completed: compile success **88,009,782 bytes**, zero imports;
pre-bind length=0 and const=65792, duplicate-let/details still illegal-cast in
declareSymbol (5279, 0x1526e79): **2/4 expanded diagnostic checks**. Bounded
WAT succeeded and retained the full storage helpers. Important caveat: the
pre-bind length WAT tests vector 494 but falls back to generic __extern_length
when that brand fails. Thus length=0 proves a readable length, not the exact
push-compatible vector representation. Do NOT conclude binding corrupted a
previously proven exact vector. Add a pre-bind push export (native expected 1)
to distinguish this representation hypothesis from captured-file corruption.

Pre-bind push run **86230** is live; output `.tmp/ts5-binder-prebind-push.log`.
Prepared `.tmp/ts5-binder-inspect.mts` for subsequent runs: it retains a
diagnostic-only binary and prints the exact trap bytes/offset along with all
five expected values. Existing source maps are too coarse to attribute the
trap to one particular cast (the old mapping is >100 KB before the trap).
Do not promote the nearest WAT cast as proven without matching binary bytes.
The retained-artifact runner has not yet been executed; wait for 86230 first.

86230 completed: compile success **88,010,437 bytes**, zero imports,
pre-bind length=0, pre-bind push=1, const=65792; duplicate-let/details both
illegal-cast in declareSymbol (5280, 0x15270e5). Expanded checks **3/5**,
original binder acceptance still **1/2**. Native 5.9.3 confirms push length=1
and diagnostic.file identity. This rules out a generally unpushable freshly
parsed diagnostics array, but not capture/projection effects inside binding.
Launch the retained-binary runner next to identify the actual cast instruction
at the trap offset, rather than inferring it from the coarse source map.

Retained-binary runner is live as **1046**, logging
`.tmp/ts5-binder-retained.log`; on compile success it writes the diagnostic-only
`.tmp/ts5-binder-retained.wasm`. Added a binder-shaped file-cell regression
covering direct/nested generic forEach callbacks, diagnostic creation, two
source files in succession, and exact diagnostic file identity. This tests
the simple capture hypothesis while the authoritative binary is compiling.

1046 completed, preserving `.tmp/ts5-binder-retained.wasm`: 88,010,437 bytes,
zero imports, **3/5** exact checks. Trap bytes at 22180069 are
`fb 17 85 04` = `ref.cast_null 517`, NOT 494. Existing matching WAT shows
`local.get 52; ref.cast_null 517; call 638`, where local 52 is
`relatedInformation: (ref null 494)`. This is the rest-spread argument to
`addRelatedInfo`, after successfully obtaining bindDiagnostics for push.
Correct the earlier attribution: the diagnostic-array getter was not proven
to be failing. The binder-shaped capture matrix passes **2/2**.

`compileSpreadCallArgs`' rest arm compiles a trailing spread with no expected
type, then passes its vector directly. The callee's different invariant Wasm
vector type is patched by a nominal cast and traps. Add empty/non-empty
derived-diagnostic-vector regressions, then apply the callee's expected rest
type through the existing coercion path instead of relying on stack repair.

The reduction exposed two layers. Applying a rest-type hint alone leaves its
binary unchanged: resolved generic declarations skipped funcRestParams
registration, so the caller treated the spread as positional arguments and
passed element zero as the rest vector. Added `resolved-rest-parameter.ts`
to recover metadata from the exact resolved vector ABI at both top-level
registration sites, plus the callee-type hint in the rest spread emitter.
The non-empty diagnostic vector now passes; the empty case no longer traps
and passes returned identity/code/start checks, but returns -3 at its strict
optional-field undefined assertion (**1/2**, not green). Formatter controls
remain **4/4**. The old spread-rest suite fails **13/13** at missing
string_constants host imports and cannot validate these changes in this harness.

Full retained-binary retry is logging `.tmp/ts5-binder-rest-fixed.log`, preserving
its candidate as `.tmp/ts5-binder-rest-fixed.wasm` separately from the prior
binary. Verify all five runtime rows before attributing a binder improvement.

Full run handle is **85103**, still live. Gates **51566** completed: typecheck,
function/LOC budgets and diff checks pass; formatting also passed separately.
Numeric resolved-generic rest controls pass **2/2** (spread and ordinary args).
An absent optional diagnostic-vector control with NO rest call returns 0
instead of expected 1 (**0/1**), independently reproducing the empty row's
strict-undefined issue. Current rest diagnostic file is therefore **3/5**
across the measured rows, with the two optional-field assertions unresolved.
## Parser on current main: compile time and runtime crashes (2026-09-23)

Measured on the pinned TypeScript 5.9.3 checkout with
`dogfood:typescript-parser-source` (JS host, consumer-driven barrels).

**Compile time.** Main took about **28 min** and emitted a **70 MB** module.
Two changes bring that to **~2.4 min** (143,046 ms wall, 1,650 MiB peak RSS) and
**7.64 MB**:

- *Deferred throw-message strings.* Every positioned `TypeError` message minted
  during the body phase used to register its own string import and shift every
  module global mid-body. They are now placeholders registered in one batch and
  patched in `fixupModuleGlobalIndices`.
- *Outlined dynamic-call ladders.* A dynamic call site with 16 or more candidate
  closure types used to inline the whole `ref.test` ladder. It now calls one
  shared `__dyn_call_N` helper per distinct candidate plan.

**Barrel regression from PR #5963.** Four `issue-1058-barrel-*` tests failed on
main. The #6491 under-applied-call widening padded formals whose type cannot
hold `undefined`. `closurePadSafe` now gates it (externref, nullable ref, f64,
i32 only).

**Runtime crashes, both in the identifier-callee closure ladder
(`call-identifier.ts`).** The parser calls NodeFactory functions through
destructured bindings (`const { createNodeArray: factoryCreateNodeArray } =
factory`), so every call dispatches on the runtime funcref type.

1. `factoryCreateNodeArray(elements)` trapped with `illegal cast`. The generic
   formal is erased to externref, and the candidate arm cast it straight to its
   own vec type while the caller held a vec with a different element
   representation. The arm now uses the reserved `__vec_from_extern_<vec>`
   materializer.
2. `factoryCreateVariableDeclaration(...)` and
   `factoryCreateVariableDeclarationList(...)` ended in the ladder's TypeError
   terminal. The `NodeFactory` interface declares `x?: T`, which the call site
   widens to externref. The implementation declares `x: T | undefined` (a
   nullable ref) or `x = default` (a number), so no candidate had its funcref
   type. The site now adds that one restored signature and hands the slot over
   as null or the default sentinel when it is `undefined`, else a cast or unbox.

**Result:** all three parser fingerprints (`builderStatePublic.ts`,
`corePublic.ts`, `performanceCore.ts`) match exactly. Before, all three
crashed. Regression tests: `issue-1058-erased-vec-closure-arg`,
`issue-1058-optional-slot-closure-arg`, `issue-1058-deferred-throw-strings`,
`issue-1058-outlined-dynamic-call`.

**Known separate gap.** A `T | undefined` struct field holding an absent value
reads back as `null`, so `d.init === undefined` is false even on a direct call.
Truthiness checks are unaffected. This does not block the parser fingerprints.

**Next:** rerun the binder probe (const-local = 65,792; duplicate-let =
131,330).

## Binder oracles pass (2026-09-23)

`dogfood:typescript-binder-source` now matches both oracles:
const-local = **65,792** and duplicate-let = **131,330**. The run took about
**155 s** and produced an **8.26 MB** module; peak RSS was **2,280 MiB**.

Before this change, the binder bound no symbols and reported no
redeclarations. There were six causes:

1. **`undefined`-holding typed variables.** A `let x: T` that has no
   initializer, or is reset with `x = undefined!`, stores `undefined` as a
   null ref. `x === undefined` used to fold to `false`, so the binder ran
   `for (const d of jsDocImports)` over null.
   - Fix: `undefined-holding-variable.ts` keeps both strict comparisons as a
     runtime null test.
2. **Enum-typed table keys.** `forEachChildTable[node.kind]` has a key typed
   as a numeric enum union. It skipped the static numeric-key switch and
   missed every entry.
   - Fix: the switch now accepts number-like unions.
   - A missing key now reads as `undefined`, where it was `null`. This fixes
     `fn === undefined` for plain number keys too.
3. **Same-name functions across modules.** Module-level function expressions
   in parser.ts's table called visitorPublic's exported `visitNodes` instead
   of the private one, both by call and by call-site inlining.
   - Fix: `declaration-bound-callee.ts` binds the checker-resolved
     declaration's own slot for the call and withholds the name-keyed inline
     entry.
4. **`Map.get` returned the host view of a stored struct.** A typed read of
   that view turned it into null, so `symbolTable.get(name)` never found a
   symbol.
   - Fix: the keyed-collection shim in runtime.ts unwraps results.
5. **Generic rest parameters.** A generic function's call-site-resolved
   signature never registered its rest parameter, so
   `addRelatedInfo(diag, ...relatedInformation)` expanded the array
   positionally.
   - Fix: `resolved-rest-param.ts` registers it.
6. **Vec type mismatch at the rest slot.** A spread passed into a rest slot
   is now projected onto the rest vec type when its element type differs. It
   used to hit a bare `ref.cast` between unrelated vec types.

Regression tests: `issue-1058-binder-symbol-table` (5 cases),
`issue-1058-null-ref-undefined-box`, and
`issue-1058-unmatched-closure-host-call`.

**Known separate gap.** Inside a generic `f<T extends D>(d: T)`, a write such
as `d.list = []` followed by `d.list.push(...)` does not reach the struct
field when the caller reads it afterwards. This does not affect the binder
oracles, because the duplicate path's related-information list is empty.

**Next:** extend the binder workload beyond the two fixtures, then move on to
the checker.

## Checker slice: first measurements (2026-09-23)

New oracle `dogfood:typescript-checker-source`
(`tests/dogfood/fixtures/typescript-checker-workload.ts`). It builds a minimal
`TypeCheckerHost` with `noLib: true` and packs `diagnostics.length * 65536 +
firstCode`. Native TypeScript (tsx) gives:

| Fixture | Source | Expected |
| --- | --- | --- |
| `assign-mismatch.ts` | `const x: number = "str";` | 67,858 (one TS2322) |
| `assign-ok.ts` | `const x: number = 1;` | 0 |
| `two-mismatches.ts` | `const a: string = 1; const b: boolean = "s";` | 133,394 (two, first TS2322) |

The graph is 43 source files and 357 module-init statements.

**First run (main):** 1,231 s and 5,040 MiB peak RSS, with two compile errors:

1. `createTypeChecker`: nested `resolveImportSymbolType` "changed its full
   physical ABI after reservation". Its `links: NodeLinks` parameter was
   reserved as the `NodeLinks` struct and compiled as externref.
   - Cause: `interface NodeLinks` (types.ts) shares its name with checker.ts's
     `function NodeLinks`, which is constructed by `new (NodeLinks as any)()`.
     `resolveWasmType` treats a type named like a fnctor as a fnctor instance,
     but it read the name from `funcConstructorMap`. That map only learns a
     name when codegen reaches the `new` site, so the answer flipped mid-compile.
   - Fix: `fnctor-instance-names.ts` also consults the escape gate's
     up-front `new`-site names. `resolveStructName` declines the interface
     struct for such a name, so member access goes dynamic, the way the value
     is typed. Regression test: `issue-1058-checker-shapes`.
2. A stack-balance error in `SyntacticTypeNodeBuilderResolver_shouldRemoveDeclaration`
   referencing local 412 of 403. It appears to follow from error 1: an
   inlined 382-parameter nested function whose body was left half-compiled.
   Rerun needed to confirm.

**Second run (with the fix):** the compile passed the old error but was still
inside checker.ts bodies at the 3,600 s limit, with an 8,193 MiB peak. The
first run was fast only because error 1 aborted `createTypeChecker` early.

**Cost driver: captures passed as parameters.** Every nested function in
`createTypeChecker` is lifted with each captured outer variable as its own
parameter (`resolveImportSymbolType` has 381 capture parameters plus 4 of its
own). Every sibling call passes all of them again. A synthetic probe
(`k` outer locals, `n` nested functions each touching four locals and calling
the next):

| k × n | compile | module |
| --- | --- | --- |
| 50 × 50 | 1.4 s | 90 KB |
| 100 × 100 | 2.5 s | 355 KB |
| 200 × 200 | 12.7 s | 1.44 MB |
| 400 × 400 | 64.5 s | 5.37 MB (923 MiB RSS) |

Size grows with k × n. `createTypeChecker` is roughly 380 × 2,000, with many
call sites per function. 200 × 200 also overflows the default Node stack
during compile.

**Next:** lift large capture sets through one shared environment struct (one
parameter per nested function, field reads and writes in place of per-call
capture lists), gated on capture count so small closures keep today's ABI.

**Profile first (2026-09-24).** A CPU profile of the 200 × 200 case showed the
time was not in emitted code but in three analyses that rescanned the whole
enclosing body for every nested function or capture:

- `analyzeTdzAccessByPos` called `getSymbolsInScope` (copies every symbol in
  scope) per capture per call site; now `resolveName` (one scope-chain walk).
  `closureProvablyAfterLetDecl` had the same shape.
- `findScopedVariableDeclaration` walked the enclosing scope per capture; now
  one cached name → declaration map per scope (`scopeVariableDeclarations`).
- `collectOwnerBindingsWrittenAfterDeclaration` rescanned every later statement
  per nested function; now each later statement's writes are computed once.

| k × n | before | after |
| --- | --- | --- |
| 200 × 200 | 12.7 s | 3.9 s |
| 400 × 400 | 64.5 s | 13.2 s |

Output is byte-identical (same module sizes). The full checker still runs out
of its 8 GB heap after 56 minutes in `checker.ts` bodies, so the remaining cost
is elsewhere; the next profile targets the real compile.

**Real checker compile profile (2026-09-24, 15–20 min samples).** Half of the
time went to `shiftGlobalIndices`: each new string-constant import renumbers
every module global in every compiled body. The hot producers were the
`x is not defined` TDZ messages (one per captured name) and property names
(`finalizeStructAndDynamicMemberGet`, the member get/set dispatch
reservations, exact-shape field gets). Those now join the end-of-bodies batch
the throw messages already used (`registerLateReadStringConstant`;
`stringConstantExternrefInstrs` reads a pending value through the batch
placeholder). The next two hotspots were quadratic lookups:
`ProgramAbiSourceCallableRegistry.unitForFunction` scanned every source unit
per function-value read (now memoized, invalidated per observed function), and
`emitEagerNestedCallCaptureBoxes` searched every referenced callee's capture
list per capture (now one map per call).

With those fixes the compile gets much further per minute: it reached about
12.5 GB RSS within 20 minutes (the old run reached 8 GB after 56) and was
OOM-killed there. Memory is now the limit. The measured cause was not the
capture ABI; see the next section.

## Checker compile: memory (2026-09-24)

After the compile-speed fixes (#6061, #6066) the full checker compile ran out of
memory instead of time: it reached about 12.5 GB RSS within 20 minutes and was
killed. A heap sample at 6 GB put about 4 GB under
`emitMemoizedNestedFnClosure` / `materializeHoistedFunctionValueBinding`
(`src/codegen/closures/funcref-as-closure.ts`).

Cause: filling the value of an inner function that captures other inner
functions filled each captured function inside its own closure-build branch,
and each of those did the same for its captures. One use site emitted a copy
per dependency path. A 12-function chain produced a 112 KB module; 16 functions
ran out of memory.

Fix: the captured values are filled before the build branch, straight-line
with the use site, and a value already published earlier in the same body
array is not published again. The checker compile then finishes in about 23
minutes at about 6 GB peak RSS. Regression test:
`tests/issue-1058-hoisted-fn-value-chain.test.ts`.

Next blocker, reached for the first time: `nested function checkArrayLiteral
changed capture noIterationTypes's physical ABI after reservation`. At phase-0
reservation the capture was a plain externref; when `checkArrayLiteral` is
compiled the declaring frame has a box registered for `noIterationTypes` while
its `localMap` slot is still the raw externref local.

### Next two checker errors (2026-09-24)

`noIterationTypes` ABI change: an earlier sibling's mutable capture had already
boxed the outer binding, so its `localMap` slot held the capture cell. The
#5148 literal-promotion step in `compileNestedFunctionDeclarationInScope` read
that ref-typed slot as a stale literal type and rewrote it, so the later
sibling's reserved capture plan no longer matched. The step now skips a slot
whose type is the binding's own capture cell.

Recursive struct narrowing: passing a struct where a narrower struct type is
expected copies the shared fields. When a field holds the struct's own type
(the checker's `MappedType.target`), that copy inlined the same conversion
into itself until the compiler's stack overflowed. A repeated
`from>to` pair now calls an outlined `__struct_narrow_<from>_<to>` helper,
which recurses at runtime. Test:
`tests/issue-1058-recursive-struct-narrowing.test.ts`.

Next blocker: `stack-balance invariant (entry):
'SyntacticTypeNodeBuilderResolver_shouldRemoveDeclaration' references local
284, but only 3 params + 18 locals are declared` (an object-literal method
inside `createNodeBuilder`, checker.ts line 6238).

### Handoff (2026-09-24)

State: parser, binder and checker-slice oracles pass. The full checker
(`createTypeChecker`) compile runs about 23 minutes at about 6 GB peak RSS and
now stops at the `shouldRemoveDeclaration` error above. The checker oracles
(`pnpm run dogfood:typescript-checker-source`: `assign-mismatch=67858`,
`assign-ok=0`, `two-mismatches=133394`) have not run yet; printer/emitter and
self-hosting come after.

Next step: find which instruction in that method's body references local 284.
The error message embeds the whole body as JSON. Local 284 is far past the
method's 21 slots, so it is most likely an index from an enclosing frame
(`createNodeBuilder` or `createTypeChecker`) emitted into the method. Suspects
are the captured-function value for `checkComputedPropertyName` and the
`__tdz_box_checker` local the method declares. A small repro (an interface-typed
object literal inside a nested builder whose method calls a capturing outer
helper, with `context as X` casts) compiles and runs correctly, so the trigger
needs something more from the real file.

Driver used for the full compile (keep it under `.tmp/`, not committed):

```ts
import { writeFileSync } from "node:fs";
import { compileProject } from "../src/index.ts";
const r: any = await compileProject("tests/dogfood/fixtures/typescript-checker-workload.ts", {
  allowJs: true, skipSemanticDiagnostics: true, target: "gc", platform: "node", emitWat: false,
  resolve: { consumerDrivenBarrels: true },
} as any);
const errs = (r.errors ?? []).filter((e: any) => e.severity !== "warning");
writeFileSync(".tmp/checker-errors.json", JSON.stringify(errs, null, 1));
if (r.binary?.length) writeFileSync(".tmp/checker.wasm", r.binary);
```

Run it with `node --max-old-space-size=11000 --stack-size=8000 --import tsx`.
Profile the same run with `--inspect-brk` and a CDP client (CPU profile or
heap sampling). Keep the shell's working directory outside the nested
TypeScript checkout under `tests/dogfood/.npm-upstream-suites/typescript`,
because the repo's hooks break when run from there.

Known and not addressed: two `tests/issue-2976.test.ts` cases fail on main
(the V8 capability protocol case and the reassigned-capture case) and are
unchanged by this work.

## Acceptance criteria

- [ ] `scripts/ts-compiler-stress.ts` exists and runs against a local `typescript` install
- [ ] Tier 2 (leaf modules: `core.ts`, `path.ts`) compiles cleanly
- [x] Tier 3 scanner+parser graph compiles, validates, and executes all three
      pinned real-source workloads in the GC/Node compatibility lane
- [x] Tier 3 scanner+parser graph compiles and validates as standalone Wasm,
      has zero imports, and executes equivalent tracked zero-argument oracles
- [x] Consumer-driven source resolution narrows the parser graph with default
      resolution unchanged and focused static/dynamic-demand tests
- [ ] Binder slice compiles, validates, preserves the three accepted parser
      fingerprints, and matches both committed native/Wasm binder oracles in
      both GC/Node and standalone lanes
- [ ] The pinned TypeScript 5.9.3 upstream unit adapter runs all 256 files with
      no deferred registrations in standalone mode
- [ ] ≥ 5 follow-up issues filed for concrete gap patterns
- [x] Results document the real-package compile rate, not hand-written toy subset (supersedes #452's scope)
- [x] **Stretch 1 (Tier 3):** compiled scanner+parser produces native-equivalent AST fingerprints for all three pinned real `.ts` files
- [ ] **Stretch 2 (Tier 4):** compiled checker subset reports TS2322 for `const x: number = "str"`
- [ ] **Moonshot (Tier 7):** js2wasm-compiled tsc can compile js2wasm's own source, and the second-stage output passes test262 at the same rate

## Non-goals

- Compiling the language service (`typescript/lib/tsserver.js`) — out of scope
- Performance parity with native tsc — correctness first
- Incremental compilation state across runs — the real tsc caches; we don't need that for single-shot
- Type-checker edge cases even native TypeScript struggles with (infinite conditional types, deeply nested `infer`)

## Design notes

**Why this is harder than prettier (#1034).**

Prettier is a pure source-to-source transformer whose acceptance test is "compiled output == native output byte-for-byte" — a mechanical diff. TypeScript is a type checker whose acceptance test is "compiled checker arrives at the same type assignments as native checker" — a semantic test over a graph of Type nodes, not a string diff. Much harder to verify, much more informative when it passes.

**Why this is easier than it looks.**

TypeScript compiles itself every day at Microsoft. The code is battle-tested. If a pattern works in real tsc, it's a pattern we *should* handle. Every failure in our compile is a concrete bug in js2wasm, not ambiguous tooling interaction. Unambiguous feedback: either we handle TypeScript's idioms or we don't.

**Self-hosting is the ultimate integration test.**

Every compiler gap today hides behind test262 or equivalence abstractions. Self-hosting breaks that — if we can't compile our own frontend, we know *exactly* which path is broken because tsc compiled that path a million times before. Strongest correctness signal available.

**Relationship to #452.**

#452 proved feasibility at the *pattern* level — 19/20 TypeScript idioms compile. This issue is the implementation at the *codebase* level — real modules, real call graphs, real type definitions. Complementary: #452 said "the puzzle pieces fit," this issue says "now build the puzzle."

**Why backlog-level dependency on #1046.**

TypeScript's source is split across ~300 ES modules with an intricate import graph. Current `compile(src, options)` assumes whole-program input. #1046 (separate ES-module compilation) is the architectural enabler that lets each file compile against declared imports without inlining the entire graph. Until #1046 is at least partially landed, Tier 2+ is blocked on "can we even load the second file."

## Related

Fifth in the real-world stress-test set:
- **#1031 lodash** — pure compute (generic algorithms)
- **#1032 axios** — I/O, Node host imports
- **#1033 react** — closures, hooks, DOM host imports
- **#1034 prettier** — parsers, recursive AST, string-heavy, self-format diff
- **#1058 TypeScript (this)** — self-hosting, type checking, everything at once

**Supersedes the scope of #452** (pattern-level feasibility study, #452 stays in done/ as historical validation).
**Depends on** #1042 (async/await), #1044 (Node builtins as host imports), #1046 (separate ES-module compilation).
**Soft dependencies:** template literal interpolation, large-switch codegen, recursive type inference.
**Unlocks:** ultimate self-hosting milestone, concrete stewardship-pitch deliverable ("js2wasm compiles tsc").

## Upstream synchronization checkpoint (2026-09-27)

Before merging upstream `359c2d63b6753e0c540b8761d13647b00e24a9a4`, preserve
the unfinished namespace-enum work: checker-backed enum demand feeds the shared
IR enum plan, namespace exports use live enum getters, and inferred `typeof Enum`
returns retain the runtime object rather than copying a closed member shape.
This is a WIP checkpoint, not acceptance: focused enum controls pass **28/29**;
the opaque namespace initialization/identity test still throws with IR disabled.
The original TypeScript semver suite remains **684/692** in standalone mode
(native **692/692**, valid Wasm, zero imports, 7,063,962 bytes, 143,028 ms).
The same eight namespace static-class cases fail. Logs are worktree-local
`.tmp/namespace-enum-carrier-controls.log` and `.tmp/semver-namespace-enum-o1.log`.
Recheck after the merge; do not revive the rejected eager class-object shortcut
or describe the older parser measurement as validation of this checkpoint.

The requested merge completed as signed commit `b916ca3d76`; upstream
`359c2d63b6753e0c540b8761d13647b00e24a9a4` is a verified ancestor. The merge
changed benchmark artifacts only, with no compiler conflicts. Work was preserved
in signed checkpoint `6a17ea2736`, without manual stashing.

Post-merge continuation isolates the remaining opaque-enum failure to **module
initialization with IR disabled when the provider also exports a function**.
The durable test now varies that export independently of IR, keeps all six value
assertions, and executes deferred initialization explicitly so failures identify
the phase. Both IR-enabled variants pass; IR-disabled passes without the function
export and fails with it. A separate scratch probe catches and decodes the error:
`Cannot access property on null or undefined` inside the opaque namespace reader.
Changing duplicate reader names does not change the outcome. Inspect availability
of declaration-owned callable registry entries during namespace materialization
at module initialization next; this is a hypothesis, not a proven fix. Do not
replace declaration identity with a bare function-name lookup.

The post-merge focused enum/factory/order suite is **24/25**; type checking and
lint pass. Evidence: `.tmp/namespace-enum-postmerge-final.log`,
`.tmp/namespace-enum-postmerge-final-typecheck.log`, and
`.tmp/namespace-enum-init-function-probe.log`. No fresh full parser or semver run
was performed after the merge. Full checker/self-hosting and strict IR closure
remain open.

## Semver namespace surface and durable runner (2026-09-27)

Final semver on `4a649e05e5` still passes **684/692**, native **692/692**,
valid standalone Wasm with zero imports, 7,063,962 bytes and 137,155 ms.
All eight failures remain the same null namespace receiver at the original
`VersionRange.tryParse` call (`.tmp/semver-esm-final-o1.log`). The ESM identity
fix is real, but did not resolve this separate surface problem.

`tests/issue-1058-namespace-class-surface.test.ts` preserves a ten-case reduction:
an exported class alone, beside an enum, or beside an ordinary object works in
both IR modes; adding an exported runtime TypeScript namespace containing either
a function or a variable fails in both modes (**6/10**). The failing calls never
use that extra namespace. `moduleSymbolNamespaceExports` declines the complete
ESM object when the extra export is a `ModuleDeclaration`. This isolates the
surface dependency without reviving the rejected eager class shortcut.

Next implementation must preserve runtime namespace source-order initialization,
class binding identity, and subsequent property writes. Use shared IR identity
and declaration-owned bindings; do not bypass receiver evaluation or eagerly
initialize a class on an early read. The existing namespace early-read/static
replacement controls remain required negative controls.

The checked-in source-unit runner now includes original semver with the measured
**692** callback floor. It redirects only the original compiler and Utils imports,
retains theory expansion and assertions, provides the same assertion/test globals
as the measured scratch harness, and uses the existing zero-import/result gate.
Unlike the scratch runner's unconditional exit 1, its exit code is derived from
all original native and Wasm callbacks actually passing. No passing claim is made.
The durable semver run and a fresh full incremental-parser run were started as
`.tmp/semver-durable-final-o1.log` and `.tmp/incremental-esm-identity-final-o1.log`;
their results must be checked before claiming acceptance of the new harness or
reusing the old parser measurement. Runner controls pass **16/16**, the surface
regression remains **6/10** (four genuine failures, no skips), and type checking
passes. Combined test evidence is `.tmp/semver-durable-and-surface.log`.

## Stewardship angle

### Shared IR namespace execution planning (2026-09-27)

The next prerequisite for real namespace objects is now shared rather than a
second legacy scanner. `src/ir/runtime-namespace-plan.ts` owns the exact lexical
groups used by declaration collection, callable emission, and initialization
collection. Plans retain declaration identity, outer-to-inner dotted paths,
parent groups, separate merged execution sites, last function implementations,
and source-ordered runtime statements. Function declarations, enums, and runtime
aliases stay represented at their original positions; overload signatures and
type-only/ambient declarations do not create execution steps. Plans are frozen
and choose no global slots, function handles, or physical object layout.

The existing physical lowering consumes this plan and retains its current enum
and alias limitations explicitly. This is preparatory integration, **not** a
namespace-object fix or a claim of additional upstream callbacks passing.
Namespace object creation and publication of exported members must next be tied
to these exact execution sites, with object-backed mutable reads/writes and
class early-read behavior preserved. Avoid getters that merely disguise stale
snapshots as live mutable properties, and do not snapshot the whole namespace
before its body runs.

The durable original semver runner completed with the same **684/692** standalone
and **692/692** native result, pin `c63de15a992d37f0d6cec03ac7631872838602cb`,
zero imports, valid Wasm, 7,063,951 bytes, 162,039 ms. Its nonzero exit status is
now the actual failed-callback verdict, not the scratch runner's forced status.
Evidence: `.tmp/semver-durable-final-o1.log`. The long incremental-parser run
started before this planning extraction and is not evidence for the extraction.
It has now completed: native **153/153**, standalone **153/153**, valid zero-import
Wasm, 23,762,521 bytes, 569,299 ms at O1, same pinned TypeScript commit.
Evidence: `.tmp/incremental-esm-identity-final-o1.log`; tested source includes the
ESM/enum work through `4a649e05e5`, before the namespace planning extraction.

Extraction verification: **9/9** direct plan tests. Same standalone Vitest
controls with current `declarations.ts` versus only that file from `7ccbcae959`
produce **79/91** on both sides, with all twelve failure labels identical
(eight existing namespace static-class cases and four unrelated-namespace export
cases). Logs: `.tmp/runtime-namespace-ir-plan-baseline.log` and
`.tmp/runtime-namespace-ir-plan-final.log`. Type checking and lint pass.
Moved-code audit is preservation-only **6/6** full-source and **6/6** cut
witnesses; the production graph remains **OPEN**, strict closure **FAIL**,
and deletion is not certified. No new size allowances were added.

### Qualified static-method mutation continuation (2026-09-28)

**Original-unit coverage continuation:** added the pinned
`debugDeprecation.ts` file to the durable runner with a required denominator
of **6**. Only its compiler namespace and deprecated-compat import paths are
redirected; all hooks, callbacks, warnings and throw assertions are retained.
This exercises the mutable `Debug.loggingHost` namespace surface and wrapped
calls instead of treating parser success as checker/runtime completeness.
Runner preservation and missing-import rejection tests accompany the entry.
Initial original-source run **37053** is terminal: valid zero-import Wasm,
7,409,813 bytes, 176,976 ms, but **0/6** callbacks pass. All reported failures
are property-on-null errors at the `afterEach` logging-host restoration
(old generated line 836); teardown failures may mask body failures, so do not
infer which bodies ran successfully. Native was **4/6**, with two failures
solely because the shared matcher lacked Chai's `expect(fn).throws()` spelling.
Evidence: `.tmp/debug-deprecation-method-environment-o1.log`.

Added the throws spelling using the existing checked throw matcher, leaving
the upstream assertion text unchanged. Native matcher controls reject missing
throws, non-callables, wrong constructors and wrong messages. A standalone
zero-import positive/negative control also passes; it uses the same
`skipSemanticDiagnostics` option as the official untyped harness worker.
Runner/verdict tests pass **37/37**, matcher-specific native test **1/1**
(23 unrelated tests unselected). Evidence: `.tmp/deprecation-runner-final-v2-tests.log`,
`.tmp/deprecation-throws-matcher.log`. Fresh native execution of all original
callbacks is **6/6**, `.tmp/debug-deprecation-native.log`.
Full original retry with the matcher fix **39113** is terminal, exit **1**:
native **6/6**, standalone **0/6**, valid zero-import Wasm, **7,410,486 bytes**,
**184,001 ms**. All six errors still point to logging-host restoration (now
generated line 837). Evidence: `.tmp/debug-deprecation-throws-o1.log`.

Reduced mutable namespace state matrix `.tmp/debug-namespace-state.test.ts`
fails **8/8** with thrown Wasm exceptions: direct/barrel import, direct logging
callback/namespace function call, both IR settings. Each compiles to valid
zero-import Wasm but fails instead of returning **37**. This is separate from
the newly fixed object-method capture ownership: imported `Debug.loggingHost`
still needs a real, mutable runtime namespace object. Reuse the existing
`runtimeModuleDeclarationGroups` source-order plan for allocation/publication;
do not patch the original tests or substitute direct global writes that hide
namespace identity. Evidence: `.tmp/debug-namespace-state.log`.

Parser recheck on `702c2ef3a9`, **84911**, is terminal, exit **0**: native
**153/153**, standalone **153/153**, valid zero-import Wasm,
**23,926,822 bytes**, **651,597 ms**, O1 at the same pinned TS commit.
Evidence: `.tmp/incremental-method-environment-o1.log`. Full checker **63849**
was repolled live, compiling `checker.ts`; do not restart it for quiet output.

#### Runtime namespace implementation boundary

Latest sync (2026-09-28): merged authoritative `loopdive/js2` main
`fb006fe124` without conflicts; incoming changes only refresh six npm-compat
report artifacts. The full checker run on `702c2ef3a9` has now finished:
1,564,797 ms wall time, 4,465.3 MiB peak RSS, 68,532,301 binary bytes.
Compilation reports success, but Wasm validation fails in
`__fnctor_NodeLinks_new`: fallthrough expects a nullable reference and receives
`f64`. All **3/3 invocation cases are blocked at instantiation**, not executed;
this is not checker acceptance. Evidence:
`.tmp/checker-method-environment-full.log`.

Continuation is isolating this new constructor boundary alongside the open
namespace work below. A minimal same-named interface/function constructor gives
**2/4** standalone passes: unannotated `this` passes in both IR settings;
explicit `this: NodeLinks` validates but traps on the property read in both.
This reduced failure is not yet proven to explain the full checker's validation
error. Evidence: `.tmp/checker-node-links-v1.log`. No test assertions have been
weakened and the full checker is not being restarted unchanged.

The constructor argument-slot defect is now fixed: shared IR source helper
`runtimeFunctionParameters` removes the erased receiver annotation while
retaining exact declaration nodes. Synthesized function constructors use that
same list for physical parameter types and body bindings, so hidden constructor
identity, actual arguments and the allocated receiver no longer shift by one.
This does not widen IR-body admission or mutate a shared context registry.

Fresh standalone Vitest A/B against post-merge `453de050af`, replacing only
`new-super.ts` in the baseline: **7/13 → 13/13**, six fixes, zero regressions.
The matrix covers zero/one runtime formal, extra actual arguments, `arguments`
length/indexing, annotated/unannotated receiver and both IR settings, with
native numeric controls. Two adjacent constructor files contribute **3/3**,
giving **16/16** candidate checks. Logs:
`.tmp/checker-node-links-production-baseline.log` and
`.tmp/checker-node-links-production.log`. Type checking and targeted lint pass.
The full checker's previous validation error is still not claimed fixed until
a fresh complete build validates and all three cases execute correctly.

The same eight reduced cases pass **8/8** when only the namespace provider is
first lowered by TypeScript's standard ES2022/ESNext emitter; original
namespace syntax fails **0/8**. The combined diagnostic is **8/16**, log
`.tmp/debug-namespace-state-lowered.log`. This is an attribution control, NOT
a replacement runner or credit for original TypeScript compilation. It proves
the existing plain-object/closure backend can express the required behavior;
namespace source lowering, rather than a new object runtime, is the next seam.

Measured emitted semantics that the shared IR namespace plan must preserve:

- Empty/type-only namespaces emit no runtime object. A namespace containing
  an uninitialized exported variable does allocate its object but does NOT
  publish an own property for that variable yet.
- `export let a=1,b=a+1` publishes each property in declarator order; the second
  initializer reads the object's current `a`, not a separate flattened cell.
- An exported function retains its local declaration binding and is published
  to the object at its source statement. Exported class publication follows
  class evaluation. Do not blindly rewrite all exported declaration kinds as
  property-backed variable bindings.
- The object is reused by merged declarations, with ordinary writable data
  properties. Live accessor descriptors over the current global cells would
  change reflection semantics and are not the production fix.

Implementation sites: extend `runtimeModuleDeclarationGroups` with explicit
allocation/publication actions and exact exported-variable ownership. Feed
those actions into `orderedModuleInitEntries` / `compileOrderedModuleInitEntry`
instead of flattening namespace initializers alone. Source-identity reads in
`property-access.ts::tryEmitRuntimeNamespaceVariableValue` currently bypass
the object through `programAbiGlobals`; identifier storage and write-target
resolution also project those cells (`identifier-module-storage.ts`,
`module-binding-projection.ts`, `assignment.ts`). All exported-variable reads
and writes must agree on the object property, including destructuring and
updates, while non-exported locals and function/class lexical bindings retain
their storage. The finite function projection in `module-namespace-value.ts`
is not a general namespace object and must not create a second identity for
the same namespace. This turn changes no compiler source in that subsystem.

**Per-object method environments, production candidate:** the shared
IR helper `objectMethodEnvironmentOwner` now identifies the exact executable
function owning an object-literal allocation. Structured methods owned by an
activation use the existing closure compiler, retaining their field layout,
metadata and conversion-method registration. Their old global-promoting body
is not emitted. Direct calls use the stored callable with the call-time
receiver; reflective `.call/.apply` no longer select struct methods merely
from a name-keyed static body handle. Module-level literals and class methods
retain their existing paths. This is a shared ownership decision feeding the
existing backend, not a claim that the full checker body is IR-emitted.

Added `tests/issue-1058-object-method-environments.test.ts`: 30 native-oracle
standalone executions in both IR settings, plus exact ownership identity;
final focused result **31/31**, including borrowed `.call` and `.apply`.
Initial production checks: **60/61** across the earlier 28 reduced rows and
four adjacent files; the only failure is the previously measured host import
surface expectation. Expanded tracked suite A/B (before adding the two apply
rows): **110/136 → 124/136**, exact pre-change `ee6633355a` source via
`.tmp/checker-method-production-baseline.config.mts`. Failure-row comparison
finds fourteen fixes and **zero new failing rows**; all twelve remaining
failures occur on baseline too. Evidence:
`.tmp/checker-method-production-first.log`,
`.tmp/checker-method-production-expanded.log`,
`.tmp/checker-method-production-expanded-base.log`,
`.tmp/checker-method-production-final-focused.log`. Typecheck, lint and size gates
pass after moving the reflective-call explanation out of the oversized
function; no allowances added. Oracle/coercion gates pass. Preservation audit
passes **6/6** full-source and **6/6** cut witnesses only; graph remains
**OPEN**, strict closure **FAIL**, deletion not certified.

Full checker retry is live as **63849** in
`.tmp/checker-method-environment-full.log`, official standalone probe with
consumer-driven barrels, 8192 MB heap and all three unchanged zero-argument
oracles **67858 / 0 / 133394**. Do not restart it merely for quiet output.
Original semver O1 retry **15763** is now terminal, exit **0**: native
**692/692**, standalone **692/692**, valid zero-import Wasm, **7,071,295 bytes**,
**175,569 ms**, pinned TypeScript `c63de15a992d37f0d6cec03ac7631872838602cb`.
Evidence: `.tmp/semver-method-environment-o1.log`; compiler source is now
committed as signed `702c2ef3a9`. Full checker remains pending.

**Per-object closure experiment (post-merge, `1f90af4c6a`):** a diagnostic
Vite pre-transform now proves the existing struct layout can retain captures
per activation. No tracked compiler source was changed. The experiment stores
`compileArrowAsClosure` results in structured method fields, skips their
global-promoting static bodies, and selects stored-callable receiver dispatch.
Initial grandparent matrix improves **12/16 → 16/16** in standalone mode,
both IR settings. A second native-oracle matrix covers inferred receivers,
own `this`, mutable captures, parameter defaults, borrowed methods and
same-shape literals: baseline **2/12**, initial prototype **10/12**.

Borrowed calls exposed another static bypass in `expressions/calls.ts` near
`resolveReceiverClassName`: `.call/.apply` admits a struct merely because
`funcMap` contains its method name. Restricting that diagnostic shortcut to
actual classes lets the stored closure handle borrowed methods. Prototype v2
passes **28/28** combined reduced tests, zero imports. Evidence:
`.tmp/checker-method-closure-candidate-v2.log` versus
`.tmp/upstream-aca46-focused.log` and
`.tmp/checker-method-closure-controls-base.log`. This is a source-transform
experiment against `1f90af4c6a`, not a committed compiler fix or full-checker
measurement.

Adjacent four-file A/B initially caught conversion regressions: baseline
**31/33**, prototype **29/33**. Cause: the early closure-field branch bypassed
existing `valueOfClosureTypes` registration. Copying that registration for
`eqref` conversion fields produces prototype v3 **32/33**, retaining the same
host-lane import-surface failure as baseline and fixing the baseline method
extraction failure (`7` versus native `107`). Standalone prepared-IR ownership
still passes. Evidence: `.tmp/checker-method-closure-adjacent-base.log`,
`.tmp/checker-method-closure-adjacent-candidate.log`,
`.tmp/checker-method-closure-adjacent-v3.log`. All these runs are terminal.
V3's combined 28-row matrix has not yet been rerun after the conversion edit.

Experiment source: `.tmp/checker-method-closure-candidate.config.mts`;
repros: `.tmp/checker-method-capture.test.ts` and
`.tmp/checker-method-closure-controls.test.ts`. Do not ship the diagnostic
frame-name condition (`fctx.name !== "__module_init"`) or unconditional
receiver widening. Next: turn the proven allocation/dispatch protocol into
declaration-owned shared IR planning, leveraging existing object-method units
in `ir/identity.ts`, `ir/from-ast.ts` and the prepared ownership tests rather
than creating a competing name-keyed registry. Preserve method metadata,
conversion registration, reflective calls and direct calls together.
`valueOfClosureTypes` consumers are binary-ops, type-coercion and index;
producers are literals and char-at-transfer, with context initialization.
The existing IR ownership path already lowers selected methods as closures;
the full checker still falls outside that selected population.

Upstream sync: fetched `https://github.com/loopdive/js2.git` main at
`aca46e64cd` and merged it without conflicts as signed commit `1dfdd8a571`.
Verified upstream ancestry and clean worktree after the merge; no main push.
Post-merge typecheck passes. Focused validation is **66/70 passing**: all
**54/54** checked-in tests across the incoming dynamic-callback regression,
module-class initialization, readonly class plan and namespace-class surface
pass. The remaining scratch capture matrix is **12/16**, with exactly the
same four two-factory wrong values as before sync. Evidence:
`.tmp/upstream-aca46-focused.log`, `.tmp/upstream-aca46-typecheck.log`.

Continuation direction: reuse per-object closure environments, not global
promotion. The open-object method route already calls `compileArrowAsClosure`,
whose `closures/arrow-phases.ts` capture discovery follows transitive nested
function requirements. Structured methods instead promote captures and wrap
a static body. Any fix must keep object production, interface/return types,
stored method closures and direct method calls on a consistent ABI; merely
forcing literals onto the open-object route is not yet justified. Prefer an
exact-declaration shared IR capture/ownership plan for that decision. Full
checker compilation has not been remeasured or fixed by this merge.

Checker continuation: reducing the recorded invalid grandparent capture in
`SyntacticTypeNodeBuilderResolver_shouldRemoveDeclaration`. Its source calls
`checkComputedPropertyName` from an object-literal method inside
`createNodeBuilder`, while that function belongs to `createTypeChecker` and
requires captures including function-valued `error`. The existing method
promotion walk follows function dependencies but skips promotion of function
values themselves. A reduced matrix now distinguishes ordinary nested calls
from escaped function values and tests two independent factory activations;
no source fix or checker-success claim has been made yet.

The reduced matrix measured **12/16 passing** before upstream sync: all four
two-factory structured-method cases return **2122**, rather than native
**1122**. Adding an accessor to select the open-object closure path passes
the corresponding controls in both IR modes. Evidence:
`.tmp/checker-method-capture-open-control.log`; this isolates per-activation
capture ownership, not yet the full checker's invalid local index.

**Original semver milestone:** native **692/692**, standalone **692/692**,
valid zero-import Wasm, 7,066,645 bytes, 142,187 ms at O1, pinned TypeScript
`c63de15a992d37f0d6cec03ac7631872838602cb`; durable runner exit **0**.
Evidence: `.tmp/semver-readonly-class-o1.log`. This includes the constructor
descriptor fix below and the initialized class-binding read, before the final
fail-closed hardening for unresolved write targets and `with` in its planner.

Exact ESM namespace reads of a proven never-reassigned source class can now
read its binding without constructing unrelated namespace exports. Unlike the
rejected eager namespace shortcut, a shared IR declaration plan rejects binding
writes (including destructuring, updates and loop targets), eval, `with`, and
unresolved matching write targets. A declaration-owned runtime initialization
flag is published at the END of class evaluation, after static initializers
and before a following statement even when their AST positions tie. Reads check
that flag with a real ReferenceError before materializing the existing class
singleton. No eager class/prototype creation was added to module initialization.
Mutable TS namespace properties are excluded: this optimization does not
pretend that they are immutable ESM bindings. General mutable class bindings
and actual runtime TS namespace objects remain open.

Standalone A/B, both IR settings, replacing exactly `declarations.ts` and
`property-access.ts` with their `323b5f77e6` versions: **34/46 → 46/46**.
The eight new initialization controls check forward reads, deferred function
reads, reads during static initialization and reads immediately after class
evaluation. The final hardened candidate passes **65/65** across five files,
including ten direct shared-IR plan controls, the namespace execution plan,
all ten namespace/class surface cases and all 28 live static-method controls.
Evidence: `.tmp/readonly-class-baseline.log`,
`.tmp/readonly-class-initialization.log`, `.tmp/readonly-class-final-focused.log`.
Type checking, lint and LOC/function budgets pass without new allowances.

Adjacent source-order/chunking/prepared-init A/B is **33/34** on both sides;
the identical remaining host-only chunk-prefix assertion is not a new failure
(`.tmp/readonly-class-adjacent.log`, `.tmp/readonly-class-adjacent-baseline.log`).
The rejected-shortcut negative matrix stays **6/12** on both sides, with the
same six loud failures for mutable TS namespace classes and all early-read and
ordinary receiver/getter controls passing (`.tmp/readonly-class-negative.log`,
`.tmp/readonly-class-negative-baseline.log`). No conversion of those failures
to quiet wrong values is accepted. Oracle/coercion ratchets pass. Preservation
audit passes **6/6** full and **6/6** cut witnesses only; production graph remains
**OPEN**, strict closure **FAIL**, deletion not certified.

The original incremental-parser run on hardened commit `b6353445c2` finished
with exit **0**: native **153/153**, standalone **153/153**, valid zero-import
Wasm, **23,759,247 bytes**, **554,691 ms** at O1. Evidence:
`.tmp/incremental-readonly-class-o1.log`, session 79645. These measurements
precede the next upstream merge. Success is not proof of full checker compilation, all TypeScript
unit tests, strict IR closure or self-hosting; those requirements remain open.

Follow-up: the inline `Object.defineProperty` accessor path registered a
constructor's descriptor as an instance-type accessor in `classAccessorSet`,
while qualified static calls read the identity-keyed runtime bag. Constructor
accessors now use the existing runtime descriptor applier. The routing-only
candidate passed the original **18/18** but failed preservation of an omitted
`configurable` flag: the bag had no initial method descriptor to merge against.
That candidate alone is insufficient and was not committed.

Ordinary own static methods are now installed into the identity-keyed bag once,
inside the existing class-object singleton initializer, with explicit method
attributes. This reuses the existing native descriptor implementation and
closure creation rather than inventing parallel descriptor state. Private
methods, static accessor/field collisions, and classes with runtime-key static
members are excluded from this seed; their existing lowering remains, and this
is not a claim of complete class descriptor semantics. Constructor definitions
must not register instance-type accessors. Readers and mutators of
`classAccessorSet`/`structAccessorClosure` were enumerated; no new registry or
lifecycle was introduced. The shared static-method install helper also retains
the host registration path; it was extracted to meet the function-size gate,
not granted another allowance.

Expanded standalone A/B (both IR settings), replacing exactly `object-ops.ts`
and `expressions/extern.ts` with their `61a1a3cc21` versions, improves focused
checks **16/28 → 28/28**. Added native-oracle controls cover accessor `this`,
constructor/instance isolation, descriptor roundtrip, accessor-to-value
redefinition and omitted-flag preservation. Six-file comparison is baseline
**115 passed / 13 failed / 7 skipped**, candidate before helper extraction
**127 passed / 1 failed / 7 skipped**, **135 total** on each side. The remaining
host snapshot failure returns 66529 rather than its pinned 66528 on both sides;
the skips are missing local fixtures, not passes. Evidence:
`.tmp/static-accessor-seeded-final-baseline.log` and
`.tmp/static-accessor-seeded-final.log`. Post-extraction verification repeats
the same **127 passed / 1 failed / 7 skipped**, including **28/28** focused
checks (`.tmp/static-accessor-final-v2.log`). Type checking, lint and
LOC/function budgets pass without new allowances. The moved-code audit is
preservation-only **6/6** full and **6/6** cut witnesses, not strict IR closure:
the production graph remains **OPEN**, strict modeled closure **FAIL** and
retirement/deletion **NOT CERTIFIED**.

Original semver with the full descriptor seed, before the mechanical helper
extraction: native **692/692**, standalone **684/692**, same eight failures at
1002:31, valid zero-import Wasm, 7,064,133 bytes, 144,063 ms at O1, unchanged
TypeScript pin. Evidence: `.tmp/semver-seeded-constructor-accessor-o1.log`.
The namespace-object failure remains independent and open; no parser/checker
or self-hosting completion is claimed.

Qualified compiled class calls now reuse the existing dynamic member-call
emitter instead of assuming the originally declared method remains installed.
The caller records existing static-sidecar demand; the shared emitter evaluates
the receiver once and captures the live callable before evaluating arguments.
Callable static fields retain their dedicated path. No new context registry or
checker query was introduced. This is shared physical lowering, not a claim of
new IR-body coverage or completed runtime TypeScript namespace objects.

Standalone Vitest A/B, both IR settings, replacing only
`call-receiver-method.ts` and `class-dynamic-member-call.ts` with their exact
`e5c3c04f33` versions: baseline **8/18**, candidate **14/18**. Direct replacement,
replacement through an opaque alias, and replacement preserving `this` now pass
in both settings. Original methods, callable fields, receiver-once and
callee-before-arguments controls stay passing. The four remaining failures are
getter replacement and throwing-getter replacement, in both settings; they
already fail on the baseline and remain ordinary failing tests, not skips.
Their descriptor-storage/lookup cause is not yet established. Bare class-name
calls and spread calls are outside this new gate.

Evidence: `.tmp/namespace-static-mutation-final-baseline.log` and
`.tmp/namespace-static-mutation-final.log` (the latter also includes **15/15**
existing namespace-factory checks, giving **29/33** overall). Four adjacent
class-call files pass **80/80 executed**, with **9 skipped** missing-fixture
controls, **89 total** (`.tmp/namespace-static-mutation-final-adjacent.log`).
Fresh original semver remains **684/692** standalone versus **692/692** native,
same eight comparison/prerelease callbacks failing on a null namespace receiver
(now reported at generated line 1002:31). The current candidate produces valid,
zero-import Wasm, 7,063,925 bytes in 147,693 ms at O1, same TypeScript pin above.
Evidence: `.tmp/semver-static-mutation-o1.log`, terminal exit 1. Parser **153/153**
above predates this mutation change and is not current candidate acceptance.
Type checking, targeted lint/formatting, issue validation, LOC/function budgets,
oracle and coercion ratchets pass; no new size allowance was added. Accessor
replacement, namespace materialization, full checker compilation, self-hosting
and strict IR closure remain open.

### ESM namespace identity continuation (2026-09-27)

The initialization hypothesis above is now confirmed and fixed: the shared IR
identity context was absent for ESM namespace imports with both IR emission and
outcome tracking disabled. `requiresRuntimeModuleIdentity` now includes runtime
namespace imports and namespace re-exports, while excluding type-only forms and
declaration files. This enables the existing declaration-owned callable registry;
it does not introduce a parallel legacy name-based registry.

Additional controls exposed named imports of `export * as ns`: these were not
materialized at all. The shared namespace emitter now accepts those imports only
when the aliased symbol proves a concrete source module, and caches by that module
symbol so direct, repeated, and named namespace imports share object identity.
Ordinary exported objects and declaration-only modules do not qualify.

Fresh standalone A/B, same Vitest harness and tests, replacing exactly
`src/ir/runtime-module-identity.ts` and `src/codegen/module-namespace-value.ts`
with their `54fd09a584` versions: baseline **14/19**, candidate **19/19**.
The four added cases exercise same-named functions in distinct modules during
initialization, direct versus named namespace re-exports, canonical namespace
identity, and both IR settings. Expanded enum/namespace/host-builtin controls
pass **46/46** across nine files. Type checking and lint pass. Logs:
`.tmp/namespace-esm-final-baseline.log`, `.tmp/namespace-esm-final-focused.log`,
and `.tmp/namespace-esm-final-typecheck.log`.

The earlier adjacent run was **67/77**, not green: eight existing runtime
namespace static-class failures and two missing local Test262 fixture files.
These were not skipped or counted as passing. The original semver rerun after
the identity-planning fix (before named-import materialization) remains
**684/692** standalone, native **692/692**, valid zero-import Wasm,
7,063,962 bytes, 139,505 ms (`.tmp/semver-esm-identity-o1.log`). Full TypeScript
checker, self-hosting, strict IR closure, and the eight semver cases remain open.

"js2wasm compiles 60% of test262" is a percentage. "js2wasm compiles the TypeScript compiler itself" is a story. Landing even Tier 3 is the single strongest artifact for conversations with potential maintainers or funders — it demonstrates the compiler has enough depth to handle production TypeScript, not just hand-picked benchmark inputs. The gap between "a toy subset compiles" and "the real compiler compiles" is exactly what separates a proof-of-concept from a usable tool.
