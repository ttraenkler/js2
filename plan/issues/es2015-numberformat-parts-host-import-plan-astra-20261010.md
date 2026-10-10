# Standalone NumberFormat formatToParts host-import gap — implementation plan

2026-10-10; Astra High source-only plan for a future GPT-6.1 Sol implementer.
Numeric implementation issue allocation, production claim, integration and all
execution remain pending. This NEW file is the planner's only owned output.
It supplements issue 6717, “Standalone user-visible Intl namespace/API gap:
proof-first host-free semantics”; it neither replaces that issue nor claims its
runtime/data/namespace ownership. No production fix is delivered here.

## Frozen evidence and authority

Root's complete 277-line `es2015-intl-shard-zero-negatives-handoff-20261010.md`
was read, SHA-256
`14e84aff400873e8ef18d2548c6c3bf5dbad0d201b0697325603b3641c5ced94`.
The source epoch is EXEC
`/Users/thomas/Code/js2/.codex-worktrees/6878-delete-result-boolean-sol61`, HEAD
`38901fff8f9a5ca029cbefcdaec5d8dd40949861`, source digest
`a6464ffb87f98d4984d2454a14bc95bd80c035c88e7905bd1465b484537738c8`.
All implementation source inspection below uses that frozen checkout unless a
different custody is stated. PLAN is the assigned isolated checkout
`/Users/thomas/.codex/worktrees/es2015-fresh-full-census-plan-astra/js2`.

Root's latest report is the SAME live census session 62071, fourth shard/index 3
PID 21569: 2,333 canonical rows, 2,283 PASS, 41 FAIL, three compile_error, six
compile_timeout, 9,445 unsettled. These are root-reported partial observations,
not a new measurement by this planner. No final rate, cause or acceptance follows.
The root's sole heavy execution lease remains occupied. No parser/helper,
compiler, test, typecheck, build, install, formatter, hook, profiling, signal,
production/Git/claim/publication write or delegation was performed by this plan.
Read-only standards retrieval did not download dependencies or alter the repo.

Fully read and rehashed unchanged originals in EXEC:

- `test262/test/intl402/NumberFormat/prototype/formatToParts/value-tonumber.js`:
  `ec2d2f5eb7d46b32eeb69ce2ea8eaf22a6e71545bd80b33dbd8fff6af8b428fe`.
- `test262/test/intl402/NumberFormat/prototype/format/value-tonumber.js`:
  `ecf84de483d81e5ccef5145c4065ceb2d183fc72d54d1781910c52de5b86c78f`.

Current official standalone/honest oracle 14/auto/strict-both evidence for the
first row is compile_error, compile_ms 1308, reached_test false, prohibited
`env::Intl_NumberFormat_new` and `env::Intl_NumberFormat_formatToParts`. No
runtime assertion or successful strict variant was measured. Issue 6717 already
records both originals' older import failures; the current evidence establishes
persistence of one row's failure, not a new defect family or a measured repair.

The parts original compares six coercion pairs: undefined/NaN, null/+0,
true/1, false/+0, numeric string/number and nonnumeric string/NaN. It compares
length and every part's type/value. Its object callback observes the number
hint and exactly one conversion, then Symbol input must throw TypeError.
The format original also compares positive/negative infinity strings. Returning
the same dummy parts for every value could satisfy the equivalence checks;
therefore these two originals alone cannot validate a real formatter.

All 11,778 originals including all 74 Intl entries remain in scope. The four
originals in the separate timeout diagnostic packet are not expanded by this
NumberFormat plan. New controls are separate verification inputs, not replacements
for or edits to either frozen manifest.

## Read guidance, claims and held boundaries

AGENTS.md and actual `.claude/memory/MEMORY.md` were read, including relevant
Test262/isolation, no-kill/no-data-deletion, issue tracking, measurement and claim
collision/release guidance. Issue 6717 was read completely (703 lines). The
completed issue 6839 ListFormat record and the 337-line separate ListFormat
descriptor Astra plan were also read; no ListFormat file is claimed here.

Local read-only assignment records at
`refs/remotes/upstream/issue-assignments`, SHA
`8972712a1bf33c3429ff6a851e8581a0783b1ada`, report:

- 6717: in-progress, `copywithin_reflective_5145_terra`, updated October 2;
  its issue names a different bounded data-foundation owner. Preserve the
  discrepancy and obtain explicit coordination; neither record releases runtime.
