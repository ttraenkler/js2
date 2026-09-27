// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { BackendEmitter } from "./backend/emitter.js";
import type { IrClassLowering } from "./backend/handles.js";
import type { IrInstrClassSet, IrType, IrValueId } from "./nodes.js";
import type { LocalDef } from "./types.js";
import { presenceSetInstrs } from "../codegen/fnctor-presence-bits.js";

/** Store and publish own presence without evaluating the receiver twice. */
export function emitClassFieldStore<S>(input: {
  emitter: BackendEmitter<S>;
  out: S;
  layout: IrClassLowering;
  instruction: IrInstrClassSet;
  receiverType: IrType;
  paramsLength: number;
  locals: (LocalDef & { readonly logicalType: IrType })[];
  emitValue: (value: IrValueId, out: S) => void;
}): void {
  const { emitter, out, layout, instruction, locals, emitValue } = input;
  const presence = layout.fieldPresence?.(instruction.fieldName);
  const receiverLocal = presence ? input.paramsLength + locals.length : undefined;
  if (receiverLocal !== undefined) {
    locals.push({
      name: "$class_presence_receiver",
      type: { kind: "ref_null", typeIdx: layout.structTypeIdx },
      logicalType: input.receiverType,
    });
  }
  emitValue(instruction.value, out);
  if (receiverLocal !== undefined) emitter.pushRaw(out, { op: "local.tee", index: receiverLocal });
  emitValue(instruction.newValue, out);
  emitter.pushRaw(out, {
    op: "struct.set",
    typeIdx: layout.structTypeIdx,
    fieldIdx: layout.fieldIdx(instruction.fieldName),
  });
  if (presence && receiverLocal !== undefined) {
    for (const operation of presenceSetInstrs(layout.structTypeIdx, presence, receiverLocal))
      emitter.pushRaw(out, operation);
  }
}
