# ES2015 worker job phase attribution — bounded diagnostic plan

2026-10-10; Astra planning handoff only. **Pending normal numeric allocation,
frontmatter, claim, ownership agreement, and publication.** Not an allocated
issue or a completed diagnosis. No source changes or execution authorized here.

## Scope and admission

Root's session `62071` remains live and frozen. No kill, restart, source change,
instrumentation, compiler/parser/Node/test/build/install/format/profile command,
Git mutation, or GitHub polling was performed for this task. Only this new plan
is written in the owned planner checkout:
`/Users/thomas/.codex/worktrees/es2015-fresh-full-census-plan-astra/js2` at detached
`dbf5b4f74b37d67e525b2af36fd1fe49803b1348`. The two earlier plans are preserved.
Do not use the late-created unattached timeout-attribution checkout.

Analyzed execution source (EXEC):
`/Users/thomas/Code/js2/.codex-worktrees/6878-delete-result-boolean-sol61`, HEAD
`38901fff8f9a5ca029cbefcdaec5d8dd40949861`, root source digest
`a6464ffb87f98d4984d2454a14bc95bd80c035c88e7905bd1465b484537738c8`.
All line references below are to this epoch, not the older planner source.

Root reports six timeout originals at task dispatch, including find/name,
filter/speciesctor-get-ctor-inherited, Array lastIndexOf Proxy, a class generator
forbidden-arguments row, a TypedArray constructor object-argument throws row,
and `test/built-ins/ArrayIteratorPrototype/next/detach-typedarray-in-progress.js`.
The last original's root-reported SHA is
`7d33e68d5fdc6e02ecdb5f83449a66486c6c8b583558352c64c830ce285597b3`.
Those observations are partial negatives, not a final score or proof of phase.
Do not resolve ambiguous shorthand to guessed filenames.

The next authoritative measurement remains root's already-reviewed FOUR-original
matched A/B packet, unchanged and initially uninstrumented. Its recorder is
`/Users/thomas/.codex/worktrees/6878-boolean-property-carrier-sol61/js2/.tmp/es2015-timeout-matched-packet-sol61.mjs`,
SHA `1b9218de989e3bc3dc6d418227c4731be9c8e78a1a4be275c1d77b6370ca3c92`;
handoff in that same directory `es2015-timeout-matched-packet-handoff-sol61.md`,
SHA `6d6ea090d0c43b1c65397fae37404570b40e6f43b8377160c7d34ae189b5aa49`.
Both hashes checked read-only; the 258-line handoff was read in full. Fixed order:

1. `test/built-ins/TypedArray/prototype/find/prop-desc.js`.
2. `test/language/statements/variable/binding-resolution.js`.
3. `test/built-ins/TypedArray/prototype/find/name.js`.
4. `test/built-ins/TypedArray/prototype/filter/speciesctor-get-ctor-inherited.js`.

The pristine experiment's fixed six-arm order is A, B, B, A, A, B, each original
in a fresh maintained process/pool. Do not modify that protocol. Root reviewed
the proof-only L removal/restoration patches and an independent in-memory
roundtrip; review receipt SHA is
`761b19197e24aa667eeb7509d7cbf798e2cbe050089e192f790345ddd81ebb11`
(root-supplied). Launcher, arm-runtime/provider input schemas remain pending.
Before diagnostics record variant assemblies and full patch pins in its receipt.
Do not silently grow the packet to six originals or replace it with this plan.
Full objective remains 11,778 originals INCLUDING 74 Intl entries.

**All proposed diagnostic executions, overheads, and phase results are UNKNOWN.**
This is coarse phase attribution, not compiler profiling or a performance fix.

## Actual maintained path and timing contracts

There is no `scripts/test262-pool.mjs` in EXEC. The actual pool is
`scripts/compiler-pool.ts`, imported by `tests/test262-shared.ts:26`.

- Shared runner around 740–810 reads the body/metadata and calls
  `assembleOriginalHarness`; `tests/test262-original-harness.ts:197,560` builds
  primary and optional strict assemblies. Observe the returned strings; never
  reassemble with a different helper or change their content/order.
- `test262-shared.ts:1220` sends the actual selected variant to `pool.runTest`
  with 30,000 ms. A primary PASS may cause a strict rerun. Rows sum primary and
  strict timing fields; this is not a single job duration. Timeout/poison retry
  sites around 1318 and 1398 use the current `compileSource`, 10,000 ms, and a
  serial retry mutex. A retry label alone does not identify strictness.
