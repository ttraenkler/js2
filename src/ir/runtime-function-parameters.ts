// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";

/** Source parameters occupying argument slots; TypeScript's receiver annotation is erased. */
export function runtimeFunctionParameters(declaration: ts.SignatureDeclaration): readonly ts.ParameterDeclaration[] {
  return declaration.parameters.filter(
    (parameter) => !ts.isIdentifier(parameter.name) || parameter.name.text !== "this",
  );
}
