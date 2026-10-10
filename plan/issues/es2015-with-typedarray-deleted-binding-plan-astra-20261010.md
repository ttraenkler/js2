# ES2015 standalone: deleted `with` binding over a TypedArray prototype

Planning handoff only, 2026-10-10. **Pending numeric allocation, issue frontmatter,
claim, owner agreement, and publication; not an allocated or completed issue.**
Prepared for root review and a later Sol61 implementation slot. Related: #5271 D2,
#2663, #6651 W5/W6/H13, #6766, #2046, and the frozen #6878 candidate.
No compiler run, test, build, profiler, source change, commit, or push was performed
for this plan. Nothing here authorizes stopping or changing the live full census.

## 1. Scope and frozen provenance

- Planner checkout: `/Users/thomas/.codex/worktrees/es2015-fresh-full-census-plan-astra/js2`,
  detached `dbf5b4f74b37d67e525b2af36fd1fe49803b1348`. This is an older planning
  base, NOT the analyzed execution source. The existing timeout plan and ignored
  planning files remain untouched. Only this new Markdown file is owned here.
- Analyzed source, abbreviated EXEC below:
  `/Users/thomas/Code/js2/.codex-worktrees/6878-delete-result-boolean-sol61`.
  HEAD `38901fff8f9a5ca029cbefcdaec5d8dd40949861`; root source receipt digest
  `a6464ffb87f98d4984d2454a14bc95bd80c035c88e7905bd1465b484537738c8`.
  Root is the sole heavy executor; session `62071` is live and frozen.
- Original, read in full:
  `/Users/thomas/Code/js2/test262/test/language/statements/with/set-mutable-binding-binding-deleted-with-typed-array-in-proto-chain.js`.
  SHA-256 `ee45a6317ace1932a3a0d965c6831f517b4d4b1960a449481a90e3a60a892d27`.
  Root reports corpus HEAD `b363f29d3c43c626dc852744ad64a0b48a003693`, matching
  tracked body and clean path. EXEC's `test262/test` links to this corpus.
- Root's current partial observation at dispatch: 68 unique originals,
  64 PASS / 3 compile_timeout / 1 FAIL; **not a final score**. This original
  reached execution with honest oracle 14, auto providers, standard official
  scope, noStrict, compile_ms 8518 and exec_ms 69. Exact error:
  `Test262Error: Expected SameValue(«[object Object]», «undefined») to be true`.
  The assertion shows a descriptor rather than undefined; it does not identify
  which compilation/runtime branch produced it.
- Preserve the full objective: all 11,778 original manifest entries, INCLUDING
  all 74 Intl entries. Original copyright 2024 does not remove this maintained
  ES2015-manifest entry. No denominator reduction or feature exclusion.

The original creates `new Int32Array(10)`, makes an ordinary heir, defines own
configurable/non-writable `NaN: 100`, then evaluates
`with (env) { NaN = (delete env.NaN, 0); }` and expects no own `NaN` descriptor.
There are no extra includes or negative expectations; keep its original body,
metadata, ordinary harness/runtime prefix, oracle, providers, and budgets intact.

## 2. Semantic contract: two distinct mechanisms

1. Resolve the `with` reference before evaluating the RHS, including HasBinding
   and unscopables effects. Deleting its property does not retarget that reference
   to the global `NaN`. SetMutableBinding checks current existence, but a missing
   non-strict binding still performs Set on the original binding object.
   [Object Environment Record SetMutableBinding](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-object-environment-records-setmutablebinding-n-v-s).
2. With the own property deleted, the ordinary heir delegates its write to the
   TypedArray prototype, retaining the heir as Receiver. `NaN` is a canonical
   numeric string but an invalid integer index. With Receiver different from
   the TypedArray, its exotic Set succeeds without creating a receiver property
   or converting the value. Valid indices instead continue through OrdinarySet;
   a write with the TypedArray itself as Receiver has different conversion rules.
   [Integer-indexed exotic Set](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-integer-indexed-exotic-objects-set-p-v-receiver).

