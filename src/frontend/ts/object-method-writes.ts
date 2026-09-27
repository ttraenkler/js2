// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../typescript.js";

interface DeclarationOracle {
  declarationsOf(node: ts.Node): readonly ts.Declaration[];
}

const writesByOracle = new WeakMap<DeclarationOracle, WeakMap<ts.SourceFile, ReadonlySet<ts.Declaration>>>();

/** Source-planning facts for resolved writes; not a general immutability proof. */
export function objectMethodHasResolvedWrite(
  declaration: ts.MethodDeclaration,
  sourceFiles: readonly ts.SourceFile[],
  oracle: DeclarationOracle,
): boolean {
  let files = writesByOracle.get(oracle);
  if (!files) writesByOracle.set(oracle, (files = new WeakMap()));
  for (const source of sourceFiles) {
    let written = files.get(source);
    if (!written) {
      const declarations = new Set<ts.Declaration>();
      const visit = (node: ts.Node): void => {
        const target =
          ts.isBinaryExpression(node) &&
          node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
          node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
            ? node.left
            : ts.isDeleteExpression(node)
              ? node.expression
              : undefined;
        if (target && ts.isPropertyAccessExpression(target)) {
          for (const owner of oracle.declarationsOf(target.name)) declarations.add(owner);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
      written = declarations;
      files.set(source, written);
    }
    if (written.has(declaration)) return true;
  }
  return false;
}
