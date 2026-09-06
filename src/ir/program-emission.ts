// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
//
// #3518 package C — EMISSION of one accepted `PreparedIrProgram`.
//
//   emitAcceptedIrProgram(accepted): EmittedPreparedIrProgram
//
// One argument: every physical decision was taken at acceptance and is read
// back from the module-private acceptance record. Emission builds the concrete
// source-free physical setup itself — there is no caller-supplied resolver,
// assembler or tag reservation, so no executable authority exists outside
// acceptance. Concretely, in order:
//
//   1. reserve: function types, the shared exception tag, imported functions
//      and globals (through A's physical import registry), defined globals,
//      one function slot per physical body, and the startup adapter slot
//   2. freeze the index space
//   3. plan and seal A's authoritative `ProgramAbiMap` over the program's ABI
//      entries and bind every required binding to its reserved index
//   4. lower every physical body through the existing backend emitters into
//      its reserved slot, all or nothing
//   5. materialize startup (wasm-start section or the `__module_init` export)
//      and the ABI export aliases
//   6. derive `emittedUnitIds` from the functions actually present in the
//      module, then raise the `emitted` observation
//
// This module lives outside `src/ir/backend/` because it needs the codegen
// physical-import registry; it imports no source frontend, checker or compiler.

import { addImport, ensureExnTag } from "../codegen/registry/physical-imports.js";
import { addFuncType } from "../codegen/registry/types.js";
import type { CodegenContext } from "../codegen/context/types.js";
import { irCallableBindingKey } from "./callable-bindings.js";
import { irGlobalBindingKey } from "./abi-bindings.js";
import { LinearEmitter } from "./backend/linear-emitter.js";
import { beginAcceptedIrProgramEmission, finishAcceptedIrProgramEmission } from "./backend/program-consumer.js";
import { WasmGcEmitter } from "./backend/wasmgc-emitter.js";
import type { IrUnitId } from "./identity.js";
import { lowerIrFunctionBody, wasmValueTypeConverter, type IrLowerResolver } from "./lower.js";
import type { IrFunction, IrFuncRef, IrGlobalRef } from "./nodes.js";
import { ProgramAbiMap } from "./program-abi.js";
import {
  PreparedIrProgramInvariantError,
  type AcceptedPreparedIrProgram,
  type EmittedPreparedIrProgram,
} from "./program.js";
import type { PhysicalSetupPlan } from "./program-physical-plan.js";
import { createEmptyModule, type Instr, type ValType, type WasmFunction, type WasmModule } from "./types.js";

type PhysicalContext = Pick<
  CodegenContext,
  | "mod"
  | "funcMap"
  | "numImportFuncs"
  | "numImportGlobals"
  | "errors"
  | "indexSpaceFrozen"
  | "strictNoHostImports"
  | "linkedNamespaces"
  | "funcTypeCache"
  | "exnTagIdx"
  | "sharedExnTag"
>;

function physicalContext(module: WasmModule, sharedExnTag: boolean): CodegenContext {
  const physical: PhysicalContext = {
    mod: module,
    funcMap: new Map(),
    numImportFuncs: 0,
    numImportGlobals: 0,
    errors: [],
    indexSpaceFrozen: false,
    strictNoHostImports: false,
    linkedNamespaces: new Set(),
    funcTypeCache: new Map(),
    exnTagIdx: -1,
    sharedExnTag,
  };
  return physical as CodegenContext;
}

function emissionFailed(detail: string): never {
  throw new PreparedIrProgramInvariantError("emission-failed", `program emission: ${detail}`);
}

function sameValTypes(left: readonly ValType[], right: readonly ValType[]): boolean {
  return left.length === right.length && left.every((type, index) => type.kind === right[index]!.kind);
}

function defaultInit(type: ValType): Instr[] {
  switch (type.kind) {
    case "i32":
      return [{ op: "i32.const", value: 0 }];
    case "i64":
      return [{ op: "i64.const", value: 0n }];
    case "f32":
      return [{ op: "f32.const", value: 0 }];
    case "f64":
      return [{ op: "f64.const", value: 0 }];
    default:
      return emissionFailed(`no default initializer for global type ${type.kind}`);
  }
}

