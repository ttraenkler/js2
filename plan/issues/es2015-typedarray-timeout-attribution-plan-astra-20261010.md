# ES2015 standalone TypedArray timeouts: attribution and conditional implementation plan

2026-10-10, Codex Astra High planning lane. **Pending numeric allocation,
issue frontmatter, claim and publication. This is a uniquely named planning
handoff, not an allocated defect issue, completed diagnosis or implementation.**
Related: #6878, preserving the Boolean result of `delete` through local calls
and property writes. Do not append to or change that live execution issue.

## Ownership and execution boundary

This lane owns only this new file in
`/Users/thomas/.codex/worktrees/es2015-fresh-full-census-plan-astra/js2`.
The coordinator confirmed that this is this team's idle prior Astra planning
worktree and assigned it exclusively for this file. Its planning base is detached
`dbf5b4f74b37d67e525b2af36fd1fe49803b1348`; status was empty before this edit.
Existing ignored plans are preserved. That older planning base is **not** the
source analyzed below. No compiler, parser, test, type-check, build, installation,
hook, profile, commit, remote allocation, push or process-control action ran here.

The primary checkout is dirty and out of scope. The coordinator remains the sole
heavy executor. Full-census session 62071 was live at dispatch and at the latest
coordinator update. Wait for its actual terminal and retained final receipt before
starting any measurement or changing its source. Never stop it to run this plan.
No source synchronization with newer main belongs inside the frozen epoch.

The normal allocator pushes the upstream assignment book. The coordinator
explicitly deferred that write while this census runs; do not invent an issue
number, treat a preview as a reservation, create a GitHub issue, or dispatch a
second owner. Later, allocate/claim with the maintained full-scan workflow, read
back the authoritative record, and collision-check before publishing this as an
issue. The planning artifact can be used without pretending that step is done.

Managed tools were requested before reuse: `list_artifacts` (functions cell 1)
and `create_worktree` at execution commit 38901 (cell 7) had returned no result
when the coordinator authorized reuse. A late successful create must be recorded;
do not write a duplicate plan there or remove an unrelated worktree.

## Frozen evidence and provenance

`EXEC` below means the **read-only analyzed execution source**:
`/Users/thomas/Code/js2/.codex-worktrees/6878-delete-result-boolean-sol61`.
`FACTS` means
`/Users/thomas/Code/js2/.codex-worktrees/6878-derivation-cache-regressions-sol61/plan/issues/es2015-typedarray-find-timeout-source-facts-20261010.md`.
All 398 lines of FACTS were read. Its directly rechecked SHA-256 is
`2c5452cc70d49371a51fea95660b93fade91dd5a52c619ceba7d4fe92a442999`.

- Execution HEAD: `38901fff8f9a5ca029cbefcdaec5d8dd40949861`.
- Admission digest: `a6464ffb87f98d4984d2454a14bc95bd80c035c88e7905bd1465b484537738c8`
  over the receipt's 1902 source files. This is receipt evidence, not a fresh
  full-inventory computation by this lane.
- Delete/Boolean integration commit: `24d2483461f1c160deb5fb7883b9fb9ebf5cbe66`;
  its Git-verified parent is `56c33d1a3246191cfe8b466d83e937b7c354e475`.
  That commit touches 11 files, so reverting it wholesale is not an L-only control.
- `EXEC/src/codegen/numeric-property-analysis.ts` directly rechecked SHA-256:
  `25132364dd10d0da73a41ea276f28b75f5b6096519f2516fb1af76b27bec8d36`.
- Test262 checkout/gitlink: `b363f29d3c43c626dc852744ad64a0b48a003693`.
- Census ID: `es2015-fresh-integrated-20261010-1791586165174`.
- Exact manifest:
  `EXEC/.tmp/es2015-fresh-integrated-20261010-1791586165174/manifest.txt`,
  directly checked at **11778 lines, including 74 `test/intl402/` paths**, SHA-256
  `632db3bbecb0d6ea42b0915b13740912bf3fd8e32e2a15a8b28c1f63b6434360`.
  `EXEC/.tmp/6878-preparation/corpus-harness.json` says `originals:11778` and
  `intl:74`, not exclusions. FACTS's phrase “74 Intl exclusions” is a wording
  defect. All 74 remain in scope. The full objective is 11778/11778, not 11704.

