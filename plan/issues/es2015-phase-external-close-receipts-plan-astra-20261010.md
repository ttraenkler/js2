# ES2015 phase diagnostics — external final-close receipt plan

2026-10-10; Astra planning only, for a later GPT-6.1 Sol source implementer.
Status: implementation proposal; collector absent; all execution UNRUN.
Pending normal numeric issue allocation, frontmatter, claim and root ownership
agreement. This new file records the task; it is not an allocated issue, a
completed diagnosis, a source implementation, or execution permission.

## Authority and unchanged objective

Only this NEW file is owned by this planner. Existing issues, proposal sources,
patches, handoffs and all peer/user edits remain untouched. Root owns updates to
the preceding worker-phase issue. No additional agent/worktree, Git mutation,
external write/message, process signal, parser/helper execution, compiler, test,
build, installation, formatter, hook or profiler is part of this task.

Root reports frozen full-census session 62071 still running, currently shard-two
PID 13477, in `/Users/thomas/Code/js2/.codex-worktrees/6878-delete-result-boolean-sol61`
(EXEC), HEAD `38901fff8f9a5ca029cbefcdaec5d8dd40949861`. This is root-supplied live
state, not a new sample by this planner. EXEC must not be changed. Root remains
sole heavy executor. The full goal is 11,778 canonical originals including 74
Intl entries; this receipt work earns zero conformance credit.

The diagnostic packet stays exactly these four originals, in this order:

1. `test/built-ins/TypedArray/prototype/find/prop-desc.js`.
2. `test/language/statements/variable/binding-resolution.js`.
3. `test/built-ins/TypedArray/prototype/find/name.js`.
4. `test/built-ins/TypedArray/prototype/filter/speciesctor-get-ctor-inherited.js`.

The pristine A,B,B,A,A,B matched protocol remains first and unchanged. Later
I-OFF/I-ON work has separate apparatus/receipt identity; never waive pristine
input checks to admit diagnostic source. Additional observed timeouts or retry
passes do not expand this packet, authorize a replay, or identify a causal phase.

## Read basis and concrete gap

Read AGENTS.md, actual repo `.claude/memory/MEMORY.md` and relevant isolation,
Test262 execution, no-kill/no-data-deletion, issue-tracking, silent-empty and
measurement guidance. The historical Documents memory path was not used.
The assigned planner checkout is
`/Users/thomas/.codex/worktrees/es2015-fresh-full-census-plan-astra/js2` (PLAN).
The preceding `es2015-worker-job-phase-attribution-plan-astra-20261010.md` was
fully read: 493 lines at this read epoch, SHA-256
`097477ffe84d9befd5aa02b4e8b23ab0a0a028c785a1bb685b8554eae2cb0e5f`.
Root may append to that issue independently; this pin names the reviewed bytes.

Fully read proposal helper, tests and handoff in
`/Users/thomas/Code/js2/.codex-worktrees/6878-derivation-cache-regressions-sol61`
(HELPER), plus seam patch/handoff and pristine recorder in
`/Users/thomas/.codex/worktrees/6878-boolean-property-carrier-sol61/js2` (SEAMS).
Also fully read EXEC `scripts/compiler-pool.ts` (456 lines). These are separate
custody locations; their surrounding worktrees are not interchangeable epochs.

Actual reviewed source SHA-256 pins:

```text
d59d136526ca2251034f714193f3e0dde4eefdbed13453e591528308974a14cd  HELPER/scripts/lib/test262-job-phase-observation.mjs (581 lines)
bd169c48bcba086fc8ed4add9dd6c3ab6d010ca97211bfdbdae80b90f0e41a04  HELPER/tests/diagnostics/es2015-job-phase-observer.test.ts (349 lines)
f4127e56dec6bb53de2e1b6fb223820d70dd2f1ca54e974501d61a7890f87832  HELPER/.tmp/es2015-job-phase-observer-handoff-sol61.md
51438fc69ef751ff68df8ee76eda45979f4dbe8c9f6da640f308cc1af2911339  SEAMS/.tmp/es2015-job-phase-seams-sol61.patch (754 lines)
c4e1784d8e64e8bab584e784ccb2d47f1e640472c012f060a8877011571ac9cf  SEAMS/.tmp/es2015-job-phase-seams-handoff-sol61.md (286 lines)
1b9218de989e3bc3dc6d418227c4731be9c8e78a1a4be275c1d77b6370ca3c92  SEAMS/.tmp/es2015-timeout-matched-packet-sol61.mjs (423 lines)
```

