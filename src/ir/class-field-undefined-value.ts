// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { UNDEF_F64_BITS } from "../codegen/value-tags.js";
import type { IrFunctionBuilder } from "./builder.js";
import { irRuntimeFuncRef } from "./callable-bindings.js";
import { asVal, irVal, type IrType, type IrValueId } from "./nodes.js";
import { IR_UNDEFINED_VALUE_FN } from "./undefined-value-provider.js";

/** Initialize a physical field without inventing an executable source node. */
export function lowerImplicitFieldUndefined(builder: IrFunctionBuilder, type: IrType): IrValueId {
  const val = asVal(type);
  if (val?.kind === "f64") {
    const bits = builder.emitConst({ kind: "i64", value: UNDEF_F64_BITS }, irVal({ kind: "i64" }));
    return builder.emitUnary("f64.reinterpret_i64", bits, type);
  }
  // Explicit native scalar fields have no undefined carrier, matching their
  // existing allocation defaults; ordinary reference fields are widened.
  if (val?.kind === "i32") return builder.emitConst({ kind: "i32", value: 0 }, type);
  if (val?.kind === "i64") return builder.emitConst({ kind: "i64", value: 0n }, type);
  const raw = builder.emitCall(irRuntimeFuncRef(IR_UNDEFINED_VALUE_FN), [], irVal({ kind: "externref" }));
  if (raw === null) throw new Error("class field undefined producer returned void");
  return type.kind === "dynamic" ? builder.emitBox(raw, type) : raw;
}
