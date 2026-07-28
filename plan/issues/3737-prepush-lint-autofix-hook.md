---
id: 3737
title: "The pre-push lint lane runs nowhere: `--no-verify` is sanctioned, so a one-character slip costs two CI round-trips"
status: done
sprint: current
created: 2026-07-28
updated: 2026-07-28
completed: 2026-07-28
priority: medium
horizon: s
feasibility: easy
reasoning_effort: medium
task_type: chore
area: ci
language_feature: n/a
goal: maintainability
related: [3102, 3131, 3410, 3705]
origin: "PR #3705 — `quality` failed on two auto-fixable `lint/style/useConst` diagnostics"
---

# The pre-push lint lane runs nowhere

## Problem

`.husky/pre-push` already runs `pnpm run lint` and `pnpm run format:check`
(sections 3 / 3b). But CLAUDE.md **sanctions** `git push --no-verify` for the
normal fork→upstream flow, because the husky integrity gate chokes on the
fork/upstream divergence. `--no-verify` skips husky wholesale, so in practice
**the lint lane executed nowhere locally** and CI was the first thing to see it.

PR #3705 paid the bill twice over:

1. `quality` failed on two `lint/style/useConst` diagnostics — a `const`→`let`
   flip in `src/ir/from-ast.ts` where neither binding is ever reassigned. Biome
   classes the repair as a **safe** fix; nothing about it needed a human.
2. `quality` runs lint as its **first** step, so that failure **skipped the ~30
   gates behind it**. A second, unrelated failure — three god-files grown past
   the #3102 LOC ratchet with no `loc-budget-allow` grant — stayed invisible
   until the lint fix landed. Two serial CI round-trips for two independent
   problems, one of which was auto-fixable.

The existing `.claude/hooks/pre-git-push-loc.sh` proves the shape of the fix: a
PreToolUse hook fires on the git-push **tool call**, which `--no-verify` cannot
bypass. It just had no lint sibling.

## Fix

`.claude/hooks/pre-git-push-lint.sh`, registered ahead of the LOC hook on the
same `Bash(*git push*)` matcher:

- **Detect** with the same rules CI enforces (`biome lint
  --diagnostic-level=error`, `prettier --check`).
- **Autofix** with biome's *safe* fixes plus prettier, then **block** the push so
  the repaired tree gets committed — pushing the unfixed commits would only
  re-fail CI.
- **Scope autofix twice over**: only files this branch touches (vs the
  merge-base with `origin/main`, including still-untracked new files), and only
  the rules that actually errored (`--only=<group>/<rule>`).

That second scope is load-bearing. An unscoped `biome lint --write` would also
"fix" the ~1,400 warning-level diagnostics sitting below CI's error threshold —
an enormous unrelated diff that would itself trip the #3102 LOC ratchet.

## Safety contract

Identical to `pre-git-push-loc.sh`: blocks **only** on a real, change-scoped
lint/format error, and **fails open** on an unresolved working dir, a missing
toolchain, an unresolvable merge-base, or any runtime error. A bug in this hook
can never wedge a push. Escape hatch: prefix the push with
`LINT_AUTOFIX_SKIP=1`.

## Verification

Six paths exercised by hand against the real #3705 regression, reintroduced
verbatim into `src/ir/from-ast.ts`:

| Path                             | Result                                            |
| -------------------------------- | ------------------------------------------------- |
| Auto-fixable lint error          | fixed + blocked, naming `src/ir/from-ast.ts`      |
| Clean tree                       | exit 0, silent, ~1 s                              |
| Non-auto-fixable error           | blocked, prints the diagnostic, applies no fix    |
| New **untracked** file           | linted (no `git diff` reports it)                 |
| `LINT_AUTOFIX_SKIP=1`            | exit 0                                            |
| Non-push command / bad workdir   | exit 0 (fail open)                                |

Reporting which files were rewritten is checksum-based, not `git diff`-based:
`git diff` reports every dirty file, and goes **silent** in the case that
matters most — undoing a committed regression restores the file to its `HEAD`
content, so the fix shows as no diff at all.

## Follow-up

No automated test yet. The tested-hook precedent is #3410
(`tests/hooks/pre-push-labs-remote.test.ts`); a similar harness driving this
script over a temp checkout would guard the fail-open contract. Low urgency —
every failure mode here degrades to "push proceeds, CI catches it," which is
exactly today's behaviour.
