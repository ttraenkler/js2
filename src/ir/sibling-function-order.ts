// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";

/** Order one declaration-only run. Missing identity or mutual recursion keeps source order. */
function orderRun(run: readonly ts.FunctionDeclaration[], checker: ts.TypeChecker): readonly ts.FunctionDeclaration[] {
  const implementations = new Map<ts.Symbol, ts.FunctionDeclaration>();
  for (const fn of run) {
    if (!fn.name) return run;
    const symbol = checker.getSymbolAtLocation(fn.name);
    if (!symbol) return run;
    if (fn.body) {
      if (implementations.has(symbol)) return run;
      implementations.set(symbol, fn);
    }
  }
  // Only erase an overload when its exact implementation is present here.
  if (run.some((fn) => !implementations.has(checker.getSymbolAtLocation(fn.name!)!))) return run;
  const dependencies = new Map<ts.FunctionDeclaration, Set<ts.FunctionDeclaration>>();
  for (const fn of implementations.values()) {
    const refs = new Set<ts.FunctionDeclaration>();
    const visit = (node: ts.Node): void => {
      if (ts.isTypeNode(node)) return;
      const symbol = ts.isShorthandPropertyAssignment(node)
        ? checker.getShorthandAssignmentValueSymbol(node)
        : ts.isIdentifier(node)
          ? checker.getSymbolAtLocation(node)
          : undefined;
      const target = symbol && implementations.get(symbol);
      if (target && target !== fn) refs.add(target);
      ts.forEachChild(node, visit);
    };
    visit(fn.body!);
    dependencies.set(fn, refs);
  }
  const ordered: ts.FunctionDeclaration[] = [];
  const active = new Set<ts.FunctionDeclaration>();
  const done = new Set<ts.FunctionDeclaration>();
  for (const root of implementations.values()) {
    const stack = [{ fn: root, exit: false }];
    while (stack.length) {
      const { fn, exit } = stack.pop()!;
      if (exit) {
        active.delete(fn);
        done.add(fn);
        ordered.push(fn);
      } else if (!done.has(fn)) {
        if (active.has(fn)) return run;
        active.add(fn);
        stack.push({ fn, exit: true });
        for (const dependency of [...dependencies.get(fn)!].reverse()) stack.push({ fn: dependency, exit: false });
      }
    }
  }
  return ordered.length === run.length && ordered.every((fn, i) => fn === run[i]) ? run : ordered;
}

/** No declaration crosses an executable statement; original nodes remain authoritative. */
export function orderSiblingFunctionDeclarations(
  statements: readonly ts.Statement[],
  checker?: ts.TypeChecker,
): readonly ts.Statement[] {
  if (!checker) return statements;
  const result: ts.Statement[] = [];
  let changed = false;
  for (let i = 0; i < statements.length; ) {
    if (!ts.isFunctionDeclaration(statements[i]!)) {
      result.push(statements[i++]!);
      continue;
    }
    const start = i;
    while (i < statements.length && ts.isFunctionDeclaration(statements[i]!)) i++;
    const run = statements.slice(start, i).filter(ts.isFunctionDeclaration);
    const ordered = orderRun(run, checker);
    changed ||= ordered !== run;
    result.push(...ordered);
  }
  return changed ? result : statements;
}
