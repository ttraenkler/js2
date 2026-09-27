// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { Instr } from "../ir/types.js";
import type { CodegenContext } from "./context/types.js";
import { buildFastStrictEqDispatch } from "./extern-eq-fast.js";
import { bigIntCarrierEqInstrs } from "./bigint-wide.js";
import { vecProjectionEqualityOperands } from "./vec-projection-identity.js";

/** Shared native equality body; helper registration remains in any-helpers. */
export function buildExternStrictEqBody(ctx: CodegenContext, fromExternIdx: number, strictEqIdx: number): Instr[] {
  const identityOperands = vecProjectionEqualityOperands(ctx);
  const EQ_HEAP_TYPE = -19; // WasmGC `eq` abstract heap type
  // (#4173) Fast tag-pair dispatch for the identity-MISS path — flag-gated
  // (`ctx.fastStrictEq`, default ON), built in extern-eq-fast.ts. `[]` when
  // the fast path cannot be built (flag off / missing box types / strings
  // present without a native `__str_equals`).
  const fastDispatch = buildFastStrictEqDispatch(ctx);
  return [
    ...identityOperands,
    // (#2734) Object/reference-identity fast path. `__any_from_extern` has no
    // dedicated Object tag — it folds an object externref into the tag-5 (string)
    // fallback, so the `__any_strict_eq` below would string-compare two objects
    // and never match them by identity (`[o].indexOf(o)` → -1). That regressed
    // the `built-ins/Array/prototype/{indexOf,lastIndexOf}/...` object-element
    // cluster (and `includes`, which calls this helper) when #2719 replaced the
    // `__host_eq` import with this native arm. Internalise both externrefs; if
    // both are non-null `eq` refs and `ref.eq` (the SAME reference), they are
    // `===` → return 1. Otherwise fall through to the primitive comparison. This
    // never false-positives a primitive: distinct number/string boxes are
    // distinct refs (→ value comparison); only a genuinely identical reference
    // short-circuits. `null`/non-eq values fail `ref.test (ref eq)` and fall
    // through (so `null === null` etc. stay handled by `__any_strict_eq`).
    { op: "local.get", index: 0 },
    { op: "any.convert_extern" },
    { op: "local.tee", index: 2 },
    { op: "ref.test", typeIdx: EQ_HEAP_TYPE },
    { op: "local.get", index: 1 },
    { op: "any.convert_extern" },
    { op: "local.tee", index: 3 },
    { op: "ref.test", typeIdx: EQ_HEAP_TYPE },
    { op: "i32.and" },
    {
      op: "if",
      blockType: { kind: "empty" },
      then: [
        { op: "local.get", index: 2 },
        { op: "ref.cast", typeIdx: EQ_HEAP_TYPE },
        { op: "local.get", index: 3 },
        { op: "ref.cast", typeIdx: EQ_HEAP_TYPE },
        { op: "ref.eq" },
        {
          op: "if",
          blockType: { kind: "empty" },
          // (#3174) EXCEPT the `$BoxedNumber` carrier: §7.2.16 IsStrictlyEqual
          // routes both-Number operands to Number::equal (§6.1.6.1.13), whose
          // step 1/2 make `NaN === NaN` FALSE even when both sides are the
          // very same reference. The SAME `__box_number` box reaches both
          // params whenever one `any` local is compared against itself —
          // `a !== a` (the harness `isSameValue` NaN probe, and every
          // `assert.sameValue(x, NaN)` in the standalone lane) — so an
          // unconditional identity return answered `NaN === NaN` → true and
          // silently failed ~50 `built-ins/Date` invalid-date/NaN rows. A
          // same-ref non-NaN number box falls through to the tag-3 `f64.eq`
          // primitive comparison below and stays `===` (true), so the ONLY
          // behavioral flip is the spec-required NaN one. Object identity
          // (#2734) and the $BigInt value arm (#3173) are untouched: neither
          // can hold NaN.
          then:
            ctx.nativeBoxNumberTypeIdx >= 0
              ? [
                  { op: "local.get", index: 2 },
                  { op: "ref.test", typeIdx: ctx.nativeBoxNumberTypeIdx },
                  { op: "i32.eqz" },
                  {
                    op: "if",
                    blockType: { kind: "empty" },
                    then: [{ op: "i32.const", value: 1 }, { op: "return" }],
                  },
                ]
              : [{ op: "i32.const", value: 1 }, { op: "return" }],
        },
        // (#4173) identity MISSED and both sides are eq-refs — the fast
        // tag-pair dispatch (see canFastDispatch above) decides every
        // non-$AnyValue pairing right here, alloc- and call-free.
        ...fastDispatch,
      ],
    },
    // (#3173) $BigInt-box arm: two DISTINCT bigint boxes with the same i64
    // value are `===` (§7.2.15 step 1: both BigInt → BigInt::equal). The
    // `__any_from_extern` classification below has no bigint tag — it folded
    // bigint boxes into the object fallback, so `dv.getBigInt64(0) === 0n`
    // (each side freshly boxed) compared by REFERENCE and was always false
    // whenever this helper (not the inline `===` cascade, which has a
    // typeof_bigint arm) served the comparison. Mixed bigint/number operands
    // fall through — the classification keeps them unequal, matching
    // `1n === 1` → false.
    ...((ctx.nativeBigIntTypeIdx >= 0
      ? [
          { op: "local.get", index: 2 },
          { op: "ref.test", typeIdx: ctx.nativeBigIntTypeIdx },
          { op: "local.get", index: 3 },
          { op: "ref.test", typeIdx: ctx.nativeBigIntTypeIdx },
          { op: "i32.and" },
          {
            op: "if",
            blockType: { kind: "empty" },
            // (#6656) exact for a value past i64, not just its low 64 bits.
            then: [...bigIntCarrierEqInstrs(ctx, 2, 3), { op: "return" }],
          },
        ]
      : []) satisfies Instr[]),
    // Primitive comparison (numbers unified via f64.eq, strings by content,
    // booleans, null/undefined by tag) for everything the fast path didn't match.
    { op: "local.get", index: 0 },
    { op: "call", funcIdx: fromExternIdx },
    { op: "local.get", index: 1 },
    { op: "call", funcIdx: fromExternIdx },
    { op: "call", funcIdx: strictEqIdx },
  ];
}