The authoritative lane remains standalone, honest oracle 14, semantic providers
auto/default QuickJS, linked harness off, strict rerun always, realm canary recycle,
one pool worker and one Vitest worker/concurrency. Preserve Node v24.19.0, UTC,
3072 MiB worker/fork and 1024 MiB parent heap settings. Preserve the ordinary
30-second job deadline, fresh retry's 10-second deadline, retry quota and
90-second callback timeout. Record actual dispatched variants; metadata saying
“both” does not count executed calls.

Compiler/runtime bundles at admission were respectively
`da797130b6734b8d4366401b03f42a4ea55f05179a737296eafe73186b3e0d5f` and
`5228133ee2cb0d343cd7f9f940e6c1d6607870afc0f0eeda0d060d01f85b2c89`.
Default QuickJS artifact prefix was `95333826e7c8`, adapter key
`45807795114005bc`; complete provider identities and cache-pair admission must
travel with every future arm. Rebuild/admit each changed compiler normally;
do not copy an old compiler bundle into a new arm or quietly accept a stale
provider cache. If content-addressed provider identities legitimately change,
record and validate them rather than falsely calling them identical.

Preserve canonical JSONL
`EXEC/benchmarks/results/test262-standalone-results-es2015-fresh-integrated-20261010-1791586165174.jsonl`
and the matching launch/admission/stdout/stderr/epoch receipts. At dispatch the
coordinator reported 37 rows, 35 PASS and 2 compile_timeout; a later update said
42 unique rows, 40 PASS and the same 2 timeouts. These are **partial observations,
not final scores**; this lane did not poll the live result.

The two observed originals are:

- `test/built-ins/TypedArray/prototype/find/name.js`.
- `test/built-ins/TypedArray/prototype/filter/speciesctor-get-ctor-inherited.js`.

Both have a logged strict-rerun 30-second timeout followed by a fresh-worker
10-second retry timeout. The find/name final row's `compile_ms:10000` is a
substituted deadline, not completed compilation time. The callback's 55734 ms
is a different clock. Normal PASS `compile_ms` sums completed primary and strict
compilation; an aggregate above 30000 does not prove that either job exceeded its
deadline. The pool deadline spans dispatched compilation and
execution/cleanup, so `compile_timeout` alone does not identify a compiler phase.
Strict dispatch follows primary PASS in maintained source; the final retry row
does not preserve completed primary timing. Keep the negative even if a later
solo rerun passes; report the changed conditions beside it.

The coordinator independently verified filter/speciesctor-get-ctor-inherited.js
against canonical Git content (clean path), SHA-256
`a6c6e62ed40e3981a20c89d19c2f81b192b98a1fb5c3a6d7b061d00140e17dad`.
It includes only testTypedArray.js, with no flags/negative metadata, and checks
an inherited constructor getter/default species behavior with a final call count
of seven. **It does not include propertyHelper.js.** The shared include is
testTypedArray.js plus ordinary assert/sta/runtime prefix; the delete operation
in find/name's property helper is not evidence of a shared cause.

The older candidate/pre-L neighbor packet is coordinator-reported 73 PASS and
4 failures on each of 77 originals, with identical error texts. Its timing was
not matched, so it supplies no speed attribution. The admitted current eight
originals and 39 incoming assertions are positive controls from their own
receipt, not a TypedArray timeout comparison. Zero-row/drifted packets remain
inadmissible. FACTS gives their exact paths and exclusions from inference.

## Source facts that motivate, but do not settle, the experiment

All line references here are in EXEC, not the older planning worktree:

- `tests/test262-original-harness.ts:179,197,544,560` assembles the untouched
  originals with whole upstream includes and creates sloppy/strict variants.
  For find/name the includes are propertyHelper.js, testTypedArray.js, the FYI
  runtime shim, assert.js and sta.js. The strict directive precedes the prefix.
  Preserve include order, deduplication behavior, body, metadata and assertions.
