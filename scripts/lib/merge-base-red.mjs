// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
//
// (#3619) "The test must go red without the fix" — the pure decision logic.
//
// A regression test that does not actually exercise the code under test is a
// VACUOUS TEST: the fix *looks* protected when it is not, so the defect can
// silently return. The strongest available oracle for "does this test exercise
// the change" needs no mutation operators to be designed —
//
//     THE MUTANT IS `main`.
//
// Run the PR's NEW test files against the PR's MERGE-BASE compiler. A new
// regression test that PASSES there did not test the fix.
//
// Motivating incident (2026-07-25): a regression test used
// `new (Test262Error as any)(…)`. A cast around a `new` callee is a type-level
// no-op that CHANGES THE AST, so it routes past the `ts.isIdentifier` gates in
// src/codegen/expressions/new-super.ts — 3 of 6 cases passed vacuously. It was
// caught only because the author manually removed the fix and checked the test
// went red. #3613 shipped a syntax gate for that ONE shape; this generalises it.
//
// The driver that materialises a merge-base worktree and shells out to vitest
// lives in scripts/check-merge-base-red.mjs; this module is pure so the
// decisions can be unit-tested without running anything.

/**
 * Opt-out marker. A test may legitimately be green (or uncollectable) against
 * the merge base: a new-feature test that cannot even load there, a test added
 * with a pure refactor, or an invariant being locked in deliberately (most
 * guard-suite entries are this). Each must SAY SO, and the driver prints every
 * exemption it honours — an invisible escape hatch is one that grows.
 */
export const EXEMPT_MARKER = "merge-base-red-exempt";

/** @typedef {"red" | "green" | "inconclusive"} FileVerdict */

/**
 * Read an opt-out marker out of a test file's source.
 *
 * @param {string} source
 * @returns {{ exempt: boolean; reason?: string }}
 */
export function readExemption(source) {
  const m = new RegExp(`${EXEMPT_MARKER}:[ \\t]*(.*)`).exec(source);
  if (!m) return { exempt: false };
  const reason = (m[1] ?? "").trim();
  // A bare marker with no reason is NOT an exemption. The point of the hatch is
  // that it stays legible; "// merge-base-red-exempt:" alone tells a later
  // reader nothing, so it must not silently disable the check.
  if (reason.length === 0) return { exempt: false };
  return { exempt: true, reason };
}

/**
 * Classify ONE file's outcome from a vitest JSON-reporter entry.
 *
 * **This mapping is EMPIRICAL, not assumed** — measured 2026-07-25 against the
 * repo's vitest 3.2.4 with three fixtures (a failing assertion, a passing
 * test, and a file with an unresolvable import):
 *
 * | fixture              | status   | assertionResults | message |
 * | -------------------- | -------- | ---------------- | ------- |
 * | assertion fails      | "failed" | 1                | ""      |
 * | passes               | "passed" | 1                | ""      |
 * | cannot be collected  | "failed" | **0**            | 162 ch  |
 *
 * So `status: "failed"` ALONE CANNOT distinguish "the assertion failed" from
 * "the file never ran" — and conflating them is exactly how this gate would
 * start certifying a test as proven-red when it demonstrated nothing. The
 * discriminator is **`assertionResults.length > 0`: did any test in this file
 * actually execute?** That is the #3613 vacuity principle applied to the gate
 * itself, and it is the part most likely to be got wrong later — hence the
 * table above rather than a footnote.
 *
 * Methodological note worth keeping: the first run of that measurement
 * concluded that one uncollectable file zeroes the whole batched report. That
 * was WRONG — the fixtures had been placed in `.tmp/`, which vitest does not
 * scan, so every file reported zero rows INCLUDING the one known to pass. The
 * positive control is what caught it. Batching is fine.
 *
 * @param {{ status?: string; assertionResults?: unknown[]; message?: string }} entry
 * @returns {FileVerdict}
 */
