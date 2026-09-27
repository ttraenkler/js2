// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.

import { ts } from "../ts-api.js";

/** Source work before backend-specific property-name resolution. */
interface ClassInstanceInitializerSource {
  readonly declaration: ts.PropertyDeclaration | ts.ParameterDeclaration;
  readonly name: ts.PropertyName;
  /** Absent for the implicit undefined write; never fabricate a source AST. */
  readonly expression?: ts.Expression;
  readonly sourceOrdinal: number;
}

/** Source-ordered field work owned by one class constructor `_init`. */
export interface IrClassInstanceInitializer extends ClassInstanceInitializerSource {
  readonly fieldName: string;
}

/** Parameter properties belong only to the implementing constructor. */
export function collectIrClassParameterProperties(
  declaration: ts.ClassDeclaration | ts.ClassExpression,
): readonly (ts.ParameterDeclaration & { name: ts.Identifier })[] {
  const implementation = declaration.members.find(
    (member): member is ts.ConstructorDeclaration =>
      ts.isConstructorDeclaration(member) && !hasStaticModifier(member) && member.body !== undefined,
  );
  return Array.from(implementation?.parameters ?? []).filter(
    (parameter): parameter is ts.ParameterDeclaration & { name: ts.Identifier } =>
      ts.isIdentifier(parameter.name) &&
      parameter.modifiers?.some(
        ({ kind }) =>
          kind === ts.SyntaxKind.PublicKeyword ||
          kind === ts.SyntaxKind.PrivateKeyword ||
          kind === ts.SyntaxKind.ProtectedKeyword ||
          kind === ts.SyntaxKind.ReadonlyKeyword,
      ) === true,
  );
}

/** The instance declarations consumed by layout and IR type projection. */
export function collectClassInstanceFieldDeclarations(declaration: ts.ClassDeclaration | ts.ClassExpression) {
  return [
    ...declaration.members.filter(
      (member): member is ts.PropertyDeclaration => ts.isPropertyDeclaration(member) && !hasStaticModifier(member),
    ),
    ...collectIrClassParameterProperties(declaration),
  ];
}

function hasStaticModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node)?.some(({ kind }) => kind === ts.SyntaxKind.StaticKeyword) ?? false)
  );
}

/**
 * Resolve only property names whose slot identity is fixed by syntax. Dynamic
 * computed names remain direct until their evaluation/side-table semantics are
 * represented explicitly in IR.
 */
export function irClassInstanceFieldName(name: ts.PropertyName): string | undefined {
  if (ts.isPrivateIdentifier(name)) return `__priv_${name.text.slice(1)}`;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  if (
    ts.isComputedPropertyName(name) &&
    (ts.isStringLiteral(name.expression) || ts.isNumericLiteral(name.expression))
  ) {
    return name.expression.text;
  }
  return undefined;
}

/** Fields initialize before parameter-property assignments in ES2022 output.
 * Implicit writes are currently admitted for optional fields only: required
 * reference-field projection still relies on its existing precise layout.
 */
export function collectClassInstanceInitializerSources(
  declaration: ts.ClassDeclaration | ts.ClassExpression,
): readonly ClassInstanceInitializerSource[] {
  const result: ClassInstanceInitializerSource[] = [];
  for (let sourceOrdinal = 0; sourceOrdinal < declaration.members.length; sourceOrdinal++) {
    const member = declaration.members[sourceOrdinal]!;
    if (
      !ts.isPropertyDeclaration(member) ||
      hasStaticModifier(member) ||
      (!member.initializer && !member.questionToken) ||
      member.modifiers?.some(
        ({ kind }) => kind === ts.SyntaxKind.DeclareKeyword || kind === ts.SyntaxKind.AbstractKeyword,
      )
    )
      continue;
    result.push({ declaration: member, name: member.name, expression: member.initializer, sourceOrdinal });
  }
  // ES2022 fields initialize before the constructor's parameter-property writes.
  for (const parameter of collectIrClassParameterProperties(declaration)) {
    result.push({
      declaration: parameter,
      name: parameter.name,
      expression: parameter.name,
      sourceOrdinal: declaration.members.length + result.length,
    });
  }
  return result;
}

/** Build an exact source-order plan, or refuse the complete class atomically. */
export function collectIrClassInstanceInitializers(
  declaration: ts.ClassDeclaration | ts.ClassExpression,
): readonly IrClassInstanceInitializer[] | undefined {
  const result: IrClassInstanceInitializer[] = [];
  for (const source of collectClassInstanceInitializerSources(declaration)) {
    const fieldName = irClassInstanceFieldName(source.name);
    if (fieldName === undefined) return undefined;
    result.push({ ...source, fieldName });
  }
  return result;
}
