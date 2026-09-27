// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { Instr, ValType } from "../ir/types.js";
import type { CodegenContext } from "./context/types.js";
import { canonicalUndefinedExternInstrs } from "./any-helpers.js";
import { defaultValueInstrs } from "./type-coercion.js";
import { UNDEF_F64_BITS } from "./value-tags.js";

/** An absent property is undefined, not a zero/null storage default. */
export function absentFieldValueInstrs(ctx: CodegenContext, type: ValType): Instr[] {
  if (type.kind === "externref") return canonicalUndefinedExternInstrs(ctx);
  if (type.kind === "f64") {
    return [{ op: "i64.const", value: UNDEF_F64_BITS }, { op: "f64.reinterpret_i64" }];
  }
  return defaultValueInstrs(type);
}
