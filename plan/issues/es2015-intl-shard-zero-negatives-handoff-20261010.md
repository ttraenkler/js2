# ES2015 Intl shard-zero negative evidence handoff

Root source/evidence custody, 2026-10-10. Not an Astra implementation plan,
numeric allocation, source claim, completed fix, or publication. Existing
Intl/realm owners retain their boundaries. A requested Astra follow-up returned
`agent thread limit reached`; no successful planner dispatch is claimed.

Subsequent current inventory no longer contained that previous Astra planner.
Root interrupted the stale pending-initialization helper (no running test or
worker terminated), then successfully spawned NEW Astra High
`/root/es2015_intl_descriptor_plan_astra` for the narrow descriptor task only.
It owns a separate implementation-plan MD, not this frozen evidence handoff.
The initial failed follow-up remains a failed dispatch, not a resumed task.

## Authoritative completed shard, incomplete full run

Frozen execution HEAD: `38901fff8f9a5ca029cbefcdaec5d8dd40949861`.
Source digest: `a6464ffb87f98d4984d2454a14bc95bd80c035c88e7905bd1465b484537738c8`.
Execution checkout: `/Users/thomas/Code/js2/.codex-worktrees/6878-delete-result-boolean-sol61`.
Run ID: `es2015-fresh-integrated-20261010-1791586165174`.
Canonical JSONL lives in that checkout's `benchmarks/results` with the
`test262-standalone-results-` prefix and this run ID.

Shard zero naturally terminated with exit/close 1, no signal; both streams
EOF/closed and no stream errors. Root inspected the actual terminal and
readback receipts in `.tmp/<run-id>/shard-0.{terminal,readback}.json`.
There are 736 registrations and 736 canonical original verdicts. Raw Vitest
SHA-256: `c5c5307d42d4028a078dcc851b3b53b83fbd93336277a2817e4e21ceb1229f68`.
Shard completion SHA-256:
`ccb32c9552e8a4803c42ecc717da24e2a3f1fe2e375c27ff819e0144027be1f7`.
Counts: 716 PASS, 13 FAIL, one compile_error, six compile_timeout; zero skip.
The observer subsequently emitted `settled-not-final` for shard zero. Its
process was confirmed live; the full 16-shard run is NOT complete and has not
released the root's sole heavy execution lease. Actual variant calls remain
UNKNOWN. No pass rate, regression attribution, or goal completion is claimed.

## Four unchanged originals, fully read by root

All four canonical rows: standalone, honest oracle 14, semantic providers auto,
strict both, reached_test true. This does not prove both variants or every
assertion executed. Similar error signatures do not prove a common cause.

- `test/intl402/DateTimeFormat/prototype/formatRangeToParts/builtin.js`:
  FAIL, nullish property access at assembled 360:28, compile_ms 7692,
  exec_ms 184. Original SHA-256
  `f017b5af04a18e7e00d7f31aa68efe6e3a8a2b259f290d82d2d7815f8de82618`.
  Retrieves the prototype method and verifies function tag, extensibility,
  Function.prototype, absent own prototype, and nonconstructibility. Do not
  credit any later assertion from the row's reached_test flag.
- `test/intl402/DisplayNames/proto-from-ctor-realm.js`: FAIL, nullish access
  362:44, compile_ms 5443, exec_ms 82. SHA-256
  `792ce4f050c7001a4029db0da9bfc9464f6abe8cfd87bd965872e4ab15b64c14`.
  Foreign Function NewTarget has null prototype; actual result prototype must
  be that foreign realm's DisplayNames.prototype. Same-global aliases cannot
  establish authentic foreign-realm behavior.
- `test/intl402/ListFormat/prototype/toStringTag/toStringTag.js`: FAIL,
  Symbol.toStringTag missing as own property, compile_ms 6118, exec_ms 47.
  SHA-256 `80e3e38b28df5d12de6464ac2fe0c97f3dda72f932d5564b088013535bff07e4`.
  verifyProperty requires value Intl.ListFormat and false writable/enumerable,
  true configurable. A hard-coded Object.prototype.toString answer does not
  repair the descriptor.
- `test/intl402/PluralRules/prototype/toStringTag/toString-changed-tag.js`:
  FAIL, nullish access 346:23, compile_ms 2981, exec_ms 42. SHA-256
  `579361ef5e001434d142cacd675f779a7d7484a504e4dbe7a04bf10b2880c5e8`.
  Redefines prototype tag then checks both prototype and constructed instance.

## Source facts and ownership checks still required

Current `src/intl-listformat-prelude.ts` exists and is wired from compiler.ts;
`src/codegen/extern-declarations.ts` gates host ListFormat registrations away
from standalone/WASI. Existing issue 6839 documents its deliberately bounded
English prelude and missing other namespace spellings. This is not proof that
the current failing descriptor route is selected or that its tag is omitted.
Inspect the assembled original and actual descriptor producer before a fix.

Root subsequently fully read `src/intl-listformat-prelude.ts`, SHA-256
`da09f7316608d57639d008372026079159f115c94962db16786ae844eb585c28`.
The complete emitted class/template has no Symbol.toStringTag declaration
or descriptor initialization. This is a concrete source gap, not proof of the
selected runtime route. Astra is examining a general own-prototype descriptor
repair and its descriptor/prototype lowering constraints, while preserving
all global-shadowing and host-route boundaries. No production edit occurred.

Existing issue 6717 is in-progress with a bounded data-foundation claim, NOT a
blanket runtime Intl implementation claim. Its status boundary distinguishes
host global issue 5206 and Temporal-provider-only issue 6442. Root read that
boundary. `src/standalone-intl-datetimeformat.ts` contains a refusing
formatRangeToParts body, but its existence does not establish that the tested
user-visible method selected this provider-local route. Do not copy it into
the user global or turn a refusal into a fake successful method.

The foreign-realm consumer must coordinate issue 4274 and constructor owners;
compiler.ts/output.ts/6651/6766 ownership is not handed over. Current remote
claims and upstream source still require the normal pre-dispatch check.

## Next release gates

Resume Astra planning when agent capacity is available. Pin actual assembled
source and first divergent carrier/prototype/descriptor operation; give each
released non-overlapping leaf a Sol 6.1 worker in its own worktree. No semantic
ownership may be inferred from these source notes. Only after natural full-run
terminal and root release: unchanged-original A–candidate–A, meaningful
positive/negative descriptor and realm controls, canonical receipts, scoped
blast-radius verification and required repository gates. Track implementation
and handoff in the allocated issue; publish a finished mergeable fix upstream.
No source rewrite, harness substitution, exclusions, host fallback or timeout
expansion is authorized. Preserve all 11,778 originals including all 74 Intl.