Use the maintained corpus's current algorithm, not the older ES2015 published
algorithm solely because the manifest is called ES2015. Preserve the original
oracle. Neither a special global-NaN fallback nor suppressing all writes after
deletion implements this contract.

## 3. Existing plans: retain findings, do not inherit stale diagnoses

- Fully read `EXEC/plan/issues/5271-es2015-standalone-statements-r2.md` (1,060 lines).
  Its early D2 proposal around line 293 suggests falling back to global NaN.
  That is inconsistent with the contract above and must NOT be implemented.
  Its later findings around line 688 identify the TypedArray-prototype exotic
  Set gap instead. Historical results there are not current matched evidence.
- Read relevant design, capture, implementation, and remaining-work sections of
  `EXEC/plan/issues/2663-with-statement-tier2-dynamic-scope.md`. Keep pre-RHS
  reference capture and no unscopables cache. Its larger IR direction does not
  authorize an IR migration in this slice.
- `EXEC/plan/issues/6651-es2015-standalone-100pct-execution-plan.md`, W5 around
  lines 4632–4646, already names TypedArrays in prototype position, including
  prototype identity loss and receiver-sensitive Set. W6/H13 groups the `with`
  original more broadly; that grouping does not prove a fresh resolver defect.
- Read the representation/writer/consumer and implementation findings in
  `EXEC/plan/issues/6766-es2015-standalone-proxy-as-prototype-link.md`.
  Its recorded residuals include valid/invalid TypedArray prototype Set cases.
  They support prioritizing a hypothesis, not attribution of the current run.
- Historical aggregate scores or non-matched compile timings are not baselines
  in this plan. Existing bug versus #6878 regression remains **UNPROVEN**.

## 4. Source-grounded candidate path, not an executed trace

All source references below resolve under EXEC, never the planner's old source.

- `src/codegen/expressions/assignment.ts:375`: identifier assignment resolves
  `with` first, captures dynamic HasBinding before compiling the RHS once, and
  emits the dynamic environment write. This precedes the global NaN shortcut.
- `src/codegen/with-scope.ts:790`: `emitDynamicWithSet` branches on the captured
  binding, then checks current HasProperty; only strict missing binding throws.
  It calls `__extern_set` on the retained environment even after non-strict
  disappearance. `with-has-binding-native.ts` implements the dynamic has/get/
  unscopables sequence without caching. The original's actual lowering remains
  to be inspected; existence of this code does not prove it was selected.
- `src/codegen/expressions/call-object-builtins.ts:53` only recognizes class
  `.prototype` for the static Object.create instance path; this original uses
  identifier `typedArray`. `call-builtin-static.ts:2697` reaches the ordinary
  create helper and optional class-identity adapter; that adapter is not a
  generic TypedArray-prototype representation.
- `src/codegen/object-runtime-prototype.ts:482` canonicalizes callable and Proxy
  prototype arguments. `__object_create` around line 661 stores a `$Object`
  prototype; an argument failing that carrier test becomes null in that slot.
  Determine the original's emitted TypedArray carrier before declaring loss.
- `src/codegen/object-runtime-proxy-chain.ts:73` activates links only for
  standalone plus `proxyDirty`; its wrapper recognizes `$Proxy`. Field 6 holds
  an anyref, but consumers assume a Proxy and perform Proxy-specific casts.
  Putting a TypedArray there without updating consumers is unsafe.
- `src/codegen/object-runtime.ts:2515` gates inherited descriptor Set machinery
  on `inheritedSetAnyDirty`; the decision walker around 2564 uses `$Object`
  prototype cursors and own-descriptor precedence. The ordinary set path can
  insert a new own property after an inherited miss. Record actual activation
  flags rather than guessing them from the descriptor literal.
