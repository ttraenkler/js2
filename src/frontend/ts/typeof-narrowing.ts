// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../typescript.js";

/** A branch-local copy is valid only when the source binding cannot be written. */
export function detectImmutableTypeofNarrowing(
  expr: ts.Expression,
  bindingIsImmutable: (identifier: ts.Identifier) => boolean,
): { varName: string; typeLiteral: string; narrowedBranch: "then" | "else" } | null {
  if (!ts.isBinaryExpression(expr)) return null;
  const op = expr.operatorToken.kind;
  const isEq = op === ts.SyntaxKind.EqualsEqualsEqualsToken || op === ts.SyntaxKind.EqualsEqualsToken;
  const isNeq = op === ts.SyntaxKind.ExclamationEqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken;
  if (!isEq && !isNeq) return null;

  let typeofExpr: ts.TypeOfExpression | null = null;
  let stringLiteral: string | null = null;
  if (ts.isTypeOfExpression(expr.left) && ts.isStringLiteral(expr.right)) {
    typeofExpr = expr.left;
    stringLiteral = expr.right.text;
  } else if (ts.isTypeOfExpression(expr.right) && ts.isStringLiteral(expr.left)) {
    typeofExpr = expr.right;
    stringLiteral = expr.left.text;
  }
  if (!typeofExpr || !stringLiteral) return null;
  const operand = typeofExpr.expression;
  if (!ts.isIdentifier(operand)) return null;
  if (stringLiteral !== "string" && stringLiteral !== "number") return null;
  // Includes writes through called closures, not just direct branch assignments.
  if (!bindingIsImmutable(operand)) return null;
  return {
    varName: operand.text,
    typeLiteral: stringLiteral,
    narrowedBranch: isEq ? "then" : "else",
  };
}
