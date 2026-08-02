// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
/**
 * #4016 — the `String.prototype` ↔ standalone-RegExp bridge.
 *
 * Extracted from `regexp-standalone.ts`, which had grown past the LOC-budget
 * ratchet (#3102). The cut follows a real seam rather than a line count:
 * `regexp-standalone.ts` owns the ENGINE — compiling a pattern to bytecode, the
 * `$NativeRegExp` struct, `RegExp.prototype.test`/`.exec`, and the reflection
 * getters. This module owns the six `String.prototype` methods that *consult a
 * search value* (`match` / `matchAll` / `replace` / `replaceAll` / `search` /
 * `split`), together with the `RegExp.prototype[@@match|@@replace|…]` dispatcher
 * that reuses their operand-explicit cores with the operands swapped.
 *
 * That seam is exactly where #4016 lives. Each of the six methods begins the
 * same way (§22.1.3.11/.12/.13/.14/.19/.23, step 2 in each): if the search value
 * is neither `undefined` nor `null`, `GetMethod(searchValue, @@<protocol>)`, and
 * if that is not `undefined`, call it. Only when the lookup comes back
 * `undefined` does the method fall through to its own STRING path —
 * `ToString(searchValue)` for `split`/`replace`/`replaceAll`,
 * `RegExpCreate(ToString(searchValue), …)` for `match`/`matchAll`/`search`. The
 * predicate that separates those two worlds (`isPlainToStringSearchValue`) is a
 * property of THIS layer — the protocol dispatch — not of the engine below it,
 * which is why the old "not a statically-known RegExp ⇒ needs a JS host"
 * refusal (#1474) could only ever be stated here.
 *
 * Dependency direction is one-way: this module imports from the engine, never
 * the reverse. `staticRegExpFlags` deliberately stayed behind because
 * `RegExp.prototype.test`/`.exec` need it too.
 */
import { ts } from "../ts-api.js";
import type { Instr, ValType } from "../ir/types.js";
import type { CodegenContext, FunctionContext } from "./context/types.js";
import { reportError } from "./context/errors.js";
import { allocLocal } from "./context/locals.js";
import { ensureNativeStringHelpers, nativeStringLiteralInstrs, nativeStringType } from "./native-strings.js";
import {
  ensureRegexMatchAll,
  ensureRegexMatchAllArrays,
  ensureRegexMatchAllVecType,
  ensureRegexMatchVecType,
  ensureRegexReplace,
  ensureRegexSplit,
  i32ArrayLiteralInstrs,
  regexI32ArrayType,
} from "./native-regex.js";
import { noJsHost } from "./js-errors.js";
import { getArrTypeIdxFromVec, getOrRegisterVecType } from "./registry/types.js";
import { compileExpression } from "./shared.js";
import { emitArgAsNativeString } from "./string-ops.js";
import {
  compileStaticStandaloneRegExp,
  emitRegexExecArrayCall,
  emitRegexSearchCall,
  ensureDynamicStandaloneRegExpCompiler,
  ensureStandaloneRegExpStruct,
  flagsHaveGlobalOrSticky,
  hasStandaloneRegExpEngine,
  isGlobalRegExpType,
  isKnownBackendCreatedRegExpReceiver,
  isStaticallyUndefinedExpr,
  isStringLikeArg,
  loadStandaloneRegExpStruct,
  RE_FIELD_CLASS_TABLE,
  RE_FIELD_LASTINDEX,
  RE_FIELD_NGROUPS,
  RE_FIELD_NSCRATCH,
  RE_FIELD_PROG,
  reportStandaloneRegExpUnsupported,
  staticRegExpFlags,
  staticRegExpGroupMeta,
  staticRegExpPatternFlags,
  stripStaticWrapper,
} from "./regexp-standalone.js";

/**
 * (#4016) The well-known symbol each `String.prototype` search-value method
 * consults before falling back to plain string coercion (§22.1.3.11/.12/.13/
 * .14/.19/.23 step 2 in each case).
 */
export type SearchValueProtocol = "match" | "matchAll" | "replace" | "search" | "split";

/**
 * (#4016) The node a search value must be BOTH proven and emitted from.
 *
 * `String.prototype.split` is typed `(separator: string | RegExp, …)`, so a
 * TypeScript caller can only pass a number/object separator through a cast —
 * which means the analysis has to see through the assertion or this path is
 * unreachable from TypeScript entirely. A type assertion is erased at runtime,
 * so the operand's proven shape IS the value's shape.
 *
 * The reason this is one exported function rather than a `stripStaticWrapper`
 * call at each site: proving on the operand while EMITTING from the assertion
 * is a silent wrong answer, not a missed optimisation. `"xtruey".search(true as
 * any)` proved admissible on the `true` literal but then handed `true as any`
 * to the ToString engine, which saw type `any` over a raw i32 and produced a
 * value that matched nothing (`-1` instead of `1`) — while the identical
 * cast-free JavaScript was correct all along. Route both through here.
 */
export function searchValueOperand(argExpr: ts.Expression): ts.Expression {
  return stripStaticWrapper(argExpr);
}

/**
 * (#4016) Is `argExpr` a search value that the spec resolves by plain
 * **`ToString`**, with no `@@<protocol>` dispatch and no RegExp involved?
 *
 * Every one of `match`/`matchAll`/`replace`/`replaceAll`/`search`/`split`
 * begins the same way: *if the search value is neither `undefined` nor `null`,
 * `GetMethod(searchValue, @@<protocol>)`, and if that is not `undefined`, call
 * it.* Only when that lookup comes back `undefined` does the method fall
 * through to its own string path — `ToString(searchValue)` for
 * `split`/`replace`/`replaceAll`, `RegExpCreate(ToString(searchValue), …)` for
 * `match`/`matchAll`/`search`.
 *
 * The standalone lane used to treat "not a statically-known backend RegExp" as
 * "needs a JS host" and refuse the whole call (#1474). That conflated two very
 * different things. This predicate separates them: it answers `true` only when
 * the argument's type **provably** cannot carry the protocol method, which is
 * exactly the condition under which the spec's plain-`ToString` path is the
 * whole of the semantics.
 *
 * Deliberately conservative in three places:
 *   - `undefined`/`void` is NOT admitted here. Each method special-cases an
 *     undefined search value differently (`split` returns `[S]` without
 *     splitting; `search` builds `RegExpCreate(undefined) = //`), so the caller
 *     decides — silently folding it in would be a spec bug, not a widening.
 *   - a `symbol`-typed argument stays refused: §7.1.17 `ToString(symbol)`
 *     THROWS, and this lane has no way to raise that (same carve-out as #3724).
 *   - `any`/`unknown` stay refused, because `wellKnownSymbolMemberOf` cannot
 *     prove absence there. The one exception is a SYNTACTIC `null` literal,
 *     which is `any` under `strictNullChecks: false` yet is unambiguously the
 *     null value — and `null` skips the protocol lookup by inspection.
 */
export function isPlainToStringSearchValue(
  ctx: CodegenContext,
  argExpr: ts.Expression,
  protocol: SearchValueProtocol,
): boolean {
  if (isDefinitelyUndefinedExpr(ctx, argExpr)) return false;
  const value = searchValueOperand(argExpr);
  if (value.kind === ts.SyntaxKind.NullKeyword) return true;
  const fact = ctx.oracle.typeFactOf(value);
  // ToString(symbol) throws (§7.1.17) — keep the loud refusal rather than
  // silently stringifying. A union is rejected if ANY part could be a symbol.
  if (fact.kind === "symbol") return false;
  if (fact.kind === "union" && fact.parts.some((part) => part.kind === "symbol")) return false;
  return ctx.oracle.wellKnownSymbolMemberOf(value, protocol) === false;
}