- `src/codegen/object-runtime-ordinary-set.ts:580` already has a TypedArray
  exotic arm for a direct target or later prototype hop. It requires
  `receiverSetCallers`, a complete helper set, and admitted carrier types.
  Current call-site registrations found are four-argument Reflect.set and
  super-property writes. Merely reserving the helper does not activate this arm.
  This original contains neither source construct. Do not rely on the stale
  comment that four-argument Reflect.set is its only possible caller.
- `src/codegen/ta-dyn-mop.ts` supplies direct-receiver guards and fills the above
  arm. A direct TypedArray guard cannot recover a prototype dropped earlier.
  Static i8/i16/i32 carriers are admitted; shared `$__vec_f64` cannot be branded
  as TypedArray because ordinary `number[]` uses it too. Dynamic-view and packed
  carrier identity must remain sound.

Leading hypothesis: prototype preservation plus inherited exotic dispatch,
potentially with activation-gate gaps. Alternative: original lowering, deletion,
descriptor reflection, or a proof-driven representation change differs from the
expected route. No measured causal conclusion yet.

## 5. Ownership gate before any implementation

Read-only upstream assignment observation: `issue-assignments` ref
`280f034b199b33dc61b365ad792dbf1462834970`.

- #5271 reserved, blank assignee/branch; #2663 released (`ttraenkler/L4-with-statement`).
  These are not free numeric IDs and do not release shared source ownership.
- #6651 in-progress: `ttraenkler/project-thread-yhj9pp`, branch
  `claude/project-thread-yhj9pp`.
- #6766 in-progress: `ttraenkler/opus-6766`, branch `issue-6766-proxy-proto-link`.
- #2046 released (`ttraenkler/dev-eslint-graph`). Local old file-lock notes do
  not override current assignments. Recheck all records immediately before work.

Read-only open-PR inventory inspected all 33 open PR file lists, paginating lists
over 100 files. Relevant overlaps include PR #6468 (head
`b19e6d6b1dd98f82f847b52b1474a6e7804aeef6`), #5784
(`5aa3d8f85743bbedad1c6872b9dfd1918f97dacd`), #5753
(`11b39957841119c75b9703b8bad0cdcecf80f226`), and #6571
(`2c19236b65796071be4ab58674a710a35e04a469`). File overlap is not proof of an
active conflicting edit, but requires coordination. Narrow hunks read: #6468
changes Proxy trap lookup in prototype/link code, dynamic TA own-length, and
with helper registration; #5784 wires Error prototype filling. Preserve these.
Root candidate PR #6548 and receiver diagnostic PR #6604 are separate lanes,
not permission to edit their worktrees or adopt their changes automatically.

Proposed ownership, **not yet granted**:

- Root: admission, frozen provenance, later sole heavy execution and integration.
- Sol61 after root/6651/6766 owner agreement: one narrowly allocated conformance
  slice for TypedArray prototype representation/dispatch, with a new focused
  test file and leaf helper preferred. Shared wiring candidates are
  object-runtime-prototype.ts, object-runtime-proxy-chain.ts,
  object-runtime-ordinary-set.ts, ta-dyn-mop.ts, object-runtime.ts, and activation
  gate/context wiring only if proven necessary.
- with-scope.ts / assignment.ts: observation and regression tests first; no
  implementation ownership requested unless the matched trace proves a defect.
- compiler.ts / output.ts: no ownership requested. Coordinate with numeric-proof
  owner before any diagnostic L-only change. No machine IR edits or migrations.

If current owners do not hand off these hunks, stop at the source/evidence packet.
No issue-claim push, GitHub issue, canonical #6878 edit, commit, or source mutation
is authorized by this planning handoff.

## 6. Minimal later matched attribution packet

Only after root confirms the heavy slot terminal and authorizes the next run:

1. Freeze original/harness/manifest/bundle/toolchain/provider receipts and exact
   source bytes. Reproduce the unchanged original through the authoritative
   maintained standalone runner, noStrict only, no linked units, honest 14/auto.
   Preserve 30-second job and 10-second fresh retry budgets and current callback
   ceiling. No adding Reflect.set, Proxy, debug statements, or includes to it.