## 2026-10-10 completed second-shard Intl negatives

Root fully read each unchanged original below. Same frozen epoch38901fff,
honest14auto standard official standalone strictboth; each FAIL/reachedtrue.
Similar nullish error text is not a causal bucket; initial source/provider
availability, live descriptors, prototype carriers and foreign realm remain
separate obligations. All74Intl remain in the11778manifest, including later
feature names; no edition-based exclusion is made here.

- Collator/proto-from-ctor-realm.js:04:07:32, compile4466exec111,
  nullish360:46, SHA49c593c9331fa1ddb8f79489ac8ceaa8260327a33bd849d2ac2b9a78d4dd49ac.
  Foreign Function NewTarget with undefined/null/Boolean/string/Symbol/number
  prototype must allocate using foreign Collator intrinsic prototype. Which
  assertion/property access stopped is UNKNOWN; coordinate4274/constructor
  owners and Intl implementation owner, not current-global aliasing.
- DateTimeFormat/prototype/toStringTag/toString.js:04:07:35,
  compile1960exec29,nullish346:49,
  SHA821e3a056e89a6cd68d48845f0338c6a11dac4d85ecd06fdaf956972609d4137.
  Generic Object.prototype.toString checks prototype and constructed instance.
- DurationFormat/prototype/toStringTag/toString.js:04:07:36,
  compile1569exec26,nullish339:49,
  SHAb17ab8d892d71a5af23afd99c4fe3a74fc3570fd95e4808841c347b8a204d3f1.
  Same two required tags on its own distinct API; retain original feature.
- Locale/prototype/toStringTag/toString-removed-tag.js:04:07:38,
  compile1424exec22,nullish338:8,
  SHA33681bfc96c32b0dd65e0c97da9327ab2e7b8a0bb9ab6df70b8eae89b8259c1a.
  Delete prototype tag, then prototype/new Locale('en') must fall back to
  Object; no permanently hardcoded Intl.Locale classifier answer.
- RelativeTimeFormat/prototype/toStringTag/toStringTag.js:04:07:42,
  compile3768exec33,nullish851:16,
  SHA6f1ed0a886307756563bde8502ec7e5cce93763957298754a413098689ce8af7.
  Actual propertyHelper verifies own value Intl.RelativeTimeFormat with
  writablefalse/enumerablefalse/configurabletrue; no dummy descriptor.

Later assertions, callback counts and actual both-variant calls remain
UNKNOWN for these failing rows. Existing6717/6839/ListFormat scratch boundaries
do not release production ownership for these five APIs; compiler/IR contracts
remain owned. No production source/harness/runner/claim/Git/PR mutation.

Second shard naturally closed exit=close1,signalnull,EOF/closed/errorfree.
736registered736canonical unique:721PASS15FAIL,zero skip/exclusions,
736callbacksstarted/settled. RawVitest agrees721P15F736; one retriedPASS
retained, not retry-free proof. CompletionSHA
948dd93b793e045e5a5cee72bd932d35c54cbcceeab5676d81e3d65d97361c1c,
rawSHA22e11b3d6017476d1d0b358c461ed561f154d8e14f70271583988a48c74468b7.
Aggregate1472/11778:1437PASS28FAIL1CE6timeouts,10306unsettled,zeroaccounting
problems. Full census still unfinished; no whole-suite acceptance or readiness.

## 2026-10-10 third-shard Intl negatives and natural terminal

Root fully read all five unchanged originals below in the same frozen epoch.
All use official standard standalone honest14auto, strictboth; actual variant
calls and later assertions remain UNKNOWN. Preserve all74Intl/11778originals.

- DateTimeFormat/prototype/formatRange/builtin.js:05:33:52, FAIL,
  nullish360:21, compile4640exec244,reachedtrue. SHA256
  d78917ac0d4a5c96391696cd03e9c78cff9d96eb0ed7d5401bea71da9e2bc383.
  Retrieves formatRange and checks Function tag/extensibility/prototype,
  absent own prototype and nonconstructibility. Actual first failing access
  and selected provider remain unknown; no later metadata assertion credited.
- DisplayNames/options-localeMatcher-toString-abrupt-throws.js:05:33:55,
  FAIL, expected Test262Error from toString but no exception,
  compile2196exec39,reachedtrue. SHA256
  ff251c3f3475be31399bbb81c44bf4a70158e334c71d9f760f9a391187f89cee.
  GetOption/ToString must propagate abrupt conversion. Later valueOf,
  Symbol.toPrimitive and Symbol TypeError controls are masked. Diagnose
  coercion order/error identity separately from absent prototype descriptors.
- Intl/toStringTag/toString.js:05:33:57, FAIL,[object Null] vs [object Intl],
  compile1471exec27,reachedtrue. SHA256
  cc51dcbac25c6704f38aa6262e01f812c101f84d55b05acaaf09cb5addb887c0.
  First namespace toString is wrong; namespace carrier/tag/receiver selection
  remain separate unknowns. Later generic call, tag replacement and deletion
  fallback are masked. Do not hardcode a namespace string.
- NumberFormat/prototype/formatToParts/value-tonumber.js:05:33:58,
  compile_error,compile1308,reachedfalse. SHA256
  ec2d2f5eb7d46b32eeb69ce2ea8eaf22a6e71545bd80b33dbd8fff6af8b428fe.
  Forbidden env::Intl_NumberFormat_formatToParts and
  env::Intl_NumberFormat_new imports, enforcement2961. No runtime assertion
  measured: undefined/NaN/null/Boolean/string parts equivalence, number-hint
  Symbol.toPrimitive exactly once, and Symbol TypeError all remain untested.
  Repair a genuine zero-host-import provider, never relax its allowlist.
- Segmenter/prototype/Symbol.toStringTag.js:05:34:01,FAIL,nullish848:16,
  compile2861exec27,reachedtrue. SHA256
  491fbda74c7c734af5b67649279260415b53100de6ad80a84ccf1028997015fa.
  verifyProperty requires Intl.Segmenter own prototype tag, writablefalse,
  enumerablefalse/configurabletrue. Provider/carrier/access cause unknown;
  no fabricated descriptor or helper bypass.

