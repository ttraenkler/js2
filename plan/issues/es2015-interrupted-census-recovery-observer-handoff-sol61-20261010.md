---
title: Source-only recovery observer for interrupted ES2015 census
status: in-progress
date: 2026-10-10
owner: Sol 6.1; root owns review, integration and execution
---

Preparation is restricted to this handoff and the two separately named recovery observer/control scratch files in this worktree. No production changes, execution, Git mutation, PR, claim, process control or transfer is authorized in this phase. The current changed code and all syntax checks remain UNRUN by this worker; earlier root verification is recorded separately below.

The historical absolute Documents memory directory was absent. Read the assigned worktree's AGENTS, repository MEMORY and relevant Test262, shared-reader/mutator, preservation, cleanup and silent-empty memories instead. Root's explicit isolated preparation and execution pause govern this phase.

Read all 74 lines of the reviewed Astra recovery plan (SHA256 25d00478cd9f2a0a6246f26b7ee9a3de122058b99e7e126b71e9b809b1b349a6), all 491 lines of the original observer (SHA256 14019f4658aa2bd54dc8fad5b558b99484a1b7bbd57ae922c6a5f0950c17cdfd), the maintained completeness validator (SHA256 e34146d2eca4ab4078da51e336f65026387d278c7d58d4edd8c02cde41edf6fb), original launch configuration and the full cloud handoff (335 lines at readback; SHA256 94800cccc538c041223845463508e7aea2ce86f73886641234975f71c2e77e8b). The cloud handoff may subsequently receive root updates.

Initial isolated checkout: /Users/thomas/.codex/worktrees/6878-boolean-property-carrier-sol61/js2, branch codex/6878-boolean-property-carrier-sol61, HEAD 56c33d1a3246191cfe8b466d83e937b7c354e475. Existing peer source, test, script, Markdown and scratch changes remain owned by peers and are preserved.

## Finite process and timing revision

Source-only revision adds no sampler fields and performs no OS observation. The original sampler source and historical `shard-0.launch.json` were read: process rows already record `command`, `role`, `readback`, `execRealpath`, `heapMiB`, `semanticEnvironment` and `measured`; samples record `name` and `rootPid`. The available original output listing contains no process-sample files. That absence remains UNKNOWN and cannot be filled by launch configuration, the synthetic fixtures, native evidence with an unknown schema, or a new attempt.

`requireProcessProof(samples, indices, contexts)` now receives expected context from separately admitted launch records. Historical context is retained only after existing launch/terminal/command/environment checks; recovery context is captured alongside the actual new launch. Admission checks the recorded root PID, executable and command, inferred role, one explicit argv heap matching the role and numeric recorded heap, `OBSERVED` status, `measured === true`, and every expected semantic environment entry including run ID, actual logical index and exact manifest path. Missing fields, wrong roles/heaps/executables/semantic fields and forbidden overrides cannot pass by setting the measured flag. The existing sampler and UNKNOWN final-receipt behavior are unchanged. Extra Vitest worker metadata may exist; it does not replace any expected policy entry.

`verifyHistoricalTimingPin` exposes the existing full selected historical timing-pin comparison. Main still requires the selected maintained timing file, requires its receipt in `oldEpoch.testsAndOracle`, calls physical `verify(historicalTiming)`, and compares the entire current physical pin. No hash-only waiver or fallback was introduced. `verifyBalancedMembership` extracts the existing sorted exact membership comparison used by reconciliation and retains its `shard-scope` rejection. The balanced assignment algorithm, exact manifest, historical population bounds, corpus/oracle/provider policies and maintained completeness validator are unchanged.

