// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";

/**
 * An object method allocated inside an executable function belongs to that
 * activation, not to a module-global method body. Keep this source-identity
 * decision independent of the selected backend and physical closure layout.
 * Captures themselves are discovered by the existing closure lowering.
 * Direct and reflective calls must read the object's stored callable rather
 * than selecting a module-global body by its method name.
 */
export function objectMethodEnvironmentOwner(method: ts.MethodDeclaration): ts.Node | undefined {
  if (!method.body || !ts.isObjectLiteralExpression(method.parent)) return undefined;
  for (let owner: ts.Node | undefined = method.parent.parent; owner; owner = owner.parent) {
    if (ts.isSourceFile(owner)) return undefined;
    if (ts.isFunctionLike(owner) && "body" in owner && owner.body) return owner;
  }
  return undefined;
}
