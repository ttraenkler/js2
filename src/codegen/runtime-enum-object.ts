// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";
import { planEnumObject, type EnumObjectPlan } from "../ir/enum-object-plan.js";
import { enumObjectDeclaration, runtimeEnumObjectDeclarations } from "../ir/enum-object-reference.js";
import type { GlobalDef, ValType } from "../ir/types.js";
import type { CodegenContext, FunctionContext } from "./context/types.js";
import { canonicalUndefinedExternInstrs } from "./any-helpers.js";
import { ensureLateImport, flushLateImportShifts } from "./expressions/late-imports.js";
import { stringConstantExternrefInstrs } from "./native-strings.js";
import { addStringConstantGlobal } from "./registry/imports.js";
import { allocLocal } from "./context/locals.js";
import { coerceType } from "./shared.js";

interface Binding {
  readonly plan: EnumObjectPlan;
  readonly global: GlobalDef;
}
const bindings = new WeakMap<CodegenContext, Map<ts.EnumDeclaration, Binding>>();

export function prepareRuntimeEnumObjects(ctx: CodegenContext, sources: readonly ts.SourceFile[]): void {
  const owned = new Map<ts.EnumDeclaration, Binding>();
  for (const declaration of runtimeEnumObjectDeclarations(sources, ctx.checker)) {
    // Function-local and merged enums require different allocation lifetimes.
    if (!ts.isSourceFile(declaration.parent)) continue;
    const plan = planEnumObject(declaration, ctx.checker);
    if (!plan) continue;
    const global: GlobalDef = {
      name: `__enum_object_${ctx.mod.globals.length}`,
      type: { kind: "externref" },
      mutable: true,
      init: [{ op: "ref.null.extern" }],
    };
    ctx.mod.globals.push(global);
    owned.set(declaration, { plan, global });
  }
  bindings.set(ctx, owned);
}

export function hasRuntimeEnumObject(ctx: CodegenContext, declaration: ts.EnumDeclaration): boolean {
  return bindings.get(ctx)?.has(declaration) === true;
}

function indexOf(ctx: CodegenContext, binding: Binding): number {
  const index = ctx.mod.globals.indexOf(binding.global);
  if (index < 0) throw new Error("runtime enum object lost its declaration-owned global");
  return ctx.numImportGlobals + index;
}

export function emitRuntimeEnumObjectRead(
  ctx: CodegenContext,
  fctx: FunctionContext,
  expression: ts.Expression,
): ValType | undefined {
  const declaration = enumObjectDeclaration(expression, ctx.checker);
  const binding = declaration && bindings.get(ctx)?.get(declaration);
  if (!binding) return undefined;
  // The canonical helper only looks up host undefined; without registering
  // it first its fallback is null, which gives the wrong early-read typeof.
  if (!(ctx.standalone || ctx.nativeStrings)) {
    ensureLateImport(ctx, "__get_undefined", [], [{ kind: "externref" }]);
    flushLateImportShifts(ctx, fctx);
  }
  const uninitialized = canonicalUndefinedExternInstrs(ctx);
  const index = indexOf(ctx, binding);
  fctx.body.push(
    { op: "global.get", index },
    { op: "ref.is_null" },
    {
      op: "if",
      blockType: { kind: "val", type: { kind: "externref" } },
      then: uninitialized,
      else: [{ op: "global.get", index }],
    },
  );
  return { kind: "externref" };
}

/** Execute the shared plan only at its source declaration's initialization site. */
export function emitRuntimeEnumObjectInit(
  ctx: CodegenContext,
  fctx: FunctionContext,
  declaration: ts.EnumDeclaration,
): boolean {
  const binding = bindings.get(ctx)?.get(declaration);
  if (!binding) return false;
  ensureLateImport(ctx, "__new_plain_object", [], [{ kind: "externref" }]);
  ensureLateImport(ctx, "__extern_set", [{ kind: "externref" }, { kind: "externref" }, { kind: "externref" }], []);
  for (const write of binding.plan.writes) {
    addStringConstantGlobal(ctx, write.key);
    if (typeof write.value === "string") addStringConstantGlobal(ctx, write.value);
  }
  flushLateImportShifts(ctx, fctx);
  const object = allocLocal(fctx, `__enum_init_${fctx.locals.length}`, { kind: "externref" });
  fctx.body.push(
    { op: "call", funcIdx: ctx.funcMap.get("__new_plain_object")! },
    { op: "local.tee", index: object },
    { op: "global.set", index: indexOf(ctx, binding) },
  );
  for (const write of binding.plan.writes) {
    fctx.body.push({ op: "local.get", index: object }, ...stringConstantExternrefInstrs(ctx, write.key));
    if (typeof write.value === "string") fctx.body.push(...stringConstantExternrefInstrs(ctx, write.value));
    else {
      fctx.body.push({ op: "f64.const", value: write.value });
      coerceType(ctx, fctx, { kind: "f64" }, { kind: "externref" });
    }
    fctx.body.push({ op: "call", funcIdx: ctx.funcMap.get("__extern_set")! });
  }
  return true;
}