/**
 * (#4016) Is this argument the `undefined` value with certainty — either
 * syntactically ({@link isStaticallyUndefinedExpr}) or because its type is
 * exactly `undefined`/`void` (e.g. `function(){}()`, test262's favourite way of
 * writing `undefined`)?
 *
 * Every search-value method special-cases undefined differently from the plain
 * `ToString` path — `split(undefined)` returns `[S]` **without splitting**,
 * while `search(undefined)` builds the EMPTY pattern rather than matching the
 * literal text `"undefined"`. Getting this wrong is a silent wrong-answer, so
 * it is a separate, deliberately narrow predicate: a merely NULLABLE type
 * (`string | undefined`) is not definitely undefined and answers `false`.
 */
export function isDefinitelyUndefinedExpr(ctx: CodegenContext, argExpr: ts.Expression): boolean {
  if (isStaticallyUndefinedExpr(argExpr)) return true;
  const kind = ctx.oracle.typeFactOf(searchValueOperand(argExpr)).kind;
  return kind === "undefined" || kind === "void";
}

/**
 * `String.prototype.split(separator, limit)` — native lowering for all three
 * separator shapes the host-free lane admits. Returns `undefined` when none
 * applies, so the caller falls through to the host-import path (which
 * dispatches `@@split` through the JS engine).
 *
 * All three live in one function because admissibility is one question —
 * §22.1.3.23 step 2 dispatches `@@split` only when the separator HAS that
 * method, so a separator is native-lowerable exactly when it provably does not:
 *
 *   1. **Undefined** (#2161 B2) — `s.split()`, `s.split(void 0)`,
 *      `s.split(undefined, lim)`. Steps 5-8: an undefined separator never
 *      splits, so the result is `[S]`, or `[]` when `ToUint32(limit) === 0`.
 *      Built directly as a one-element vec, no engine call. These forms used to
 *      fall through to the host marshal path, which has no standalone
 *      `string_split` and null-deref'd.
 *   2. **Statically string-like** — a raw `compileExpression` already yields
 *      `ref $AnyString`. #1443 established this as the only shape for which
 *      skipping the host was known safe, because a non-string *might* carry
 *      `@@split`.
 *   3. (#4016) **Provably protocol-free but not string-like** —
 *      `s.split(123)`, `s.split(null)`, `s.split(objWithToString)`. When the
 *      lookup provably comes back `undefined`, step 5's
 *      `R = ToString(separator)` is the whole of the semantics and
 *      `__str_split` is exactly right. Refusing this as "needs a JS host"
 *      (#1474) conflated "not a string" with "not a RegExp".
 *
 * Shapes 2 and 3 are operand-for-operand identical — receiver → separator →
 * limit, left-to-right as at any call site — and differ only in producing the
 * separator: `emitArgAsNativeString` (§7.1.17 ToString, the #2598 engine)
 * instead of a raw `compileExpression`, which would feed a mistyped ref to a
 * helper expecting `ref $AnyString`.
 *
 * The caller supplies `emit.receiver` / `emit.limit` because both close over
 * `compileNativeStringMethodCall`'s local receiver-coercion and integer-arg
 * lowering. (#3901) Deliberately NO `emitFlatten()`: `__str_split` takes `ref
 * $AnyString` and its preamble already flattens both params (#3673).
 */
export function tryCompileNativeStringSplit(
  ctx: CodegenContext,
  fctx: FunctionContext,
  expr: ts.CallExpression,
  firstArgIsStringLike: boolean,
  emit: { receiver: () => ValType | null; limit: () => void },
): ValType | undefined {
  const sepArg = expr.arguments[0];

  // --- shape 1: undefined separator ---------------------------------------
  // (#4016) `isDefinitelyUndefinedExpr` widens the compile-time test from the
  // purely SYNTACTIC `undefined`/`void 0` to any expression whose type is
  // exactly `undefined`/`void` — test262 spells an undefined separator
  // `function(){}()` (S15.5.4.14_A1_T9), which the syntactic test misses and
  // which would otherwise fall into shape 3 and split on the literal text
  // "undefined".
  if (ctx.nativeStrings && ctx.anyStrTypeIdx >= 0 && (sepArg === undefined || isDefinitelyUndefinedExpr(ctx, sepArg))) {
    const elemType: ValType = { kind: "ref_null", typeIdx: ctx.anyStrTypeIdx };
    const vecTypeIdx = getOrRegisterVecType(ctx, `ref_${ctx.anyStrTypeIdx}`, elemType);
    const arrTypeIdx = getArrTypeIdxFromVec(ctx, vecTypeIdx);
    // Receiver → native-string local (kept nullable; a null receiver would have
    // thrown at the property access already).
    const recvLocal = allocLocal(fctx, `__split_recv_${fctx.locals.length}`, nativeStringType(ctx));
    emit.receiver();
    fctx.body.push({ op: "local.set", index: recvLocal });
    // (#4016) The separator's VALUE is unused (undefined never splits), but the
    // expression that produced it is still evaluated at the call site. The
    // syntactic forms this arm originally matched (`undefined`, `void 0`) are
    // side-effect-free and folded away; a type-level `void` one (`f()`) is not,
    // so evaluate and discard it. Dropping the whole expression would silently
    // delete the call.
    if (sepArg !== undefined && !isStaticallyUndefinedExpr(sepArg)) {
      const sepType = compileExpression(ctx, fctx, sepArg);
      if (sepType) fctx.body.push({ op: "drop" });
    }
    // lim = ToUint32(limit); absent / statically-undefined → unbounded (-1).
    const limLocal = allocLocal(fctx, `__split_lim_${fctx.locals.length}`, { kind: "i32" });
    emit.limit();
    fctx.body.push({ op: "local.set", index: limLocal });
    // lim === 0 ? { length: 0, data: [] } : { length: 1, data: [S] }
    fctx.body.push({ op: "local.get", index: limLocal });
    fctx.body.push({ op: "i32.eqz" });
    fctx.body.push({
      op: "if",
      blockType: { kind: "val", type: { kind: "ref", typeIdx: vecTypeIdx } as ValType },
      then: [
        { op: "i32.const", value: 0 },
        { op: "i32.const", value: 0 },
        { op: "array.new_default", typeIdx: arrTypeIdx },
        { op: "struct.new", typeIdx: vecTypeIdx },
      ],
      else: [
        { op: "i32.const", value: 1 },
        { op: "local.get", index: recvLocal },
        { op: "array.new_fixed", typeIdx: arrTypeIdx, length: 1 },
        { op: "struct.new", typeIdx: vecTypeIdx },
      ],
    });
    return { kind: "ref", typeIdx: vecTypeIdx };
  }

  // --- shapes 2 and 3: one operand sequence, two separator emissions -------
  const plainToString =
    !firstArgIsStringLike && noJsHost(ctx) && sepArg !== undefined && isPlainToStringSearchValue(ctx, sepArg, "split");
  if (!firstArgIsStringLike && !plainToString) return undefined;

  emit.receiver();
  if (plainToString) {
    // Emit from the same node the admissibility gate proved on — see
    // `searchValueOperand` (proving on the operand while emitting from the
    // assertion is a silent wrong answer, not a missed optimisation).
    emitArgAsNativeString(ctx, fctx, searchValueOperand(sepArg!));
  } else if (sepArg !== undefined) {
    compileExpression(ctx, fctx, sepArg);
  } else {
    // default: empty string separator (split each char) (len=0, off=0, [])
    fctx.body.push({ op: "i32.const", value: 0 }); // len
    fctx.body.push({ op: "i32.const", value: 0 }); // off
    fctx.body.push({ op: "i32.const", value: 0 });
    fctx.body.push({ op: "array.new_default", typeIdx: ctx.nativeStrDataTypeIdx });
    fctx.body.push({ op: "struct.new", typeIdx: ctx.nativeStrTypeIdx });
  }
  emit.limit();
  const splitIdx = ctx.nativeStrHelpers.get("__str_split")!;
  fctx.body.push({ op: "call", funcIdx: splitIdx });
  // Return type is ref $vec_nstr — same key as resolveWasmType for string[].
  const nstrVecTypeIdx = ctx.vecTypeMap.get(`ref_${ctx.anyStrTypeIdx}`)!;
  return { kind: "ref", typeIdx: nstrVecTypeIdx };
}

