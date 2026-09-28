// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../typescript.js";

/** Erased structural assertions must not impose the asserted record's heap layout. */
export function incompleteAssertionCarrierTypes(
  checker: ts.TypeChecker,
  source: ts.SourceFile,
): ReadonlyMap<ts.Type, ts.Expression> {
  const result = new Map<ts.Type, ts.Expression>();
  const visit = (node: ts.Node): void => {
    if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
      const target = checker.getTypeAtLocation(node);
      let operand = node.expression;
      while (
        ts.isParenthesizedExpression(operand) ||
        ts.isAsExpression(operand) ||
        ts.isTypeAssertionExpression(operand) ||
        ts.isNonNullExpression(operand)
      )
        operand = operand.expression;
      const actual = checker.getTypeAtLocation(operand);
      // Unknown, union, callable and collection shapes are not proof of an
      // incomplete plain record. Classes retain their separate brand contract.
      if (
        target.flags & ts.TypeFlags.Object &&
        actual.flags & ts.TypeFlags.Object &&
        target.getSymbol()?.declarations?.some(ts.isInterfaceDeclaration) &&
        !checker.isArrayType(target) &&
        !checker.isTupleType(target) &&
        !checker.isArrayType(actual) &&
        !checker.isTupleType(actual) &&
        target.getCallSignatures().length === 0 &&
        actual.getCallSignatures().length === 0 &&
        target
          .getProperties()
          .some((property) => !(property.flags & ts.SymbolFlags.Optional) && !actual.getProperty(property.name))
      )
        result.set(target, node);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return result;
}
