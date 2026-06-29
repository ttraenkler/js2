---
id: 2849
title: "dynamic-object numeric property reads back 0 when the same property is also compared via === string / == null (acorn ecmaVersion 2022 not normalised → spurious import attributes)"
status: blocked
architect_spec: candidate
assignee: sendev-ecmaver
sprint: current
priority: medium
horizon: l
feasibility: hard
reasoning_effort: max
created: 2026-06-29
task_type: bugfix
area: codegen
language_feature: dynamic-object-property-type-inference
goal: acorn-dogfood
related: [2841, 2836, 1712]
depends_on: []
blocks: [1712]
umbrella: 1712
---

# #2849 — dynamic-object property mis-typed when read in heterogeneous (string-`===` / `==null` AND numeric) contexts

Carved out of **#2841**. Distinct root cause: a **compiler codegen bug** in how a
dynamic-object property is typed/stored when the SAME property is used both in a
string/null equality and in a numeric arithmetic/relational context. NOT a
marshalling issue.

## Observable gap (the edge.js half of #1712)

The uncapped NM differential on a module source shows compiled acorn emitting a
spurious `attributes: []` on every `ImportDeclaration` / `ExportNamedDeclaration`
that node-acorn lacks (edge.js had 4; reproducible on a 1-line module). Both run
the SAME pinned acorn@8.16.0.

```
import x from "y";   // ecmaVersion: 2022, sourceType: "module"
// node-acorn : body[0].attributes  -> absent (undefined)
// compiled    : body[0].attributes -> []        (SPURIOUS)
```

## Root cause (verified by bisected repro)

acorn sets `node.attributes` ONLY when `this.options.ecmaVersion >= 16`
(acorn.mjs:1813/1838/1965 — `16` is the YEAR-normalised form of ES2025).
`getOptions` normalises the caller's year-form value:
`else if (options.ecmaVersion >= 2015) { options.ecmaVersion -= 2009; }`
(acorn.mjs:443-444), so `2022 → 13`, and `13 >= 16` is false → no attributes.

Compiled acorn does NOT apply that normalisation: `this.options.ecmaVersion`
stays `2022`, so `2022 >= 16` is TRUE and import-attributes are wrongly enabled.

Minimal repro (no acorn) — the normalisation step is fine in isolation, but
breaks when the property is ALSO compared to a string / null:

```ts
// @ts-nocheck
var d = { ecmaVersion: null, sourceType: 0 };
export function run(ev) {
  var opts = { ecmaVersion: ev, sourceType: 1 };
  var o = {};
  for (var k in d) { o[k] = opts[k]; }
  if (o.ecmaVersion >= 2015) { o.ecmaVersion -= 2009; }   // WORKS: run(2022)=13
  return o.ecmaVersion;
}
```

Adding the acorn-shaped `=== "latest"` / `== null` guards BEFORE the numeric
branch breaks it — `o.ecmaVersion` then reads back **0** in the numeric context:

```ts
  if (o.ecmaVersion === "latest") { o.ecmaVersion = 1e8; }       // <- either of
  else if (o.ecmaVersion == null) { o.ecmaVersion = 11; }        //    these two
  else if (o.ecmaVersion >= 2015) { o.ecmaVersion -= 2009; }     // run(2022)=0 (BUG)
```

Both `=== "latest"` (string compare) and `== null` independently trigger it. The
property `o.ecmaVersion` is used in a STRING/null-equality context AND a numeric
context; the compiler appears to commit the dynamic-object property slot to a
representation that makes the numeric read return 0 (a default/empty slot). This
is a **dynamic-object property type-inference / storage** bug, likely broad
(value-rep scale), and should get an architect spec before coding.

## Scope / why separate from #2841

- #2841 was a HOST-MARSHALLING fix (arrow param `name`/`type`); shipped & verified
  (`background.js` 0 non-quirk).
- This is a CODEGEN bug (dynamic-property polymorphic-type handling). Different
  layer, different fix.
- It only surfaces in the differential on **edge.js** (module sourceType), which
  also cannot parse on `main` until the #2838 return-stack PR **#2325** lands —
  so verification is doubly gated. Recommend scheduling after #2325 merges.

