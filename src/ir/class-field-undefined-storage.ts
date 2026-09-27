// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";
import { irClassInstanceFieldName } from "./class-instance-initializers.js";

/** Source-owned storage evidence: these fields must retain a distinct undefined. */
export function collectUndefinedWrittenInstanceFields(
  declaration: ts.ClassLikeDeclaration,
  isUndefinedValue: (expression: ts.Expression) => boolean,
): ReadonlySet<string> {
  const fields = new Set<string>();
  const bare = (expression: ts.Expression): ts.Expression => {
    let node = expression;
    while (
      ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isTypeAssertionExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isNonNullExpression(node)
    )
      node = node.expression;
    return node;
  };
  const clears = (expression: ts.Expression) =>
    ts.isVoidExpression(bare(expression)) || isUndefinedValue(bare(expression));
  const visit = (node: ts.Node): void => {
    // Arrows inherit the enclosing instance; ordinary functions/classes do not.
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isClassExpression(node)
    )
      return;
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      bare(node.left.expression).kind === ts.SyntaxKind.ThisKeyword &&
      clears(node.right)
    ) {
      const name = irClassInstanceFieldName(node.left.name);
      if (name !== undefined) fields.add(name);
    }
    ts.forEachChild(node, visit);
  };
  for (const member of declaration.members) {
    if (ts.canHaveModifiers(member) && ts.getModifiers(member)?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword))
      continue;
    if (
      ts.isPropertyDeclaration(member) &&
      !member.modifiers?.some(
        ({ kind }) => kind === ts.SyntaxKind.DeclareKeyword || kind === ts.SyntaxKind.AbstractKeyword,
      )
    ) {
      const name = irClassInstanceFieldName(member.name);
      if (name !== undefined && (member.initializer ? clears(member.initializer) : !!member.questionToken))
        fields.add(name);
      if (member.initializer) visit(member.initializer);
    } else if (
      (ts.isConstructorDeclaration(member) ||
        ts.isMethodDeclaration(member) ||
        ts.isGetAccessorDeclaration(member) ||
        ts.isSetAccessorDeclaration(member)) &&
      member.body
    )
      visit(member.body);
  }
  return fields;
}
