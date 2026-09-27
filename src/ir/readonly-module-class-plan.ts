// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";
import type { TypeOracle } from "../checker/oracle.js";

/** Declaration-owned immutable class bindings; no physical singleton or slot. */
export function readonlyModuleClasses(
  source: ts.SourceFile,
  oracle: Pick<TypeOracle, "valueDeclarationOf">,
): readonly ts.ClassDeclaration[] {
  if (source.isDeclarationFile) return [];
  const candidates = new Set(
    source.statements.filter(
      (node): node is ts.ClassDeclaration =>
        ts.isClassDeclaration(node) &&
        !!node.name &&
        !ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.DeclareKeyword),
    ),
  );
  let unknown = false;
  const rejectWritten = (node: ts.Node): void => {
    // Assignment to a member changes the object, not the class binding.
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) return;
    if (ts.isIdentifier(node)) {
      const declaration = oracle.valueDeclarationOf(node);
      if (declaration && ts.isClassDeclaration(declaration)) candidates.delete(declaration);
      if (declaration === undefined) {
        for (const candidate of candidates) if (candidate.name?.text === node.text) candidates.delete(candidate);
      }
    }
    ts.forEachChild(node, rejectWritten);
  };
  const visit = (node: ts.Node): void => {
    // A direct eval can write a lexical class binding without an AST target.
    if (ts.isIdentifier(node) && node.text === "eval") unknown = true;
    if (ts.isWithStatement(node)) unknown = true;
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    )
      rejectWritten(node.left);
    if (
      ts.isPostfixUnaryExpression(node) ||
      (ts.isPrefixUnaryExpression(node) &&
        (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken))
    ) {
      rejectWritten(node.operand);
    }
    if (ts.isForInStatement(node) || ts.isForOfStatement(node)) rejectWritten(node.initializer);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return unknown ? [] : Object.freeze([...candidates]);
}
