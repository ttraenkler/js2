// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { Instr } from "../../ir/types.js";

/** Clamp an already-converted number to the ECMAScript ToLength range. */
export function toLengthClamp(numberLocal: number, integerLocal: number): Instr[] {
  return [
    { op: "local.tee", index: numberLocal },
    { op: "local.get", index: numberLocal },
    { op: "f64.ne" },
    {
      op: "if",
      blockType: { kind: "val", type: { kind: "f64" } },
      then: [{ op: "f64.const", value: 0 }],
      else: [
        { op: "local.get", index: numberLocal },
        { op: "f64.trunc" },
        { op: "local.tee", index: integerLocal },
        { op: "f64.const", value: 0 },
        { op: "f64.le" },
        {
          op: "if",
          blockType: { kind: "val", type: { kind: "f64" } },
          then: [{ op: "f64.const", value: 0 }],
          else: [
            { op: "local.get", index: integerLocal },
            { op: "f64.const", value: 9007199254740991 },
            { op: "f64.min" },
          ],
        },
      ],
    },
  ];
}
