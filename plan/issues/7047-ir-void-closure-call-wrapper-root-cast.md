---
id: 7047
title: "IR: a void closure call in statement position casts the callee to its DECLARED wrapper, not the wrapper root — illegal cast when an async closure flows into `cb: () => void`"
status: ready
sprint: Backlog
created: 2026-10-17
updated: 2026-10-17
priority: medium
horizon: s
feasibility: medium
reasoning_effort: high
task_type: bug
area: ir
language_feature: closures
goal: core-semantics
related: [2967, 3520, 7014]
requested_by: ttraenkler/wave15-grep-other-sentinels
---

# #7047 — IR void closure call loses #2967 slice 2a's root-wrapper cast

## Problem

`tests/issue-2967-engine-convergence.test.ts` → "async fn-expr through a
VOID-typed param after an `() => any` wrapper minted first" traps with
`RuntimeError: illegal cast` in `runVoid` (JS-host lane):

```ts
function firstMint(cb: () => any): any { return cb(); }
function runVoid(cb: () => void): void { cb(); }
export function main(): any {
  firstMint(function (): any { return 1; });
  runVoid(async function (): Promise<void> { /* two awaits */ });
  return 1;
}
```

#2967 slice 2a (14018cae01) fixed exactly this in the LEGACY callable-param
dispatch (`calls.ts`): the async activation allocates the closure under the
externref-result wrapper, wrappers are chained `sub final` under the
first-created root, so the call site must cast to the ROOT and re-cast per
funcref arm.

## Measured

Bisected on first-parent `upstream/main` (probe `.tmp/p2967.mts`, good =
`main` returns 1): first bad **`d32b4dad7b`** = PR #3791 (#3520 C25), whose
branch contains `2f0bb882ec` "fix(ir): allow void closure calls in statement
position". From then on `runVoid`'s `cb();` is IR-claimed, and the IR
closure-call lowering casts to the declared `() => void` wrapper — the cast
the legacy path stopped doing in July.

## Plan

1. Find the IR closure-call lowering 2f0bb882ec admitted (statement-position
   void call) and make it cast to the wrapper chain ROOT, re-casting per
   funcref arm, mirroring the legacy fix — or decline (demote) a callee whose
   static type is a callable PARAM that can receive an activated async closure.
2. Regression: the 2967 test above. Note the same file's five
   `binaryen.readBinary` failures ("distinct rec groups would be identical …
   use --enable-gc") are a harness problem fixed by
   `tests/helpers/binaryen-read.ts` (`readBinaryAllFeatures`, landed with #7026);
   apply it to this file in the
   same change (the file could not be touched while this test was red).
3. Standalone check: the same shape under `--target standalone`.
