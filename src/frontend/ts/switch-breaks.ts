// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../typescript.js";

/** Source-owned breaks; CaseBlock lexical environments need separate frame support. */
export function sourceSwitchBreaks(stmt: ts.SwitchStatement): readonly ts.BreakStatement[] | undefined {
  const breaks: ts.BreakStatement[] = [];
  let unsupported = false;
  function visit(node: ts.Node): void {
    if (unsupported || ts.isFunctionLike(node)) return;
    if (ts.isLabeledStatement(node) || (ts.isBreakStatement(node) && node.label)) {
      unsupported = true;
      return;
    }
    if (ts.isBreakStatement(node)) {
      breaks.push(node);
      return;
    }
    if (
      ts.isSwitchStatement(node) ||
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isWhileStatement(node) ||
      ts.isDoStatement(node)
    )
      return;
    ts.forEachChild(node, visit);
  }
  for (const clause of stmt.caseBlock.clauses) {
    for (const statement of clause.statements) {
      if (
        ts.isClassDeclaration(statement) ||
        ts.isFunctionDeclaration(statement) ||
        (ts.isVariableStatement(statement) && statement.declarationList.flags & ts.NodeFlags.BlockScoped)
      ) {
        return undefined;
      }
      visit(statement);
    }
  }
  return unsupported ? undefined : breaks;
}
