// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";

type EnumResolver = (expression: ts.Expression) => string | number | undefined;

/** Shared selector/builder proof: literals or checker-proven erased enum values. */
export function numericSwitchCaseValue(expr: ts.Expression, resolve?: EnumResolver): number | null {
  if (ts.isNumericLiteral(expr)) return Number(expr.text.replace(/_/g, ""));
  if (
    ts.isPrefixUnaryExpression(expr) &&
    expr.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(expr.operand)
  )
    return -Number(expr.operand.text.replace(/_/g, ""));
  const value = resolve?.(expr);
  return typeof value === "number" ? value : null;
}

export function stringSwitchCaseValue(expr: ts.Expression, resolve?: EnumResolver): string | null {
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text;
  const value = resolve?.(expr);
  return typeof value === "string" ? value : null;
}
