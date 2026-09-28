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
      // Only inferred object-literal shapes prove incomplete construction.
      // Interface refinements (Node as Identifier) and class instances do not.
      if (
        target.flags & ts.TypeFlags.Object &&
        actual.flags & ts.TypeFlags.Object &&
        ((actual.getSymbol()?.flags ?? 0) & ts.SymbolFlags.ObjectLiteral) !== 0 &&
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

/** Interface inheritance and erased refinements preserve the same runtime value. */
export function incompleteAssertionCarrierPlan(checker: ts.TypeChecker, sources: readonly ts.SourceFile[]) {
  const types = new Set<ts.Type>();
  const witnesses: ts.Expression[] = [];
  const roots: { target: ts.Type; family: Set<ts.Symbol> }[] = [];
  const families = new Map<ts.Symbol, Set<ts.Symbol>>();
  const familyOf = (type: ts.Type): Set<ts.Symbol> => {
    const symbol = type.getSymbol();
    if (symbol && families.has(symbol)) return families.get(symbol)!;
    const family = new Set<ts.Symbol>();
    const add = (current: ts.Type): void => {
      const currentSymbol = current.getSymbol();
      if (!currentSymbol?.declarations?.some(ts.isInterfaceDeclaration) || family.has(currentSymbol)) return;
      family.add(currentSymbol);
      const declarationType = (current as ts.TypeReference).target ?? current;
      for (const base of declarationType.getBaseTypes() ?? []) add(base);
    };
    add(type);
    if (symbol) families.set(symbol, family);
    return family;
  };
  for (const source of sources) {
    for (const target of incompleteAssertionCarrierTypes(checker, source).keys()) {
      if (types.has(target)) continue;
      types.add(target);
      roots.push({ target, family: familyOf(target) });
    }
  }
  if (types.size) {
    const observed: { node: ts.Expression; type: ts.Type }[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isExpression(node)) {
        const type = checker.getTypeAtLocation(node);
        observed.push({ node, type });
        const symbol = type.getSymbol();
        // getBaseTypes exposes declared generic bases (Base<T>), not always
        // their concrete view. Select observed assignable instantiations only.
        if (
          types.has(type) ||
          (symbol && roots.some(({ target, family }) => family.has(symbol) && checker.isTypeAssignableTo(target, type)))
        ) {
          types.add(type);
        }
      }
      ts.forEachChild(node, visit);
    };
    for (const source of sources) visit(source);
    const baseViews = [...types];
    for (const { node, type } of observed) {
      if (!types.has(type) && type.getSymbol()?.declarations?.some(ts.isInterfaceDeclaration)) {
        const family = familyOf(type);
        // A refined interface cannot introduce a new heap layout for an
        // existing open base value. Require both declared inheritance and
        // compatible concrete type arguments, not structural similarity alone.
        if (baseViews.some((base) => family.has(base.getSymbol()!) && checker.isTypeAssignableTo(type, base))) {
          types.add(type);
        }
      }
      if (types.has(type)) witnesses.push(node);
    }
  }
  return { types, witnesses };
}