- `tests/test262-shared.ts:1219,1249,1395,1457` submits primary, conditional strict
  and retry jobs and writes the final verdict; `scripts/compiler-pool.ts:324`
  starts the job timer at ready-worker dispatch. Queue wait and worker startup
  need separate clocks. `scripts/test262-worker.mjs:151,178,1692,2151,2275,2455`
  identifies incremental compilation, honest assembly compilation and execution.
- `src/codegen/numeric-property-analysis.ts:1320` creates `makeNumberCallProof`.
  The public callback memoizes calls at 1437, but recursive calls at 1333 enter
  `callReturnsNumber` directly. Slots/functions have in-flight cycle guards, not
  persistent success caches. Depth is bounded at 48. **No invocation counts,
  depths, phase costs or asymptotic behavior have been measured on these tests.**
- The closure receives the greatest-fixpoint `prover` and `numericFunctions`
  after withdrawal/property grounding, not `groundedProver`. The latter receives
  this callback at 1643. Its temporary `groundedSlots` assumptions at 1651 onward
  are not automatically a direct dependency of the callback. Audit actual
  captured sets, `withSelf`/`withoutSelf` state, host oracle and
  `host.provenNumericCallReturn` before choosing a cache key or lifetime.
- Analysis entry at 1484 includes scope/fact collection and multiple fixpoints.
  `applyNumericPropertyAnalysis` at 1774 and refinement at 1813 may create separate
  invocations. `src/codegen/index.ts:5245,5408,5787` and
  `src/codegen/declarations/param-return-inference.ts:1668` connect return evidence.
  Initial/refinement invocations need distinct identities; whether both occur
  for either timeout is still unknown.

## Minimal staged measurement, once the heavy slot is terminal

1. Freeze the completed census and validate unique manifest equality, no missing
   or duplicate original rows, actual terminal status, original/harness/source
   pins and all status categories. A nonzero terminal or missing rows remains
   incomplete, never zero failures. Determine the actual timeout population
   from these rows; do not extrapolate from two TypedArray examples.

2. Prepare isolated immutable arms at the exact execution source, with a common
   apparatus manifest. Pin all environment/options, compiler inputs/bundles,
   provider provenance, original and include bytes, assembled sloppy/strict
   source hashes, metadata, and file order. Changes from EXEC require explicit
   per-path deltas. Main rebases, unrelated incoming fixes and an older whole
   compiler are not controls. Measure later current-main integration separately.

3. Start with four unchanged originals, each as its own maintained-runner job
   sequence: the two timeout originals, known PASS
   `test/built-ins/TypedArray/prototype/find/prop-desc.js` (nearby harness control),
   and `test/language/statements/variable/binding-resolution.js` (known PASS
   Boolean correctness control). Verify the expected control outcomes first.
   A control unexpectedly failing invalidates the apparatus claim; retain and
   investigate it rather than subtracting it. The fourth original may expose the
   intentional semantic loss in the diagnostic removal arm below.

4. Run A = exact admitted candidate, B = same candidate with **only L's Number-only
   local-call proof removed and its previous arithmetic-compatible call decision
   restored**, then A-restored with an identical source digest to A. Construct B
   by reviewing the numeric-analysis hunk against commit 24d248's parent, not by
   reverting all 11 files. Retain all unrelated delete branding, property-write
   changes and later fixes. B is an unsafe historical-semantics diagnostic,
   never a shipping candidate or an acceptable way to make the score faster.
   Record its changed runtime verdicts explicitly.

5. Use fresh worker/pool processes per original for this first comparison while
   preserving the normal primary→strict→retry sequence within an original.
   Run three serial matched A/B pairs, alternating order (A/B, B/A, A/B).
   Each restoration from B to A must match A's source digest; the final pair
   supplies a restored-A observation. Record all counts explicitly.
   Report raw per-variant data and process identity, success/failure counts,
   completed timing ranges and timeout-censored observations separately. Never
   average substituted 10000/30000 ms as completed compile durations. Fixed small
   replicates identify repeatability, not a population performance estimate.

