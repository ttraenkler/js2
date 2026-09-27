// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../typescript.js";

interface ParameterBindingOracle {
  declarationsOf(node: ts.Node): readonly ts.Declaration[];
}

/** A native string slot cannot distinguish actual null from a missing capture. */
export function parameterObservesNullishSwitch(
  parameter: ts.ParameterDeclaration,
  oracle: ParameterBindingOracle,
): boolean {
  if (parameter.type?.kind !== ts.SyntaxKind.StringKeyword || !ts.isIdentifier(parameter.name)) return false;
  const name = parameter.name.text;
  let observes = false;
  const visit = (node: ts.Node): void => {
    if (observes) return;
    if (ts.isSwitchStatement(node) && ts.isIdentifier(node.expression) && node.expression.text === name) {
      const declarations = oracle.declarationsOf(node.expression);
      if (
        (declarations.length === 0 || declarations.includes(parameter)) &&
        node.caseBlock.clauses.some(
          (clause) =>
            ts.isCaseClause(clause) &&
            (clause.expression.kind === ts.SyntaxKind.NullKeyword ||
              (ts.isIdentifier(clause.expression) && clause.expression.text === "undefined") ||
              ts.isVoidExpression(clause.expression)),
        )
      ) {
        observes = true;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(parameter.parent);
  return observes;
}
