// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { generatorOwnedCaptures } from "../frontend/ts/generator-owned-captures.js";
import type { CodegenContext, FunctionContext, NativeGeneratorInfo } from "./context/types.js";
import type { GeneratorDecl } from "./generators-native.js";
import type { FieldDef, ValType } from "../ir/types.js";
import { getOrRegisterRefCellType } from "./registry/types.js";
import { allocLocal, getLocalType } from "./context/locals.js";
import { ts } from "../ts-api.js";
import { emitFuncRefAsClosure } from "./closures/funcref-as-closure.js";
import { popBody, pushBody } from "./context/bodies.js";

/** Choose persistent cells before frame fields, reloads, or nested ABIs are emitted. */
export function planGeneratorOwnedCells(
  ctx: CodegenContext,
  decl: GeneratorDecl,
  groups: readonly { names: readonly string[]; types: ValType[] }[],
): NativeGeneratorInfo["ownedCells"] {
  if (!decl.body) return undefined;
  const names = generatorOwnedCaptures(decl.body, ctx.oracle);
  const cells: NonNullable<NativeGeneratorInfo["ownedCells"]> = new Map();
  for (const group of groups) {
    for (let i = 0; i < group.names.length; i++) {
      const name = group.names[i]!;
      if (!names.has(name)) continue;
      const valType = group.types[i]!;
      const refCellTypeIdx = getOrRegisterRefCellType(ctx, valType);
      const tdzCellTypeIdx = names.get(name) ? getOrRegisterRefCellType(ctx, { kind: "i32" }) : undefined;
      cells.set(name, { refCellTypeIdx, valType, tdzCellTypeIdx });
      group.types[i] = { kind: "ref_null", typeIdx: refCellTypeIdx };
    }
  }
  return cells.size ? cells : undefined;
}

/** Restore the same initialization flag that escaped helpers capture. */
export function restoreGeneratorOwnedTdz(info: NativeGeneratorInfo, fctx: FunctionContext, stateLocal: number): void {
  for (const [name, cell] of info.ownedCells ?? []) (fctx.boxedCaptures ??= new Map()).set(name, cell);
  let fieldIdx = info.spillFieldOffset + info.spillNames.length;
  for (const [name, cell] of info.ownedCells ?? []) {
    if (cell.tdzCellTypeIdx === undefined) continue;
    const localIdx = allocLocal(fctx, `__gen_tdz_${name}`, { kind: "ref_null", typeIdx: cell.tdzCellTypeIdx });
    fctx.body.push(
      { op: "local.get", index: stateLocal },
      { op: "struct.get", typeIdx: info.stateTypeIdx, fieldIdx: fieldIdx++ },
      { op: "local.set", index: localIdx },
    );
    (fctx.boxedTdzFlags ??= new Map()).set(name, { refCellTypeIdx: cell.tdzCellTypeIdx, localIdx });
    (fctx.tdzFlagLocals ??= new Map()).set(name, localIdx);
  }
}

export function generatorOwnedTdzFields(cells: NativeGeneratorInfo["ownedCells"]): FieldDef[] {
  const fields: FieldDef[] = [];
  for (const [name, cell] of cells ?? []) {
    if (cell.tdzCellTypeIdx !== undefined) {
      fields.push({ name: `tdz_${name}`, type: { kind: "ref_null", typeIdx: cell.tdzCellTypeIdx }, mutable: false });
    }
  }
  return fields;
}

export function generatorParameterFields(names: readonly string[], types: readonly ValType[]): FieldDef[] {
  return types.map((type, i) => ({ name: `param_${names[i] ?? i}`, type, mutable: false }));
}

/** A resume call is not a new lexical activation: retain lazily built helper values. */
export function persistGeneratorClosureMemos(
  ctx: CodegenContext,
  info: NativeGeneratorInfo,
  fctx: FunctionContext,
): void {
  const state = ctx.mod.types[info.stateTypeIdx];
  if (state?.kind !== "struct") return;
  for (const localIdx of fctx.nestedFnClosureMemos?.values() ?? []) {
    const type = getLocalType(fctx, localIdx);
    if (!type || type.kind !== "ref_null") throw new Error("Generator closure memo must be nullable");
    const fieldIdx = state.fields.length;
    state.fields.push({ name: `closure_memo_${localIdx}`, type, mutable: true });
    (info.closureMemoTypes ??= []).push(type.typeIdx);
    fctx.body.unshift(
      { op: "local.get", index: 0 },
      { op: "struct.get", typeIdx: info.stateTypeIdx, fieldIdx },
      { op: "local.set", index: localIdx },
    );
    // The trampoline leaves its result on the stack; these void stores preserve it.
    fctx.body.push(
      { op: "local.get", index: 0 },
      { op: "local.get", index: localIdx },
      { op: "struct.set", typeIdx: info.stateTypeIdx, fieldIdx },
    );
  }
}

/** Even a capture-free nested declaration belongs to this activation, not the module. */
export function initializeGeneratorHelperValues(
  ctx: CodegenContext,
  info: NativeGeneratorInfo,
  fctx: FunctionContext,
): void {
  for (const stmt of info.decl.body?.statements ?? []) {
    if (!ts.isFunctionDeclaration(stmt) || !stmt.name || stmt.asteriskToken) continue;
    const name = stmt.name.text;
    if (ctx.nestedFuncCaptures.get(name)?.length) continue;
    const funcIdx = ctx.funcMap.get(name);
    if (funcIdx === undefined || ctx.funcMapOwnerDecl.get(name) !== stmt) continue;
    const saved = pushBody(fctx);
    const type = emitFuncRefAsClosure(ctx, fctx, name, funcIdx, true);
    const init = fctx.body;
    popBody(fctx, saved);
    if (!type || (type.kind !== "ref" && type.kind !== "ref_null")) continue;
    const localIdx = allocLocal(fctx, name, { kind: "ref_null", typeIdx: type.typeIdx });
    (fctx.nestedFnClosureMemos ??= new Map()).set(name, localIdx);
    (fctx.materializedHoistedFunctionValueBindings ??= new Set()).add(name);
    // This frame initializes and restores the binding itself; ordinary lazy
    // publication would replace it with the module singleton on every read.
    fctx.hoistedFunctionValueBindings?.delete(name);
    fctx.body.push(
      { op: "local.get", index: localIdx },
      { op: "ref.is_null" },
      { op: "if", blockType: { kind: "empty" }, then: [...init, { op: "local.set", index: localIdx }], else: [] },
    );
  }
}
