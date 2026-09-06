// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
//
// #3518 package C — shared "accept → emit → instantiate → compare" path used by
// the vitest suite and by the fresh-process replay runner. It touches only the
// decoded program, the consumer, the two backend emitters and the binary
// writer; there is no source, checker, AST or codegen context on this path.
//
// The physical plan here is the COMMON BACKEND SUBSET: unit-to-unit calls,
// scalar params/results, exported functions. It carries no globals, imports,
// runtime providers, startup invocation or exception tags, so a program that
// needs any of those is reported as a capability gap by the plan itself before
// any body is lowered — never as a silently smaller module.

import { emitBinary } from "../../src/emit/binary.js";
import { LinearEmitter } from "../../src/ir/backend/linear-emitter.js";
import {
  acceptPreparedIrProgram,
  emitAcceptedIrProgram,
  type PreparedIrBackendPhysicalPlan,
  type PreparedIrProgramLoweredBody,
} from "../../src/ir/backend/program-consumer.js";
import { WasmGcEmitter } from "../../src/ir/backend/wasmgc-emitter.js";
import { wasmValueTypeConverter, type IrLowerResolver } from "../../src/ir/lower.js";
import { forEachInstrDeep, type IrFuncRef, type IrFunction } from "../../src/ir/nodes.js";
import type {
  AcceptedPreparedIrProgram,
  EmittedPreparedIrProgram,
  PreparedIrBackendAcceptance,
  PreparedIrBackendOptions,
  PreparedIrProgram,
} from "../../src/ir/program.js";
import { createEmptyModule, type Instr, type ValType, type WasmModule } from "../../src/ir/types.js";

export type ReplayBackend = PreparedIrBackendOptions["backend"];

export function replayOptions(
  backend: ReplayBackend,
  target: PreparedIrBackendOptions["target"] = "host",
): PreparedIrBackendOptions {
  return {
    backend,
    target,
    sharedExceptionTag: false,
    utf8Storage: false,
    sourceMap: false,
    moduleName: "ir-whole-program-replay",
  };
}

/** What the scalar-subset plan cannot carry; reported before any body is lowered. */
export function scalarSubsetGaps(accepted: AcceptedPreparedIrProgram): readonly string[] {
  const gaps: string[] = [];
  const functions = accepted.runtime.prepared.functions;
  if (accepted.program.startup.some((plan) => plan.executable)) gaps.push("executable startup unit");
  if (accepted.runtime.prepared.manifest.providers.length > 0) gaps.push("runtime providers");
  if (accepted.runtime.prepared.manifest.hostCapabilities.length > 0) gaps.push("host capabilities");
  if (accepted.options.sharedExceptionTag) gaps.push("shared exception tag");
  for (const fn of functions) {
    if (fn.asyncPlan || fn.asyncRuntime) gaps.push(`async body ${fn.name}`);
    for (const buffer of [
      ...fn.blocks.map((block) => block.instrs),
      ...(fn.asyncPlan?.states.map((s) => s.body) ?? []),
    ]) {
      for (const root of buffer) {
        forEachInstrDeep(root, (instruction) => {
          if (instruction.kind === "call" && instruction.target.binding.kind !== "unit") {
            gaps.push(`${instruction.target.binding.kind} call ${instruction.target.name} in ${fn.name}`);
          } else if (instruction.kind === "global.get" || instruction.kind === "global.set") {
            gaps.push(`global ${instruction.target.name} in ${fn.name}`);
          } else if (instruction.kind === "intrinsic") {
            gaps.push(`intrinsic ${instruction.id} in ${fn.name}`);
          }
        });
      }
    }
  }
  return [...new Set(gaps)];
}

/** Function index = position in the projection's physical functions; nothing else is resolved. */
export function scalarResolver(functions: readonly IrFunction[]): IrLowerResolver {
  const indices = new Map(functions.map((fn, index) => [fn.unitId, index] as const));
  return {
    resolveFunc: (ref: IrFuncRef) => {
      if (ref.binding.kind !== "unit")
        throw new Error(`scalar plan carries only unit bindings, got ${ref.binding.kind}`);
      const index = indices.get(ref.binding.unitId);
      if (index === undefined) throw new Error(`scalar plan has no body ${ref.binding.unitId}`);
      return index;
    },
    resolveGlobal: () => {
      throw new Error("scalar plan carries no globals");
    },
    resolveType: () => {
      throw new Error("scalar plan carries no types");
    },
    internFuncType: () => {
      throw new Error("scalar plan interns no function types");
    },
  };
}

export interface PlanTrace {
  /** Emitters constructed — zero proves nothing reached emission. */
  emitters: number;
  /** Bodies handed to `assemble`. */
  assembled: number;
}

export class ScalarPlanGapError extends Error {
  constructor(readonly gaps: readonly string[]) {
    super(`scalar-subset plan cannot carry: ${gaps.join(", ")}`);
    this.name = "ScalarPlanGapError";
  }
}

