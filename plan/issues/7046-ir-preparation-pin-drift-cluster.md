---
id: 7046
title: "IR preparation / outcome pins drifted while the issue-tests detector was blind — 21 files, mostly shape/claim pins, with three real defects inside"
status: ready
sprint: Backlog
created: 2026-10-17
updated: 2026-10-17
priority: medium
horizon: l
feasibility: medium
reasoning_effort: high
task_type: bug
area: ir
language_feature: n/a
goal: ir-full-coverage
related: [3518, 3520, 3522, 3527, 4110, 5166, 2856, 4577, 4590, 7014]
requested_by: ttraenkler/wave15-grep-other-sentinels
---

# #7046 — IR preparation / outcome pin drift (wave-15 residual cluster)

## Problem

The #7014 sweep found these `tests/` files red on `upstream/main`
(`0727e2985b`, 2026-10-17). They pin INTERNALS of the IR preparation campaign
(prepared components, callable ABI bindings, IR outcomes, claimed-function
lists, exact WAT of prepared bodies). The campaign changed most of these by
design, so the majority are expected to be STALE pins — but each needs an
owner who knows which preparation change moved it, and three are real defects
(below). They were left red rather than re-pinned blind.

## Real defects found inside the cluster (fix first)

1. **IR answers 3 where JS answers NaN** — `issue-5166` "a SHORT row: the
   missing leaf is the element zero, exactly as legacy":
   `for (const [a, b] of [[1], [2, 3]]) s = s + b;` must be `NaN` (node:
   `NaN`; `b` is `undefined` in row 1). The LEGACY lane now answers `NaN`, the
   IR head-lift still reads the missing leaf as `0`, so the two front-ends
   disagree and IR is wrong. The pin's expected `3` is wrong JS too.
