---
id: 6907
title: "prettier upstream unit suite: the four parser-and-printer files (24 tests) never compiled or initialized on the JS host — fs lane, async try-in-catch, callable-receiver class hijack, concise-arrow vec carrier, async entry-body global shift, findLast hijack, JSDoc-@import module evaluated"
status: done
sprint: Backlog
created: 2026-10-07
updated: 2026-10-07
completed: 2026-10-05
priority: high
horizon: m
feasibility: medium
reasoning_effort: high
task_type: bug
area: codegen
language_feature: async, closures, modules, array-methods
goal: core-semantics
related: [3587, 2906, 4641, 3139, 6845, 6908, 6909]
requested_by: ttraenkler/wave13-prettier
origin: "2026-10-07 — prettier upstream unit suite 111/151 on main; get-parser/get-printer/massage-ast/resolve-parser 0/24"
loc-budget-allow:
  # 2026-10-07 the type-only-source init filter is one import + one call in the
  # multi-module collect phase; the logic lives in src/codegen/type-only-source-init.ts
  - src/codegen/index.ts
  # 2026-10-07 findLast/findLastIndex join the #3139 any-receiver refusal list (+3)
  - src/codegen/expressions/calls-closures.ts
  # 2026-10-07 the catch-region lowering + CFG build must live beside
  # lowerRegionBody/planTryCatchCfg: buildCatchRegion closes over the planner's
  # states/pendingResume/pendingLeads (+46)
  - src/codegen/async-cps.ts
  # 2026-10-07 entry-body liveBodies registration around the resume compile (+5)
  - src/codegen/async-frame.ts
  # 2026-10-07 concise-body expected type (+2)
  - src/codegen/closures.ts
  # 2026-10-07 callable-receiver refusal in the class fallback scan (+2)
  - src/codegen/expressions/call-receiver-method.ts
func-budget-allow:
  # 2026-10-07 buildCatchRegion is a closure over the planner state (+31)
  - src/codegen/async-cps.ts::planTryCatchCfg
  # 2026-10-07 entry-body liveBodies registration (+5)
  - src/codegen/async-frame.ts::ensureAsyncResumeFunction
  # 2026-10-07 concise-body expected type (+2)
  - src/codegen/closures.ts::compileLiftedClosureBody
  # 2026-10-07 callable-receiver refusal (+2)
  - src/codegen/expressions/call-receiver-method.ts::compileReceiverMethodCall
  # 2026-10-07 two list entries + one comment line in the #3139 refusal list
  - src/codegen/expressions/calls-closures.ts::tryExternClassMethodOnAny
  # 2026-10-07 the group arm dispatches a non-linear catch body to buildCatchRegion
  - src/codegen/async-cps.ts::buildBody
  # 2026-10-07 one call: dropTypeOnlySourceInitializers after collect-declarations
  - src/codegen/index.ts::generateMultiModule
---

# #6907 — prettier's parser-and-printer unit files never ran

## Problem

On upstream main `e7760d1c2a` the prettier upstream unit suite measured
**111/151**. Four files — `tests/unit/get-parser-plugin-by-parser-name.js`,
`get-printer-plugin-by-ast-format.js`, `massage-ast.js`, `resolve-parser.js`
(24 tests, all passing under Node) — scored **0**: they never compiled.

Each one imports `src/main/parser-and-printer.js`, whose import graph reaches
Prettier's config loaders. Peeling the failures one at a time exposed a chain:

