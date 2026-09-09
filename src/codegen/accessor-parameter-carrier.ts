// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";
import type { CodegenContext } from "./context/types.js";
import { nativeTypeOfDeclaration } from "./native-type-annotations.js";

// Shared source ABI evidence, keyed by declarations rather than binding names.
// An accessor literal uses the open object carrier, even under an interface
// annotation. A nominal parameter cast would discard that runtime value.
const parametersByContext = new WeakMap<CodegenContext, ReadonlySet<ts.ParameterDeclaration>>();

function unwrap(expression: ts.Expression): ts.Expression {
  while (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isSatisfiesExpression(expression)
  )
    expression = expression.expression;
  return expression;
}

function isAccessorArgument(ctx: CodegenContext, expression: ts.Expression): boolean {
  let value = unwrap(expression);
  if (ts.isIdentifier(value)) {
    const declaration = ctx.oracle.valueDeclarationOf(value);
    if (!declaration || !ts.isVariableDeclaration(declaration) || !declaration.initializer) return false;
    value = unwrap(declaration.initializer);
  }
  return ts.isObjectLiteralExpression(value) && value.properties.some(ts.isAccessor);
}

export function prepareAccessorParameterCarriers(ctx: CodegenContext, sourceFiles: readonly ts.SourceFile[]): void {
  const parameters = new Set<ts.ParameterDeclaration>();
  const pending: ts.Node[] = [...sourceFiles];
  while (pending.length) {
    const node = pending.pop()!;
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      let symbol = ctx.checker.getSymbolAtLocation(node.expression);
      if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = ctx.checker.getAliasedSymbol(symbol);
      const declaration = symbol?.valueDeclaration;
      if (
        declaration &&
        ts.isFunctionDeclaration(declaration) &&
        declaration.body &&
        !declaration.typeParameters?.length
      ) {
        for (let index = 0; index < node.arguments.length; index++) {
          const argument = node.arguments[index]!;
          if (ts.isSpreadElement(argument)) break;
          const parameter = declaration.parameters[index];
          if (!parameter || parameter.dotDotDotToken) break;
          if (
            ts.isIdentifier(parameter.name) &&
            nativeTypeOfDeclaration(ctx.checker, parameter) === null &&
            isAccessorArgument(ctx, argument)
          )
            parameters.add(parameter);
        }
      }
    }
    ts.forEachChild(node, (child) => {
      pending.push(child);
    });
  }
  parametersByContext.set(ctx, parameters);
}

export function parameterNeedsAccessorCarrier(ctx: CodegenContext, parameter: ts.ParameterDeclaration): boolean {
  return parametersByContext.get(ctx)?.has(parameter) === true;
}
