// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts, forEachChild } from "../ts-api.js";

/** Conservative source-wide carrier evidence, available before class layout registration. */
export function collectClassImplementedInterfaceNames(sourceFiles: readonly ts.SourceFile[]): ReadonlySet<string> {
  const names = new Set<string>();
  const ambient = (node: ts.Node): boolean =>
    ts.canHaveModifiers(node) &&
    ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.DeclareKeyword) === true;
  const visit = (node: ts.Node): void => {
    if (
      ts.isModuleDeclaration(node) &&
      (ambient(node) || !ts.isIdentifier(node.name) || (node.flags & ts.NodeFlags.GlobalAugmentation) !== 0)
    )
      return;
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      if (ambient(node)) return;
      for (const clause of node.heritageClauses ?? []) {
        if (clause.token !== ts.SyntaxKind.ImplementsKeyword) continue;
        for (const type of clause.types) {
          if (ts.isIdentifier(type.expression)) names.add(type.expression.text);
        }
      }
    }
    forEachChild(node, visit);
  };
  for (const sourceFile of sourceFiles) {
    if (!sourceFile.isDeclarationFile) visit(sourceFile);
  }
  return names;
}
