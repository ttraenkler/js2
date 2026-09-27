// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../typescript.js";

interface ArrayCallbackOracle {
  declarationsOf(node: ts.Node): readonly ts.Declaration[];
}

/** Array callbacks receive the original array, which may use a tuple carrier. */
export function arrayCallbackReceiverParameterIsDynamic(
  callback: ts.SignatureDeclaration,
  index: number,
  oracle: ArrayCallbackOracle,
): boolean {
  const call = callback.parent;
  if (!call || !ts.isCallExpression(call) || !ts.isPropertyAccessExpression(call.expression)) return false;
  if (call.arguments[0] !== callback) return false;
  const name = call.expression.name.text;
  const receiverIndex = name === "reduce" || name === "reduceRight" ? 3 : 2;
  if (index !== receiverIndex || !ARRAY_CALLBACK_METHODS.has(name)) return false;
  const declarations = oracle.declarationsOf(call.expression.name);
  return (
    declarations.length > 0 &&
    declarations.every((declaration) => {
      const owner = declaration.parent;
      return (
        ts.isMethodSignature(declaration) &&
        ts.isInterfaceDeclaration(owner) &&
        (owner.name.text === "Array" || owner.name.text === "ReadonlyArray") &&
        declaration.getSourceFile().hasNoDefaultLib
      );
    })
  );
}

const ARRAY_CALLBACK_METHODS = new Set([
  "map",
  "filter",
  "forEach",
  "every",
  "some",
  "find",
  "findIndex",
  "findLast",
  "findLastIndex",
  "flatMap",
  "reduce",
  "reduceRight",
]);