| # | Symptom | Root cause |
|---|---------|------------|
| 1 | `'node:fs' call to 'readFileSync' requires the --allow-fs flag` | harness: the suite never opted these files into the Node host-dependency lane (axios `nodeHostDependencyFiles` pattern) |
| 2 | `async shape not supported` at `loaders.js:24` | `readBunPackageJson`: `try { return await a } catch (e) { try { return await b } catch {} throw e }` — the #2906 CFG machine lowered every catch body as a LINEAR chunk, so an awaited try inside a catch bailed and #3587 refused loudly |
| 3 | `stack-balance (#2090)` in three closures | `test.each([...])(...)`: `test` is a function with an expando `each`; the receiver-class fallback scan in `compileReceiverMethodCall` accepted any class whose methods cover the receiver's (all function-typed) props, so it cast the function to prettier's `AstPath` and called `AstPath_each` (void) |
| 4 | invalid Wasm `expected (ref null $vec), got (ref $vec_externref)` | a concise-body arrow `(name) => [{…}, make(name)]`: the closure result is a typed vec, but the body expression was compiled with NO expected type, so the literal chose its own externref carrier (a block body's `return` passes `fctx.returnType`) |
| 5 | invalid Wasm `extern.convert_any … found global.get of type i32` in `coreFormat` | while the async resume function compiles, the ENTRY function's body is reachable from no late-import shifter root (not `currentFunc`, not on `funcStack`, not yet in `mod.functions`); a string-constant import then left the `addAlignmentSize = 0` default's `$__hole` `global.get` one global behind |
| 6 | module init `equal is not a function` | harness: `loadNodeHostDependencies` flattens every builtin namespace into the dependency map, and `node:process` carries the deprecated `process.assert` function — it clobbered the `assert` MODULE key that `__node_assert` resolves. Node: `import { equal } from "node:assert"` is the assert module's `equal` |
| 7 | module init `tag is not a function` (`core-options.evaluate.js`) | `resolveAllImports` pulls JSDoc `@import … from "…"` targets into the program for the checker; every collected source then contributed its top-level statements to `__module_init`, so a module Node never loads ran at startup (calling an `outdent` tag that is not installed) |
| 8 | `Couldn't resolve parser "somePlugin"` | `plugins.findLast(cb)` on an `any` array was bound to `Uint8ClampedArray_findLast` (the #3139 hijack; `findLast`/`findLastIndex` were only refused under `noJsHost`) — the %TypedArray% bridge answered undefined |

## Implementation Plan

1. Harness (fair game — evidence above is Node behaviour):
   `prettier-upstream-suite-pin.json` gains `nodeHostDependencyFiles` for the
   four files; `prettier-upstream-suite.mjs` passes `DOGFOOD_NODE_HOST_DEPS=1`
   for them (web ambient default kept). `upstream-suite-compile-worker.mjs`
   re-asserts `node:`-module keys after the namespace flattening so a member
   can never shadow a module name.
2. `async-cps.ts` `lowerRegionBody`: when a catch body is not
   linear-canonical, lower it RECURSIVELY as a `catchRegion` (host lane only,
   never on a group with a finally). `planTryCatchCfg` builds it with
   `buildBody(region, catchHandler)` + an exit state, patches the try-exit
   goto to the join, and prepends the catch-param alias to every state of the
   region. `bodySegCount` and `tryCatchAsyncSpillInfo` count/collect it.
3. `call-receiver-method.ts`: the final "scan all classes" fallback refuses a
   receiver type with call signatures (a function object is never an
   instance).
4. `closures.ts`: a concise body compiles against the closure's `ref`/`ref_null`
   result as its expected type.
5. `async-frame.ts`: register the entry function's body (+ savedBodies) in
   `ctx.liveBodies` for the duration of the resume-function compile.
6. `src/checker/value-reachable-sources.ts` + `src/codegen/type-only-source-init.ts`:
   after collect-declarations, drop `moduleInitStatements` whose source is not
   reachable from the entry through VALUE edges (import/export-from without
   `type`, `import x = require`, `require("…")`, `import("…")`). Fail-safe: an
   unresolvable value edge that may name a compiled source disables the filter.
7. `calls-closures.ts`: `findLast`/`findLastIndex` join the unconditional #3139
   any-receiver refusal list.

## Resolution

Implemented as planned. Regression test
`tests/issue-6907-prettier-unit-compile-gaps.test.ts` (reduced untyped JS
fixtures for items 2, 3, 4, 7, 8, plus a value-import control for 7). Item 5
has no small repro (it needs a late string-constant import while an async
resume function compiles); the prettier suite exercises it.

Prettier upstream unit suite: see the PR body for the measured before/after.
The four files move from 0/24 to 22/24.

### Residuals (not in this change)

- `resolve-parser.js` (1 test): `Object.defineProperties(o, descs)` where
  `descs` is built dynamically (`Object.fromEntries(names.map(…))`) and each
  descriptor is an object literal with a `get() {}` METHOD — the host plural
  handler's `hasField` only sees struct FIELDS, so the getter is dropped
  (`Object.defineProperties({}, {f: {get(){…}}})` with an inline literal
  works). Also: an anonymous class expression instance's getter read through
  an `any` parameter in ANOTHER module answers wrong
  (`getD(new (class { get d() {…} })())`), and with two classes sharing a
  getter name the first class's getter wins (`getD(new J())` ran `K`'s). Both
  belong with #6845 (class identity on the JS host).
- `massage-ast.js` (1 test): `Cannot access property on null or undefined`
  inside `normalizePrinter`/`massageAst` — not reduced.
- `is-empty-doc.js` (6 tests): #6908.
- A silent async miscompile found while testing item 2: #6909.
