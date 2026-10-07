// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
/**
 * (#6907) Keep type-only project sources out of the graph `__module_init`.
 *
 * A source the entry reaches only through JSDoc `@import` / `import type`
 * edges is in the program for the checker, but no JavaScript runtime ever
 * evaluates it. Its declarations stay compiled (nothing can call them without
 * a value edge); only its top-level statements are withheld from the
 * module initializer. See `typeOnlyReachableSources` for the fail-safe rules.
 */
import type { MultiTypedAST } from "../checker/index.js";
import { typeOnlyReachableSources } from "../checker/value-reachable-sources.js";
import type { ts } from "../ts-api.js";
import type { CodegenContext } from "./context/types.js";

function statementSource(statement: ts.Statement): ts.SourceFile | undefined {
  try {
    return statement.getSourceFile();
  } catch {
    return undefined; // synthesized statement — never filtered
  }
}

export function dropTypeOnlySourceInitializers(ctx: CodegenContext, multiAst: MultiTypedAST): void {
  if (multiAst.sourceFiles.length <= 1 || ctx.moduleInitStatements.length === 0) return;
  const typeOnly = typeOnlyReachableSources(
    multiAst.program,
    multiAst.checker,
    multiAst.entryFile,
    multiAst.sourceFiles,
  );
  if (typeOnly.size === 0) return;
  // In place: the array's identity may already be held by collect-phase state.
  const statements = ctx.moduleInitStatements;
  let kept = 0;
  for (const statement of statements) {
    const source = statementSource(statement);
    if (source === undefined || !typeOnly.has(source)) statements[kept++] = statement;
  }
  statements.length = kept;
}
