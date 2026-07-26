---
id: 3664
title: "Vacuity sweep: how much closed-issue evidence no longer holds after the #3603 de-inflation"
status: done
completed: 2026-07-26
created: 2026-07-26
assignee: ttraenkler/opus-loop-e
priority: high
horizon: m
feasibility: medium
task_type: audit
area: process, test262
goal: es5
sprint: current
related: [1334, 3603, 3626, 3646, 3647, 1195, 3042]
---

# #3664 — Vacuity sweep: closed-issue evidence that no longer holds

## Headline

**The vacuity was broad, and it cannot be bounded by surface.**

Before the #3603 de-inflation, `verifyProperty`/`propertyHelper`-covered tests
could report *pass* while their assertions were never evaluated. Issues were
closed on that evidence. This sweep measures how much of it no longer holds.

**Measured: 11.6 % of sampled baseline-passing tests, in closed issues' own cited
areas, no longer pass (95 % CI ±4.0; 29 of 251 tests across 48 issues).**
Corpus-wide, on a random rather than impact-ordered sample, the figure is
**6.1 % (±3.9)** of 31,053 baseline-passes — projecting to **~1,900 tests**.

**Do not read this as one defect's shadow.** Three successive framings were tried
and each was falsified by the next tranche (see "Falsified predictions"). The
exposure appears on descriptor round-trip, class elements, Proxy, generator brand
checks, mapped `arguments`, `for-in`, `delete`, **and escape-analysis
scalarization** — the last of which has no descriptor content whatsoever. A bound
asserted now would be the fourth version of the same mistake. **If a bound emerges
from evidence later it can be added; none is claimed here.**

## Method

For each closed issue, take the test262 files it **cites** that the **baseline
records as `pass`**, and re-run them on the current post-de-inflation tree. A
baseline-`pass` that now fails is a test whose green was masking a real failure —
i.e. exactly the evidence the issue was closed on.

- Each unique test runs **once** and is attributed to every citing issue.
- Sample size **n = 6 per issue** (fewer where an issue cites fewer baseline-passes).
- Issues ordered by an **impact rank** (descriptor/enumerable keywords + citation count).
- Tooling: `.tmp/cohort-extract.mjs`, `.tmp/adjudicate.mts` (regenerable; the
  baseline map comes from `.test262-cache/test262-current.jsonl`).

### Cohort selection — and the filter defect that was corrected

| stage | n |
| --- | ---: |
| issue files | 3,207 |
| `status: done` | 2,668 |
| **in a vacuity-covered area** (the cohort) | **414** |
| …of which cite ≥ 1 test262 path | 228 |
| **adjudicated in this sweep** | **48** |

The first filter also required an issue to **cite a test262 number**. That was
wrong and was dropped. **An issue can be closed on vacuous evidence without ever
quoting a number — "the tests pass now" is the same defect with no digits in
it.** Sampling the *excluded* set found 234 in-area issues discarded by that
criterion, including **#1821** (`delete obj.prop` always returns true), **#2885**
(descriptor-reflection core) and **#2796** (for-in own-key enumerate) — precisely
the shape being hunted. The evidence-type proxy was removed entirely: the
empirical re-run is a better instrument than a keyword heuristic guessing what the
evidence *was*. The filter's only remaining job is to avoid **missing**
candidates.

## Results

| tranche | issues | tests | now-fail | tranche rate | cumulative |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 12 | 69 | 10 | 14.5 % | 14.5 % |
| 2 | 12 | 63 | 5 | 7.9 % | 11.4 % |
| 3 | 12 | 66 | 10 | 15.2 % | 12.6 % |
| 4 | 12 | 53 | 4 | 7.5 % | **11.6 %** |

**Stopping criterion (fixed in advance, before the deciding result was visible):**
stop when the cumulative rate moves **< 2.0 points across two consecutive
tranches**. Movements were 3.1 → 1.2 → 1.0; the rule **fired after tranche 4**.

**Final: 29/251 = 11.6 % (95 % CI ±4.0). 48 issues adjudicated; 180 citing issues
and 186 area-only issues remain unadjudicated.**

### Highest per-issue rates

| issue | n | rate | surface |
| --- | ---: | ---: | --- |
| #1047 instance fields leak onto prototype via `_wrapForHost` | 3 | **100 %** | class elements |
| #1516 GeneratorPrototype this-value + name/length/prop-desc | 6 | 67 % | generator proto |
| #1364 class elements — method/field descriptor enumerable/configurable | 3 | 67 % | class elements |
| #1591 class/elements WasmGC↔host own-property reconciliation | 6 | 33 % | class elements |
| #3042 defineProperty attribute round-trip | 6 | 33 % | **general descriptor** |
| #1334 defineProperty attribute fidelity | 6 | 33 % | descriptor |
| #2180 Host-mode Proxy | 6 | 33 % | **Proxy** |
| #820 (Async)GeneratorPrototype brand check | 6 | 33 % | **generator brand** |
| #849 mapped `arguments` sync | 3 | 33 % | **arguments object** |
| **#1195 perf: escape-analysis scalarization** | 3 | **33 %** | **perf/codegen — no descriptor content** |

