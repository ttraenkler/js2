// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
//
// #3518 package C — a hand-assembled, complete `PreparedIrProgram` used by the
// codec/consumer tests and by the fresh-process replay runner. It is test DATA
// built only from package A's published types and the existing IR builders;
// it is not a producer and does not stand in for A's preparation driver. The
// program is deliberately small but touches every codec-relevant shape:
// cross-unit calls, a ReadonlyMap, a recursive class shape in the ABI, i64
// (bigint) and non-finite/negative-zero f64 constants, and an undefined-valued
// optional property.

import { AllocSiteRegistry } from "../../src/ir/alloc-registry.js";
import { IrFunctionBuilder } from "../../src/ir/builder.js";
import { irUnitFuncRef } from "../../src/ir/callable-bindings.js";
import {
  createIrBindingId,
  createIrClassId,
  createIrSourceId,
  createIrUnitId,
  type IrFunctionIdentity,
  type IrSourceRecord,
  type IrTerminalUnitRecord,
  type IrUnitId,
} from "../../src/ir/identity.js";
import type { IrModuleInitPlan } from "../../src/ir/module-init-plan.js";
import { IR_CLASS_SHAPE_CELL, irVal, type IrClassShape, type IrFunction, type IrType } from "../../src/ir/nodes.js";
import type { ProgramAbiPlanEntry } from "../../src/ir/program-abi.js";
import {
  preparedIrReadonlyMap,
  freezePreparedIrValue,
  type PreparedIrAbiEntry,
  type PreparedIrProgram,
} from "../../src/ir/program.js";

export const CODEC_FIXTURE_SOURCE_KEY = "@test/ir-whole-program-codec";

/** Native oracle values for the runnable bodies. */
export const CODEC_FIXTURE_EXPECTED = Object.freeze({
  main: 42,
  helper: (x: number) => x * 2,
  /** `i64.const 9007199254740993` returned as a BigInt by the Wasm JS API. */
  big: 9007199254740993n,
  /** `(-0) + Infinity`. */
  special: Number.POSITIVE_INFINITY,
});

export interface CodecFixture {
  readonly program: PreparedIrProgram;
  readonly functions: readonly IrFunction[];
  readonly classShape: IrClassShape;
}

function terminal(record: {
  readonly id: IrUnitId;
  readonly sourceId: IrSourceRecord["id"];
  readonly name: string;
  readonly ordinal: number;
}): IrTerminalUnitRecord {
  return {
    id: record.id,
    sourceId: record.sourceId,
    lexicalOwnerId: null,
    kind: "top-level-function",
    ordinal: record.ordinal,
    displayName: record.name,
    line: record.ordinal + 1,
    column: 0,
    declarationStart: record.ordinal * 100,
    declarationEnd: record.ordinal * 100 + 50,
    terminal: true,
    terminalOwnerId: record.id,
    observedKind: "function",
    legacyKey: `${CODEC_FIXTURE_SOURCE_KEY}::${record.name}`,
    legacyMatchName: record.name,
    legacyOrdinal: record.ordinal,
    staticClassMember: false,
    legacyBodyAvailable: false,
  };
}

