// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";

/** Pure identity/shape proof, before any Map runtime allocation. */
export function isEmptyAmbientMapConstruction(
  expression: ts.NewExpression,
  isAmbient: ((identifier: ts.Identifier) => boolean) | undefined,
): boolean {
  return (
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === "Map" &&
    (expression.arguments?.length ?? 0) === 0 &&
    ((expression.typeArguments?.length ?? 0) === 0 || expression.typeArguments?.length === 2) &&
    isAmbient?.(expression.expression) === true
  );
}
