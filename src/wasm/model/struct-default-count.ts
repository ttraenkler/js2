// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { Instr } from "../../ir/types.js";

/** Count a contiguous suffix of constructor defaults, including numeric undefined. */
export function countTrailingStructDefaults(body: readonly Instr[], end: number): number {
  let count = 0;
  for (let i = end - 1; i >= 0; i--) {
    const op = body[i]!.op;
    if (op === "ref.as_non_null") continue;
    if (op === "f64.reinterpret_i64" && body[i - 1]?.op === "i64.const") {
      count++;
      i--;
      continue;
    }
    if (
      op === "f64.const" ||
      op === "i32.const" ||
      op === "i64.const" ||
      op === "ref.null" ||
      op === "ref.null.extern" ||
      op === "ref.null.eq"
    ) {
      count++;
      continue;
    }
    break;
  }
  return count;
}