- `compiler-pool.ts:313–377` queues without a timer, chooses a ready idle worker,
  arms the timer, installs the pending result, and calls `proc.send`. The timer
  does NOT wait for a worker acknowledgement. IPC delivery and all worker work
  before the response are within this budget; queue time is outside it.
- On deadline, the pool's EXISTING behavior resolves `compile_timeout` with
  `compileMs = timeoutMs`, terminates that worker and respawns. That value is a
  substituted ceiling, not observed compiler duration. This plan neither invokes
  nor changes those existing timeout actions. Crash retry is a separate mechanism
  (same job ID, fresh process) from the runner's timeout retry (new enqueue ID).
- Parent message handling clears the timer when resolving the job. Worker
  `sendResult` performs cleanup and realm-canary work BEFORE sending its result.
  A final verdict prepared by the worker is not yet a completed pool job.
- Worker static imports load compiler/runtime bundles before module-body code;
  incremental compiler creation and intrinsic snapshots occur before the final
  `process.send({type:"ready",pid})` at line 3358. A module-body marker cannot
  measure those earlier imports individually. Parent fork-to-ready brackets them.
- Worker message handler starts at 2117. Its `compileStart` at 2151 precedes
  provider preparation and `doCompile`; compileMs is captured at 2275 after that
  promise completes. `doCompile:1498` restores builtins before selecting compile
  branch. Therefore existing compileMs is broader than the compiler API call.
- `compileSingleSource:178` calls incremental `.compile` or bundle `compile`;
  `compileMultipleSources:183` does the analogous graph call. Honest original
  harness goes through the single-source branch at 1698. These are the narrow
  compiler API boundaries; they do not expose parse/check/codegen subphases.
- Successful output validation is `WebAssembly.validate` at 2386, AFTER the
  compileMs snapshot and BEFORE execStart at 2455. Error rendering, binary-cache
  branches, and negative early returns can occur in this gap.
- Execution setup builds the sandbox/imports and runtime-canary snapshot, then
  calls `instantiateTest262Module:2507`. The shared adapter
  `scripts/test262-import-object.mjs:230–339` must remain the sole instantiation
  seam. Do not clone its behavior in the worker.
- Unlinked standalone adapter path: linked-registry reset as applicable,
  `new WebAssembly.Module(binary)` at 336 (native Wasm compilation), conditional
  namespace attachment at 337, then `WebAssembly.instantiate` at 338. These are
  three different intervals, not all js2wasm compilation.
- Conditional runtime-eval attachment can select cached provider modules and
  instantiate a fresh namespace. `runtime-eval-provider.mjs:832` dispatches to
  `quickjs-eval-provider.mjs:4698`; that creates QuickJS Instance, calls its
  `_initialize`, creates adapter Instance, and binds callbacks. Keep this whole
  interval named provider attachment initially; do not call it test execution.
- Worker then wires `setInstance` and invokes an exported `__module_init` around
  2585. Despite an outdated nearby comment saying standalone has no such export,
  `doCompile` explicitly defers standalone init. Observe the actual export and
  call, not the comment. In originalHarness mode this call runs harness AND
  original body. It is not an exact assertion-entry marker.
- Original async rows additionally drain native queues/output and wait for
  completion markers; synthetic non-original mode may call exported `test()`.
  Their absence is a branch fact, not missing instrumentation. Do not force them.
- `sendResult:3337` snapshots existing observation/fallback metadata, calls
  `postCompileCleanup` (restore, recycle policy, periodic GC), checks realm drift,
  and sends. Preserve every early return and exception classification.

## Proposed smallest diagnostic patch boundary

Proposed Sol ownership only after root authorizes an isolated diagnostic checkout
and confirms shared-file handoff; no active-source edits. No ownership is granted
by this document. Required narrow seams:

1. `scripts/lib/test262-job-phase-observation.mjs` — NEW bounded sink/schema and
   optional phase observer, kept out of compiler/runtime bundles.
2. `scripts/compiler-pool.ts` — parent fork/ready/enqueue/dispatch/deadline/response/
   exit observations and explicit diagnostic identity forwarding.
3. `scripts/test262-worker.mjs` — job receipt, existing compiler calls, validation,
   execution/setup/init, cleanup, and response markers.
