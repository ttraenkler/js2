// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";

function unwrap(expression: ts.Expression): ts.Expression {
  while (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isSatisfiesExpression(expression)
  ) {
    expression = expression.expression;
  }
  return expression;
}

/** Resolve only binding identities, never an object/getter merely typed as an enum. */
export function enumObjectDeclaration(
  expression: ts.Expression,
  checker: ts.TypeChecker,
): ts.EnumDeclaration | undefined {
  const node = unwrap(expression);
  const resolve = (symbol: ts.Symbol | undefined) =>
    symbol && symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  let symbol: ts.Symbol | undefined;
  if (ts.isIdentifier(node)) symbol = resolve(checker.getSymbolAtLocation(node));
  else if (ts.isPropertyAccessExpression(node) && !node.questionDotToken) {
    const receiver = unwrap(node.expression);
    if (!ts.isIdentifier(receiver)) return undefined;
    const module = resolve(checker.getSymbolAtLocation(receiver));
    if (!module || !(module.flags & (ts.SymbolFlags.ValueModule | ts.SymbolFlags.NamespaceModule))) return undefined;
    symbol = resolve(checker.getExportsOfModule(module).find((member) => member.name === node.name.text));
  }
  const declaration = symbol?.valueDeclaration;
  return declaration && ts.isEnumDeclaration(declaration) ? declaration : undefined;
}

/** Runtime object uses, excluding type syntax and checker-foldable member reads. */
export function runtimeEnumObjectDeclarations(
  sources: readonly ts.SourceFile[],
  checker: ts.TypeChecker,
): ReadonlySet<ts.EnumDeclaration> {
  const result = new Set<ts.EnumDeclaration>();
  const pending: ts.Node[] = [...sources];
  while (pending.length) {
    const node = pending.pop()!;
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
          checker.getConstantValue(parent) !== undefined;
        if (!folded) result.add(declaration);
      }
    }
    ts.forEachChild(node, (child) => {
      pending.push(child);
    });
  }
  return result;
}
