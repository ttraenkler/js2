// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
//
// #3518 package C — shared "consume → assemble → run" path used by the vitest
// suite and by the fresh-process replay runner. It touches only the decoded
// program and the two backend emitters; there is no source, checker, AST or
// codegen context anywhere on this path.

import { emitBinary } from "../../src/emit/binary.js";
import type { IrBackendKind } from "../../src/ir/backend/legality.js";
import { LinearEmitter } from "../../src/ir/backend/linear-emitter.js";
import {
  consumePreparedIrProgram,
  type PreparedIrProgramConsumption,
  type PreparedIrProgramLoweredBody,
} from "../../src/ir/backend/program-consumer.js";
import { WasmGcEmitter } from "../../src/ir/backend/wasmgc-emitter.js";
import { wasmValueTypeConverter, type IrLowerResolver } from "../../src/ir/lower.js";
import type { IrFuncRef, IrFunction } from "../../src/ir/nodes.js";
import type { PreparedIrProgram } from "../../src/ir/program.js";
import { createEmptyModule, type Instr, type ValType, type WasmModule } from "../../src/ir/types.js";

export type ReplayBackend = Extract<IrBackendKind, "wasmgc" | "linear">;

/** Function index = position in `program.ir.functions`; nothing else is resolved. */
export function programScalarResolver(program: PreparedIrProgram): IrLowerResolver {
  const indices = new Map(program.ir.functions.map((fn, index) => [fn.unitId, index] as const));
  return {
    resolveFunc: (ref: IrFuncRef) => {
      if (ref.binding.kind !== "unit")
        throw new Error(`replay resolver only carries unit bindings, got ${ref.binding.kind}`);
      const index = indices.get(ref.binding.unitId);
      if (index === undefined) throw new Error(`replay resolver has no body ${ref.binding.unitId}`);
      return index;
    },
    resolveGlobal: () => {
      throw new Error("replay resolver carries no globals");
    },
    resolveType: () => {
      throw new Error("replay resolver carries no types");
    },
    internFuncType: () => {
      throw new Error("replay resolver interns no function types");
    },
  };
}

export interface ReplayFactoryTrace {
  /** How many emitters were created — zero proves nothing reached emission. */
  emitters: number;
}

export function replayFactories(program: PreparedIrProgram, backend: ReplayBackend, trace?: ReplayFactoryTrace) {
  const resolver = programScalarResolver(program);
  return {
    resolver,
    makeTypeConverter: (fn: IrFunction) => wasmValueTypeConverter(backend, resolver, fn.name),
    makeEmitter: () => {
      if (trace) trace.emitters += 1;
      return backend === "wasmgc" ? new WasmGcEmitter(resolver) : new LinearEmitter();
    },
  };
}

export function consumeForReplay(
  program: PreparedIrProgram,
  backend: ReplayBackend,
  trace?: ReplayFactoryTrace,
): PreparedIrProgramConsumption<Instr[], ValType> {
  return consumePreparedIrProgram<Instr[], ValType>({
    program,
    backend,
    factories: replayFactories(program, backend, trace),
  });
}

/** One module per backend, function index order = program body order. */
export function assembleReplayModule(bodies: readonly PreparedIrProgramLoweredBody<Instr[], ValType>[]): WasmModule {
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
  readonly backend: ReplayBackend;
  readonly bytes: number;
  readonly exports: WebAssembly.Exports;
}

/** Consume, assemble, emit and instantiate; throws if the consumer did not lower. */
export async function replayProgram(program: PreparedIrProgram, backend: ReplayBackend): Promise<ReplayRun> {
  const consumed = consumeForReplay(program, backend);
  if (consumed.kind !== "lowered") {
    throw new Error(`${backend} did not lower the program: ${consumed.kind} ${consumed.detail}`);
  }
  const binary = emitBinary(assembleReplayModule(consumed.bodies));
  const { instance } = await WebAssembly.instantiate(binary);
  return { backend, bytes: binary.byteLength, exports: instance.exports };
}

/** JSON-safe results of the codec fixture's four exported bodies. */
export interface FixtureResults {
  readonly main: number;
  readonly helper21: number;
  /** BigInt rendered as decimal text. */
  readonly big: string;
  /** Non-finite f64 rendered with `String()` so `Infinity` survives JSON. */
  readonly special: string;
}

export function runFixtureExports(exports: WebAssembly.Exports): FixtureResults {
  const fn = <T>(name: string): ((...args: number[]) => T) => {
    const value = exports[name];
    if (typeof value !== "function") throw new Error(`replay module does not export function ${name}`);
    return value as (...args: number[]) => T;
  };
  return {
    main: fn<number>("main")(),
    helper21: fn<number>("helper")(21),
    big: String(fn<bigint>("big")()),
    special: String(fn<number>("special")()),
  };
}