/**
 * (#4016) `RegExpCreate(P, F)` (§22.2.3.3) for a NON-RegExp search value, using
 * the runtime pattern compiler that `new RegExp(dynamicPattern)` already goes
 * through (`ensureDynamicStandaloneRegExpCompiler`). `P` is `""` when the
 * argument is absent/undefined and `ToString(arg)` otherwise
 * (RegExpInitialize step 1); `F` is a compile-time constant supplied by the
 * caller ("" for `match`/`search`, "g" for `matchAll`).
 *
 * Leaves nothing on the stack — the compiled struct lands in the returned
 * local, so the caller controls evaluation ORDER (which matters: the spec
 * runs `ToString(this)` before `RegExpCreate`).
 */
function emitCoercedRegExpToLocal(
  ctx: CodegenContext,
  fctx: FunctionContext,
  argExpr: ts.Expression | undefined,
  flags: string,
): { regexpLocal: number; structTypeIdx: number } | null {
  if (!hasStandaloneRegExpEngine(ctx)) return null;
  ensureNativeStringHelpers(ctx);
  const strType = nativeStringType(ctx);

  const patternLocal = allocLocal(fctx, `__re_coerced_pattern_${fctx.locals.length}`, strType);
  if (argExpr === undefined) {
    for (const instr of nativeStringLiteralInstrs(ctx, "")) fctx.body.push(instr);
  } else {
    // Emit from the same node the admissibility gate proved on — see
    // `searchValueOperand`.
    emitArgAsNativeString(ctx, fctx, searchValueOperand(argExpr));
  }
  fctx.body.push({ op: "local.set", index: patternLocal });

  const flagsLocal = allocLocal(fctx, `__re_coerced_flags_${fctx.locals.length}`, strType);
  for (const instr of nativeStringLiteralInstrs(ctx, flags)) fctx.body.push(instr);
  fctx.body.push({ op: "local.set", index: flagsLocal });

  const structTypeIdx = ensureStandaloneRegExpStruct(ctx);
  const dynamicCompilerIdx = ensureDynamicStandaloneRegExpCompiler(ctx);
  fctx.body.push({ op: "local.get", index: patternLocal });
  fctx.body.push({ op: "local.get", index: flagsLocal });
  fctx.body.push({ op: "call", funcIdx: dynamicCompilerIdx });
  const regexpLocal = allocLocal(fctx, `__re_coerced_${fctx.locals.length}`, { kind: "ref", typeIdx: structTypeIdx });
  fctx.body.push({ op: "local.set", index: regexpLocal });
  return { regexpLocal, structTypeIdx };
}

/**
 * (#4016) `ToString(this)` for a `String.prototype` search-value method, into a
 * `ref $AnyString` local. Runs FIRST so the receiver's coercion is observable
 * before the search value's (§22.1.3.12 step 3 precedes step 4's
 * `RegExpCreate`, which is where the argument's `toString` runs).
 */
function emitSubjectToLocal(
  ctx: CodegenContext,
  fctx: FunctionContext,
  subjExpr: ts.Expression,
  subjectOverride?: () => ValType | null,
): number {
  const local = allocLocal(fctx, `__re_subject_${fctx.locals.length}`, nativeStringType(ctx));
  if (subjectOverride) {
    // The override's contract is "leave a `$AnyString`", but a guarded-dispatch
    // receiver may still be typed nullable — narrow before the non-null local.
    if (subjectOverride()?.kind === "ref_null") fctx.body.push({ op: "ref.as_non_null" });
  } else {
    emitArgAsNativeString(ctx, fctx, subjExpr);
  }
  fctx.body.push({ op: "local.set", index: local });
  return local;
}

/**
 * `String.prototype.search(regexp)` in standalone mode (#1539 Phase 2b).
 *
 * Per ECMA-262 §22.1.3.13 + §22.2.6.13 (`RegExp.prototype[@@search]`): search
 * sets `lastIndex` to 0, runs `RegExpExec`, then restores `lastIndex`, returning
 * the match's `.index` or `-1` on no match. It is unaffected by the `g` flag and
 * never advances. Here the subject (string) is the receiver and the RegExp is
 * the argument: `"abc".search(/b/)`. The argument must be a backend-created
 * static RegExp, or (#4016) a value the spec resolves by plain `ToString` —
 * `"abc".search("b")`, `str.search(obj)`, `"".search()` — which is lowered as
 * `RegExpCreate(ToString(arg), "")` through the runtime pattern compiler.
 *
 * Returns f64 (the index, or -1). `caps[0]` holds the whole-match start.
 * Never returns `VOID_RESULT`, so the type stays `ValType | null | undefined`
 * to match the `compileNativeStringMethodCall` caller contract.
 */
export function tryCompileStandaloneStringSearch(
  ctx: CodegenContext,
  fctx: FunctionContext,
  expr: ts.CallExpression,
  propAccess: ts.PropertyAccessExpression,
  receiverOverride?: () => ValType | null,
): ValType | null | undefined {
  if (!ctx.standalone || propAccess.name.text !== "search") return undefined;

  // The caller has already selected the native String method lane. Untyped
  // receivers may arrive through a proven native-string local or through the
  // receiver override's runtime brand check.
  if (expr.arguments.length > 1) return undefined;
  const argExpr = expr.arguments[0];

  // (#4016) §22.1.3.12 steps 2-4 — no `@@search` method on the search value, so
  // the whole of the semantics is `RegExpCreate(ToString(regexp), "")` against
  // `ToString(this)`. `"".search()` / `search(undefined)` build the empty
  // pattern (RegExpInitialize step 1), NOT the string `"undefined"`.
  const coercible =
    argExpr === undefined || isStaticallyUndefinedExpr(argExpr) || isPlainToStringSearchValue(ctx, argExpr, "search");
  if (coercible) {
    return emitStandaloneRegExpSearchCore(ctx, fctx, expr, propAccess.expression, argExpr, receiverOverride, {
      coercedPatternArg: argExpr === undefined || isStaticallyUndefinedExpr(argExpr) ? null : argExpr,
    });
  }

  if (argExpr === undefined) return undefined;
  const argType = ctx.checker.getTypeAtLocation(argExpr);
  if (!isGlobalRegExpType(argType) && !isKnownBackendCreatedRegExpReceiver(ctx, argExpr)) {
    // Neither a RegExp nor a provably-plain value — could carry `@@search`.
    // Let the generic string-method path keep the #1474 refusal.
    return undefined;
  }

  // String-method operand order: subject = receiver, regex = arg.
  return emitStandaloneRegExpSearchCore(ctx, fctx, expr, propAccess.expression, argExpr, receiverOverride);
}

/**
 * Operand-explicit core for `@@search` semantics (§22.2.6.13): returns the
 * match index (f64) or -1. Shared by `String.prototype.search` (subject is the
 * receiver) and the `re[Symbol.search](str)` protocol form (subject is the
 * argument) — only the operand wiring differs.
 */