Current helper `close()` writes process.terminal before closing its held phase
file; `snapshot()` reports status afterward. Its `closed=true` means observer
ownership ended, including a caught close failure. It is not proof that the OS
close succeeded or that the process exited. Existing validator requires one
`{path,snapshot}` for each expected file, but receives those objects directly in
unit fixtures. Production receipt transport and independent witness provenance
do not exist. Merely constructing the same object offline would be circular.

The validator checks closed/enabled/error/bytes/records but does not yet enforce
the origin of a snapshot, external lifecycle evidence, or a producer/file binding
through snapshot.file/fixtureOnly. Retain all existing trace checks and add that
binding in a separate collector admission layer. Do not weaken the validator to
make an unavailable final receipt look complete.

## Lifecycle facts that constrain the design

There are three observer roles, not necessarily three OS processes. The runner
observer is created inside runTest262Chunk; the parent observer belongs to its
CompilerPool in the same Vitest execution process. Each worker has its own
process. The launcher uses Vitest `--pool=forks`; the direct CLI child and the
nested test execution process must not be conflated.

Relevant EXEC pool sites, all read in full:

- forkProcess around 122: stdout is piped, stderr inherited, stdin piped, result
  IPC separate. There is no per-worker piped stderr EOF available to observe.
- attachForkHandlers around 138: result message, error and exit listeners drive
  existing readiness/recovery. No independent final-close witness exists.
- message recycle at 164: normal response can immediately call respawnFork.
- deadline at 359: existing SIGKILL, then respawnFork. The timer/result path must
  remain identical. A send/kill return is not an exit observation.
- failure at 425: existing crash handling calls respawnFork after bounded retry.
- respawnFork at 432: oldProc.removeAllListeners(); SIGTERM if not already killed;
  the same ForkState is reused for the next ChildProcess/generation.
- shutdown at 450: proc.removeAllListeners(); SIGTERM if not already killed.

The proposed seams close the parent observer at shutdown entry, runner observer
in afterAll after pool.shutdown, and worker observer from process 'exit'. Parent
and runner close therefore precede proof that all children ended. Default signal
termination need not run the worker's JS exit handler; SIGKILL cannot run it.
Do not add SIGTERM handlers, graceful shutdown messages, delayed kill, exit-code
rewrites, or waits to manufacture a final worker marker. On these unchanged
paths complete worker trace admission can be impossible even for a canonical
PASS. Record that limit; any lifecycle change requires separate scope review.

The pristine recorder run() at 311–332 observes its DIRECT CLI child's error,
exit, close and stdout/stderr end/close/error. That is useful pattern evidence,
not a witness of every nested Vitest execution process or compiler worker.
Its existing interval/log behavior is outside this collector; do not copy its
timer or alter the pristine recorder. A new diagnostic launcher adapter can
consume the same direct-child facts when root later owns that invocation.

## Finite evidence model

Keep three independent states per participant:

1. Producer report: the actual post-close observer snapshot, or UNAVAILABLE with
   a reason. It is never inferred from a terminal line, file length or exit code.
2. External lifecycle witness: the owning direct parent's observed child exit,
   close, spawn/error and applicable stream events, or UNAVAILABLE. This can
   prove a signal termination occurred while producer completion stays UNKNOWN.
3. Offline admission: exact inventory/bindings plus physically read files and
   the existing validator. COMPLETE requires all needed evidence; UNKNOWN or
   INCOMPLETE retains the trace and reasons and cannot become empty-clean.

Design the collector for an acyclic, finite supervision graph. The root launch
manifest declares each invocation, its fixed runner/parent logical observer
slots, one initial pool worker for the reviewed pool size of one, and explicit
caps for additional generations. The owning pool adds each fork request to a
bounded append-only inventory BEFORE calling fork, even if fork fails or no
phase file appears. Seal that inventory at pool shutdown; replacements already
requested stay in it. Extra later requests mean inventory-incomplete.