2. Separate diagnostic modules, each with unchanged normal harness/options:
   (a) prototype identity immediately after Object.create(ta);
   (b) own descriptor/value before delete and absent immediately after;
   (c) ordinary `env.NaN = (delete env.NaN, 0)` without with;
   (d) `Reflect.set(env, "NaN", 0)` after deletion;
   (e) `Reflect.set(ta, "NaN", 0, env)` after deletion;
   (f) identical with sequence over an ordinary prototype and an outer binding
   sentinel. Keep four-argument Reflect.set and Proxy controls OUT of the
   original's module: they can turn on runtime support and mask a gating bug.
3. On the reproduced original, retain emitted-code/route evidence for the
   assignment branch, create argument carrier, stored prototype identity,
   HasBinding capture, delete completion, post-RHS HasProperty, Set decision,
   receiver identity, and final own descriptor. Source existence alone is not
   route evidence. Diagnostic output is not a promoted Test262 score.
4. A = exact frozen candidate; B = that source with ONLY the numeric call-proof
   extension L removed, using the reviewed timeout packet's dependency-closed
   diff; A-restored = exactly A again, identical source hashes. Execute matched
   original plus the small controls in fresh processes at identical settings.
   Do not remove the whole eleven-file integration or compare unrelated main.
5. If A/B differ, isolate the proof/representation change with the same body and
   inspect the first differing route. If A/B both fail identically, that excludes
   L as necessary for that observed failure, not every #6878 change. If broader
   #6878 attribution is needed, use a separately reviewed minimal delete-change
   removal/restoration control; do not conflate that with the L control.
6. A historical commit run is secondary only with exact verified source and
   harness receipts. Old equal errors or old wall times alone prove neither
   existing cause nor regression absence. Report every negative and inconclusive
   result. Compile/exec columns and summed variant times are not phase profiles.

## 7. Conditional implementation design after route confirmation

- If prototype storage is the first divergence, extend the existing link
  representation through a carrier-aware leaf; retain raw object identity on
  readback. Do not change `$Object` field indices or let a new link reach an
  unconditional Proxy cast. Avoid adding a second unrelated prototype store.
- Enumerate all writers and readers before changing representation: create,
  setPrototypeOf and status twin, literal/legacy __proto__, getPrototypeOf,
  Get/Has/Set, isPrototypeOf/instanceof, inherited enumeration, implicit terminal
  logic, identity checks and cycle traversal; audit vec/function/native wrapper
  consumers. Proxy-only cycle shortcuts are not automatically valid for a TA
  link; follow the represented object's actual internal methods.
- Preserve receiver-sensitive Get and Set semantics at every exotic hop; classify
  TA Get/Has and enumeration separately rather than applying the Set rule to all
  operations. Do not silently lose nonnumeric prototype properties or symbols.
- Reuse/extract the canonical numeric-index and exotic Set logic already in the
  receiver-aware helper. Invalid canonical index + distinct receiver returns
  success with no write/coercion; valid index follows ordinary receiver rules;
  SameValue receiver follows typed element conversion/write rules. Keep current
  errors, attribute checks, abrupt completions, and single key coercion.
- Widen reservation/fill/own-write gates coherently for a proven TypedArray
  prototype capability, not the spelling `NaN`, `with`, or a test filename.
  A source without Reflect.set/Proxy must still get required semantics; a module
  without the capability should retain its clean path. Check aliases/dynamic
  construction against any proposed pre-scan and carrier identity strategy.
- Receiver-side creation must be own-only; recursing through full Set on the
  same heir can revisit its exotic prototype forever. Publish handled success
  versus refusal through existing decision/result channels exactly once.
- Preserve helper reserve/fill order, late-index remapping, fresh instruction
  arrays, descriptor authority, existing Proxy invariants, and ordinary-array
  identity. If sound float branding requires an architectural expansion, return
  to root/owners with that scope rather than marking all f64 vectors TypedArray.

## 8. Exact acceptance and regression obligations

