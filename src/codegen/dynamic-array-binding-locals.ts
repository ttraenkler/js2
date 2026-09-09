// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";
import { dynamicArrayBindingPlan } from "../ir/dynamic-array-binding-plan.js";
import type { CodegenContext, FunctionContext } from "./context/types.js";
import { allocLocal, getLocalType } from "./context/locals.js";
import { ensureBindingLocals } from "./shared.js";

/** Allocate shared destinations before any dynamic destructuring arm emits. */
export function prepareDynamicArrayBindingLocals(
  ctx: CodegenContext,
  fctx: FunctionContext,
  pattern: ts.ArrayBindingPattern,
): void {
  ensureBindingLocals(ctx, fctx, pattern);
  for (const element of dynamicArrayBindingPlan(pattern)) {
    const name = (element.name as ts.Identifier).text;
    if (fctx.boxedCaptures?.has(name)) continue;
    const index = fctx.localMap.get(name);
    if (index !== undefined && getLocalType(fctx, index)?.kind !== "externref") {
      allocLocal(fctx, name, { kind: "externref" });
    }
    if (!element.initializer) (fctx.undefWidenedLocals ??= new Set()).add(name);
  }
}