Use launch-instance and participant tokens assigned by the diagnostic controller,
not directory contents, log parsing, received receipts, terminal records or PID
alone. Worker identity includes run/sourceEpoch/diffId, invocation, poolInstanceId,
workerGeneration and spawn ordinal; attach PID only when fork returns it. Observer
identity also includes role and observer instance. Distinguish multiple pools,
same-process runner/parent roles, PID reuse, failed forks and crash retries.
The existing full job/dispatch/original/body/assembly/variant/strict/retry joins
remain unchanged and independent of this lifecycle graph.

Resolve a deterministic safe phase path and report-slot identity from that
inventory. Startup must receive worker pool/generation/participant identity
before any job; pass bounded primitive diagnostic-only fork environment fields
when ON. Do not use an extra ready/result IPC message. Do not infer ordinal
from observed filenames or assume two separately loaded module counters agree.
Retain process-scoped null startup identity compatibility. Root must review the
precise environment schema/path mapping before a source seam is applied.

Inventory/reporting is finite but is not automatically trustworthy. A spawning
process's final inventory needs its own external witness and checked source
provenance. Missing supervisor report/witness leaves its descendant inventory
unsealed/UNKNOWN, not zero children. The manifest's positive role/count floor
must reject a missing runner or parent even if no sidecar exists.

Important unresolved edge: no reviewed direct-parent witness of the Vitest
execution fork was found in the selected sources. CLI close, PPID, a self-report,
pipe EOF, or absence from a process listing is not a substitute. Initial Sol
scope must represent this edge as unavailable. Before any whole-packet COMPLETE
claim, root must identify and approve a bounded hook at the actual pinned Vitest
spawn owner, or supply another demonstrably equivalent external witness. Do not
patch dependencies, monkey-patch child_process, add preload hooks, change Vitest
pool mode, poll processes, or introduce an OS tracing service under this plan.
If no narrow witness can be approved, retain partial evidence and NOT READY.

## Collection route and nonrecursive custody

Proposed route: one new private final-envelope file per reporting OS process,
written once at its existing natural process exit callback, plus one final
external-controller envelope after its reviewed child lifecycle settles. It
contains bounded observer post-close snapshots, the sealed logical inventory,
and bounded direct-child witness states. There is no new result IPC, telemetry
socket, per-phase/per-lifecycle-event file write, live append log, timer, poll,
fsync, shared lock or background collector process. Existing phase sidecar
records remain as designed; this restriction concerns the NEW receipt collector.

Register observer references and logical slots when created; take the actual
post-close snapshot only after that observer's existing close site. Keep it in
bounded process-local state. At natural process exit, copy final snapshots and
child witness summaries into the one envelope. An observer already disabled or
failed remains explicitly failed. A still-open observer is unavailable/incomplete;
the reporter must not close it early or synthesize process.terminal. If the
process dies before writing, its expected envelope is absent and proof unknown.

Use captured operations and null-prototype primitive records; never traverse
test values, serialize foreign errors, invoke getters/proxies or consult poisoned
Array/Object/JSON methods. Every producer snapshot binds its exact participant,
phase path, role/PID, run/epoch/diff, counts, bytes, cost and fixtureOnly stamp.
The worker-authored snapshot is a report under the pinned instrument's trust
boundary, not cryptographic authentication of an adversarial test process.

Envelope publication: preassigned fresh private directory/path, exclusive
no-follow creation and one bounded write/one close attempt. A write/short-write
failure produces no success claim and no retries. The writer cannot certify its
own envelope file close in that same envelope. Stop proof recursion here:
the external reader requires independent process lifecycle evidence and physically
reads a stable bounded regular file (owner/mode/link/inode/size/UTF-8/schema), then
pins its bytes. This attests receipt availability/integrity after observed process
termination; it does NOT attest successful writer close of the receipt file or
power-loss durability. These claims are unnecessary and must not be invented.

The controller's own final artifact is the explicit root-review boundary, not
another diagnostic participant demanding an infinite receipt chain. Root's tool
terminal plus independent full readback/hash establishes custody of this final
artifact. No output file or tool's successful print alone proves descendants
finished. Missing controller terminal means overall admission unavailable.

## Direct-child witness implementation contract

