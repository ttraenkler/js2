---
id: 7050
title: "wave 15 residuals: two bisected standalone regressions (lazy-iterator spread, fnctor-instance toString) + 40 'other'-class test files not yet triaged"
status: ready
sprint: Backlog
created: 2026-10-17
updated: 2026-10-17
priority: medium
horizon: l
feasibility: medium
reasoning_effort: high
task_type: bug
area: codegen
language_feature: n/a
goal: core-semantics
related: [7014, 7042, 7043, 2903, 2875, 5131, 6938]
requested_by: ttraenkler/wave15-grep-other-sentinels
---

# #7050 — wave-15 residuals not closed by #7042 / #7043

## Two bisected standalone regressions (fix next)

Both bisected on first-parent `upstream/main` with a probe script
(`.tmp/bisect.py` + `.tmp/prun.mts` in the wave-15 worktree; `prun` renders a
standalone `WebAssembly.Exception` through the module's `__exn_render_*`
exports).

1. **Spread of a lazy iterator-helper result throws "value is not iterable".**
   `tests/issue-2903-r3.test.ts` → "[...spread] of a lazy map drains it
   natively":
   ```ts
   function* g(){ yield 1; yield 2; yield 3; }
   const r = [...(g() as any).map((x: number) => x * 2)];   // standalone
   ```
   Good at `e441a2dd66` (answers 312); first bad **`7488435437`** = PR #5272
   (#5131 "ES2015 strict spread iterator", `iterator-native.ts` +1,921 lines).
   The strict spread path does not recognise the native iterator-helper
   object the pre-#5131 spread drained.
2. **`i.toString()` on a function-constructor instance with no prototype
   `toString` throws "called value is not a function".**
   `tests/issue-2875-prototype-installed-tostring.test.ts` → "a constructor
   with NO prototype toString keeps the static arm":
   ```js
   function F(v) { this.value = v; }
   var i = new F(7);
   i.toString() === "[object Object]"   // standalone, allowJs
   ```
   Good at `0555ac93e4`; first bad **`ed1c9e2dc2`** = PR #6623 (#6938 "stop
   minting phantom anon structs for fnctor instance types"). The instance now
   resolves to `__fnctor_F` and the member call goes dynamic, where the
   inherited `Object.prototype.toString` is not found.

## 'Other'-class files not yet triaged (first error on main)

Measured on `upstream/main` `0727e2985b` (local run; several "(no message)"
rows are a standalone `WebAssembly.Exception` the vitest JSON cannot render —
re-run the test's source through `.tmp/prun.mts` to see it). Rows that need
an installed eslint devDependency (`issue-1557`, `issue-2688`, `issue-2689`,
`issue-2693`) and the eval-provider rows (`dynamic code generation is disabled
by the host`, `js2wasm:runtime-eval` not linked) fail the same way in CI's
issue-tests partials, so they are not local-environment artefacts.
`tests/test262.test.ts` and `tests/test262-errors.test.ts` are whole-corpus
harvesters that "did not finish within the serial re-run timeout" in CI; they
belong outside the per-file detector rather than in this list.

| file | test | first error |
|---|---|---|
| `deno-safe-promise-constructor` | runs an inline super executor synchronously and settles through native then | (no message: non-Error throw / wasm exception) |
| `es5-standalone-callable-tostring` | a function declaration does not stringify as [object Object] | (no message: non-Error throw / wasm exception) |
| `issue-5150-es2015-buffers` | host: built-ins/Atomics/notify/null-bufferdata-throws.js | AssertionError: built-ins/Atomics/notify/null-bufferdata-throws.js: {"file":"test/built-ins/Atomics/notify/null-bufferdata-throws.js","category":"issu |
| `issue-5193-init-marshal-host-typedarray` | aliases sibling views built at module scope over one buffer | (no message: non-Error throw / wasm exception) |
| `issue-5195-r3-review` | standalone: a parameter / alias / mixin-factory heritage does not throw | (no message: non-Error throw / wasm exception) |
| `issue-856` | struct obj: configurable false→true throws | (no message: non-Error throw / wasm exception) |
| `issue-856` | writable false→true on non-configurable throws | (no message: non-Error throw / wasm exception) |
| `issue-928` | elision-step-err pattern: destructuring elision catches generator throw | Test262Error:  |
| `promise-combinators` | Promise.all with resolved values | Error: STACK_TRACE_ERROR |
| `promise-combinators` | Promise.race with resolved values | Error: STACK_TRACE_ERROR |
| `react-renderer-test` | depth-first traversal collects output from nested fiber tree | (no message: non-Error throw / wasm exception) |
| `react-renderer-test` | traversal on single node returns its value | (no message: non-Error throw / wasm exception) |
| `report-standalone-category-edition-scope` | hides every proposal-only category under a published edition | AssertionError: expected [ 'annexB/built-ins', …(91) ] to not include 'built-ins/Temporal' |
| `v8x-compile-graph` | evaluates Deno synthetic JSON, text, and bytes modules against a shared classic-script glo | Error: TypeError: called value is not a function |
| `issue-1164-es5-eval-slice` | runs raw callable/dot/bracket Test262 assertions through the legacy fallback shim | EvalError: dynamic code generation is disabled by the host |
| `issue-1164-es5-eval-slice` | retains a measurement-only raw-assert kill switch | AssertionError: expected [Function] to throw error matching /assert is not defined/ but got 'dynamic code generation is disabled b…' |
| `issue-1164-es5-eval-slice` | does not inject a raw-assert shim for inert text or a local binding | EvalError: dynamic code generation is disabled by the host |
| `issue-1164-es5-eval-slice` | owns a proven-string indirect statement through IR, reserves one import, and executes raw  | EvalError: dynamic code generation is disabled by the host |
| `issue-1355d` | the trap's falsy result is returned by Object.isExtensible | (no message: non-Error throw / wasm exception) |
| `issue-1355d` | preventExtensions trap intercepts Object.preventExtensions | (no message: non-Error throw / wasm exception) |
| `issue-1355d` | isExtensible and preventExtensions traps coexist with the Slice A/B/C traps | (no message: non-Error throw / wasm exception) |
| `issue-1472-standalone-regexp-legacy-static` | throws for every legacy name on a RegExp subclass | (no message: non-Error throw / wasm exception) |
| `issue-1500` | reads .status from awaited Response | AssertionError: expected Promise{…} to be 200 // Object.is equality |
| `issue-1500` | reads .ok flag from awaited Response (false) | AssertionError: expected Promise{…} to be falsy |
| `issue-1500` | reads parsed JSON body via .json() | AssertionError: expected Promise{…} to be 'Alice' // Object.is equality |
| `issue-1500` | reads response text via .text() | AssertionError: expected Promise{…} to be 'hello world' // Object.is equality |
| `issue-1500` | throws when globalThis.fetch is unavailable | AssertionError: expected [Function] to throw an error |
| `issue-1500` | forwards URL string to host fetch | AssertionError: expected Promise{…} to be 204 // Object.is equality |
| `issue-1501` | keeps DOM globals available when the timer shim forces TypeScript grammar | AssertionError: expected [ { module: 'env', …(4) }, …(10) ] to deep equally contain { module: 'env', …(3) } |
| `issue-1557` | emits valid Wasm for compileProject(node_modules/eslint/lib/config/config.js) [requires in | AssertionError: Module '"../shared/deep-merge-arrays"' has no exported member 'deepMergeArrays'. Did you mean to use 'import deepMergeArrays from "../ |
| `issue-1712-reflection-identity` | keeps stored 'defineProperty' on one order-independent descriptor provider | (no message: non-Error throw / wasm exception) |
| `issue-1712-reflection-identity` | keeps stored 'defineProperties' on one order-independent descriptor provider | (no message: non-Error throw / wasm exception) |
| `issue-1712-reflection-identity` | keeps backup-cast recovery out of the host lane for language/eval-code/indirect/realm.js | AssertionError: expected 'RuntimeError: dereferencing a null po…' to contain 'TypeError: Cannot access property on …' |
| `issue-1712-reflection-identity` | keeps backup-cast recovery out of the host lane for language/types/reference/get-value-pro | AssertionError: expected 'ReferenceError: value is not defined …' to contain 'TypeError: Cannot access property on …' |
| `issue-1712-reflection-identity` | keeps backup-cast recovery out of the host lane for language/types/reference/put-value-pro | AssertionError: expected 'Test262Error: number Expected SameVal…' to contain 'TypeError: Cannot access property on …' |
| `issue-1833` | forwards DataView byteOffset through the default derived constructor | (no message: non-Error throw / wasm exception) |
| `issue-1833` | forwards DataView byteLength through the default derived constructor | (no message: non-Error throw / wasm exception) |
| `issue-2086` | Lane B (externref built-in): forwards every arg to the built-in parent | (no message: non-Error throw / wasm exception) |
| `issue-2161-b1-boxed-string` | a plain (non-wrapper) object argument does not spuriously become a string | (no message: non-Error throw / wasm exception) |
| `issue-2176-template-literal-interp` | `let` ambient-shadowed name after reassignment | (no message: non-Error throw / wasm exception) |
| `issue-2652` | standalone mode: all cases pass (was: illegal cast) | (no message: non-Error throw / wasm exception) |
| `issue-2652` | wasi mode: all cases pass | (no message: non-Error throw / wasm exception) |
| `issue-2688` | eslint apply-disable-directives.js compiles AND validates (Linter.verify path) [requires i | AssertionError: [{"message":"Module '\"../config/config.js\"' has no exported member 'Config'. Did you mean to use 'import Config from \"../config/con |
| `issue-2689` | the real eslint source-code.js validates [requires installed eslint devDependency] | AssertionError: Module '"../../../shared/directives"' has no exported member 'directivesPattern'. Did you mean to use 'import directivesPattern from " |
| `issue-2693-host-delegated-select` | loads real espree + esquery from ESLint's importer context [requires installed eslint devD | Error: Cannot find module 'espree' |
| `issue-2693-host-delegated-select` | a compiled Linter calls host espree + host esquery and emits the semi diagnostic [requires | Error: Cannot find module 'espree' |
| `issue-2726` | hasOwnProperty is false after deleting a configurable data property (variable descriptor) | (no message: non-Error throw / wasm exception) |
| `issue-2726` | hasOwnProperty is false after deleting a configurable accessor property (variable descript | (no message: non-Error throw / wasm exception) |
| `issue-2726` | sloppy delete of a non-configurable accessor returns false and leaves the property | (no message: non-Error throw / wasm exception) |
| `issue-2978-forawait-rejected` | Part A: void return() module is VALID Wasm on all three lanes | AssertionError: lane {}: async shape not supported: this suspension point (await / for-await) sits inside a `try` whose overall body shape the async e |
| `issue-3014` | array-like .forEach (length 0) does not leak Uint8ClampedArray_forEach | (no message: non-Error throw / wasm exception) |
| `issue-3014` | array-like .some (length 0) does not leak Uint8ClampedArray_some | (no message: non-Error throw / wasm exception) |
| `issue-3119` | non-callable @@iterator value degrades to the legacy path (no hang) | (no message: non-Error throw / wasm exception) |
| `issue-3632-eval-early-errors` | 'host' preserves valid sloppy names and Script-local control targets | EvalError: dynamic code generation is disabled by the host |
| `issue-3632-eval-early-errors` | 'standalone' preserves valid sloppy names and Script-local control targets | TypeError: WebAssembly.instantiate(): Import #0 module="js2wasm:runtime-eval": module is not an object or function |
| `issue-3899` | trim / trimStart / trimEnd match host semantics over the whole whitespace class | Error: STACK_TRACE_ERROR |
| `issue-3899` | indexOf / lastIndexOf / includes match host semantics incl. repeated-prefix haystacks | Error: STACK_TRACE_ERROR |
| `issue-3994` | keeps scanning when the checker overflows on a recursive RHS | AssertionError: expected [Function] to not throw an error but 'TypeError: Cannot read properties of …' was thrown |
| `issue-4076-borrowed-proto-this-brand` | Object.prototype.hasOwnProperty.call(undefined) throws a catchable TypeError | Error: Native-first adapter cannot bind env::__to_property_key: unknown import owned by #4401. Use the explicit compatibility profile until this seman |
| `issue-4076-borrowed-proto-this-brand` | Object.prototype.hasOwnProperty.call(null) throws a catchable TypeError | Error: Native-first adapter cannot bind env::__to_property_key: unknown import owned by #4401. Use the explicit compatibility profile until this seman |
| `issue-4076-borrowed-proto-this-brand` | Object.prototype.hasOwnProperty.call(void 0) throws a catchable TypeError | Error: Native-first adapter cannot bind env::__to_property_key: unknown import owned by #4401. Use the explicit compatibility profile until this seman |
| `issue-4076-borrowed-proto-this-brand` | Object.prototype.propertyIsEnumerable.call(undefined) throws a catchable TypeError | Error: Native-first adapter cannot bind env::__to_property_key: unknown import owned by #4401. Use the explicit compatibility profile until this seman |
| `issue-4076-borrowed-proto-this-brand` | Object.prototype.propertyIsEnumerable.call(null) throws a catchable TypeError | Error: Native-first adapter cannot bind env::__to_property_key: unknown import owned by #4401. Use the explicit compatibility profile until this seman |
| `issue-4076-borrowed-proto-this-brand` | Object.prototype.propertyIsEnumerable.call(void 0) throws a catchable TypeError | Error: Native-first adapter cannot bind env::__to_property_key: unknown import owned by #4401. Use the explicit compatibility profile until this seman |
| `issue-4076-borrowed-proto-this-brand` | does not throw: isPrototypeOf.call(undefined, {}) | AssertionError: expected 2 to be 1 // Object.is equality |
| `issue-4076-borrowed-proto-this-brand` | emits zero imports for every gated shape | AssertionError: expected [ { module: 'env', …(4) } ] to deeply equal [] |
| `issue-4165-bfn-name-writable-gate` | write to live builtin .name no-ops; delete then reports absent (the regressed cycle) | (no message: non-Error throw / wasm exception) |
| `issue-4383-cross-module-scalar-callable` | rejects Number arguments for branded ABIs and preserves host BigInt width | AssertionError: expected [Function] to throw an error |
| `issue-4383-cross-module-scalar-callable` | does not admit an unproven any value into the numeric ABI | AssertionError: expected [Function] to throw an error |
| `issue-4383-cross-module-scalar-callable` | does not box a boolean-returning candidate as a Number | AssertionError: expected [Function] to throw an error |
| `issue-4442` | makes `f.constructor === Function` true for an AOT closure | TypeError: WebAssembly.instantiate(): Import #0 module="js2wasm:runtime-eval": module is not an object or function |
| `issue-4442` | makes it true for a folded `new Function(<const>)` receiver | TypeError: WebAssembly.instantiate(): Import #0 module="js2wasm:runtime-eval": module is not an object or function |
| `issue-4442` | makes it true for `new Function(null)` — #4440's one regression | TypeError: WebAssembly.instantiate(): Import #0 module="js2wasm:runtime-eval": module is not an object or function |
| `issue-4442` | makes `Function.prototype.constructor === Function` true | TypeError: WebAssembly.instantiate(): Import #0 module="js2wasm:runtime-eval": module is not an object or function |
| `issue-4442` | keeps two bare `Function` reads identity-stable | TypeError: WebAssembly.instantiate(): Import #0 module="js2wasm:runtime-eval": module is not an object or function |
| `issue-4483` | ignores the thisArg and evaluates the body (§15.3.1) | TypeError: WebAssembly.instantiate(): Import #0 module="js2wasm:runtime-eval": module is not an object or function |
| `issue-4483` | threads named parameters through `.call` | TypeError: WebAssembly.instantiate(): Import #0 module="js2wasm:runtime-eval": module is not an object or function |
| `issue-4483` | `.apply` with a literal argument array is the same construction | TypeError: WebAssembly.instantiate(): Import #0 module="js2wasm:runtime-eval": module is not an object or function |
| `issue-4491-function-binding-widening` | §B.3.3 block scope: the block binding is mutable and independent of the var binding | (no message: non-Error throw / wasm exception) |
| `issue-4491-function-binding-widening` | §B.3.3 block scope: the same shape under `switch` | (no message: non-Error throw / wasm exception) |

## Plan

Triage each file the way #7043 did: run it on main, decide stale-by-design
(re-pin, citing the commit) vs regression (bisect with the probe kit, fix
forward), and never re-pin a JS-incorrect value. Start with the two bisected
regressions above, then the standalone rows (they are the target lane).