export function classifyFileResult(entry) {
  const executed = (entry?.assertionResults ?? []).length > 0;
  if (entry?.status === "passed") return "green";
  if (entry?.status === "failed" && executed) return "red";
  // failed-with-nothing-executed, skipped, or an unrecognised status: this file
  // did not demonstrate anything in either direction.
  return "inconclusive";
}

/**
 * Which added test files should the gate try? Root `tests/*.test.ts` only —
 * the same scope as the #3008 per-PR gate, minus the shard/chunk entry points,
 * which are matrix constructs rather than regression tests.
 *
 * @param {string[]} addedFiles paths added by the PR (`git diff --diff-filter=A`)
 * @returns {string[]}
 */
export function selectCandidateTests(addedFiles) {
  return addedFiles.filter(
    (f) =>
      /^tests\/[^/]+\.test\.ts$/.test(f) &&
      !/^tests\/(linear-|c-abi\.|simd|test262-(chunk|vitest|local-shard))/.test(f),
  );
}

/**
 * Turn per-file verdicts into a gate outcome.
 *
 * The `notes` channel carries the cases that must never be mistaken for a
 * clean pass — each is the #3613 vacuous-verifier rule applied to this gate:
 *   • nothing to check (no new test files) must SAY SO, not look like success;
 *   • every candidate exempt means nothing was verified;
 *   • every candidate inconclusive means the merge-base run told us nothing,
 *     which is a broken measurement rather than a clean bill of health.
 *
 * @param {{ file: string; verdict?: FileVerdict; exemptReason?: string }[]} results
 * @param {{ srcChanged: boolean }} ctx
 * @returns {{ ok: boolean; failures: string[]; notes: string[] }}
 */
export function evaluateMergeBaseRed(results, ctx) {
  const failures = [];
  const notes = [];
  const exempt = results.filter((r) => r.exemptReason);
  const considered = results.filter((r) => !r.exemptReason);

  for (const e of exempt) notes.push(`exempt: ${e.file} — ${e.exemptReason}`);

  if (results.length === 0) {
    notes.push(
      "no new root regression tests in this PR — nothing to check (#3619). This is NOT a clean bill of health, " +
        "it is an EMPTY INPUT SET; the gate says so rather than reporting a silent pass.",
    );
    return { ok: true, failures, notes };
  }

  if (considered.length === 0) {
    notes.push(
      `all ${exempt.length} new test file(s) are exempt — NOTHING was actually verified. Exemptions are listed ` +
        "above so this cannot become the quiet default.",
    );
    return { ok: true, failures, notes };
  }

  const inconclusive = considered.filter((r) => r.verdict === "inconclusive");
  if (inconclusive.length === considered.length) {
    notes.push(
      `=== ALL ${considered.length} candidate(s) were INCONCLUSIVE against the merge base — the run demonstrated ` +
        "NOTHING and must not be read as a pass (#3613 vacuous-verifier rule). A test that cannot even be " +
        "COLLECTED has not gone red. The usual cause is legitimate: the file imports something that only exists " +
        `on the PR branch, which is a textbook \`${EXEMPT_MARKER}:\` case — declare it. ===`,
    );
    return { ok: true, failures, notes };
  }
  for (const r of inconclusive) {
    notes.push(`inconclusive: ${r.file} — could not be collected against the merge base; not counted either way.`);
  }

  for (const r of considered.filter((r) => r.verdict === "green")) {
    failures.push(
      `${r.file} PASSES against the merge-base compiler, so it does not test this change` +
        (ctx.srcChanged ? "" : " (and this PR changes no src/ files — is it a regression test at all?)") +
        `. Make it exercise the fix, or declare why not with \`// ${EXEMPT_MARKER}: <reason>\`.`,
    );
  }

  const red = considered.filter((r) => r.verdict === "red").length;
  if (red > 0) notes.push(`${red} of ${considered.length} candidate(s) verified RED against the merge base.`);

  return { ok: failures.length === 0, failures, notes };
}
