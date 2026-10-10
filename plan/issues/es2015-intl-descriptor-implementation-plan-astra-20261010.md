# ListFormat prototype Symbol.toStringTag: source-only implementation plan

Frozen source-only plan, 2026-10-10. This file tracks the NEW Astra High planner's
bounded task; numeric allocation, assignment claim, implementation and
publication remain pending. The earlier planner's failed resume is not a
successful resumed task. Only this Markdown file is owned by this planner.

No production edit, compiler/parser invocation, test, build, install, hook,
profiling run or Git mutation is authorized in this planning lane. Root retains
the sole heavy execution lease until the full census naturally terminates and
root explicitly releases it. Existing peer documents and production ownership
remain intact.

## Evidence and scope

The smallest candidate is an ordinary own data descriptor on the existing
emitted ListFormat class prototype. Existing source supports this candidate;
there is no source evidence requiring a new generic descriptor mechanism.
That is a source-level feasibility conclusion, not proof of the original's
actual emitted carrier, execution route or future result.

Root's frozen handoff is `es2015-intl-shard-zero-negatives-handoff-20261010.md`,
SHA-256 `8dfa6fdc9964202fd481d69682f488974f73cd732601b29b0489eb2f063710a6`.
The earlier `a1e4…` pin preceded root's new-planner custody and full-prelude-read
append; root confirmed that history. The previous resume failed with a thread
limit and that planner disappeared from inventory; this task is a new planner.

The frozen execution checkout is
`/Users/thomas/Code/js2/.codex-worktrees/6878-delete-result-boolean-sol61`, HEAD
`38901fff8f9a5ca029cbefcdaec5d8dd40949861`, source digest
`a6464ffb87f98d4984d2454a14bc95bd80c035c88e7905bd1465b484537738c8`.
Run `es2015-fresh-integrated-20261010-1791586165174` has a completed first shard
of 736 original rows: 716 PASS, 13 FAIL, one compile_error, six compile_timeout,
zero skip. This plan neither updates nor independently remeasures that receipt.
The full 11,778 originals, including all 74 Intl originals, remain unfinished.
Root's latest message reports native session 62071 / shard-one PID 53943 still
owns execution; this is a custody report, not a process check by this planner.

The unchanged original is
`test/intl402/ListFormat/prototype/toStringTag/toStringTag.js`, SHA-256
`80e3e38b28df5d12de6464ac2fe0c97f3dda72f932d5564b088013535bff07e4`.
I fully read and rehashed its physical bytes under
`/Users/thomas/Code/js2/test262/test/intl402/ListFormat/prototype/toStringTag/`.
Root's canonical row says FAIL, missing own Symbol.toStringTag, compile 6118 ms,
execution 47 ms, reached_test true, standalone, honest oracle 14, providers
auto, strict both. Reached_test does not prove both variants or every assertion.
Its propertyHelper expectation is the own data value `Intl.ListFormat`,
writable false, enumerable false, configurable true; helper mutation checks
must really execute. No conformance delta is claimed.

The adjacent unchanged original `toString.js` was fully read and hashed:
`6d09d3e0b6e461efed240995d80d1c0a34b3bd08c68bcdabb567e3cec68fdfd8`.
It checks Object.prototype.toString on both prototype and instance. No verdict
for it was read or inferred here. It is an additional exact-source control,
not permission to replace the selected failing original.

## Standards contract

