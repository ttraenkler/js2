---
id: promise-async-capability-residual
title: "Promise residual: NewPromiseCapability(C) for custom constructors + resolver-element-function object semantics (~163 fails)"
status: in-progress
assignee: ttraenkler/sdev-async2
sprint: 63
created: 2026-06-17
updated: 2026-06-17
priority: medium
feasibility: hard
reasoning_effort: high
task_type: bugfix
area: runtime
language_feature: promises
goal: spec-completeness
related: [1368, 1382, 1042, 1326, 1116]
routing: senior-dev — fold into the #1042 async epic (shared async-capability machinery, broad blast radius)
origin: "2026-06-17 dev-mech2 investigation of TaskList #28 [STANDING] Promise residual"
---

# Promise residual — async-capability machinery

## TL;DR for the senior-dev / #1042 owner

The remaining `built-ins/Promise` test262 residual is **not a grab-bag**. It
converges on a single area: the host-mode async-capability machinery in
`src/runtime.ts` (the `Promise_all` / `Promise_race` / `Promise_allSettled` /
`Promise_any` factories around `src/runtime.ts:9866-9949`, the `_resolveCtor`
helper, and the synthesized resolve/reject *element* functions). There is no
isolated low-risk plain-dev slice — every bucket touches `NewPromiseCapability(C)`
+ `@@species` + the resolve/reject element-function object protocol. This is why
it was escalated out of the dev lane and folded here.

This is the live residual **after** #1368 (sprint-51 combinator work, `done`) and
#1382 (`done`, the wasm-closure→JS-callable bridge that #1368 was blocked on).
Those landed, but the custom-constructor capability path still fails.

## Baseline (loopdive/js2wasm-baselines `test262-current.jsonl`, 2026-06-17)

163 `built-ins/Promise` fails, dominated by the 4 combinators:

| subdir      | fails |
|-------------|-------|
| allSettled  | 37    |
| all         | 28    |
| any         | 23    |
| race        | 18    |
| prototype   | 13    |
| (resolve/reject/try/keyed/…) | rest |

## Root-cause distribution (probe over 24 real failing combinator files)

1. **"Promise resolve or reject function is not callable"** — *13/24*.
   `Promise.all.call(NotPromise, …)` / `Promise.race.call(SubPromise, …)`.
   V8's `NewPromiseCapability(C)` does `Construct(C, «executor»)` for the
   custom constructor `C`; our combinators delegate straight to host
   `Promise.X.call(C, …)` (`runtime.ts:9931-9949`) and can't drive a
   compiled-class executor protocol, so V8 itself throws. Examples:
   `allSettled/resolve-element-function-{extensible,nonconstructor}.js`,
   `any/capability-executor-called-twice.js`, `any/species-get-error.js`.

2. **"illegal cast"** — *5/24*. Custom-thenable iteration
   (`*/invoke-resolve-on-{values,promises}-every-iteration-of-{custom,promise}.js`,
   `all/resolve-from-same-thenable.js`). The host bridge (`wasmClosureDynamicBridge`,
   `runtime.ts:1856`) casts a non-promise thenable through a promise-typed slot.

3. **ret=2 assertion-fail** — *6/24*. `Promise.race.call(SubPromise, [])` returns
   an instance whose `.constructor` / `instanceof` should be the user subclass
   (`*/ctx-ctor.js`) — species/capability not honoured.

4. **"Function.prototype.bind called on non-callable"** — *2/24*
   (`any/…-every-iteration-of-custom.js`, `race/…-every-iteration-of-custom.js`).

The non-combinator residual (`prototype/then`, `prototype/finally`, `resolve`,
`reject`, `try`, `withResolvers`) is the **same** cause: `ctx-ctor`,
`capability-executor-not-callable`, `species-constructor`, and synthesized
resolve/reject element functions needing the correct observable object shape
(`.length === 1`, `.name === ""`, `isConstructor() === false`, `new fn()` →
TypeError) — e.g. `prototype/finally/invokes-then-with-function.js`.

## Fix direction (senior-scale)