- 6809: in-progress, `ttraenkler/codex-intl-locale-parser`, branch
  `codex/6809-intl-locale-canonicalization`. Its title in the reviewed descriptor
  plan is “codegen: generic Unicode BCP 47 locale grammar and canonicalization
  kernel for a future standalone Intl.getCanonicalLocales”. Reuse through its
  owner; do not duplicate or edit that kernel under a NumberFormat claim.
- 6651, “ES2015 standalone → 100%: cluster execution plan from the 2026-09-20
  census”: in-progress, `ttraenkler/project-thread-yhj9pp`.
- 6766, “ES2015 standalone: a Proxy as [[Prototype]] — link carrier in
  $Object.$proto, per-hop trap dispatch, receiver-threaded [[Set]]”: in-progress,
  `ttraenkler/opus-6766`.
- 4274, “ES2015 true realms: replace $262.createRealm pseudo-realm with IR/runtime
  realm identity (128 files)”: locally recorded released September 3. Root's
  explicit realm coordination still applies; a historical release is not a claim.

These are cached local records, not a fresh upstream ownership proof. The local
origin ledger lacked 6717 and refs/heads/issue-assignments was absent; neither
failed lookup proves work is free. Root must recheck authoritative assignments,
upstream changes, open PRs and direct owner handoff at future dispatch. No fetch,
claim-helper execution, issue allocation or network write occurred here.
compiler.ts, output.ts, shared 6651/6766 surfaces and parallel IR work remain
HELD. This document grants no ownership transfer, even for a seemingly small hook.

## Source chain and concrete prerequisites

Read-only selected source establishes this candidate route, not a new compiled
trace of the assembled original:

1. `src/codegen/extern-declarations.ts:300–313` unconditionally registers
   NumberFormat as the Intl_NumberFormat extern class. ListFormat next to it is
   gated off none/wasi; that neighboring gate is not a NumberFormat provider.
2. `src/codegen/registry/imports.ts:2406–2610` collects the extern constructor
   and typed member imports before lowering. It has native exceptions for
   other complete routes and guards for user classes; it has no NumberFormat
   native exception. Registration/collection/lowering must agree as one contract.
3. `src/codegen/expressions/new-super.ts:8261,8419–8426` emits the generic
   prefix_new call. `expressions/extern.ts:223–290` resolves the method owner,
   compiles receiver/arguments and calls prefix_method. Suppressing imports
   alone can expose missing-index/null/error fallthrough, not semantics.
4. `expressions/identifiers.ts:1766` materializes host Intl only off
   standalone/WASI. `builtin-static-globals.ts` supported namespace and constructor
   lists and the fully read `standalone-global-object-carriers.ts` have no Intl
   namespace seed. The namespace value and typed constructor paths are separate.
5. `runtime.ts` maps NumberFormat to host Intl.NumberFormat. The fully read
   `new-intl-host-bridge.ts` refuses DateTimeFormat only; adding NumberFormat
   there changes the failure into an intentional throw and is not this repair.
6. `coercion-engine.ts:560` emitToNumber includes i64-to-f64 conversion and an
   externref path gated exactly on standalone, with different WASI behavior.
   It is not automatically a correct complete Intl mathematical-value operation.
   Existing ToPrimitive/ToNumber primitives are reuse candidates requiring exact
   receiver/primitive routing and abrupt-completion proof.
7. `number-format-native.ts`, stdlib number-format source and IR native-number-
   format requirements concern Number.prototype/number-to-string, not locale
   negotiation, formatter state or parts. Its Ryu/helper/body registration exists,
   but selected headers do not prove all precision/range behavior of current
   bodies. Do not copy an approximate f64 digit loop or assume full exactness.

Actual SHA-256 pins in EXEC:

