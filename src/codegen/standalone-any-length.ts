// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
/**
 * `recv.length` on a statically `any` / `unknown` receiver in `--target
 * standalone` / WASI, receiver already on the stack as an `externref`.
 *
 * ## The gap (#6736)
 * This read used to answer a NUMBER for every receiver: the string arm read
 * `$AnyString.len`, a closure asked its metadata, and everything else fell to
 * `__extern_length` — the object runtime's array-like reader, which is
 * ToLength(Get(o, "length")) and so turns an ABSENT `length` into `0`. For
 * `.length` that is wrong: §7.3.2 Get of a missing property is `undefined`.
 * `{}.length`, `Object.create(p).length` and — the lodash case — a
 * constructor's `prototype` object all read `0`, so
 * `isArrayLike(LazyWrapper.prototype)` (`isLength(value.length)`) answered
 * true, `keys()` took `arrayLikeKeys`, and lodash's module init threw
 * `called value is not a function`. JS-host mode fixed the same bug in #2580
 * M2 by routing through `emitDynGet`; this is the standalone counterpart.
 *
 * ## The lowering
 * The read now produces an `externref` (a boxed number or `undefined`):
 *   1. `$AnyString`            → box(len)                  (unchanged value)
 *   2. builtin-fn metadata hit → the metadata value         (unchanged value)
 *   3. closure                 → own `length` or 0 boxed    (unchanged value)
 *   4. ordinary `$Object`      → `__extern_get(recv, "length")` — the real
 *      Get, prototype chain included, `undefined` when absent.
 *   5. anything else           → box(`__extern_length`)     (unchanged value)
 * Only arm 4 changes a value. It is gated on the object runtime's `$Object`
 * because `__extern_length` is the only reader that knows every array-like
 * carrier (vec, TypedArray view with its auto-length / detached states,
 * arguments, tuple) — a Get-based read regressed ~70 standalone test262 rows
 * when it was applied to those.
 */
import { ts } from "../ts-api.js";
import type { Instr, ValType } from "../ir/types.js";
import { allocLocal } from "./context/locals.js";
import type { CodegenContext, FunctionContext } from "./context/types.js";
import { getFuncRefWrapperRootTypeIdx } from "./closures.js";
import { stringConstantExternrefInstrs } from "./native-strings.js";
import { ensureObjectRuntime } from "./object-runtime.js";
import { addStringConstantGlobal } from "./registry/imports.js";
import { ensureLateImport, flushLateImportShifts } from "./shared.js";
import { coercionInstrs } from "./type-coercion.js";

const EXTERNREF: ValType = { kind: "externref" };
const I32: ValType = { kind: "i32" };

function ifExtern(cond: Instr[], then: Instr[], otherwise: Instr[]): Instr[] {
  return [...cond, { op: "if", blockType: { kind: "val", type: EXTERNREF }, then, else: otherwise }];
}

