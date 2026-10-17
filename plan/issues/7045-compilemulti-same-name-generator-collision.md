---
id: 7045
title: "compileMulti: a top-level function in one module is called instead of the same-named function of ANOTHER module when the two differ in kind (generator vs plain)"
status: ready
sprint: Backlog
created: 2026-10-17
updated: 2026-10-17
priority: medium
horizon: m
feasibility: medium
reasoning_effort: high
task_type: bug
area: codegen
language_feature: modules
goal: core-semantics
related: [3505, 7014]
requested_by: ttraenkler/wave15-grep-other-sentinels
---

# #7045 — cross-module function-name collision in `compileMulti`

## Problem

`tests/issue-3505-host-compilemulti-harness-callable-init.test.ts` is red in
both lanes (#7014): the exact FYI row
`language/module-code/instn-uniq-env-rec.js` fails with
`Expected SameValue(«0», «"sixth"»)`. The fixture module declares its own
`function* sixth() {}`; the entry declares `function* sixth() { return 'sixth'; }`.
§16.2.1.6 gives each module its own environment record, so the entry's `sixth`
must be its own.

## Reduced repro (JS-host; same in standalone)

```js
// ./other.js — NOT imported by entry, only present in the graph
function* sixth() {}
// ./entry.js
function sixth() { return "sixth"; }
var v = sixth();
export function test() { return v === "sixth" ? 1 : typeof v; }
```

`compileMulti(files, "./entry.js")` → `test()` answers `"object"`: the entry's
top-level `sixth()` called OTHER's generator. Same-KIND collisions (two plain
functions, or two generators called from inside a function) answer correctly,
so the mismatch is in a NAME-keyed per-kind set — `ctx.generatorFunctions` is
a `Set<string>` populated by bare name (`declarations.ts:1832/2993`,
`statements/nested-declarations.ts:1480`) and consulted by bare name at call
sites (`expressions/calls.ts:1688/1700`, `expressions/new-super.ts:386`, …).
The original-harness FYI row also needs `typeof sixth` before the call, which
suggests the module-init call path resolves through a different (name-keyed)
route than in-function calls. Probes: `.tmp/pmulti.mts`, `.tmp/pfyi.mts` and
`.tmp/fyi/*.js` in the wave-15 worktree.

## Plan

1. Confirm the key: dump `ctx.generatorFunctions` and the `funcMap` entry
   chosen for the entry's `sixth` call in the repro.
2. Key generator/async-ness by the function DECLARATION (or by the
   module-qualified wasm name compileMulti already mints for collisions),
   not the bare name; route every `.has(name)` consumer through one helper
   that resolves the identifier's declaration first.
3. Regression: the repro above (both lanes) + the 3505 FYI rows; standalone
   test262 `language/module-code` base vs fix.