function emitStandaloneRegExpSearchCore(
  ctx: CodegenContext,
  fctx: FunctionContext,
  expr: ts.CallExpression,
  subjExpr: ts.Expression,
  regexExpr: ts.Expression | undefined,
  subjectOverride?: () => ValType | null,
  /**
   * (#4016) String-coercion form: build the regex with
   * `RegExpCreate(ToString(coercedPatternArg ?? undefined), "")` instead of
   * loading a backend-created RegExp value out of `regexExpr`.
   */
  coercion?: { coercedPatternArg: ts.Expression | null },
): ValType | null {
  if (!hasStandaloneRegExpEngine(ctx)) {
    reportStandaloneRegExpUnsupported(ctx, expr, "String.prototype.search without an enabled standalone engine");
    return null;
  }

  const i32Arr = regexI32ArrayType(ctx);

  let coercedOptions: Parameters<typeof emitRegexSearchCall>[4];
  if (coercion) {
    // Spec order: `ToString(this)` (step 3) runs BEFORE `RegExpCreate` (step 4)
    // evaluates the search value's `toString`. Materialise both here so the
    // shared emitter, which loads the regex first, cannot reorder them.
    const subjectLocal = emitSubjectToLocal(ctx, fctx, subjExpr, subjectOverride);
    const regexpOverride = emitCoercedRegExpToLocal(ctx, fctx, coercion.coercedPatternArg ?? undefined, "");
    if (regexpOverride === null) return null;
    coercedOptions = {
      regexpOverride,
      inputOverride: () => {
        fctx.body.push({ op: "local.get", index: subjectLocal });
        return nativeStringType(ctx);
      },
    };
  } else {
    coercedOptions = { inputOverride: subjectOverride };
  }

  // emit __regex_search(...) — leaves the i32 match flag on the stack.
  const emitted = emitRegexSearchCall(ctx, fctx, regexExpr ?? expr, subjExpr, coercedOptions);
  if (emitted === null) return null;

  // matched ? f64(caps[0]) : -1
  fctx.body.push({
    op: "if",
    blockType: { kind: "val", type: { kind: "f64" } },
    then: [
      { op: "local.get", index: emitted.capsLocal },
      { op: "i32.const", value: 0 },
      { op: "array.get", typeIdx: i32Arr },
      { op: "f64.convert_i32_s" },
    ],
    else: [{ op: "f64.const", value: -1 }],
  });
  return { kind: "f64" };
}

/**
 * `String.prototype.match(regexp)` in standalone mode (#1539 Phase 2b).
 *
 * Non-global static RegExp arguments share the same result shape as `.exec`.
 * Global `match` returns an all-matches array and sticky/global lastIndex
 * details are intentionally left to the next capture-array slice.
 *
 * (#4016) A search value the spec resolves by plain `ToString` — `"a".match("a")`,
 * `str.match(obj)`, `"".match()` — lowers to `RegExpCreate(ToString(arg), "")`
 * through the runtime pattern compiler. That regex is non-global by
 * construction, so it always takes the `.exec`-shaped arm below.
 */
export function tryCompileStandaloneStringMatch(
  ctx: CodegenContext,
  fctx: FunctionContext,
  expr: ts.CallExpression,
  propAccess: ts.PropertyAccessExpression,
  receiverOverride?: () => ValType | null,
): ValType | null | undefined {
  if (!ctx.standalone || propAccess.name.text !== "match") return undefined;

  if (expr.arguments.length > 1) return undefined;
  const argExpr = expr.arguments[0];

  const coercible =
    argExpr === undefined || isStaticallyUndefinedExpr(argExpr) || isPlainToStringSearchValue(ctx, argExpr, "match");
  if (coercible) {
    return emitStandaloneRegExpMatchCore(ctx, fctx, expr, propAccess.expression, argExpr, receiverOverride, {
      coercedPatternArg: argExpr === undefined || isStaticallyUndefinedExpr(argExpr) ? null : argExpr,
    });
  }

  if (argExpr === undefined) return undefined;
  const argType = ctx.checker.getTypeAtLocation(argExpr);
  if (!isGlobalRegExpType(argType) && !isKnownBackendCreatedRegExpReceiver(ctx, argExpr)) {
    return undefined;
  }

  // String-method operand order: subject = receiver, regex = arg.
  return emitStandaloneRegExpMatchCore(ctx, fctx, expr, propAccess.expression, argExpr, receiverOverride);
}

/**
 * Operand-explicit core for `@@match` semantics (§22.2.6.8). Shared by
 * `String.prototype.match` (subject is the receiver, regex is the argument) and
 * the `re[Symbol.match](str)` protocol form (regex is the receiver, subject is
 * the argument). Global match collects every [0] substring into a match-vec;
 * non-global returns the single capture array (`.exec`-shaped).
 */
function emitStandaloneRegExpMatchCore(
  ctx: CodegenContext,
  fctx: FunctionContext,
  expr: ts.CallExpression,
  subjExpr: ts.Expression,
  regexExpr: ts.Expression | undefined,
  subjectOverride?: () => ValType | null,
  /** (#4016) String-coercion form — see {@link emitStandaloneRegExpSearchCore}. */
  coercion?: { coercedPatternArg: ts.Expression | null },
): ValType | null {
  if (!hasStandaloneRegExpEngine(ctx)) {
    reportStandaloneRegExpUnsupported(ctx, expr, "String.prototype.match without an enabled standalone engine");
    return null;
  }

  if (coercion) {
    // §22.1.3.11 steps 3-5: `RegExpCreate(ToString(regexp), undefined)` is
    // NON-GLOBAL by construction, so this is always the `.exec`-shaped arm.
    // Spec order again: `ToString(this)` precedes the search value's coercion.
    const subjectLocal = emitSubjectToLocal(ctx, fctx, subjExpr, subjectOverride);
    const regexpOverride = emitCoercedRegExpToLocal(ctx, fctx, coercion.coercedPatternArg ?? undefined, "");
    if (regexpOverride === null) return null;
    return emitRegexExecArrayCall(ctx, fctx, regexExpr ?? expr, subjExpr, {
      regexpOverride,
      inputOverride: () => {
        fctx.body.push({ op: "local.get", index: subjectLocal });
        return nativeStringType(ctx);
      },
    });
  }

  // Defensive: only the coercion form omits the regex expression.
  if (regexExpr === undefined) return null;
  const flags = staticRegExpFlags(ctx, regexExpr);
  if (flags === null) {
    reportStandaloneRegExpUnsupported(ctx, regexExpr, "String.prototype.match with dynamic RegExp flags");
    return null;
  }

  // §22.2.6.8 step 6 — GLOBAL match collects every [0] substring (#1913):
  // SetLastIndex(0), loop RegExpExec with AdvanceStringIndex, lastIndex ends
  // at 0. The eager walk lives in __regex_match_all; lastIndex is reset on
  // the struct afterwards (net spec effect of the loop).
  if (flags.includes("g")) {
    ensureNativeStringHelpers(ctx);
    const flattenIdx = ctx.nativeStrHelpers.get("__str_flatten");
    if (flattenIdx === undefined) {
      reportError(ctx, expr, "Codegen error: standalone RegExp backend missing native string helpers (#682).");
      return null;
    }
    const matchAllIdx = ensureRegexMatchAll(ctx);
    const matchVecTypeIdx = ensureRegexMatchVecType(ctx);
    const strTypeIdx = ctx.nativeStrTypeIdx;

    const loaded = loadStandaloneRegExpStruct(ctx, fctx, regexExpr);
    if (loaded === null) return null;
    const { regexpLocal, structTypeIdx } = loaded;

    const subjType = subjectOverride
      ? subjectOverride()
      : compileExpression(ctx, fctx, subjExpr, nativeStringType(ctx));
    if (subjType?.kind === "ref_null") fctx.body.push({ op: "ref.as_non_null" });
    fctx.body.push({ op: "call", funcIdx: flattenIdx });
    const subjLocal = allocLocal(fctx, `__re_gm_subj_${fctx.locals.length}`, { kind: "ref", typeIdx: strTypeIdx });
    fctx.body.push({ op: "local.set", index: subjLocal });

    // __regex_match_all(prog, classTable, nGroups, subjData, subjOff, subjLen, subject)
    fctx.body.push({ op: "local.get", index: regexpLocal });
    fctx.body.push({ op: "struct.get", typeIdx: structTypeIdx, fieldIdx: RE_FIELD_PROG });
    fctx.body.push({ op: "local.get", index: regexpLocal });
    fctx.body.push({ op: "struct.get", typeIdx: structTypeIdx, fieldIdx: RE_FIELD_CLASS_TABLE });
    fctx.body.push({ op: "local.get", index: regexpLocal });
    fctx.body.push({ op: "struct.get", typeIdx: structTypeIdx, fieldIdx: RE_FIELD_NGROUPS });
    fctx.body.push({ op: "local.get", index: subjLocal });
    fctx.body.push({ op: "struct.get", typeIdx: strTypeIdx, fieldIdx: 2 }); // data
    fctx.body.push({ op: "local.get", index: subjLocal });
    fctx.body.push({ op: "struct.get", typeIdx: strTypeIdx, fieldIdx: 1 }); // off
    fctx.body.push({ op: "local.get", index: subjLocal });
    fctx.body.push({ op: "struct.get", typeIdx: strTypeIdx, fieldIdx: 0 }); // len
    fctx.body.push({ op: "local.get", index: subjLocal });
    // nScratch (#1959) — PROGRESS empty-loop guard slots, last arg.
    fctx.body.push({ op: "local.get", index: regexpLocal });
    fctx.body.push({ op: "struct.get", typeIdx: structTypeIdx, fieldIdx: RE_FIELD_NSCRATCH });
    fctx.body.push({ op: "call", funcIdx: matchAllIdx });
    // lastIndex = 0 (net effect of the spec's exec loop on a global regex).
    fctx.body.push({ op: "local.get", index: regexpLocal });
    fctx.body.push({ op: "f64.const", value: 0 });
    fctx.body.push({ op: "struct.set", typeIdx: structTypeIdx, fieldIdx: RE_FIELD_LASTINDEX });
    return { kind: "ref_null", typeIdx: matchVecTypeIdx };
  }

  // Non-global match = RegExpExec (§22.2.6.8 step 5) — sticky regexps read
  // and advance lastIndex through the shared exec path.
  return emitRegexExecArrayCall(ctx, fctx, regexExpr, subjExpr, {
    gyLastIndex: flagsHaveGlobalOrSticky(flags),
    inputOverride: subjectOverride,
  });
}

