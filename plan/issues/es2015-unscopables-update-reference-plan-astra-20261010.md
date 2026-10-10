# ES2015 unscopables update Reference plan — Astra, 2026-10-10

Status: source-only plan; no compiler, parser, helper, test, build, typecheck,
formatter, hook, original execution, Git mutation or network mutation performed.
All proposed validation below is **UNRUN**. This document does not transfer a
claim, remove a refusal, establish a runtime defect, or claim a conformance gain.

## Custody and evidence

- Sole authoring path: this new Markdown file in the existing isolated planner
  worktree `/Users/thomas/.codex/worktrees/es2015-fresh-full-census-plan-astra/js2`.
  Other writers' changes and all source files remain untouched.
- Frozen source read from `/Users/thomas/Code/js2/.codex-worktrees/6878-delete-result-boolean-sol61`;
  read-only `git rev-parse HEAD` confirmed
  `38901fff8f9a5ca029cbefcdaec5d8dd40949861`.
- Original read in full from the primary checkout's
  `test262/test/language/statements/with/unscopables-inc-dec.js`; parent supplied
  SHA256 `cbefdfa73dedf2fd84a1f2c8c616de00292df7f1837bba7d811c40a642f6d29f`.
  Preserve those original bytes, metadata, and all six assertions.
- Parent's measured negative61 receipt: honest14/auto, standard official
  standalone, noStrict, CE at 07:25:36 local, compile 1528 ms, reached=false.
  Diagnostics at 25:1 and 40:1 mention proven closed shape, class/method capture,
  and deferred #1472. This planner did not reproduce that receipt.
- Authoritative sixteen-shard native62071 census remained live at dispatch,
  shard4/PID36154. This plan does not refresh or reinterpret its partial totals.
  Root retains the sole heavy-execution lease.
- Read local AGENTS.md and repository MEMORY.md; the user-provided historical
  `/Users/thomas/Documents/Arbeit/Startup/Projekte/Mosaic/code/@loopdive/ts2wasm/.claude/memory`
  path was absent, so its tracked counterpart in the planner worktree was used.
  Read relevant coordination, shared-reader/mutator, Test262, A/B, and dynamic
  object memories plus the L4 handoff. User attribution rules supersede the old
  memory's Claude trailer. No commit is part of this task.

Relevant history read, with titles rather than diagnostic-based ownership:

- #4206, “`with` statement, ES5 standalone: 73-row residue reduced to 51; first
  IR closure-environment slice converts 22/39 legacy gate rows”: dynamic target
  identity, existing closure capture, and the new original-specific handoff.
- #4231, “`with` statement, ES5 standalone: runtime scope-resolution defects in
  the closed-shape route — `var` names wrongly shadow the object environment
  record, `delete` returns a number, `with(null)` does not throw”: separate
  resolution, hoisting, and carrier mechanisms; old residue counts are not current.
- #4264, “`with` statement, ES5 standalone: the object environment's value is
  destroyed by the destination's stale carrier — a with-assigned var keeps its
  primitive slot, strict-eq routes off the stale type, and a with-hoisted var is
  `null` not `undefined`”:
  carrier/readback concerns and the difference between lexical and object storage.
- #4491, “ES5 standalone: Object.defineProperty/defineProperties/create residual
  (90 tests) — descriptor MOP semantics on the dynamic object runtime”:
  its falsified symptom grouping, carrier-versus-descriptor distinctions, and
  suspended follow-up are context, not evidence this original needs a MOP rewrite.
- #1387, “feat: implement `with` statement — architect exploration of
  dynamic-scope compilation strategies”: historical static proof
  and explicit refusal boundary. Its diagnostic's historical prose is not the
  present control-flow explanation.
- #1472, “host-independence: eliminate JS host object/property ops for standalone
  Wasm”: native property machinery now exists; preserving honest refusals and
  identifying actual missing consumer wiring matters more than the old label.

## Frozen source facts, separate from runtime hypotheses

1. `src/codegen/with-scope.ts:207-243` calls
   `selectWithEnvironmentClosures(stmt.statement)` **before** either target proof.
   The outer body's traversal includes the inner `with` target expression and
   therefore its computed getter. `src/ir/with-environment.ts:211-267` explicitly
   refuses GetAccessorDeclaration with the class/method-capture reason. This is
   the source-call-flow explanation matching the measured locations. It does
   not prove the accessor ABI would fail if admitted.