2. **Invalid Wasm in the gc lane** — `issue-3522-ir-class-compile-once`
   "prepares every exact forward-class callable ABI position once in the gc
   lane": `__fn_tramp_Holder_keep_1 … type error in fallthru[0] (expected
   externref, got (ref null 9))`.
3. **`boolean[][]` lost its IR claim** — `issue-4486` / `issue-5166`:
   `function f(m: boolean[][]) { return m[0][1]; }` is now
   `element-access-unsupported` ("element access on ref_null with index … not
   in slice 12"); the legacy body answers correctly, so this is a lost claim,
   not a miscompile.

## Per-test first error (local run on main, `.tmp/now/*.json` in the wave-15 worktree)

| file | test | first error |
|---|---|---|
| `issue-3522-ir-class-compile-once` | keeps _new AST-free and gives constructor source work exclusively to _init in the standalo | AssertionError: expected '  (func $Animal_new (param (ref null …' to contain 'struct.new 55' |
| `issue-3522-ir-class-compile-once` | prepares every exact forward-class callable ABI position once in the gc lane | AssertionError: emitted WebAssembly failed validation — WebAssembly.Module(): Compiling function #19:"__fn_tramp_Holder_keep_1" failed: type error in  |
| `issue-3522-ir-cross-owner-free-function` | keeps standalone as an explicit unsupported-console parity control | AssertionError: expected { …(19) } to match object { kind: 'unsupported', …(5) } |
| `issue-3522-ir-cross-owner-free-function` | prepares an implicit local-user derived forwarding chain in gc | AssertionError: expected '  (func $Mid_new (param f64) (result …' to be '  (func $Mid_new (param f64) (result …' // Object.is equality |
| `issue-3522-ir-cross-owner-free-function` | prepares an implicit local-user derived forwarding chain in standalone | AssertionError: expected [] to deeply equal [ 'Mid_init' ] |
| `issue-3522-ir-cross-owner-free-function` | prepares source-ordered initialized fields through an implicit inheritance chain in gc | AssertionError: expected '  (func $Base_init (param (ref null 1…' to be '  (func $Base_init (param (ref null 6…' // Object.is equality |
| `issue-3522-ir-cross-owner-free-function` | withdraws an initialized-field constructor atomically when its local callee is not IR-prep | AssertionError: expected [ …(4) ] to deeply equal [ 'fail' ] |
| `issue-3522-ir-nested-class-expression-ownership` | prepares an exact const-bound class expression atomically in the standalone lane | AssertionError: expected '  (func $__anonClass_0_add (type 48)\…' to contain 'struct.get' |
| `issue-3522-ir-nested-class-expression-ownership` | keeps a same-named inner class identity on the exact binding | AssertionError: expected { …(14) } to match object { kind: 'emitted', …(2) } |
| `issue-3522-ir-nested-class-ownership` | prepares the enclosing function, constructor, and methods once in the standalone lane | AssertionError: expected '  (func $Calculator_add (type 44)\n  …' to contain 'struct.get' |
| `issue-3522-ir-nested-class-ownership` | prepares the call-bearing nested field family once in the gc lane (#3522 F4) | AssertionError: expected [ { …(19) }, { …(19) }, …(3) ] to have a length of 4 but got 5 |
| `issue-3522-ir-nested-class-ownership` | prepares the call-bearing nested field family once in the standalone lane (#3522 F4) | AssertionError: expected [ { …(19) }, { …(19) }, …(3) ] to have a length of 4 but got 5 |
| `issue-3522-super-accessor` | refuses super.<accessor> += with a named arm on gc | AssertionError: IR path failed for Animal_new: prepared component prepared-component:ir-unit:v1:ir-source%3Av1%3A0000000000000000%3Aentry%3Aw1c-compou |
| `issue-3522-super-accessor` | refuses super.<accessor> += with a named arm on standalone | AssertionError: IR path failed for Animal_new: prepared component prepared-component:ir-unit:v1:ir-source%3Av1%3A0000000000000000%3Aentry%3Aw1c-compou |
| `issue-3527-async-call-closure` | withdraws a real-suspending component with a raw C1 consumer before Promise ABI publicatio | AssertionError: expected { …(19) } to match object { kind: 'unsupported', …(5) } |
| `issue-3527-async-call-closure` | settles a provider-backed async component by exact identity and publishes native Promises | AssertionError: Codegen error: generic Promise owner outer (ir-unit:v1:ir-source%3Av1%3A0000000000000000%3Aentry%3Aissue-3527-async-call-closure-provi |
| `issue-3527-async-call-closure` | rejects the missing allocated Promise slot at final R3 preparation | AssertionError: expected 0 to be greater than 0 |
| `issue-3527-async-call-closure` | rejects the numeric-result allocated Promise slot at final R3 preparation | AssertionError: expected 0 to be greater than 0 |
| `issue-3527-async-call-closure` | rejects the missing-parameter allocated Promise slot at final R3 preparation | AssertionError: expected 0 to be greater than 0 |
| `issue-3527-async-call-closure` | keeps the issued ABI after callers cannot mutate the owner collection | IrInvariantError: generic Promise owner owner (ir-unit:v1:ir-source%3Av1%3A0000000000000000%3Aentry%3Aissue-3527-generic-issuance-immutable-population |
| `issue-3527-settled-owner-runtime` | closes a prepared caller against the owner's Promise ABI | AssertionError: expected { …(18) } to match object { kind: 'emitted', …(4) } |
| `issue-3527-settled-owner-runtime` | joins incoming callers by identity and keeps a same-spelling foreign binding out | AssertionError: expected { …(18) } to match object { kind: 'emitted', …(4) } |
| `issue-3527-settled-owner-runtime` | refuses an incompatible raw-value consumer before it can claim IR | AssertionError: expected { …(20) } to match object { kind: 'emitted', …(2) } |
| `issue-4110-ir-fetch-all-parallel` | emits the exact owner and both helpers once with no direct body | AssertionError: expected '(func $fetchAllParallel__ir_async_sta…' to match /\bcall 25\b\s+call \d+\b/ |
| `issue-4486` | boolean[][] emits an IR body (#5166 carrier) | AssertionError: expected { …(20) } to match object { Object (kind, irBodyEmitted) } |
| `issue-5166` | boolean[][] (i32 leaf) emits an IR body | AssertionError: expected { …(20) } to match object { Object (kind, irBodyEmitted) } |
| `issue-5166` | boolean[][] leaves | AssertionError: expected false to be true // Object.is equality |
| `issue-5166` | a SHORT row: the missing leaf is the element zero, exactly as legacy | AssertionError: expected 3 to strictly equal NaN |
| `issue-2856-calendar-residuals` | stores a uniform host-string literal table in the externref vec family | AssertionError: expected [] to include 'install' |
| `issue-2856-calendar-residuals` | keeps uniform string arrays on legacy in native strings | AssertionError: expected [ { kind: 'build', …(2) } ] to deeply equal [] |
| `issue-2856-calendar-residuals` | keeps uniform string arrays on legacy in standalone | AssertionError: expected [ { kind: 'build', …(2) } ] to deeply equal [] |
| `issue-2856-calendar-residuals` | keeps uniform string arrays on legacy in WASI | AssertionError: expected [ { kind: 'build', …(2) } ] to deeply equal [] |
| `issue-2856-calendar-residuals` | rejects the unsupported spread string-array shape before claim | AssertionError: expected [ { kind: 'build', …(2) } ] to deeply equal [] |
| `issue-2856-calendar-residuals` | lowers exact ambient Date snapshots through the synthetic host ABI | AssertionError: expected [] to deeply equal [ 'Date_getDate', …(3) ] |
| `issue-2856-calendar-residuals` | uses the same host Date snapshot ABI in module init and function bodies | AssertionError: expected [] to deeply equal [ 'Date_getFullYear', 'Date_new' ] |
| `issue-2856-calendar-residuals` | materializes the host Date ABI for a module-init-only snapshot | AssertionError: expected [] to deeply equal [ 'Date_getFullYear', 'Date_new' ] |
| `issue-2856-calendar-residuals` | demotes a module-init-only snapshot when Date_new is occupied | AssertionError: expected [ Array(3) ] to not include '<module-init>' |
| `issue-2856-calendar-residuals` | demotes a module-init-only snapshot when Date_getFullYear is occupied | AssertionError: expected [ 'Date_getFullYear', 'years', …(1) ] to not include '<module-init>' |
| `issue-2856-calendar-residuals` | closes module-init callees when a Date import collision demotes the module | AssertionError: expected [ 'Date_new', 'helper', 'years', …(1) ] to not include '<module-init>' |
| `issue-2856-calendar-residuals` | keeps Date snapshots host-free in standalone | AssertionError: expected [ 'snap' ] to not include 'snap' |
| `issue-2856-calendar-residuals` | demotes an occupied Date_new name without partial imports | AssertionError: expected [ 'Date_new', 'snap', 'caller' ] to not include 'snap' |
| `issue-2856-calendar-residuals` | demotes an occupied Date_getDate name without partial imports | AssertionError: expected [ 'Date_getDate', 'snap', 'caller' ] to not include 'snap' |
| `issue-2856-calendar-residuals` | closes a connected mixed-getter collision before adding any Date import | AssertionError: expected [ 'Date_getMonth', 'month', …(2) ] to not include 'month' |
| `issue-2856-calendar-residuals` | genuinely emits the live single-source Calendar owners with zero postclaim | AssertionError: expected [] to deeply equal [ 'Date_getDate', …(3) ] |
| `issue-2856-module-bindings` | shares one slot from a legacy writer to an IR reader | AssertionError: expected [ 'writer', 'reader', '<module-init>' ] to not include 'writer' |
| `issue-2856-module-bindings` | admits boolean module consumers while pre-claim rejecting numeric truthiness and aliases | AssertionError: expected [ 'numAlias', 'boolAlias', …(10) ] to not include 'mixedConditional' |
| `issue-2856-module-bindings` | does not treat source declarations named like extern constructors as builtins | AssertionError: expected [ 'read', 'Map_new' ] to not include 'read' |
| `issue-2856-module-bindings` | accepts only string-producing scalar module consumers | AssertionError: expected [ { kind: 'build', …(2) } ] to strictly equal [] |
| `issue-2856-module-bindings` | keeps module-number toString on legacy with native strings | AssertionError: expected [ 'stringify', '<module-init>' ] to not include 'stringify' |
| `issue-2856-module-bindings` | keeps module-number toString on legacy with standalone | AssertionError: expected [ 'stringify', '<module-init>' ] to not include 'stringify' |
| `issue-2856-module-bindings` | keeps module-number toString on legacy with wasi | AssertionError: expected [ 'stringify', '<module-init>' ] to not include 'stringify' |
| `issue-2856-module-bindings` | keeps module-number toString on legacy with strict no-host | AssertionError: Codegen error: IR path failed for stringify: runtime feature error.reference.construct is unavailable for target strict-no-host [IR-FA |
| `issue-2856-module-bindings` | keeps builtin Map module storage on legacy with native strings | AssertionError: expected [ 'put', '<module-init>' ] to not include '<module-init>' |
| `issue-2856-module-bindings` | rejects unproven same-file factory returns before claiming the writer | AssertionError: expected [ { kind: 'verify', …(2) } ] to strictly equal [] |
| `issue-2972` | flag ON: a claimed const-string-index function IR-compiles AND runs correctly | AssertionError: expected [ 'f' ] to not include 'f' |
| `issue-2972` | flag ON: vec `arr[i]` compiles+runs correctly (compile-twice under the f64-only allowlist) | AssertionError: expected [ 'sum' ] to not include 'sum' |
| `issue-2972` | bit-correct results, flag-off AND flag-on (compile-twice under the f64-only allowlist) | AssertionError: expected [ 'decimalToPercentHexString', 'run' ] to not include 'decimalToPercentHexString' |
| `issue-3288` | converts only the scalar value representations admitted by Porffor P1 | AssertionError: expected [Function] to throw an error |
| `issue-3288` | preserves u32 signedness when an SSA value is materialized as a local | AssertionError: expected [] to deeply equal [ { name: '$ir1', slots: [ 'u32' ] } ] |
| `issue-3288` | preserves u64 signedness when an SSA value is materialized as a local | AssertionError: expected [] to deeply equal [ { name: '$ir1', slots: [ 'u64' ] } ] |
| `issue-3288` | admits composite JS bitwise lowering through typed emitter operations | AssertionError: expected [ 'local.get:0', 'local.get:1', …(64) ] to deeply equal ArrayContaining{…} |
| `issue-3521-fast-mixed-signature-admission` | prepares anyTrue in fast before direct emission | AssertionError: Internal error compiling function 'anyTrue': injected direct function-body poison: anyTrue |
| `issue-3521-fast-mixed-signature-admission` | prepares anyTrue in fast-hostStr before direct emission | AssertionError: Internal error compiling function 'anyTrue': injected direct function-body poison: anyTrue |
| `issue-3521-fast-mixed-signature-admission` | preserves vector behaviour through the prepared route | AssertionError: Internal error compiling function 'anyTrue': injected direct function-body poison: anyTrue |
| `issue-3521-fast-mixed-signature-admission` | emits anyTrue byte-identically to its non-fast twin | AssertionError: IR path failed for anyTrue: function typeIdx parity mismatch: IR=17, legacy=12 — keeping legacy body [IR-FALLBACK] |
| `issue-4577-dom-interaction-bridge` | leaves the post-timer JavaScript-host Calendar lane at 38/38 without standalone callback a | AssertionError: expected [ { …(14) }, { …(14) }, { …(14) } ] to have a length of +0 but got 3 |
| `issue-4577-standalone-calendar-retirement` | keeps the post-timer exact 38-terminal census at 38/0 with no Invariant | AssertionError: exact standalone terminal population: expected [ { …(19) }, { …(19) }, …(39) ] to have a length of 38 but got 41 |
| `issue-4577-standalone-calendar-retirement` | retains direct arithmetic/DOM shapes and seven static callback bodies | AssertionError: renderCal redundant module TDZ guards: expected 37 to be +0 // Object.is equality |
| `issue-4577-standalone-calendar-retirement` | keeps tuned Calendar artifacts at or below the direct-relative ceilings | AssertionError: unique WAT function $__cb_0: expected [] to have a length of 1 but got +0 |
| `issue-4590-bench-loop-prepared-cutover` | removes exactly the two bench_loop direct rows while preserving its raw body and external  | AssertionError: expected [ …(13) ] to have a length of 14 but got 13 |
| `issue-4590-bench-loop-prepared-cutover` | keeps optimized bench_loop and trampoline bodies exact without size or runtime growth | Error: raw diagnostics must equal the exact ordered #2961 authority: Prepared=[], direct=[] |
| `issue-4590-bench-loop-prepared-cutover` | preserves support binding contracts with lane-exact singleton slots and objects | AssertionError: expected { space: 'function', index: 66 } to deeply equal { space: 'function', index: 76 } |
| `issue-4591-fib-pair-prepared-cutover` | removes exactly four direct rows as one Prepared component while preserving call topology  | AssertionError: expected [ …(13) ] to have a length of 14 but got 13 |
| `issue-4591-fib-pair-prepared-cutover` | preserves exact source and outer support binding objects in both allocation lanes | AssertionError: expected { space: 'function', index: 66 } to deeply equal { space: 'function', index: 76 } |
| `issue-4591-fib-pair-prepared-cutover` | withdraws the whole component before skip for 'outer function reassignment' | AssertionError: expected 'Cannot assign to \'bench_fib\' becaus…' to contain 'injected direct function-body poison:…' |
| `issue-1004` | routes the counted aggregate through Prepared IR without entering the direct body | AssertionError: test call targets: ["__sh_str_repeat","__str_concat"]: expected [] to have a length of 1 but got +0 |
| `issue-1004` | preserves non-ASCII code units through the Prepared native provider | AssertionError: test call targets: ["__sh_str_repeat","__str_concat"]: expected [] to have a length of 1 but got +0 |
| `issue-1004` | fails closed instead of retrying direct after a retained proof hits typed preparation fail | AssertionError: expected [ { kind: 'build', …(2) } ] to deeply equal [ { kind: 'build', …(2) }, …(1) ] |
| `identity-array-search-fast-path` | returns an in-range indexOf search expression without scanning | AssertionError: expected '(func $run (result f64)\n    (local $…' not to contain 'array.get' |

## Plan

1. Fix the three defects above, each with its own regression pin.
2. For every other row: find the preparation change that moved it
   (`.tmp/bisect.py` in the wave-15 worktree bisects first-parent main with a
   probe script in ~12 steps), then either re-pin to the new shape citing that
   commit, or restore the lost claim/shape if the move was accidental.
   `identity-array-search-fast-path` (JS-host `fast` lane: an in-range
   `indexOf` that used to fold now scans) and `issue-4110` (a Promise result is
   now spilled to a local before `pending.push`) are perf-shape pins: confirm
   intent before re-pinning.
3. Never re-pin a row whose new value is not JS-correct (see defect 1).