New helper API names are proposals: registerExpectedObserver, captureObserverClose,
watchChild, restoreWitnessListeners, sealPoolInventory, finalizeProcessReport,
readExternalCloseReceipts. Keep collection/inventory and offline joining in a
separate module from the existing phase serializer. Return typed diagnostic
states; runtime observation failures must not escape into conformance handling.

watchChild binds the concrete ChildProcess object plus immutable generation and
launch token. Capture exit code/signal, close code/signal, first error category,
and counters/flags for observed events in fixed slots. Do not retain full event
arrays, Error objects, chunks, child histories or mutable ForkState references.
Never use state.active or current state.proc later to identify an old child.

Attach bounded listeners as soon as the actual fork returns. At BOTH existing
removeAllListeners sites (respawn and shutdown), restore only this concrete
child's diagnostic listeners immediately afterward, ON only and before the
existing kill call. Do not preserve/reinstall result or recovery listeners, or
change their order, guards or number. If exit was already observed at the failure
callback, retain it and only await the naturally emitted close; do not install a
duplicate exit record. One terminal observation per event slot; contradictions
or duplicates are diagnostic errors, not last-write-wins updates.

No new await/promise in shutdown, dispatch, result, failure or recycle. No delay
waiting for reports, readiness or pipe drain before the existing action. The
collector's callbacks only update bounded memory; they cannot call dispatch,
resolve jobs, clear timers, respawn, kill, change process.exitCode or alter IPC.
Listener registration itself must be nonthrowing at the seam. Diagnostic OFF
adds no listeners, env fields, file/clock/hash work, process references or exit
hooks; check exact OFF behavior against the existing uninstrumented seam.

Streams are transport-specific facts. Direct CLI stdout/stderr use the existing
reader's end (EOF), close and error events. A stream close is not an EOF; process
exit is not process close; an error or a retained inherited writer can prevent
complete drainage. For pool workers stdout is a pipe with no reader in the
selected pool source: passive end/close/error listeners must NOT resume, drain,
set encoding or add a data listener and change backpressure. If EOF is unavailable,
say so. Worker stderr is inherited: record NOT_INDIVIDUALLY_OBSERVABLE and link
to the enclosing captured stream's later evidence; never mark a nonexistent
worker stderr reader EOF. Stdin is writable and IPC is not a read-log stream.
Do not pretend each descriptor has the same end/close contract.

The receipt envelope records missing applicable stream evidence distinctly from
an explicit inherited/not-applicable transport fact. Root must freeze the required
stream policy before admission. If it requires worker-stdout EOF not observable
under passive unchanged flow, COMPLETE is unavailable; changing flow is separate
scope. No promise is kept alive to wait indefinitely; at report finalization an
unobserved event stays missing. A later external read may only consume evidence
actually persisted by a live witness, never retrospectively invent it.

## Bounds, offline join and failure behavior

Proposed finite caps for root review, not measured admissibility: at most 64
observer-file slots per packet (matching the current reader ceiling), at most
64 process slots, at most 64 direct-child records total, 64 KiB per final envelope,
and 1 MiB total receipt bytes. Keep existing phase cap 8 MiB aggregate, 2 KiB per
record and 96 records/192 KiB per attempt. Logical fields use fixed lengths and
fixed stream slots. Maxima are not expected counts; exact floors come from the
reviewed launch graph and actual sealed fork-request inventory.

On a capacity overflow, set a sticky incomplete reason and saturating dropped
counter; do not allocate another entry, append unlimited errors, silently evict
an old generation, stop the real fork, or change retry behavior. Existing bounded
participants may still settle. A fixed final-report error slot is reserved.
Any overflow anywhere invalidates complete packet admission even if the surviving
subset looks clean. A single-process receipt holding 64 entries may exceed its
byte cap: reject explicitly rather than assuming the count cap guarantees bytes.

Offline collect only after root's reviewed external terminal gate. Enumerate
expected paths from the manifest and sealed inventories, never promote whatever
files happened to be found into the expected set. If auditing extras, use bounded
directory enumeration and stop with overflow/UNKNOWN, not an unbounded scan.
Require exact uniqueness/cardinality, run/epoch/source/participant/path bindings,
safe files, schema versions, real-vs-fixture provenance and stable readback.
Reject duplicate snapshots, invented/missing roles, old-run reused envelopes,
stale generation/PID joins, extra files, conflicting status and short/truncated
reports. The actual snapshot.file and fixtureOnly must agree with the participant
and read phase records. Require code/signal consistency where both exit and close
were actually observed; a missing event is not replaced by the other.

