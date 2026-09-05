// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
//
// #3518 package C — the one backend consumer of the production
// `PreparedIrProgram` (package A's schema).
//
// Both backends call this with the SAME decoded program object and their own
// resolver / emitter / type-converter factories. Everything that can be known
// before emission is decided here, in order, and nothing is lowered until the
// whole program has passed:
//
//   1. shape        — the codec's structural contract (containers, joins)
//   2. verify       — `verifyIrFunction` per body against the program's declarations
//   3. resolve      — every unit/support reference resolves inside the program
//   4. legality     — the backend's own `verifyIrBackendLegality` per body
//   5. lower        — `lowerIrFunctionBody` for every body, all-or-nothing
//
// A failure is a typed value, never a partially emitted module: a backend
// capability gap is `unsupported`, a contradiction in the program or a body
// that passed legality and still failed to lower is `invariant`. The consumer
// reads no source, checker, AST or codegen context; symbolic import/runtime/
// intrinsic bindings are resolved below this boundary by the backend resolver.

import type { Instr } from "../types.js";
import type { IrUnitId } from "../identity.js";
import { forEachInstrDeep, type IrFuncRef, type IrFunction, type IrGlobalRef } from "../nodes.js";
import { lowerIrFunctionBody, type IrLoweredBody, type IrLowerResolver } from "../lower.js";
import { defaultTagDomain } from "../producer.js";
import { verifyIrFunction } from "../verify.js";
import { assertPreparedIrProgramShape } from "../program-codec.js";
import {
  preparedIrProgramAbiLookup,
  preparedIrProgramOwner,
  type PreparedIrProgram,
  type PreparedIrProgramOwner,
} from "../program.js";
import type { TypeConverter } from "./contract.js";
import type { BackendEmitter } from "./emitter.js";
import { verifyIrBackendLegality, type IrBackendKind, type IrBackendLegalityError } from "./legality.js";

export interface PreparedIrProgramBackendFactories<S = Instr[], Slot = unknown> {
  readonly resolver: IrLowerResolver;
  makeTypeConverter(fn: IrFunction): TypeConverter<Slot>;
  makeEmitter(fn: IrFunction): BackendEmitter<S>;
}

export interface PreparedIrProgramLoweredBody<S = Instr[], Slot = unknown> {
  readonly unitId: IrUnitId;
  readonly func: IrFunction;
  readonly lowered: IrLoweredBody<S, Slot>;
  readonly emitter: BackendEmitter<S>;
}

export type PreparedIrProgramConsumption<S = Instr[], Slot = unknown> =
  | {
      readonly kind: "lowered";
      readonly backend: IrBackendKind;
      readonly bodies: readonly PreparedIrProgramLoweredBody<S, Slot>[];
    }
  | {
      /** The backend cannot carry this program; reported before any emission. */
      readonly kind: "unsupported";
      readonly backend: IrBackendKind;
      readonly stage: "backend-legality";
      readonly unitId: IrUnitId;
      readonly owner: PreparedIrProgramOwner | undefined;
      readonly detail: string;
      readonly errors: readonly IrBackendLegalityError[];
    }
  | {
      /** The program contradicts itself, or an accepted body failed to lower. */
      readonly kind: "invariant";
      readonly backend: IrBackendKind;
      readonly stage: "verify" | "resolve" | "lower";
      readonly code: "verifier-failure" | "unknown-function-ref" | "unknown-global-ref" | "unexpected-internal-throw";
      readonly unitId: IrUnitId | undefined;
      readonly owner: PreparedIrProgramOwner | undefined;
      readonly detail: string;
    };

export interface ConsumePreparedIrProgramInput<S = Instr[], Slot = unknown> {
  readonly program: PreparedIrProgram;
  readonly backend: IrBackendKind;
  readonly factories: PreparedIrProgramBackendFactories<S, Slot>;
}

function instructionBuffers(fn: IrFunction) {
  return [...fn.blocks.map((block) => block.instrs), ...(fn.asyncPlan?.states.map((state) => state.body) ?? [])];
}

/**
 * Consume one verified program for one backend. The same `program` object may
 * be consumed by several backends; the consumer never mutates it.
 */
