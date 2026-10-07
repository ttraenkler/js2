---
id: 6909
title: "JS host async: `try { return \"ok \" + (await p); } catch …` returns the awaited value alone — the binary-expression operand is dropped (silent wrong answer)"
status: ready
sprint: Backlog
created: 2026-10-07
updated: 2026-10-07
priority: high
horizon: s
feasibility: medium
reasoning_effort: high
task_type: bug
area: codegen
language_feature: async, await, try-catch
goal: core-semantics
related: [2906, 5372, 3587, 6907]
requested_by: ttraenkler/wave13-prettier
origin: "2026-10-07 — found while testing #6907's nested try-in-catch lowering; reproduces on main without it"
---

# #6909 — `return <expr containing await>` inside an awaited `try` loses the expression

## Problem

Upstream main `e7760d1c2a`, JS host, `compileProject` + `allowJs`. Node in
brackets.

```js
async function a(p) { return "ok " + (await p); }                         // "ok v"  ["ok v"]
async function b(p) { try { const v = "ok " + (await p); return v; } catch (e) { return "err"; } } // "ok v" ["ok v"]
async function c(p) { try { return "ok " + (await p); } catch (e) { return "err"; } }               // "v"    ["ok v"]
```

Only `c` is wrong: inside a try region, a `return` whose operand CONTAINS an
await (not a bare `return await p`) settles with the awaited value itself. The
`+ "ok "` is silently dropped — no diagnostic.

## Implementation Plan

1. `async-cps.ts` `lowerRegionBody` routes a `ReturnStatement` with a nested
   await through `lowerAwaitingStatementByHoisting` →
   `async-await-hoist.ts` `lowerReturnValue`. Dump the region body for `c`
   and check whether the hoisted chunk ends with `sawReturnAwait: true`; the
   try-exit then emits `settleSent` (settle with SENT — the raw awaited
   value), bypassing the hoisted remainder `return "ok " + tmp`.
2. Fix: a hoisted return whose operand is not exactly the await must end in a
   chunk that evaluates the remainder and `return`s it (lead), not a
   `settleSent` terminator — i.e. only mark `sawReturnAwait` for a bare
   `return await e`.
3. Regression test with `a`/`b` as controls (pass before and after) and `c`
   plus the same shape in a catch body and a conditional.
4. Scoped test262, both lanes: `language/statements/try`,
   `language/expressions/await`, `language/statements/async-function`.
