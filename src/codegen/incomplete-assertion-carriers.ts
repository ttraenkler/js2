// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";
import type { OracleTypeKey } from "../checker/oracle.js";
import { incompleteAssertionCarrierPlan } from "../frontend/ts/incomplete-assertion-carriers.js";
import type { CodegenContext } from "./context/types.js";

const carrierKeys = new WeakMap<CodegenContext, Set<OracleTypeKey>>();

export function receiverHasIncompleteAssertionCarrier(ctx: CodegenContext, receiver: ts.Expression): boolean {
  return carrierKeys.get(ctx)?.has(ctx.oracle.typeKeyOf(receiver)) === true;
}

/** Apply frontend evidence before either compiler path reserves callable ABIs. */
export function collectIncompleteAssertionCarriers(
  ctx: CodegenContext,
  checker: ts.TypeChecker,
  source: ts.SourceFile,
): void {
  if (carrierKeys.has(ctx)) return;
  const plan = incompleteAssertionCarrierPlan(checker, ctx.callableSourceFiles ?? [source]);
  const keys = new Set<OracleTypeKey>();
  carrierKeys.set(ctx, keys);
  for (const type of plan.types) ctx.objectHashConsumerTypes.add(type);
  for (const witness of plan.witnesses) keys.add(ctx.oracle.typeKeyOf(witness));
}

/** An asserted interface is not evidence that its declared properties exist. */
export function propertyReadHasIncompleteAssertionCarrier(ctx: CodegenContext, expression: ts.Expression): boolean {
  const keys = carrierKeys.get(ctx);
  if (!keys?.size) return false;
  while (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isNonNullExpression(expression)
  )
    expression = expression.expression;
  return (
    (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) &&
    receiverHasIncompleteAssertionCarrier(ctx, expression.expression)
  );
}