```text
7414ddde779bddeaef906985a93d7f0a819440dbeddc53af40dd67c5cbe019c6  src/codegen/extern-declarations.ts
3feb3ccddfc9ce1320b78818196ac4507a64745cbae0e7933a2babbd60c63bcb  src/codegen/registry/imports.ts
cd2870b7016cd0b9e1009ba69f991526b36aec990b6831195963c9f4d92d07c6  src/codegen/expressions/new-super.ts
a152afdc5a872ad78516326bf4db98c3e7c6862babfdb4adb68fce2836c7ad96  src/codegen/expressions/extern.ts
2322927bb98df2c52a2a790a73e2a9a7a5f2a1eed227c58c0420bcefb3c9a2d9  src/codegen/expressions/new-intl-host-bridge.ts
281bc9a70a9a5f266780cdb077c86fd3467d48cf74074d4b3810106ef1077eb5  src/codegen/coercion-engine.ts
4914731198d91659127016d691b2a9c3da34922a95f546aaf0994b5a8e48c42a  src/codegen/standalone-global-object-carriers.ts
ee4d8591389253f0a115934fca5845454249c0903f2fb7fbc561f52ce1e12de0  src/codegen/builtin-static-globals.ts
92b5a64afc25a63e3b35ec41dbd1ddb8730980824d0f6ab73dd4ad11b83943e1  src/codegen/number-format-native.ts
e006613548e176f9bf836067be4de5afac68441acfd8142e4ed4612934c73632  assets/intl/generated/locale-data.json
```

## Semantic contract before implementation