2. Both targets are assignments, `a = {x:7}` and `b = {x:4,get ...}`.
   `proveObjectLiteralWithTarget` at `with-scope.ts:988-1037` does not prove an
   assignment expression. That failure itself is not terminal: the dispatcher
   has the existing dynamic path. `compileDynamicWithStatement` at 448-498
   compiles the complete expression once without an expected externref, then
   converts the live reference. Do not unwrap an assignment into a literal,
   omit its PutValue, or replay it to improve the static proof.
3. `planIrWithTarget` at `ir/with-environment.ts:183-195` is identifier-target
   planning; `irWithTargetIdentifier` accepts parentheses but not assignment.
   Its closed-fields answer for this spelling is not evidence the assignment
   is safe to statically project. `declarations/dynamic-with-shape.ts` is the
   allocation consumer, and `proveStructTypedWithTarget` is the codegen consumer.
   No extension to this planner is established as necessary for the original.
4. Accessor literals already force the open-object route:
   `literals.ts:1931` / `compileObjectLiteralWithAccessors:1013`.
   `accessor-object-literal.ts:16-28` already recognizes an assignment receiver
   and tags its identifier. `literals.ts:1514-1544` specifically boxes the
   standalone `@@unscopables` accessor key as the well-known Symbol carrier.
   `emitObjectLiteralAccessorFn:1583-1620` uses native closure lowering in
   standalone. These are existing hooks, not missing features to reimplement.
5. `closures.ts:3770-3797` supplies hidden with-environment captures;
   `closures.ts:3023` rehydrates them in the lifted body. The adapter
   `with-environment-capture.ts:32-48` preserves outer-to-inner order, local
   receiver indices, and own-binding shadow sets. The original's b getter is
   created while **a is active and b is not yet active**. It must capture a's
   live environment, not b, and counter/flag writes must reach their correct
   outer bindings. This path exists; accessor correctness through it is unrun.
6. Existing Reference reuse is explicit:
   `with-rmw.ts:147` creates one capture map, `149` passes it to GetValue,
   and `171` passes that same map to PutValue. `with-scope.ts:699-728` branches
   reads on its saved locals; `expressions/assignment.ts:890-941` branches
   writes on the same saved locals. Replacing this with a fresh name lookup
   would introduce the very bug the original is meant to detect.
7. A separate **verified emission fact** is at `with-scope.ts:658-679`:
   `captureDynamicWithHasBindings` loops over every dynamic candidate and calls
   `emitCaptureWithHasBinding` into the current body without a runtime guard.
   `emitCaptureWithHasBinding:761-783` emits a call then local.set. Thus this
   source emits outer HasBinding checks eagerly even if an inner check succeeds.
   The predicted outer getter/trap side effects and abrupt completion are
   **runtime-unproven** here. The original has no observing outer getter, so
   this is not asserted to be its post-admission failure or its conversion lever.
8. `emitDynamicWithGet` and `emitDynamicWithSet` deliberately perform later
   HasProperty operations for GetBindingValue/SetMutableBinding. In particular
   `with-scope.ts:830-862` preserves the write's unconditional HasProperty and
   Set. Those operations are not repeated HasBinding and must remain. A proxy
   trace legitimately has more than one `has:x`, but only one unscopables lookup
   per consulted environment while resolving this Reference.

The unchanged original wants one b unscopables getter invocation per update;
that invocation toggles flag true→false, allowing b.x. Get and Put then use b,
leaving a.x=7 and producing b.x=5 for increment, b.x=3 for decrement. Assertions
after each statement inspect the actual assigned objects. No one of the above
source facts proves those assertions now execute or pass.

### Exact source-byte pins

Paths below are relative to the frozen source worktree; line references above
refer to these bytes. SHA256 was read without executing project code.

