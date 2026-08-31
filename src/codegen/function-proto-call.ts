// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
/**
 * Native body for the reflective `%Function.prototype%.call` value.
 *
 * Direct source calls such as `fn.call(thisArg, ...args)` usually lower through
 * the static closure-method fast path. The runtime-eval interpreter cannot use
 * that path: a dynamic `fn.call(...)` is bytecode `GetProp "call"` followed by
 * generic `Call`, which materializes this native-prototype closure. Leaving the
 * reflective value on the generic refusal body therefore made every such call
 * throw even though the direct spelling worked.
 *
 * The receiver-aware variadic native-proto ABI is `(self, thisValue, argsVec)`.
 * For this particular member, `thisValue` is the FUNCTION TO INVOKE, while
 * `argsVec` is `[thisArg, ...callArgs]`. Split the first element from the tail
 * and delegate the actual dynamic dispatch to `__apply_closure`; that is the
 * one bridge that preserves interpreted callbacks, AOT/runtime-eval carriers,
 * native-proto closures, bound functions, and their receiver values.
 */

import type { Instr, ValType } from "../ir/types.js";
import { canonicalUndefinedExternInstrs } from "./any-helpers.js";
import { allocLocal } from "./context/locals.js";
import type { CodegenContext, FunctionContext } from "./context/types.js";
import { buildThrowJsErrorInstrs } from "./js-errors.js";
import { ensureObjVecBuilders, reserveApplyClosure } from "./object-runtime.js";
import { getArrTypeIdxFromVec } from "./registry/types.js";

/**
 * §20.2.3.3 `Function.prototype.call` as a first-class native-prototype
 * closure. Params are `0=self`, `1=target function`, and `2=argsVec`.
 */
