---
id: 3428
title: "Host async-verdict: 'async completion marker not observed' on 4,617 async tests + 'asyncTest called without async flag' (225) under oracle v8"
status: in-progress
assignee: ttraenkler/opus-dev-b
sprint: current
created: 2026-07-18
updated: 2026-07-18
priority: high
horizon: m
feasibility: medium
task_type: bug
area: test262-runner, async
language_feature: async-functions, async-generators, promises
es_edition: multi
goal: test262-conformance
related: [3370]
origin: "2026-07-18 oracle-v8 harvest (fable harvest agent): host `other` sub-bucket, largest single non-strict-rerun class @ oracle 8."
---

# #3428 — 'async completion marker not observed' (oracle-v8 async verdict)

## Problem

The single largest host `other`/uncategorized failure class after the
strict-rerun own-property work is the async completion verdict:

| Signature                              | Records |
| -------------------------------------- | ------: |
| `async completion marker not observed` |   4,617 |
| `asyncTest called without async flag`  |     225 |

All affected tests are async — async-function, async-generator, dynamic-import
namespace, for-await, AsyncFromSyncIterator:

```
test/language/expressions/async-generator/yield-star-next-not-callable-undefined-throw.js
test/language/expressions/async-generator/yield-star-getiter-sync-returns-number-throw.js
test/language/expressions/class/async-gen-method-static/yield-star-next-then-non-callable-string-fulfillpromise.js
test/language/expressions/dynamic-import/namespace/await-ns-delete-non-exported-strict.js
test/built-ins/AsyncFromSyncIteratorPrototype/next/for-await-next-rejected-promise-close.js   (asyncTest-no-flag)
test/built-ins/AsyncFromSyncIteratorPrototype/return/return-null.js                            (asyncTest-no-flag)
```

## Root cause (hypothesis)

Consequence of #3370 (authoritative harness). The upstream harness signals async
test completion via `$DONE` / `asyncTest` + the `async` negative/flags metadata.
The two signatures indicate the runner's async-verdict path is incompletely
wired to the literal harness:

- `async completion marker not observed` — the async test ran but the runner
  never saw the harness's completion callback fire (so it can't distinguish
  pass from hang/failure and records a generic failure).
- `asyncTest called without async flag` — the harness's `asyncTest` helper was
  invoked for a test the runner did not classify as async (flags/metadata
  mismatch between the authoritative harness and the runner's frontmatter
  parse).

#3370's acceptance criteria explicitly require "Preserve Test262 strict reruns
and negative/**async** verdict semantics" — this class suggests the async half of
that contract is not fully satisfied. Needs triage on whether the completion
marker is a runner-integration gap (high ROI, ~4.8k tests) vs genuine async
codegen failures now honestly surfaced.

## Acceptance criteria

- Triage: determine how many of the 4,617 are runner async-verdict wiring vs real
  async codegen failures (compile a handful of the samples locally and inspect
  whether the async body actually completes).
- The async completion marker is observed for tests that do complete; the
  `asyncTest called without async flag` mismatch is resolved (correct async
  classification from the authoritative harness metadata).
- The `async completion marker not observed` class drops materially from 4,617.

## Cross-reference

Consequence of #3370. Overlaps the async/generator codegen families (#680/#3178)
only if triage shows real codegen failures; lead hypothesis is runner-side
verdict wiring.

## Triage (opus-dev-b, 2026-07-18) — DECISIVE: both signatures are runner-wiring, NOT codegen

Confirmed the lead hypothesis. Reproduced with MINIMAL synthetic tests run
through `runTest262File` (host lane), isolating wiring from async codegen:

| Synthetic test (`flags: [async]`)                          | Verdict                                         |
| ---------------------------------------------------------- | ----------------------------------------------- |
| body = `$DONE();` (synchronous completion)                 | `async completion marker not observed`          |
| body = `print("Test262:AsyncTestComplete");`               | `... not observed` (BUT string hit real stdout) |
| body = `console.log("Test262:AsyncTestComplete");`         | `... not observed` (string hit real stdout)     |
| body = `asyncTest(async function(){});` (+asyncHelpers.js) | `asyncTest called without async flag`           |

The marker string is PRINTED (visible on stdout) yet the runner reports "not
observed" — so the async body runs and calls the completion path; the marker is
simply never captured into `harnessOutput`. A synchronous `$DONE()` fails
identically to an async one, which excludes async codegen as the cause.

### Root cause A — 4,617 "async completion marker not observed"

The compiler lowers `console.log(x)` to dedicated host imports
(`console_log_string` / `console_log_externref` / …). `resolveImport`'s
`console_log` case (`src/runtime.ts:7224`) hardcodes the **global**
`console.log`/`.warn`/`.error`/… and **never consults `deps.console`** — so the
worker's injected capture proxy (`buildImports(result.imports, { console:
consoleProxy }, …)`, `scripts/test262-worker.mjs:1416`) is ignored. The
harness's `$DONE → __consolePrintHandle__ → print → console.log(marker)` writes
to the REAL stdout, `harnessOutput` stays empty, and the async poll
(`test262-worker.mjs:1520`, `test262-shared.ts:754`) times out.

**Fix (runner-wiring, small, backward-compatible):** in `resolveImport`'s
`console_log` arm, resolve the method off `deps?.console ?? console` (fall back
to the global console when no override is supplied — playground / normal runs
unchanged). Verify the worker actually loads the change: it runs the prebuilt
`scripts/runner-bundle.mjs` (`buildImports` at :62590), so the bundle must be
rebuilt (or the CI path confirmed to transpile `src/`) for the fix to take
effect in the sharded run. End-to-end check: the minimal `$DONE();` synthetic
above must flip to `pass`.

### Root cause B — 225 "asyncTest called without async flag"

`asyncHelpers.js`'s `asyncTest` guards with
`Object.prototype.hasOwnProperty.call(globalThis, "$DONE")`. `$DONE` is defined
by `doneprintHandle.js` as a top-level `function $DONE`, which a JS engine
running the harness as a SCRIPT exposes as a `globalThis` own-property — but our
compiled MODULE keeps it a module-local binding, so the `hasOwnProperty` check
is false and `asyncTest` throws. Independent of A.

**Fix options (B):** (1) after `doneprintHandle.js` in the async assembly,
append a bridge `globalThis.$DONE = $DONE;` (compiler must support assigning a
local function to a `globalThis` own-property that `hasOwnProperty` then sees) —
mirrors the #3427 assembly-accommodation approach; or (2) expose `$DONE` via the
`buildOriginalHarnessSandbox` globalThis. (1) is preferred if the globalThis
property write is supported standalone; needs a quick spike.

### Recommendation

A is the big bucket (4,617) and a clean, low-risk `src/runtime.ts` one-liner +
bundle rebuild — do it first, standalone PR. B (225) is separate and needs a
small globalThis-property spike. Neither is async codegen; #680/#3178 are NOT on
the critical path for this class.
