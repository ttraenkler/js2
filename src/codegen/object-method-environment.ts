// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";
import type { ValType } from "../ir/types.js";
import type { CodegenContext, FunctionContext } from "./context/types.js";
import { compileArrowAsClosure } from "./closures.js";

/** Store the existing closure carrier, preserving the object's physical ABI. */
export function emitObjectMethodEnvironment(
  ctx: CodegenContext,
  fctx: FunctionContext,
  method: ts.MethodDeclaration,
  typeName: string,
  fieldName: string,
  fieldType: ValType,
): void {
  // The shared closure compiler already handles MethodDeclaration metadata,
  // dynamic this and parameter defaults (also used by open object methods).
  const closure = compileArrowAsClosure(ctx, fctx, method as unknown as ts.FunctionExpression);
  if (!closure) throw new Error("Object method closure lowering declined its environment");
  if (
    (fieldName === "valueOf" || fieldName === "toString") &&
    fieldType.kind === "eqref" &&
    (closure.kind === "ref" || closure.kind === "ref_null")
  ) {
    const types = ctx.valueOfClosureTypes.get(typeName) ?? [];
    if (!types.includes(closure.typeIdx)) types.push(closure.typeIdx);
    ctx.valueOfClosureTypes.set(typeName, types);
  }
  if (fieldType.kind === "externref") fctx.body.push({ op: "extern.convert_any" });
  else if (
    fieldType.kind !== "eqref" &&
    !(
      (fieldType.kind === "ref" || fieldType.kind === "ref_null") &&
      (closure.kind === "ref" || closure.kind === "ref_null") &&
      fieldType.typeIdx === closure.typeIdx
    )
  ) {
    throw new Error("Object method field cannot hold its closure environment");
  }
}
