// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
//
// (#3619) Unit tests for the merge-base red gate's decision logic.
//
// The gate answers "does this new regression test actually exercise the change?"
// by running it against the PR's MERGE-BASE compiler and requiring FAIL. No
// mutation operators to design — the mutant is `main`.
//
// The two things most likely to be got wrong later, and therefore pinned
// hardest here:
//   1. **FAIL vs ERROR.** "the assertion failed" is the signal; "the file could
//      not be collected" is not. They are INDISTINGUISHABLE by vitest's
//      `status` field alone — both are `"failed"`. The discriminator is
//      `assertionResults.length > 0`.
//   2. **Empty/uninformative input must SAY SO**, never look like success
//      (the #3613 vacuous-verifier rule applied to this gate itself).
import { describe, expect, it } from "vitest";
import {
  EXEMPT_MARKER,
  classifyFileResult,
  evaluateMergeBaseRed,
  readExemption,
  selectCandidateTests,
} from "../scripts/lib/merge-base-red.mjs";

// Captured from a real vitest 3.2.4 run (2026-07-25) rather than invented, so
// these fixtures cannot drift into wishful thinking about the reporter's shape.
const REAL_FAILED_ASSERTION = {
  status: "failed",
  assertionResults: [{ status: "failed", title: "fails" }],
  message: "",
};
const REAL_PASSED = { status: "passed", assertionResults: [{ status: "passed", title: "passes" }], message: "" };
const REAL_COLLECT_ERROR = {
  status: "failed",
  assertionResults: [],
  message: "Error: Failed to load url ../src/definitely-not-a-real-module.js",
};

describe("#3619 FAIL vs ERROR — the distinction the gate lives or dies on", () => {
  it("an executed, failing assertion is RED (the signal)", () => {
    expect(classifyFileResult(REAL_FAILED_ASSERTION)).toBe("red");
  });

  it("a passing file is GREEN (the failure the gate reports)", () => {
    expect(classifyFileResult(REAL_PASSED)).toBe("green");
  });

  it("a file that could not be COLLECTED is INCONCLUSIVE, never red", () => {
    // Both this and REAL_FAILED_ASSERTION carry status "failed". Reading
    // `status` alone would certify a test as proven-red when nothing ran.
    expect(REAL_COLLECT_ERROR.status).toBe(REAL_FAILED_ASSERTION.status);
    expect(classifyFileResult(REAL_COLLECT_ERROR)).toBe("inconclusive");
  });

  it("treats anything it does not understand as INCONCLUSIVE, not as evidence", () => {
    expect(classifyFileResult({})).toBe("inconclusive");
    expect(classifyFileResult({ status: "skipped", assertionResults: [] })).toBe("inconclusive");
  });
});

describe("#3619 exemptions are legible or they are not exemptions", () => {
  it("honours a marker WITH a reason", () => {
    const e = readExemption(`// ${EXEMPT_MARKER}: new feature — the file cannot load against the merge base\n`);
    expect(e.exempt).toBe(true);
    expect(e.reason).toMatch(/new feature/);
  });

  it("REFUSES a bare marker with no reason — an unexplained hatch disables nothing", () => {
    expect(readExemption(`// ${EXEMPT_MARKER}:\n`).exempt).toBe(false);
    expect(readExemption(`// ${EXEMPT_MARKER}:   \n`).exempt).toBe(false);
  });

  it("is absent by default", () => {
    expect(readExemption("import { it } from 'vitest';\n").exempt).toBe(false);
  });
});

describe("#3619 candidate selection matches the #3008 scope", () => {
  it("takes root regression tests and nothing else", () => {
    expect(
      selectCandidateTests([
        "tests/issue-3619-merge-base-red.test.ts",
        "tests/equivalence/foo.test.ts",
        "tests/helpers.ts",
        "src/codegen/index.ts",
        "tests/linear-foo.test.ts",
        "tests/test262-chunk9.test.ts",
        "tests/test262-local-shard3.test.ts",
      ]),
    ).toEqual(["tests/issue-3619-merge-base-red.test.ts"]);
  });
});

describe("#3619 gate outcome", () => {
  const ctx = { srcChanged: true };

  it("passes when every candidate went RED", () => {
    const r = evaluateMergeBaseRed([{ file: "a.test.ts", verdict: "red" }], ctx);
    expect(r.ok).toBe(true);
    expect(r.failures).toEqual([]);
    expect(r.notes.join("\n")).toMatch(/1 of 1 candidate\(s\) verified RED/);
  });

  it("FAILS on a candidate that is GREEN against the merge base — it did not test the change", () => {
    const r = evaluateMergeBaseRed(
      [
        { file: "a.test.ts", verdict: "red" },
        { file: "b.test.ts", verdict: "green" },
      ],
      ctx,
    );
    expect(r.ok).toBe(false);
    expect(r.failures).toHaveLength(1);
    expect(r.failures[0]).toMatch(/b\.test\.ts PASSES against the merge-base compiler/);
    // The remedy must be in the message, including the escape hatch.
    expect(r.failures[0]).toMatch(new RegExp(EXEMPT_MARKER));
  });

  it("says so loudly when there is NOTHING to check — an empty input set is not success", () => {
    const r = evaluateMergeBaseRed([], ctx);
    expect(r.ok).toBe(true);
    expect(r.notes.join("\n")).toMatch(/NOT a clean bill of health/);
    expect(r.notes.join("\n")).toMatch(/EMPTY INPUT SET/);
  });

  it("says so when EVERY candidate was inconclusive — the run demonstrated nothing", () => {
    const r = evaluateMergeBaseRed(
      [
        { file: "a.test.ts", verdict: "inconclusive" },
        { file: "b.test.ts", verdict: "inconclusive" },
      ],
      ctx,
    );
    expect(r.ok).toBe(true);
    expect(r.notes.join("\n")).toMatch(/ALL 2 candidate\(s\) were INCONCLUSIVE/);
    expect(r.notes.join("\n")).toMatch(/must not be read as a pass/);
  });

  it("counts a mixed inconclusive as neither red nor green, and still fails on the green", () => {
    const r = evaluateMergeBaseRed(
      [
        { file: "a.test.ts", verdict: "red" },
        { file: "b.test.ts", verdict: "inconclusive" },
        { file: "c.test.ts", verdict: "green" },
      ],
      ctx,
    );
    expect(r.ok).toBe(false);
    expect(r.failures).toHaveLength(1);
    expect(r.notes.join("\n")).toMatch(/inconclusive: b\.test\.ts/);
  });

  it("PRINTS every exemption it honours, and reports when exemptions were all there was", () => {
    const r = evaluateMergeBaseRed([{ file: "a.test.ts", exemptReason: "pure refactor, no behaviour change" }], ctx);
    expect(r.ok).toBe(true);
    expect(r.notes.join("\n")).toMatch(/exempt: a\.test\.ts — pure refactor/);
    expect(r.notes.join("\n")).toMatch(/NOTHING was actually verified/);
  });

  it("mentions the missing src/ change when a 'regression test' guards nothing", () => {
    const r = evaluateMergeBaseRed([{ file: "a.test.ts", verdict: "green" }], { srcChanged: false });
    expect(r.failures[0]).toMatch(/changes no src\/ files/);
  });
});