Added source controls: 3 positives (recorded synthetic process fields across distinct old/new contexts, exact historical timing pin, and a hand-derived weighted balanced partition with default 250 ms) plus 25 intended rejections (20 process/context cases, 3 timing receipt/pin cases, 2 wrong-membership cases). Total authored control count is now 7 positives and 60 intended rejections over 32 synthetic identities, 0 production originals and 0 conformance credit. These counts describe source cases, not completed execution results; root's failed attempt is recorded below. Current repaired controls and any regenerated maintained CLI packet remain UNRUN. Observer main, syntax, compiler/provider/Vitest/census/build/install/typecheck/formatter/hooks/profiling remain UNRUN. Direct-main import guards remain intact; importing the scratch modules adds no observation, provider probe or launch.

Current readback: observer 965 lines, SHA256 `f1dabc827ce46741ad252cada886d82959665c6cbb34ba0d57f9fc6e8a42ff5e`; repaired controls 262 lines, SHA256 `83bd0a92c998b328015e32253c68cbc40b6ebe59016d5b71f00ecbccb0afa98f`. Source is frozen for root's next review and finite rerun decision.

## Root failure and one-line fixture repair

Root reports one finite revised-control invocation with private Node v24.19.0 and `--max-old-space-size=1024`, after confirming observer SHA256 `f1dabc827ce46741ad252cada886d82959665c6cbb34ba0d57f9fc6e8a42ff5e` and pre-repair controls SHA256 `3860f246d6fb46d96f6c74ee961226ede602c0b804e89c291d6d246bfeeb297c`. It returned exit 2: `partition membership disagrees with historical completion: expected guard shard-scope, observed raw-identity`. This is a reported failed control invocation, not a pass or census result.

Cause: `fixture()` assigned `registeredPaths:paths`, sharing each manifest's registration array with its partition vector. The intended negative swapped partition membership but also silently changed the manifest, bypassing the scope mismatch and reaching raw assertion identity disagreement. The only code repair is `registeredPaths:[...paths]` at controls line 41. Each manifest now owns an independent registration array; mutating the partition leaves historical completion membership intact. Expected `shard-scope`, observer guards, original counts and all acceptance rules are unchanged. This worker performed only source reads/hash checks and the source/document patches; no rerun or other execution occurred.

## Earlier verification, not current-code verification

The root issue **ES2015 interrupted-census recovery pure-control verification** in the Astra planning worktree records an earlier successful synthetic invocation: 4 positives and 35 intended rejections, 32 synthetic identities, 0 production originals. Its inputs were observer SHA256 `420885dcfd7eff379731c227aba706f840aebf19bf6aafd15aa10985a2fe7482` and controls SHA256 `70880ea9fa51a96f9fef574d2df11621b3930e07bd5686da861c0a714f7cf7e5`, not the changed files above.

That issue also records the unchanged maintained CLI's prior synthetic positive (16 shards/32 identities, natural exit/close 0, stdout 74 bytes, stderr 0) and missing-manifest negative (natural exit/close 2, stdout 0, stderr 618 bytes), with actual EOF/close evidence. Root driver SHA256 remains `f2a3b91da8d010da56283323732de62811b82cf45a614b16e07e04417f0374bc`; existing CLI fixture receipt SHA256 remains `7e082f4716c3949e918854131626b44d52088070cacc278e9a2f720fbb9c8a13`. These earlier receipts remain preserved and establish no result for the new process/timing controls, real recovery admission or census.

Peer preservation checkpoint: tracked `src/codegen/declarations/object-shape-widening.ts` SHA256 `dfe2fc7caa45e6c708d6fce636be05ce27f3c473cb47012cccc434cf2ef593a6`; maintained validator `e34146d2eca4ab4078da51e336f65026387d278c7d58d4edd8c02cde41edf6fb`; shared runner `5049f6e291709b8f5043cad5649f9e549b09288923b451a2cf070c595c8d38df`; dynamic entry `31790087a77cecc5c532ca5e0492f1f9baaf14f577fc612fa6a966061ad33339`; exact-manifest helper `b44ae705d0b18683a520e2b2ce67f81875ff5430f264f1c379210edc7b942675`. No production input or previous output was edited by this worker.
