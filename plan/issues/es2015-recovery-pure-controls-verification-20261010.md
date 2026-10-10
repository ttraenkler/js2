---
title: ES2015 interrupted-census recovery pure-control verification
status: in-progress
date: 2026-10-10
---

# Scope and actual result

Root explicitly authorized one finite synthetic control invocation after full
source review of the906-line observer,183-line controls and640-line maintained
completeness validator. No worker was authorized to run tests. No compiler,
provider probe, Vitest, Test262 census, build or production test was launched.

The control invocation returned exit0 in0.263seconds, with a JSON receipt:
`schema=es2015-recovery-pure-controls-v1`, `fixtureOnly=true`,
`syntheticOriginals=32`, `productionOriginalsTested=0`, `conformanceCredit=0`.
All4 positive and35 intentional rejection checks completed. Missing the named
guard or accepting a deliberately invalid fixture would have failed the driver.
This verifies the synthetic recovery helpers, not production runtime semantics.

## Exact inputs and command

Execution cwd:
`/Users/thomas/.codex/worktrees/6878-boolean-property-carrier-sol61/js2`.

Command:

```text
/Users/thomas/Code/js2/.codex-worktrees/6878-delete-result-boolean-sol61/.tmp/private-runtime/node/bin/node --max-old-space-size=1024 /Users/thomas/.codex/worktrees/6878-boolean-property-carrier-sol61/js2/.tmp/es2015-interrupted-census-recovery-controls-sol61-20261010.mjs
```

Node independently reportsv24.19.0; executableSHA256
`7f9f8346011946e63956e45d1860cc409631802529e8cb18a0c86eed2ff5bf2e`.
ControlSHA256
`70880ea9fa51a96f9fef574d2df11621b3930e07bd5686da861c0a714f7cf7e5`;
imported observerSHA256
`420885dcfd7eff379731c227aba706f840aebf19bf6aafd15aa10985a2fe7482`;
maintained validatorSHA256
`e34146d2eca4ab4078da51e336f65026387d278c7d58d4edd8c02cde41edf6fb`.
Validator and observer main are direct-invocation guarded; their CLI/probe did
not execute when imported. The validator imports only filesystem/URL utilities,
not the compiler. Tool output retains the complete named check list; no durable
child exit/close/EOF manifest was captured, so do not claim that stronger proof.

## Covered checks

Positive checks:16 disjoint mixed-timestamp manifests accepted by the maintained
evaluator; status-independent old/new row selection; provenance-only additions
with semantic fields preserved; strict distinct recovery configuration.

Rejection checks: missing/duplicate shards, empty timestamps, wrong shard total/
target, missing/duplicate/unexpected canonical identities, unsettled callbacks,
duplicate/unexpected interrupted rows, missing EOF, signaled terminal, raw-row
disagreement, missing after-epoch, exclusions, wrong lane, cherry-picked/changed
union bytes, truncated JSONL, changed provenance/source/dependencies/provider,
unknown/missing projection fields, dirty source, absent process evidence, reused
run/output, wrong replay indices, unknown configuration fields, changed private
runtime path and cloud physical relocation.

## Remaining implementation and verification

- Timing provenance/partition and positive/malformed process-measurement fixture
  coverage gaps remain; see cloud handoff source review. Add focused controls
  without weakening admission or changing production runner/provider policy.
- Materialize the reviewed32-identity packet in a fresh owned fixture directory
  and run the unchanged maintained validator CLI separately, preserving actual
  natural terminal/stdout/stderr. That CLI remains UNRUN in this receipt.
- No actual recovery configuration, fresh cloud admission, nine-shard replay,
  complete union or full11778/74Intl census was tested here.
- Primitive tag controls remain UNRUN; source preparation and this pure-helper
  execution neither settle issue6770 nor release its author's ownership.

The active100% standalone goal remains unachieved. Historical canonical rows,
all stopped-run evidence and dirty primary/user work must remain preserved.

## Maintained CLI fixture verification completed

Root created and fully read the finite driver
`.tmp/es2015-recovery-maintained-cli-fixture-root-20261010.mjs` in the carrier
preparation worktree; SHA256
`f2a3b91da8d010da56283323732de62811b82cf45a614b16e07e04417f0374bc`.
It materializes only the reviewed synthetic fixture packet and invokes the
unchanged validator twice, sequentially, with the same privateNode/1024MiB.
The initial sandbox invocation failed atmkdtemp withEPERM before creating the
fixture or launching a child. Approved scoped escalation then returned exit0.

Output directory:
`/Users/thomas/.codex/worktrees/6878-boolean-property-carrier-sol61/js2/.tmp/es2015-recovery-cli-fixture-root-20261010-4Hre7X`.
ReceiptSHA256
`7e082f4716c3949e918854131626b44d52088070cacc278e9a2f720fbb9c8a13`.
Root read both complete terminal manifests and actual stdout/stderr:

- Full16-shard/32-identity fixture: childPID62926, exit/close0, null signals,
  stdout74bytes `COMPLETE: 16 shard(s), 32 verdicts, 32 registered
  (0 explicit exclusions)`, stderr0bytes.