Implementation handoff: pin assembled original and first divergent producer;
coordinate existing6717/6839/6809 and shared6651/6766 owners before claims.
Descriptor, namespace, coercion, realm and host-import failures are not one
proven bucket. Astra plan precedes released Sol6.1 worktree implementation;
unchanged-original A/candidate/A and scoped controls/gates await root heavy
lease release. No source, harness, manifest, runner, claim or PR changes here.

Third shard PID13477 naturally ended2026-10-10T03:34:04.408Z:
exit=close1,signalnull,both streams EOF/closed,errors empty,complete true.
737 registered unique paths reconcile exactly with737 canonical unique rows,
all in pinned manifest,zero missing/exclusions. Counts722PASS13FAIL2CE,
zero timeouts/skips;737callbacksstarted/settled,allCallbacksSettledtrue.
Raw Vitest737total722passed15failed0pending0todo agrees with canonical;
successfalse honestly retained. Completion SHA256
8ccca6ab9082f29dcd806c04923b7e5755e70af0cfe3e608db7c6819b86260ac;
raw SHA2568db87c3c1dee713ed2a9b20fe2a02b78c48c93b4d4e4394a9e87ec3332b6fa86.
At third close aggregate2209/11778:2159PASS41FAIL3CE6timeouts,
9569unsettled,50canonicalnonpasses. Native observer62071 then confirmed
fourth shard(index3) running PID21569. Whole census remains unfinished and
heavy lease occupied; no full-suite acceptance/readiness/completion claimed.

## NumberFormat import-route planning handoff, not a released implementation

Root attempted NEW AstraHigh NumberFormat planner dispatch, then follow-up to
the completed Astra close-receipt planner; BOTH returned agent thread limit
reached. No successful planner start or implementation plan is claimed.
The interrupted cache-regression agent had only pending_init status; no test,
compiler worker or live census process was stopped. Existing Sol and shepherd
remain the active workers. Resume Astra planning only when capacity permits.

Source-only route evidence from frozen38901fff execution checkout:

- Full unchanged formatToParts/value-tonumber.js body read again; SHA256
  ec2d2f5eb7d46b32eeb69ce2ea8eaf22a6e71545bd80b33dbd8fff6af8b428fe.
  It explicitly requires ToNumber and the number hint, not merely equivalent
  parts for a handpicked value. Coercion once and Symbol TypeError are required.
- src/codegen/extern-declarations.ts:300-313 unconditionally registers
  NumberFormat with importPrefix Intl_NumberFormat, namespacePath Intl,
  constructor externref arguments and format/formatToParts/resolvedOptions.
  SHA2567414ddde779bddeaef906985a93d7f0a819440dbeddc53af40dd67c5cbe019c6.
  Neighboring ListFormat is explicitly gated away from none/wasi; NumberFormat
  has no corresponding gate. Source comments also acknowledge this older leak.
- Selected new-super.ts:8261 and8419-8426 extern-constructor arm retrieves
  the class entry and emits its prefix_new call. SHA256
  cd2870b7016cd0b9e1009ba69f991526b36aec990b6831195963c9f4d92d07c6.
- Selected expressions/extern.ts:223-254 resolves the typed method owner and
  prefix_method import, then compiles receiver/arguments. SHA256
  a152afdc5a872ad78516326bf4db98c3e7c6862babfdb4adb68fce2836c7ad96.
- Full new-intl-host-bridge.ts read, SHA256
  2322927bb98df2c52a2a790a73e2a9a7a5f2a1eed227c58c0420bcefb3c9a2d9.
  Its sole host-only constructor refusal is DateTimeFormat; NumberFormat is
  explicitly absent. Adding it to a refusal set would merely replace CE with
  runtime FAIL, not move toward the requested passing semantics.
- Selected compiler.ts Intl wiring only showed ListFormat prelude calls at
  1754/2015, SHA256
  26a7fc2058ea452553088e77e2e1033118cd2aab2da1699f920a800a4d284f71.
  This scoped search is not proof that every possible provider route is absent.

The current original's two forbidden import names match these source arms,
but no new assembled-original compilation or runtime route attribution ran.
Existing6717 already records BOTH NumberFormat format/value-tonumber and
formatToParts/value-tonumber leaks in its older74original census. This is
fresh persistence evidence, not a newly invented defect or conformance gain.
Its active claim supplies locale-data generation only and deliberately omits
formatter pattern data; the numeric-to-string IR native number formatter is
not evidence of an Intl.NumberFormat implementation. No IR files were edited.

Next Astra plan must map namespace/locale-data/NumberFormat formatter/parts/
ToNumber/branding/error/realm prerequisites, identify actually released file
ownership and supply meaningful positive/negative unchanged-original controls.
Do not transplant ListFormat's English-only scope into a general Intl promise;
no host fallback, dummy parts, test-specific value branches, import allowlist
relaxation or manifest exclusion. Source integration involving compiler.ts,
output.ts/6651/6766 remains held pending explicit owner coordination. Sol6.1
implementation, A/candidate/A execution and normal PR gates follow a reviewed
Astra plan and natural release of root's sole heavy lease, not these notes.

Several initial searches named nonexistent/glob-unmatched guessed paths and
failed; corrected searches/readbacks above are the actual evidence. No failed
search is treated as proof of absence. No production/runner/harness/claim/Git/PR
mutation, test execution or semantic implementation occurred in this handoff.

## Successful Astra delivery and bounded Sol preparation dispatch

After actual Sol/shepherd completion freed capacity, existing AstraHigh planner
resume succeeded. It delivered428line NumberFormatplan at
plan/issues/es2015-numberformat-parts-host-import-plan-astra-20261010.md,
SHA256ce6f3a2fc0078e2d010f760b3e2c211fe02489193a9ecc560840e5fc7b7334fe.
Root fully read all428lines/rehashed. This supersedes failed dispatch attempts,
not their historical truth. Plan does NOTrelease any production slice.

Additional source prerequisite: existing emitToNumber converts i64BigInt to
f64 and has target-dependent externref handling; modern mathematical-value
semantics and the unchanged historical ToNumber originals need an explicit
edition contract. Missing Intl namespace/native formatter/locale numeric pattern
data/brands/realm and shared routing remain separate prerequisite ownership.

Root checked all three proposed paths absent in Sol's isolated carrier checkout
/Users/thomas/.codex/worktrees/6878-boolean-property-carrier-sol61/js2,
branchcodex/6878-boolean-property-carrier-sol61. Reused Sol6.1High
/root/es2015_job_phase_seams_sol61 for finite source preparation ONLY:

