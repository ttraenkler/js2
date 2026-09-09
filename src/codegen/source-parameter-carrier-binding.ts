// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { OracleTypeKey } from "../checker/oracle.js";
import { irSupportTypeRef, irTypeBindingKey } from "../ir/abi-bindings.js";
import type { IrBindingId } from "../ir/identity.js";
import type { IrType } from "../ir/nodes.js";
import type { IrPlanningIdentityContext } from "../ir/planning-identity.js";
import { ProgramAbiInvariantError } from "../ir/program-abi.js";
import type { CodegenContext } from "./context/types.js";
import type { PreparedProgramAbiProvisionalBinding } from "./program-abi-prepared-transaction.js";
import type { ProgramAbiSession, ProgramAbiTypeCell } from "./program-abi-session.js";
import { canonicalProgramAbiTypeDef } from "./program-abi-signatures.js";
import { describeProgramAbiSupportType } from "./program-abi-support-type-description.js";
import { collectSourceParameterCarriers } from "./source-parameter-carrier-evidence.js";

/** The registry supplies its candidate maps; this never publishes ownership. */
export function prepareSourceParameterCarrierBinding(input: {
  readonly ctx: CodegenContext;
  readonly session: ProgramAbiSession;
  readonly identityContext: IrPlanningIdentityContext;
  readonly typeKey: OracleTypeKey;
  readonly candidates: Map<IrBindingId, PreparedProgramAbiProvisionalBinding>;
  readonly owners: Map<ProgramAbiTypeCell, IrBindingId>;
  readonly roleOrdinal: number;
}): IrType | undefined {
  const { ctx, session, identityContext, candidates, owners } = input;
  const evidence = collectSourceParameterCarriers(ctx, identityContext).get(input.typeKey);
  if (!evidence) return undefined;
  const { unitId, parameterIndex, type, nullable } = evidence;
  const role = evidence.sourcePosition === "return" ? "source-result-carrier" : "source-parameter-carrier";
  const label = evidence.sourcePosition === "return" ? "source result carrier" : "source parameter carrier";
  let ref = irSupportTypeRef(unitId, role, label, parameterIndex);
  const previous = candidates.get(ref.binding.bindingId);
  if (previous && (previous.locator?.kind !== "type-cell" || previous.locator.cell.current !== type)) {
    throw new ProgramAbiInvariantError("type-remap-mismatch", "source parameter carrier changed its allocation");
  }
  const cell = session.typeCellFor(type) ?? session.createTypeCell(type);
  const previousOwner = session.locatorBindingId(cell) ?? owners.get(cell);
  if (previousOwner !== undefined) {
    const draft = session.getDraft(previousOwner) ?? candidates.get(previousOwner)?.draft;
    ref = Object.freeze({ ...ref, binding: Object.freeze({ kind: "support" as const, bindingId: previousOwner }) });
    if (
      draft?.intent.kind !== "type" ||
      draft.slotPolicy === "none" ||
      draft.structuralReferenceKey !== irTypeBindingKey(ref.binding) ||
      draft.intent.shapeKey !== canonicalProgramAbiTypeDef(type)
    ) {
      throw new ProgramAbiInvariantError(
        "type-remap-mismatch",
        "source carrier cannot reuse a stale or non-support owner",
      );
    }
  } else {
    const contribution = describeProgramAbiSupportType({
      session,
      unitId,
      ref,
      type,
      cell,
      roleOrdinal: input.roleOrdinal,
      derivedOrdinal: parameterIndex,
    });
    candidates.set(contribution.draft.id, contribution);
    owners.set(cell, contribution.draft.id);
  }
  return Object.freeze({
    kind: "val",
    val: Object.freeze({ kind: nullable ? "ref_null" : "ref", typeIdx: ctx.mod.types.indexOf(type) }),
    typeRef: ref,
  });
}