/** Stack `[externref recv] → [externref]`; see the file header. */
export function emitStandaloneAnyLengthGet(ctx: CodegenContext, fctx: FunctionContext): ValType {
  const closureRootIdx = getFuncRefWrapperRootTypeIdx(ctx);
  ensureObjectRuntime(ctx);
  const objectTypeIdx = ctx.objectRuntimeTypes?.objectTypeIdx;
  ensureLateImport(ctx, "__extern_length", [EXTERNREF], [{ kind: "f64" }]);
  ensureLateImport(ctx, "__extern_get", [EXTERNREF, EXTERNREF], [EXTERNREF]);
  if (closureRootIdx !== undefined) ensureLateImport(ctx, "__extern_is_undefined", [EXTERNREF], [I32]);
  // (#2175 S3b-3) The metadata consult also answers `$__ta_ctor` (3), so it is
  // asked for ANY receiver whenever either carrier family can exist.
  const taCtorRegistered = ctx.taCtorTypeIdx !== undefined && ctx.taCtorTypeIdx >= 0;
  const wantMeta = closureRootIdx !== undefined || taCtorRegistered;
  if (wantMeta) ensureLateImport(ctx, "__builtinfn_get_meta", [EXTERNREF, EXTERNREF], [EXTERNREF]);
  addStringConstantGlobal(ctx, "length");
  // A fresh copy per use: the late-import shift rewrites `call` operands in
  // place, so one Instr object spliced into two arms would be shifted twice.
  const boxTemplate = coercionInstrs(ctx, I32, EXTERNREF, fctx);
  const boxI32 = (): Instr[] => structuredClone(boxTemplate);
  flushLateImportShifts(ctx, fctx);

  const lenFn = ctx.funcMap.get("__extern_length");
  const externGetFn = ctx.funcMap.get("__extern_get");
  const isUndefinedFn = ctx.funcMap.get("__extern_is_undefined");
  const bfnGetMetaFn = wantMeta ? ctx.funcMap.get("__builtinfn_get_meta") : undefined;
  const recv = allocLocal(fctx, `__alen_recv_${fctx.locals.length}`, EXTERNREF);
  const get = (): Instr[] => [{ op: "local.get", index: recv }];
  const key = (): Instr[] => stringConstantExternrefInstrs(ctx, "length");
  const boxedZero = (): Instr[] => [{ op: "i32.const", value: 0 }, ...boxI32()];

  // Arm 4: everything that is not an ordinary object keeps the old value —
  // `__extern_length` owns the vec / TypedArray-view (auto-length, detached)
  // / arguments / tuple carriers, and a Get-based read would miss them.
  const legacyLength = (): Instr[] =>
    lenFn !== undefined
      ? [...get(), { op: "call", funcIdx: lenFn }, { op: "i32.trunc_sat_f64_s" }, ...boxI32()]
      : boxedZero();
  // Arm 5: an ordinary `$Object` answers the real Get — the value, or
  // `undefined` when neither it nor its prototype chain has a `length`.
  let chain: Instr[] =
    objectTypeIdx !== undefined && externGetFn !== undefined
      ? ifExtern(
          [...get(), { op: "any.convert_extern" }, { op: "ref.test", typeIdx: objectTypeIdx }],
          [...get(), ...key(), { op: "call", funcIdx: externGetFn }],
          legacyLength(),
        )
      : legacyLength();

  // Arm 3: a closure without metadata — its own (possibly redefined) `length`
  // from the closure bag, else Function.prototype.length (0).
  if (closureRootIdx !== undefined) {
    const own = allocLocal(fctx, `__alen_own_${fctx.locals.length}`, EXTERNREF);
    const ownOrZero: Instr[] =
      externGetFn !== undefined && isUndefinedFn !== undefined
        ? ifExtern(
            [
              ...get(),
              ...key(),
              { op: "call", funcIdx: externGetFn },
              { op: "local.tee", index: own },
              { op: "call", funcIdx: isUndefinedFn },
            ],
            boxedZero(),
            [{ op: "local.get", index: own }],
          )
        : boxedZero();
    chain = ifExtern(
      [...get(), { op: "any.convert_extern" }, { op: "ref.test", typeIdx: closureRootIdx }],
      ownOrZero,
      chain,
    );
  }
  // Arm 2: builtin-function / `$__ta_ctor` metadata, asked first for any receiver.
  if (bfnGetMetaFn !== undefined) {
    const meta = allocLocal(fctx, `__alen_meta_${fctx.locals.length}`, EXTERNREF);
    chain = ifExtern(
      [
        ...get(),
        ...key(),
        { op: "call", funcIdx: bfnGetMetaFn },
        { op: "local.tee", index: meta },
        { op: "ref.is_null" },
      ],
      chain,
      [{ op: "local.get", index: meta }],
    );
  }
  // Arm 1: a native string.
  if (ctx.nativeStrings && ctx.anyStrTypeIdx >= 0) {
    chain = ifExtern(
      [...get(), { op: "any.convert_extern" }, { op: "ref.test", typeIdx: ctx.anyStrTypeIdx }],
      [
        ...get(),
        { op: "any.convert_extern" },
        { op: "ref.cast", typeIdx: ctx.anyStrTypeIdx },
        { op: "struct.get", typeIdx: ctx.anyStrTypeIdx, fieldIdx: 0 },
        ...boxI32(),
      ],
      chain,
    );
  }
  fctx.body.push({ op: "local.set", index: recv }, ...chain);
  return EXTERNREF;
}

