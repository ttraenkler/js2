// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { OracleTypeKey } from "../checker/oracle.js";
import { compareIrIdentity, type IrUnitId } from "../ir/identity.js";
import type { IrPlanningIdentityContext } from "../ir/planning-identity.js";
import type { StructTypeDef, ValType } from "../ir/types.js";
import { ts } from "../ts-api.js";
import type { CodegenContext } from "./context/types.js";
import { definedFuncAt, funcSignatureOf } from "./func-space.js";
import { collectSourceResultCarriers } from "./source-result-carrier-evidence.js";

export interface SourceParameterCarrierEvidence {
  readonly unitId: IrUnitId;
  readonly parameterIndex: number;
  readonly sourcePosition?: "return";
  readonly type: StructTypeDef;
  readonly nullable: boolean;
}

/** A planning snapshot, not a final ABI binding or permission to emit an index. */
export function collectSourceParameterCarriers(
  ctx: CodegenContext,
  identity: IrPlanningIdentityContext,
): ReadonlyMap<OracleTypeKey, SourceParameterCarrierEvidence> {
  const evidence = new Map<OracleTypeKey, SourceParameterCarrierEvidence | null>();
  const oracle = ctx.oracle;
  const registry = ctx.programAbiSourceCallables;
  if (!oracle || registry?.identityContext !== identity || registry.session !== ctx.programAbiSession) return new Map();
  const declarations = [...identity.declarationByUnitId].sort(([a], [b]) => compareIrIdentity(a, b));
  for (const [unitId, declaration] of declarations) {
    const unit = identity.unitByUnitId.get(unitId);
    if (
      unit?.kind !== "top-level-function" ||
      unit.lexicalOwnerId !== null ||
      !ts.isFunctionDeclaration(declaration) ||
      identity.unitIdByDeclaration.get(declaration) !== unitId ||
      declaration.typeParameters?.length ||
      declaration.asteriskToken ||
      declaration.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) ||
      declaration.parameters.some(
        (parameter) =>
          !ts.isIdentifier(parameter.name) ||
          parameter.name.text === "this" ||
          parameter.questionToken ||
          parameter.dotDotDotToken ||
          parameter.initializer,
      )
    )
      continue;
    const handle = ctx.sourceFunctionHandleByDeclaration.get(declaration);
    if (handle === undefined || registry.handleForUnit(unitId) !== handle) continue;
    const func = definedFuncAt(ctx, handle);
    const signature = funcSignatureOf(ctx, handle);
    if (
      !func ||
      registry.functionForUnit(unitId) !== func ||
      signature?.params.length !== declaration.parameters.length
    )
      continue;
    declaration.parameters.forEach((_, parameterIndex) => {
      const position = oracle.signaturePositionOf(declaration, [parameterIndex]);
      if (!position || (position.fact.kind !== "object" && position.fact.kind !== "class")) return;
      const physical: ValType = signature.params[parameterIndex]!;
      const type =
        physical.kind === "ref" || physical.kind === "ref_null" ? ctx.mod.types[physical.typeIdx] : undefined;
      const previous = evidence.get(position.typeKey);
      if (previous === null) return;
      if (
        type?.kind !== "struct" ||
        (previous && (previous.type !== type || previous.nullable !== (physical.kind === "ref_null")))
      ) {
        evidence.set(position.typeKey, null);
        return;
      }
      if (!previous)
        evidence.set(
          position.typeKey,
          Object.freeze({ unitId, parameterIndex, type, nullable: physical.kind === "ref_null" }),
        );
    });
  }
  // Result-only types supplement absent parameter evidence, never override or
  // redeem a conflicting parameter witness (represented by a present null).
  for (const [key, result] of collectSourceResultCarriers(ctx, identity)) {
    if (!evidence.has(key)) evidence.set(key, result);
  }
  return new Map(
    [...evidence].filter((entry): entry is [OracleTypeKey, SourceParameterCarrierEvidence] => entry[1] !== null),
  );
}
