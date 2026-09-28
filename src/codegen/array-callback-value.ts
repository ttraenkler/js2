// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";
import type { CodegenContext, FunctionContext } from "./context/types.js";
import { emitFuncRefAsClosure } from "./closures/funcref-as-closure.js";

/** Use the same typed hoisted callback in admission probes and committed emission. */
export function emitHoistedArrayCallback(ctx: CodegenContext, fctx: FunctionContext, callback: ts.Expression) {
  if (!ts.isIdentifier(callback) || !fctx.hoistedFunctionValueBindings?.has(callback.text)) return undefined;
  // A lifted parameter already holds this activation's closure. Rebuilding
  // it here would read captures from the declaring function's unrelated slots.
  if (fctx.liftedCaptureSlots?.has(callback.text)) return undefined;
  const funcIdx = ctx.funcMap.get(callback.text);
  return funcIdx === undefined ? undefined : emitFuncRefAsClosure(ctx, fctx, callback.text, funcIdx);
}
