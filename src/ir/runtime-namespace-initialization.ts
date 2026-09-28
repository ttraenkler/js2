// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";

export interface RuntimeNamespaceVariableBinding {
  readonly declaration: ts.VariableDeclaration | ts.BindingElement;
  readonly name: ts.Identifier;
}

export type RuntimeNamespaceInitializationStep =
  | {
      readonly kind: "variable";
      readonly statement: ts.VariableStatement;
      readonly declaration: ts.VariableDeclaration;
      /** These bindings live on the namespace object, not in independent cells. */
      readonly properties: readonly RuntimeNamespaceVariableBinding[];
      /** An uninitialized export has a binding but creates no own property. */
      readonly publishes: boolean;
    }
  | { readonly kind: "statement"; readonly statement: ts.Statement }
  | {
      readonly kind: "export-alias";
      /** A runtime export alias is property-backed, not a separately published local. */
      readonly declaration: ts.ImportEqualsDeclaration;
      readonly requiresRuntimeResolution: true;
    }
  | {
      readonly kind: "publish-local";
      readonly declaration: ts.FunctionDeclaration | ts.ClassDeclaration | ts.EnumDeclaration;
      readonly name: ts.Identifier;
      /** Const enums still require the emitter's runtime-value decision. */
      readonly requiresRuntimeResolution: boolean;
    };

function exported(statement: ts.Statement): boolean {
  return !!(
    ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  );
}

function variableProperties(declaration: ts.VariableDeclaration): readonly RuntimeNamespaceVariableBinding[] {
  const bindings: RuntimeNamespaceVariableBinding[] = [];
  const visit = (owner: ts.VariableDeclaration | ts.BindingElement): void => {
    if (ts.isIdentifier(owner.name)) {
      bindings.push(Object.freeze({ declaration: owner, name: owner.name }));
    } else {
      for (const element of owner.name.elements) if (!ts.isOmittedExpression(element)) visit(element);
    }
  };
  visit(declaration);
  return Object.freeze(bindings);
}

/**
 * Source-order publication intent for a namespace body. The caller supplies
 * non-ambient runtime candidates; binding/option-dependent erasure stays an
 * explicit obligation, not a guessed runtime value. Object identity, merged
 * function/class namespaces and physical storage are resolved downstream.
 */
export function planRuntimeNamespaceInitialization(
  statements: readonly ts.Statement[],
): readonly RuntimeNamespaceInitializationStep[] {
  const steps: RuntimeNamespaceInitializationStep[] = [];
  for (const statement of statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const properties = exported(statement) ? variableProperties(declaration) : Object.freeze([]);
        steps.push(
          Object.freeze({
            kind: "variable",
            statement,
            declaration,
            properties,
            publishes: properties.length > 0 && declaration.initializer !== undefined,
          }),
        );
      }
      continue;
    }
    if (ts.isImportEqualsDeclaration(statement) && exported(statement)) {
      steps.push(Object.freeze({ kind: "export-alias", declaration: statement, requiresRuntimeResolution: true }));
      continue;
    }
    steps.push(Object.freeze({ kind: "statement", statement }));
    if (!exported(statement)) continue;
    if (
      (ts.isFunctionDeclaration(statement) && statement.body !== undefined) ||
      ts.isClassDeclaration(statement) ||
      ts.isEnumDeclaration(statement)
    ) {
      if (!statement.name || !ts.isIdentifier(statement.name)) continue;
      const requiresRuntimeResolution =
        ts.isEnumDeclaration(statement) &&
        !!ts.getModifiers(statement)?.some((m) => m.kind === ts.SyntaxKind.ConstKeyword);
      steps.push(
        Object.freeze({
          kind: "publish-local",
          declaration: statement,
          name: statement.name,
          requiresRuntimeResolution,
        }),
      );
    }
  }
  return Object.freeze(steps);
}
