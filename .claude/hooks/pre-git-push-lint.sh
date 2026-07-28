#!/bin/bash
# Pre-push lint + format gate WITH AUTOFIX — the sibling of pre-git-push-loc.sh.
#
# WHY this exists as a Claude Code PreToolUse hook and not (only) in .husky/pre-push:
# .husky/pre-push ALREADY runs `pnpm run lint` and `pnpm run format:check` (its
# sections 3 / 3b). But this repo *sanctions* `git push --no-verify` (CLAUDE.md —
# the husky integrity gate chokes on the fork/upstream divergence), and
# `--no-verify` skips husky entirely. So in practice the lint lane ran nowhere
# locally, and a one-character slip reached CI: PR #3705 failed `quality` on two
# `lint/style/useConst` diagnostics (a `const`→`let` flip that was never
# reassigned). Because `quality` runs lint as its FIRST step, that also SKIPPED
# the 30-odd gates behind it — hiding a second, unrelated LOC-ratchet failure
# until the lint fix landed. One trivially auto-fixable diagnostic therefore cost
# two full CI round-trips.
#
# This interceptor fires on the git-push TOOL CALL, so `--no-verify` cannot bypass
# it. When it finds an error it applies biome's SAFE fixes plus prettier, then
# blocks the push so the (now-fixed) working tree gets committed — pushing the
# unfixed commits anyway would just re-fail CI.
#
# SAFETY — the same contract as pre-git-push-loc.sh:
#   * Blocks ONLY on a real, change-scoped lint/format error. Any unresolved dir,
#     missing tool, or runtime error FAILS OPEN. A hook bug can never wedge a push.
#   * Autofix is scoped twice over: only files THIS branch touches, and only the
#     rules that actually errored (`--only=<group>/<rule>`). It never rewrites the
#     whole tree — `biome lint --write` unscoped would also "fix" the ~1400
#     warning-level diagnostics that sit below CI's `--diagnostic-level=error`,
#     producing an enormous unrelated diff (and blowing the #3102 LOC ratchet).
#   * Never touches files outside src/ tests/ scripts/, matching CI's lint globs.
# Escape hatch: prefix the push with `LINT_AUTOFIX_SKIP=1`.

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -z "$CMD" ] && exit 0

# Explicit escape hatch.
echo "$CMD" | grep -q 'LINT_AUTOFIX_SKIP' && exit 0

# Only act on a `git push`. Unlike the LOC hook we do NOT require a fork/origin
# token in the command line: pushes here are also made to an explicit SSH URL
# (`git push git@github.com:ttraenkler/js2.git <branch>`), and lint is correct to
# run for any push destination.
echo "$CMD" | grep -qE '\bgit +push\b' || exit 0

# Resolve the working dir the push runs in: honor a leading `cd <dir> && …`
# (the repo's worktree convention), else the current shell PWD.
WORKDIR=$(printf '%s\n' "$CMD" | sed -nE 's/^[[:space:]]*cd[[:space:]]+([^ &]+).*/\1/p' | head -1)
[ -z "$WORKDIR" ] && WORKDIR="$PWD"
cd "$WORKDIR" 2>/dev/null || exit 0
# Fail open unless this is a real checkout with the pinned toolchain available
# (worktrees get node_modules symlinked by provision-worktree.sh).
[ -f "$WORKDIR/package.json" ] || exit 0
[ -d "$WORKDIR/node_modules/.bin" ] || exit 0

# ---------- resolve THIS change-set's lintable files ----------------------
# Committed diff vs the merge-base with origin/main, plus anything staged or
# still in the working tree. Restricted to CI's lint globs (src tests scripts).
BASE=$(git merge-base HEAD origin/main 2>/dev/null)
[ -z "$BASE" ] && exit 0   # can't scope ⇒ fail open, never mass-rewrite

FILES=$(
  {
    git diff --name-only --diff-filter=ACMR "$BASE" HEAD 2>/dev/null
    git diff --name-only --diff-filter=ACMR HEAD 2>/dev/null
    git diff --name-only --diff-filter=ACMR --cached 2>/dev/null
    # A brand-new file that is still untracked is invisible to every `git diff`
    # above, yet CI lints it the moment it is committed.
    git ls-files --others --exclude-standard 2>/dev/null
  } | sort -u | grep -E '^(src|tests|scripts)/.*\.(ts|js|mjs)$'
)
# Drop paths deleted/renamed away since.
FILES=$(for f in $FILES; do [ -f "$f" ] && printf '%s\n' "$f"; done)
[ -z "$FILES" ] && exit 0   # nothing lintable in this change-set