Only evidence that satisfies all external prerequisites can supply production
`closeStatuses: [{path,snapshot}]` to the existing validator. Preserve a separate
inspection result with unavailable/failed receipt reasons and existing open-phase
trails when admission fails; do not discard useful censored evidence or fill
successful placeholders. Expose separate booleans/statuses for inventory sealed,
external lifecycle witnessed, producer close reported, streams accounted and
phase packet admitted. A witnessed SIGTERM/SIGKILL is not clean producer close,
even if a stale terminal marker or earlier snapshot exists.

No lifecycle timestamp subtraction across processes. Monotonic witness times
belong to the witness process; worker marker times to the worker. UTC is only
provenance. New collection cost is outside per-job phase self-time where true,
but callbacks/allocation/final I/O can still perturb scheduling and whole-process
duration. Do not claim that observerSelfNs includes them or subtract from budgets.

## Minimal later ownership and ordered implementation

Root allocates/updates a normal issue, records this plan and current owners, and
gives the GPT-6.1 Sol implementer its own isolated checkout. Do not assign HELPER,
SEAMS, EXEC or this PLAN checkout as a second writer to active peer-owned files.
Existing helper/seam custody must be transferred explicitly before modifications.
Source-only output can be a new contextual patch and handoff until integration
is authorized; do not apply to EXEC or mutate the frozen pristine recorder.

Proposed smallest source responsibility:

1. NEW `scripts/lib/test262-job-phase-close-receipts.mjs`: bounded registry,
   envelope producer, passive direct-child witness and offline admission bridge.
2. Narrow changes to `scripts/lib/test262-job-phase-observation.mjs`: explicit
   participant/path binding and access to actual post-close snapshots. Retain
   all current error, poison, hash and close semantics; no recursive close proof.
3. Narrow lifecycle integration patch for `scripts/compiler-pool.ts`,
   `scripts/test262-worker.mjs`, `tests/test262-shared.ts`: registration, the
   existing close points, immutable child inventory and two listener restoration
   sites. `scripts/test262-import-object.mjs` needs NO additional collector edits.
4. NEW `tests/diagnostics/es2015-job-phase-close-receipts.test.ts` and a tiny NEW
   `tests/fixtures/es2015-job-phase-close-child.mjs`, naming finalized with issue
   allocation. Add existing helper-test assertions only after ownership transfer.
5. NEW isolated `.tmp/es2015-job-phase-close-receipts-handoff-sol61.md` and, if
   integration is held, a new patch file. A separate diagnostic launcher adapter
   is root-owned follow-up; exact nested Vitest seam remains unassigned/unreviewed.

Implementation sequence: freeze pins/ownership; define schema and caps; implement
pure bounded inventory/reducer and offline refusal first; add once-only final
reporting at actual close/exit boundaries; add passive pool witness and restoration
patch; write adversarial fixtures; perform complete source readback/diff audit;
deliver separate hashes and list each unresolved topology/admission dependency.
No source implementation claims to finish missing launch schema, variant assembly
pins, nested Vitest witness or external execution authority by inventing values.

## Planned controls, all UNRUN

The existing 21 helper unit registrations are source only. The following controls
are a proposed implementation/verification set, not created tests or results:

- Positive real-file fixture: natural child exit after actual close snapshot;
  parent sees consistent exit/close, captured streams EOF/close, exact nonempty
  inventory and post-termination stable envelope read; known parent/worker trace
  join passes. Mock fixtures remain fixtureOnly and cannot earn real admission.
- A terminal phase line followed by close error; close() invoked but no final
  report; earlier snapshot reused after later failure; matching bytes/counts but
  wrong snapshot.file/role/generation/fixture stamp. All must refuse completeness.
- Spawn throw/error before PID, exit-before-ready, result-before-exit, exit before
  close, stream close without EOF, stream error, descendants retaining output,
  missing nested-runner witness, missing supervisor envelope and missing worker
  envelope. Positive CLI terminal cannot erase any of these gaps.