export function emitFunctionProtoCallBody(ctx: CodegenContext, fctx: FunctionContext): ValType | null {
  if (!ctx.standalone) return null;

  // Validate every shape before emitting into fctx. `makeGlue` composes this
  // with `??`, so declining after a partial body would leave an orphaned
  // preamble ahead of the legacy refusal.
  const argsParam = fctx.params[2]?.type;
  if (!argsParam || (argsParam.kind !== "ref" && argsParam.kind !== "ref_null")) return null;
  const argsArrTypeIdx = getArrTypeIdxFromVec(ctx, argsParam.typeIdx);
  const argsArrDef = ctx.mod.types[argsArrTypeIdx];
  if (argsArrDef?.kind !== "array" || argsArrDef.element.kind !== "externref") return null;

  // The tail reaches `__apply_closure` as an ordinary `$ObjVec`; register this
  // whole dependency set before any function index is captured in the body.
  ensureObjVecBuilders(ctx);
  reserveApplyClosure(ctx);
  if (ctx.funcMap.get("__typeof_function") === undefined) return null;

  // A non-callable target must throw before inspecting any supplied arguments.
  // `__apply_closure` intentionally uses an undefined sentinel for its own
  // generic miss, so this native boundary owns the observable IsCallable throw.
  const throwNotCallable = buildThrowJsErrorInstrs(
    ctx,
    "TypeError",
    "Function.prototype.call called on non-callable receiver",
    { flush: fctx },
  );

  // Resolve by name after the throwing helper has settled its dependencies;
  // this preserves the late-import index-shift invariant.
  const typeofFunctionIdx = ctx.funcMap.get("__typeof_function")!;
  const objVecNewIdx = ctx.funcMap.get("__objvec_new")!;
  const objVecPushIdx = ctx.funcMap.get("__objvec_push")!;
  const applyClosureIdx = ctx.funcMap.get("__apply_closure")!;

  const thisArgLocal = allocLocal(fctx, `__fn_call_this_${fctx.locals.length}`, { kind: "externref" });
  const tailLocal = allocLocal(fctx, `__fn_call_tail_${fctx.locals.length}`, { kind: "externref" });
  const argsDataLocal = allocLocal(fctx, `__fn_call_data_${fctx.locals.length}`, {
    kind: "ref_null",
    typeIdx: argsArrTypeIdx,
  });
  const argsLengthLocal = allocLocal(fctx, `__fn_call_len_${fctx.locals.length}`, { kind: "i32" });
  const cursorLocal = allocLocal(fctx, `__fn_call_i_${fctx.locals.length}`, { kind: "i32" });

  const copyTail: Instr[] = [
    { op: "local.get", index: tailLocal },
    { op: "local.get", index: argsDataLocal },
    { op: "ref.as_non_null" },
    { op: "local.get", index: cursorLocal },
    { op: "array.get", typeIdx: argsArrTypeIdx },
    { op: "call", funcIdx: objVecPushIdx },
    { op: "local.get", index: cursorLocal },
    { op: "i32.const", value: 1 },
    { op: "i32.add" },
    { op: "local.set", index: cursorLocal },
    { op: "br", depth: 0 },
  ];

  fctx.body.push(
    // §20.2.3.3 step 1: IsCallable(this).
    { op: "local.get", index: 1 },
    { op: "call", funcIdx: typeofFunctionIdx },
    { op: "i32.eqz" },
    { op: "if", blockType: { kind: "empty" }, then: throwNotCallable },

    // An omitted `thisArg` is JavaScript undefined, never the null sentinel.
    ...canonicalUndefinedExternInstrs(ctx),
    { op: "local.set", index: thisArgLocal },
    { op: "call", funcIdx: objVecNewIdx },
    { op: "local.set", index: tailLocal },

    // A well-formed variadic call carries a non-null vec, but retaining this
    // guard keeps first-class/borrowed invocation defensive and makes an empty
    // carrier behave exactly like `target.call()`.
    { op: "local.get", index: 2 },
    { op: "ref.is_null" },
    {
      op: "if",
      blockType: { kind: "empty" },
      then: [],
      else: [
        { op: "local.get", index: 2 },
        { op: "ref.as_non_null" },
        { op: "struct.get", typeIdx: argsParam.typeIdx, fieldIdx: 0 },
        { op: "local.set", index: argsLengthLocal },
        { op: "local.get", index: 2 },
        { op: "ref.as_non_null" },
        { op: "struct.get", typeIdx: argsParam.typeIdx, fieldIdx: 1 },
        { op: "local.set", index: argsDataLocal },
        // args[0] is the receiver supplied to the target function.
        { op: "local.get", index: argsLengthLocal },
        { op: "i32.const", value: 0 },
        { op: "i32.gt_s" },
        {
          op: "if",
          blockType: { kind: "empty" },
          then: [
            { op: "local.get", index: argsDataLocal },
            { op: "ref.as_non_null" },
            { op: "i32.const", value: 0 },
            { op: "array.get", typeIdx: argsArrTypeIdx },
            { op: "local.set", index: thisArgLocal },
          ],
        },
        // Copy only actual tail arguments. This preserves both an empty tail
        // and explicit `undefined` arguments through the ObjVec carrier.
        { op: "i32.const", value: 1 },
        { op: "local.set", index: cursorLocal },
        {
          op: "block",
          blockType: { kind: "empty" },
          body: [
            {
              op: "loop",
              blockType: { kind: "empty" },
              body: [
                { op: "local.get", index: cursorLocal },
                { op: "local.get", index: argsLengthLocal },
                { op: "i32.ge_s" },
                { op: "br_if", depth: 1 },
                ...copyTail,
              ],
            },
          ],
        },
      ],
    },

    // Call(target, thisArg, tail) through the one representation-aware bridge.
    { op: "local.get", index: 1 },
    { op: "local.get", index: thisArgLocal },
    { op: "local.get", index: tailLocal },
    { op: "call", funcIdx: applyClosureIdx },
  );
  return { kind: "externref" };
}
