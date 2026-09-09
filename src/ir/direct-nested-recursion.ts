// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";
import { nestedFunctionUsedAsValue } from "./closure-captures.js";

/** Prove self uses can call the lifted target, without a closure-value ABI. */
export function hasDirectNestedRecursion(fn: ts.FunctionDeclaration, checker?: ts.TypeChecker): boolean {
  if (!checker || !fn.name || !fn.body || nestedFunctionUsedAsValue(fn, checker)) return false;
  const symbol = checker.getSymbolAtLocation(fn.name);
  if (!symbol) return false;
  let found = false;
  let unsupported = false;
  const visit = (node: ts.Node, nested: boolean): void => {
    if (unsupported) return;
    if (ts.isShorthandPropertyAssignment(node) && checker.getShorthandAssignmentValueSymbol(node) === symbol) {
      unsupported = true;
      return;
    }
    if (ts.isIdentifier(node) && checker.getSymbolAtLocation(node) === symbol) {
      found = true;
      const parent = node.parent;
      if (nested || !parent || !ts.isCallExpression(parent) || parent.expression !== node || parent.questionDotToken) {
        unsupported = true;
        return;
      }
    }
    const inside = nested || ts.isFunctionLike(node);
    ts.forEachChild(node, (child) => visit(child, inside));
  };
  visit(fn.body, false);
  return found && !unsupported;
}