- .tmp/es2015-numberformat-contract-sol61.md, also owns preparation handoff;
- .tmp/es2015-numberformat-native-seams-sol61.patch, UNAPPLIED mapping;
- .tmp/es2015-numberformat-controls-sol61.ts, independent control source.

No other files are assigned; all peer/carrier/diagnostic changes preserved.
No production/helper/shared/IR/parser/asset claim, numeric issue allocation,
execution, Git/network mutation, integration, ready PR or publication authorized
by this dispatch. Existing6717/6809/6651/6766/realm handovers remain unresolved.
No placeholder formatter or supposedly runnable native hook to an absent leaf;
interface-dependent seam proposals must state nonapplicable/nonexecuted limits.
All planned controls remain UNRUN; wrong-answer negative and independent outputs
must prevent the two original equivalence tests admitting dummy parts.

Root SAME62071 confirmed fourthshardPID21569running, frozen38901fff unchanged.
Sole heavy lease remains occupied. Source preparation is tracked here and in the
reviewed Astra plan, not a completed NumberFormat fix or reduced global target.

## Frozen Sol NumberFormat proposal received and reviewed

Root received Sol6.1High's final delivery and completely read the contract,
control proposal and separate seam map. Three owned outputs in the isolated
carrier checkout named above are frozen:

- `.tmp/es2015-numberformat-contract-sol61.md`: 243 lines, SHA256
  `33db3cdaba38f8f38828d7974742f583031f1878ad9223fa640d84f1d62b1ce0`.
- `.tmp/es2015-numberformat-native-seams-sol61.patch`: 138 lines, SHA256
  `52fdc33b601ee8a74e1734112dc865acba8408b83a4cf2bf4655f33986751f0c`.
- `.tmp/es2015-numberformat-controls-sol61.ts`: 259 lines, SHA256
  `58f97a1fb23f6600eccc27eee7c38b5efb94fa223f2f4c60b798a843b8920a83`.

The seam map is explicitly NON-APPLICABLE, not a unified diff. It cannot be
applied as a fix. The 28 source registrations comprise three unchanged-original
references, 19 snippets (18 intended assertion-pass and one wrong-expected
runtime assertion-failure), and six deferred artifact-review requirements.
All are UNRUN; registration counts are not passing tests. Two unequal finite
outputs have independent expected parts; their negative changes only an expected
integer, and must actually reach and fail a runtime assertion later. No dummy
formatter, host fallback, import-only suppression or production edits exist.

Edition, numeric representation, data provenance/payload, namespace/private
state, shared routing/IR/resource ABI, realm and author handovers remain open.
Next implementation requires actual owner contracts and a genuine native leaf;
next execution requires root's natural census terminal and explicit lease release.
Sol stood down after delivery. No PR readiness or conformance gain is claimed.

Current authoritative observation: SAME native62071 remains LIVE, fourth shard
PID21569. Canonical data-only read records 2644/11778 unique originals: 2594 PASS,
41 FAIL, 3 compile errors, 6 compile timeouts; 9134 unsettled, no new nonpasses
beyond the 50 already tracked and no accounting problems. Last row is PASS for
TypedArrayConstructors/ctors/object-arg/iterated-array-with-modified-array-iterator.js
at 2026-10-10 06:17:45 local. This is partial evidence, not final acceptance.

## Fourth-shard five further Intl originals — canonical nonpasses53–57

Root fully read and hashed all five unchanged originals below in frozen EXEC
38901fff. Each is honest oracle14/auto providers, official standard standalone,
strictboth, FAIL with reached_test true. Metadata/features remain included in
the frozen11778/all74Intl denominator. First errors locate stopping behavior,
not a proven shared defect or repaired downstream semantics.

### DateTimeFormat formatRange primitive receivers

`test/intl402/DateTimeFormat/prototype/formatRange/this-is-not-object-throws.js`
SHA256 `625a0accbaedfccef6e994311cb4befbeddb91c191c1e141e88bc3dcc711cf6c`.
06:53:33 local, compile2802ms/execute38ms, nullish access339:19.
Source retrieves prototype.formatRange, constructs two dates and requires
TypeError for undefined/null/number/string/false/true/Symbol receivers. Retrieval,
Date preparation and exact reached assertion are not distinguished by this row.
After namespace/method/brand owner handover, inspect actual carrier and compiled
route; check all primitive receivers, brand-before-date-coercion ordering,
callable positive instances, errors and ordinary live property semantics.
An absent method throwing at lookup cannot satisfy the intended receiver checks.

### DisplayNames style abrupt conversion

`test/intl402/DisplayNames/options-style-toString-abrupt-throws.js`
SHA256 `5bbaf5065ac905d7f8d8643414ca0b5b8b2cc2f2132e6a864944f5ce8ab0723c`.
06:53:38 local, compile4754ms/execute67ms, first toString control expected
Test262Error but observed no exception. Later valueOf fallback, Symbol.toPrimitive
and primitive Symbol TypeError requirements are masked. Distinct from the earlier
localeMatcher original; do not assume repairing one option fixes the other.
Owner implementation must preserve actual GetOption order/ToString abrupt object
identity and options state, with positive conversion/count controls and both
unchanged originals. No host substitution or skipped option admission.

### Intl namespace own tag descriptor

`test/intl402/Intl/toStringTag/toStringTag.js`
SHA256 `4277f0e30bffe6d8973bc7e047be882889a349dd193900a22959c436cd7e4188`.
06:53:44 local, compile5321ms/execute133ms, Cannot convert undefined or null
to object. Source verifies Intl's own Symbol.toStringTag value Intl, writablefalse,
enumerablefalse, configurabletrue. Actual namespace/helper receiver route and
descriptor visibility are not yet attributed. Coordinate namespace carrier and
normal own-property storage with the prior toString/mutation original; prove
bare/global/alias/computed identity, descriptor flags and allowed tag mutation.
Do not patch propertyHelper or manufacture success from missing descriptors.

### PluralRules foreign-newTarget fallback prototype

`test/intl402/PluralRules/proto-from-ctor-realm.js`
SHA256 `525df8b324069369597e2566aa67cad9eadc30687a3f1ae01df5c48f83a7c384`.
06:53:50 local, compile4622ms/execute196ms, nullish access359:45.
Source creates foreign Function newTarget, sets six primitive prototype values
and requires Reflect.construct current PluralRules instances to inherit the
foreign intrinsic PluralRules.prototype. Constructor/intrinsic availability,
GetFunctionRealm route and exact ordinal are unknown. Coordinate4274/namespace/
constructor owners; discriminate these with genuine distinct realms, normal
object-prototype positive newTarget and each unchanged primitive case. Aliased
realms or hardcoded prototype identities cannot certify this requirement.

