// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../../ts-api.js";

/** A function-body binding has one cell, including before its initializer runs. */
export function sameFunctionBodyCapture(
  binding: ts.VariableDeclaration | undefined,
  capturingDeclaration: ts.FunctionDeclaration,
): boolean {
  return (
    ts.isBlock(capturingDeclaration.parent) &&
    ts.isFunctionLike(capturingDeclaration.parent.parent) &&
    binding !== undefined &&
    ts.isVariableDeclarationList(binding.parent) &&
    ts.isVariableStatement(binding.parent.parent) &&
    binding.parent.parent.parent === capturingDeclaration.parent
  );
}
