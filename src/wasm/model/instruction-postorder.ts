// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { Instr } from "./instructions.js";
import { walkChildren } from "./instruction-walk.js";

/** Visit each physical instruction array after its children, without recursion.
 * A declined array also excludes its descendants from this traversal.
 */
export function walkInstructionArraysPostOrder(
  instrs: Instr[],
  visitor: (body: Instr[]) => void,
  visited = new WeakSet<Instr[]>(),
  admit: (body: Instr[]) => boolean = () => true,
): void {
  const pending = [{ body: instrs, exit: false }];
  while (pending.length) {
    const { body, exit } = pending.pop()!;
    if (exit) {
      visitor(body);
      continue;
    }
    if (!admit(body) || visited.has(body)) continue;
    visited.add(body);
    pending.push({ body, exit: true });
    for (let i = body.length - 1; i >= 0; i--) {
      const children: Instr[][] = [];
      walkChildren(body[i]!, (child) => children.push(child));
      for (let j = children.length - 1; j >= 0; j--) pending.push({ body: children[j]!, exit: false });
    }
  }
}
