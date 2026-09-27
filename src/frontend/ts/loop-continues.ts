// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../typescript.js";

/** Source ownership only: nested loops/functions own their unlabelled jumps. */
export function sourceLoopContinues(body: ts.Statement): readonly ts.ContinueStatement[] | undefined {
  const continues: ts.ContinueStatement[] = [];
  let unsupported = false;
  function visit(node: ts.Node, switchDepth: number, loopDepth: number): void {
    if (unsupported || ts.isFunctionLike(node)) return;
    if (ts.isLabeledStatement(node)) {
      unsupported = true;
      return;
    }
    const nestedLoop =
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isWhileStatement(node) ||
      ts.isDoStatement(node);
    if (ts.isContinueStatement(node)) {
      if (node.label) unsupported = true;
      else if (loopDepth === 0) continues.push(node);
      return;
    }
    if (ts.isBreakStatement(node)) {
      if (node.label || (loopDepth === 0 && switchDepth === 0)) unsupported = true;
      return;
    }
    const depth = switchDepth + (ts.isSwitchStatement(node) ? 1 : 0);
    ts.forEachChild(node, (child) => visit(child, depth, loopDepth + (nestedLoop ? 1 : 0)));
  }
  visit(body, 0, 0);
  return unsupported ? undefined : continues;
}
