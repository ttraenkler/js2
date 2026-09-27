// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../typescript.js";
interface AssignedCallableOracle {
  signaturePositionOf(node: ts.Node, path: readonly number[]): { readonly fact: { readonly kind: string } } | undefined;
}

/** A replacement must accept the original property's open argument contract. */
export function assignedCallableParameterIsDynamic(
  declaration: ts.SignatureDeclaration,
  index: number,
  oracle: AssignedCallableOracle,
): boolean {
  const assignment = declaration.parent;
  if (
    !assignment ||
    !ts.isBinaryExpression(assignment) ||
    assignment.operatorToken.kind !== ts.SyntaxKind.EqualsToken ||
    assignment.right !== declaration ||
    (!ts.isPropertyAccessExpression(assignment.left) && !ts.isElementAccessExpression(assignment.left))
  )
    return false;
  const fact = oracle.signaturePositionOf(assignment.left, [index])?.fact;
  return fact?.kind === "any" || fact?.kind === "unknown";
}

/** Explicit parameter annotations cannot narrow an open replacement slot. */
export function parameterNeedsRuntimeTypeof(
  parameter: ts.ParameterDeclaration,
  oracle: AssignedCallableOracle,
): boolean {
  const parameters = parameter.parent.parameters.filter((p) => !ts.isIdentifier(p.name) || p.name.text !== "this");
  if (assignedCallableParameterIsDynamic(parameter.parent, parameters.indexOf(parameter), oracle)) return true;
  return parameter.type === undefined && /\.(js|mjs|cjs|jsx)$/.test(parameter.getSourceFile().fileName);
}
