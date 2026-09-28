// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../../ts-api.js";

/** Loop-header let/const bindings live for the loop, including its subject. */
function loopScope(declaration: ts.Node): ts.ForStatement | ts.ForOfStatement | undefined {
  if (!ts.isVariableDeclaration(declaration) || !ts.isIdentifier(declaration.name)) return undefined;
  const list = declaration.parent;
  if (!ts.isVariableDeclarationList(list) || !(list.flags & ts.NodeFlags.BlockScoped)) return undefined;
  const loop = list.parent;
  return (ts.isForStatement(loop) || ts.isForOfStatement(loop)) && loop.initializer === list ? loop : undefined;
}

/** A name-keyed frame slot cannot represent simultaneously live bindings. */
export function haveDisjointLoopScopes(declarations: readonly ts.Node[]): boolean {
  const scopes = declarations.map(loopScope);
  if (scopes.some((scope) => !scope)) return false;
  for (let i = 0; i < scopes.length; i++) {
    for (let j = i + 1; j < scopes.length; j++) {
      for (let node: ts.Node | undefined = scopes[i]; node; node = node.parent) {
        if (node === scopes[j]) return false;
      }
      for (let node: ts.Node | undefined = scopes[j]; node; node = node.parent) {
        if (node === scopes[i]) return false;
      }
    }
  }
  return true;
}
