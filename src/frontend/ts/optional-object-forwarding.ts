// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts, forEachChild } from "../../ts-api.js";
import type { TypeOracle } from "../../checker/oracle.js";

/** Exact parameter edges carrying optional objects into structural formals. */
export function collectOptionalObjectForwarding(
  oracle: TypeOracle,
  sources: readonly ts.SourceFile[],
  admit: (parameter: ts.ParameterDeclaration) => boolean,
): ReadonlySet<ts.ParameterDeclaration> {
  const bodies = new Map<ts.Declaration, ts.FunctionDeclaration[]>();
  const calls: ts.CallExpression[] = [];
  const bindingOf = (node: ts.Node): ts.Declaration | undefined => oracle.aliasedValueDeclarationOf(node);
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.body && node.name) {
      const symbol = bindingOf(node.name);
      if (symbol) bodies.set(symbol, [...(bodies.get(symbol) ?? []), node]);
    }
    if (ts.isCallExpression(node)) calls.push(node);
    forEachChild(node, visit);
  };
  for (const source of sources) visit(source);
  const edges: [ts.ParameterDeclaration, ts.ParameterDeclaration][] = [];
  for (const call of calls) {
    const callee = ts.isPropertyAccessExpression(call.expression) ? call.expression.name : call.expression;
    if (!ts.isIdentifier(callee)) continue;
    const symbol = bindingOf(callee);
    const implementations = symbol && bodies.get(symbol);
    if (implementations?.length !== 1) continue;
    const implementation = implementations[0]!;
    for (let index = 0; index < call.arguments.length; index++) {
      let argument = call.arguments[index]!;
      if (ts.isSpreadElement(argument)) break;
      while (
        ts.isParenthesizedExpression(argument) ||
        ts.isAsExpression(argument) ||
        ts.isTypeAssertionExpression(argument) ||
        ts.isNonNullExpression(argument) ||
        ts.isSatisfiesExpression(argument)
      )
        argument = argument.expression;
      if (!ts.isIdentifier(argument)) continue;
      const source = bindingOf(argument);
      const target = implementation.parameters[index];
      if (!source || !ts.isParameter(source) || !target || target.dotDotDotToken || !admit(target)) continue;
      const fact = oracle.typeFactOf(target);
      const parts =
        fact.kind === "union" ? fact.parts.filter((part) => part.kind !== "null" && part.kind !== "undefined") : [fact];
      const declarations = oracle.typeDeclarationsOf(target);
      // Classes, callable objects, arrays and unconstrained generic slots have
      // separate representation contracts. Admit only named interface/plain
      // type-literal formals whose nominal cast would otherwise lose identity.
      if (
        parts.length !== 1 ||
        (parts[0]?.kind !== "object" && parts[0]?.kind !== "class") ||
        !declarations.some((declaration) => ts.isInterfaceDeclaration(declaration) || ts.isTypeLiteralNode(declaration))
      )
        continue;
      edges.push([source, target]);
    }
  }
  const result = new Set<ts.ParameterDeclaration>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const [source, target] of edges) {
      if (result.has(target)) continue;
      if (result.has(source) || (source.questionToken && !source.initializer && admit(source))) {
        result.add(target);
        changed = true;
      }
    }
  }
  return result;
}
