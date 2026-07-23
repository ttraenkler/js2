# Pre-Completion Checklist

**You MUST read this file and confirm each step before signaling task completion.**

## Before signaling completion

1. [ ] All work is committed to your branch (no uncommitted changes)
2. [ ] `git merge main` — merge main INTO your branch (not rebase)
   - If conflicts: resolve them, `git add`, `git commit`
   - If merge goes wrong: `git merge --abort` (your commits are safe)
   - **Never rebase** — rebase rewrites SHAs and causes branch name churn

## Post-integration local checks

Local validation happens AFTER merging main into your branch, but **full test262 runs happen in CI on the PR**, not in your worktree.

3. [ ] Run issue-targeted local checks
   - Compile+run the specific sample tests from the issue description
   - Run any narrow local tests needed for confidence
   - Do **not** run local full `test262` as part of completion
4. [ ] Record local test results in the issue file

## Measurement discipline (see "Measurement discipline" in CLAUDE.md)

5. [ ] Every claimed win is backed by a **MEASURED runtime PASS count with its
       denominator** ("19 of 49") — not compilation success, not an
       extrapolation from a cluster label or signature share
6. [ ] Newly-scored failures are reported alongside newly-scored passes (the
       honest split — never bank only the good half)
7. [ ] Any extrapolated number is explicitly labelled as an extrapolation

## Finalize

8. [ ] Issue file updated with implementation notes
9. [ ] Issue status: **self-merge path (the common case) → set `status: done` +
       `completed: <date>` directly in the implementation PR.** Do NOT set
       `in-review` and plan a later flip — once the queue lands the PR there is
       no observer to make that flip, which orphans the issue (see
       #1602/#1603/#1606 and the "Issue status lifecycle" section of CLAUDE.md).
       `in-review` is ONLY for the handoff/external case where the PR author is
       NOT the merger.
10. [ ] Issue frontmatter records the PR number as `pr: <N>`
11. [ ] File locks removed from `plan/method/file-locks.md`
12. [ ] Branch pushed to the **`fork`** remote (`git push fork <branch>` — NOT
        `origin`, which is upstream; see the merge-protocol step 3 in CLAUDE.md)
13. [ ] PR opened against upstream `main`
        (`gh pr create -R loopdive/js2 --head ttraenkler:<branch>`)
14. [ ] PR is the canonical place for full validation — CI validates there

## After PR open — background the watcher, pipeline the next slice

15. [ ] Write agent-status file with `state: pr-open, pr: N` so the dispatch
        loop sees you as in-flight
16. [ ] Background a CI watcher, then **claim your next task and keep working**
        (do NOT idle, do NOT terminate mid-session waiting for the merge). When
        CI is green and `/dev-self-merge` says MERGE, mark the task completed
        and stand down — the server-side `auto-enqueue.yml` workflow enqueues
        (#2786); you never touch the merge queue. The retired
        `.claude/ci-status/pr-<N>.json` feed does not exist for current PRs —
        use `gh pr checks <N>` / the checks API.

## What NOT to do

- Do NOT open a PR before merging `origin/main` into your branch
- Do NOT idle in-context waiting for CI — background the watcher and pipeline
  the next slice (and do NOT enqueue; the server-side workflow owns that)
- Do NOT use `git rebase` — use `git merge origin/main` instead
- Do NOT resolve compiler source conflicts (`src/`) inline — create a `[CONFLICT]` priority task for a senior-developer (Opus)
- Do NOT leave uncommitted changes on your branch
- Do NOT treat local full `test262` as part of the normal developer workflow — use the PR workflow instead