export function scalarPhysicalPlan(
  accepted: AcceptedPreparedIrProgram,
  trace?: PlanTrace,
): PreparedIrBackendPhysicalPlan<Instr[], ValType> {
  const gaps = scalarSubsetGaps(accepted);
  if (gaps.length > 0) throw new ScalarPlanGapError(gaps);
  const backend = accepted.options.backend;
  const resolver = scalarResolver(accepted.runtime.prepared.functions);
  return {
    resolver,
    makeTypeConverter: (fn) => wasmValueTypeConverter(backend, resolver, fn.name),
    makeEmitter: () => {
      if (trace) trace.emitters += 1;
      return backend === "wasmgc" ? new WasmGcEmitter(resolver) : new LinearEmitter();
    },
    assemble: (bodies) => {
      if (trace) trace.assembled = bodies.length;
      return assembleScalarModule(bodies);
    },
  };
}

/** One module per backend, function index order = projection body order. */
export function assembleScalarModule(bodies: readonly PreparedIrProgramLoweredBody<Instr[], ValType>[]): WasmModule {
  const module = createEmptyModule();
  for (const [index, body] of bodies.entries()) {
    const lowered = body.lowered;
    module.types.push({
      kind: "func",
      name: `replay-${index}`,
      params: lowered.params.flatMap((param) => [...param.slots]),
      results: lowered.results.flatMap((result) => [...result]),
    });
    module.functions.push({
      name: lowered.name,
      typeIdx: index,
      locals: lowered.locals.flatMap((local) =>
        local.slots.map((type, slot) => ({ name: slot === 0 ? local.name : `${local.name}$${slot}`, type })),
      ),
      body: lowered.body,
      exported: lowered.exported,
    });
    if (body.func.exported) module.exports.push({ name: body.func.name, desc: { kind: "func", index } });
  }
  return module;
}

export interface ReplayRun {
  readonly accepted: AcceptedPreparedIrProgram;
  readonly emitted: EmittedPreparedIrProgram;
  readonly bytes: number;
  readonly exports: WebAssembly.Exports;
}

export type ReplayOutcome =
  | { readonly kind: "ran"; readonly run: ReplayRun }
  | { readonly kind: "not-accepted"; readonly failure: Exclude<PreparedIrBackendAcceptance, AcceptedPreparedIrProgram> }
  | { readonly kind: "plan-gap"; readonly accepted: AcceptedPreparedIrProgram; readonly gaps: readonly string[] };

/** Accept, emit through the scalar plan, instantiate. Gaps are outcomes, never silent shrinkage. */
export async function replayProgram(
  program: PreparedIrProgram,
  options: PreparedIrBackendOptions,
  trace?: PlanTrace,
): Promise<ReplayOutcome> {
  const acceptance = acceptPreparedIrProgram(program, options);
  if (acceptance.kind !== "accepted") return { kind: "not-accepted", failure: acceptance };
  let plan: PreparedIrBackendPhysicalPlan<Instr[], ValType>;
  try {
    plan = scalarPhysicalPlan(acceptance, trace);
  } catch (error) {
    if (error instanceof ScalarPlanGapError) return { kind: "plan-gap", accepted: acceptance, gaps: error.gaps };
    throw error;
  }
  const emitted = emitAcceptedIrProgram(acceptance, plan);
  const binary = emitBinary(emitted.module);
  const { instance } = await WebAssembly.instantiate(binary);
  return { kind: "ran", run: { accepted: acceptance, emitted, bytes: binary.byteLength, exports: instance.exports } };
}

// ---------------------------------------------------------------------------
// Oracle comparison shared with the runner
// ---------------------------------------------------------------------------

/** JSON-safe expected value: plain JSON, or a codec-style tag for bigint / non-finite numbers. */
export type OracleValue =
  | number
  | boolean
  | string
  | null
  | { readonly $bigint: string }
  | { readonly $number: string };

export interface OracleCall {
  readonly export: string;
  readonly args: readonly number[];
  readonly expected: OracleValue;
}

export interface OracleReport {
  readonly export: string;
  readonly args: readonly number[];
  readonly expected: string;
  readonly actual: string;
  readonly match: boolean;
}

function decodeOracleValue(value: OracleValue): unknown {
  if (value !== null && typeof value === "object") {
    if ("$bigint" in value) return BigInt(value.$bigint);
    const spelled = value.$number;
    return spelled === "-0" ? -0 : Number(spelled);
  }
  return value;
}

function show(value: unknown): string {
  if (typeof value === "bigint") return `${value}n`;
  if (typeof value === "number") return Object.is(value, -0) ? "-0" : String(value);
  return JSON.stringify(value);
}

export function compareExports(exports: WebAssembly.Exports, calls: readonly OracleCall[]): readonly OracleReport[] {
  return calls.map((call) => {
    const target = exports[call.export];
    const expected = decodeOracleValue(call.expected);
    if (typeof target !== "function") {
      return {
        export: call.export,
        args: call.args,
        expected: show(expected),
        actual: "<missing export>",
        match: false,
      };
    }
    const actual = (target as (...args: number[]) => unknown)(...call.args);
    return {
      export: call.export,
      args: call.args,
      expected: show(expected),
      actual: show(actual),
      match: Object.is(actual, expected),
    };
  });
}