Freeze the normative edition/feature policy against the retained corpus before
coding. The original's historical ToNumber assertions remain mandatory. Modern
ECMA-402 uses ToIntlMathematicalValue, preserving BigInt and exact decimal-string
semantics that an unconditional f64 conversion loses; it still uses number-hint
primitive conversion and rejects Symbols. formatToParts checks the NumberFormat
brand before conversion; format is a getter returning a cached bound function.
See the fixed [ECMA-402 2025 NumberFormat clauses](https://402.ecma-international.org/12.0/#sec-numberformat-objects)
and [numeric conversion](https://402.ecma-international.org/12.0/#sec-tointlmathematicalvalue),
read October 10. The current online draft already says 2027; it is not silently
adopted as the project's edition. Root and the API owner must pin the exact
revision, optional legacy-constructor behavior and broader feature matrix.
Passing the old original neither selects an older whole API nor proves v3 support.

The implementation inventory must cover constructor/call/newTarget behavior;
supportedLocalesOf and resolvedOptions; ordinary descriptor-backed namespace,
constructor/prototype/method identities; locale negotiation; numeric conversion;
rounding/notation/grouping/sign/style; real parts; and error/realm behavior.
The local corpus contains options getters, read-once digit options, receiver
branding, default parameter, prototype descriptors and foreign-newTarget tests;
their bodies were read for the controls below. Range methods and newer options
remain named full-API dependencies if not in the first released slice. Do not
install stubs or report those dependencies completed with the initial two rows.

Proposed architecture is a host-free shared semantic core plus one native
branded NumberFormat binding. Keep value conversion, locale/options observation,
digit/pattern computation and JavaScript object materialization distinct so
computed/aliased calls cannot diverge from typed direct calls. Use normal
compiler-supported runtime functions with explicit data/resources and canonical
object/closure helpers; exact registration/IR integration must be agreed with
owners before production source is written. A source-only module that works
under Node but is not compiled into the standalone artifact is not delivery.

## Data and numeric core work packages

Existing 6717 assets pin CLDR JSON 48.2.0, commit
`bb334e8d6250c9363e957e131bf7e6d08ec72f91`, with aliases, likely subtags,
available locales and extension metadata. The 510,335-byte generated locale
table's hash above was rechecked; no generator was executed. Its published
seven-test receipt is historical data-foundation evidence, not a result here.
Number-format patterns, digit mappings, currency/unit displays and formatting
runtime are not provided by that data claim.

Ask the data owner for a separately tracked, deterministic NumberFormat dataset:
locale inheritance/parent records, numbering digits/defaults/symbols, decimal,
percent, currency and scientific/compact patterns, grouping rules, currency
fraction metadata and spacing, unit patterns and needed plural selection data.
These data categories follow [Unicode LDML Numbers](https://unicode.org/reports/tr35/tr35-numbers.html),
read October 10. Explicitly resolve aliases/inheritance; do not infer that every
locale in availableLocales has NumberFormat payload. Implement supported locales
from actual retained coverage, with a documented runtime default locale and
standards-based negotiation, never a whitelist of test locales or host lookup.

Extend provenance with immutable upstream paths, hashes, byte counts, license,
schema and generator version before later authorized acquisition/generation.
Keep existing assets immutable and owned; a new manifest must not silently
widen the old generator's input contract. Emit compiler-consumable resources,
not a runtime filesystem read of repository JSON. Budget measured source/table/
Wasm bytes, initialization cost and cache/ABI keys; no guessed performance or
size acceptance. Invalid/missing package data fails build admission; it is not
a runtime host fallback or an invented formatted answer.

Proposed core interfaces (names/layout not an approved ABI): normalized locale
and option state; normalized mathematical input; rounded decimal digit sequence
with sign and exponent; ordered semantic parts. Keep exact decimal/integer
storage separate from f64 where the pinned contract requires it. Handle NaN,
both infinities and negative zero explicitly. Preserve large finite magnitudes,
subnormals, rounding carry, ties, significant/fraction constraints and percent
scaling. Use exact arithmetic where needed; arithmetic/string-length caps must
not silently truncate valid input. Reuse proven number-to-string pieces only
after their actual contracts are inspected and tested at boundary values.

Have one partition routine produce parts; format joins their values, while
formatToParts materializes a fresh ordinary Array of fresh ordinary {type,value}
objects in the correct realm. Do not split a final formatted string to guess
part kinds: literals, localized digits, group/decimal separators, signs,
currency, percent, unit, compact/exponent tokens and bidi marks require semantic
boundaries. Do not share a mutable returned array or record across calls.
Resolved options are copied from initialized state, never reconstructed from
user options by re-reading getters. No test path/hash appears in implementation.

## Namespace, object model, coercion and realm integration

Coordinate one realm-owned Intl ordinary-object singleton through existing
namespace/global carriers, shared with 6717/6809. Bare Intl, globalThis.Intl,
computed lookup, aliases and destructuring must reach the same live property;
lexical/global shadowing, replacement and deletion remain observable. Demand
gating must not make a reflected NumberFormat disappear merely because the
compiler saw no direct constructor call. The separate ListFormat prelude is a
narrow historical route, not authority to repeat its textual rewrite limitations.

Represent each NumberFormat as an ordinary observable object with unforgeable
internal initialized state and a real prototype link. Whether this uses a
private native struct payload or an identity-keyed private association is an
explicit layout decision with the object/IR owner; public shape, tag or property
names cannot be the brand. Object.create(prototype), copied properties and a
Proxy around an instance do not become initialized NumberFormats. Legitimate
cross-realm branded instances need shared brand recognition without sharing
their realm's constructor/prototype identities.

Expose constructor, prototype.constructor, prototype methods, format accessor
and cached bound closure through normal callable/property machinery. Preserve
method lookup and receiver evaluation exactly once; direct-call fast paths must
not bypass a user-replaced method or accessor. General member reads, .call/.apply,
extracted methods and Reflect.construct must use the same semantic entry points.
Tag/descriptors require real mutable storage, not constant toString answers.
Prototype tag repair alone cannot satisfy branding or formatting.

At each public operation, record the pinned algorithm's evaluation/order contract
in its implementation test: receiver check, locale list Has/Get/coercion,
options reads, then value conversion at the operation that owns it. Use ordinary
property/call helpers so Proxy traps and user exceptions propagate unchanged.
Capture the value once; invoke @@toPrimitive once with number hint, then only the
appropriate primitive conversion. Null/undefined/Boolean/string/Symbol and
object fallback paths must be distinguished. Do not use Number(value), unary +,
a template literal or emitToNumber blindly as a replacement for the chosen full
contract; guard against double conversion and i64 precision loss.

Coordinate 4274 and constructor/error owners for newTarget.prototype lookup,
fallback intrinsic from newTarget's actual realm, built-in function realm,
fresh Array/part-object allocation and TypeError/RangeError constructors.
The fully read proto-from-ctor-realm.js tests six non-object prototype values.
Current-global aliases or anonymous look-alike errors cannot pass the true
contract. Same-realm work may be prepared separately with explicit outstanding
realm dependencies, but no full NumberFormat/Intl completion may be claimed.

## Atomic routing cutover and minimal future ownership

Only after a real native entry set and its prerequisites exist, use one reviewed
capability predicate for extern registration/import collection/new/member/value
read routing. For the claimed standalone surface, the native path must handle
all admitted spellings and preserve evaluation; suppress its corresponding
Intl_NumberFormat imports in the same integrated change. The host lane keeps
its host bridge. WASI needs its own explicit agreement and verification; do not
silently gate its old extern path on the assumption standalone proof covers it.
No change to import enforcement/2961 allowlists, oracle or canonical statuses.

Proposed new leaf responsibility for a future Sol 6.1 owner, AFTER root review
and separate worktree/claim clearance:

- Semantic NumberFormat modules under a new bounded `src/intl/numberformat/`
  directory (state/options contract, exact numeric representation, digit/pattern
  partitioner). Final folder/IR-compatible representation requires owner approval.
- A native binding leaf, proposed `src/codegen/intl-numberformat-native.ts`,
  and one issue-owned focused test file. Heavy logic stays in the leaves.
- A contextual integration patch naming the four existing extern/import/new/
  method sites plus namespace/callable hooks actually demonstrated necessary.
  Existing shared files are not released by listing them. compiler.ts/output.ts,
  IR, identifiers/object/closure/Proxy/realm internals remain with their owners.
- The allocated issue and a complete handoff. Generator/assets/parser changes
  are explicit dependency slices with 6717/6809 owners, not this worker's extras.

A first source-only Sol dispatch can prepare NEW `.tmp/` semantic/patch proposals
and test source in its own checkout only, under a bounded file list. It cannot
apply shared hooks, run code or take production ownership by implication. There
is no isolated two-line production fix presently justified by this evidence.

Concrete first handoff, conditional on root approving this plan and checking the
chosen paths are new in the implementer's separate checkout: own only
`.tmp/es2015-numberformat-contract-sol61.md`,
`.tmp/es2015-numberformat-native-seams-sol61.patch` and
`.tmp/es2015-numberformat-controls-sol61.ts`. The contract records the unresolved
edition/ABI/data/realm decisions with named owner requests; the unapplied patch
maps bounded leaf registration and call-site contracts without claiming an
implemented formatter; the test proposal preserves both unchanged originals and
specifies independent numeric-output and negative controls. No production leaf,
asset or shared file is owned by this preparation slice. Do not execute even
these proposal files while root's lease is occupied. Handoff gives exact paths,
full readback/hashes, dependencies and UNRUN labels. Root can dispatch this
non-overlapping preparation only after its own path/ownership check; this plan
itself does not grant that dispatch or assert that unseen paths are free.

There is currently NO releasable production slice established by this audit.
Missing handovers are: root's numbered issue/claim approval; 6717 numeric-data
and namespace boundary; 6809 canonicalization interface; numeric/core and IR
representation/registration ownership; shared extern/import/new/member and
callable/property hooks; and realm/error integration authority. An owner may
later release a smaller leaf with a stable reviewed interface. Until then,
source preparation is finite planning material, not partial API acceptance.

Ordered work: freeze edition and interface contracts; prove original route after
execution release; receive data/canonicalization and namespace/realm contracts;
implement exact numeric/pattern core; implement branded binding and object
materialization; atomically integrate routing; verify unchanged originals and
full controls; measure blast radius and publish only the finished cleared scope.
An unmet dependency is recorded with owner/evidence, never bypassed by a stub,
test-shaped branch, English-only transplant, host call, or missing-row exclusion.

## Planned controls and proof gates — ALL UNRUN

Root releases execution only after natural full-census terminal and a free heavy
slot (or separate explicit stop authority followed by actual terminal). No build,
helper/parser check or focused test may overlap the current run. Root owns all
later measurement; this plan authorizes no automated replay or process kill.

Start with unchanged-original A–candidate–A for both pinned value-tonumber files,
using maintained honest original harness, auto providers and requested strict
variants. Pin physical original/harness/assembled bytes, source/patch/compiler/
runtime/provider/data artifacts, commands, options, heaps, worker count/history,
budgets and exact expected identities. Baseline A must reproduce actual behavior;
second A restores exact saved source and artifacts in its own checkout. A changed
baseline is evidence requiring diagnosis, not permission to invent attribution.

Separately inspect diagnostic compilation/import lists of the actual selected
assembly and final Wasm imports when available. A candidate must remove every
prohibited Intl/global/unbox/import fallback and execute the original assertions.
No binary due to compilation failure means import/runtime proof unavailable.
Canonical compile-timeout ceilings and retry PASS do not prove clean first-attempt
execution. Preserve raw Vitest, JSONL, exact-manifest callback/completion and
natural process exit/close/EOF/error receipts; record actual variant accounting.

Meaningful positive/negative controls, proposed rather than executed:

- Anti-vacuity: unequal finite values must produce different expected data-derived
  parts; check exact types/values against independent pinned expectations. A
  deliberately wrong expected part must fail. Joining parts equals format, but
  that relation alone is not an oracle because both methods may share a defect.
- Numeric/coercion: the original pairs and infinities; omitted versus undefined;
  signed zero; exact rounding boundaries, magnitudes, subnormals and chosen
  precision cases; number-hint count; throwing Symbol.toPrimitive getter/call,
  noncallable hook, object-returning hook and valueOf/toString order. Test Symbol
  and edition-approved BigInt/exact-string cases without silent f64 conversion.
- Real outputs: locale/grouping/numbering-system contrasts selected from retained
  data, outside current original examples; currency/percent/unit and notation
  controls, options interactions and malformed-option negatives. Pinned reference
  engines may assist diagnosis, never execute candidate semantics or supply tables.
- Fully read unchanged supplemental originals: formatToParts/{prop-desc.js,
  default-parameter.js,this-value-not-numberformat.js},
  NumberFormat/constructor-options-throwing-getters.js,
  fraction-digit-options-read-once.js and proto-from-ctor-realm.js. Determine
  exact manifest membership separately; a supplementary control is not a new
  denominator or a claimed baseline PASS.
- Branding/order: real receiver versus primitive/plain object/prototype/fake
  fields/Object.create/proxied instance; invalid receiver rejects before a
  poisoning value is converted; direct, computed and extracted .call agree.
  Real internal slots remain valid after permitted prototype/property mutation.
- Objects/identity: fresh arrays/parts, real Array.isArray and descriptors,
  enumeration, mutations isolated between calls, real constructor/method metadata,
  cached bound format identity and changed/deleted live method properties.
  Check Intl/global identity plus lexical, nested, import and global shadows.
- Locale/options: parser-owner grammar/alias cases, proxy Has/Get ordering,
  sparse/inherited locale entries, getter exceptions and read counts, retained
  data coverage/default/negotiation, no host Intl availability dependence.
- Realms: foreign constructor prototype fallback and foreign error/Array/object
  identities, paired with same-realm positives. Missing true realm substrate is
  an explicit failing dependency; preserve all originals and no pseudo-realm alias.
- Routing: JS/TS, single/multifile, static/dynamic/alias/computed forms, host
  byte/import controls, approved WASI controls, no-Intl source, and user classes
  named Intl/NumberFormat. Old host collection cannot survive a native claim.

Then root runs the exact NumberFormat neighborhood chosen by actual touched
contracts, all frozen 74 Intl originals with complete accounting, and scoped
shared numeric/coercion, namespace/descriptor/callable, constructor/realm and
host-lane regression controls. NumberFormat is also used by some Intl harnesses;
do not treat neighboring compile improvements as proof of that API's semantics.
Required repository gates follow the real diff and owner contracts. Final
integrated verification retains all 11,778 originals; partial improvements never
close that goal. No current executed/passed/failed count is claimed for this plan.

## Handoff, readiness and remaining unknowns

The implementation issue must name its parent 6717 and exact leaf scope, owners,
prerequisites and acceptance checkboxes before production work. Handoff records
actual checkout/HEAD, complete file list, source/data/spec/ABI pins, full readback,
test registrations versus executions, raw A–candidate–A evidence, retained
negatives/regressions, imports and package/bundle measurements. Do not change the
completed data-only PR into a runtime claim or duplicate an existing owner.

Still unknown: actual assembled/emitted first route beyond the source-supported
import match; current namespace/kernel merge readiness; complete numeric-helper
reuse limits; exact new formatter data files/size; approved semantic edition and
optional behavior; representation and IR registration contract; runtime cost;
true realm availability; exclusive production ownership; all new test outcomes.
These are concrete prerequisites, not reasons to relax scope or claim success.

Future PR readiness requires reviewed integration, actual standalone execution,
meaningful positive/negative proof, no forbidden imports, complete scoped/blast
accounting and normal repository gates. A clean compile, a vanished leak, or two
self-equivalence passes alone is insufficient. Every remaining API/realm/data
limit stays tracked; no full Intl claim accompanies a partial slice. Commits,
when later authorized, use Thomas Tränkler as author, Codex co-author and actual
model/effort attribution. No commit, claim, publication or implementation exists
from this planning task. Full 11,778/74-Intl completion remains open.
