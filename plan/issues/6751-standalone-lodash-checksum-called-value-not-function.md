---
id: 6751
title: "standalone lodash: after module init, the perf checksum (`words(text).length + kebabCase(text).length`) throws `called value is not a function`"
status: ready
sprint: current
created: 2026-09-29
priority: high
horizon: m
feasibility: medium
reasoning_effort: high
task_type: bug
area: compiler
goal: standalone
requested_by: ttraenkler/sendev-standalone
related: [6736, 6713, 6732, 4586]
---

# #6751: lodash standalone-dynamic fails in the checksum phase

## Problem

After [#6736](https://js2wasm.loopdive.com/dashboard/issue.html?slug=6736-standalone-fnctor-prototype-length-reads-number),
lodash 4.18.1 finishes `runInContext` module init in `--target standalone`
with 0 imports. The first call to the perf export then throws. Measured
2026-09-29 on `3c9d85424a` + #6736, with the command below:

```
npx tsx scripts/generate-npm-compat-report.mjs --only lodash --no-write --perf-only --lane standalone-dynamic
```

The lane record, verbatim:

```
"status": "runtime-error", "diagnostic": "TypeError: called value is not a function",
"optimizationVerified": true, "phase": "checksum"
```

The sample op is `words(text).length + kebabCase(text).length`. The O4
optimization now succeeds on this base, so the runtime error is the only
thing left in the lane.

## Direction

`words` → `asciiWords` / `unicodeWords` use `string.match(reAsciiWord)`, and
`kebabCase` → `createCompounder` → `arrayReduce(words(deburr(string).replace(reApos, '')), callback, '')`.
Either the match of a realm-aliased `RegExp` (#6713 carriers) or a callback
reached through `arrayReduce` is the likely non-callable. Bisect with
`globalThis.__probeStep` markers inside the two entry points, then reduce.
