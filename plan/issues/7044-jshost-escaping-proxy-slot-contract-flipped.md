---
id: 7044
title: "JS-host: an escaping `new Proxy` binding is slotted externref since #5204 — the #2615/#4707/#4754 struct-slot contract (and the #4754 gate) no longer hold"
status: ready
sprint: Backlog
created: 2026-10-17
updated: 2026-10-17
priority: low
horizon: m
feasibility: medium
reasoning_effort: high
task_type: bug
area: codegen
language_feature: proxy
goal: core-semantics
related: [2615, 4707, 4754, 5204, 7014]
requested_by: ttraenkler/wave15-grep-other-sentinels
---

# #7044 — escaping Proxy bindings lost their struct slot (JS-host lane)

## Problem

Red in the `issue-tests` detector (#7014), JS-host (`gc`) lane only:

| file | red tests | first error |
|---|---|---|
| `tests/issue-2615.test.ts` | 1 | `(local $p externref)` — expected NOT externref |
| `tests/issue-4707.test.ts` | 1 | `(global $__mod_proxy (mut externref) …)` — expected the target-shaped struct |
| `tests/issue-4754-module-global-proxy-escape.test.ts` | 6 | every "escaping → `(mut (ref null N))`" pin, incl. the `JS2WASM_PROXY_MODULE_ESCAPE_GATE=0` control |

The contract these pin (`statements/variables.ts` "#2615 regression fix",
`analysis/proxy-binding-escape.ts`): a Proxy binding that ESCAPES into a
call / `.call` receiver keeps its target's struct slot; only a purely
member-accessed one is externref.

## Measured

- Bisected (first-parent of `upstream/main`, probe `.tmp/pproxy.mts`:
  module global + function local, both `Object.prototype.toString.call(p)`):
  last STRUCT/STRUCT `523bd0428b^1`, first EXT/EXT **`523bd0428b`** = PR
  #5204. Inside the PR branch every commit is already EXT, including its only
  source commit **`8f161cbf15`** "feat(selfhost): compile TypeScript 5 parser
  graph to Wasm" (the commit CLAUDE.md cites as having shipped three codegen
  regressions); its merge-base `70e8e3c1ca` is STRUCT. The likeliest hunk is
  its 206-line rewrite of `analysis/mixed-assignment-carrier.ts` (the Proxy
  slot is now widened by the mixed-carrier rule before the escape analysis is
  consulted) — NOT yet confirmed by a revert.
- Behaviour is currently CORRECT for the shapes #2615 was written for
  (measured on main, JS-host): with `const p = new Proxy([1, 2], {})`,
  `Object.prototype.toString.call(p)` is `[object Array]`, `Array.isArray(p)`
  is `true`, `Object.getPrototypeOf(p) === Array.prototype` is `true`.

## Decision needed (why this is not a test edit)

Either (a) restore the struct slot for escaping bindings (find the #5204 hunk,
keep gc output byte-identical elsewhere), or (b) declare the slot rule obsolete
for the JS-host lane — retire `JS2WASM_PROXY_MODULE_ESCAPE_GATE` and replace the
slot pins with behavioural ones. (b) removes JS-host code and so needs its own
reviewed change under the 2026-10-10 sunset rule; (a) is JS-host work the same
rule discourages. The tests stay red until the owner picks.

## Plan for (a)

1. `git show 8f161cbf15 -- src/codegen/analysis/mixed-assignment-carrier.ts`
   and revert hunks one at a time against `.tmp/pproxy.mts` until the slot
   flips back; confirm with the three files above.
2. Re-run the standalone slice `built-ins/Proxy` base vs fix (the escape
   analysis is lane-shared) and the selfhost parser test #5204 added.