- Respawn from response recycle, error recovery and deadline; shutdown with idle
  and active worker. Removed listeners restored once to the OLD ChildProcess;
  no stale callback attributed to new generation, no duplicate recovery, no result
  payload change, queue/deadline/retry/kill actions exactly preserved. These use
  synthetic fixture children only when root grants execution; no live test kills.
- Default signal death and SIGKILL fixture: external termination may be witnessed,
  producer final close remains unavailable and spans right-censored. A signal
  handler added solely to make this pass is forbidden. Test both absent and stale
  successful reports; neither allows killed participant clean admission.
- Duplicate participant tokens, role omitted, extra process/file, repeated PID
  with new generation, same job ID after crash, unexpected late fork, unsealed
  inventory, zero expected count and all-receipts-missing. No vacuous COMPLETE.
- Bounds at limit and limit+1 for participants, generations, bytes, strings,
  errors and directory extras; sticky overflow, bounded memory, bounded writes,
  no mutation of canonical results or stopping ordinary process creation.
- Envelope short write/write/close failure, unsafe path/symlink/hardlink, existing
  exclusive filename, swapped inode, concurrent growth/truncation, invalid UTF-8,
  malformed/trailing data, stale run and fixture-only file supplied as real.
- Poisoned JSON/Object/Array/String primitives and foreign thrown getters;
  diagnostic failures stay contained. OFF with malformed config performs zero
  collector registration/listener/file/hash/clock/env work; zero retained child
  references and no additional hooks. Passive worker stdout never enters flowing
  mode because of the collector. No receipt event touches result IPC.

Source inspection may reject impossible assumptions before tests run. Actual
registered/executed/passed/failed/skipped counts must be recorded from root's
later execution, including failures; do not derive acceptance from test names.
Syntax/types, real-file protocol, child lifecycle, integration, listener parity,
bounded memory, captured poisoning behavior and terminal custody are UNVERIFIED.

## Execution, handoff and future PR readiness

Root alone releases any test/parser/compiler execution after census session 62071
is naturally terminal, or explicitly user-authorized stop AND actual terminal,
and the heavy slot is free. No automatic restart or instrumentation of that run.
Source-only Sol preparation is distinct from this execution release.

After reviewed fixtures and integration, finish pristine packet evidence first,
then require pristine versus I-OFF parity for both A and B before I-ON admission.
Use the same original/harness/actual variant bytes, source and bundle epochs,
provider artifacts, worker history/count, strict policy, heap/TZ/canary and
30,000/10,000 ms job / 90,000 ms callback budgets. Root sets the finite run ceiling.
The preceding plan's <=10 ms observer self-time and <=1% paired median wall
increase are proposed, unmeasured targets, not facts; collector cost needs its
own accounting and cannot be hidden in finalization. Any result flip, missing
receipt, overhead excess or inadequate witness yields perturbed/inconclusive
diagnostics with retained negatives. OFF parity and ON overhead are ALL UNRUN.

Handoff must include the new issue title/ID when allocated, ownership boundaries,
actual checkout/HEAD, complete changed-file list, input and output hashes/line
counts, full readback confirmation, schema/caps, exact test-source inventory,
all actual execution receipts, and every remaining UNKNOWN. The initial handoff
must explicitly say nested Vitest witness unresolved and natural signal shutdown
can leave final producer snapshots unavailable unless later evidence changes it.

PR readiness requires root-reviewed source integration, meaningful executed
controls, OFF parity, ON perturbation evidence, external inventory/lifecycle
coverage and honest admission semantics. Ready-for-review source is not complete
real-packet evidence. Do not open a ready PR or close the tracking issue based on
this plan or unrun source fixtures. This diagnostic work is excluded from any
conformance/performance-fix PR. Any eventual commit verifies Thomas Tränkler
<git@thomas.traenkler.com> as author, uses a specific conventional subject/body,
Codex co-author and actual model/effort trailer; no commit is made by this task.

Final planning status: production collector UNIMPLEMENTED; reviewed external
runner-process witness UNAVAILABLE; assembly/launcher admission still pending;
all validation and cost measurements UNRUN; complete diagnostic packet NOT READY.
Lifecycle and right-censored evidence can be retained without changing a single
canonical verdict or claiming a timeout cause. The full ES2015 goal remains open.