```text
3fb928bde83a2433a64a1fb6663506a636a56c4263bcfef4246c0ff5b76f15eb  src/codegen/with-scope.ts
b2adbc6a2414e74398dada875969b5d1f1cc884d70a343aeb981040d5aa817c2  src/codegen/with-rmw.ts
f98f5c5938294b60aab551ea873b1e31e1a7d0d290b10d2608731404fbdb83bc  src/codegen/expressions/assignment.ts
64bad2c8ae055a877770e3a4221b7125190656bd425d01261f32799f663196ad  src/ir/with-environment.ts
8c1107189f0e726f85dba7981d26867572954ea3eb483c0cf9c4b01101803059  src/ir/select.ts
c6d90bceee5c21b5203816450e81c25281d5b7408bd51e356c9f3b5a7afbbc27  src/ir/from-ast.ts
cfe38f4375da37a35d09bf182299fc2f12c126a2a7057145a204deff99e7cd24  src/codegen/literals.ts
0f64c11369c187f41ebefd500c1d1e786488bd8d6fac39c79f2dfff7d6a2bd51  src/codegen/closures.ts
b744256c252294e3eef284f0147fe088c665c48c549ad5c5fd887c38767e8507  src/codegen/with-environment-capture.ts
6a3f1a7552fb5708eee0136623c5dbeadaba2618be84ad7d88e1f01175d05925  src/codegen/with-has-binding-native.ts
b1d5f1c1a94150125aa8a150b5b1dd3a2a4e3e89d9cbf90407117e9d306fee72  src/codegen/declarations/dynamic-with-shape.ts
9fb2dc01d8861f7de2ebfe2416d41c90fba646289e57b365866b2c9a5da8c642  src/codegen/accessor-object-literal.ts
```

## Bounded implementation sequence

### A. Owner-independent conditional-capture preparation for Sol6.1 High

This is actionable source preparation in a new isolated implementation worktree
after root explicitly assigns it. It is not an admission fix or a conversion.
Suggested sole write set, contingent on root's fresh collision check:

- NEW `src/codegen/with-reference-capture.ts`.
- NEW `tests/issue-4206-with-reference-capture.test.ts`.
- A root-assigned new slice-note path, if a durable implementation receipt is
  required. Do not edit this planner file or shared issue histories incidentally.

Prepare a small codegen leaf `emitWithReferenceCaptureCascade` taking an
ordered list of candidate scope identities, the existing FunctionContext, and
an emitter callback `(scope) => hasLocalIndex`. It returns the existing
`Map<object, number>` shape, so no context schema or IR type changes are needed.
Use the established body-buffer helpers and existing Instr types. The algorithm:

1. Emit the innermost candidate's capture through the supplied callback; save
   its returned i32 local in the map under the exact scope object identity.
2. Buffer the remaining candidates' emissions into the runtime `if (!has)` arm.
   Recurse until the ordered list is exhausted. A true gate executes no outer
   capture, and an abrupt gate completes no later capture/read/write.
3. Keep the map complete at compile time: each candidate has its allocated
   local, even if that local's assignment is runtime-unreachable. Consumers
   only inspect later locals after all earlier gates missed. On loops, skipped
   locals may contain old values but must be unreachable on both read and write
   branches; test hit/miss alternation explicitly. Do not make stale local
   contents observable or rely on zero-init to decide routing.
4. Restore the active body in `finally` on callback failure; no persistent map,
   no changes to withScopes, no extra native registration, no name re-resolution.

The future existing-file hook belongs to root or its confirmed owner:
`with-scope.ts::captureDynamicWithHasBindings` first collects the same ordered
candidate identities using the existing resolver/truncation/try-finally logic,
stopping at its static/lexical terminal; then invokes the leaf with
`scope => emitCaptureWithHasBinding(ctx, fctx, scope, name)`.
Do not alter the resolver, static terminal, helper fallback, or consumer APIs in
this slice. No production import/wiring belongs to the preparation writer yet.

Prepare tests without running them while the census lease is held. Structural
controls should assert nested conditional placement and complete identity map,
zero/one/multiple candidates, callback throw restoration, and no scope mutation.
Behavioral controls should observe event order and values using already-admitted
syntax: create both accessor objects **before** entering either with, then
`with (outer) { with (inner) { x++; } }`. This avoids testing the new shared
selector admission. Include an outer throwing unscopables getter: inner match
must update inner without throwing; inner miss must reach the outer exception.
Additional controls: all misses, outer match, middle match in three levels,
inner blocked then outer match, property-deleting GetValue, prefix/postfix ±1,
loop alternating hit/miss, `x = rhs()` and `x += rhs()` side effects, and
`var x = rhs()` because these consumers share the same capture function.
Root must later prove a real failing baseline control and passing candidate;
an isolated helper test alone cannot establish compiler or language behavior.