Implement a real `NewPromiseCapability(C)` for non-native `C`:
build the capability executor as a genuine wasm-closure→host-callable pair
(reuse the #1382 bridge), invoke `C`'s executor with callable resolve/reject,
and synthesize the resolve/reject **element** functions as host function objects
carrying the spec object shape. Honour `@@species` for the returned instance so
`Promise.race.call(SubPromise, …) instanceof SubPromise` holds. Standalone mode
needs the Wasm-native equivalent (coordinate with #1326/#1326c microtask work).

## Reproduction harness

A probe that compiles + runs a list of test262 files (reusing the runner's
`wrapTest`/`parseMeta` + `buildImports`) and prints per-file RAN/RUNTIME/COMPILE
classification was used for the bucketing above. Pattern (was at
`.tmp/promise-probe.mts`, gitignored):

```
import { compile } from "../src/index.js";
import { buildImports } from "../src/runtime.js";
import { wrapTest, parseMeta } from "../tests/test262-runner.js";
// for each file: wrapTest → compile({skipSemanticDiagnostics:true}) →
//   buildImports(result.imports, undefined, result.stringPool) →
//   WebAssembly.instantiate → instance.exports.test()
```

Run each file in its **own** subprocess — async rejections from the host
bridge (illegal-cast, bucket 2) escape try/catch onto the microtask queue and
kill the process otherwise. Failing-file list derived from the baseline JSONL
filtered to `test/built-ins/Promise` + `status != pass`.

## Re-validation 2026-06-17 (sdev-async2) — root cause is ONE level deeper than "runtime-only"

Re-ran the probe over **all four combinators** (109 files, baseline
`test262-current.jsonl`, 168 `built-ins/Promise` fails total). Aggregated buckets:

| bucket | all | allSettled | any | race | total |
|--------|----:|----:|----:|----:|------:|
| "Promise resolve or reject function is not callable" | 12 | 18 | 10 | 5 | **45** |
| "illegal cast" (thenable iteration) | 8 | 9 | 8 | 4 | **29** |
| "undefined is not a function" (unhandled rej) | 3 | 4 | 0 | 3 | **10** |
| "[object Object] is not a constructor" | 2 | 2 | 2 | 2 | **8** |
| "Function.prototype.bind called on non-callable" | 1 | 1 | 2 | 1 | **5** |
| RAN ret=2/3 (species / assertion) | 1 | 2 | 0 | 2 | **5** |

**The dominant bucket is NOT a runtime-marshaling bug — it is a front-end
codegen elision.** WAT dump of the compiled `Constructor` from
`all/same-reject-function.js` (`function Constructor(executor){ executor(a,b) }`
with a `Constructor.resolve = …` static assignment):

```
(func $Constructor (type 6)          ;; type 6 == (func)  → NO `executor` param!
   …__register_class_object prologue…
   global.get 15 global.get 10 call 6 drop   ;; __extern_get(Test262Error.thrower), dropped
   …self-registration of static .resolve…
   ref.null extern drop)              ;; the executor(a,b) CALL IS GONE
```

The static-property assignment (`Constructor.resolve = …`) makes the front-end
treat `Constructor` as a **class-object**, strip its parameter list, and **drop
the `executor(resolve, reject)` invocation**. So when V8's
`NewPromiseCapability(C)` does `Construct(C, «executor»)`, the body runs but
**never calls its executor** → the capability's `[[Resolve]]`/`[[Reject]]` stay
undefined → V8 throws "Promise resolve or reject function is not callable".
`runtime.ts:_wrapCallableForHost`'s `construct` trap (4778) is correct; the
compiled body it invokes is the broken part.

**Implication for the fix order:** reimplementing `NewPromiseCapability`/
`PerformPromiseAll` in JS (the doc's "fix direction") is necessary but **not
sufficient** — a JS-side capability still calls `Construct(C, executor)`, and
the compiled `C` still won't invoke `executor`. The **prerequisite** is a
front-end fix so a user function/class used as a Promise constructor compiles
with a real, callable `executor` parameter and emits its invocation (i.e. the
class-object-registration path must not strip the parameter/call when the
function is *also* used as an ordinary callable/constructor). This is
architect-scale, broad blast radius (touches the class-object detection +
function-parameter lowering), and overlaps the #2026 dynamic-ctor-ABI work
already in flight (TaskList #31, `__construct_closure`). The remaining buckets
(illegal-cast thenable iteration, species, bind) are downstream of the same
capability machinery.

**Conclusion: no safe small dev slice exists in the dominant bucket.** The
45-file "not callable" bucket is blocked on the executor-elision front-end fix;
the 29-file "illegal cast" bucket is blocked on capability-driven thenable
iteration. Both require the capability rework. Recommend sequencing **behind**
the #2026 dynamic-ctor ABI (which gives a real `Construct(closure, args)` that
runs the body with a threaded parameter list) and folding into the #1042 async
epic, rather than a partial PR that would not move the conformance needle.
