// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
//
// #3518 package C — the one backend consumer of the production
// `PreparedIrProgram` (package A's schema and acceptance/emission types).
//
//   acceptPreparedIrProgram(program, options)  →  PreparedIrBackendAcceptance
//   emitAcceptedIrProgram(accepted, plan)      →  EmittedPreparedIrProgram
//
// Acceptance decides everything that can be known before emission, in order:
// A's complete validator; exact backend/target runtime projection selection;
// in-program body closure of every unit call on the PHYSICAL functions of that
// projection; the backend's own legality verdict per body. A failure is a
// located typed value (A's `PreparedIrProgramFailure`), never a partially
// emitted module. Acceptance is authenticated by a module-private token so a
// structurally forged or cloned acceptance cannot be emitted.
//
// Emission lowers every physical body through the existing
// `lowerIrFunctionBody`, all or nothing, then hands the lowered bodies to the
// backend's physical plan to assemble the module. It returns the module plus
// the exact unit receipts the loop produced. The consumer reads no source,
// checker, AST or codegen context; symbolic import/runtime/intrinsic bindings
// are resolved below this boundary by the backend resolver.

import type { Instr, WasmModule } from "../types.js";
import type { IrUnitId } from "../identity.js";
import { forEachInstrDeep, type IrFuncRef, type IrFunction } from "../nodes.js";
import { lowerIrFunctionBody, type IrLoweredBody, type IrLowerResolver } from "../lower.js";
import type { IrPreparationFailure } from "../outcomes.js";
import {
  preparedIrProgramOwner,
  PreparedIrProgramInvariantError,
  type AcceptedPreparedIrProgram,
  type EmittedPreparedIrProgram,
  type PreparedIrBackendAcceptance,
  type PreparedIrBackendOptions,
  type PreparedIrProgram,
  type PreparedIrProgramFailure,
  type PreparedIrProgramRuntimeProjection,
} from "../program.js";
import { observePreparedIrProgram } from "../program-observation.js";
import { assertPreparedIrProgram } from "../program-validation.js";
import type { TypeConverter } from "./contract.js";
import type { BackendEmitter } from "./emitter.js";
import { verifyIrBackendLegality } from "./legality.js";

export interface PreparedIrProgramLoweredBody<S = Instr[], Slot = unknown> {
  readonly unitId: IrUnitId;
  readonly func: IrFunction;
  readonly lowered: IrLoweredBody<S, Slot>;
  readonly emitter: BackendEmitter<S>;
}

/**
 * The backend's resolved physical setup for one accepted program: how bodies
 * are lowered and how the lowered bodies become a module. Nothing in here may
 * consult source or checker state; the resolver answers symbolic bindings only.
 */
export interface PreparedIrBackendPhysicalPlan<S = Instr[], Slot = unknown> {
  readonly resolver: IrLowerResolver;
  makeTypeConverter(fn: IrFunction): TypeConverter<Slot>;
  makeEmitter(fn: IrFunction): BackendEmitter<S>;
  /** Reserve the selected shared exception tag; required when `options.sharedExceptionTag` is set. */
  reserveSharedExceptionTag?(accepted: AcceptedPreparedIrProgram): void;
  /** Assemble the module from the lowered physical bodies in projection order. */
  assemble(bodies: readonly PreparedIrProgramLoweredBody<S, Slot>[], accepted: AcceptedPreparedIrProgram): WasmModule;
}

/** Module-private authority: only acceptances minted here may be emitted, each exactly once. */
const acceptances = new WeakSet<AcceptedPreparedIrProgram>();
const emitted = new WeakSet<AcceptedPreparedIrProgram>();

function programInvariant(code: PreparedIrProgramInvariantError["code"], detail: string): never {
  throw new PreparedIrProgramInvariantError(code, `program consumer: ${detail}`);
}

function locate(program: PreparedIrProgram, unitId: IrUnitId, failure: IrPreparationFailure): PreparedIrProgramFailure {
  const owner = preparedIrProgramOwner(program, unitId);
  if (!owner) programInvariant("invalid-prepared-data", `cannot locate ${unitId}: ${failure.detail}`);
  const { cause: _cause, ...diagnostic } = failure;
  return Object.freeze({ ...diagnostic, unitId: owner.unitId, location: owner.location, sourceFile: owner.sourceFile });
}

function instructionBuffers(fn: IrFunction) {
  return [...fn.blocks.map((block) => block.instrs), ...(fn.asyncPlan?.states.map((state) => state.body) ?? [])];
}

function selectProjection(
  program: PreparedIrProgram,
  options: PreparedIrBackendOptions,
): PreparedIrProgramRuntimeProjection | undefined {
  return program.runtime.find(
    (projection) => projection.backend === options.backend && projection.target === options.target,
  );
}

/**
 * Accept one complete program for one exact backend/target. Returns A's typed
 * located failure for a backend capability gap (`unsupported`) or a program
 * contradiction found at consumption time (`invariant`); throws
 * `PreparedIrProgramInvariantError` for defects that have no owning unit.
 */