4. `scripts/test262-import-object.mjs` — optional diagnostic observer around the
   existing module construction, conditional attachment, and instantiate calls;
   default undefined, no alternate adapter or provider-selection behavior.
5. `tests/test262-shared.ts` — assembly begin/end and explicit canonical-original,
   primary/strict, retry-kind/ordinal metadata at existing call sites. Do not
   parse label suffixes to infer identity. Observe callback budget here.
6. NEW focused protocol/observer tests and a NEW tiny fake-worker fixture under
   `tests/fixtures/`, named with the later allocated issue ID.

No edits to compiler.ts, output.ts, numeric proof, codegen, IR, Test262 originals,
harness assembly implementation, runtime/provider source, or bundle bytes. Existing
QuickJS inner phases remain opaque in stage 1. If provider attachment dominates,
return to root for a separate narrower adapter plan instead of broadening now.
Fixture-graph in-process execution is outside this fork-only plan and must be
reported as not instrumented rather than silently called a worker observation.

## Marker schema and placement

Use an explicit off-by-default diagnostic flag AND root-supplied packet allowlist.
No production shipment, baseline merge, or canonical JSONL schema change. Root
chooses a fresh private output directory; never overwrite a prior receipt.

Each record: schemaVersion, diagnosticRunId, sourceEpoch/diffId, processRole,
pid, parentPid, poolInstanceId, workerGeneration, jobId, dispatchAttempt,
originalPath, variantRole, strictBoolean, retryKind/ordinal, sourceSha256,
sequence, phase, edge (begin/end/throw/instant), monotonicNs as decimal string,
and only bounded primitive metadata. Unknown fields stay null with a reason.
Never serialize source text, exceptions, exports, instances, arbitrary test
objects, or getters. jobId alone is insufficient across pools and crash retries.

- Parent lifecycle: fork.request/created; ready.received; enqueue; dispatch;
  deadline.armed with actual timeoutMs and monotonic scheduled deadline;
  result.received; deadline.fired with actual elapsed/overshoot; worker.exit;
  respawn relation. Observe existing callbacks, never add a watchdog or stop.
- Assembly: begin/end around the existing assembler call; body SHA and each
  returned variant SHA/UTF-8 bytes. Return timing includes both variants where
  the existing call produces both. Hashing is a separate diagnostic-cost span,
  not assembly work. Selected-source SHA travels with each concrete enqueue.
- Worker lifecycle: first reachable body marker after imports, readiness.sent,
  job.received before native-eval observation/provider prep, job preparation,
  precompile restoration, doCompile begin/end, and actual compiler-call
  begin/end/throw. Preserve source arguments/options exactly.
- Hash actual compiler input at the call seam, separate from compiler-call span;
  compare with parent selected-source hash. In this honest unlinked packet they
  must agree. If a different branch transforms source, name its actual input and
  do not pretend msg.source was the compiled assembly. Do not hash binary/source
  repeatedly in a loop; record hash work and payload size explicitly.
- Validation begin/end/throw around the EXISTING validate call, recording only
  its Boolean result. Distinguish subsequent invalid-binary diagnostic rendering;
  do not add another validate or instantiate operation to learn the answer.
- Execution setup begin/end; adapter begin/end; native-module-construction;
  conditional-provider-attachment; native-instantiation; instance-wire;
  module-init begin/end/throw if callable, otherwise explicit ABSENT marker.
  A return/error before reaching the export check means NOT_ATTEMPTED, not ABSENT.
  Runtime eval invoked FROM module init remains within that interval, not a new
  compiler-phase claim. Mark linked-provider branch as out-of-packet if reached.
- Native Wasm start execution, if present, is inside native-instantiation; do not
  report it as a separately observed phase. This worker has no explicit `_start`
  call at this epoch (only comments mention it). Do not add one. Any later epoch
  with explicit `_start` or other return-export execution requires distinct
  actual call markers and re-review, not inference from a target name.
- Async drain/completion-wait and exported-test intervals only on actual paths;
  verdict-prepared at sendResult entry; metadata snapshot; cleanup; realm-canary;
  response-send begin/return. The latter does not prove parent receipt. Parent
  result.received is the terminal pool observation. Do not change send callbacks
  or add awaits to obtain a convenient event ordering.