ECMA-402 requires the prototype's own Symbol.toStringTag data value to be
`Intl.ListFormat`, with writable/enumerable false and configurable true. The
prototype is an ordinary object, not an initialized formatter; instances inherit
its properties. See [ListFormat prototype tag](https://tc39.es/ecma402/#sec-intl.listformat.prototype-%symbol.tostringtag%)
and [prototype object](https://tc39.es/ecma402/#sec-properties-of-intl-listformat-prototype-object),
read 2026-10-10 (current section 14.3; prefer stable anchors over older numbering).

[Object.prototype.toString](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.prototype.tostring)
gets the symbol property and uses it when it is a string; non-string values use
the ordinary built-in tag. Thus redefinition, inheritance, deletion and getters
must remain observable. A fixed toString result is not this repair.

## Source chain and reader constraints

The entire 474-line `src/intl-listformat-prelude.ts` was read. Its SHA-256 is
`da09f7316608d57639d008372026079159f115c94962db16786ae844eb585c28`, identical
in this planning worktree, the frozen execution checkout, and upstream
`43b1f746771bf266f15b285fc8bac93d3c8d22d8` fetched read-only by exact commit.
No Symbol.toStringTag declaration or descriptor initialization exists in its
class/template. The class ends immediately before the template's closing fence.

The following source chain supports a candidate using existing ordinary
property operations. It does not prove that every condition below holds in the
assembled original; trace that after the heavy lease is released.

1. `findListFormatAccesses` rewrites bare `Intl.ListFormat` property accesses;
   a top-level Intl variable/function/class/module declaration disables all
   rewrites. It is not a lexical binding resolver: nested parameters, catches,
   block bindings and destructuring need explicit controls. `servesEnvironment`
   limits injection to `none`/`wasi`. `compiler.ts:1754,2015` already wires both
   single-source and multi-file entry points. No compiler.ts edit is proposed.
2. `property-access-dispatch.ts:2371` resolves known class `.prototype` through
   `emitLazyProtoGet`. `class-proto-object.ts:161,235` can make that singleton a
   real `$Object` when standalone, with a registered class struct and class
   object. Its initializer installs constructor/method entries and publishes
   the same global. An unsupported carrier can fall back: verify the concrete
   receiver rather than trusting the class name or checker type.
3. `declarations.ts:4283` retains top-level CallExpressions in module init.
   Therefore a post-class Object.defineProperty call has an existing collection
   path. The assignment-only `class-proto-toplevel-write.ts` predicate need not
   be widened for this call shape. Compiler-origin spans already classify
   non-class injected statements as `list-format-support` and the position map
   is calculated from the full prelude text. Verify order and mapping later.
4. `expressions/call-builtin-static.ts:2975` delegates Object.defineProperty to
   `compileObjectDefineProperty`. In `object-ops.ts:1467`, only a literal string
   supplies the static `propName`; the Symbol.toStringTag expression is not
   such a field. The physical-field fast path requires a matching field index
   (`:1763`); the value-descriptor alternative at `:2611` calls
   `emitExternDefinePropertyValue`. It compiles the actual prototype value,
   preserves its identity, evaluates the key/value and emits the runtime define.
5. `object-ops.ts:2857` explicitly preserves native Symbol keys instead of
   stringifying them. `computeRuntimeFlags` distinguishes attribute presence
   from value; this full descriptor encodes 0xbc (188), not METHOD_FLAGS 0x05.
   `object-runtime.ts:1248` ensures the native Symbol carrier when available.
   Its symbol-aware hash/equality channel distinguishes symbol identity from
   strings such as `toStringTag` or `Symbol(Symbol.toStringTag)`.
6. `object-runtime-descriptors.ts:272` registers `__defineProperty_value` with
   ValidateAndApplyPropertyDescriptor behavior through
   `buildObjectDataDescriptorBody`. A real `$Object` follows ordinary storage;
   the non-$Object fallback can return the receiver without installing anything.
   This makes actual carrier proof mandatory even if compilation succeeds.
7. Consumers must agree on the same entry: runtime get-own descriptor,
   hasOwnProperty, propertyIsEnumerable, own-symbol enumeration, ordinary Get,
   inherited instance Get, Set and Delete. The gOPD dispatcher explicitly
   avoids struct-key synthesis for `standaloneProtoObjectReceiver`
   (`call-builtin-static.ts:3587` vicinity). `object-proto-symbol-tag.ts:79`
   consults `__extern_get` with the interned well-known symbol; it is a reader
   of the real property and must not receive a ListFormat-specific constant.

The generic files above are dependencies to inspect, not files released for
editing. No new `definedPropertyFlags` entry, structural classifier, native
brand table entry or shared context state is proposed. If a later diagnosis
needs one, enumerate all readers/mutators plus initialization and two-pass
snapshot/restore before a separately approved repair. A static class getter
would put an accessor on the constructor; an instance getter gives the wrong
descriptor kind; an instance field gives the wrong owner/flags. None implements
the required own prototype data descriptor.

The key inspected generic files have identical hashes in planning and frozen
execution checkouts: class-proto-object
`9dec4a68dbb983d025c8d9da0a4a8c0565b77ac82c690bbc5f1ab25200d347f0`;
object-ops `513e3809bb2d9b4b28f83bfd224c2496d22a3ea6d4fe8b1b504477557cf651ec`;
object-runtime-descriptors
`336557691084c2d869f940e8ea22f3c8c3b1d311da6e8e5528a2de52591f799d`;
object-proto-symbol-tag
`d1e2e6ff49ea962cab5fafebccd6dda8a905f8eed8f9bdcef7af71436f8ac955`;
declarations `baa7eb858e879bceda8e38fcd6e602e285ea654725c076b4e4434cf287f9407b`.
The planning HEAD is `dbf5b4f74b37d67e525b2af36fd1fe49803b1348`; it is not the
execution HEAD. Matching selected files does not establish whole-tree parity.

## Current ownership receipt and release gate

Read-only GitHub access initially failed in the sandbox; authorized read-only
network escalation succeeded. No claim tool, Git mutation or publication ran.
Upstream assignment ref read on 2026-10-10:
`88dfc714e63c2500f6fa9316ac67575b94a07461`. The recursive assignment tree returned
`truncated:false`; exact relevant records, including the shepherd slice, were
read from that immutable ref:

- 6839, “standalone: Wasm-native Intl.ListFormat (en data) instead of
  env.Intl_ListFormat_* host imports (prettier)”: assignment reserved, empty
  assignee; local issue done. This is historical implementation, not a new claim.
- 6717, “Standalone user-visible Intl namespace/API gap: proof-first host-free
  semantics”: active assignment `copywithin_reflective_5145_terra`, empty branch,
  updated 2026-10-02. Local issue names a different bounded data-foundation owner
  and limits that claim to generator/assets/tests/document. Preserve that
  discrepancy as an ownership hold: neither stale-looking metadata nor local
  scope wording proves the new production leaf is released.
- 6809, “codegen: generic Unicode BCP 47 locale grammar and canonicalization
  kernel for a future standalone Intl.getCanonicalLocales” (title read from
  its published fork branch): active `ttraenkler/codex-intl-locale-parser`,
  branch `codex/6809-intl-locale-canonicalization`. Do not take its parser/data.
- 6651, “ES2015 standalone → 100%: cluster execution plan from the 2026-09-20
  census”: active `ttraenkler/project-thread-yhj9pp`; its separate
  `pr-6449-shepherd` slice is released, which does not release the parent.
- 6766, “ES2015 standalone: a Proxy as [[Prototype]] — link carrier in
  $Object.$proto, per-hop trap dispatch, receiver-threaded [[Set]]”: active
  `ttraenkler/opus-6766`. Shared prototype/receiver semantics stay with that owner.
- 4274, “ES2015 true realms: replace $262.createRealm pseudo-realm with IR/runtime
  realm identity (128 files)”: assignment released 2026-09-03. Root's explicit
  realm contract remains in force; release metadata grants no foreign-realm work.

The open-PR query returned 32 PRs (limit 100). Its exposed file lists showed no
intl-listformat-prelude or issue-6839 edit. PR 6436, “feat(intl): add locale
canonicalization kernel”, carries issue 6809. PR 6468, “feat(deno): checkpoint
Context-owned Script lexical cells”, carries issues 6651/6717. PR 5753,
“feat(typescript): advance standalone compiler coverage with IR closure support”,
touches object-ops and object-runtime-descriptors; compiler.ts also appears in
PRs 6588, 5784 and 5748. GraphQL file-list limits and unpushed work mean absence
here is not proof of exclusive ownership. PR 5753 becomes a direct file conflict
only if this candidate expands into those generic files; no such expansion is
authorized. compiler.ts, output.ts and IR remain unreleased.

Root must review this plan and clear the exact prelude hunk against the active
Intl claim before a production worker is released; recheck upstream implementation,
open PRs and authoritative assignment records at dispatch. Allocate a new numeric
issue with the standard allocator only when root permits that execution, then
record the bounded claim and ownership resolution. No GitHub issue is proposed.

A separate isolated scratch candidate can be prepared under root's explicit
source-only dispatch without taking the 6717 production claim: use only that
worker's own `.tmp/` proposal text/patch and documentation, with no parser,
compiler, tests or mutations to tracked production files. The patch below is
already sufficient to make that proposal reviewable. Applying it to tracked
source as an implementation requires the production-leaf clearance above;
neither scratch preparation nor this plan substitutes for that clearance.

## Implementation Plan

After ownership clearance, the proposed initial production scope is only
`src/intl-listformat-prelude.ts`, a new issue-owned focused test file, and the
allocated issue record. Preserve the existing 6839 test file as a regression
input unless separately authorized to edit it. Use a distinct Sol 6.1 High
implementation worktree; never modify the live census checkout.

1. Preserve a byte-exact pre-edit source copy in the worker's own `.tmp/` and
   record base/candidate identities. Once root releases the heavy lease,
   reproduce the unchanged original under its maintained original-harness
   assembly and frozen configuration. Inspect the actual assembled/transformed
   source and resulting prototype carrier, key, flag word and first divergent
   operation. No copied harness or simplified test supplies the conformance
   verdict. If the real first divergence contradicts this plan, evidence wins.
2. First candidate: append the following ordinary initialization immediately
   after the class declaration inside `INTL_LIST_FORMAT_PRELUDE`, before user
   source runs. `${LIST_FORMAT_BINDING}` here denotes the existing template
   interpolation, not a new source-text recognizer:

   ```js
   Object.defineProperty(${LIST_FORMAT_BINDING}.prototype, Symbol.toStringTag, {
     value: "Intl.ListFormat",
     writable: false,
     enumerable: false,
     configurable: true,
   });
   ```

   This is standards initialization for every supported use of the prelude,
   independent of test name, source hash, harness or assertion. It creates no
   tag on the constructor or instances. Preserve injection gating, directive
   prologue, origin mapping and all existing locale/method behavior.
3. Treat new ambient Object/Symbol reads as a real capture risk. A source-local
   Object or Symbol binding, import, global replacement, or TDZ must not become
   an accidental dependency of intrinsic initialization. Establish actual
   emitted behavior and controls before accepting the naïve call. If existing
   compiler-origin/intrinsic resolution cannot safely supply these operations,
   return a named dependency to root; do not invent a hidden host/global escape,
   ignore a binding or widen compiler.ts/shared lowering to force this leaf.
4. Verify the candidate through the existing ordinary descriptor readers and
   mutations below. If the missing property moves to a real carrier, Symbol,
   inference, receiver or mutation defect, stop the leaf at that boundary and
   deliver the exact first divergence plus named owner/dependency. No generic
   descriptor/runtime edit is authorized by this plan.
5. Only after proof and scoped verification, run the required repository gates,
   capture imports/artifact identities and prepare the normal review/publication
   handoff. All heavy operations, including parser-only checks, remain queued
   behind root's census lease. No timeout expansion or alternate evaluator.

## Required control matrix, after execution release

Use fresh execution contexts for mutation cases; record expected and actual
assertion counts, both requested strictness variants and terminal receipts.
The controls below are general API semantics, not alternate acceptance rows.

- **Original and instrument:** unchanged pinned `toStringTag.js`, exact includes,
  honest oracle 14/providers auto/strict both. Assert own presence and descriptor
  fields independently as well as through propertyHelper. Deliberately wrong
  value/flag and absent-own-property controls must fail, proving checks execute.
- **Owner and key:** prototype owns the symbol exactly once; constructor and two
  instances do not. Direct, alias and opaque-parameter prototype reads agree.
  Own-symbol enumeration contains the real symbol; string-name enumeration and
  Object.keys exclude it. String `toStringTag` and a fresh same-description Symbol
  are distinct keys. Descriptor has value/writable, no get/set, and exact flags.
- **Inheritance and identity:** instances share the constructor's prototype;
  inherited reads see the tag, getOwnPropertyDescriptor(instance, symbol) stays
  undefined, and Object.create(prototype) inherits it without becoming branded.
  Tag observation itself must not call formatter methods or require brand slots.
  Include the unchanged adjacent `toString.js`; direct/call/extracted generic
  toString receivers agree where the existing callable path is supported.
- **Non-writable Set:** assignment to prototype and instance fails to replace
  the inherited non-writable value; sloppy assignment leaves it unchanged,
  strict assignment throws TypeError, and no instance own entry appears.
- **Redefine and delete:** redefine prototype value while omitting flags and
  confirm false/false/true survive; old/new instances observe the new tag.
  Then delete it, assert true result and actual absence, and verify ordinary
  `[object Object]` fallback for prototype/instances. Re-read repeatedly to catch
  lazy reinstallation. Redefine after deletion with explicit flags. Separately
  make it non-configurable and verify invalid redefine/delete rejection.
- **Inherited/custom tag:** replace with non-string value and observe fallback;
  install a counting/throwing getter on the prototype and verify one Get,
  receiver identity and abrupt completion. Define an instance own tag explicitly,
  confirm it shadows the prototype and deletion exposes inheritance again.
- **Generic positive/negative carriers:** an unrelated plain class prototype
  receives a custom symbol data property through Object.defineProperty and
  reflects/deletes it normally; its instance fields remain distinct. A plain
  object same-key control distinguishes a general symbol/descriptor failure from
  a class-prototype carrier failure. No ListFormat spelling appears in this pair.
- **Scope/receiver controls:** top-level and nested Intl variable/parameter,
  block/catch bindings, destructuring/import aliases, computed access and
  `globalThis.Intl` must be characterized. Existing narrow rewrite limitations
  remain recorded; this leaf cannot claim namespace identity or repair them.
  Candidate must not newly change their baseline behavior. Object/Symbol lexical
  shadows and TDZ are explicit candidate blockers if initialization is captured.
- **Lane/injection controls:** unchanged host output bytes/import identities
  for single-source and multi-file JS/TS inputs, including native-first host
  configuration already exercised by issue 6839; no ListFormat access means
  no injected bytes. Standalone/WASI retain host-free imports and original
  directive/source-origin mapping. Preserve issue 6839's English formatting,
  parts, option/order and iterator controls without claiming new locale coverage.

Mutating checks are necessary because descriptor synthesis alone can report
correct flags while the actual property cannot be written, deleted or inherited.
Some general controls may expose existing limitations. Classify each against
the baseline; do not weaken the standard, silently skip it, or call an incomplete
descriptor implementation complete to obtain a green number.

## Acceptance and remaining work

- [ ] Root reviews plan and resolves/records specific prelude-leaf ownership.
- [ ] New numeric issue and bounded production claim are allocated normally.
- [ ] Actual unchanged-original baseline proves the selected route and first
      divergence after root releases execution.
- [ ] A–candidate–A uses identical original/harness/options and the saved source
      bytes: both A runs reproduce the missing-own-property failure, candidate
      passes with real assertion execution. Record lane, exact code identities,
      original hash, assembly/provider/compiler hashes, commands, raw output,
      canonical JSONL, variant accounting and natural terminal/completion receipt.
- [ ] The matrix passes for the claimed descriptor surface; pre-existing limits
      and any newly exposed blockers are recorded with separate ownership.
- [ ] Required gates and scoped ListFormat/class-descriptor blast-radius checks
      pass after the lease release; host identity/import regression controls hold.
- [ ] Root retains all 74 Intl and all 11,778 original identities in subsequent
      integration measurement. A leaf PASS is neither blanket Intl completion
      nor proof that the full frozen corpus passed.

DateTimeFormat methods, DisplayNames foreign realms, PluralRules, namespace
identity, locale data/canonicalization and runtime/provider architecture remain
outside this leaf. The other three Intl negatives in the root handoff stay
unresolved and attributed individually. No source edit, test outcome, worker
release, publication, merge readiness or ES2015 completion is claimed here.