### Segmenter prototype tag descriptor second original

`test/intl402/Segmenter/prototype/toStringTag/toStringTag.js`
SHA256 `ebb55abfe5a593d8783853f5cd7cd31caf66e3bc7ed0decc0888190b09ce8335`.
06:53:54 local, compile3299ms/execute82ms, nullish access851:16.
Source independently verifies prototype Symbol.toStringTag value Intl.Segmenter,
writablefalse/enumerablefalse/configurabletrue. Retain it separately from the
earlier prototype/Symbol.toStringTag.js original despite analogous requirements.
Actual constructor/prototype/propertyHelper route remains unattributed; owner
must implement live ordinary descriptors and mutation/fallback checks, not
special-case the original path or erase newer metadata from the denominator.

Root SAME62071 confirmed LIVE fourthshardPID21569. At2945unique originals:
2888PASS48FAIL3CE6timeouts8833unsettled, no accounting problems. All57observed
nonpasses now tracked. Natural full-census terminal is still absent; sole heavy
lease stays occupied. Production/IR/runner/harness/original/provider/oracle/Git/
claim/PR state unchanged; all proposed implementation/control executions UNRUN.

## Fourth shard naturally terminal — root reconciliation

Root independently parsed completion/raw/canonical/original manifest and before/
after epoch records for shard index3 (fourth of16). Registered736unique paths
equal736unique canonical rows and736unique raw assertion titles; no missing
canonical/raw path or outside-manifest path. Counts agree:729PASS7FAIL,
0compileerror/timeout/skip/pending/todo/exclusions. Started736callbacks and
settled736, allCallbacksSettledtrue. All seven nonpasses are the two Function
originals tracked in4274/6775 and the five Intl originals immediately above.

Concrete childPID21569 naturally ended2026-10-10T04:53:55.692Z after starting
03:35:37.827Z. Both exit/close status1 signalnull, complete true, no process
errors; stdout/stderr EOF and closed true with no stream errors. Root read both
stream bytes and independently verified receipt size/hash matches:
stdout112281bytes SHA992332780349f42c6b96d9904ae755d2fc4dd2b87dcf2743f1a09a88d4c1e6aa;
stderr4723bytes SHA4a30cdea446a28906b669ea01232e34595a8f87e2e6c0e2c9c75427a1866882a.

Completion file shard-4-of-16.complete.json57188bytes pinnedSHA
4d5ba253cfa29d52cf0ee8644f1b1d1698bea02d8a9501244710b486349f8b31;
raw shard-3.vitest.json242401bytes pinnedSHA
5221c2fca0941e756e28706aae08f8658dba6687e4292908ae5879a0a9bfa007.
The raw summary's numTotalTestSuites48 is not the736 original denominator;
actual raw assertion collection and original membership were checked directly.
Before/after complete epoch objects equal, HEAD38901fff/source1902files digest
a6464ffb87f98d4984d2454a14bc95bd80c035c88e7905bd1465b484537738c8.
Readback announces QuickJS95333826e7c8/adapter45807795114005bc/defaultengine4242;
timeoutEvents empty, realm-canary recycle announced, actualVariantCalls UNKNOWN.

This proves only this naturally terminal shard, not the whole suite or every
variant call. Aggregate2945originals2888PASS48FAIL3CE6timeouts8833unsettled.
Root SAME62071 then confirmed FIFTH shard index4 LIVE concretePID36154.
Do not release the heavy lease, alter frozen source/base/draft6548 or restart
the observer at the per-shard boundary. Full11778/all74Intl acceptance remains
unachieved with57known nonpasses. No heavy/source/Git/PR mutation occurred.

## Fifth-shard final four Intl negatives, 2026-10-10

Frozen38901fff honest14/auto standard official standalone strictboth;
root fully read all unchanged originals. Canonical nonpasses65–68:

- DateTimeFormat/prototype/formatToParts/this-is-not-object-throws.js,
  SHA f40c369c1b8048539c029549059ab5aa5edb814043ae62e902d9f0ec0124e2e7,
  FAIL07:53:40local compile1614/exec26ms, reachedtrue; nullish332:21.
  Original retrieves method then requires TypeError for seven primitive
  receivers. Lookup vs receiver ordinal is UNKNOWN; do not credit brand
  checking merely because an earlier property lookup throws TypeError.
- DisplayNames/prototype/resolvedOptions/this-not-object-throws.js,
  SHA b36d32c1791e53279d3ca40f550727331d8a056da42fc14ffbb334d661228bed,
  FAIL07:53:42local compile1463/exec58ms, reachedtrue; nullish341:23.
  Original retrieves method and checks direct call plus string, number,
  null, booleans and Symbol. Actual stopping operation remains UNKNOWN;
  method availability, direct callable route and brand/realm TypeError
  identity need separate controls, not generic nullish failure acceptance.
- Locale/prototype/getWeekInfo/firstDay-by-id.js,
  SHA85d774a8f38c91516ba37cefd71cae6e01cfe7ebafaf1af6cb88781fc4f4445c,
  FAIL07:53:44local compile2043/exec16ms, reachedtrue; Cannot read properties
  of undefined(reading getWeekInfo). Seven en-u-fw-mon..sun locale tags must
  produce firstDay1..7. No iteration is proven passed. Distinguish constructor
  result/carrier, method lookup and Unicode fw override semantics. Preserve
  pinned locale-data provenance, method result records and mutable namespace;
  do not constant-fold tag spellings or borrow host Intl to erase native gap.
- PluralRules/prototype/toStringTag/toStringTag.js,
  SHA2d55515fa8d034b85ee4c6fb7dc0fae88f72829453ffe54e2099c4836da5f1c6,
  FAIL07:53:47local compile2589/exec28ms, reachedtrue; nullish851:16.
  verifyProperty requires Intl.PluralRules value and writable/enumerable false,
  configurable true on the actual prototype Symbol.toStringTag. Constructor,
  prototype, symbol identity and descriptor route must be distinguished;
  earlier changed-tag stringification negative is not this descriptor test.

Paths above are under test/intl402/. Later metadata/date does not exclude
these manifest originals; all74Intl remain in the11778 acceptance denominator.
After current Intl/namespace/locale-data owner handovers and root execution
release, establish actual lookup/carrier routes with callable, descriptor and
constructor controls; implement full intended native semantics and compare
unchanged originals and adjacent same-epoch regressions. The source-only
NumberFormat packet and locale parser PR do not prove these APIs implemented.
No test rewrite, provider/harness substitution, skip or fabricated prototype.

