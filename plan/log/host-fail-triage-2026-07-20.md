# Host-lane test262 fail triage — flip-ranked dispatch list (2026-07-20)

Source: `.test262-cache/test262-current.jsonl` (fetched via
`scripts/fetch-baseline-jsonl.mjs`), oracle_version 8, `oracle_lane: honest`,
timestamp 2026-07-19 19:05. **Confirmed JS-HOST lane** (entries carry host
imports: `env::__box_number`, `env::__call_function`, `env::RegExp_new`, …;
standalone would have none).

## Totals (host lane)
| status | count |
| --- | ---: |
| pass | 28,833 |
| fail | 16,791 |
| compile_error | 2,196 |
| compile_timeout | 160 |
| skip | 108 |
| **total** | **48,088** |

Non-pass (fail + CE + timeout) = **19,147**. Clusters below cover ~85% of it.

## How to read
`count` = flip ceiling (upper bound; many tests fail for a primary reason and
would still fail on a secondary one after the fix). `lane` = RUNNER-only (0
compiler change — skip-filter / harness / TS-parser) vs CODEGEN (real compiler
bug). `owner` = existing issue, cross-checked against `origin/main` + issue
status on 2026-07-20.

## Ranked clusters

| # | count | root cause | lane | owner | notes |
|---|---:|---|---|---|---|
| 1 | **4190** | Temporal tests run & fail instead of being skipped (split: `Temporal is not defined` ~1177 + CE `Dynamic new(...x) spread not array-like` 1447 + misc) | **RUNNER** | **NEW (skip-policy)** | Temporal is a documented skip feature (CLAUDE.md). 4190 non-pass tests reach compile/exec. Confirm skip policy under oracle-v8, then filter at the runner. **Single biggest denominator lever, 0 compiler change.** |
| 2 | ~2076 | TypedArray/TypedArrayConstructors/Atomics ctor → `Cannot convert null to object [in __module_init]` | CODEGEN | **#3441** (ready, in-flight) | Exactly the issue's scope (2,069 fails). Do not re-triage. |
| 3 | 1273 | async-gen / class-private tests: `Test262:AsyncTestFailure: [object WebAssembly.Exception]` — WasmException leaks as the async failure value (1108 are language class/async-gen) | CODEGEN | **fix-async-completion** (agent active) | Async completion + exception-object identity. Big; already staffed. |
| 4 | 712 | integrity-level writes don't throw: `Expected a TypeError to be thrown but no exception` (freeze/seal/preventExtensions, non-extensible property add) | CODEGEN | **#3430** (ready, in-flight, 1,316-record scope) | Confirmed #3420 finding: frozen vec writes silently succeed instead of throwing. |
| 5 | **547** | class **private/static** elements fail `verifyProperty` own-property checks (`should have an own property` / `doesn't appear as an own property`) | CODEGEN | **RESIDUAL → NEW** | #1051/#1144/#1364/#1047 are all `done` yet 547 persist. Fresh residual issue — descriptor/own-property fidelity for private+static class elements. **Top FRESH dispatch candidate.** |
| 6 | 545 | `assert.throws` sees internal `wasmClosureDynamicBridge` instead of the expected error constructor (`Expected a wasmClosureDynamicBridge to be thrown/got`) | CODEGEN | **#3429** (ready, in-flight, 544-record scope) | Exact match. Do not re-triage. |
| 7 | 549 | wrong error KIND — `Expected a RangeError but got a TypeError` (& reverse); DataView detached-buffer + resizable-ArrayBuffer (+ some Temporal) | CODEGEN | **#1350** (BLOCKED) | Needs unblock; #1515 (DataView ToIndex) is `done`. Escalate #1350's blocker. |
| 8 | 473 | `Cannot access property on null or undefined` — resizable-ArrayBuffer-backed TypedArray grow/resize mid-iteration + default-param arguments | CODEGEN | **#1350** (BLOCKED) | Same resizable-buffer root as #7. |
| 9 | 430 | genuinely missing built-in methods → `X is not a function/constructor` (built-ins area; excludes 142 eval/dynamic-import which are skip) | CODEGEN | **NEW (sub-triage)** | Needs a second pass to name the specific missing methods. |
| 10 | 332 | error-identity: `(e instanceof TypeError)` false on a real thrown TypeError + `strict rerun: Expected TypeError, got TypeError: Cannot delete non-configurable` | CODEGEN | **#3422** (strict-rerun, ready) + **#2962** (done → RECHECK) | #2962 native-error-identity is `done`; baseline predates or fix is partial — recheck before filing new. |
| 11 | ~150 | early errors not detected: `Expected a SyntaxError to be thrown` / `early error not detected` (real: statements 54 + expressions 47 + module 39 + global; 118 eval-code are skip) | CODEGEN (parser) | **NEW** | Early-error detection in the checker/parser. |
| 12 | 204 | `Expected a ReferenceError to be thrown` — TDZ / let-before-init + annexB block-scoped function hoisting | CODEGEN | **NEW** | TDZ + annexB binding semantics. |
| 13 | 183 | `assert is not defined` — harness `assert` not present when the test body runs | **RUNNER** | **NEW (harness)** | Harness-assembly ordering bug; 0 compiler change. |
| 14 | 164 | `Cannot convert bigint to a BigInt` / `Cannot convert a Symbol value to a number` | CODEGEN | **NEW** | bigint/symbol coercion in the value substrate. |
| 15 | 152 | `import.defer(...)` / `import.source(...)` Stage-3 proposals `SyntaxError not supported` (CE) | **RUNNER** | skip | Deferred proposals — add to skip filter. |
| 16 | 122 | `Signature declarations can only be used in TypeScript files` (CE) — TS checker rejects valid JS (overload/ambient constructs) | **RUNNER** | **NEW (parser)** | The TS front-end mis-rejects valid JS; 0 codegen. |
| 17 | 111 | `Cannot find module '.../module-code_FIXTURE.js'` — module-code fixture path unresolved | **RUNNER** | **NEW (runner path)** | Module fixture resolution bug. |
| 18 | 59 | `ShadowRealm is not defined` | **RUNNER** | skip | Unsupported — add to skip filter. |