Many issues measured **0 %** — including general descriptor work (#1629, #797,
#1511, #3043, #1648, #2915, #3246, #1462). **Closure was not broadly unreliable;
it failed where a masked failure existed**, and that set is wider than any surface
so far proposed.

## Falsified predictions — recorded, not averaged away

Three framings were advanced and falsified. They are kept here because the
pattern is the durable finding:

1. **"Concentrated on class elements"** (after tranche 1) — falsified by **#3042**,
   a general `defineProperty` round-trip issue at 33 %.
2. **"Descriptor-attribute round-trip and class-element descriptors"** (after
   tranche 2) — falsified by **#1195**, an escape-analysis *performance* issue
   with zero descriptor content at the same 33 %, plus Proxy / generator-brand /
   mapped-`arguments` exposure.
3. **"The rate will fall as I work down the impact ranking"** — an explicit
   advance prediction. It fell (14.5 → 7.9) then **rose back** (→ 15.2).
   **Falsified.** The reassuring version of this finding is wrong.

**A fourth was retracted before publication:** *"if the exposure tracks #3647,
fixing #3647 largely restores these tests."* #3647's mechanism was refuted by its
own author (`opus-loop-a`) with sentinel-controlled measurements —
`propertyIsEnumerable` is wrong for *every* class-prototype method including ones
whose tests pass, and `isEnumerable` short-circuits on an earlier conjunct before
reaching it. **Two independent failures to reproduce that mechanism**: that
refutation, and an earlier 6/6-correct probe from this lane on a pre-de-inflation
base (flagged for re-verification rather than banked, which is what made it usable
as corroboration).

**Each framing was attractive because it was reassuring, which is exactly when to
distrust it.**

## Reconciling the numbers

| figure | what it measures |
| --- | --- |
| **1,066** | exact count of tests newly failing in the #3603 merge_group diff |
| **~1,900** (6.1 % ±3.9 of 31,053) | random-sample projection of *all* baseline-passes that no longer pass — a **superset**, including genuine regressions and non-de-inflation causes |
| **11.6 %** (±4.0) | rate within **closed issues' own cited areas**, impact-ordered — higher than corpus-wide by construction |

1,066 sits inside the ~1,900 interval. These are consistent, not competing.

Of the 1,066, roughly **734** are the `verifyProperty` sole-clause-enumerability
intersection (`opus-loop-a`'s corrected figure — 852 = sole-clause any-status and
838 = newly-surfaced any-clause were filters that did not compose, so neither is
the population). **That leaves ~332 newly-surfaced failures that are NOT
`verifyProperty`-shaped and are currently unowned** — Proxy, mapped `arguments`,
generator brand checks and the surfaces this sweep found. That remainder is the
natural next target.

## Disposition rule applied throughout

**Correction attached to the issue file; never a silent reopen.** Where residual
work is already owned by a live issue, the closed issue stays `done` with a
pointer (reopening would duplicate). #1334 is the worked example — see its
"ADJUDICATION" section, which found 11.1 % of its own baseline-passes now failing,
every one on a descriptor-attribute assertion.

## Addendum 2026-07-26 — the 1,066 partition, reconstructed exactly

**The "~332 unowned non-`verifyProperty` remainder" does not exist.** It was
computed as `1066 − 734`, i.e. as the complement of a *sole-enumerability-clause*
filter — but that complement is **not** "non-`verifyProperty`". Most of it is
still `verifyProperty`-shaped, just failing on other descriptor clauses.

Reconstructed from the merge_group artifact (`test262-merged-report`, run
30179758665) joined against the baseline on `file`, keeping `base == pass &&
cand != pass`. **Total reconstructs to 1,066 exactly**, matching the gate, so the
set is right.

| partition | n | owner |
| --- | ---: | --- |
| **A** `verifyProperty`-shaped, **all** failed clauses are enumerability | **734** | the #3647 cohort |
| **B** `verifyProperty`-shaped, other/mixed clauses | **304** | largely **#3653** (writable/configurable) |
| **C** **not** `verifyProperty`-shaped | **28** | genuinely unowned |
| | **1,066** | sum checks ✅ |

**B's clause composition** (a test may fail several):

| clause combination | n |
| --- | ---: |
| configurable + enumerable + writable | 69 |
| configurable + value + writable | 59 |
| value | 56 |
| configurable + writable | 32 |
| writable | 23 |
| configurable | 18 |
| configurable + enumerable + value + writable | 17 |
| value + writable | 10 |
| remaining combinations | 20 |

`writable` appears in **218** of B and `configurable` in **206** — closely
matching #3653's independently measured 202 / 134, so **B is substantially that
issue's population** rather than new work.

**C — the entire genuinely-unowned remainder, 28 tests:**

| signature | n |
| --- | ---: |
| `strict rerun: timeout (30s)` | 12 |
| `Test262:AsyncTestFailure:Test262Error: [object WebAssembly.Exception]` | 8 |
| `timeout (30s)` | 5 |
| `obj['property'] value should be N` | 2 |
| `_vecMirrorSource.get is not a function` | 1 |

**17 of 28 are timeouts** — infrastructure, not semantics. **Unclassified tail:
zero**; five signatures cover all 28.

**So the actionable statement is: there is no large unowned slice here.** The
newly-surfaced work is almost entirely already owned by #3647 (734) and #3653
(304), and the true remainder is 28 tests dominated by timeouts. The single
non-timeout lead worth pulling is `_vecMirrorSource.get is not a function`.

## Follow-ups

1. **The ~332 non-`verifyProperty` newly-surfaced failures are unowned** — the
   highest-value remaining slice on this surface.
2. **180 citing + 186 area-only issues remain unadjudicated.** The rate had
   stabilised, so sampling stopped; a full pass is available if a per-issue verdict
   is needed rather than a population rate.
3. **The mechanism behind the non-class-element exposure (#1195, #2180, #820,
   #849) is unidentified.** Do not assume it is descriptor-related.

## Method note

The general rule this sweep supports, and the reason its own filter had to be
fixed mid-flight:

> **A green test proves the harness reported nothing, not that the behaviour is
> correct.** Verify any pass-rate claim against a post-de-inflation tree, run a
> negative control that must fail, and sample what your filter **excluded** — an
> unproven filter returning few candidates looks exactly like a correct one.