# ---------- detect (change-scoped, same rules CI enforces) ----------------
# shellcheck disable=SC2086
LINT_OUT=$(pnpm exec biome lint --diagnostic-level=error --no-errors-on-unmatched $FILES 2>&1)
LINT_RC=$?
# shellcheck disable=SC2086
FMT_OUT=$(pnpm exec prettier --check $FILES 2>&1)
FMT_RC=$?

[ "$LINT_RC" -eq 0 ] && [ "$FMT_RC" -eq 0 ] && exit 0

# ---------- autofix -------------------------------------------------------
# Checksum the candidate files so we can report exactly which ones the hook
# rewrote. `git diff` is the wrong instrument here: it reports every dirty file
# (including ones the dev edited by hand), and it goes SILENT in the case that
# matters most — undoing a committed regression restores the file to its HEAD
# content, which shows as no diff at all.
# shellcheck disable=SC2086
SUMS_BEFORE=$(md5sum $FILES 2>/dev/null)

if [ "$LINT_RC" -ne 0 ]; then
  # Only the rules that actually errored, so we never sweep up warning-level
  # diagnostics that CI tolerates. `lint/style/useConst` ⇒ `--only=style/useConst`.
  ONLY=$(printf '%s\n' "$LINT_OUT" |
    grep -oE 'lint/[a-zA-Z]+/[a-zA-Z]+' | sed 's|^lint/|--only=|' | sort -u | tr '\n' ' ')
  # shellcheck disable=SC2086
  [ -n "$ONLY" ] && pnpm exec biome lint --write --no-errors-on-unmatched $ONLY $FILES >/dev/null 2>&1
fi
# Prettier runs whenever either lane failed: a biome fix can itself leave
# formatting the format:check lane would then reject.
# shellcheck disable=SC2086
pnpm exec prettier --write $FILES >/dev/null 2>&1

# ---------- re-check and report ------------------------------------------
# shellcheck disable=SC2086
LINT_OUT2=$(pnpm exec biome lint --diagnostic-level=error --no-errors-on-unmatched $FILES 2>&1)
LINT_RC2=$?
# shellcheck disable=SC2086
pnpm exec prettier --check $FILES >/dev/null 2>&1
FMT_RC2=$?

# shellcheck disable=SC2086
SUMS_AFTER=$(md5sum $FILES 2>/dev/null)
CHANGED=$(diff <(printf '%s\n' "$SUMS_BEFORE") <(printf '%s\n' "$SUMS_AFTER") 2>/dev/null |
  sed -nE 's/^> [0-9a-f]+[[:space:]]+(.*)$/\1/p' | sort -u | tr '\n' ' ')

{
  echo "BLOCKED: lint/format would FAIL CI's \`quality\` job — caught before the push."
  echo "---------------------------------------------------------------------------"
  if [ "$LINT_RC2" -eq 0 ] && [ "$FMT_RC2" -eq 0 ]; then
    echo "AUTOFIXED. The working tree is now clean for both lanes:"
    echo "  ${CHANGED:-(no file needed rewriting)}"
    echo
    echo "Commit the fix (e.g. \`git add -p\` then \`git commit --amend\` or a new"
    echo "commit) and re-push. The push was stopped because the commits as they"
    echo "stand still carry the failure."
  else
    echo "Some diagnostics are NOT auto-fixable — fix them by hand:"
    [ "$LINT_RC2" -ne 0 ] && printf '%s\n' "$LINT_OUT2" | grep -E '^(src|tests|scripts)/.*(lint/|×)' | head -15
    [ "$FMT_RC2" -ne 0 ] && echo "  (prettier still reports drift — run: pnpm exec prettier --write <files>)"
    if [ -n "$CHANGED" ]; then
      echo
      echo "Note: safe fixes were already applied to: $CHANGED"
    fi
  fi
  echo "---------------------------------------------------------------------------"
  echo "Why this blocks: \`quality\` runs lint FIRST, so a lint failure also SKIPS"
  echo "every gate behind it (LOC ratchet, oracle ratchet, issue gates, …) — you"
  echo "lose a whole CI round-trip and still don't learn what else is broken."
  echo "Escape (rare, if you're certain): prefix the push with LINT_AUTOFIX_SKIP=1."
} >&2
exit 2