6. If A/B indicates a difference, add C = same candidate retaining the new local
   Number/Boolean distinction but conservatively returning “not proven” for the
   new local-call proof. C avoids that recursive proof without reinstating the
   Boolean-as-Number path, but may change downstream carriers and costs. Therefore
   neither B nor C alone proves the recursive walk consumes the delta. Pair
   phase/counter evidence below with their whole-job effect. Do not use global
   `JS2WASM_NUMERIC_FIELDS=0` as the causal control: it disables far more analysis.

7. If A no longer times out solo, or timing differs by worker age, replay the exact
   original order up to each affected record from the frozen shard, with identical
   recycle/retry behavior in A and B. Retain every preceding verdict and worker
   replacement. Prefix minimization is optional later; never mutate any original
   or call it a full-census result. Compare cold vs same-prefix state explicitly.
   A solo PASS does not revoke the original negative or prove “contention.”

Stop widening experiments when the stated uncertainty has been resolved. If the
small matched packet still cannot distinguish explanations, state what remained
censored and run only the next control that separates them. No timeout extension,
skip, include reduction, strict suppression or provider/oracle swap belongs to
acceptance. Diagnostic variant-only replays may label strict/cold cost, but are
not official rows and keep the same 30/10-second budgets.

## Phase attribution and observability

Instrumentation is a later diagnostic implementation, not part of this planning
change. The implementer must first coordinate exact function ownership with the
parallel machine-IR lane for `src/compiler.ts` and `src/compiler/output.ts`.
Prefer temporary opt-in hooks at existing boundaries; avoid a shared compiler
API refactor. The owner must inspect the actual execution path before placing
probes: an unused wrapper cannot measure the incremental compiler.

Emit low-volume phase entry/exit records to a separate per-arm sidecar using a
monotonic clock, process/job/original/variant/attempt IDs and sequence numbers.
Preserve records on timeout (do not depend solely on an async message flushed at
normal completion). Avoid per-AST-node disk logging. Bound counter snapshots and
record observer overhead using an instrumented/uninstrumented A control. Do not
replace the maintained JSONL or change verdict logic.

Attribute at least dispatch→compile entry, preprocessing, incremental source
update/analysis, code generation, emission/validation, compile exit→execution,
runtime execution and cleanup/result send. Split numeric analysis into scope
construction, flow-fact/return collection, original fixpoint, property grounding,
grounded-local loop, Number-only proof (inclusive and self time) and optional
return refinement. Nest spans or subtract children consistently to avoid double
counting. Source shows preprocessing/analysis in `src/compiler.ts:1686,1817,1841`;
inspect generate/finalize call boundaries rather than assuming output.ts is hot.

For the proof, collect per-analysis/closure totals: top-level and recursive calls,
distinct call/slot/function identities, cache hits/misses, visited return/definition
edges, maximum depth, cycle/depth/ambiguous/opaque refusals, host evidence hits,
grounded candidates/passes and initial versus refinement invocations. Distinguish
“absent,” “not reached” and zero. Include a known-exercising control for each new
probe. If a job is terminated in a span, report its unfinished lower bound and
last completed span; missing exit data is not zero cost.

Capture resource usage/GC evidence only if elapsed-versus-CPU or phase evidence
warrants it; no GC diagnosis from heap limits or an expensive harness's size.
If counters show too little repeated proof work to explain the deadline, pursue
the measured expensive phase instead. Record that the L hypothesis failed or
remains unresolved. A cost that exists in both A/B is not necessarily unchanged:
quantify the added component even when both arms time out.

## Conditional sound fix, if repeated proof work is causal

The preferred first implementation scope is
`src/codegen/numeric-property-analysis.ts::makeNumberCallProof` plus focused
regressions and the allocated issue. Claim that scope; preserve peers' changes.
Preserve all existing Boolean, BigInt, optional-call, ambiguity, binding-identity,
async/generator, excluded-name and opaque-definition refusal rules. Never promote
an unknown result to Number to save compilation time.

A naive `Map<CallExpression, boolean>` on every recursive entry is insufficient:
the same node can be reached with different remaining depth and ancestors in
flight, and an analysis/host evidence epoch may change. Neither a cycle/depth
refusal nor an assumption-assisted success is an unconditional reusable result.