export function buildCodecFixture(): CodecFixture {
  const f64: IrType = irVal({ kind: "f64" });
  const i64: IrType = irVal({ kind: "i64" });
  const sourceId = createIrSourceId({ kind: "entry", order: 0, sourceKey: CODEC_FIXTURE_SOURCE_KEY });
  const source: IrSourceRecord = {
    id: sourceId,
    kind: "entry",
    order: 0,
    sourceKey: CODEC_FIXTURE_SOURCE_KEY,
    displayName: "codec-fixture.ts",
    originalFileName: "codec-fixture.ts",
  };
  const identity = (name: string, ordinal: number): IrFunctionIdentity => ({
    unitId: createIrUnitId({ sourceId, lexicalOwnerId: null, kind: "top-level-function", ordinal }),
    name,
  });
  const helperId = identity("helper", 0);
  const mainId = identity("main", 1);
  const bigId = identity("big", 2);
  const specialId = identity("special", 3);
  const registry = new AllocSiteRegistry();

  // helper(x: f64): f64 = x * 2
  const helperBuilder = new IrFunctionBuilder(helperId, [f64], true, registry);
  const x = helperBuilder.addParam("x", f64);
  helperBuilder.openBlock();
  const two = helperBuilder.emitConst({ kind: "f64", value: 2 }, f64);
  helperBuilder.terminate({ kind: "return", values: [helperBuilder.emitBinary("f64.mul", x, two, f64)] });
  const helper = helperBuilder.finish();

  // main(): f64 = helper(20) + 2   (cross-unit call)
  const mainBuilder = new IrFunctionBuilder(mainId, [f64], true, registry);
  mainBuilder.openBlock();
  const twenty = mainBuilder.emitConst({ kind: "f64", value: 20 }, f64);
  const doubled = mainBuilder.emitCall(irUnitFuncRef(helperId), [twenty], f64)!;
  const plusTwo = mainBuilder.emitConst({ kind: "f64", value: 2 }, f64);
  mainBuilder.terminate({ kind: "return", values: [mainBuilder.emitBinary("f64.add", doubled, plusTwo, f64)] });
  const main = mainBuilder.finish();

  // big(): i64 = 2^53 + 1   (bigint constant)
  const bigBuilder = new IrFunctionBuilder(bigId, [i64], true, registry);
  bigBuilder.openBlock();
  bigBuilder.terminate({
    kind: "return",
    values: [bigBuilder.emitConst({ kind: "i64", value: CODEC_FIXTURE_EXPECTED.big }, i64)],
  });
  const big = bigBuilder.finish();

  // special(): f64 = (-0) + Infinity   (non-finite and negative-zero constants)
  const specialBuilder = new IrFunctionBuilder(specialId, [f64], true, registry);
  specialBuilder.openBlock();
  const negativeZero = specialBuilder.emitConst({ kind: "f64", value: -0 }, f64);
  const infinity = specialBuilder.emitConst({ kind: "f64", value: Number.POSITIVE_INFINITY }, f64);
  specialBuilder.terminate({
    kind: "return",
    values: [specialBuilder.emitBinary("f64.add", negativeZero, infinity, f64)],
  });
  const special = specialBuilder.finish();

  const functions = [helper, main, big, special];
  const terminals = [
    terminal({ id: helperId.unitId, sourceId, name: "helper", ordinal: 0 }),
    terminal({ id: mainId.unitId, sourceId, name: "main", ordinal: 1 }),
    terminal({ id: bigId.unitId, sourceId, name: "big", ordinal: 2 }),
    terminal({ id: specialId.unitId, sourceId, name: "special", ordinal: 3 }),
  ];

  // A recursive class shape: `next` points back at the shape itself.
  const classId = createIrClassId({ sourceId, lexicalOwnerId: null, declarationKind: "declaration", ordinal: 0 });
  const mutableShape = {
    [IR_CLASS_SHAPE_CELL]: true as const,
    classId,
    className: "Node",
    fields: [] as { readonly name: string; readonly type: IrType }[],
    methods: [],
    constructorParams: [f64],
  };
  mutableShape.fields = [
    { name: "value", type: f64 },
    { name: "next", type: { kind: "class", shape: mutableShape as unknown as IrClassShape } },
  ];
  const classShape = mutableShape as unknown as IrClassShape;

  const callableEntry = (
    id: IrFunctionIdentity,
    ordinal: number,
    params: readonly IrType[],
    results: readonly IrType[],
  ): PreparedIrAbiEntry => {
    const plan: ProgramAbiPlanEntry = {
      id: createIrBindingId({ ownerId: id.unitId, domain: "callable", role: "unit" }),
      order: { sourceOrder: 0, declarationOrder: ordinal },
      displayName: id.name,
      structuralReferenceKey: `unit:${id.unitId}`,
      intent: {
        kind: "callable",
        origin: "source",
        signature: {
          params: params.map((type) => (type as { val: { kind: string } }).val.kind),
          results: results.map((type) => (type as { val: { kind: string } }).val.kind),
        },
        unitId: id.unitId,
        sourceId,
      },
      slotPolicy: "required",
      slotSpace: "function",
    };
    return { plan, contract: { kind: "callable", ref: irUnitFuncRef(id), params, results } };
  };
  const classEntry: PreparedIrAbiEntry = {
    plan: {
      id: createIrBindingId({ ownerId: classId, domain: "class", role: "layout" }),
      order: { sourceOrder: 0, declarationOrder: 4 },
      displayName: "Node",
      intent: { kind: "class", classId, layoutKey: "Node" },
      slotPolicy: "required",
      slotSpace: "type",
    },
    contract: {
      kind: "class",
      ref: {
        kind: "type",
        name: "Node",
        binding: {
          kind: "support",
          bindingId: createIrBindingId({ ownerId: classId, domain: "type", role: "layout" }),
        },
      },
      shape: classShape,
    },
  };

  const startup: IrModuleInitPlan = {
    sourceId,
    unitId: null,
    executable: false,
    bindings: [],
    liveSeeds: [],
    evaluations: [],
    exports: functions.map((fn, index) => ({
      externalName: fn.name,
      localName: fn.name,
      targetBindingId: null,
      start: index * 100,
      end: index * 100 + 50,
    })),
    invocation: { target: "host", kind: "none", exactlyOnce: true },
    gaps: [],
  };

  const draft = {
    schema: "prepared-ir-program-v1" as const,
    inventory: {
      sources: [source],
      classes: [
        {
          id: classId,
          sourceId,
          lexicalOwnerId: null,
          declarationKind: "declaration" as const,
          ordinal: 0,
          displayName: "Node",
          line: 5,
          column: 0,
          declarationStart: 400,
          declarationEnd: 480,
          // Present-but-undefined optional property: the codec must keep the key.
          syntheticRole: undefined,
        },
      ],
      allUnits: terminals,
      terminalUnits: terminals,
    },
    units: preparedIrReadonlyMap(terminals.map((record) => [record.id, record] as const)),
    ir: { functions },
    abi: {
      entries: [
        callableEntry(helperId, 0, [f64], [f64]),
        callableEntry(mainId, 1, [], [f64]),
        callableEntry(bigId, 2, [], [i64]),
        callableEntry(specialId, 3, [], [f64]),
        classEntry,
      ],
    },
    derivedUnits: [],
    startup: [startup],
    runtime: [],
    reconciliation: "complete" as const,
    sealed: true as const,
  };
  const program = freezePreparedIrValue(draft) as PreparedIrProgram;
  return { program, functions, classShape };
}
