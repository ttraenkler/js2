// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { Instr } from "./types.js";

/** Owned control arms in source order, matching the stack-repair walks. */
function children(instruction: Instr): Instr[][] {
  switch (instruction.op) {
    case "if":
      return instruction.else ? [instruction.then, instruction.else] : [instruction.then];
    case "block":
    case "loop":
    case "try_table":
      return [instruction.body];
    case "try":
      return [
        instruction.body,
        ...instruction.catches.map((clause) => clause.body),
        ...(instruction.catchAll ? [instruction.catchAll] : []),
      ];
    default:
      return [];
  }
}

/**
 * Child-first physical-array traversal without host recursion. Callers must
 * establish compatible ownership before mutating yielded arrays. Shared DAG
 * arrays are yielded once; a caller-supplied set retains cross-root dedup.
 */
export function* instructionBodyPostorder(root: Instr[], visited = new WeakSet<Instr[]>()): Generator<Instr[]> {
  const pending = [{ body: root, afterChildren: false }];
  while (pending.length) {
    const frame = pending.pop()!;
    if (frame.afterChildren) {
      yield frame.body;
      continue;
    }
    if (visited.has(frame.body)) continue;
    visited.add(frame.body);
    pending.push({ body: frame.body, afterChildren: true });
    for (let index = frame.body.length - 1; index >= 0; index--) {
      const arms = children(frame.body[index]!);
      for (let arm = arms.length - 1; arm >= 0; arm--) pending.push({ body: arms[arm]!, afterChildren: false });
    }
  }
}
