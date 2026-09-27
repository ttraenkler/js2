// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";
import type { TypeOracle } from "../checker/oracle.js";
import { checkerEnumDeclaration, checkerNamespaceEnumDeclarations } from "../checker/enum-binding.js";
type EnumEvidence =
  | ts.TypeChecker
  | Pick<TypeOracle, "enumDeclarationOf" | "enumConstantValueOf" | "namespaceEnumDeclarationsOf">;

/** Resolve only binding identities, never an object/getter merely typed as an enum. */
export function enumObjectDeclaration(
  expression: ts.Expression,
  checker: EnumEvidence,
): ts.EnumDeclaration | undefined {
  return "enumDeclarationOf" in checker
    ? checker.enumDeclarationOf(expression)
    : checkerEnumDeclaration(expression, checker);
}

/** Runtime object uses, excluding type syntax and checker-foldable member reads. */
export function runtimeEnumObjectDeclarations(
  sources: readonly ts.SourceFile[],
  checker: EnumEvidence,
): ReadonlySet<ts.EnumDeclaration> {
  const result = new Set<ts.EnumDeclaration>();
  const pending: ts.Node[] = [...sources];
  while (pending.length) {
    const node = pending.pop()!;
    const namespace =
      ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly
        ? node.importClause?.namedBindings
        : ts.isExportDeclaration(node) && !node.isTypeOnly
          ? node.exportClause
          : undefined;
    if (namespace && (ts.isNamespaceImport(namespace) || ts.isNamespaceExport(namespace))) {
      const declarations =
        "namespaceEnumDeclarationsOf" in checker
          ? checker.namespaceEnumDeclarationsOf(namespace)
          : checkerNamespaceEnumDeclarations(namespace, checker);
      for (const declaration of declarations ?? []) result.add(declaration);
    }
    if (ts.isTypeNode(node) || ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) continue;
    if (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) {
      const declaration = enumObjectDeclaration(node, checker);
      if (declaration && node !== declaration.name) {
        let expression: ts.Node = node;
        while (
          expression.parent &&
          (ts.isParenthesizedExpression(expression.parent) ||
            ts.isAsExpression(expression.parent) ||
            ts.isTypeAssertionExpression(expression.parent) ||
            ts.isNonNullExpression(expression.parent) ||
            ts.isSatisfiesExpression(expression.parent))
        )
          expression = expression.parent;
        const parent = expression.parent;
        const folded =
          parent &&
          (ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) &&
          parent.expression === expression &&
          ("enumConstantValueOf" in checker
            ? checker.enumConstantValueOf(parent)
            : checker.getConstantValue(parent)) !== undefined;
        if (!folded) result.add(declaration);
      }
    }
    ts.forEachChild(node, (child) => {
      pending.push(child);
    });
  }
  return result;
}
