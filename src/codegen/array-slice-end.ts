// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { ts } from "../ts-api.js";
import type { Instr } from "../ir/types.js";
import { allocLocal } from "./context/locals.js";
import type { CodegenContext, FunctionContext } from "./context/types.js";
import { ensureLateImport, flushLateImportShifts } from "./expressions/late-imports.js";
import { compileExpression } from "./shared.js";
import { coercionInstrs } from "./type-coercion.js";

/** Evaluate once and distinguish undefined from NaN before numeric coercion. */
export function compileArraySliceEnd(
  ctx: CodegenContext,
  fctx: FunctionContext,
  end: ts.Expression | undefined,
  vecLocal: number,
  vecTypeIdx: number,
): number | null {
  if (end === undefined) return null;
  ensureLateImport(ctx, "__extern_is_undefined", [{ kind: "externref" }], [{ kind: "i32" }]);
  flushLateImportShifts(ctx, fctx);
  compileExpression(ctx, fctx, end, { kind: "externref" });
  const raw = allocLocal(fctx, `__slice_end_value_${fctx.locals.length}`, { kind: "externref" });
  const result = allocLocal(fctx, `__slice_end_index_${fctx.locals.length}`, { kind: "i32" });
  fctx.body.push({ op: "local.tee", index: raw });
  fctx.body.push({ op: "call", funcIdx: ctx.funcMap.get("__extern_is_undefined")! });
  const present: Instr[] = [{ op: "local.get", index: raw }];
  present.push(...coercionInstrs(ctx, { kind: "externref" }, { kind: "f64" }, fctx));
  present.push({ op: "i32.trunc_sat_f64_s" });
  fctx.body.push({
    op: "if",
    blockType: { kind: "val", type: { kind: "i32" } },
    then: [
      { op: "local.get", index: vecLocal },
      { op: "struct.get", typeIdx: vecTypeIdx, fieldIdx: 0 },
    ],
    else: present,
  });
  fctx.body.push({ op: "local.set", index: result });
  return result;
}
