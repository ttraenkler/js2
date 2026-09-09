// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";

export function isAmbientUndefined(node: ts.Expression, checker?: ts.TypeChecker): boolean {
  if (!checker || !ts.isIdentifier(node) || node.text !== "undefined") return false;
  const symbol = checker.getSymbolAtLocation(node);
  return symbol !== undefined && checker.isUndefinedSymbol(symbol);
}
