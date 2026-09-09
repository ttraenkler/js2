// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { CodegenContext } from "../codegen/context/types.js";
import { canonicalProgramAbiTypeDef } from "../codegen/program-abi-signatures.js";
import { irTypeBindingKey } from "./abi-bindings.js";
import type { IrTypeRef } from "./nodes.js";

/** Prepare against an exact allocation without publishing candidate ownership. */
export function resolvePreparedPhysicalType(ctx: CodegenContext, ref: IrTypeRef): number {
  const session = ctx.programAbiSession;
  const key = irTypeBindingKey(ref.binding);
  const id = ref.binding.bindingId;
  const published = session?.getDraft(id);
  const registry = ctx.programAbiTypes;
  const candidate =
    !published && registry?.session === session
      ? registry?.provisionalSupportTypes().find((binding) => binding.draft.id === id)
      : undefined;
  const draft = published ?? candidate?.draft;
  if (
    !session ||
    draft?.intent.kind !== "type" ||
    draft.slotPolicy === "none" ||
    draft.structuralReferenceKey !== key
  ) {
    throw new Error("prepared closure physical carrier has no exact Program ABI type plan");
  }
  session.assertModule(ctx.mod);
  if (published) return session.resolveCurrentIndex(id, "type", key);
  const cell = candidate?.locator?.kind === "type-cell" ? candidate.locator.cell : undefined;
  const type = cell?.current;
  const index = type ? ctx.mod.types.indexOf(type) : -1;
  if (
    !type ||
    index < 0 ||
    session.typeCellFor(type) !== cell ||
    candidate?.structuralReferenceKey !== key ||
    canonicalProgramAbiTypeDef(type) !== draft.intent.shapeKey
  ) {
    throw new Error("prepared closure physical carrier lost its exact candidate allocator or shape");
  }
  return index;
}
