// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { TypeOracle } from "../../checker/oracle.js";
import { forEachChild, ts } from "../../ts-api.js";

/** An erased non-null assertion can return undefined through a narrowed IIFE type. */
export function iifeMayReturnAssertedUndefined(expression: ts.Expression, oracle: TypeOracle): boolean {
  let call = expression;
  while (ts.isParenthesizedExpression(call)) call = call.expression;
  if (!ts.isCallExpression(call)) return false;
  let callee: ts.Expression = call.expression;
  while (ts.isParenthesizedExpression(callee)) callee = callee.expression;
  if (!ts.isArrowFunction(callee) && !ts.isFunctionExpression(callee)) return false;
  if (callee.asteriskToken || callee.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword))
    return false;
  let found = false;
  let ambiguous = false;
  const inspect = (expression: ts.Expression): void => {
    let value = expression;
    let asserted = false;
    while (ts.isParenthesizedExpression(value) || ts.isNonNullExpression(value)) {
      asserted ||= ts.isNonNullExpression(value);
      value = value.expression;
    }
    const fact = oracle.typeFactOf(value);
    const nullability = oracle.nullabilityOf(value);
    ambiguous ||= nullability.nullable || ["any", "unknown", "unresolvable"].includes(fact.kind);
    found ||= asserted && nullability.undefinable;
  };
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionLike(node)) return;
    if (ts.isReturnStatement(node) && node.expression) inspect(node.expression);
    forEachChild(node, visit);
  };
  if (ts.isBlock(callee.body)) visit(callee.body);
  else inspect(callee.body);
  return found && !ambiguous;
}