Use a startup-captured monotonic clock (e.g. bound `process.hrtime.bigint`) and
immutable primitive operation references resilient to prototype poisoning.
Calculate intervals ONLY within the same process/clock domain. Do not subtract
worker performance.now from parent performance.now, or assume PID clocks share
an epoch. Correlate IPC through identity and causal order; parent dispatch-to-
response measures parent wall time. UTC receipt timestamps are provenance only.

Bracket calls without changing sync/async behavior, promise scheduling, return
types, thrown values, or catch order. Use finally only for nonthrowing observer
bookkeeping; a throw marker cannot convert an exception into success. Disabled
mode must not hash or write. Any observer error disables observation and marks
the diagnostic record incomplete; it must not affect a conformance verdict.

## Durable bounded sidecar, not result-channel telemetry

Prefer a process-private regular-file sidecar with exclusive creation, a held
descriptor, and small synchronous append records. This preserves an entered
phase before a long synchronous call blocks the worker event loop. One writer
per file avoids interleaving. No per-event open/close, fsync, network, stdout,
console, shared lock, timer, polling loop, or IPC progress message.

The pool currently treats any message with a pending job ID as a RESULT. Sending
ordinary phase messages on that channel could resolve the job and clear its
deadline. Do not use it for telemetry. Existing native-eval observation flushes
only through sendResult, so its buffered accumulator alone loses timeout trails.
Do not widen or repurpose that separate diagnostic facility.

Proposed caps, to be reviewed before implementation: 96 records and 192 KiB per
attempt, 2 KiB per record (including full identity), and 8 MiB for the bounded
packet's observation. Process files are individually capped; the offline reader
checks the aggregate cap, without adding shared logging locks to execution.
No loops logging compiler operations or individual assertions. Reserve one
overflow marker; on write error, short write, sequence gap, cap, malformed/truncated
tail, or missing process terminal, classify observation incomplete. Never retry
I/O indefinitely. Reject unsafe paths/symlinks before the run. No arbitrary test
value reaches serialization; capture safe JSON/string/clock primitives before
test mutations and test that resilience explicitly. Capturing JSON.stringify
alone is insufficient: use null-prototype primitive records and avoid inherited
toJSON hooks/array iteration, including poison on Object.prototype.toJSON.

Synchronous I/O is not free and cannot guarantee a hard latency bound on a stalled
filesystem. It can itself move a near-deadline result. Report its measured cost,
hashing cost, dropped/incomplete events, and final open phase. Do not subtract
observer time from deadlines or verdict timing. If the observer is too costly,
reduce diagnostic detail for a separately labeled run, not the acceptance budget.

## Censoring and interpretation

- Preserve every original canonical timeout and retry result byte-for-byte
  except naturally varying timings; phase sidecars are supplementary evidence.
- A matched begin without end means only "last observed entry into this interval
  before the process failed to respond". It is right-censored, not proof the
  whole deadline was spent there. Event-write cost, gaps, scheduling and death
  remain possible; report unknown where the trace is incomplete.
- Completed compiler-call + validation begin without end localizes the observed
  gap differently from a compile-call begin without end. Both canonical results
  can still say compile_timeout. Do not rename them into new passing categories.
- Never infer phase from `reached_test`, PASS, compileMs, error category, parent
  sleeping, instantaneous CPU/RSS, or metadata features. Negative parse tests
  can PASS without validation or execution. Prepared PASS followed by cleanup
  timeout is still the pool's timeout.
- No worker receipt after parent dispatch: delivery/readiness/scheduling/observer
  uncertainty, not compiler proof. No ready: startup interval uncompleted, no
  accepted job phase. Parent callback ceiling can censor queued jobs separately.
- Keep primary, strict companion, timeout retry, poison retry, and crash retry
  separate. Final row aggregation cannot be reverse-engineered into those phases.

Host-resource context (root-reported, not independently sampled by this planner):
physical RAM 17,179,869,184 bytes; swap used 24,826.06 M/free 773.94 M;
memory_pressure free 28%. A finite UTC 00:01:29–00:01:41 vm_stat sample with
16,384-byte pages observed +165,147 swap-in pages (2,705,768,448 bytes),
+223,416 swap-out pages (3,660,447,744 bytes), +707,662 decompressions and
+796,715 compressions. These are GLOBAL counters, not worker attribution or
proof that swapping caused any particular timeout. No exact rate follows from
rounded timestamps. Later paired experiments may retain a bounded before/after
host-counter snapshot with monotonic elapsed time, page size and raw provenance,
outside timed jobs; no resource changes or periodic polling added to this plan.
Report mismatched host context as a comparison limitation rather than correcting
away the measured time or changing a deadline.

