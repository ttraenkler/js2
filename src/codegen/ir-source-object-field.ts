// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { CodegenContext } from "./context/types.js";
import type { IrType } from "../ir/nodes.js";
import { physicalObjectField } from "../ir/physical-object-field.js";
import { resolvePreparedPhysicalType } from "../ir/prepared-physical-type.js";
import type { ts } from "../ts-api.js";
import { resolveIrDynamicCarrierType } from "./any-helpers.js";
import type { IrFromAstResolver } from "../ir/from-ast.js";

/** Keep physical field and tagged-value representations on the same context. */
export function sourceObjectFromAstResolver(
  ctx: CodegenContext,
): Pick<IrFromAstResolver, "sourceObjectFieldType" | "resolveDynamic" | "dynamicCarrierIsExternref"> {
  return {
    sourceObjectFieldType: (receiver, expression) => sourceObjectFieldType(ctx, receiver, expression),
    resolveDynamic: () => resolveIrDynamicCarrierType(ctx),
    dynamicCarrierIsExternref: () => !ctx.fast,
  };
}

/** Exact allocator field plus matching semantic fact, never a display-name layout. */
export function sourceObjectFieldType(
  ctx: CodegenContext,
  receiver: IrType,
  expression: ts.PropertyAccessExpression,
): IrType | undefined {
  if (receiver.kind !== "val" || !receiver.typeRef || (receiver.val.kind !== "ref" && receiver.val.kind !== "ref_null"))
    return undefined;
  const index = resolvePreparedPhysicalType(ctx, receiver.typeRef);
  const field = physicalObjectField(ctx.mod.types, index, expression.name.text);
  const fact = ctx.oracle.typeFactOf(expression);
  if (field?.type.kind === "f64" && fact.kind === "number") return { kind: "val", val: field.type };
  if (field?.type.kind === "i32" && fact.kind === "boolean")
    return { kind: "val", val: { kind: "i32", boolean: true } };
  // Reference fields need their own symbolic identity, and packed numeric
  // fields need a representation-specific widening plan. Do not guess either.
  return undefined;
}
