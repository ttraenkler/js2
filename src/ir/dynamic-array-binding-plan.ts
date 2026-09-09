// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";

/**
 * Dynamic array alternatives must agree on each declaration's destination
 * before any branch is emitted. A later alternative may produce undefined,
 * null, or an unrelated value even when the checker narrows the binding.
 * Rest bindings own their separately allocated collection carrier.
 */
export function dynamicArrayBindingPlan(pattern: ts.ArrayBindingPattern): readonly ts.BindingElement[] {
  const bindings: ts.BindingElement[] = [];
  const visit = (name: ts.BindingName): void => {
    if (ts.isIdentifier(name)) return;
    for (const element of name.elements) {
      if (!ts.isBindingElement(element) || element.dotDotDotToken) continue;
      if (ts.isIdentifier(element.name)) bindings.push(element);
      else visit(element.name);
    }
  };
  visit(pattern);
  return bindings;
}