- Unmodified reported original PASS in the authoritative lane with reached_test
  true and noSkip/no new host imports, same oracle/providers/budgets. No forced
  strict companion for noStrict. Diagnostic controls do not replace this.
- W5 originals PASS: `test/built-ins/TypedArrayConstructors/internals/Set/` plus
  `key-is-out-of-bounds-receiver-is-proto.js`,
  `key-is-canonical-invalid-index-prototype-chain-set.js`, and
  `key-is-valid-index-prototype-chain-set.js`; retain full original bodies.
- Focused guards: correct prototype identity through create/setPrototypeOf/
  __proto__; direct versus inherited receivers; NaN, -0, Infinity, fractions,
  out-of-bounds and valid indices; noncanonical numeric strings and symbols;
  own writable/nonwritable/accessor descriptors; outer shadowed bindings;
  RHS/delete effects once; invalid inherited write skips value conversion,
  direct TA invalid write preserves required conversion; valid inherited write
  creates receiver property without mutating prototype elements. Include
  non-extensible and Proxy receivers, proxy-as-prototype regressions, ordinary
  number[] versus integer/float/dynamic TA carrier controls.
- With guards preserve pre-RHS reference capture, HasProperty/unscopables order,
  throwing getters/traps, strict missing-binding behavior in legal nested strict
  functions, and non-strict deleted ordinary-binding recreation. Strict `with`
  syntax is not a valid positive control.
- Maintained relevant suites: all ES5 with originals; ES2015 with; Object/create,
  setPrototypeOf, Reflect/set, TypedArray and TypedArrayConstructors; #6766 proxy
  prototype tests, #2046 receiver tests, and #6878 delete Boolean controls.
  Use frozen per-original baseline/result maps: zero formerly passing losses,
  no new compile errors/timeouts or hidden skips. Existing negatives remain
  explicit until independently fixed; do not turn them into accepted exclusions.
- Root-approved focused tests/types/build/boundary checks only in the later heavy
  slot. After integration, full fresh 11,778-original census including 74 Intl,
  per-original results and complete receipt. A narrow green packet is neither
  full ES2015 completion nor authority to overwrite this live census's evidence.

## 9. Reproducible source hashes

SHA-256 under EXEC at the analyzed HEAD:

```text
3fb928bde83a2433a64a1fb6663506a636a56c4263bcfef4246c0ff5b76f15eb  src/codegen/with-scope.ts
6a3f1a7552fb5708eee0136623c5dbeadaba2618be84ad7d88e1f01175d05925  src/codegen/with-has-binding-native.ts
f98f5c5938294b60aab551ea873b1e31e1a7d0d290b10d2608731404fbdb83bc  src/codegen/expressions/assignment.ts
a007fd7d7273d630bb4e19956ffa88a598f5749e509e23b2ca4a0d4edcf28f0d  src/codegen/object-runtime-prototype.ts
22a4ec05ea8abadf5e82540818fdcebdae8676fc46a99ea57c121fd62ba48fb7  src/codegen/object-runtime-proxy-chain.ts
5c5784882eca1bb0c474a1d1ffe6d9b55c09867fc2c4f913c7ba4d5e529d6a9a  src/codegen/object-runtime-ordinary-set.ts
ddd61dc58de2058204387e97f4a954e38008bb8a4ff85eda0a89d043ad7b863a  src/codegen/ta-dyn-mop.ts
92bd1b419222c200af68869fbdc4801d3c1dec806d3b5420a2b19530a08fc2e1  src/codegen/object-runtime.ts
4de6a861a8733265210f23edf98199b584dd13ab90d3c08e31d842798e337494  plan/issues/5271-es2015-standalone-statements-r2.md
eaf70b78aad77a7523708618abfa78c92cd81d3a40e743bfbb10006ec31899d6  plan/issues/2663-with-statement-tier2-dynamic-scope.md
```

Handoff state: ready for root's full review, not implementation-authorized;
allocation and shared-owner agreement pending, runtime route and causal origin
unmeasured. Full-census objective and all observed negatives remain unchanged.
