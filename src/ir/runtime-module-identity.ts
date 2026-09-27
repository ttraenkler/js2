// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";

/** Runtime namespaces need exact callable identities even when IR emission is disabled. */
export function requiresRuntimeModuleIdentity(sourceFile: ts.SourceFile): boolean {
  return (
    !sourceFile.isDeclarationFile &&
    sourceFile.statements.some((statement) => {
      // ESM namespace objects also project function values by declaration
      // identity. Their registry must not depend on the selected body emitter.
      if (ts.isImportDeclaration(statement)) {
        const clause = statement.importClause;
        return !!clause && !clause.isTypeOnly && !!clause.namedBindings && ts.isNamespaceImport(clause.namedBindings);
      }
      if (ts.isExportDeclaration(statement)) {
        return !statement.isTypeOnly && !!statement.exportClause && ts.isNamespaceExport(statement.exportClause);
      }
      return (
        ts.isModuleDeclaration(statement) &&
        ts.isIdentifier(statement.name) &&
        statement.body !== undefined &&
        (statement.flags & ts.NodeFlags.GlobalAugmentation) === 0 &&
        !ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.DeclareKeyword)
      );
    })
  );
}