/**
 * `String.prototype.matchAll(/re/g)` in standalone mode (#2161).
 *
 * §22.1.3.13 / §22.2.6.9: returns a RegExpStringIterator yielding the **full
 * match array** (with capture groups, `.index`, `.input`) for every match. The
 * native engine already builds per-match arrays via `__regex_capture_array`
 * (used by `exec` / non-global `match`); `__regex_match_all_arrays` drives the
 * eager AdvanceStringIndex loop collecting those capture-arrays into a vec. The
 * vec is iterable by the native-vec for-of / spread consumers (#2169), so
 * `for (const m of s.matchAll(re))` and `[...s.matchAll(re)]` both work without
 * a JS host.
 *
 * Narrowed slice: requires a static global (`g`) RegExp value. matchAll on a
 * non-global regex is a runtime TypeError (§22.1.3.13 step 4.a) — left to the
 * host/refusal path rather than mis-modelled. String-arg coercion
 * (`s.matchAll("x")` → `new RegExp("x","g")`) and dynamic flags fall through.
 */
export function tryCompileStandaloneStringMatchAll(
  ctx: CodegenContext,
  fctx: FunctionContext,
  expr: ts.CallExpression,
  propAccess: ts.PropertyAccessExpression,
  receiverOverride?: () => ValType | null,
): ValType | null | undefined {
  if (!ctx.standalone || propAccess.name.text !== "matchAll") return undefined;

  if (expr.arguments.length !== 1) return undefined;
  const argExpr = expr.arguments[0]!;
  const argType = ctx.checker.getTypeAtLocation(argExpr);
  if (!isGlobalRegExpType(argType) && !isKnownBackendCreatedRegExpReceiver(ctx, argExpr)) {
    return undefined; // string-arg / non-RegExp form → generic / refusal path
  }

  // String-method operand order: subject = receiver, regex = arg.
  return emitStandaloneRegExpMatchAllCore(ctx, fctx, expr, propAccess.expression, argExpr, receiverOverride);
}

/**
 * Operand-explicit core for `@@matchAll` semantics (§22.2.6.9). Shared by
 * `String.prototype.matchAll` and the `re[Symbol.matchAll](str)` protocol form.
 * Requires a static global (`g`) RegExp — non-global matchAll is a runtime
 * TypeError, left to the refusal path. Returns an iterable vec-of-capture-arrays
 * (`undefined` when the form falls through, e.g. non-global, dynamic flags).
 */
function emitStandaloneRegExpMatchAllCore(
  ctx: CodegenContext,
  fctx: FunctionContext,
  expr: ts.CallExpression,
  subjExpr: ts.Expression,
  regexExpr: ts.Expression,
  subjectOverride?: () => ValType | null,
): ValType | null | undefined {
  const flags = staticRegExpFlags(ctx, regexExpr);
  if (flags === null) {
    reportStandaloneRegExpUnsupported(ctx, regexExpr, "String.prototype.matchAll with dynamic RegExp flags");
    return null;
  }
  // matchAll REQUIRES a global regex (non-global throws TypeError); only the
  // well-formed `/…/g` form is handled here — others fall through to refusal.
  if (!flags.includes("g")) return undefined;

  if (!hasStandaloneRegExpEngine(ctx)) {
    reportStandaloneRegExpUnsupported(ctx, expr, "String.prototype.matchAll without an enabled standalone engine");
    return null;
  }

  ensureNativeStringHelpers(ctx);
  const flattenIdx = ctx.nativeStrHelpers.get("__str_flatten");
  if (flattenIdx === undefined) {
    reportError(ctx, expr, "Codegen error: standalone RegExp backend missing native string helpers (#682).");
    return null;
  }
  const matchAllArraysIdx = ensureRegexMatchAllArrays(ctx);
  const outerVecTypeIdx = ensureRegexMatchAllVecType(ctx);
  const strTypeIdx = ctx.nativeStrTypeIdx;

  const loaded = loadStandaloneRegExpStruct(ctx, fctx, regexExpr);
  if (loaded === null) return null;
  const { regexpLocal, structTypeIdx } = loaded;

  const subjType = subjectOverride ? subjectOverride() : compileExpression(ctx, fctx, subjExpr, nativeStringType(ctx));
  if (subjType?.kind === "ref_null") fctx.body.push({ op: "ref.as_non_null" });
  fctx.body.push({ op: "call", funcIdx: flattenIdx });
  const subjLocal = allocLocal(fctx, `__re_gma_subj_${fctx.locals.length}`, { kind: "ref", typeIdx: strTypeIdx });
  fctx.body.push({ op: "local.set", index: subjLocal });

  // __regex_match_all_arrays(prog, classTable, nGroups, subjData, subjOff, subjLen, subject, nScratch)
  fctx.body.push({ op: "local.get", index: regexpLocal });
  fctx.body.push({ op: "struct.get", typeIdx: structTypeIdx, fieldIdx: RE_FIELD_PROG });
  fctx.body.push({ op: "local.get", index: regexpLocal });
  fctx.body.push({ op: "struct.get", typeIdx: structTypeIdx, fieldIdx: RE_FIELD_CLASS_TABLE });
  fctx.body.push({ op: "local.get", index: regexpLocal });
  fctx.body.push({ op: "struct.get", typeIdx: structTypeIdx, fieldIdx: RE_FIELD_NGROUPS });
  fctx.body.push({ op: "local.get", index: subjLocal });
  fctx.body.push({ op: "struct.get", typeIdx: strTypeIdx, fieldIdx: 2 }); // data
  fctx.body.push({ op: "local.get", index: subjLocal });
  fctx.body.push({ op: "struct.get", typeIdx: strTypeIdx, fieldIdx: 1 }); // off
  fctx.body.push({ op: "local.get", index: subjLocal });
  fctx.body.push({ op: "struct.get", typeIdx: strTypeIdx, fieldIdx: 0 }); // len
  fctx.body.push({ op: "local.get", index: subjLocal });
  fctx.body.push({ op: "local.get", index: regexpLocal });
  fctx.body.push({ op: "struct.get", typeIdx: structTypeIdx, fieldIdx: RE_FIELD_NSCRATCH });
  fctx.body.push({ op: "call", funcIdx: matchAllArraysIdx });
  // matchAll spawns a fresh iterator; the regex's own lastIndex is unaffected
  // by the eager walk (the iterator holds its own cursor). Reset to 0 to match
  // the global-match net effect and keep a subsequent reuse well-defined.
  fctx.body.push({ op: "local.get", index: regexpLocal });
  fctx.body.push({ op: "f64.const", value: 0 });
  fctx.body.push({ op: "struct.set", typeIdx: structTypeIdx, fieldIdx: RE_FIELD_LASTINDEX });
  return { kind: "ref", typeIdx: outerVecTypeIdx };
}

