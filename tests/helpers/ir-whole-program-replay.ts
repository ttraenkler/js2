// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
//
// #3518 package C — shared "accept → emit → instantiate → compare" path used by
// the vitest suite and by the fresh-process replay runner. Emission is the
// consumer's own one-argument `emitAcceptedIrProgram`; this helper supplies no
// resolver, assembler or reservation. There is no source, checker, AST or
// frontend context on this path.

import { emitBinary } from "../../src/emit/binary.js";
import { acceptPreparedIrProgram } from "../../src/ir/backend/program-consumer.js";
import { emitAcceptedIrProgram } from "../../src/ir/program-emission.js";
import type {
  AcceptedPreparedIrProgram,
  EmittedPreparedIrProgram,
  PreparedIrBackendAcceptance,
  PreparedIrBackendOptions,
  PreparedIrProgram,
} from "../../src/ir/program.js";

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

export interface ReplayRun {
  readonly accepted: AcceptedPreparedIrProgram;
  readonly emitted: EmittedPreparedIrProgram;
  readonly bytes: number;
  readonly exports: WebAssembly.Exports;
}

export type ReplayOutcome =
  | { readonly kind: "ran"; readonly run: ReplayRun }
  | {
      readonly kind: "not-accepted";
      readonly failure: Exclude<PreparedIrBackendAcceptance, AcceptedPreparedIrProgram>;
    };

/** Accept, emit, instantiate. A not-accepted program is an outcome, never a silent skip. */
export async function replayProgram(
  program: PreparedIrProgram,
  options: PreparedIrBackendOptions,
): Promise<ReplayOutcome> {
  const acceptance = acceptPreparedIrProgram(program, options);
  if (acceptance.kind !== "accepted") return { kind: "not-accepted", failure: acceptance };
  const emitted = emitAcceptedIrProgram(acceptance);
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