### B. Shared accessor admission, separately owned and reviewed

Necessary dependency for the original: a deliberate extension of
`src/ir/with-environment.ts::selectWithEnvironmentClosures`, not deleting its
class/method arm. Proposed first accepted surface: synchronous object-literal
GetAccessorDeclaration with a body, including the computed Symbol spelling
used here, through the existing accessor closure route. Keep setters, class
accessors, methods, arrows, generators, async and unsupported nested boundaries
explicitly refused unless independently proved in the same contract.

The selection result must not imply full AST→IR support for dynamic targets.
`src/ir/select.ts:4864-4896` still requires a literal target, block body, and
ordinary selected closure; `src/ir/from-ast.ts:12471-12502` only materializes
closed `withField` bindings. Assignment-target runtime Object Environment
Records are not represented there. Maintain this existing exclusion; do not
claim then demote, invent an alternate backend, or globally disable IR to admit
the original. Any change to closureCount or its meaning needs agreement with
both selector and lowerer owners. Prefer an explicit distinction between
legacy/native accessor-capture capability and the existing full-IR capability
if one shared boolean cannot express both truthfully.

Before admission, demonstrate that accessor closure creation carries the active
outer chain, own parameters/locals shadow it, live receiver identity survives
escape, and b itself is absent from the getter's captured chain. Do not silently
replace a declined getter with `ref.null.extern`: the existing literals caller
has that fallback, so successful callback materialization is a prerequisite.
Do not special-case a test filename, counter/flag names, or an exact body.

Computed key evaluation is another prerequisite: honor the active environment
for `Symbol` and evaluate runtime keys exactly once in source order. The current
well-known-symbol recognizer is syntactic; a shadowed Symbol control must keep
an honest unsupported outcome or correct evaluation, not silently install the
global well-known symbol. Do not add a broader key shortcut to pass this test.

### C. Semantic prerequisites and contingent hooks

- `with-has-binding-native.ts` already does HasProperty then unscopables Get
  then blocklist lookup. Verify symbol identity, inherited blocklists, and
  abrupt propagation through the existing native property runtime. Its
  primitive-unscopables treatment currently relies on generic Get returning
  falsy rather than an explicit Object test: inherited primitive properties
  are a required negative control, not proof of correctness from its comment.
- `withHasBindingFuncIdx` can fall back to bare HasProperty, and capture/read/
  write helpers tolerate missing gates. That is not a sound new admission
  policy. Require the actual needed native helpers and complete capture set;
  if unavailable, keep a diagnostic. Do not add a new silent outer fallback.
- Updates use `__unbox_number` directly in `with-rmw.ts:54-60,149-152`.
  The original starts with numeric 4; this does not establish general ToNumber
  semantics. Object-valued x needs ToPrimitive(number) before ToNumber, and a
  Symbol must throw. If controls expose a defect, use the existing coercion
  engine at this update site under separate ownership; do not alter the global
  unbox helper (also used as a numeric-key probe) or add a bespoke coercion matrix.
- Existing assignment-carrier handling must preserve a/b and counter/flag
  storage. Only if executed controls locate a carrier failure should an owner
  touch `accessor-object-literal.ts`, declaration widening, or assignment
  emission. No assignment-target open-shape planner extension is pre-authorized.

## Shared readers, mutators, and ownership boundaries

The Reference map is currently operation-local. Producers/consumers:
`with-scope.ts` capture + cascade-read; `with-rmw.ts` compound/update;
`expressions/assignment.ts` plain assignment + cascade-write; `with-var-decl.ts`
both initialized-var routes. A change to capture evaluation order affects all
four operation kinds; no field may be moved into shared state casually.

`FunctionContext.withScopes` readers include those files plus identifiers,
typeof/delete, and closure capture. Mutators are static/dynamic statement
push/pop in `with-scope.ts`, temporary slice/restore in its capture/read paths,
identifier read, assignment write, and typeof/delete cascades, plus lifted
context reconstruction in `with-environment-capture.ts`. Closures consume
additional hidden names in `closures.ts:3771,4378` and restore at 3023/4649.
Preserve map-key object identity while one operation is emitted, stack order,
try/finally restoration, and lexical blocking. No new withScopes schema is needed.

