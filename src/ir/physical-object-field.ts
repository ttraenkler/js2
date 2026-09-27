// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { IrObjectStructLowering } from "./backend/handles.js";
import type { IrLowerResolver } from "./lower.js";
import { irTypeEquals, irVal, type IrType, type IrInstr, type IrValueId } from "./nodes.js";
import type { FieldDef, TypeDef, ValType } from "./types.js";

export interface IrPhysicalObjectField {
  readonly fieldIdx: number;
  readonly type: ValType;
  readonly mutable: boolean;
}

export function checkObjectRule(
  instr: IrInstr,
  block: number,
  context: {
    readonly typeOf: ReadonlyMap<IrValueId, IrType>;
    readonly func: { readonly name: string };
    readonly errors: { message: string; func: string; block?: number }[];
  },
): boolean {
  if (instr.kind !== "object.get") return false;
  const receiver = context.typeOf.get(instr.value);
  if (receiver?.kind !== "val" && !instr.physicalReceiver) return false;
  if (
    !instr.physicalReceiver ||
    receiver?.kind !== "val" ||
    !receiver.typeRef ||
    (receiver.val.kind !== "ref" && receiver.val.kind !== "ref_null")
  ) {
    context.errors.push({
      message: "physical object.get requires a bound reference and control-effect contract",
      func: context.func.name,
      block,
    });
  }
  return true;
}

/** Ordinary shapes retain their resolver; only bound physical reads add a control contract. */
export function objectAccessLayout(
  receiver: IrType,
  name: string,
  valueType: () => ValType,
  write: boolean,
  resolver: IrLowerResolver,
  physicalReceiver = false,
): IrObjectStructLowering {
  if (receiver.kind === "val") {
    if (!write && !physicalReceiver) throw new Error("IR physical object.get lacks its control-effect contract");
    return symbolicObjectAccess(receiver, name, valueType(), write, resolver);
  }
  const layout = receiver.kind === "object" ? resolver.resolveObject?.(receiver.shape) : undefined;
  if (!layout) throw new Error(`ir/lower: resolver cannot lower object field ${name} on ${receiver.kind}`);
  return layout;
}

/** Read the exact current allocation, never a shape-hash or display-name alias. */
export function physicalObjectFields(types: readonly TypeDef[], typeIdx: number): FieldDef[] | undefined {
  const type = types[typeIdx];
  if (!Number.isSafeInteger(typeIdx) || typeIdx < 0 || type?.kind !== "struct") return undefined;
  return type.fields;
}

/** Resolve a unique field within the exact physical allocation. */
export function physicalObjectField(
  types: readonly TypeDef[],
  typeIdx: number,
  name: string,
): IrPhysicalObjectField | null {
  const fields = physicalObjectFields(types, typeIdx);
  if (!fields) return null;
  const matches = fields.flatMap((field, index) => (field.name === name ? [{ field, index }] : []));
  if (matches.length !== 1) return null;
  const { field, index } = matches[0]!;
  return { fieldIdx: index, type: field.type, mutable: field.mutable };
}

/** Resolve a symbolic receiver and check the instruction's physical field contract. */
export function symbolicObjectAccess(
  receiver: IrType,
  name: string,
  valueType: ValType,
  write: boolean,
  resolver: IrLowerResolver,
): IrObjectStructLowering {
  if (
    receiver.kind !== "val" ||
    !receiver.typeRef ||
    (receiver.val.kind !== "ref" && receiver.val.kind !== "ref_null")
  ) {
    throw new Error("IR symbolic object access requires a bound physical reference receiver");
  }
  const typeIdx = resolver.resolveType(receiver.typeRef);
  const field = resolver.resolvePhysicalObjectField?.(typeIdx, name);
  if (!field || !Number.isSafeInteger(field.fieldIdx) || field.fieldIdx < 0) {
    throw new Error(`IR symbolic object has no exact field ${name}`);
  }
  if (write && !field.mutable) throw new Error(`IR symbolic object field ${name} is immutable`);
  const widensNullability =
    write && valueType.kind === "ref" && field.type.kind === "ref_null" && valueType.typeIdx === field.type.typeIdx;
  if (!widensNullability && !irTypeEquals(irVal(valueType), irVal(field.type))) {
    throw new Error(`IR symbolic object field ${name} has a mismatched physical type`);
  }
  return {
    typeIdx,
    fieldIdx: (requested) => {
      if (requested !== name) throw new Error("IR symbolic object access changed its field name");
      return field.fieldIdx;
    },
  };
}
