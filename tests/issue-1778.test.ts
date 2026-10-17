import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname ?? ".", "..");

function readRepo(path: string): string {
  return readFileSync(join(ROOT, path), "utf-8");
}

function snippetBetween(source: string, startNeedle: string, endNeedle: string): string {
  const start = source.indexOf(startNeedle);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endNeedle, start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("#1778 landing standalone test262 pass rate", () => {
  it("does not derive standalone conformance from feature-row badge heuristics", () => {
    const html = readRepo("website/index.html");

    expect(html).not.toContain("hostOffPassScale");
    expect(html).not.toContain("applyHostMode");
    expect(html).not.toContain("standalone estimate");
    expect(html).toContain("standalone conformance");
    expect(html).toContain("getStandaloneSummary");
    expect(html).toContain("renderUnavailable");
  });

  it("publishes the measured standalone summary used by the host-off toggle", () => {
    const websiteReport = readRepo("website/public/benchmarks/results/test262-standalone-report.json");
    const publicReport = readRepo("public/benchmarks/results/test262-standalone-report.json");
    const report = JSON.parse(websiteReport);

    expect(JSON.parse(publicReport)).toEqual(report);
    expect(report.mode.target).toBe("standalone");
    // The file was a hand-published June summary (4368 / 43106, `summary_only`)
    // when this pin was written. CI now refreshes it with the FULL standalone
    // report on every baseline promotion (see the [skip ci] "baseline refresh"
    // commits that touch it), so exact counts are stale by construction. Pin
    // the shape the host-off toggle reads instead.
    const { pass, total, fail } = report.summary;
    expect(Number.isInteger(pass) && pass > 0).toBe(true);
    expect(Number.isInteger(total) && total >= pass).toBe(true);
    expect(Number.isInteger(fail) && fail <= total - pass).toBe(true);
  });

  it("landing page fetches real standalone data and exposes unavailable or stale states", () => {
    const html = readRepo("website/index.html");

    expect(html).toContain("test262-standalone-current.json");
    expect(html).toContain("./benchmarks/results/test262-standalone-report.json");
    expect(html).toContain("standalone_summary");
    expect(html).toContain("No standalone test262 baseline has been published");
    expect(html).toContain("Standalone test262 data is not available");
    expect(html).toContain("summaryHasStaleResults");
    expect(html).toContain("Standalone test262 data is stale");
  });

  it("host-off render path uses the standalone summary and keeps headline stats in sync", () => {
    const html = readRepo("website/index.html");
    const hostOffBranch = snippetBetween(
      html,
      "if (!options.hostEnabled) {",
      "const { summary } = applyConformanceOptions",
    );

    expect(hostOffBranch).toContain("getStandaloneSummary(standaloneData, scope, options.strictOnly)");
    expect(hostOffBranch).toContain("renderUnavailable(captionMain, options.captionSub, standalone.reason)");
    expect(hostOffBranch).toContain("renderDonut(standalone.summary, captionMain, options.captionSub)");
    expect(hostOffBranch).not.toContain("hostSummary");
    expect(hostOffBranch).not.toContain("applySummaryRatios");
    // The caption argument is IR-decorated since fa1e5df779 (#IR website view),
    // so match the call shape rather than one formatting of it.
    expect(html).toMatch(/updateHeadlineStat\(\s*\{ pass, fail, ce, skip, total \},\s*captionMain,/);
    expect(html).toMatch(/updateHeadlineUnavailable\(captionMain, [^\n]*captionSub, detail\)/);
    expect(html).toContain("window.__conformanceHeadlineHydrated");
  });

  it("pages build copies the standalone report into the deployed benchmark results", () => {
    const buildPages = readRepo("scripts/build-pages.js");

    expect(buildPages).toContain("test262StandaloneReportSource");
    expect(buildPages).toContain("test262-standalone-report.json");
  });
});
