---
id: 3411
title: "Standalone lane cache poisoning in stale-base merge_groups — 4508/43469 host-import collapse parks innocent PRs"
status: in-progress
assignee: ttraenkler/opus-dev-a
sprint: current
priority: high
feasibility: medium
reasoning_effort: medium
task_type: bugfix
area: ci
language_feature: infrastructure
horizon: m
goal: ci-reliability
related: [2961, 2097, 1668, 2547, 3380, 1521]
origin: "2026-07-18 — fable-1 park diagnosis on PR #3327; byte-identical collapse also on #3322"
---

# #3411 — standalone lane cache poisoning in stale-base merge_groups

## Problem

`merge_group` runs built on a **stale base** collapse the STANDALONE test262
lane to a byte-identical **4,508 pass / 43,469 compile_error**, where EVERY
compile_error reads:

```
standalone target emitted host imports: env::console_log_externref, env::structuredClone (#2961)
```

i.e. HOST-lane wrapper import signatures recorded under the standalone lane.

This is **infrastructure poisoning, not a code regression** — the classic
identical-cluster-across-unrelated-PRs drift signature:

- **PR #3327** (S1 array-descriptor overlay) merge_group run `29631783983`:
  4,508 / 43,469.
- **PR #3322** (async-gen for-await destructuring, entirely unrelated)
  merge_group run `29632727762`: **byte-identical** 4,508 / 43,469, same message.
- **PR #3325**, fresh-based, PASSED the same hour on the same main tip.
- Local standalone probes on current main compile with **zero** host imports;
  the full issue suites pass. Those import names are not emitted by the
  standalone lowering for these tests.

The collapse correlates with STALE-BASE merge groups (a base that fell behind
as other PRs merged after enqueue); fresh-based groups pass.

## Impact — parks innocent PRs

The −38,000 standalone pass drop trips both the #2097 high-water floor and the
#1668 catastrophic-regression guard as if it were a genuine regression, so
`auto-park` (#2547) HOLD-labels the (innocent) PR. It then strands until a human
diagnoses the poison by hand. Two innocent PRs (#3327, #3322) were parked this
way on 2026-07-18.

## Root-cause hypothesis (under investigation)

The verdict is produced at compile+verify time by `standaloneHostImportError`
(`tests/test262-runner.ts`) / `tests/test262-shared.ts:683`, which flags a
would-be-pass whose `compileRecordMetadata.imports` contains `env::*` host
imports. In the failing runs the standalone binaries genuinely carry host
imports — a HOST-lane compile record surfaced in the standalone lane.

Candidate mechanisms (not yet pinned; the guard below mitigates regardless):

1. **Stale-base bundle artifact** — a `merge_group` built on a stale base
   compiles `scripts/compiler-bundle.mjs` from a tree that predates a
   standalone-import fix, or reuses a bundle whose `TEST262_BUNDLE_HASH`
   (#1521) collided across a host-configured build. The disk result cache is
   already lane-keyed (`tests/test262-shared.ts:158` includes
   `TEST262_TARGET`) and DISABLED in the sharded runner, so it is not the
   direct source.
2. **Scoped-restore lane mixing** — the #1521 path-scoped skip restores prior
   compile records for unaffected tests during report merge; if a restore ever
   drew host-lane records into the standalone merge set the same signature
   would appear. (The full `merge_group` runs unfiltered, so this is secondary.)

Follow-up for the infra owner: bisect a stale-base `merge_group` to confirm
which of (1)/(2) produces the host imports, then make the lane part of the
implicated cache/restore identity (or have stale-base groups bypass the
restore). This issue's PR ships the guard; the pinpoint fix can land
separately.

## Fix shipped in this PR — the CACHE-SUSPECT guard

`scripts/check-standalone-cache-poison.mjs` scans the merged standalone results
JSONL. When >90% of non-skip records are the #2961 host-import verdict (over a
corpus of ≥1000), it is the poison signature — no healthy standalone run has
~90% of its corpus as host-import failures — and it exits **3** with a loud
`CACHE-SUSPECT` diagnosis. Wired into `test262-sharded.yml` as a step that runs
**BEFORE** the #2097 floor and #1668 catastrophic guard, so a poisoned run
fails as clearly-labeled INFRASTRUCTURE (re-run the merge_group) instead of the
misleading −38k standalone "regression" that auto-park holds as real.

The guard is deliberately narrow:

- Only the exact #2961 host-import verdict counts (a genuine mass CE from any
  OTHER cause passes the guard, so real regressions still reach the real gates
  — covered by a test).
- A corpus below `--min-records` (default 1000) passes (too small to judge).
- A missing JSONL passes (the upstream merge step owns file presence).

## Acceptance criteria

- A standalone lane with >90% host-import CEs over a ≥1000 corpus fails the
  merge_group as CACHE-SUSPECT (exit 3) with a re-run instruction, ahead of the
  floor/#1668 guards. ✓ (`tests/issue-3411-cache-poison-guard.test.ts`)
- A healthy run, a below-min corpus, a missing file, and an unrelated mass-CE
  run all PASS the guard (no false CACHE-SUSPECT, real regressions not
  swallowed). ✓
- Root-cause of the host-import-in-standalone bundle/restore path identified
  and fixed (follow-up; the guard prevents the parking damage meanwhile).

## Phase 2 update (2026-07-18) — it is NOT stale-base; it corrupts the published baseline

New evidence: the **07:56 UTC FORCED baseline refresh was a `workflow_dispatch`
on FRESH main HEAD (no merge group)** and STILL produced the poisoned standalone
lane — **4,312 pass / 38,771 host-import CE, fail:0** — and force-**published**
it as the public baseline (which then made every downstream regression gate diff
against corrupt data). So:

- **The stale-base hypothesis is insufficient** — the poison reproduces on a
  fresh dispatch with no merge group.
- **The disk result cache is NOT the live vector**: `getCachePaths`
  (`tests/test262-shared.ts:155`) is lane-keyed (includes `TEST262_TARGET`) but
  the on-disk cache is **disabled** in the runner (never read/written; line 857
  "Cache disabled"). So `refresh-baseline.yml`'s lane-agnostic `restore-keys`
  fallback (`test262-cache-v2-<hashFiles>-`, missing `-<target>-`) restores a
  host-lane `.test262-cache` into a standalone shard, but the runner never reads
  it. (Worth tightening the restore-key to `-<matrix.target.name>-` as
  defense-in-depth against a future re-enable, but it is not the cause.)
- **Symptom points at the compile lane, not a cache**: 38,771 host-import CEs =
  essentially EVERY standalone compile emitted host imports, i.e.
  `TEST262_TARGET=standalone` is not reaching the actual compile (the compiler
  ran the host/gc lane). The pinpoint (the 07:56 Baseline Refresh run's
  standalone-shard logs — which target the workers actually compiled with) is
  the remaining root-cause thread.

### Shipped in phase 2 (this PR)

The guard is now also wired into **`refresh-baseline.yml`** (before the report
build / promote), because THAT workflow force-**promotes** — it is the last
line of defense against publishing a corrupt public baseline (worse than a
merge_group park). Additionally the standalone promote **sanity floor was raised
1000 → 10000**: the old floor let 4,312 through (the standalone lane runs
~24,000–25,000; anything below 10,000 is corruption, never a legitimate level).

## Source

fable-1 park diagnosis on PR #3327 (2026-07-18 ~08:30); byte-identical
collapse on PR #3322; the 07:56 fresh-dispatch publish collapse
(4,312/38,771). Guard + refresh-baseline wiring + floor raise authored by
opus-dev-a.
