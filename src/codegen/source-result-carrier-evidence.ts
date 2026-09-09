// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { OracleTypeKey } from "../checker/oracle.js";
import { compareIrIdentity } from "../ir/identity.js";
import type { IrPlanningIdentityContext } from "../ir/planning-identity.js";
import { ts } from "../ts-api.js";
import type { CodegenContext } from "./context/types.js";
import { definedFuncAt, funcSignatureOf } from "./func-space.js";
import type { SourceParameterCarrierEvidence } from "./source-parameter-carrier-evidence.js";

/** Results have no hidden capture offset; still require exact source/allocator identity. */
export function collectSourceResultCarriers(
  ctx: CodegenContext,
  identity: IrPlanningIdentityContext,
): ReadonlyMap<OracleTypeKey, SourceParameterCarrierEvidence> {
  const registry = ctx.programAbiSourceCallables;
  if (!ctx.oracle || registry?.identityContext !== identity || registry.session !== ctx.programAbiSession)
    return new Map();
  const evidence = new Map<OracleTypeKey, SourceParameterCarrierEvidence | null>();
  for (const [unitId, declaration] of [...identity.declarationByUnitId].sort(([a], [b]) => compareIrIdentity(a, b))) {
    const unit = identity.unitByUnitId.get(unitId);
    if (
      !unit ||
      (unit.kind !== "top-level-function" && unit.kind !== "nested-function") ||
      !ts.isFunctionDeclaration(declaration) ||
      identity.unitIdByDeclaration.get(declaration) !== unitId ||
      declaration.typeParameters?.length ||
      declaration.asteriskToken ||
      declaration.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword)
    )
      continue;
    const handle = ctx.sourceFunctionHandleByDeclaration.get(declaration);
    if (handle === undefined || registry.handleForUnit(unitId) !== handle) continue;
    const func = definedFuncAt(ctx, handle);
    const signature = funcSignatureOf(ctx, handle);
    if (!func || registry.functionForUnit(unitId) !== func || !signature) continue;
    const position = ctx.oracle.signaturePositionOf(declaration, ["return"]);
    if (!position || (position.fact.kind !== "class" && position.fact.kind !== "object")) continue;
    const physical = signature.results.length === 1 ? signature.results[0] : undefined;
    const type =
      physical && (physical.kind === "ref" || physical.kind === "ref_null")
        ? ctx.mod.types[physical.typeIdx]
        : undefined;
    const previous = evidence.get(position.typeKey);
    if (previous === null) continue;
    if (
      type?.kind !== "struct" ||
      (previous && (previous.type !== type || previous.nullable !== (physical?.kind === "ref_null")))
    ) {
      evidence.set(position.typeKey, null);
      continue;
    }
    if (!previous)
      evidence.set(
        position.typeKey,
        Object.freeze({
          unitId,
          parameterIndex: 0,
          sourcePosition: "return",
          type,
          nullable: physical?.kind === "ref_null",
        }),
      );
  }
  return new Map(
    [...evidence].filter((entry): entry is [OracleTypeKey, SourceParameterCarrierEvidence] => entry[1] !== null),
  );
}