`externrefAccessorVars` is a name-based approximation, not an ownership proof.
Its readers include property-access, object-ops reflection, assignment,
call-receiver-method, closure type selection, variable allocation, and the
accessor receiver predicate. Creation is in context/create-context; additions
occur in declarations, object-shape-widening, proxy-binding-escape, variables,
index, and accessor-object-literal. No reset/delete was found by the mutation
search. Do not broaden or extract this state without auditing every consumer
and its program-order lifetime; this plan proposes no mutation to it.

The tracked Session A coordination handoff reserves shared IR selection,
from-AST, contexts and integration seams; its dated assignments are historical
evidence, not a current release. Current ownership was not queried over the
network and is **not verified free**. Root must reconcile actual claims and
open changes before wiring or staffing any shared file/function. In particular,
`src/ir/with-environment.ts`, `src/ir/select.ts`, `src/ir/from-ast.ts`, closures,
literals, context/types, and compiler integration cannot be presumed available.
The Sol6.1 preparation packet's two new files avoid those dependencies; the
existing `with-scope.ts` wiring still waits for explicit root/owner agreement.

## Acceptance and validation packet — all UNRUN

1. Root releases the heavy lease only after the live census settles or receives
   explicit user-authorized coordination. Preserve the completed authoritative
   artifacts and original bytes. Never change the running frozen worktree.
2. Record immutable baseline and candidate commits **and dirty-source manifests**,
   exact lane/harness/oracle/provider/native settings, original digest and row
   identities. Baseline must be the same epoch/configuration as candidate;
   neither a cached headline nor historical ES5 totals license a comparison.
3. Keep the official original unchanged in noStrict mode and require actual
   execution with all six assertions: getter counts 1/1, a.x 7/7, b.x 5/3.
   A moved compile error, successful compilation, or derived reduced probe is
   not acceptance. Report reached state, diagnostic/error, duration, and totals.
4. Independently validate the instrument using a known passing same-lane control
   and a known failing semantic control with an exact expected assertion.
   The old exported-function convenience tests are focused controls, not a
   substitute for the current official standalone worker/provider path.
5. Run the prepared Reference tests after wiring. Resolve once per consulted
   environment; no outer getter/trap after a hit; correct outer fallback on
   absence or truthy block; inherited x and inherited unscopables; unscopables
   getter and blocklist x getter each throw unchanged sentinels; GetValue getter
   deletes/redefines x; setter side effects/throws; conversion side effects and
   throws; no write after failed Get/coercion; prefix/postfix results; target
   assignment/key evaluation once; a/b identity and getter escape after with.
6. Admission negatives: unsupported callable/class forms remain explicit;
   shadowed Symbol and runtime computed keys are correct or honestly refused;
   unrelated no-with source stays unchanged. Also cover closures created outside
   the with (must not acquire its scope), getter locals shadowing an outer
   object property, primitive unscopables, missing own x, and strict early errors.
7. Scoped regressions include existing issue-1387/2663/3025/4206 suites,
   `tests/issue-6651-with-object-env-record.test.ts`, carrier/hoisting suites,
   and the real with-statement originals. Compare exact per-row verdict/error
   sets on both commits, including currently passing reachable neighbors.
   Native and host results are separate measurements; no cross-lane borrowing.
8. Gate/component attribution: capture-only candidate should leave this
   original's accessor refusal intact; admission-only candidate may expose the
   original but is not assumed sound; combined candidate must pass original
   and adversarial controls. Use temporary isolated candidates, not file swaps
   in the live epoch. Reverting each lever should reproduce its own established
   failing control before credit is assigned.
9. Run normal project checks appropriate to the actual diff: typecheck, lint,
   changed-file formatting, source/function budgets, layering/cycle, issue
   integrity, relevant equivalence and required CI/regression checks. Keep
   oracle, harness, providers, originals, gates and budgets honest. No bypass,
   weakened assertion, skip/floor change, fabricated pass, or hidden fallback.
   Any shared coercion/runtime/IR change expands validation only with its owner.

Delivery condition: a bounded reviewed implementation, exact original PASS and
all semantic controls, same-epoch regression evidence, and normal gates. Until
those exist this is a plan with one measured refusal and source-derived risks,
not a fixed original, a runtime reproduction, or a population estimate.