- Same fixture with the final manifest argument omitted: childPID62927,
  exit/close2, null signals, stdout0bytes, stderr618bytes. Actual diagnostics
  include missing-shard-manifest (15 versus16), scope mismatch (30 versus32),
  two unexpected identities and physical/unique count mismatches.

Both streams in both runs reached EOF/close without errors; terminal records
prove natural completion. The receipt pins every generated input and the
unchanged maintained validator. This supersedes CLI UNRUN only for these two
synthetic cases. Actual recovery/config/provider/compiler/production originals
remain untested, with zero conformance credit. Preserve the ignored driver,
output directory and receipt explicitly for cloud transfer; none is in Git.

## Follow-up guard/control implementation dispatched

A finite Sol6.1 High worker owns only the two existing recovery scratch
modules and their worker handoff in the isolated carrier preparation worktree.
It is strengthening process proof against malformed asserted measurement flags
and adding pure timing/partition guard controls. No execution, Git/GH mutation,
production edit, process control or runner/provider changes are authorized.
Root alone decides subsequent verification after full source review.

Worker verified actual branch/HEAD/start hashes, read the historical launch
and original sampler source, and reported that observed row fields already
include readback, execRealpath, heapMiB, command, semanticEnvironment and measured.
Its available historical directory listing contained no process-sample files.
Do not manufacture those missing observations or infer measurement from a
configured heap. Explicit per-shard historical/recovery launch context is to
validate any available actual samples; missing proof remains UNKNOWN.

Earlier passing helper/CLI receipts remain evidence for their exact old input
hashes only. New modified guards/controls will be UNRUN until root verifies them.

### Revised pure-control invocation: fixture failure observed

Worker froze observer965lines SHA256
`f1dabc827ce46741ad252cada886d82959665c6cbb34ba0d57f9fc6e8a42ff5e`,
controls262lines SHA256
`3860f246d6fb46d96f6c74ee961226ede602c0b804e89c291d6d246bfeeb297c`,
handoffSHA256
`4a6ef23248df1120b468c170c4383e898d40ce7a2173e070140e62414945b919`.
Root read changed helpers/context callers, the full262-line controls and full
worker handoff, independently checked hashes, then invoked the pure driver
with the same privateNode/1024MiB as above. It exited2, not passing:

```text
partition membership disagrees with historical completion: expected guard shard-scope, observed raw-identity
```

Source attribution: fixture manifests use `registeredPaths:paths`, sharing the
partition arrays. The new negative swaps partition entries, thereby also
changing manifest registration and masking the intended membership mismatch.
The downstream raw identity guard rejects it, but this is not verification of
the intended shard-scope guard. Root sent the original worker a source-only
repair: separate fixture arrays before the mutation; preserve guard expectations
and all production admission behavior. No successful7/60 result is claimed.
The failed invocation launched no compiler/provider/census/production original.

### Repaired revised controls passed

Worker froze the one-line fixture repair `registeredPaths:[...paths]`.
Root read the repair and updated handoff and independently verified current
observerSHA256`f1dabc827ce46741ad252cada886d82959665c6cbb34ba0d57f9fc6e8a42ff5e`
and controlsSHA256
`83bd0a92c998b328015e32253c68cbc40b6ebe59016d5b71f00ecbccb0afa98f`.
Worker handoffSHA256
`1e73eeeb94ebdba713a42e2084ea14af9720022610d69ae7a98898c0e5714246`.
Root reran the same privateNode/1024MiB pure-driver command; actual exit0 in
1.047seconds, complete JSON list of7 positives and60 named rejection checks.
The previously failing partition case now specifically reaches `shard-scope`.
All newly added process/context/timing controls passed their stated guards.
FixtureOnlytrue, syntheticOriginals32, productionOriginalsTested0,
conformanceCredit0. The successful run does not erase the prior failure.

This supersedes UNRUN for current pure helper controls only. Revised observer
main, actual process sampling, production admission/census and current regenerated
CLI fixture remain unexecuted. Earlier unchanged-validator CLI receipts remain
historical for their actual fixture bytes. No original/production result or
100% verification was produced. Missing historical OS samples remain UNKNOWN.

## Read-only same-machine historical pin preflight

Root read the actual old launch/admission records and confirmed the frozen
execution checkout has no tracked HEAD diff under src/scripts/tests. Root then
ran a filesystem-data-only Node scan against the saved whole `before.epoch.json`,
using the frozen execution worktree's private runtime and1024MiB heap. No
compiler/provider import, test, file write, build or new census was involved.
Actual session19198 completed with exit0; no restart was attempted while live.

Scope: old source, runnerAndScripts, testsAndOracle, dependencies, runtime,
packageInputs, harness, licenses and provenance arrays. For each pinned file,
compare every recorded pin field against current path/realpath/byte count/mode/
nlink/SHA256; for recorded symlinks compare link target and mode. Result:
**65,706 file-pin entries and2,205 link entries;0 mismatches/errors**.
These are entries (including repeated provenance), not unique source files or
tests. Recorded HEAD38901fff8f9a5ca029cbefcdaec5d8dd40949861.

