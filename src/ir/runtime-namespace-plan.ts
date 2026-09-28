// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";
import {
  planRuntimeNamespaceInitialization,
  type RuntimeNamespaceInitializationStep,
} from "./runtime-namespace-initialization.js";

export interface RuntimeModuleDeclarationGroup {
  readonly declaration: ts.ModuleDeclaration;
  /** Outer-to-inner declarations for a dotted source site such as `A.B`. */
  readonly path: readonly ts.ModuleDeclaration[];
  readonly block: ts.ModuleBlock;
  readonly functions: readonly ts.FunctionDeclaration[];
  /** Ordered runtime declarations/statements, including function and enum exports. */
  readonly initializers: readonly ts.Statement[];
  /** Publication intent; physical namespace-object emission is a separate stage. */
  readonly initialization: readonly RuntimeNamespaceInitializationStep[];
  readonly parent: RuntimeModuleDeclarationGroup | undefined;
}

function ambient(node: ts.Node): boolean {
  return !!(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.DeclareKeyword));
}

function initializer(statement: ts.Statement): boolean {
  return (
    !ambient(statement) &&
    !(
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      (ts.isFunctionDeclaration(statement) && !statement.body) ||
      (ts.isImportEqualsDeclaration(statement) && statement.isTypeOnly) ||
      ts.isExportDeclaration(statement)
    )
  );
}

/**
 * Exact lexical ownership and initialization order for the current namespace
 * lowering. No globals, object layout, or callable handles are chosen here.
 * Merged declarations remain separate execution sites; dotted declarations
 * retain their terminal block's identity. This is not an object-hoisting plan.
 */
export function runtimeModuleDeclarationGroups(sourceFile: ts.SourceFile): readonly RuntimeModuleDeclarationGroup[] {
  if (sourceFile.isDeclarationFile) return [];
  const groups: RuntimeModuleDeclarationGroup[] = [];
  const visit = (
    declaration: ts.ModuleDeclaration,
    parent: RuntimeModuleDeclarationGroup | undefined,
    prefix: readonly ts.ModuleDeclaration[] = [],
  ): void => {
    if (
      ambient(declaration) ||
      !ts.isIdentifier(declaration.name) ||
      (declaration.flags & ts.NodeFlags.GlobalAugmentation) !== 0
    )
      return;
    const body = declaration.body;
    if (!body) return;
    const path = Object.freeze([...prefix, declaration]);
    if (ts.isModuleDeclaration(body)) {
      visit(body, parent, path);
      return;
    }
    if (!ts.isModuleBlock(body)) return;
    const lastImplementation = new Map<string, ts.FunctionDeclaration>();
    for (const statement of body.statements) {
      if (ts.isFunctionDeclaration(statement) && statement.name && statement.body && !ambient(statement)) {
        lastImplementation.set(statement.name.text, statement);
      }
    }
    const initializers = Object.freeze(body.statements.filter(initializer));
    const group: RuntimeModuleDeclarationGroup = Object.freeze({
      declaration,
      path,
      block: body,
      functions: Object.freeze([...lastImplementation.values()]),
      initializers,
      initialization: planRuntimeNamespaceInitialization(initializers),
      parent,
    });
    groups.push(group);
    for (const statement of body.statements) if (ts.isModuleDeclaration(statement)) visit(statement, group);
  };
  for (const statement of sourceFile.statements) if (ts.isModuleDeclaration(statement)) visit(statement, undefined);
  return Object.freeze(groups);
}