## Acceptance

- `import x from "y";` parsed by compiled acorn at `ecmaVersion: 2022` has NO
  `attributes` field (matches node-acorn); `ecmaVersion: 2025/16` still DOES.
- The minimal repro `run(2022) === 13` with the `=== "latest"` / `== null`
  guards present.
- With #2325 stacked, edge.js uncapped NM differential reaches ZERO non-quirk
  divergences (completing the #1712 edge.js bar together with #2841).
- 0 test262 regressions; full merge_group + standalone-floor.

## Pointers

- acorn: `getOptions` ecmaVersion normalisation (entry module ~443-444);
  `node.attributes` gates (~1813 / ~1838 / ~1965).
- Compiler: dynamic-object property read/write typing for a property used across
  string-equality and numeric contexts (`$Object` slot typing /
  `__extern_get`/`__extern_set` numeric coercion). Likely the same family as the
  any-value polymorphic-read substrate work.
- Repro scripts (this branch, `.tmp/nm-2841/repro-ecma*.mjs`, gitignored).

## Implementation Plan (architect, verify-first, 2026-06-30)

> **Classification:** senior-dev · **effort:** M (code ~4 lines + comments) /
> L (validation: full merge_group + standalone-floor + acorn dogfood + uncapped
> NM-diff). **This is NARROWER than the issue's "likely broad value-rep" framing
> — see "Diagnosis correction" below.** It is a host/standalone **parity** fix:
> the correct behaviour already ships in standalone (#2584); host was left out.

### Diagnosis correction (verify-first refutes the union-typing root cause)

The issue body (and sr-paramquirk's diagnosis) attribute the bug to a
**union-typed (`number | "latest"`) dynamic property** that "reads back 0 when
compared via `=== "latest"` / `== null`". **Reproduced on current main, this is
not the trigger.** The string/null comparison is incidental. Probe matrix
(host mode, `compile()` + `wrapExports`, all on a `{}` expando bag populated by a
`for (k in d) o[k] = opts[k]` copy loop, then `run(2022)` expecting `13`):

| Probe | plain `o.prop = literal`? | `=== "latest"` / `==null`? | `o` local type | `run(2022)` |
|------|------|------|------|------|
| numeric-only (baseline) | no (only `-=`) | no | `externref` ($Object) | **13 ✓** |
| `=== "latest"`, no plain `=` (P7) | no | yes | `externref` ($Object) | **13 ✓** |
| plain `=`, NO string compare (P6) | **yes** | no | `(ref null $__anon_0)` struct | **0 ✗** |
| plain `=` + `=== "latest"` (orig B) | yes | yes | struct | **0 ✗** |
| plain `=` + **dynamic** read `o["x"]` (P8) | yes | yes | struct | **0 ✗** |

The discriminator is a **plain static property assignment `o.prop = <value>`**,
NOT the string/null comparison. P7 has the string compare and is correct; P6 has
no string compare and is broken.

### Root cause (mechanism, confirmed from emitted WAT)

`var o = {}` followed by a **plain** static assignment `o.prop = literal` triggers
TypeScript expando-member inference (`getTypeAtLocation(o)` → `{ ecmaVersion: number }`),
which the **widening pass** in `declarations.ts` lowers to an anonymous nominal
struct `$__anon_N` containing only the **statically-assigned** field names
(`ecmaVersion: f64`; `sourceType`, written only via the computed loop, is absent).
Then:

- **static** `o.ecmaVersion` access → `struct.get/set $__anon_N 0` (typed slot,
  initialised to `f64.const 0` at `struct.new`).
- **computed** `o[k] = opts[k]` write → `__extern_set(extern.convert_any(o), k, v)`
  — into the **host WeakMap sidecar** (runtime.ts:41 "extra properties JS attaches"),
  a storage area **disjoint** from the struct field.

The for-in loop writes `ecmaVersion` through the dynamic path (host sidecar); the
static read pulls `struct.get` of the never-written f64 slot → **0**. The two
representations of the same logical object never share storage. (Symmetric for
P8's dynamic read: import-collection even *skips* `__extern_get` for a widened var
— index.ts:13619 `!isWidenedVar` — so reads also miss the sidecar.)

This is exactly acorn's `getOptions` shape: `for (opt in defaultOptions) options[opt] = …`
then `options.ecmaVersion` static reads/writes — so the year→internal normalisation
(`options.ecmaVersion -= 2009`) operates on a slot that reads back 0, leaving
`ecmaVersion` at a value that wrongly satisfies the `>= 16` import-attributes gate
⇒ the 4 spurious `attributes: []`.

### Verify-first finding (the explicit ecmaVersion readback)

> **Reported to tech lead:** the `o.ecmaVersion` numeric read returns **`0`**
> (the un-written f64 struct-slot default), **not** `2022` un-normalised and
> **not** the union-mis-read the issue hypothesised. The `-= 2009` normalisation
> code *does* run, but on a slot that reads `0`. So the import-attributes gate
> fires because `ecmaVersion` lands at a wrong (0-derived) value via a
> **storage-split**, not because normalisation was skipped.

### Why host is broken but standalone is fine (the actual gap)

The fix **already exists for standalone** (#2584): `markObjectHashConsumers`
(declarations.ts:2548) poisons any expando var that is **bracket-accessed**
(`o[expr]`, read or write), **for-in'd**, `in`-tested, or passed to
`Object.keys/values/entries/GOPD/GOPN/assign`; a poisoned var **skips widening**
(suppression at declarations.ts:2231, *not* mode-gated) and stays a uniform
`$Object`, so static + computed access share storage.

But the poison **scan** is wrapped in `if (ctx.standalone)` (declarations.ts:2207–2211),
so in **host/gc mode** (which the acorn NM-diff and edge.js run in)
`objectHashConsumerVars` is never populated, the var is widened, and the storage
split bites. The adjacent comment's claim — *"Host mode is unaffected — it keeps
the struct fast path via the live-mirror Proxy writeback"* — is **false for the
computed-write → static-read case**: the #1712 host proxy (`_hostProxyCache`)
canonicalises *identity* but its writes land in the WeakMap sidecar, which
`struct.get` cannot observe.

### Fix (Option A — remove the host gate; host/standalone parity)

**File: `src/codegen/declarations.ts`** — the `scanStatements` widening pass,
lines **2207–2211**.

Remove the `if (ctx.standalone)` wrapper so the `markObjectHashConsumers` scan
runs in **all** modes:

```ts
// BEFORE (2207–2211)
if (ctx.standalone) {
  for (const s of stmts) {
    markObjectHashConsumers(s, varName, ctx.objectHashConsumerVars);
  }
}
// AFTER
for (const s of stmts) {
  markObjectHashConsumers(s, varName, ctx.objectHashConsumerVars);
}
```

The existing consumer of `objectHashConsumerVars` (the `continue` at 2231) is
already un-gated, so this single change activates the suppression in host mode —
**no new suppression logic, no new state.** Also update the now-inaccurate
comments at 2204–2206 and 2222–2223 (drop "Standalone:" / "Host mode is unaffected
… live-mirror Proxy writeback"; state that the #2584 rationale — `o.a=7; o["a"]→0`
— applies identically to host, and the host proxy does not cover computed-write →
static-read).

**Empirically de-risked:** with exactly this change applied locally, the issue's
B/C cases and all `plain-=` probes return `13`; P8's dynamic read returns the true
value (`2022`). Reverted before writing this spec (architect leaves no code).

### Edge cases / blast radius (senior-dev must validate)

- **No new logic** — only the population scan is un-gated; `dynamicDescriptorWidenVars`
  (#2372) and `objectHashConsumerVars` (#2584) suppressions are already mode-agnostic.
- **Perf, not correctness:** host expando objects that are *also* bracket/for-in/
  `Object.keys`-accessed lose the struct fast path → `$Object` (slower member access).
  Acorn dogfoods in host mode and uses many such objects (`getOptions`, keyword/
  context tables) — watch the NM-diff/dogfood wall-clock, but **correctness wins**.
- **Method-dispatch risk:** confirm no host path *requires* `widenedVarStructMap`/
  `$__anon_N` to exist for a bracket-accessed var (the #2664/#2659 member-set/get
  dispatchers, fnctor reconstruction). The suppression fires *only* for the exact
  broken pattern, and standalone already exercises the `$Object` route for these,
  so the path is well-trodden — but the acorn `Parser`/`types$1` identity tests
  (#1712/#2664 tokenizer-loop) MUST stay green.
- **Standalone is a no-op** for this change (already had the behaviour) — but the
  shared standalone-floor baseline must still be diffed to confirm no incidental
  shift from the host-side struct-count change.

### Alternatives considered (rejected)

- **Option B — struct-field-aware computed access:** lower `o[k]` to a runtime
  key→slot dispatch (extend `__set_member_*` / `__get_member_*` to dynamic keys).
  Broad: touches every computed access on every expando struct, adds per-access
  dispatch cost, high regression surface. Rejected.
- **Option C — fix the host proxy `set` trap** to map a dynamic key matching a
  field name into the typed struct slot. Needs a per-struct field-name table at the
  boundary, only patches host (standalone already correct via A), and lets the two
  representations keep drifting. Rejected.

Option A makes host match the already-correct standalone behaviour — the minimal,
lowest-risk fix.

### Test plan (bar = #1712 edge.js close-out)

1. **Unit / equivalence** (add to `tests/`): the issue repro must return `13` —
   both the `=== "latest"` / `== null` guarded forms AND the bare `plain = literal`
   + `o[k]=` form (no string compare). Add a regression test that an
   `import x from "y";` parsed by compiled acorn at `ecmaVersion: 2022` has **no**
   `attributes` field, and at `2025/16` still **does**.
2. **edge.js NM differential, UNCAPPED** (`maxDivergences: 100000`,
   `ecmaVersion: 2022`, `sourceType: module`): the 4 spurious `attributes: []` gone,
   **ZERO non-quirk divergences**; `background.js` stays **0**. (Stack on #2329 —
   arrow/template/sequence marshalling — so the diff isn't muddied; re-merge
   `origin/main` once #2329 lands.)
3. **Full test262 merge_group:** 0 regressions. **Standalone-floor:** 0 regressions.
4. **Acorn dogfood** (#1712/#2664 tokenizer-loop suite): green.

### Pointers (code)

- `src/codegen/declarations.ts:2207–2211` — the gate to remove (population scan).
- `src/codegen/declarations.ts:2548` `markObjectHashConsumers` — detection (already
  covers `o[expr]`, `in`, for-in, `Object.keys/...`).
- `src/codegen/declarations.ts:2231` — existing (un-gated) suppression consumer.
- `src/codegen/declarations.ts:2235–2268` — the `__anon_N` widening this suppresses.
- `src/codegen/index.ts:13619` — `!isWidenedVar` import-collection skip (the read-side
  half of the split; auto-corrected once the var is no longer widened).
- `src/runtime.ts:41` / `:1936` (`_hostProxyCache`) — host sidecar + identity proxy
  (the "live-mirror" that does NOT bridge computed-write → static-read).

---

## Resolution (sendev-ecmaver, 2026-06-30)

Implemented **Option A** exactly as specced: removed the `if (ctx.standalone)`
wrapper around the `markObjectHashConsumers` population scan in
`src/codegen/declarations.ts` (was ~2207–2211) so the #2584 poison scan runs in
**all** modes. The suppression consumer (the `continue` at ~2231) was already
un-gated; updated the now-inaccurate "Standalone:" / "Host mode is unaffected …
live-mirror Proxy" comments.

**Verify-first (host mode, `compile()` + `buildImports`/`setExports`):**

| | `runGuarded(2022)` (`=== "latest"` / `==null` guards) | `runPlain(2022)` (bare `o.prop=` + `o[k]=`, no string cmp) |
|---|---|---|
| **before (main)** | `0` (bug) | `0` (bug) |
| **after (fix)** | `13` | `13` |

`tests/issue-2849.test.ts` (the minimal repro) is **green** with the fix.

### BLOCKER — Option A breaks the acorn dogfood target (escalated 2026-06-30)

The minimal-probe de-risk is insufficient: **the gate removal breaks compiled
acorn entirely in host mode.** Validated against the uncapped NM differential
(`.tmp/nm-diff-2849.mjs`, `maxDivergences: 100000`):

- **Control (pre-fix `origin/main`):** all three targets parse; node counts
  match. `edge.js` shows exactly the **4 spurious `attributes: []`** divergences
  (the bug) among the larger accepted-quirk set; `background.js` parses.
- **With the fix:** **every** target — including the trivial sanity
  `foo(bar,baz);` and `"1;"` with `{}` defaults and `ecmaVersion: 5` (no
  normalisation) — throws on `parse(...)`. Unwrapping the `__exn_tag` payload:
  `TypeError: Cannot access property on null or undefined` (a **synthesised,
  line-0 null-check** in a member-access dispatcher).

**Root cause of the breakage.** Instrumenting the acorn compile, the gate
removal newly poisons **exactly one** var: acorn's `getOptions` **`options`**
(`var options = {}; for (opt in defaultOptions) options[opt] = …`), whose
inferred widened struct is `{ ecmaVersion, allowReserved, allowHashBang,
onToken, onComment }` — i.e. it carries **function-typed** fields
(`onToken`/`onComment`). Forcing `options` to stay `$Object` (correct for the
ecmaVersion read) makes it later trap when stored into `this.options` and
read/dispatched deep in the parser. **This is unavoidable for this issue:**
acorn's `options` is the *same* var that must be `$Object` to fix edge.js, so
there is **no narrowing of the poison predicate** that fixes edge.js without
putting acorn's `options` on the `$Object` path that traps.

**Minimal repros do NOT reproduce.** Synthetic `{}` expandos with a for-in
copy + function-typed field + `Array.isArray` guard + function reassignment all
return correctly (`.tmp/probe-2849/min.mjs` cases A/B/C → 5/6/5). The trap is a
deeper acorn-specific `$Object`/`this.options` member-dispatch interaction, not
the obvious "function field in `$Object`".

**Why this is not trivially fixable / why escalated.** The real remaining work
is fixing the **host `$Object` representation** so acorn's `options` object
(stored to `this.options`, then member-dispatched) does not hit the line-0
null-check trap — unknown-depth codegen work in the member-access dispatcher
(the architect's flagged #2664/#2659 risk), **not** the 4-line gate removal.
The architect's de-risk validated only the numeric-only minimal probe; it never
compiled full acorn (the acceptance target). Option B/C (struct-aware computed
access / host-proxy field mapping) were rejected by the architect as broad, but
one of them — or a `this.options`-specific lowering fix — is likely the actual
path. **No PR opened; branch `issue-2849-host-expando-gate` carries the Option-A
fix + green minimal test + this analysis as the foundation for the follow-up.**

Repros (gitignored, on branch): `.tmp/nm-diff-2849.mjs` (uncapped NM-diff),
`.tmp/probe-2849/{verify,trap,bisect,unwrap,min}.mjs`.

### Coordinator decision (2026-06-30): stay `blocked`, latent / non-blocking

Tech lead confirmed #2849 is **NOT a real-world edge.js blocker** and Option A
must **not** ship: edge.js is **already 0-non-quirk on `main`** at matched
`ecmaVersion` (verified on a confirmed-#2329 checkout). The 4 spurious
`attributes: []` only appear under `nm-diff.mjs`'s **`ecmaVersion: 2022`**
oracle/compiled mismatch — a **version-skew artifact** of the differential
harness (year-form vs internal-form), not a runtime divergence at matched
ecmaVersion. So the underlying codegen bug (storage-split on a computed-write →
static-read expando) is **real but latent / non-blocking**, and the only sound
fix is the architecture-hard host `$Object` member-dispatch rework — out of
scope for a gate tweak. Hence `status: blocked` + `architect_spec: candidate`;
claim released; branch + minimal test retained as the record. No re-architecture
now.
