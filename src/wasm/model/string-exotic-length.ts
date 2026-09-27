// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { Instr } from "./instructions.js";

/** Resolve either a primitive string or a wrapper's internal StringData. */
export function stringReceiverData(stringTypeIdx: number, wrapperDataIdx: number, dataLocal: number): Instr[] {
  return [
    { op: "local.get", index: 0 },
    { op: "any.convert_extern" },
    { op: "ref.test", typeIdx: stringTypeIdx },
    {
      op: "if",
      blockType: { kind: "val", type: { kind: "ref_null", typeIdx: stringTypeIdx } },
      then: [{ op: "local.get", index: 0 }, { op: "any.convert_extern" }, { op: "ref.cast", typeIdx: stringTypeIdx }],
      else: [
        { op: "local.get", index: 0 },
        { op: "call", funcIdx: wrapperDataIdx },
      ],
    },
    { op: "local.set", index: dataLocal },
  ];
}

/** Ordinary Get(receiver, key): the string's own UTF-16 length. */
export function stringExoticLengthRead(
  dataLocal: number,
  stringTypeIdx: number,
  flattenIdx: number,
  equalsIdx: number,
  boxNumberIdx: number | undefined,
  lengthKey: Instr[],
): Instr[] {
  if (boxNumberIdx === undefined) return [];
  return [
    { op: "local.get", index: dataLocal },
    { op: "ref.is_null" },
    { op: "i32.eqz" },
    {
      op: "if",
      blockType: { kind: "empty" },
      then: [
        { op: "local.get", index: 1 },
        { op: "any.convert_extern" },
        { op: "ref.test", typeIdx: stringTypeIdx },
        {
          op: "if",
          blockType: { kind: "empty" },
          then: [
            { op: "local.get", index: 1 },
            { op: "any.convert_extern" },
            { op: "ref.cast", typeIdx: stringTypeIdx },
            { op: "call", funcIdx: flattenIdx },
            ...lengthKey,
            { op: "call", funcIdx: equalsIdx },
            {
              op: "if",
              blockType: { kind: "empty" },
              then: [
                { op: "local.get", index: dataLocal },
                { op: "ref.as_non_null" },
                { op: "struct.get", typeIdx: stringTypeIdx, fieldIdx: 0 },
                { op: "f64.convert_i32_u" },
                { op: "call", funcIdx: boxNumberIdx },
                { op: "return" },
              ],
            },
          ],
        },
      ],
    },
  ];
}
