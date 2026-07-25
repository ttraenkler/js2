---
id: 3637
title: "Edition classifier: give untagged tests their own bucket instead of silently defaulting to ES5; ES3 folds into es5-complete"
status: ready
created: 2026-07-25
priority: medium
horizon: s
feasibility: easy
area: ci, test-infrastructure
goal: es5-complete
edition: n/a
mode: n/a
related: [3626, 3627, 3621]
---

# #3637 — untagged tests get their own bucket; ES3 folds into ES5

Two stakeholder decisions from 2026-07-25, filed together because they interact.

## 1. Untagged tests get an explicit `untagged` bucket

`classifyEdition()` currently has a "legacy pre-YAML test" branch: **no frontmatter found
⇒ return ES5**. That inference is probably sound, but it must not be a *silent* default.

**This exact branch is what produced the #3621 bug.** The inference was not the defect —
the defect was that "not tagged" was computed by a broken detector. `parseFrontmatter()`
read only the first **2,048 bytes**, so:

| | count |
|---|---|
| files whose frontmatter ends past 2,048 bytes (FALSELY untagged) | **4,220** |
| files that genuinely have no frontmatter | **265** |

The heuristic was being applied to 4,485 files when it should have applied to 265. Result:
4,144 ES2015+ tests counted as ES5, and every ES5 conformance figure inflated by ~46 %
until the census caught it.

**Change:** classify untagged files into an explicit `untagged` (or `legacy`) bucket rather
than folding them into ES5.

**Why, even though the inference is probably right:** the failure mode is *silent*. A wrong
edition tag does not error — the test lands in the wrong column and nobody notices for
weeks. Same shape as the rest of this sprint's findings: assertions that never assert, a
skip list of dead keys (#3622), a promote job failing invisibly (#3634). The fix pattern
has been identical every time — **make the fallback visible instead of trusting it**.

265 auditable rows can be checked once and then confidently collapsed. 4,485 invisible ones
are what a whole census had to be spent discovering. Keeping the bucket also means a future
classifier regression shows up as *a bucket that suddenly grew* rather than as a conformance
number that quietly shifted.

## 2. ES3 folds into `es5-complete` — no separate `es3-complete` goal

**Already the case; no change needed to the goal file.** `plan/goals/es5-complete.md`
states its scope as *"Every ES5 (and ≤ES3) test262 test that does not require `eval` or
`with` passes, in both the JS-host and standalone lanes"*, and its target is *"close 1,772
reachable ES5 failures + 43 ≤ES3 failures"*. The census folded ES3 in when it created the
goal. **No `plan/goals/es3-complete.md` was ever created.**

**What DOES need updating:** `plan/issues/3627-goal-aware-sprint-model.md` uses
`es3-complete` as a worked example of a dependency edge, at lines ~178, ~444, ~448, ~451.
Those are illustrative, not real goals, but they now name a goal that will never exist.
Replace with a dependency example that reflects reality (`compilable` is the actual
declared dependency of `es5-complete`).

### The interaction between the two decisions

Folding ES3 into ES5 **removes the sharpest reason the untagged bucketing mattered**. The
concern was that untagged legacy tests landing in ES3-vs-ES5 would change whether a separate
`es3-complete` goal was achievable. With one goal spanning ≤ES5, that distinction no longer
affects goal completion.

So item 1 is now justified purely on **classifier-regression visibility**, not on goal
accounting — a weaker but still sufficient reason. Size the work accordingly: this is a
small change, not a priority.

## Acceptance

- Untagged files land in their own bucket; the count is reported, not absorbed.
- A test asserts that a file with frontmatter past the (now 64 KB) window is classified by
  its frontmatter, and a genuinely-untagged file lands in `untagged`.
- #3627's `es3-complete` examples replaced.
