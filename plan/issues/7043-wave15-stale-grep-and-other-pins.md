---
id: 7043
title: "wave 15: re-pin source-grep / snapshot / harness tests that went stale while the issue-tests detector was blind"
status: done
sprint: current
created: 2026-10-17
updated: 2026-10-17
completed: 2026-10-17
priority: medium
horizon: s
feasibility: easy
reasoning_effort: high
task_type: test
area: tests
language_feature: n/a
goal: ci-hardening
related: [7014, 7042, 7044, 7045, 7046, 7047, 7048, 7050]
requested_by: ttraenkler/wave15-grep-other-sentinels
---

# #7043 — stale pins from the #7014 sweep (grep / "other" classes)

## Rule applied

A test is re-pinned ONLY when the code it reads changed BY DESIGN — each edit
below cites the commit that moved it — and the new assertion still checks the
same property. Where the new value is the JS-correct one the pin used to
record as a known divergence, the pin now asserts the correct value. Tests
whose new behaviour is wrong stay red under their own issue (#7044–#7048,
#7050); none was weakened to pass.

## Re-pinned (test-only)

`issue-743-ctor-sites-in-fixpoint`, `issue-1744`, `issue-1907` and `issue-1973`
were also re-pinned here, but #7026 (wave-15 value lane, PR #6721) landed the
same fixes first; this change takes main's versions of those four files.

| file | what moved | cause |
|---|---|---|
| `issue-700-test262-language-service` | worker wrappers pass merged `opts`; graph branch keys on `moduleGraph` | d01944b471 (#4035), 1de31aa63c (#6776), f1ad427b98 |
| `issue-1933` | `legacyRegExpState` became a REQUIRED InstanceState field | dbccc693f6 |
| `issue-1751` | WIT annotation is "Core provider import" | dbccc693f6 (#4398) |
| `issue-1778` | standalone report is CI-refreshed (full report, not the June summary); host-off caption IR-decorated | baseline refresh commits; fa1e5df779 |
| `issue-2098` | "Trap baseline unknowns" heading reworded + per-cause breakdown | c6c42ce7d0 (#4141) |
| `issue-1120` | IR now claims the loop; scalar slots are `$slot_<name>` | src/ir/lower-generic.ts |
| `issue-1179-followup` | ToInt32 is an IEEE-754 bit decomposition, not the ×2³² dance | 57038dce23 (#3739) |
| `issue-1536` | Error names interned as `$__strlit_N` globals; a throwing WASI module imports `fd_write` | 2834060c35 (#3673); #2968 |
| `issue-1644` | a bigint-only `asAny` now narrows to i64 and inlines; the carrier needs a mixed body | return-type inference |
| `issue-2856-inline-small-buffer-caller` | the post-lowering Wasm inliner may inline the retained call | 334654f1ed (#4157) |
| `issue-3529-dataflow-outcomes` | reference `===` rejected at SELECT, same code | 3b782f6d60 |
| `issue-3683-direct-calls` | captured method gets a typed twin; dynamic lane now JS-correct (1237) | typed-this.ts twin arm |
| `issue-3995-hono-class-boundary` | identifier callee with awaited arg suspends through a continuation | 57ecfe13ee (#6504 r29) |
| `issue-4122-mixed-carrier-numeric` | guarded trampoline's miss-arm unbox inlined; #4121 also proves the slot | 334654f1ed; 79bc420bba |
| `issue-4150-fmod-integral-fast-path` | exact-helper fallback is a `return_call` | tail calls in return position |
| `issue-4130-npm-compat-promotion-fast-path` | two evidence-upload steps lacked the artifact-only gate — gated in `ci.yml` (test unchanged) | 57aa0d7302, a8441b41d5 |
| `issue-6706-native-first-lane-providers` | the native-first lane is `if: false` (JS-host Test262 retired) | ae7991db21 |
| `issue-2742-standalone-carveout` | the set moved to `string-proto-tostring.ts`; `trim` left it | a047a5f029 |
| `emit-encodeinstr-failloud` | `br_table` has a real payload + encoding | 4b1f8a402a (#2952) |
| `typed-export-signatures` | optional param is undefined-capable externref; host module imports its string constants | 315752dcbc (#4536) |
| `issue-1058-multifile-generic-callback-registration` | the pinned TypeError is gone; `test()` answers the JS-correct 42 | — |
| `issue-6651-sg1-generator-singletons` | "PINNED WRONG" `yield *` newline module validates and completes | — |
| `es5-standalone-array-nonindex-keys` | `a[2³²−2] = 1` no longer traps; `length` is the JS-correct 2³²−1 | — |
| `issue-2998` | the object-LHS `instanceof` host predicate was retired by #2916 itself | 4c2c44482f |
| `issue-2984-ctor-carrier-own-props` | the pinned "KNOWN GAP" store bypass is fixed; the strict write throws | — |
