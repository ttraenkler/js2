// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { Instr, LocalDef, ValType } from "../../ir/types.js";
import { walkChildren } from "./instruction-walk.js";

/**
 * (#6694) Relocated locals are zeroed once per CALLER frame, not per call, so a
 * site inside a loop gets stack-neutral resets (they may precede the argument
 * spills) for every defaultable declared callee local the body may read before
 * writing. A local is written first on every path only when its first
 * textual access is a top-level `local.set`/`local.tee`: all before it is
 * straight-line, and a branch past it leaves the wrapper. `ref` locals have no
 * default and validation already demands a write before their first read.
 */
export function inlineLocalResets(body: Instr[], nParams: number, locals: readonly LocalDef[], base: number): Instr[] {
  const first = new Map<number, boolean>(); // local -> first access is a top-level write
  const frames = [{ body, depth: 0, next: 0 }];
  while (frames.length > 0) {
    const frame = frames[frames.length - 1]!;
    if (frame.next === frame.body.length) {
      frames.pop();
      continue;
    }
    const instr = frame.body[frame.next++]!;
    if ((instr.op === "local.get" || instr.op === "local.set" || instr.op === "local.tee") && !first.has(instr.index))
      first.set(instr.index, frame.depth === 0 && instr.op !== "local.get");
    const children: Instr[][] = [];
    walkChildren(instr, (child) => children.push(child));
    for (let i = children.length - 1; i >= 0; i--) frames.push({ body: children[i]!, depth: frame.depth + 1, next: 0 });
  }
  const out: Instr[] = [];
  locals.forEach((l, i) => {
    const zero = first.get(nParams + i) === false ? zeroOf(l.type) : null;
    if (zero) out.push(zero, { op: "local.set", index: base + nParams + i });
  });
  return out;
}

/** The Wasm default of a local's type, or null when it has none. */
function zeroOf(t: ValType): Instr | null {
  switch (t.kind) {
    case "i32":
    case "i8":
    case "i16":
      return { op: "i32.const", value: 0 };
    case "i64":
      return { op: "i64.const", value: 0n };
    case "f32":
      return { op: "f32.const", value: 0 };
    case "f64":
      return { op: "f64.const", value: 0 };
    case "v128":
      return { op: "v128.const", bytes: new Uint8Array(16) };
    case "ref_null":
      return { op: "ref.null", typeIdx: t.typeIdx };
    case "externref":
      return { op: "ref.null.extern" };
    case "funcref":
      return { op: "ref.null.func" };
    case "eqref":
    case "anyref":
      return { op: "ref.null.eq" };
    default:
      return null;
  }
}
