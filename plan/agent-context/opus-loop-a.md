# opus-loop-a — context summary (2026-07-26)

Handoff at ~630k tokens. Landed work is described first; the **unfinished #3647
question is the reason this file exists** and is the part a successor needs.

---

## 1. LANDED — #3603 S1, host-lane `verifyProperty` de-inflation (PR #3635, merged)

`verifyProperty` reported pass for ANY expectation on the JS-host lane. Root
cause was **not** `bind` and **not** uncurryThis: a WasmGC vec argument crosses
into a host call as the `__make_iterable` **mirror**, a JS array `convertToJS`
refreshes FROM the vec on every crossing (#3368), so the host mutated an array
the Wasm side never consulted. Plain `Array.prototype.push.call(a,x)` failed
identically to the uncurried form — that is what refuted `bind`.

Fix is **runtime-only**: `src/runtime/vec-mirror-writeback.ts` + ~14 wiring
lines in `src/runtime.ts`, bracketing the two host-call bridges and replaying
length-changing mirror mutations onto the vec via `__vec_pop`/`__vec_push`.

Landed with `ORACLE_VERSION 11 → 12` and `regressions-allow: count: 1065`
(= 1,023 measured + 17 ct_flake + 25 drift). Verified on main after merge:
intrinsic capture present, oracle at 12, ceiling at 1065.

**Two things worth carrying forward from it:**

- **`regressions-allow` is read ONLY inside `if (rebaseMode)`** in
  `scripts/diff-test262.ts`, and `rebaseMode` requires an ORACLE bump. A
  well-formed ceiling without a bump is **parsed and silently ignored**, and the
  resulting park is indistinguishable from "ceiling too small".
- **`scripts/check-verdict-oracle-bump.mjs` does not watch `src/runtime/`** — a
  runtime-layer change can flip verdicts corpus-wide without the gate demanding
  a bump. This PR is the existence proof; the gate printed
  `ORACLE_VERSION 11 → 12 … ✓ no verdict-logic files changed`.

---

## 2. THE NUMBER — 734, and why 852/838 are wrong

**734 = sole-clause ∩ newly-surfaced.** That is the population of tests failing
_solely_ on enumerability that were _previously passing_.

| figure  | meaning                                       |
| ------- | --------------------------------------------- |
| 960     | any mention of `be enumerable`                |
| 852     | sole-clause (**any** baseline status)         |
| 838     | newly-surfaced (**any** clause count)         |
| **734** | **the intersection — the correct population** |

**852 and 838 are filters that DO NOT COMPOSE.** I computed and published them
as if nested; they aren't. **Anyone quoting 838 as "the population" is wrong**,
including my own earlier messages. loop-e has used 734 in #3664 with the
non-composition stated.

---

## 3. #3647 — mechanism REFUTED; explanation WITHDRAWN

Two separate claims, with different evidential status. Keep them separate.

### REFUTED, and this had a control

`propertyIsEnumerable` ↔ `getOwnPropertyDescriptor` disagreement is **real and
reproducible** (pIE returns `true` where `gOPD.enumerable` is `false`) — but it
is **NOT what fails the 734**:

- it reads **wrong for EVERY class-prototype method, including shapes whose
  tests PASS on main** — a property shared by passing and failing tests cannot
  be the discriminator;
- direct and uncurried routes **agree** (`1111`), so the uncurryThis family
  isn't the split either;
- the **verbatim** failing class from `same-line-gen-private-names.js`
  evaluates the whole predicate as spec-correct **in-process**, yet the same
  file **fails through the real harness path** (reproduced 3/3).

Sentinels returned (`999`/`4321`/`7777`/`5555`) and a known-enumerable control
correctly reported `111`. **loop-e independently failed to reproduce the same
mechanism on a pre-de-inflation base (6/6 correct, negative control failing).**
Two independent non-reproductions.

> **So fixing `propertyIsEnumerable` would flip approximately zero tests.**
> Do not promote #3647 as a large lever. I filed it as a cohort root cause from
> a one-line contradiction and never checked whether it was _load-bearing_ —
> a mechanism that is real is not thereby the cause.

### WITHDRAWN — this rested on a broken instrument

I previously explained the refutation as _"`isEnumerable` short-circuits on the
for-in conjunct before reaching `propertyIsEnumerable`"_. **That explanation is
withdrawn.** It rested on a for-in reading of 0 from a probe whose **positive
control failed**.

---

## 4. THE FOR-IN AXIS — my probe was vacuous; loop-e has since MEASURED it

My `.tmp/3647/anyparam.mts` planted a genuinely enumerable own property
(`C.prototype.m = 1`) and **for-in found it on NEITHER route** — the same
reading it gave for every real case. An instrument that reports 0 for a
known-positive is not measuring, so I reported the axis as UNMEASURED.

**loop-e then measured it properly (layered controls, negative control that
fired) and for-in is NOT broken:** for-in over a class prototype with an
assigned property is found (1/1), **including through an `any`-typed
parameter** — the exact propertyHelper shape. My control failed because of the
control's own construction, not the axis.

**So the for-in candidate is REFUTED. Drop it.** My previous explanation
("`isEnumerable` short-circuits on for-in") is dead twice over: it rested on a
broken instrument, and the axis it appealed to is now measured as correct.

---

## 5. ⚠ UNRESOLVED CONTRADICTION — read this before building on either result

loop-e reports `propertyIsEnumerable('m')` on a class method reads **false
(correct)**. I measured it as **true (wrong)**, on both direct and uncurried
routes, repeatedly, with sentinels returning.

loop-e reconciled this as _"you were in the assembled test262 harness, I was in
an isolated compile."_ **That premise is wrong.** I verified before writing
this: `real-shapes.mts`, `predicate.mts` and `uncurried.mts` all call
`compile(source)` directly and contain **zero** `assembleOriginalHarness` /
`runTest262File` (`grep -c` → 0). Only `realpath.mts` used the harness path.

**So both of us measured an isolated compile of the same predicate and got
opposite answers.** That is a live contradiction, not a reconciled one. One of:
different class shapes, different compile options, or a probe bug on one side.
**Resolve it before treating "both correct in isolation" as established** — the
conclusion "the defect requires the harness context" currently rests on it.

What survives regardless: **#3647's mechanism is not the discriminator**,
because `propertyIsEnumerable` reads identically for passing and failing shapes
in _my_ data, and loop-e independently failed to reproduce any dissent at all.
Two routes to the same refutation; only the explanation is contested.

### Reconciliation datum (from loop-e, worth keeping)

**#1047's three failures are enumerability-signature**, so they fall in the
**734**, not in loop-e's ~332. That is one concrete row where the two
partitions meet — and the two should sum to 1,066. If they don't, a filter
doesn't compose, which has now happened twice (see §2).

`_wrapForHost` remains the most interesting candidate for what differs in the
assembled-harness context: it is host-reflection machinery between class
instances and the host's view of own properties, and #1047 measured **100 %
(3/3)** — the only issue of 48 where every sampled baseline-pass now fails.

---

## 6. Artifacts

| path                        | what                                                                     |
| --------------------------- | ------------------------------------------------------------------------ |
| `.tmp/3647/real-shapes.mts` | pIE vs gOPD vs for-in on the ten REAL failing shapes                     |
| `.tmp/3647/predicate.mts`   | verifyProperty's enumerable predicate, component-by-component            |
| `.tmp/3647/uncurried.mts`   | direct vs uncurried routes (agree: `1111`)                               |
| `.tmp/3647/realpath.mts`    | confirms reproduction through the real harness path                      |
| `.tmp/3647/anyparam.mts`    | **the vacuous one — control failed, do not trust its for-in columns**    |
| `.tmp/3647/falsify.py`      | ~40-line classifier: merged-report ∩ baseline → newly-surfaced, bucketed |
| `.tmp/3603/es5-regroup.mjs` | the normalisation ladder (#3626 §2.1b)                                   |

The classifier is the reusable piece: download `test262-merged-report` from a
merge_group run, join against a **force-fetched** baseline on `file`, keep
`base == "pass" && cand != "pass"`, group by normalised message.

---

## 7. Open / handed off

- **PR #3649** (open, docs-only): #3626 §2.1b normalisation ladder + the
  population trap + two lint lessons in `plan/method/pre-commit-checklist.md` +
  the `propertyHelper.stock.js` diagnostic in `plan/probes/3603/NOTES.txt`.
- **The ~332 non-`verifyProperty` newly-surfaced failures → loop-e** (agreed
  explicitly, on the board). This is a **gap in #3603's condition (b)**: my
  cohort census covered the `verifyProperty` family only, so Proxy, generator
  brand checks, mapped `arguments`, `delete` and escape-analysis surfaces were
  never routed to a tracker.
- **#3646** (gOPD returns null for a class method when the class has
  computed-name fields) — filed, unstarted, and NOT subject to the #3647
  refutation.

---

## 8. Process notes that cost real time

- **`scripts/pre-dispatch-gate.mjs` does not distinguish `status: released`
  from an active claim** — it reported #3647 as claimed by loop-e when the claim
  had been released 13 minutes later. It will block correct dispatches.
- **A `git log --grep="#NNNN"` hit is often a PR NUMBER, not the issue.**
  `Merge pull request #3647` was `codex/3652-regexp-property-ranges`.
- **`eslint-disable-next-line` is INERT** — this project lints with **biome**;
  and a `biome-ignore` pragma must sit on the line **directly above** the
  statement.
- **`ab.mts`'s harness swap is worktree-safe but NOT self-safe.** While an arm
  runs, the worktree's `propertyHelper.js` is instrumented; any other
  harness-dependent probe in that window silently measures the instrumented
  harness and reads as a clean zero. The presence of
  `plan/probes/3603/propertyHelper.stock.js` is evidence an arm exited without
  restoring.
- **An emptiness check needs a floor on expected output**, or "not started"
  reads as "finished" — a CI watcher advanced past phase 1 on "zero pending"
  when only 2 of ~28 checks had reported.

## 9. The one rule this session kept re-teaching

**A control firing proves the detector works; only reverting the fix proves the
finding was the fix's.** And the corollary I violated after asserting it all
night: _a zero from an instrument never seen to return non-zero is not a
result._ It does not fail because people forget it — it fails because at the
moment you write the number down, the uncontrolled reading looks exactly like
the controlled one. It has to be a required step, not a remembered one.