## Controls and bounded measurement sequence — later only

Root alone admits execution after session 62071 reaches its natural terminal,
or after explicit user stop authorization followed by actual terminal, and the
heavy slot is available. No automatic restart or deployment into that run.

1. Finish the already-approved pristine A/B original packet first. Freeze raw
   primary/strict/retry evidence and all negative outcomes. Do not replace this
   with an instrumented performance comparison.
2. Preserve pristine A and pristine L-only B bundles and source receipts. Prepare
   identical diagnostic patch I against each, with instrumentation OFF and ON.
   Check exact original/harness/assembled source hashes, compiler options,
   binaries where deterministic, runtime/provider cache artifacts, worker count,
   Node/heap/TZ/canary settings, strict=always selection policy, and actual budgets.
   Record instrumentation source digest separately from compiler bundle digest.
   This is a separately reviewed diagnostic invocation, not an attempt to feed
   modified apparatus through the pristine recorder's frozen-input checks.
   Never waive those checks or manufacture a pristine receipt for I-OFF/I-ON.
3. Require A-pristine versus A+I-OFF parity before enabling markers, likewise B.
   Then compare I-OFF versus I-ON in matched fresh-process runs of the same
   packet/order. Balance OFF/ON and ON/OFF at least once; retain an additional
   untouched OFF run if a status changes. Root sets the total run ceiling before
   starting; suggested maximum three matched pairs, not an adaptive endless loop.
   Match warm/cold worker history and recycle decisions; a fresh-worker run is
   not automatically comparable to a warm census worker.
4. Proposed overhead admission target, NOT measured: no verdict/error/variant
   change; per-attempt observer self-time at most 10 ms; completed-packet wall
   median increase at most 1% after pairing, with raw per-job deltas shown.
   Short-job noise or censored jobs may make that wall estimate inconclusive.
   Do not average timeout ceilings as compile durations, exclude negatives from
   the evidence, or claim the self-time bound captures all observer effects.
5. If any result flips or a budget is exceeded, retain both outcomes and label
   instrumentation perturbed/inconclusive. No timeout increase, harness trimming,
   reduced includes, provider switch, altered retry policy, or early stop of a
   live test to make the diagnostic finish. Stage-2 detail needs new root review.
6. A/B+I can suggest which coarse interval changed; proof regression requires
   the reviewed L-only removal and exact restoration, identical assemblies and
   settings, plus matching uninstrumented evidence. It does not identify the
   internal compiler algorithm causing the time. No performance fix is planned
   merely because one coarse phase is long.

## Concrete fixtures and negative controls before Sol implementation is accepted

All below are planned tests, not executed results; synthetic fixture budgets and
faults are isolated protocol tests, never alterations to authoritative originals.

- Reuse patterns, not claims, from `tests/issue-1227.test.ts` (queue versus dispatch),
  `tests/issue-689-worker-recovery.test.ts` and its fake worker (bounded crash
  recovery), and `tests/issue-4162.test.ts` (single shared instantiate seam).
  Do not run its cache-building setup during the frozen census.
- New fake worker emits ready and processes two queued jobs. Assert queue time
  remains outside the deadline, marker records cannot resolve pending jobs,
  process generation disambiguates repeated job ID after a crash, and a normal
  following job still completes. Test absent ready and exit-before-ready.
- Fixture-only blocking intervals placed after explicit compiler, validation,
  provider attachment, init, cleanup, and response-preparation markers. Use the
  pool's unchanged ordinary deadline action; verify canonical timeout plus the
  expected last observed interval and no fabricated end. A worker that never
  receives a job must not be labeled compiling. No such injected branch in real
  Test262 source or production compiler.
- Observer unit controls: disabled creates no files/hashes; empty allowlist;
  source hash mismatch; duplicate/late job identity; decreasing sequence;
  short write/disk error; record overflow; truncated final line; poisoned
  JSON/Array/String methods and Object.prototype.toJSON; thrown marker callback;
  observer cost accounting.
  Fail closed for diagnostic admission, not for the original test verdict.