/**
 * `String.prototype.replace(re, "str")` / `String.prototype.replaceAll(re,
 * "str")` in standalone mode (#1539 Phase 2c) — **literal replacement string
 * only**.
 *
 * Per ECMA-262 §22.1.3.19 / §22.2.6.11 (`RegExp.prototype[@@replace]`): walk
 * the subject, replacing each match (all matches when the regex has the `g`
 * flag or the method is `replaceAll`; otherwise just the first) with the
 * replacement string, returning the rebuilt string. The result is a
 * `$NativeString` — no array boundary, no host import.
 *
 * Refused (left to the narrowed gate): `$n`/`$&`/`$\``/`$'`/`$<name>`
 * substitution patterns and function replacers (Phase 2c follow-up — they need
 * capture-group materialization / closure dispatch), and `replaceAll` with a
 * non-global regex (which is a runtime `TypeError` per spec; let the host path
 * handle that diagnostic rather than mis-modelling it here).
 */
export function tryCompileStandaloneStringReplace(
  ctx: CodegenContext,
  fctx: FunctionContext,
  expr: ts.CallExpression,
  propAccess: ts.PropertyAccessExpression,
  receiverOverride?: () => ValType | null,
): ValType | null | undefined {
  if (!ctx.standalone && !ctx.wasi) return undefined;
  const method = propAccess.name.text;
  if (method !== "replace" && method !== "replaceAll") return undefined;

  // The enclosing native String method dispatcher has already established the
  // receiver lane; args = (regexp, replacement).
  if (expr.arguments.length !== 2) return undefined;
  const reExpr = expr.arguments[0]!;
  const replExpr = expr.arguments[1]!;

  const reType = ctx.checker.getTypeAtLocation(reExpr);
  if (!isGlobalRegExpType(reType) && !isKnownBackendCreatedRegExpReceiver(ctx, reExpr)) {
    return undefined; // not a RegExp arg → generic string path
  }

  // Function replacers require closure dispatch plus capture-argument
  // marshalling, which the host-free RegExp carrier does not implement yet.
  // Refuse before the standalone/WASI paths can diverge: standalone otherwise
  // reaches emitStandaloneRegExpReplaceCore, while WASI falls through to
  // unsatisfiable host-string imports and reports the wrong failure.
  const replacerRefusal = tryRefuseHostFreeRegExpReplacer(ctx, fctx, replExpr, method);
  if (replacerRefusal !== undefined) return replacerRefusal;

  // WASI only joins the shared refusal above. Its supported RegExp replacement
  // behavior is otherwise unchanged; the native RegExp engine remains the
  // standalone target's lowering.
  if (!ctx.standalone) return undefined;

  const flags = staticRegExpFlags(ctx, reExpr);
  if (flags === null) return undefined;
  const reHasGlobal = flags.includes("g");
  // `replaceAll` requires a global regex (spec §22.1.3.20 step 4 throws
  // TypeError otherwise). Leave that error to the host path; only handle the
  // well-formed `replaceAll(/…/g, …)` here.
  if (method === "replaceAll" && !reHasGlobal) return undefined;
  // For `replace`, global is honored (replace-all when `g`, first-only else).
  const globalReplace = method === "replaceAll" || reHasGlobal;

  // String-method operand order: subject = receiver, regex = arg[0].
  return emitStandaloneRegExpReplaceCore(
    ctx,
    fctx,
    expr,
    propAccess.expression,
    reExpr,
    replExpr,
    globalReplace,
    method,
    receiverOverride,
  );
}

/**
 * Commit the narrowed host-free refusal for a RegExp replacement value that
 * cannot use the native string-replacement path. Function replacers need
 * closure dispatch plus capture-argument marshalling; other non-string values
 * need ToString support. Neither is available on this carrier yet.
 *
 * The typed `unreachable` is intentional: a null result is a speculative miss
 * to compileExpression (#1919), which rolls back diagnostics. Returning a real
 * ValType commits the fatal error and prevents silent broken-binary emission.
 */
function tryRefuseHostFreeRegExpReplacer(
  ctx: CodegenContext,
  fctx: FunctionContext,
  replExpr: ts.Expression,
  diag: string,
): ValType | undefined {
  if (isStringLikeArg(ctx, replExpr)) return undefined;
  reportStandaloneRegExpUnsupported(
    ctx,
    replExpr,
    `${diag} with a function (or non-string) replacer (#1913 follow-up)`,
  );
  fctx.body.push({ op: "unreachable" });
  return nativeStringType(ctx);
}

/**
 * Operand-explicit core for `@@replace` semantics (§22.2.6.11). Shared by
 * `String.prototype.replace`/`replaceAll` (subject is the receiver, regex is
 * arg[0]) and the `re[Symbol.replace](str, replacement)` protocol form (regex is
 * the receiver, subject is arg[0]). `globalReplace` is resolved by the caller
 * from the method (`replaceAll`) and/or the regex `g` flag. `diag` names the
 * surface (`replace`/`replaceAll`/`@@replace`) for refusal messages.
 *
 * Returns a `$NativeString` (no array boundary, no host import). A non-string
 * replacement (function replacer) stays a narrowed refusal.
 */
