// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../../ts-api.js";
import type { TypeOracle } from "../../checker/oracle.js";

/** Generator bindings referenced by a nested named declaration, by source identity. */
export function generatorOwnedCaptures(
  body: ts.Block,
  oracle: Pick<TypeOracle, "valueDeclarationOf">,
): Map<string, boolean> {
  const names = new Map<string, boolean>();
  function visit(node: ts.Node, insideDeclaration: boolean): void {
    const nested = insideDeclaration || ts.isFunctionDeclaration(node);
    if (nested && ts.isIdentifier(node)) {
      const declaration = oracle.valueDeclarationOf(node);
      if (
        declaration &&
        (ts.isVariableDeclaration(declaration) || ts.isParameter(declaration) || ts.isBindingElement(declaration)) &&
        ts.isIdentifier(declaration.name)
      ) {
        let owner: ts.Node | undefined = declaration.parent;
        while (owner && !ts.isFunctionLike(owner)) owner = owner.parent;
        if (owner === body.parent) {
          let binding: ts.Node = declaration;
          while (
            ts.isBindingElement(binding) ||
            ts.isArrayBindingPattern(binding) ||
            ts.isObjectBindingPattern(binding)
          )
            binding = binding.parent;
          const lexical =
            ts.isVariableDeclaration(binding) &&
            ts.isVariableDeclarationList(binding.parent) &&
            (binding.parent.flags & ts.NodeFlags.BlockScoped) !== 0;
          names.set(declaration.name.text, lexical);
        }
      }
    }
    ts.forEachChild(node, (child) => visit(child, nested));
  }
  ts.forEachChild(body, (node) => visit(node, false));
  return names;
}

/** The current generator frame is name-keyed; do not admit ambiguous captured slots. */
export function generatorHasCapturedShadowing(body: ts.Block, oracle: Pick<TypeOracle, "valueDeclarationOf">): boolean {
  const captures = generatorOwnedCaptures(body, oracle);
  const declared = new Set<string>();
  let ambiguous = false;
  function visit(node: ts.Node): void {
    if (ts.isFunctionLike(node)) return;
    if (
      (ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isBindingElement(node)) &&
      ts.isIdentifier(node.name) &&
      captures.has(node.name.text)
    ) {
      if (declared.has(node.name.text)) ambiguous = true;
      declared.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  }
  if (ts.isFunctionLike(body.parent)) for (const param of body.parent.parameters) visit(param);
  visit(body);
  return ambiguous;
}
