// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { Instr, ValType } from "./instructions.js";

/** Preserve a native string across an erased callable ABI without JS coercion. */
export function nativeStringAbiBridge(
  from: ValType,
  to: ValType,
  stringTypeIndices: readonly number[],
): Instr[] | null {
  const isExtern = (type: ValType) => type.kind === "externref" || type.kind === "ref_extern";
  const isString = (type: ValType) =>
    (type.kind === "ref" || type.kind === "ref_null") && type.typeIdx >= 0 && stringTypeIndices.includes(type.typeIdx);
  if (isString(from) && isExtern(to)) return [{ op: "extern.convert_any" }];
  if (isExtern(from) && (to.kind === "ref" || to.kind === "ref_null") && isString(to)) {
    return [
      { op: "any.convert_extern" },
      { op: to.kind === "ref_null" ? "ref.cast_null" : "ref.cast", typeIdx: to.typeIdx },
    ];
  }
  return null;
}