At3681/11778:3613PASS58FAIL4CE6timeouts8097unsettled, problems[].
SAME62071 still explicitly reportsLIVE shard4PID36154, no terminal receipt
yet; complete row count alone does not close child/process/streams. No source,
Git, claim, PR-ready or competing execution change occurred.

## Fifth-shard natural terminal independently reconciled, 2026-10-10

Root SAME62071 emitted settled-not-final shard4 cumulative3681 exit1, then
explicitly confirmed SIXTH shard index5 LIVE PID47243. The whole sixteen-shard
run and its heavy lease remain active; no source/base/readiness change allowed.

Fifth shard has736registered unique paths,736canonical unique rows and736raw
unique assertion titles, no missing paths, zero exclusions/pending/todo.
Counts reconcile:725PASS10FAIL1CE0timeout; raw725passed11failed successfalse.
All736callbacks started and settled; allCallbacksSettledtrue. Eleven nonpasses
are the tracked dynamic-eval alias, generator iterator realm, TA subclass,
with CE, SyntaxError realm, GeneratorFunction realm, global restricted lexical
declaration and four Intl originals above. No negative is omitted or relabelled.

Child36154 naturally started2026-10-10T04:55:45.550Z and ended05:53:48.585Z;
exit/close1 signalnull, complete true, processerrors[], both streams EOF/closed
true with errors[]. Root independently read/rehashed all four pinned files:

- Completion shard-5-of-16.complete.json57276bytes SHA
  5baf9f91df360662f5b1e60a292b3d26860647568a0ebad332af01f11a71a42a.
- Raw shard-4.vitest.json246611bytes SHA
  c0a4c1b48f1c40403895b96d0d604f73b516b5ae6e959699cd528ea4a3aa32b4.
- stdout113601bytes SHA
  e910ebae3aa8e5a65412c9af890b2d1d68d5b2d5716bfed88e0d0f8f6fb23c48.
- stderr7904bytes SHA
  9f9d4be20e9f8a14d61c6cf4354a2522b5dcccbf5c7e9014a1ab2ae6fc0549ff.

Complete before/after epoch objects equal. Readback announces maintained
QuickJS95333826e7c8/adapter45807795114005bc/default4242; timeoutEvents[],
actualVariantCallsUNKNOWN. One overly broad data print was truncated; the
subsequent compact independent reconciliation fully returned all accounting,
terminal, equality and byte/hash checks used here. No truncated output is
treated as a completed review of every source/dependency entry.

Aggregate at transition3681/11778:3613PASS58FAIL4CE6timeouts8097unsettled,
68known nonpasses. This proves fifth-shard accounting/natural terminal only,
not whole-suite completion, every variant call or100% acceptance. No restart,
signal, competing compiler/test/build/helper, source, Git or PR mutation occurred.

## 2026-10-10 sixth-shard Intl negatives76–80

Root fully read and hashed all five unchanged originals under test/intl402/.
Frozen38901fff/sourcea6464ffb honest14/auto standard official standalone
strictboth records all five FAIL with reached_test true. Actual variant calls
and masked assertions remain unknown; none is a verified implementation.

- Collator/prototype/toStringTag/toString-changed-tag.js, SHA
  94a04600e7a5570c011d20149af9536c2ecb39956721b6940e18eb0d5f41fe58,
  08:51:02 local compile1196/exec9ms; nullish346:23. Redefines prototype
  Symbol.toStringTag to test262, then requires prototype and instance strings
  [object test262]. Exact stopping lookup/define/call is not established.
- DateTimeFormat/prototype/toStringTag/toStringTag.js, SHA
  6c2cbf7c0b2f94a12fa1e8472b4ec19ab8e54109c1249c8ef30f06fd3839706d,
  08:51:04 compile1977/exec16ms; nullish851:16. verifyProperty requires value
  Intl.DateTimeFormat, writable/enumerable false and configurable true.
- DurationFormat/prototype/toStringTag/toStringTag.js, SHA
  e08f0e71bad0f484fa3136add3e755f9fd318992da751f0c3411c6462542d04a,
  08:51:06 compile2216/exec24ms; nullish853:16. Same descriptor obligations
  with actual Intl.DurationFormat value, not proof of duration formatting.
- Locale/prototype/toStringTag/toString.js, SHA
  5d9ff5b61cf8b4de0bcd462d733ac1041888c7befe4bc47b1a842fc3f6d7ae72,
  08:51:07 compile1051/exec13ms; nullish338:49. Requires prototype and new
  Intl.Locale(en) Object.prototype.toString results [object Intl.Locale].
- Segmenter/constructor/constructor/options-granularity-toString-abrupt-throws.js,
  SHA11b345aef1a3e0c88a21505971ca33de128066b58262da006e0a480978a6293a,
  08:51:08 compile1082/exec34ms; first from-toString Test262Error is missing.
  Later valueOf fallback, Symbol.toPrimitive abrupt and Symbol TypeError
  are masked. Requires actual GetOption conversion ordering/error propagation.

Route through existing Intl/namespace/prototype/data owner contracts. After
root execution release, distinguish absent constructor/prototype, Symbol-key
identity, descriptor operations, live inherited tags, instance brand/carrier
and dynamic conversion; do not infer one cause from shared nullish text.
Controls include actual prototype descriptors, valid construction, changed/
deleted tag on prototype and instance, primitive/nonstring tag fallback,
Segmenter getter/conversion order and throws, positive granularity values and
symbols. Native semantics, unchanged originals, same-epoch attribution and
neighbors required; locale parser/NumberFormat packets are not implementation
of these APIs. No harness/provider substitution, stubs, exclusion or metadata
date-based omission: all74Intl remain in11778.

SAME62071 emitted settled-not-final shard5 cumulative4417 exit1. Aggregate
4337PASS69FAIL5CE6compile_timeout,7361unsettled, problems[]. Eighty known
nonpasses tracked; whole-census completion false. Terminal/epoch/stream/raw
reconciliation is pending separately, not inferred from row count or this
observer event. No source/original/provider/runner/Git/PR change or execution.

## Sixth-shard natural terminal independently reconciled