function emitStandaloneRegExpReplaceCore(
  ctx: CodegenContext,
  fctx: FunctionContext,
  expr: ts.CallExpression,
  subjExpr: ts.Expression,
  reExpr: ts.Expression,
  replExpr: ts.Expression,
  globalReplace: boolean,
  diag: string,
  subjectOverride?: () => ValType | null,
): ValType | null {
  // Replacement must be a STRING (any string expression — `$`-substitution
  // patterns are expanded at runtime by __regex_get_substitution per
  // §22.2.6.11, #1913). Function replacers need closure dispatch with
  // capture-arg marshalling and stay a narrowed refusal.
  const replacerRefusal = tryRefuseHostFreeRegExpReplacer(ctx, fctx, replExpr, diag);
  if (replacerRefusal !== undefined) return replacerRefusal;

  if (!hasStandaloneRegExpEngine(ctx)) {
    reportStandaloneRegExpUnsupported(ctx, expr, `${diag} without an enabled standalone engine`);
    return null;
  }

  ensureNativeStringHelpers(ctx);
  const flattenIdx = ctx.nativeStrHelpers.get("__str_flatten");
  if (flattenIdx === undefined) {
    reportError(ctx, expr, "Codegen error: standalone RegExp backend missing native string helpers (#682).");
    return null;
  }
  const replaceIdx = ensureRegexReplace(ctx);
  const strTypeIdx = ctx.nativeStrTypeIdx;

  // --- the compiled $NativeRegExp struct ---
  const loaded = loadStandaloneRegExpStruct(ctx, fctx, reExpr);
  if (loaded === null) return null;
  const { regexpLocal, structTypeIdx } = loaded;

  // --- subject: flatten the subject string ---
  const subjType = subjectOverride ? subjectOverride() : compileExpression(ctx, fctx, subjExpr, nativeStringType(ctx));
  if (subjType?.kind === "ref_null") fctx.body.push({ op: "ref.as_non_null" });
  fctx.body.push({ op: "call", funcIdx: flattenIdx });
  const subjLocal = allocLocal(fctx, `__re_subj_${fctx.locals.length}`, { kind: "ref", typeIdx: strTypeIdx });
  fctx.body.push({ op: "local.set", index: subjLocal });

  // --- replacement: flatten ---
  const replType = compileExpression(ctx, fctx, replExpr, nativeStringType(ctx));
  if (replType?.kind === "ref_null") fctx.body.push({ op: "ref.as_non_null" });
  fctx.body.push({ op: "call", funcIdx: flattenIdx });
  const replLocal = allocLocal(fctx, `__re_repl_${fctx.locals.length}`, { kind: "ref", typeIdx: strTypeIdx });
  fctx.body.push({ op: "local.set", index: replLocal });

  // __regex_replace(prog, classTable, nGroups, subjData, subjOff, subjLen, subject, replacement, global)
  fctx.body.push({ op: "local.get", index: regexpLocal });
  fctx.body.push({ op: "struct.get", typeIdx: structTypeIdx, fieldIdx: RE_FIELD_PROG });
  fctx.body.push({ op: "local.get", index: regexpLocal });
  fctx.body.push({ op: "struct.get", typeIdx: structTypeIdx, fieldIdx: RE_FIELD_CLASS_TABLE });
  fctx.body.push({ op: "local.get", index: regexpLocal });
  fctx.body.push({ op: "struct.get", typeIdx: structTypeIdx, fieldIdx: RE_FIELD_NGROUPS });
  fctx.body.push({ op: "local.get", index: subjLocal });
  fctx.body.push({ op: "struct.get", typeIdx: strTypeIdx, fieldIdx: 2 }); // data
  fctx.body.push({ op: "local.get", index: subjLocal });
  fctx.body.push({ op: "struct.get", typeIdx: strTypeIdx, fieldIdx: 1 }); // off
  fctx.body.push({ op: "local.get", index: subjLocal });
  fctx.body.push({ op: "struct.get", typeIdx: strTypeIdx, fieldIdx: 0 }); // len
  fctx.body.push({ op: "local.get", index: subjLocal });
  fctx.body.push({ op: "local.get", index: replLocal });
  fctx.body.push({ op: "i32.const", value: globalReplace ? 1 : 0 });
  // nScratch (#1959) — PROGRESS empty-loop guard slots.
  fctx.body.push({ op: "local.get", index: regexpLocal });
  fctx.body.push({ op: "struct.get", typeIdx: structTypeIdx, fieldIdx: RE_FIELD_NSCRATCH });
  // #2588 — names table for `$<name>` substitution: [count, (idx,len,ch...)*].
  // Empty (count=0) when the pattern has no named groups → `$<…>` stays literal.
  for (const instr of buildRegexNamesTableInstrs(ctx, reExpr)) fctx.body.push(instr);
  fctx.body.push({ op: "call", funcIdx: replaceIdx });
  return nativeStringType(ctx);
}

/**
 * Build the `$<name>` names-table i32 array (#2588) for a static RegExp:
 * `[count, (capIdx, nameLen, ch0, ch1, …)*]`. Empty (`[0]` → count 0) when the
 * pattern has no named groups or its static form can't be recovered.
 */
function buildRegexNamesTableInstrs(ctx: CodegenContext, reExpr: ts.Expression): Instr[] {
  const values: number[] = [];
  const meta = staticRegExpGroupMeta(ctx, reExpr);
  const entries: Array<[string, number]> = meta !== null ? [...meta.groupNames.entries()] : [];
  values.push(entries.length); // count
  for (const [name, idx] of entries) {
    values.push(idx); // 1-based capture index
    values.push(name.length); // name length (UTF-16 code units)
    for (let k = 0; k < name.length; k++) values.push(name.charCodeAt(k));
  }
  return i32ArrayLiteralInstrs(ctx, values);
}

/**
 * `String.prototype.split(re)` in standalone mode (#1539 Phase 2c) —
 * non-capturing, non-nullable static RegExp separator only.
 *
 * Capturing-group split has extra result interleaving semantics, and nullable
 * separators need the full SplitMatch/AdvanceStringIndex edge-case handling.
 * Both stay narrowed refusals until the capture-array/string-method follow-up.
 */
export function tryCompileStandaloneStringSplit(
  ctx: CodegenContext,
  fctx: FunctionContext,
  expr: ts.CallExpression,
  propAccess: ts.PropertyAccessExpression,
  receiverOverride?: () => ValType | null,
): ValType | null | undefined {
  if (!ctx.standalone || propAccess.name.text !== "split") return undefined;

  if (expr.arguments.length === 0) return undefined;
  const reExpr = expr.arguments[0]!;
  const reType = ctx.checker.getTypeAtLocation(reExpr);
  if (!isGlobalRegExpType(reType) && !isKnownBackendCreatedRegExpReceiver(ctx, reExpr)) {
    return undefined; // not a RegExp arg -> native string split / generic path
  }

  if (expr.arguments.length > 2) {
    reportStandaloneRegExpUnsupported(ctx, expr.arguments[2] ?? expr, "String.prototype.split arities above two");
    return null;
  }
  const limitExpr = expr.arguments[1];

  // String-method operand order: subject = receiver, regex = arg[0].
  return emitStandaloneRegExpSplitCore(
    ctx,
    fctx,
    expr,
    propAccess.expression,
    reExpr,
    limitExpr,
    "String.prototype.split",
    receiverOverride,
  );
}

/**
 * Operand-explicit core for `@@split` semantics (§22.2.6.14). Shared by
 * `String.prototype.split` (subject is the receiver, separator regex is arg[0],
 * limit is arg[1]) and the `re[Symbol.split](str, limit)` protocol form (regex
 * is the receiver, subject is arg[0], limit is arg[1]). `diag` names the surface
 * for refusal messages. Returns a native-string vec.
 */
