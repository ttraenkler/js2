---
id: 3619
title: 'Mechanise "the test must go red without the fix": re-run a PR''s new regression test against the merge-base compiler and require FAIL'
status: ready
sprint: current
priority: high
horizon: m
feasibility: hard
goal: core-semantics
created: 2026-07-25
---

## Problem

A regression test that does not actually exercise the code under test is a
**vacuous test**: the fix _looks_ protected when it is not, so the defect can
silently return. This is the same failure shape as a vacuous test262 pass — an
assertion that runs but validates nothing — except in our own suite, where it
is arguably worse, because a green regression test is the thing everyone trusts.

It is not hypothetical. On 2026-07-25 the `assertion_fail` lane nearly shipped
one: its regression test used

```ts
new (Test262Error as any)(...)
```

A cast around a `new` callee is a **type-level no-op that changes the AST**, so
it routes past the `ts.isIdentifier(calleeExpr)` gates in
`src/codegen/expressions/new-super.ts` — no `$Error_struct` is minted at all.
**3 of 6 cases passed vacuously.** It was caught only because the author
manually removed the fix and confirmed the test went red.

#3613 shipped a syntax gate (`scripts/check-test-vacuity-shapes.ts`) for that
ONE shape. The general class is much larger, and the general class has no
detector:

- an assertion that holds for a reason unrelated to the fix;
- a test whose input never reaches the changed code path;
- a test asserting a value that was already correct before the fix;
- any future syntax that routes past a gate nobody has thought of.

Today the only defence is **an agent remembering to do it by hand.**

## The mechanisation

For a PR that adds `tests/issue-N.test.ts` alongside a `src/**` change:

1. check out the PR's **merge base** (`git merge-base origin/main HEAD`) — the
   compiler _without_ the fix;
2. overlay the PR's NEW test file(s) onto that tree;
3. run them;
4. **require FAIL.** A new regression test that passes against the merge-base
   compiler did not test the fix.

**Why this is the right shape and not "mutation testing":** there are no
mutation operators to design, no equivalent-mutant problem, no combinatorics.
**The mutant is `main`.** It is exactly the manual step the `assertion_fail`
dev performed, and it is the strongest possible oracle for "does this test
exercise the change" — stronger than any static heuristic, because it is
empirical.

It is also the natural counterpart to #3613's `it.fails` device: an `it.fails`
entry proves a test goes red _today_ and turns red when the defect is fixed;
this proves a test went red _before_ the fix.

## Design notes

- **Two checkouts, one job.** `actions/checkout` the merge base into a second
  path, symlink `node_modules` / `test262`, copy in the PR's new test files,
  run `vitest run <files>` there. Do NOT copy the PR's `src/` — that is the
  whole point.
- **Vacuous-verifier discipline applies to this gate too (#3613).** If the job
  finds 0 new test files it must say "no new regression tests in this PR", not
  report a pass — and if EVERY new test fails to even load against the merge
  base (import error, missing export), that is an inconclusive run, not a green
  one. Use `scripts/lib/verifier-guard.mjs`.
- **Expected legitimate exemptions**, each needing an explicit opt-out marker
  in the test file with a reason:
  - a test for a NEW feature whose test file does not compile at all against
    the merge base (the failure mode is "module not found", which is a pass for
    the wrong reason — must be distinguished from an assertion failure);
  - a test added alongside a pure refactor with no behaviour change;
  - a test that pins an invariant which was ALREADY true and is being locked in
    deliberately (e.g. most `guard-suite.json` entries) — these are valuable but
    are not regression tests and must declare themselves as such.
    Marker: `// merge-base-red-exempt: <why>` near the top of the file.

### Distinguish FAIL from ERROR — MEASURED, and the part most likely to be got wrong

"The assertion failed" is the signal; "the file could not be collected" is not.
These are **indistinguishable by vitest's `status` field** — measured against
the repo's vitest 3.2.4 on 2026-07-25 with three fixtures:

| fixture                          | `status`       | `assertionResults` | `message` |
| -------------------------------- | -------------- | ------------------ | --------- |
| assertion fails                  | `"failed"`     | 1                  | `""`      |
| passes                           | `"passed"`     | 1                  | `""`      |
| unresolvable import (no collect) | **`"failed"`** | **0**              | 162 chars |

So the discriminator is **`assertionResults.length > 0` — did any test in this
file actually execute?** Reading `status` alone would certify a test as
proven-red when nothing ran, which is the very vacuity this gate exists to
prevent, committed by the gate itself. Implemented in
`classifyFileResult()` and pinned by
`tests/issue-3619-merge-base-red.test.ts` with the captured fixtures.

> **Methodological note, kept deliberately.** The first run of that measurement
> concluded that one uncollectable file zeroes the whole batched report. It was
> WRONG: the fixtures had been written into `.tmp/`, which vitest does not
> scan, so every file reported zero rows — **including the one known to pass**.
> The positive control is what caught it. Batching is fine. Never accept a zero
> from a tool you have not seen produce a non-zero in that same environment.

- **Advisory first, required later.** Land it as a non-blocking job, collect a
  few weeks of real data on the exemption rate, then promote to required once
  the false-positive rate is known. Promoting a noisy gate straight to required
  is how gates get routed around.

## Progress

**Slice 1 — the pure decision logic — DONE** (`scripts/lib/merge-base-red.mjs`,
15 unit tests in `tests/issue-3619-merge-base-red.test.ts`, hermetic):
`classifyFileResult` (the measured FAIL/ERROR/GREEN mapping above),
`readExemption` (a bare marker with no reason is **not** an exemption),
`selectCandidateTests` (the #3008 scope), and `evaluateMergeBaseRed` (which
carries the three must-say-so cases: no new tests, all exempt, all
inconclusive).

**Slice 2 — the driver + workflow — REMAINING**:
`scripts/check-merge-base-red.mjs` materialises a merge-base worktree
(`git worktree add --detach <tmp> $(git merge-base origin/main HEAD)`), symlinks
`node_modules`/`test262`, copies the PR's new test files in, runs one batched
`vitest run --reporter=json`, feeds the entries through slice 1, and cleans up.
Then an advisory (non-blocking) workflow.

Stacked on #3613 because it depends on `scripts/lib/verifier-guard.mjs`; do not
enqueue until #3613 lands.

## Acceptance criteria

- [ ] A PR adding `tests/issue-N.test.ts` + a `src/**` change runs the new test
      against the merge-base tree and reports RED / GREEN / INCONCLUSIVE per file
- [ ] A test that is GREEN against the merge base fails the job (with the file
      name and the assertion that passed when it should not have)
- [ ] `// merge-base-red-exempt: <why>` suppresses it, and the job PRINTS every
      exemption used so the escape hatch is visible rather than silent
- [ ] "could not collect / module not found" is reported as INCONCLUSIVE, never
      as red — a test that cannot load has not demonstrated anything
- [ ] 0 new test files ⇒ the job says so explicitly and exits 0; it never
      reports a clean result from having looked at nothing (#3613 rule)
- [ ] Validated against a KNOWN case: the `new (Test262Error as any)(...)` test
      from the 2026-07-25 `assertion_fail` lane must be reported RED-FAILING
      (i.e. green on merge base ⇒ job fails), and the corrected version must pass
- [ ] Advisory (non-blocking) on landing, with a stated promotion criterion

## Until this lands

The norm stays manual, and PR authors should state it explicitly:
**remove the fix, confirm the test goes red, say so in the PR body.**
