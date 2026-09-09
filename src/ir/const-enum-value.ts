// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";

/** Fold only erased enum bindings, never runtime enum objects or receiver effects. */
export function constEnumValue(expression: ts.Expression, checker?: ts.TypeChecker): string | number | undefined {
  if (!checker || (!ts.isPropertyAccessExpression(expression) && !ts.isElementAccessExpression(expression)))
    return undefined;
  if (expression.questionDotToken) return undefined;
  if (ts.isElementAccessExpression(expression) && !ts.isStringLiteral(expression.argumentExpression)) return undefined;
  const resolve = (node: ts.Node): ts.Symbol | undefined => {
    const symbol = checker.getSymbolAtLocation(node);
    return symbol && (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(symbol) : symbol;
  };
  const receiver = expression.expression;
  const enumSymbol = resolve(receiver);
  if (!enumSymbol || (enumSymbol.flags & ts.SymbolFlags.ConstEnum) === 0) return undefined;
  // A namespace-qualified import is safe; a call, getter, cast or variable
  // merely typed as typeof an enum is not an erased binding identity.
  let part = receiver;
  for (;;) {
    if (!ts.isIdentifier(part) && !ts.isPropertyAccessExpression(part)) return undefined;
    const symbol = resolve(part);
    if (
      !symbol ||
      (symbol.flags & (ts.SymbolFlags.ConstEnum | ts.SymbolFlags.NamespaceModule | ts.SymbolFlags.ValueModule)) === 0
    )
      return undefined;
    if (ts.isIdentifier(part)) break;
    if (part.questionDotToken) return undefined;
    part = part.expression;
  }
  return checker.getConstantValue(expression);
}
