# dev-b context handoff (2026-07-02)

Wind-down handoff per the Fable-model directive. Summarises my in-flight work so
a successor can resume without re-deriving context.

## Delivered this session (all closed out)

- **#2856** (IR `body-shape-rejected` → 0) — Step-1 **diagnostic** PR **#2426
  MERGED**. Key correction recorded in the issue: the bucket is NOT driven by
  unhandled statement KINDS (Switch/Break/Continue/Do/Labeled/ForIn — zero of
  those appear); it's inner expression/statement SHAPE rejections (mutable
  assignment `x=e`/`arr[i]=e` ~11, #1804 C-loop+array-literal guard 5, closures
  3, `%` 2, if/else@non-tail 2, `++`/`--` 1, `instanceof` 1; 17 need exact
  selector instrumentation). Impl is now **[SENIOR-DEV] task #10** — needs opt-in
  selector instrumentation + mutable-assignment IR lowering (SSA/local
  versioning). My claim is released.
- **#2863** (dynamic-shape `__get_builtin`/groupBy) — my lib-types PR **#2422
  CLOSED as superseded**. While it rode CI another PR landed native standalone
  `__object_groupBy` + made the "groupBy does not exist" TS diagnostic non-fatal
  and marked #2863 `done` (2026-07-02). Re-measured on current main: `Object.groupBy`
  compiles+runs in BOTH host and standalone (native, zero host imports) WITHOUT my
  lib change — so it was redundant and was the cause of the merge_group auto-park.
  #2863 stays `done`; claim released.

## #2875 (String.prototype cluster) — RELEASED with a measure-first finding

**Do not treat #2875 as a String-glue slice yet.** Measured on current main:

- The String method **BODIES already work standalone** — direct calls
  `"  hi  ".trim()`, `"5".padStart(3,"0")`, `"ABC".toLowerCase()`, `"abc".at(-1)`,
  `"ab".repeat(3)`, `"abc".includes("b")` all compile + run correctly, host-free.
- The ~675 standalone fails (triaged; top methods split 111, trim 49, search 35,
  replace/replaceAll/match ~99, case-conversion ~90) are almost entirely
  **reflective forms** that test262 uses to probe coercion/metadata:
  - `not-a-constructor.js` (34 methods) → `isConstructor(String.prototype.m)` via
    `Reflect.construct` → gated on **#2896** (native function-object metadata:
    IsConstructor flag).
  - `_A10` / `verifyNotWritable` reflective descriptor reads (13+) → the method
    closure needs own `length`/`name` property descriptors (probed:
    `String.prototype.indexOf.length` reads 1 correctly, but
    `.hasOwnProperty("length")` returns 0) → **#2896** territory.
  - `.call(undefined)` coercion tests (e.g. `trim/15.5.4.20-1-1.js`) → reflective
    call machinery **#2876**.
  - `Symbol.match`/`replace`/`split` (35) → RegExp-standalone.
- **Recommendation: sequence #2875 AFTER #2896/#2876 land.** PER THE LEAD's
  caution — before treating #2896 as a hard blocker, VERIFY its actual status on
  current main: parts of its reflective-metadata scope may already be delivered by
  #2885/#2876, so the block may be narrower than the frontmatter says. Probe
  `isConstructor(String.prototype.charAt)` and
  `Object.getOwnPropertyDescriptor(String.prototype.charAt,"length")` in
  standalone on current main to see exactly what's missing.
- Non-reflective coercion gaps (e.g. `indexOf/position-tointeger-toprimitive.js`)
  fail in HOST too → not #2875's standalone-de-masked scope; a separate general
  coercion issue.

## #2873 (language/expressions cluster) — my active task (task #8)

276 `language/expressions/**` host-pass/standalone-fail (de-masked from #2862),
plus ~108 `language/statements/**` and ~57 `language/function-code/**`.

Triage tooling: `.tmp/triage-2873.mjs` clusters standalone fails by operator dir
(standalone-only; note it needs `process.on('unhandledRejection',…)` +
`uncaughtException` guards — some tests spawn host-Promise microtasks that reject
after the await and crash the loop without them; already added).

**RESOLVED BY SUCCESSOR (dev-f2, 2026-07-02): task is STALE — do not build.**

- The guarded triage run (`.tmp/triage-2873.mjs`, started 03:32) was killed by
  its 800s timeout before printing the histogram (raw noise only in
  `.tmp/triage-2873-out.txt`). It is superseded by the reground already ON MAIN
  in `plan/issues/2873-standalone-language-expressions-cluster.md`.
- **Cross-session dispatch collision**: a parallel-session dev (dev-2873) landed
  `fix(#2873)` PR #2427 at 2026-07-01T23:36:46Z — three seconds AFTER dev-b's
  claim (23:36:43Z). Their full 11,036-file reground on current main: the "276"
  figure is stale; 10 residual hard-fails, then a landed slice (net +5) leaves
  **5 residual files, all tracked by sibling issues** (#2849 object-prop numeric
  read, #2862 ToPrimitive x3, BigInt extern-class carrier). Per the issue file:
  "nothing tractable left in this cluster for a dev slice".

### Chosen slice + why

None — see above. TaskList task #8 marked completed-as-stale; claim released;
flagged to tech lead for issue-status reconciliation (issue frontmatter still
`in-progress`/`assignee: dev-2873`, owned by the parallel session).

### Remaining sub-clusters (honest sizes)

The 5 residual files (from the on-main reground), none of them #2873 work:
`S11.6.1_A2.1_T1` (#2849) · `S11.6.1_A2.2_T1`,
`coerce-symbol-to-prim-return-obj`, `get-symbol-to-prim-err` (#2862) ·
`subtraction/bigint-and-number` (BigInt carrier).

## Environment notes for the successor

- Isolation worktree is `/workspace/.claude/worktrees/agent-a993439bdc1e1b26d`
  (Edit is confined here). I reused ONE worktree across branches; each issue's
  real branch lives on origin.
- Cross-dev lock: `node scripts/claim-issue.mjs <id> ttraenkler/<name> --branch <b>`
  (exit 3 = owned by someone else, exit 4 = done on main).
- Standalone probe: `compile(src, { target: "standalone" })` (NOT `"wasi"` — the
  `ctx.standalone` flag is `options.target === "standalone"`). `compile` is async.
- Runner: `runTest262File(file, cat, timeoutMs, "standalone")` from
  `tests/test262-runner.ts` — the 4th arg selects the standalone lane.
- Method-name buckets keyed in a plain object collide with `Object.prototype`
  (`constructor`/`toString`/`valueOf` are real String method dirs) — use a `Map`.
