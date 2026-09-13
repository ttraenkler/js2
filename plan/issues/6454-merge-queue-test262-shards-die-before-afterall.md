---
id: 6454
title: "Merge queue is wedged: every `merge_group` test262 shard dies before `afterAll`, so no PR can land"
status: ready
sprint: current
created: 2026-09-13
updated: 2026-09-13
priority: high
horizon: m
feasibility: medium
reasoning_effort: high
task_type: bug
area: ci
goal: correctness
---

## Problem

Every `merge_group` re-validation on 2026-09-13 fails `Test262 Sharded`, so
`auto-park` `hold`-labels the PR and **nothing merges**. This is not one PR's
regression — it is the whole queue.

Observed on three consecutive, unrelated PRs:

| PR | merge_group run | `Test262 Sharded` |
| --- | --- | --- |
| #5885 | 34739…544 (05:11Z), 05:15Z | failure |
| #5889 | 34739544544 (05:08Z) | failure |
| #5890 | 34739996390 (05:19Z), 05:22Z | failure |

**90 of 100 jobs fail, all with the same two lines:**

```
##[error]Test262 shard did not reach afterAll; refusing partial JSONL evidence
##[error]Process completed with exit code 2.
```

The shape says infra, not conformance:

- The vitest invocation lasts **~10 seconds** (05:21:11.85 → 05:21:21.61 on
  `test262 standalone shard 1/50`). A real shard is minutes.
- The **blob report is written** and vitest's exit code is accepted by the
  wrapper — so vitest ran and returned cleanly; it simply produced no
  `…​.shard-*.complete.json` completion marker, which is what the guard checks.
- Everything upstream of it is healthy in the log: the compiler and runtime
  bundles build (`18.0mb` / `17.8mb`, ~400 ms each), and the Temporal provider
  artifact downloads with a matching SHA256.
- Both the **js-host** and the **standalone** matrices fail, which rules out
  anything target-specific.

So the guard is doing its job — refusing partial evidence — and **no test262
verdict was ever produced.** Every `hold` it produced today is therefore
evidence-free: the park comments' own footer names exactly this case ("If it is
a setup/infra step rather than a verdict step, the verdict never ran and this
park may be spurious").

## Why this matters more than a normal red gate

`auto-enqueue` skips a `hold`-labelled PR, so each parked PR **strands** until a
human clears it — and clearing it just sends the PR back through the same
failing group. Work is accumulating behind a gate that is not measuring
anything.

## Acceptance criteria

1. Name the change that made `tests/test262-chunk-dynamic.test.ts` return in
   ~10 s without reaching `afterAll`, and when it landed (bisect over main
   between the last green `merge_group` and 2026-09-13 05:08Z).
2. The shard either runs to completion or fails with a message that says *why*
   collection produced nothing — a ten-second silent no-op that trips a
   downstream evidence guard is the expensive part of this incident.
3. Every PR parked by this outage is re-admitted once the queue is green, and
   each one's `hold` is removed only after confirming its own group passed.
4. Consider whether the completion-marker guard should distinguish "shard
   crashed" from "shard collected zero tests" — they need different responses,
   and today they produce the same message.

## Evidence

- Failing job log: <https://github.com/loopdive/js2/actions/runs/34739996390/job/103678140919>
- Same signature on an unrelated PR: <https://github.com/loopdive/js2/actions/runs/34739544544> (job 103676937051)
- Enumerate more:
  `gh api 'repos/loopdive/js2/actions/runs?event=merge_group&per_page=20' --jq '.workflow_runs[] | "\(.created_at) \(.conclusion) \(.name) \(.head_branch)"'`