Root verified736registered unique originals =736canonical unique rows
=736raw unique assertion titles, missing[], exclusions/pending/todo0;
all736callbacks started/settled. Canonical724PASS11FAIL1CE0timeout matches
raw724passed12failed/successfalse. Twelve nonpasses are tracked69–80:
two eval-alias TCO, proxy-class native stringification, Proxy missing-get and
missing-set, Object subclass CE, global var/function collision and five Intl.

Child47243 naturally ran2026-10-10T05:55:01.461Z–06:51:10.534Z,
exit/close1 signalnull, completetrue/processerrors[]; both streams EOF/closed
true/errors[]. Root independently read/rehash verified all four byte/hash pins:

- Completion shard-6-of-16.complete.json57590bytes SHA
  c1301d9caa832a6f73413816f25b17a41e82fd4fbd0ae4f0f4fc0f5786b518cb.
- Raw shard-5.vitest.json247220bytes SHA
  85edb39be94cb1e216d6e87073d282a24ddf193b1e550282f65b5ecaeaf4b4d7.
- stdout113359bytes SHA
  81bf5705926b61f55d2b51b91d6b831f6750647ed70140906969ef25ab0705ae.
- stderr7480bytes SHA
  f99f77d8df8ec53714445d7b8c6d0c1dca747df1b8e48f38b7a4b3197a24f6bb.

Complete before/after epoch objects equal; head38901fff/sourcea6464ffb,
sourceCount1902. Actual announcement QuickJS95333826e7c8/adapter45807795114005bc
default4242 unchanged. Readback has one poison-error retry; actual variant
callsUNKNOWN, not retry-free acceptance. No oracle/provider/corpus substitution.
SAME62071 subsequently explicitly reports SEVENTH shard index6 LIVE/PID64778.
Whole16-shard census and heavy lease remain active; no restart/signal or
source/base/Git/PR-readiness mutation. Aggregate4417/11778=4337PASS69FAIL5CE
6timeouts7361unsettled proves six-shard accounting, NOT full completion/100%.

## 2026-10-10 seventh-shard Intl negatives89–91

Root fully read and hashed all three unchanged originals. Frozen38901fff,
honest14/providersauto official standalone strictboth FAIL reachedtrue:

- DateTimeFormat/prototype/formatRange/argument-tonumber-throws.js SHA256
  49998a6dd75b7c0f69a281dd1a4c476fd94228cd5fdcf4f7233b4a732d165a0c,
  09:45:07 local compile4952/exec170ms. Constructor reports Intl.DateTimeFormat
  unavailable standalone/wasi/no ICU data. All six formatRange argument
  assertions are masked: valueOf and toString abrupt completions in either
  argument, plus Symbols causing TypeError in either argument. This explicit
  unavailable-constructor error is distinct from prior nullish lookups.
- DisplayNames/options-languagedisplay-toString-abrupt-throws.js SHA256
  744c83d5a2ae57c561d8bc250adaa709135a174398bbf17be3af029c8b62ba82,
  09:45:18 compile9238/exec103ms. First languageDisplay.toString Test262Error
  is missing; valueOf fallback, Symbol.toPrimitive throw and Symbol TypeError
  are masked. Exact GetOption ordering and abrupt identity must be preserved.
- Intl/supportedValuesOf/builtin.js SHA256
  bc35a69c145c3c62a03dda1ca8e6b92ed8091f2757e0ed0d5c9a6ab0a6d15283,
  09:45:28 compile9354/exec712ms. Nullish377:46; exact failing operation UNKNOWN.
  Requires function type, no own prototype, extensibility, Function.prototype
  identity and nonconstructibility. Root fully read isConstructor.js SHA256
  68e1a3e4565a8d33ea7fc918627fbbf446bcf14d7a939777616b2b545a5e7d32:
  Reflect.construct with f as newTarget catches any exception as false; this
  helper alone cannot establish all other builtin requirements.

Implementation after Intl/data/callable owner handover and execution release:
provide real native DateTimeFormat construction and formatRange data/brands,
not a method stub that happens to throw; verify start conversion before end,
exact user abrupt values and valid range outputs. Inspect DisplayNames
languageDisplay GetOption lookup/conversion sequence, valid dialect/standard,
getter effects and all abrupt paths. Inspect actual supportedValuesOf function
carrier/metadata, live property operations, constructor capability and valid
key enumeration; this builtin-shape original does not test enumeration data.
Controls must independently cover both shape and supported-values semantics,
not native builtin fabrication. Same-epoch originals A–C–A, relevant neighbors
and normal acceptance gates required. All74Intl remain in full11778 manifest;
no exclusions, providers/oracle/harness substitution or date-based omission.

At5150/11778:5059PASS80FAIL5CE6compile_timeout,6628unsettled,
problems[]; full completion false, all91known nonpasses tracked. SAME62071
live seventh shard6/PID64778. No source, corpus, harness, provider, Git/PR
mutation or competing compiler/test/build/helper execution.

## Seventh-shard final Intl negatives92–93 and reconciled terminal

Root fully read unchanged originals; honest14/auto official standalone
strictboth FAIL reachedtrue, frozen38901fff/sourcea6464ffb:

- NumberFormat/prototype/formatRangeToParts/builtin.js SHA256
  15017067cd6aa119b00e7818267a58e4e27e90e506e27e86a08d0f474ece45df,
  09:45:40 local compile9318/exec501ms. Nullish359:28; actual failing lookup
  UNKNOWN. Requires Function tag, extensibility, exact Function.prototype,
  no own prototype and nonconstructibility of formatRangeToParts. It does not
  verify formatted range parts. Existing NumberFormat prelude/control packet
  is UNRUN and not implementation of the formatter or this range method.
- Segmenter/proto-from-ctor-realm.js SHA256
  1ead69c68a497747fdd3ef554500f77a62987d8cab0be54146e307532e250d11,
  09:45:45 compile4375/exec117ms. Nullish356:46, failing stage UNKNOWN.
  Foreign Function newTarget has prototype undefined/null/false/string/Symbol/
  number in six successive constructions, each requiring foreign realm's
  genuine Intl.Segmenter.prototype. No assertion/variant is proven passed.

Implementation after Intl/realm/callable owner handover/root lease release:
separate absent namespace/prototype/method, native function carrier shape and
actual range formatter semantics; preserve nonconstructibility and valid range
parts data independently. Segmenter must select constructor realm's intrinsic
when newTarget.prototype is primitive, preserve exact object prototypes when
present, getter side effects, Proxy/bound newTarget realm semantics and genuine
segmenter slots/data. Coordinate4274 realm owner; no aliased foreign namespace,
fabricated builtin, copied host result or prototype-only fake allocation.
Unchanged originals A–C–A, all six primitive cases, exact object-prototype
positive, callable/construct regressions and actual native formatting/segment
controls required. All74Intl remain included; no oracle/provider substitution.

