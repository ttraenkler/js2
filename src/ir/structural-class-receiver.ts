// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";

/** A primitive's boxed method surface is not evidence for a user class. */
export function allowsStructuralClassInference(type: ts.Type, checker: ts.TypeChecker): boolean {
  if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return false;
  if (type.isUnionOrIntersection())
    return type.types.every((member) => allowsStructuralClassInference(member, checker));
  if (type.flags & ts.TypeFlags.TypeParameter) {
    const constraint = checker.getBaseConstraintOfType(type);
    return constraint !== undefined && constraint !== type && allowsStructuralClassInference(constraint, checker);
  }
  return (type.flags & ts.TypeFlags.Object) !== 0;
}