- Adapter seam fixtures use minimal prebuilt Wasm bytes: valid empty module,
  malformed binary, missing import LinkError, deferred initializer that returns,
  deferred initializer that throws, and absent initializer. Verify existing
  error classifications, call count exactly once, and no extra instantiate.
  Mock provider attachment only in its fixture; never replace pinned QuickJS in
  the real packet. OriginalHarness sync/async and compile-negative fixtures must
  show correct branch omissions and retained verdicts.
- Shared runner metadata fixtures: primary-only noStrict, onlyStrict primary,
  ordinary primary+strict, strict failure then timeout retry, poison retry, and
  worker crash retry. Assert actual source SHA follows the selected variant and
  original row aggregation stays unchanged. No source-text strictness guessing.
- Acceptance: every allowed original attempt joins uniquely to its worker and
  parent dispatch; missing joins explicitly censored/unknown; completed span
  times nonnegative, nesting well-formed, coverage gaps named; exact OFF parity;
  overhead report and fixed-size sidecars; no source/bundle/oracle drift; no
  additional tests skipped or promoted; diagnostic-only patch excluded from any
  production/conformance-fix PR. Full-census goal remains open independently.

## Source pins

SHA-256 read directly from EXEC; no builds performed:

```text
be06c73b7ef501985d39313d3c52691d90d5067899225dbc1431e11858e4a233  scripts/test262-worker.mjs
9fe1755691a4deaa33ce93d993b02424b20275fd41d7284a5d82c8c9c96581f1  scripts/compiler-pool.ts
d549f8732d567f518d7b06791c008a9995e9c73d6fee62a2a0872df0b923718b  scripts/test262-import-object.mjs
697c08dd8f33d453a8aa35a755a692f54ce0d9f9e1ac2c5be374fe7a7515e9d2  scripts/runtime-eval-provider.mjs
9a20b49a0eca5ab0e8c3f0307e1241aad88298b13972999a129c1db9460a48fd  scripts/quickjs-eval-provider.mjs
5049f6e291709b8f5043cad5649f9e549b09288923b451a2cf070c595c8d38df  tests/test262-shared.ts
a7a9f9a3ebb0fe9ab3f25ee1e4a11dcde734561174de3d203e487a46e57d90f0  tests/test262-original-harness.ts
da797130b6734b8d4366401b03f42a4ea55f05179a737296eafe73186b3e0d5f  scripts/compiler-bundle.mjs
5228133ee2cb0d343cd7f9f940e6c1d6607870afc0f0eeda0d060d01f85b2c89  scripts/runtime-bundle.mjs
```

Handoff: root review and exact packet/ownership admission pending. No measured
phase attribution, overhead, regression causality, or pass-count improvement.

## Root source-review handoff, 2026-10-10

The initial Astra plan hash was
`89539fdf104c87415977e4dcc706bbd29411609c1f9d8c51e8c5e66d86eb6cf5`.
This appended review does not alter its scope or measured-acceptance requirements.
Root fully read the separate 754-line seam patch, helper, offline validator,
unit fixture source and delivery handoffs. Read-only patch applicability against
the frozen execution source succeeded; nothing was applied to the live census.

Two concrete source integration defects were corrected in isolated proposals:

1. Worker startup/readiness passes `null` as a process-scoped identity. The
   initial helper accepted only undefined, disabling observation at that seam.
   The helper now normalizes null and omission, with a source-only positive
   fixture and refusal controls for other primitives, functions, proxies/getters.
2. Enqueue knew a job ID before worker generation/dispatch was assigned. The
   initial trace created an extra incomplete attempt bucket. Enqueue now keeps
   process/selected-source identity, preserving queuedJobId as primitive metadata;
   concrete attempt identity begins at actual dispatch. The validator was not
   weakened. A source-only fixture admits the corrected shape and refuses the
   historical missing-terminal bucket.

Current custody:

```text
d59d136526ca2251034f714193f3e0dde4eefdbed13453e591528308974a14cd helper source
bd169c48bcba086fc8ed4add9dd6c3ab6d010ca97211bfdbdae80b90f0e41a04 unit fixture source
51438fc69ef751ff68df8ee76eda45979f4dbe8c9f6da640f308cc1af2911339 seam patch
c4e1784d8e64e8bab584e784ccb2d47f1e640472c012f060a8877011571ac9cf seam handoff
f4127e56dec6bb53de2e1b6fb223820d70dd2f1ca54e974501d61a7890f87832 helper handoff
```