## Dispatch guidance
- **Do NOT dispatch #2, #3, #4, #6** — already staffed (#3441, fix-async-completion, #3430, #3429). Verify their PRs land; don't spin parallels.
- **Highest-value FRESH codegen work** (not already owned): **#5** class private/static own-property residual (547), **#11** early-errors (~150), **#12** ReferenceError/TDZ (204), **#14** bigint/symbol coercion (164), **#9** missing-builtin sub-triage (430, needs a naming pass first).
- **Biggest single lever overall is RUNNER-only #1 (Temporal, 4190)** — a skip-policy/skip-filter fix, 0 compiler change, ~4k denominator reduction. Bundle with #15 (Stage3 import, 152) and #18 (ShadowRealm, 59) as one "restore skip filters under oracle-v8" task, plus #13 (assert-not-defined, 183), #16 (sig-decl, 122), #17 (module FIXTURE, 111) as a "runner/harness fidelity" task. These are the cheapest pass-rate wins.
- **#7/#8 blocked on #1350** (resizable-ArrayBuffer/detached, ~1000 combined) — worth escalating #1350's blocker; large ceiling.

## Cluster #9 sub-breakdown (missing built-in, "X is not a function/ctor", by feature)
After removing eval/dynamic-import (skip): Temporal 64 (→ #1 skip), Atomics 60
(overlaps #3441 null-receiver), DataView 30 + ArrayBuffer 30 (→ #1350
resizable/detached), Iterator 50 (**Iterator-helpers: `Iterator.prototype.{map,
filter,take,drop,flatMap,…}` — coherent FRESH feature cluster**), Array 40,
String 25, Object 20, TypedArray 17, Promise 16, Math 5 (scattered specific
methods), DisposableStack 8 + Proxy 7 (skip/deferred). The dispatchable fresh
slice here is **Iterator helpers (~50)** + a scattered-methods pass over
Array/String/Object/Promise. The rest fold into #1/#3441/#1350/skip.

## Method notes
- Clustered by the pre-computed `error`/`error_category`/`error_signature`
  fields in the jsonl, aggregated with substring matchers, then category- and
  filename-partitioned to separate Temporal/resizable/eval sub-populations.
- Merge/status cross-checked against `origin/main` and issue frontmatter on
  2026-07-20. #3441/#3430/#3429/#3422 are `ready` (in-flight). #2962/#1051/#1144/
  #1364/#1047/#1515 are `done`. #1350 is `blocked`.