function emitStandaloneRegExpSplitCore(
  ctx: CodegenContext,
  fctx: FunctionContext,
  expr: ts.CallExpression,
  subjExpr: ts.Expression,
  reExpr: ts.Expression,
  limitExpr: ts.Expression | undefined,
  diag: string,
  subjectOverride?: () => ValType | null,
): ValType | null {
  const meta = staticRegExpPatternFlags(ctx, reExpr);
  if (meta === null) {
    reportStandaloneRegExpUnsupported(ctx, reExpr, `${diag} with dynamic RegExp separators`);
    return null;
  }

  // Compile-time validity gate only — unsupported patterns/flags surface the
  // narrowed refusal here instead of mid-emission.
  if (compileStaticStandaloneRegExp(ctx, meta.pattern, meta.flags, reExpr) === null) return null;

  if (!hasStandaloneRegExpEngine(ctx)) {
    reportStandaloneRegExpUnsupported(ctx, expr, `${diag} without an enabled standalone engine`);
    return null;
  }

  ensureNativeStringHelpers(ctx);
  const flattenIdx = ctx.nativeStrHelpers.get("__str_flatten");
  if (flattenIdx === undefined) {
    reportError(ctx, expr, "Codegen error: standalone RegExp backend missing native string helpers (#682).");
    return null;
  }
  const splitIdx = ensureRegexSplit(ctx);
  const strTypeIdx = ctx.nativeStrTypeIdx;

  const loaded = loadStandaloneRegExpStruct(ctx, fctx, reExpr);
  if (loaded === null) return null;
  const { regexpLocal, structTypeIdx } = loaded;

  const subjType = subjectOverride ? subjectOverride() : compileExpression(ctx, fctx, subjExpr, nativeStringType(ctx));
  if (subjType?.kind === "ref_null") fctx.body.push({ op: "ref.as_non_null" });
  fctx.body.push({ op: "call", funcIdx: flattenIdx });
  const subjLocal = allocLocal(fctx, `__re_split_subj_${fctx.locals.length}`, { kind: "ref", typeIdx: strTypeIdx });
  fctx.body.push({ op: "local.set", index: subjLocal });

  // __regex_split(prog, classTable, nGroups, subjData, subjOff, subjLen, subject)
  fctx.body.push({ op: "local.get", index: regexpLocal });
  fctx.body.push({ op: "struct.get", typeIdx: structTypeIdx, fieldIdx: RE_FIELD_PROG });
  fctx.body.push({ op: "local.get", index: regexpLocal });
  fctx.body.push({ op: "struct.get", typeIdx: structTypeIdx, fieldIdx: RE_FIELD_CLASS_TABLE });
  fctx.body.push({ op: "local.get", index: regexpLocal });
  fctx.body.push({ op: "struct.get", typeIdx: structTypeIdx, fieldIdx: RE_FIELD_NGROUPS });
  fctx.body.push({ op: "local.get", index: subjLocal });
  fctx.body.push({ op: "struct.get", typeIdx: strTypeIdx, fieldIdx: 2 }); // data
  fctx.body.push({ op: "local.get", index: subjLocal });
  fctx.body.push({ op: "struct.get", typeIdx: strTypeIdx, fieldIdx: 1 }); // off
  fctx.body.push({ op: "local.get", index: subjLocal });
  fctx.body.push({ op: "struct.get", typeIdx: strTypeIdx, fieldIdx: 0 }); // len
  fctx.body.push({ op: "local.get", index: subjLocal });
  // lim (§22.2.6.14 step 12: undefined → 2^32-1, else ToUint32(limit)).
  // -1 reinterprets as 0xFFFFFFFF under the helper's unsigned compares.
  // (#2161 B2) A statically-`undefined` limit (`s.split(re, undefined)`)
  // takes the same unbounded branch — compiling it lowered to f64 NaN and
  // ToUint32(NaN) = 0, truncating every such split to `[]`.
  if (limitExpr === undefined || isStaticallyUndefinedExpr(limitExpr)) {
    fctx.body.push({ op: "i32.const", value: -1 });
  } else {
    const limType = compileExpression(ctx, fctx, limitExpr, { kind: "f64" });
    if (!limType) return null;
    if (limType.kind === "f64") {
      // ToUint32: trunc-sat then wrap — saturating trunc + i32 reinterpret
      // matches ToUint32 for the integer limits tests exercise.
      fctx.body.push({ op: "i32.trunc_sat_f64_s" });
    } else if (limType.kind !== "i32") {
      reportStandaloneRegExpUnsupported(ctx, limitExpr, `${diag} with non-numeric limits`);
      return null;
    }
  }
  // nScratch (#1959) — PROGRESS empty-loop guard slots, last arg.
  fctx.body.push({ op: "local.get", index: regexpLocal });
  fctx.body.push({ op: "struct.get", typeIdx: structTypeIdx, fieldIdx: RE_FIELD_NSCRATCH });
  fctx.body.push({ op: "call", funcIdx: splitIdx });

  const nstrVecTypeIdx = ctx.vecTypeMap.get(`ref_${ctx.anyStrTypeIdx}`);
  if (nstrVecTypeIdx === undefined) {
    reportError(ctx, expr, "Codegen error: standalone RegExp split missing native string vec type (#1539).");
    return null;
  }
  return { kind: "ref", typeIdx: nstrVecTypeIdx };
}

/**
 * `re[Symbol.match](str)` / `re[Symbol.matchAll](str)` / `re[Symbol.search](str)`
 * — the explicit well-known-symbol protocol forms (§22.2.6) — in standalone
 * mode (#2161).
 *
 * These are the operand-swapped duals of `String.prototype.match/matchAll/
 * search`: the RegExp is the **receiver** and the string is the **argument**.
 * The native engine is operand-order agnostic (the lower-level emitters take an
 * explicit regex expression + subject expression), so each method reuses the
 * exact same core that backs the corresponding String.prototype method — there
 * is no separate engine path and no host import.
 *
 * Gating mirrors the String.prototype path: the receiver must be a static /
 * backend-created RegExp value (so the pattern + flags are known at compile
 * time) and the (first) argument must be string-like. Dynamic-flag receivers
 * and string-coercion arguments return `undefined`, so the caller falls through
 * to the existing `__regex_symbol_call` host import (JS-host mode) or the
 * standalone refusal.
 *
 * `@@replace` / `@@split` carry a second operand (replacement / limit). They
 * reuse the same operand-explicit cores as `String.prototype.replace`/`split`
 * with the operands swapped (regex = receiver, subject = arg[0]).
 *
 * `methodName` is the `@@<id>` sentinel the element-access dispatcher resolved
 * for the computed Symbol key (e.g. `"@@match"`).
 */
export function tryCompileStandaloneRegExpSymbolCall(
  ctx: CodegenContext,
  fctx: FunctionContext,
  expr: ts.CallExpression,
  regexExpr: ts.Expression,
  methodName: string,
): ValType | null | undefined {
  if (!ctx.standalone && !ctx.wasi) return undefined;

  const symbolMethod =
    methodName === "@@match"
      ? "match"
      : methodName === "@@matchAll"
        ? "matchAll"
        : methodName === "@@search"
          ? "search"
          : methodName === "@@replace"
            ? "replace"
            : methodName === "@@split"
              ? "split"
              : undefined;
  if (symbolMethod === undefined) return undefined;

  // Receiver must be a static / backend-created RegExp (pattern + flags known
  // at compile time); a dynamic / `any`-typed receiver falls through so the
  // host import can do the fully-dynamic dispatch.
  const recvType = ctx.checker.getTypeAtLocation(regexExpr);
  if (!isGlobalRegExpType(recvType) && !isKnownBackendCreatedRegExpReceiver(ctx, regexExpr)) {
    return undefined;
  }

  // arg[0] is the subject string in every form; string-coercion
  // (`re[Symbol.match](42)`) falls through to the host path which does ToString.
  if (expr.arguments.length < 1) return undefined;
  const strExpr = expr.arguments[0]!;
  if (!isStringLikeArg(ctx, strExpr)) return undefined;

  // WASI shares only the fail-loud function-replacer contract. Supported
  // RegExp symbol-method behavior otherwise stays on its existing path.
  if (!ctx.standalone) {
    if (symbolMethod === "replace" && expr.arguments.length === 2) {
      return tryRefuseHostFreeRegExpReplacer(ctx, fctx, expr.arguments[1]!, "@@replace");
    }
    return undefined;
  }

  // Operand order: subject = the string ARGUMENT (arg[0]), regex = the RECEIVER.
  switch (symbolMethod) {
    case "search":
      if (expr.arguments.length !== 1) return undefined;
      return emitStandaloneRegExpSearchCore(ctx, fctx, expr, strExpr, regexExpr);
    case "match":
      if (expr.arguments.length !== 1) return undefined;
      return emitStandaloneRegExpMatchCore(ctx, fctx, expr, strExpr, regexExpr);
    case "matchAll":
      if (expr.arguments.length !== 1) return undefined;
      return emitStandaloneRegExpMatchAllCore(ctx, fctx, expr, strExpr, regexExpr);
    case "replace": {
      // `re[Symbol.replace](str, replacement)` — §22.2.6.11. Requires exactly
      // the (subject, replacement) pair; the replacement string-likeness is
      // checked inside the core (function replacers stay a narrowed refusal).
      if (expr.arguments.length !== 2) return undefined;
      const replExpr = expr.arguments[1]!;
      // @@replace honors the regex's own `g` flag (replace-all when global,
      // first-only otherwise); there is no replaceAll distinction here.
      const flags = staticRegExpFlags(ctx, regexExpr);
      if (flags === null) return undefined;
      const globalReplace = flags.includes("g");
      return emitStandaloneRegExpReplaceCore(ctx, fctx, expr, strExpr, regexExpr, replExpr, globalReplace, "@@replace");
    }
    case "split": {
      // `re[Symbol.split](str[, limit])` — §22.2.6.14. limit is optional.
      if (expr.arguments.length > 2) return undefined;
      const limitExpr = expr.arguments[1];
      return emitStandaloneRegExpSplitCore(ctx, fctx, expr, strExpr, regexExpr, limitExpr, "@@split");
    }
  }
}