Helper/fixtures live in root's isolated derivation-cache worktree; patch/handoff
live in the isolated boolean-property-carrier worktree. The 21 unit source
registrations are ALL UNRUN. No syntax, type, real-file, fake-worker integration,
OFF parity, ON admission or overhead proof exists. The production final
close-status snapshot collector remains unimplemented: calling close is not
external proof of its result, and no result-channel telemetry is permitted.
Complete real-packet admission remains NOT READY; timeout trails are only
right-censored/last-observed-entry evidence. Producer historical hashes remain
in the individual handoffs; root revisions are explicitly distinguished.

Root's same full census session 62071 remains live. No heavy execution, timer,
test/harness/provider changes, process kill, root-source mutation, source
integration, commit, push or PR-readiness action occurred for this review.
Next action remains reviewed collection/integration followed by the required
serialized controls after the census is terminal or an explicitly authorized
stop is actually terminal. Diagnostic-only work does not fix a conformance row
or establish a causal timeout phase. The 11,778-original goal including 74 Intl
remains independent and unachieved.

## Current-run retry-pass warning, 2026-10-10

Root verified SAME live session 62071, shard-one PID 53943. At 823 unique
canonical originals the partial counts were 803 PASS, six compile_timeout,
13 FAIL, one compile_error, 10,955 unsettled, no identity/accounting problems.
The latest PASS was
`test/language/expressions/class/dstr/meth-static-dflt-obj-ptrn-id-get-value-err.js`,
honest oracle 14/providers auto, standalone, strict both, reached_test true,
compile_ms 6848, exec_ms 81, retried true, retry_count 1. Root fully read the
original: static class method with default destructured parameter must propagate
the poisoned property getter's Test262Error. Original SHA-256:
`eee4f671aaf71d54f68a4ef25a878c17cf0fe3069762fd64ea8367d85d517048`.

Actual shard-one stderr states pool TIMEOUT exceeded 30s for this original's
`[strict rerun]`; stdout records the successful callback at 44585ms. These
records establish a timeout/retry before the canonical pass, not a compilation
phase diagnosis or both-variant call accounting. The live stderr is not a
frozen complete-log receipt yet. Preserve the canonical PASS as runner evidence
and the retry marker as a separate acceptance warning. Do not relabel it as an
additional final FAIL, a clean first-attempt pass, or causal attribution.

The existing census observer rejects any retried row for its zero-retry clean
acceptance proof; no gate was relaxed. Eventual matched first-attempt verification
remains pending after execution release. This observation does not expand the
fixed four-original diagnostic packet or release compiler/runtime ownership.
No timeout change, instrumentation application, replay, process termination,
heavy overlap, source edit, new conformance credit or goal completion occurred.

## Pending close-collector planning task (not dispatched)

The production external final close-status receipt collector remains missing.
Root attempted a NEW bounded Astra High task for that specific gap, not a
duplicate of the complete observer/seam plan. Both dispatch attempts returned
`agent thread limit reached`. Between attempts root interrupted the stale
pending-initialization helper; no running test or worker was terminated. No
new planner, implementation-plan file, collector source, test or result exists.
This existing issue records the pending task rather than pretending dispatch
succeeded. Do not repeat failed dispatches without a real capacity change.

The intended review boundary is witnessed participant/process-close receipts
for offline admission, without result IPC, compiler/timer/retry/await changes,
per-event writes, an unbounded telemetry interface, recursive receipt proof,
or silent-empty success. Calling helper close alone cannot certify it closed.
Killed/missing participants must retain unavailable proof and right-censored
trails, not be invented as fully completed attempts. First decide the actual
external lifecycle witness and expected-participant inventory; then define
bounded positive/negative collector controls and release a separate source-only
worker. The fixed four-original packet is unchanged. Existing 21 helper
registrations and all seam/collector integration/overhead acceptance remain
UNRUN or unimplemented as previously recorded.

After these failed dispatches, root's actual poll of SAME62071 confirmed live
shard-one PID53943. Canonical partial: 1022 unique originals,1002 PASS,
six compile_timeout,13 FAIL,one compile_error,10756 unsettled; no accounting
problems or new nonpasses. The full run still provides meaningful verification
progress; the agent-capacity problem does not justify declaring the overall
goal complete or globally blocked. No production source or acceptance change.
