// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
//
// #3518 package C — backend ACCEPTANCE of the production `PreparedIrProgram`
// (package A's schema and acceptance types).
//
//   acceptPreparedIrProgram(program, options)  →  PreparedIrBackendAcceptance
//
// Acceptance decides everything that can be known before emission, in order:
// A's complete validator; exact backend/target runtime projection selection;
// in-program body closure of every unit call on the PHYSICAL functions of that
// projection; the backend's own legality verdict per body; and the complete
// source-free physical setup plan (imports, globals, slots, exports, startup,
// exception tag) — a resource this increment cannot materialize is a located
// typed `unsupported` here, never a smaller module later. Acceptance is
// authenticated by a module-private token; emission (src/ir/program-emission.ts,
// one argument) consumes that token exactly once.
//
// Phase accounting: C is the sole owner of the `accepted`, `emission-started`
// and `emitted` observations. They are raised only from this module and from
// `emitAcceptedIrProgram`, once per acceptance, so a wrapper cannot double-count.
// This file imports no codegen or frontend code.

import type { IrUnitId } from "../identity.js";
import { forEachInstrDeep, type IrFuncRef, type IrFunction } from "../nodes.js";
import type { IrPreparationFailure } from "../outcomes.js";
import {
  preparedIrProgramOwner,
  PreparedIrProgramInvariantError,
  type AcceptedPreparedIrProgram,
  type PreparedIrBackendAcceptance,
  type PreparedIrBackendOptions,
  type PreparedIrProgram,
  type PreparedIrProgramFailure,
  type PreparedIrProgramRuntimeProjection,
} from "../program.js";
import { observePreparedIrProgram } from "../program-observation.js";
import { planPhysicalSetup, type PhysicalSetupPlan } from "../program-physical-plan.js";
import { assertPreparedIrProgram } from "../program-validation.js";
import { verifyIrBackendLegality } from "./legality.js";

/** Module-private authority: only acceptances minted here may be emitted, each exactly once. */
const acceptances = new WeakMap<AcceptedPreparedIrProgram, PhysicalSetupPlan>();
const emissions = new WeakSet<AcceptedPreparedIrProgram>();

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

  const physical = planPhysicalSetup(program, options, runtime);
  if (physical.kind !== "planned") return physical;

  const accepted = Object.freeze({
    kind: "accepted",
    program,
    options: Object.freeze({ ...options, linear: options.linear ? Object.freeze({ ...options.linear }) : undefined }),
    runtime,
  }) as unknown as AcceptedPreparedIrProgram;
  acceptances.set(accepted, physical.plan);
  observePreparedIrProgram({ phase: "accepted", program, backend: options.backend, target: options.target });
  return accepted;
}

/** True only for an acceptance minted by `acceptPreparedIrProgram` in this process. */
export function isAuthenticAcceptedIrProgram(value: unknown): value is AcceptedPreparedIrProgram {
  return typeof value === "object" && value !== null && acceptances.has(value as AcceptedPreparedIrProgram);
}

/** The physical plan acceptance derived; readable by the emitter and by evidence tools. */
export function acceptedPhysicalSetupPlan(accepted: AcceptedPreparedIrProgram): PhysicalSetupPlan {
  const plan = acceptances.get(accepted);
  if (!plan)
    programInvariant("invalid-transaction-capability", "acceptance was not produced by acceptPreparedIrProgram");
  return plan;
}

/**
 * @internal Hand one authentic acceptance to emission exactly once. Raises the
 * `emission-started` observation; the matching `emitted` observation is raised
 * by `emitAcceptedIrProgram` only after actual construction succeeds.
 */
export function beginAcceptedIrProgramEmission(accepted: AcceptedPreparedIrProgram): PhysicalSetupPlan {
  const plan = acceptedPhysicalSetupPlan(accepted);
  if (emissions.has(accepted)) programInvariant("invalid-transaction-capability", "acceptance was already emitted");
  emissions.add(accepted);
  const { program, options } = accepted;
  observePreparedIrProgram({ phase: "emission-started", program, backend: options.backend, target: options.target });
  return plan;
}

/** @internal Raised by emission after the module and its exact receipts exist. */
export function finishAcceptedIrProgramEmission(accepted: AcceptedPreparedIrProgram): void {
  if (!emissions.has(accepted)) programInvariant("invalid-transaction-capability", "emission was never started");
  const { program, options } = accepted;
  observePreparedIrProgram({ phase: "emitted", program, backend: options.backend, target: options.target });
}
