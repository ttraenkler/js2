// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";

function unwrap(expression: ts.Expression): ts.Expression {
  while (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isSatisfiesExpression(expression)
  )
    expression = expression.expression;
  return expression;
}

/** Exact enum binding, not an object/getter merely typed as an enum namespace. */
export function checkerEnumDeclaration(
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
