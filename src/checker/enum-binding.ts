// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";

const namespaceEnumCache = new WeakMap<ts.TypeChecker, WeakMap<ts.Symbol, readonly ts.EnumDeclaration[]>>();

/** Enum values observable through an exact ESM namespace, including barrels. */
export function checkerNamespaceEnumDeclarations(
  namespace: ts.NamespaceImport | ts.NamespaceExport,
  checker: ts.TypeChecker,
): readonly ts.EnumDeclaration[] | undefined {
  const resolve = (symbol: ts.Symbol | undefined): ts.Symbol | undefined =>
    symbol && symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  const root = resolve(checker.getSymbolAtLocation(namespace.name));
  if (!root?.declarations?.some(ts.isSourceFile)) return undefined;
  let cache = namespaceEnumCache.get(checker);
  if (!cache) namespaceEnumCache.set(checker, (cache = new WeakMap()));
  const cached = cache.get(root);
  if (cached) return cached;
  const declarations = new Set<ts.EnumDeclaration>();
  const visited = new Set<ts.Symbol>();
  const visit = (module: ts.Symbol): void => {
    if (visited.has(module)) return;
    visited.add(module);
    for (const member of checker.getExportsOfModule(module)) {
      const target = resolve(member);
      if (!target) continue;
      const declaration = target.valueDeclaration;
      if (declaration && ts.isEnumDeclaration(declaration)) declarations.add(declaration);
      else if (target.declarations?.some(ts.isSourceFile)) visit(target);
    }
  };
  visit(root);
  const result = Object.freeze([...declarations]);
  cache.set(root, result);
  return result;
}

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