export function acceptPreparedIrProgram(
  program: PreparedIrProgram,
  options: PreparedIrBackendOptions,
): PreparedIrBackendAcceptance {
  assertPreparedIrProgram(program);
  if (options.linear !== undefined && options.backend !== "linear") {
    programInvariant("invalid-prepared-data", `linear physical options were supplied for backend ${options.backend}`);
  }
  const runtime = selectProjection(program, options);
  if (!runtime) {
    const available = program.runtime.map((projection) => `${projection.backend}:${projection.target}`).join(", ");
    const unitId = program.ir.functions[0]?.unitId ?? program.inventory.terminalUnits[0]?.id;
    if (!unitId) programInvariant("invalid-prepared-data", "program carries no unit to locate a projection failure");
    return locate(program, unitId, {
      kind: "unsupported",
      code: "body-shape-rejected",
      stage: "build",
      detail: `program has no ${options.backend}:${options.target} runtime projection (available: ${available || "none"})`,
    });
  }

  // The physical functions of the selected projection are what gets lowered.
  const bodies = new Map<IrUnitId, IrFunction>(runtime.prepared.functions.map((fn) => [fn.unitId, fn] as const));
  for (const fn of runtime.prepared.functions) {
    let missing: string | undefined;
    const check = (ref: IrFuncRef, what: string): void => {
      if (missing === undefined && ref.binding.kind === "unit" && !bodies.has(ref.binding.unitId)) {
        missing = `${what} unit body ${ref.binding.unitId}, which the ${options.backend}:${options.target} projection does not carry`;
      }
    };
    for (const buffer of instructionBuffers(fn)) {
      for (const root of buffer) {
        forEachInstrDeep(root, (instruction) => {
          if (instruction.kind === "call") check(instruction.target, "calls");
          else if (instruction.kind === "closure.new") check(instruction.liftedFunc, "captures");
        });
      }
    }
    if (missing !== undefined) {
      return locate(program, fn.unitId, {
        kind: "invariant",
        code: "unknown-function-ref",
        stage: "resolve",
        detail: `body ${fn.unitId} ${missing}`,
      });
    }
  }

  for (const fn of runtime.prepared.functions) {
    const errors = verifyIrBackendLegality(fn, options.backend);
    if (errors.length > 0) {
      return locate(program, fn.unitId, {
        kind: "unsupported",
        code: "body-shape-rejected",
        stage: "build",
        detail: `${options.backend}:${options.target} cannot lower body ${fn.unitId}: ${errors.map((error) => error.message).join("; ")}`,
      });
    }
  }

  const accepted = Object.freeze({
    kind: "accepted",
    program,
    options: Object.freeze({ ...options, linear: options.linear ? Object.freeze({ ...options.linear }) : undefined }),
    runtime,
  }) as unknown as AcceptedPreparedIrProgram;
  acceptances.add(accepted);
  observePreparedIrProgram({ phase: "accepted", program, backend: options.backend, target: options.target });
  return accepted;
}

/** True only for an acceptance minted by `acceptPreparedIrProgram` in this process. */
export function isAuthenticAcceptedIrProgram(value: unknown): value is AcceptedPreparedIrProgram {
  return typeof value === "object" && value !== null && acceptances.has(value as AcceptedPreparedIrProgram);
}

/**
 * Emit one accepted program exactly once. Every physical body of the selected
 * projection is lowered before anything is assembled; a body that passed
 * acceptance and still fails to lower is an invariant and nothing is returned.
 */
export function emitAcceptedIrProgram<S = Instr[], Slot = unknown>(
  accepted: AcceptedPreparedIrProgram,
  plan: PreparedIrBackendPhysicalPlan<S, Slot>,
): EmittedPreparedIrProgram {
  if (!isAuthenticAcceptedIrProgram(accepted)) {
    programInvariant("invalid-transaction-capability", "acceptance was not produced by acceptPreparedIrProgram");
  }
  if (emitted.has(accepted)) programInvariant("invalid-transaction-capability", "acceptance was already emitted");
  emitted.add(accepted);
  const { program, options, runtime } = accepted;
  observePreparedIrProgram({ phase: "emission-started", program, backend: options.backend, target: options.target });

  if (options.sharedExceptionTag) {
    if (!plan.reserveSharedExceptionTag) {
      programInvariant(
        "emission-failed",
        "options request a shared exception tag but the physical plan cannot reserve one",
      );
    }
    plan.reserveSharedExceptionTag(accepted);
  }

  const bodies: PreparedIrProgramLoweredBody<S, Slot>[] = [];
  for (const fn of runtime.prepared.functions) {
    try {
      const emitter = plan.makeEmitter(fn);
      const lowered = lowerIrFunctionBody(fn, plan.resolver, emitter, plan.makeTypeConverter(fn));
      bodies.push({ unitId: fn.unitId, func: fn, lowered, emitter });
    } catch (error) {
      programInvariant(
        "emission-failed",
        `${options.backend}:${options.target} accepted body ${fn.unitId} and then failed to lower it: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  const module = plan.assemble(Object.freeze(bodies), accepted);
  const result: EmittedPreparedIrProgram = Object.freeze({
    module,
    emittedUnitIds: Object.freeze(bodies.map((body) => body.unitId)),
  });
  observePreparedIrProgram({ phase: "emitted", program, backend: options.backend, target: options.target });
  return result;
}