/**
 * Emit one accepted program. The acceptance token is consumed exactly once; a
 * forged or cloned acceptance, a second emission, or any body that fails to
 * lower after acceptance is an invariant and nothing is returned.
 */
export function emitAcceptedIrProgram(accepted: AcceptedPreparedIrProgram): EmittedPreparedIrProgram {
  const plan: PhysicalSetupPlan = beginAcceptedIrProgramEmission(accepted);
  const { program, options, runtime } = accepted;
  const backend = options.backend;

  // 1. Reserve every physical resource before any body is lowered.
  const module = createEmptyModule();
  const ctx = physicalContext(module, options.sharedExceptionTag);
  const funcIndexByKey = new Map<string, number>();
  const globalIndexByKey = new Map<string, number>();

  if (plan.sharedExceptionTag) ensureExnTag(ctx);

  for (const imported of plan.importedFunctions) {
    const typeIdx = addFuncType(ctx, [...imported.params], [...imported.results]);
    const record = addImport(ctx, imported.module, imported.field, { kind: "func", typeIdx });
    if (!record) emissionFailed(`import ${imported.module}.${imported.field} was refused by the physical registry`);
    funcIndexByKey.set(imported.referenceKey, ctx.numImportFuncs - 1);
  }
  for (const imported of plan.importedGlobals) {
    const record = addImport(ctx, imported.module, imported.field, {
      kind: "global",
      type: imported.type,
      mutable: imported.mutable,
    });
    if (!record)
      emissionFailed(`global import ${imported.module}.${imported.field} was refused by the physical registry`);
    globalIndexByKey.set(imported.referenceKey, ctx.numImportGlobals - 1);
  }
  for (const global of plan.definedGlobals) {
    globalIndexByKey.set(global.referenceKey, ctx.numImportGlobals + module.globals.length);
    module.globals.push({
      name: global.name,
      type: global.type,
      mutable: global.mutable,
      init: defaultInit(global.type),
    });
  }

  const slots = new Map<IrUnitId, { readonly slot: WasmFunction; readonly index: number; readonly typeIdx: number }>();
  const slotOwners = new Map<WasmFunction, IrUnitId>();
  for (const declared of plan.functions) {
    const typeIdx = addFuncType(ctx, [...declared.params], [...declared.results]);
    const index = ctx.numImportFuncs + module.functions.length;
    const slot: WasmFunction = { name: declared.name, typeIdx, locals: [], body: [], exported: false };
    module.functions.push(slot);
    slots.set(declared.unitId, { slot, index, typeIdx });
    slotOwners.set(slot, declared.unitId);
    funcIndexByKey.set(irCallableBindingKey({ kind: "unit", unitId: declared.unitId }), index);
  }
  let startAdapter: { readonly slot: WasmFunction; readonly index: number } | undefined;
  if (plan.startup.units.length > 0) {
    const typeIdx = addFuncType(ctx, [], []);
    const index = ctx.numImportFuncs + module.functions.length;
    const slot: WasmFunction = { name: "__module_init", typeIdx, locals: [], body: [], exported: false };
    module.functions.push(slot);
    startAdapter = { slot, index };
  }

  // 2. Freeze the index space: nothing below may add an import or a slot.
  ctx.indexSpaceFrozen = true;

  // 3. A's authoritative ABI over the program's entries, bound to the reserved indices.
  const abi = new ProgramAbiMap(program.inventory, program.derivedUnits);
  for (const entry of program.abi.entries) abi.plan(entry.plan);
  abi.sealPlan();
  for (const imported of plan.importedFunctions) {
    abi.bindFinalIndex(imported.bindingId, { space: "function", index: funcIndexByKey.get(imported.referenceKey)! });
  }
  for (const declared of plan.functions) {
    abi.bindFinalIndex(declared.bindingId, { space: "function", index: slots.get(declared.unitId)!.index });
  }
  for (const global of [...plan.importedGlobals, ...plan.definedGlobals]) {
    abi.bindFinalIndex(global.bindingId, { space: "global", index: globalIndexByKey.get(global.referenceKey)! });
  }
  abi.finishBinding();

  // 4. Lower every physical body into its reserved slot.
  const resolver: IrLowerResolver = {
    resolveFunc: (ref: IrFuncRef) => {
      const index = funcIndexByKey.get(irCallableBindingKey(ref.binding));
      if (index === undefined) emissionFailed(`callable ${ref.name} (${ref.binding.kind}) was not reserved`);
      return index;
    },
    resolveGlobal: (ref: IrGlobalRef) => {
      const index = globalIndexByKey.get(irGlobalBindingKey(ref.binding));
      if (index === undefined) emissionFailed(`global ${ref.name} (${ref.binding.kind}) was not reserved`);
      return index;
    },
    resolveType: (ref) => emissionFailed(`type ${ref.name} was not reserved`),
    internFuncType: (type) => addFuncType(ctx, [...type.params], [...type.results]),
  };
  const bodies = new Map<IrUnitId, IrFunction>(runtime.prepared.functions.map((fn) => [fn.unitId, fn] as const));
  for (const declared of plan.functions) {
    const fn = bodies.get(declared.unitId);
    const reserved = slots.get(declared.unitId);
    if (!fn || !reserved) emissionFailed(`physical body ${declared.unitId} vanished between acceptance and emission`);
    let lowered: ReturnType<typeof lowerIrFunctionBody<Instr[], ValType>>;
    try {
      const emitter = backend === "wasmgc" ? new WasmGcEmitter(resolver) : new LinearEmitter();
      lowered = lowerIrFunctionBody<Instr[], ValType>(
        fn,
        resolver,
        emitter,
        wasmValueTypeConverter(backend, resolver, fn.name),
      );
    } catch (error) {
      emissionFailed(
        `${backend}:${options.target} accepted body ${declared.unitId} and then failed to lower it: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    const params = lowered.params.flatMap((param) => [...param.slots]);
    const results = lowered.results.flatMap((result) => [...result]);
    if (!sameValTypes(params, declared.params) || !sameValTypes(results, declared.results)) {
      emissionFailed(`body ${declared.unitId} lowered to a signature that contradicts its reserved ABI slot`);
    }
    reserved.slot.locals = lowered.locals.flatMap((local) =>
      local.slots.map((type, slot) => ({ name: slot === 0 ? local.name : `${local.name}$${slot}`, type })),
    );
    reserved.slot.body = lowered.body;
  }

  // 5. Startup adapter and ABI export aliases.
  if (startAdapter) {
    startAdapter.slot.body = plan.startup.units.map((unitId): Instr => {
      const target = slots.get(unitId);
      if (!target) emissionFailed(`startup unit ${unitId} has no reserved slot`);
      return { op: "call", funcIdx: target.index };
    });
    if (plan.startup.adapter === "wasm-start") module.startFuncIdx = startAdapter.index;
    else if (plan.startup.adapter === "deferred-export") {
      module.exports.push({ name: "__module_init", desc: { kind: "func", index: startAdapter.index } });
    } else emissionFailed(`startup adapter ${plan.startup.adapter} has executable units but no materialization`);
  }
  const exportNames = new Set<string>(module.exports.map((entry) => entry.name));
  for (const exported of plan.exports) {
    const final = abi.resolveFinalIndex(exported.targetBindingId);
    if (!final || final.space !== "function") {
      emissionFailed(`export ${exported.externalName} does not resolve to a bound function`);
    }
    if (exportNames.has(exported.externalName)) emissionFailed(`export ${exported.externalName} is declared twice`);
    exportNames.add(exported.externalName);
    module.exports.push({ name: exported.externalName, desc: { kind: "func", index: final.index } });
  }

  // 6. Receipts come from the module itself, never from the loop counter.
  const emittedUnitIds: IrUnitId[] = [];
  for (const fn of module.functions) {
    const unitId = slotOwners.get(fn);
    if (unitId === undefined) {
      if (fn !== startAdapter?.slot) emissionFailed(`module carries an unowned function ${fn.name}`);
      continue;
    }
    if (fn.body.length === 0) emissionFailed(`reserved slot for ${unitId} was never filled`);
    emittedUnitIds.push(unitId);
  }
  if (emittedUnitIds.length !== plan.functions.length) {
    emissionFailed(`module holds ${emittedUnitIds.length} owned bodies but the plan reserved ${plan.functions.length}`);
  }
  const result: EmittedPreparedIrProgram = Object.freeze({ module, emittedUnitIds: Object.freeze(emittedUnitIds) });
  finishAcceptedIrProgramEmission(accepted);
  return result;
}