This is positive same-machine preservation evidence, not full admission:
new/unrecorded directory entries were not scanned; current fresh-process provider
selection was not probed; no canonical corpus-content traversal, active executor
lease or actual recovery launch configuration was validated. Those remaining
checks must precede same-machine recovery. Cloud relocation still requires its
own physical admission; these old path-specific pins cannot be transplanted.
All historical failures and missing OS sample evidence remain unchanged.

### Input population and fresh provider-selection preflight

Root subsequently traversed physical file/link membership against the recorded
before-epoch sets; session66630 naturally returned exit0. No additions/missing
entries in any checked root: source1902, scripts376, tests5619, dependencies31782,
private runtime9705, harness45. Dependency output exclusions remained exactly
`.vite`, `.vite-temp`, `.cache`; no new exclusions were introduced. These are
input counts, not Test262 verdicts. Combined with the preceding pin comparison,
this addresses both preserved bytes/metadata and added/missing input populations
within those six roots. Actual corpus originals still need their content check.

Root then explicitly authorized only the reviewed observer's fresh-process
`--probe` branch from the frozen EXEC cwd, using privateNodev24.19.0/1024MiB.
It exited0 and reported QuickJS/default selection, compiler-input key
`5ec107218556a1e9`, direct-worker-bundle key`da797130b6734b8d`, artifact key
`04a9abfac8350642`, adapter key`45807795114005bc`, artifactSHA256
`95333826e7c8c8ed7398203891db713dc44368c86a24dae6fe6da7d3004fa36c`.
Actual process execRealpath/cwd matched frozen EXEC; execArgv exactly1024MiB,
semanticEnvironment empty, TZUTC. The recorded original launch/admission has
the same compiler and worker keys. No provider build, compiler worker, test,
semantic canary, census or real recovery main was launched. Selection/key
readback is not new runtime execution proof or a completed recovery admission.

Keep historical failures and missing process proof unchanged. Actual full
corpus content/identity, complete recovery config/history inventory, exclusive
executor admission and all main guards must still be verified before launch.
Cloud needs its own physical admission and cannot inherit these local paths.

### Full original corpus data verification

Root fully read the maintained exact-manifest reader before importing its
data-only function. Using the frozen privateNode/1024MiB and exact manifest,
resolve all selected originals under the recorded canonical root; require each
actual realpath to equal canonical-root/identity, then digest identity,NUL,
original bytes,NUL in maintained manifest order. Session39189 naturally exited0:

- 11,778 selected and11,778 unique originals; all74 Intl identities present.
- 17,102,629 original bytes.
- Content digest`ab85233299173b8f73f91120737cc3bdf1bc357f251d04a82fead8ada59ba028`.
- ManifestSHA256`632db3bbecb0d6ea42b0915b13740912bf3fd8e32e2a15a8b28c1f63b6434360`.
- Canonical root`/Users/thomas/Code/js2/test262`; independent gitHEAD read
  `b363f29d3c43c626dc852744ad64a0b48a003693`.

Counts, byte count, digest and original realpaths matched the saved epoch.
This closes the original content/identity preflight gap, not a single test
verdict. Zero originals were executed; fullAdmissionVerified remains false.
Complete separately pinned recovery config/history inventory, executor lease
and actual observer admission still precede any launch. No historical result
or ownership handover was changed by this read-only validation.

## Concrete recovery configuration prepared, not launched

Root created/read the data-only preparation script in frozen EXEC:
`.tmp/6878-preparation/es2015-prepare-recovery-launch-root-20261010.mjs`,
SHA256`99f4cfef94c18ed3acd1abc769d27ad1e28828e76fded89d4ad039aaa76307f6`.
It copies the actual old semantic configuration, pins old observer/canonical/
epoch/admission/seven completion files and inventories the whole historical
output directory. No provider/test/compiler/observer main is called. Both before
write and generated-file readback use the reviewed strict recovery config guard.
Exclusive `wx` and fresh random run ID prevent overwriting any prior evidence.

Actual preparation invocation exited0 and generated43149bytes, mode0644,
nlink1, SHA256`68131c976d100bff9f9ddc3627338e24ffcd6715c926252d1c5c20709ec2a188`:
`.tmp/6878-preparation/es2015-recovery-20261010-root-abb62950-06f4-435a-a257-fa2ef3110ec8-launch.json`.
Run ID`es2015-recovery-20261010-root-abb62950-06f4-435a-a257-fa2ef3110ec8`;
future output under EXEC `.tmp/es2015-interrupted-census-recovery-` plus that ID.
Seven completed old shards and67 historical output entries are pinned;
recovery indices exactly7–15. Full original population and policies unchanged.

This artifact is generated configuration, not an execution receipt. Future
output and canonical targets were absent at preparation. Root read its base,
historical pins/completions and reviewed deterministic inventory construction;
actual full observer history/raw/epoch/callback admission has NOT yet run.
No executor lease or launch is implied, no original result added. Transfer this
ignored config and preparation script explicitly; its absolute old-machine
physical paths are not usable as cloud admission without fresh truthful review.
