// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { Instr } from "./instructions.js";

export const LIVE_ARRAY_ITERATOR_KIND = 10;

/** Payload fields: original receiver, next f64 index, iteration mode. */
export function liveArrayIteratorStep(d: {
  stateType: number;
  vecType: number;
  arrayType: number;
  length: number;
  getIndex: number;
  boxNumber: number;
  undefinedValue: readonly Instr[];
}): Instr[] {
  const get = (index: number): Instr => ({ op: "local.get", index });
  const field = (fieldIdx: number): Instr[] => [get(1), { op: "struct.get", typeIdx: d.stateType, fieldIdx }];
  const done = (): Instr[] => [{ op: "i32.const", value: 1 }, ...structuredClone(d.undefinedValue), { op: "return" }];
  const boxedIndex = (): Instr[] => [get(3), { op: "call", funcIdx: d.boxNumber }];
  return [
    get(0),
    { op: "any.convert_extern" },
    { op: "ref.cast", typeIdx: d.stateType },
    { op: "local.set", index: 1 },
    ...field(0),
    { op: "local.tee", index: 2 },
    { op: "ref.is_null" },
    { op: "if", blockType: { kind: "empty" }, then: done() },
    ...field(1),
    { op: "local.tee", index: 3 },
    get(2),
    { op: "call", funcIdx: d.length },
    { op: "f64.ge" },
    {
      op: "if",
      blockType: { kind: "empty" },
      then: [get(1), { op: "ref.null.extern" }, { op: "struct.set", typeIdx: d.stateType, fieldIdx: 0 }, ...done()],
    },
    // Advance before Get: an abrupt indexed getter does not retry that index.
    get(1),
    get(3),
    { op: "f64.const", value: 1 },
    { op: "f64.add" },
    { op: "struct.set", typeIdx: d.stateType, fieldIdx: 1 },
    ...field(2),
    { op: "i32.const", value: 1 },
    { op: "i32.eq" },
    {
      op: "if",
      blockType: { kind: "empty" },
      then: [{ op: "i32.const", value: 0 }, ...boxedIndex(), { op: "return" }],
    },
    get(2),
    get(3),
    { op: "call", funcIdx: d.getIndex },
    { op: "local.set", index: 4 },
    { op: "i32.const", value: 0 },
    ...field(2),
    { op: "i32.const", value: 2 },
    { op: "i32.eq" },
    {
      op: "if",
      blockType: { kind: "val", type: { kind: "externref" } },
      then: [
        { op: "i32.const", value: 2 },
        ...boxedIndex(),
        get(4),
        { op: "array.new_fixed", typeIdx: d.arrayType, length: 2 },
        { op: "struct.new", typeIdx: d.vecType },
        { op: "extern.convert_any" },
      ],
      else: [get(4)],
    },
  ];
}

/** Prepend to every shared iterator-step provider, without adding locals. */
export function liveArrayIteratorDispatch(recordType: number, step: number): Instr[] {
  const record = (): Instr[] => [
    { op: "local.get", index: 0 },
    { op: "any.convert_extern" },
    { op: "ref.cast", typeIdx: recordType },
  ];
  return [
    ...record(),
    { op: "struct.get", typeIdx: recordType, fieldIdx: 0 },
    { op: "i32.const", value: LIVE_ARRAY_ITERATOR_KIND },
    { op: "i32.eq" },
    {
      op: "if",
      blockType: { kind: "empty" },
      then: [
        ...record(),
        { op: "struct.get", typeIdx: recordType, fieldIdx: 3 },
        { op: "call", funcIdx: step },
        { op: "return" },
      ],
    },
  ];
}
