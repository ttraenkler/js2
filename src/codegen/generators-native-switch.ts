// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";
import { allocLocal } from "./context/locals.js";
import type { CodegenContext, FunctionContext, NativeGeneratorInfo } from "./context/types.js";
import { STATE_FIELD, setStateFieldFromLocal, storeSpills } from "./frame-core.js";
import { compileStatement } from "./shared.js";

export type NativeSwitchTerminator = {
  kind: "switch";
  statement: ts.SwitchStatement;
  entries: readonly number[];
  exit: number;
};

/** Reuse ordinary switch selection; only the selected body is state-lowered. */
export function emitNativeSwitchTerminator(
  ctx: CodegenContext,
  fctx: FunctionContext,
  info: NativeGeneratorInfo,
  term: NativeSwitchTerminator,
  selfLocal: number,
  loopDepth: number,
): void {
  let name = `__gen_switch_target_${fctx.locals.length}`;
  while (fctx.localMap.has(name)) name += "_";
  const target = allocLocal(fctx, name, { kind: "i32" });
  fctx.body.push({ op: "i32.const", value: term.exit }, { op: "local.set", index: target });
  const clauses = term.statement.caseBlock.clauses.map((clause, index) => {
    const entry = term.entries[index];
    if (entry === undefined) throw new Error("Missing native switch clause state");
    const statements = [
      ts.factory.createExpressionStatement(
        ts.factory.createAssignment(ts.factory.createIdentifier(name), ts.factory.createNumericLiteral(entry)),
      ),
      ts.factory.createBreakStatement(),
    ];
    return ts.isCaseClause(clause)
      ? ts.factory.updateCaseClause(clause, clause.expression, statements)
      : ts.factory.updateDefaultClause(clause, statements);
  });
  compileStatement(
    ctx,
    fctx,
    ts.factory.updateSwitchStatement(
      term.statement,
      term.statement.expression,
      ts.factory.updateCaseBlock(term.statement.caseBlock, clauses),
    ),
  );
  fctx.body.push(
    ...storeSpills(info, fctx, selfLocal),
    ...setStateFieldFromLocal(info, selfLocal, STATE_FIELD, target),
    { op: "br", depth: loopDepth },
  );
  fctx.localMap.delete(name);
}