const NUMERIC_BINARY = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.LessThanEqualsToken,
  ts.SyntaxKind.GreaterThanEqualsToken,
  ts.SyntaxKind.PlusToken,
  ts.SyntaxKind.MinusToken,
  ts.SyntaxKind.AsteriskToken,
  ts.SyntaxKind.SlashToken,
  ts.SyntaxKind.PercentToken,
  ts.SyntaxKind.AsteriskAsteriskToken,
  ts.SyntaxKind.LessThanLessThanToken,
  ts.SyntaxKind.GreaterThanGreaterThanToken,
  ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken,
  ts.SyntaxKind.AmpersandToken,
  ts.SyntaxKind.BarToken,
  ts.SyntaxKind.CaretToken,
  ts.SyntaxKind.PlusEqualsToken,
  ts.SyntaxKind.MinusEqualsToken,
  ts.SyntaxKind.AsteriskEqualsToken,
  ts.SyntaxKind.SlashEqualsToken,
  ts.SyntaxKind.PercentEqualsToken,
]);
const EQUALITY = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
]);

function isNumericLengthPeer(e: ts.Expression): boolean {
  while (ts.isParenthesizedExpression(e)) e = e.expression;
  if (ts.isNumericLiteral(e)) return true;
  if (ts.isPrefixUnaryExpression(e) && ts.isNumericLiteral(e.operand)) return true;
  return ts.isPropertyAccessExpression(e) && e.name.text === "length";
}

/**
 * (#6736) Is this `.length` read an operand of arithmetic, a relational test,
 * an index, or an equality against another length / a number literal
 * (`i < a.length`, `a.length - 1`, `b.length !== a.length`, `n.length === 0`)?
 * Those keep the numeric ToLength read: switching them to the externref Get
 * changes the module-wide lowering of the comparison (it pulls in the `$AnyValue`
 * equality helpers) for no gain the callers can observe. Every other position —
 * a call argument (`isLength(value.length)`), an initializer, a return,
 * `typeof`, `=== undefined` — gets the real Get.
 */
export function lengthReadIsNumericOperand(expr: ts.Expression): boolean {
  let node: ts.Node = expr;
  while (ts.isParenthesizedExpression(node.parent)) node = node.parent;
  const parent = node.parent;
  if (ts.isBinaryExpression(parent)) {
    const op = parent.operatorToken.kind;
    if (NUMERIC_BINARY.has(op)) return true;
    if (EQUALITY.has(op)) return isNumericLengthPeer(parent.left === node ? parent.right : parent.left);
    return false;
  }
  if (ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent)) {
    return parent.operator !== ts.SyntaxKind.ExclamationToken;
  }
  return ts.isElementAccessExpression(parent) && parent.argumentExpression === node;
}

/**
 * (#6736) Stack `[externref recv] → [value]`: the real Get in a value position,
 * the caller's numeric ToLength lowering (`numericRead`) for a numeric operand.
 */
export function emitStandaloneAnyLengthRead(
  ctx: CodegenContext,
  fctx: FunctionContext,
  expr: ts.Expression,
  numericRead: (ctx: CodegenContext, fctx: FunctionContext) => ValType,
): ValType {
  return lengthReadIsNumericOperand(expr) ? numericRead(ctx, fctx) : emitStandaloneAnyLengthGet(ctx, fctx);
}
