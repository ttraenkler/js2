// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";

/** Statement-only local assignment; members need a separate single-evaluation plan. */
export function localLogicalAssignment(expression: ts.Expression):
  | {
      readonly target: ts.Identifier;
      readonly value: ts.Expression;
      readonly whenTruthy: boolean;
    }
  | undefined {
  if (!ts.isBinaryExpression(expression) || !ts.isIdentifier(expression.left)) return undefined;
  const op = expression.operatorToken.kind;
  if (op !== ts.SyntaxKind.BarBarEqualsToken && op !== ts.SyntaxKind.AmpersandAmpersandEqualsToken) return undefined;
  return {
    target: expression.left,
    value: expression.right,
    whenTruthy: op === ts.SyntaxKind.AmpersandAmpersandEqualsToken,
  };
}