Before coding, enumerate every input read by the recursive proof and fallback
prover and every mutation site for those inputs. Prove which inputs are immutable
for a closure; invalidate or segregate the rest. The current source does not
justify calling the temporary grounded-slot assumption a direct dependency;
conversely, a future refactor that passes groundedProver would introduce one.
Keep caches per analysis invocation and per refinement/evidence epoch; never
reuse AST-node keys across incremental source updates or programs.

Two acceptable designs, selected from measured repetition:

- Conservative recursive memo: carry a structured proof outcome distinguishing
  proven, stable refusal and context-limited unknown. Cache only after completion,
  with remaining-depth requirements and dependency/assumption provenance. A cached
  success must not bypass an in-flight slot/function or a smaller remaining budget.
  One approach retains the proof's dependency set plus required depth and reuses
  it only when disjoint from current ancestors and affordable; otherwise recompute
  with normal guards. Unknown/cycle/depth results never become context-free false
  cache entries. Account for dependency-set memory and test its own overhead.
- Bottom-up graph proof: summarize exact function/slot dependencies once per
  immutable epoch, prove acyclic components conservatively, and refuse ungrounded
  recursive components. Preserve effective depth policy and all leaf/refusal
  semantics. This has broader implementation scope and is justified only if a
  smaller safe memo cannot address measured repeated work. Do not introduce a new
  optimistic fixed point that lets a cycle certify itself.

Conservative refusal may reduce optimization but still requires runtime checks;
it is not automatically behavior-neutral in this compiler. Do not ship C merely
because it is fast. Prefer an equivalent proof with less duplicate work and
demonstrate unchanged admission decisions on the measured originals plus the
adversarial cases below. If preserving decisions cannot be proved, explicitly
review the changed decisions and their runtime outcomes.

## Verification and acceptance

- Add deterministic proof regressions for a repeated-call diamond/DAG, repeated
  returned binding, self/mutual function and slot cycles, one node reached shallow
  and deep in both traversal orders, and depth boundary 48/49 under the actual
  increment convention. Test refusal under one context followed by success under
  an independent eligible context and the reverse; cache order must not license
  unsafe evidence. Prefer counted visited edges/requests to brittle wall-clock
  unit-test thresholds, with the real timeout packet as performance acceptance.
- Cover Boolean and mixed Boolean/Number returns through aliases/parameters,
  optional calls, async/generator and same-name/shadowed/reassigned callees, opaque
  definitions and BigInt. Preserve self-assumption withdrawal and require fresh
  evidence across initial/refinement invocations and incremental program updates.
  Reuse relevant #6878 tests, including
  `tests/issue-6878-boolean-local-call-proof.test.ts`; add only missing meaningful
  cases to the allocated issue's test file.
- Measure fixed D against A under the same exact originals, order, processes,
  apparatus and deadlines. Reverting only the optimization must restore A's
  repeated work/behavior; restoring it must restore D. Then remove diagnostic
  scaffolding and repeat on the actual shipping source/bundles. B's unsafe semantic
  restoration must not survive in the patch.
- Require runtime PASS/reached-test true for each claimed official flip, with
  primary/strict/retry paths counted. Compilation completed or fewer timeouts is
  insufficient. Report failures exposed after a timeout separately and honestly.
- Run the existing Boolean proof/carrier regression packet, incoming neighbors
  and eight official controls on final source. Expand to every timeout original
  identified by the completed census, including any outside TypedArray; compare
  per-file status and exact errors, then all affected neighboring originals.
- Finally execute the complete unchanged **11778-original manifest including 74
  Intl originals** on admitted shipping source. Validate terminal, source epoch,
  row completeness/uniqueness, provider lane and all status counts. A focused
  timeout fix does not close the full 100% ES2015 objective. Preserve every
  remaining non-pass with an independently supported follow-up; no promotion
  based on the small packet or a compile-only gain.

Plan completion means a reviewable experiment and guarded implementation design
exist. Diagnosis completion requires matched evidence. Fix completion requires
final-source correctness and measured runtime outcomes. The full goal requires
11778/11778 authoritative PASS under the unchanged contract.
