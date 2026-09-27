// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";
import { readonlyModuleClasses } from "../ir/readonly-module-class-plan.js";
import type { GlobalDef, ValType } from "../ir/types.js";
import type { CodegenContext, FunctionContext } from "./context/types.js";
import { emitLazyClassObjectGet } from "./expressions/extern.js";
import { emitTdzCheckAtGlobal } from "./statements/tdz.js";

const bindings = new WeakMap<CodegenContext, Map<ts.ClassDeclaration, GlobalDef>>();

export function prepareReadonlyModuleClassBindings(ctx: CodegenContext, sources: readonly ts.SourceFile[]): void {
  const owned = new Map<ts.ClassDeclaration, GlobalDef>();
  if (ctx.standalone)
    for (const source of sources) {
      for (const declaration of readonlyModuleClasses(source, ctx.oracle)) {
        const ready: GlobalDef = {
          name: `__class_binding_ready_${ctx.mod.globals.length}`,
          type: { kind: "i32" },
          mutable: true,
          init: [{ op: "i32.const", value: 0 }],
        };
        ctx.mod.globals.push(ready);
        owned.set(declaration, ready);
      }
    }
  bindings.set(ctx, owned);
}

export function readonlyModuleClassDeclarations(ctx: CodegenContext): readonly ts.ClassDeclaration[] {
  return [...(bindings.get(ctx)?.keys() ?? [])];
}

function globalIndex(ctx: CodegenContext, value: GlobalDef): number {
  const index = ctx.mod.globals.indexOf(value);
  if (index < 0) throw new Error("class binding lost its declaration-owned initialization flag");
  return ctx.numImportGlobals + index;
}

export function emitReadonlyModuleClassInitialized(
  ctx: CodegenContext,
  fctx: FunctionContext,
  declaration: ts.ClassDeclaration,
): void {
  const ready = bindings.get(ctx)?.get(declaration);
  if (!ready) throw new Error("class initialization site has no declaration-owned flag");
  fctx.body.push({ op: "i32.const", value: 1 }, { op: "global.set", index: globalIndex(ctx, ready) });
}

/** Resolve a source-module namespace class read, not a mutable TS namespace property. */
export function emitReadonlyModuleClassRead(
  ctx: CodegenContext,
  fctx: FunctionContext,
  declaration: ts.ClassDeclaration,
): ValType | undefined {
  const ready = bindings.get(ctx)?.get(declaration);
  if (!ready) return undefined;
  const owner = [...ctx.classDeclarationMap].find(([, node]) => node === declaration)?.[0];
  if (!owner || !ctx.classObjectGlobals.has(owner) || !ctx.structFields.has(owner) || !ctx.structMap.has(owner))
    return undefined;
  emitTdzCheckAtGlobal(ctx, fctx, globalIndex(ctx, ready), declaration.name!.text, true);
  if (!emitLazyClassObjectGet(ctx, fctx, owner)) throw new Error("proven class binding lost its class object");
  return { kind: "externref" };
}