export function consumePreparedIrProgram<S = Instr[], Slot = unknown>(
  input: ConsumePreparedIrProgramInput<S, Slot>,
): PreparedIrProgramConsumption<S, Slot> {
  const { program, backend, factories } = input;
  assertPreparedIrProgramShape(program);
  const abi = preparedIrProgramAbiLookup(program.abi);
  const owner = (unitId: IrUnitId) => preparedIrProgramOwner(program, unitId);
  const bodies = new Map<IrUnitId, IrFunction>(program.ir.functions.map((fn) => [fn.unitId, fn] as const));

  // 2. verify — the program's own declarations are the only type context.
  for (const fn of program.ir.functions) {
    const errors = verifyIrFunction(fn, defaultTagDomain(), program.ir);
    if (errors.length > 0) {
      return {
        kind: "invariant",
        backend,
        stage: "verify",
        code: "verifier-failure",
        unitId: fn.unitId,
        owner: owner(fn.unitId),
        detail: `body ${fn.unitId} failed verification: ${errors.map((error) => error.message).join("; ")}`,
      };
    }
  }

  // 3. resolve — unit and support references must close inside the program.
  for (const fn of program.ir.functions) {
    const missingFunc = (ref: IrFuncRef): string | undefined => {
      if (ref.binding.kind === "unit" && !bodies.has(ref.binding.unitId)) {
        return `references unit body ${ref.binding.unitId}, which the program does not carry`;
      }
      if (ref.binding.kind === "support") {
        const entry = abi.get(ref.binding.bindingId);
        if (!entry || entry.intent.kind !== "callable") {
          return `references support callable ${ref.binding.bindingId}, which the program ABI does not plan`;
        }
      }
      return undefined;
    };
    const missingGlobal = (ref: IrGlobalRef): string | undefined => {
      if (ref.binding.kind === "source" || ref.binding.kind === "support") {
        const entry = abi.get(ref.binding.bindingId);
        if (!entry || entry.intent.kind !== "global") {
          return `references global ${ref.binding.bindingId}, which the program ABI does not plan`;
        }
      }
      return undefined;
    };
    let failure: { readonly code: "unknown-function-ref" | "unknown-global-ref"; readonly detail: string } | undefined;
    for (const buffer of instructionBuffers(fn)) {
      for (const root of buffer) {
        forEachInstrDeep(root, (instruction) => {
          if (failure) return;
          if (instruction.kind === "call") {
            const detail = missingFunc(instruction.target);
            if (detail) failure = { code: "unknown-function-ref", detail };
          } else if (instruction.kind === "closure.new") {
            const detail = missingFunc(instruction.liftedFunc);
            if (detail) failure = { code: "unknown-function-ref", detail };
          } else if (instruction.kind === "global.get" || instruction.kind === "global.set") {
            const detail = missingGlobal(instruction.target);
            if (detail) failure = { code: "unknown-global-ref", detail };
          }
        });
      }
    }
    if (failure) {
      return {
        kind: "invariant",
        backend,
        stage: "resolve",
        code: failure.code,
        unitId: fn.unitId,
        owner: owner(fn.unitId),
        detail: `body ${fn.unitId} ${failure.detail}`,
      };
    }
  }

  // 4. legality — the backend's capability verdict, still before emission.
  const runtimeBackends = new Set(program.runtime.map((projection) => projection.backend));
  for (const fn of program.ir.functions) {
    if (fn.asyncPlan && (backend === "wasmgc" || backend === "linear") && !runtimeBackends.has(backend)) {
      return {
        kind: "unsupported",
        backend,
        stage: "backend-legality",
        unitId: fn.unitId,
        owner: owner(fn.unitId),
        detail: `body ${fn.unitId} carries an async plan but the program has no ${backend} runtime projection`,
        errors: [],
      };
    }
    const errors = verifyIrBackendLegality(fn, backend);
    if (errors.length > 0) {
      return {
        kind: "unsupported",
        backend,
        stage: "backend-legality",
        unitId: fn.unitId,
        owner: owner(fn.unitId),
        detail: `${backend} cannot lower body ${fn.unitId}: ${errors.map((error) => error.message).join("; ")}`,
        errors,
      };
    }
  }

  // 5. lower — all or nothing; a failure here is a missing adapter, not a gap.
  const lowered: PreparedIrProgramLoweredBody<S, Slot>[] = [];
  for (const fn of program.ir.functions) {
    try {
      const emitter = factories.makeEmitter(fn);
      const body = lowerIrFunctionBody(fn, factories.resolver, emitter, factories.makeTypeConverter(fn));
      lowered.push({ unitId: fn.unitId, func: fn, lowered: body, emitter });
    } catch (error) {
      return {
        kind: "invariant",
        backend,
        stage: "lower",
        code: "unexpected-internal-throw",
        unitId: fn.unitId,
        owner: owner(fn.unitId),
        detail: `${backend} accepted body ${fn.unitId} and then failed to lower it: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
  return { kind: "lowered", backend, bodies: Object.freeze(lowered) };
}
