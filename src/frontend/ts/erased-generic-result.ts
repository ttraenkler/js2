// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../../ts-api.js";

/** A shared T / T|null|undefined body cannot adopt its first caller's result representation. */
export function hasUnconstrainedGenericResult(checker: ts.TypeChecker, declaration: ts.FunctionDeclaration): boolean {
  if (!declaration.typeParameters?.length) return false;
  const signature = checker.getSignatureFromDeclaration(declaration);
  if (!signature) return false;
  const result = checker.getReturnTypeOfSignature(signature);
  const parts = (result.isUnion() ? result.types : [result]).filter(
    (part) => !(part.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void)),
  );
  if (parts.length !== 1) return false;
  const parameter = parts[0]!;
  return (
    (parameter.flags & ts.TypeFlags.TypeParameter) !== 0 &&
    !checker.getBaseConstraintOfType(parameter) &&
    declaration.typeParameters.some((candidate) => checker.getTypeAtLocation(candidate.name) === parameter)
  );
}