Root independently reconciled seventh index6:737registered unique originals
=737canonical unique rows=737raw unique assertion titles, missing[];
724PASS13FAIL0CE/timeout/skip/exclusion/pending/todo. All737callbacks started
and settled; raw724passed13failed. Nonpasses81–93 all tracked.
PID64778 naturally ran2026-10-10T06:52:21.102Z–07:45:52.336Z,
exit/close1 signalnull, completetrue/errors[]; both streams EOF/closedtrue,
errors[]. Full before/after epoch objects equal, sourceCount1902,
head38901fff8f9a5ca029cbefcdaec5d8dd40949861 and sourceSHA256
a6464ffb87f98d4984d2454a14bc95bd80c035c88e7905bd1465b484537738c8.
Independent byte/SHA256 rehash matches all four receipt pins:

- completion shard-7-of-16.complete.json56831bytes
  fb47834518c69230974310aceaef894873ac98668801094bc84bae1e3dfec75f.
- raw shard-6.vitest.json246464bytes
  27377f81174f76fc567c6ce6810f6655d57e0486231a4cd7bb4e4d41ac5e0cc8.
- stdout112734bytes
  96d18e8806d672de238925a25d6bb31661a8f99234c5a717a25074f582961c0c.
- stderr8623bytes
  45fae4b463f353d5f7e9d4c646fb77ea4ee4e10d13f3ee7e6c7b49d085da90e2.

Readback announces QuickJS95333826e7c8/adapter45807795114005bc/default4242,
timeoutEvents[]; actualVariantCallsUNKNOWN. One broad exploratory epoch print
truncated; subsequent compact reconciliation fully returned every accounting,
terminal, equality and byte/hash check cited here. Truncation is not complete
review of individual dependency entries. Last parse-negative identifier PASS
reachedfalse is valid negative-test evidence, not runtime assertion execution.

SAME62071 emitted settled-not-final shard6 cumulative5154 exit1 and remains
nonterminal. Aggregate5154/11778=5061PASS82FAIL5CE6compile_timeout,
6624unsettled, problems[], all93known nonpasses tracked. Heavy lease remains
occupied through observer shard transition; no restart/signal, source/base/
corpus/original/provider/runner/Git/PR mutation or competing heavy execution.
Seven completed shards do NOT prove full16 completion or100% acceptance.

## Root continuation: eighth-shard startup and shepherd19 reviewed

Same native62071 now explicitly reports running-not-final shard-7/PID54196:
the eighth child started without restart or root source mutation. Canonical
remains5154/11778 at this observation, counts5061PASS82FAIL5CE6timeout,
6624unsettled, problems[], newNonpass slice93 empty. Verified live wait,
not stopped work or a completed census; root heavy lease remains occupied.

Root fully read shepherd recovery19's188-line handoff and independently
verified SHA25663216f7096ce77031409186b09330f3bc50c21b92101b0150f483b479ef3b74f.
Finite human-triggered audit proves0/9eligible,0ready/queued/merged; queue
empty at main908f8103. Locale6436 newhead9286c071 is bot base-sync, not
packaging repair or author release. Its actual new-head job114164523724
failed flat codegen830→831 at07:45:23Z. Nine other locale jobs were active;
their future successes cannot erase required quality failure. Other ownership,
unfinished semantic acceptance and conflicts remain in exact-head handoff.
No admin/bypass, passive subscription workaround, recurring GH audit or unsafe
local repair/validation is authorized by these observations. Actual merge
eligibility still requires positive owner handover, accepted head and all gates.

## Root interruption audit: session and eighth child actually gone

After the deliberate tool-turn interruption, the same native62071 handle
returns `Unknown process id 62071`. A sandbox process read was denied; an
approved read-only OS check then returned no PID54196 and no matching census
or Vitest process. This is stopped work, not an observation timeout. Root
issued no signal, cancellation or test kill. The last canonical result is
11:05:34 local; no shard7 terminal/raw-Vitest/readback/after-epoch
receipt exists. Do not fabricate exit status, natural EOF or callback totals.

Partial accounting is5690/11778 unique originals:5595PASS83FAIL5CE7timeouts,
6088unsettled, zero accounting problems, fullCensusComplete false. The seven
previously reconciled natural shard completions still cover5154 originals.
The interrupted eighth shard's536 canonical rows remain preserved but lack
its full-shard settlement receipt. Original manifest/source HEAD remain
632db3bbecb0d6ea42b0915b13740912bf3fd8e32e2a15a8b28c1f63b6434360 /
38901fff8f9a5ca029cbefcdaec5d8dd40949861; source/scripts/tests diff is empty.

Root fully reread the491-line existing observer. It requires a fresh output,
fresh JSONL and absent completion files; it has no resume mode. Blindly
relaunching it would restart all11778 or violate its freshness admission.
Recovery must therefore be explicitly reviewed, never silently treat missing
handle as permission to erase rows or reuse incomplete callback manifests.

Recovery implementation plan:

- Preserve every original canonical line, launch, partial stdout/stderr and
  all seven complete raw/terminal/epoch/manifest receipts unchanged and pinned.
- Prove the current full physical epoch matches the last frozen epoch before
  admitting further execution, including source, maintained runner, bundles,
  dependencies, corpus/harness, provider selection and resource configuration.
- Prefer replaying the entire interrupted logical shard7 in a separately
  named attempt, then running untouched shards8–15 serially. Do not selectively
  keep its earlier PASS rows and discard its failures. Reconcile replay deltas
  per identity; retain the interrupted rows as historical evidence, not extra
  original credit or an invented natural completion.
- Build a separately named provenance-explicit union from the seven completed
  shards and nine fully settled recovery shards, with exactly11778 originals,
  all74Intl, no duplicate identities and actual maintained completeness
  validation. Preserve original run identifiers and physical receipt bytes;
  do not rewrite timestamps or completion manifests to manufacture agreement.
- Require actual before/after physical epoch equality and independent raw/
  canonical/registration/natural-terminal reconciliation. Any unresolved
  provenance or callback mismatch remains incomplete, not an acceptance waiver.

No recovery process has been launched and no heavy lease released to another
agent. Root is auditing recovery; source-only parallel preparation remains
allowed. The full100% goal is active and unachieved. Existing failures and
timeouts remain defects to fix, regardless of recovery completion.
