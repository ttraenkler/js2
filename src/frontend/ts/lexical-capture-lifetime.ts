// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../../ts-api.js";

/** A function-body lexical binding has one cell, including before initialization. */
export function sameBlockLexicalCapture(
  binding: ts.VariableDeclaration | undefined,
  capturingDeclaration: ts.FunctionDeclaration,
): boolean {
  return (
    ts.isBlock(capturingDeclaration.parent) &&
    ts.isFunctionLike(capturingDeclaration.parent.parent) &&
    binding !== undefined &&
    ts.isIdentifier(binding.name) &&
    ts.isVariableDeclarationList(binding.parent) &&
    (binding.parent.flags & ts.NodeFlags.BlockScoped) !== 0 &&
    ts.isVariableStatement(binding.parent.parent) &&
    binding.parent.parent.parent === capturingDeclaration.parent
  );
}
