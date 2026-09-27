// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { Instr } from "./types.js";

/** Reconcile an existing own descriptor before mirroring a value into a typed slot. */
export function existingOwnFieldWrite(input: {
  receiver: () => Instr[];
  key: () => Instr[];
  value: () => Instr[];
  bagLocal: number;
  decisionLocal: number;
  has: number;
  bagOf: number;
  decide: number;
  setOwn: number;
  handledDecision: number;
  refusedDecision: number;
  handled: () => Instr[];
  refused: () => Instr[];
}): Instr[] {
  return [
    ...input.receiver(),
    ...input.key(),
    { op: "call", funcIdx: input.has },
    {
      op: "if",
      blockType: { kind: "empty" },
      then: [
        ...input.receiver(),
        { op: "call", funcIdx: input.bagOf },
        { op: "local.set", index: input.bagLocal },
        ...input.receiver(),
        { op: "local.get", index: input.bagLocal },
        ...input.key(),
        ...input.value(),
        { op: "call", funcIdx: input.decide },
        { op: "local.tee", index: input.decisionLocal },
        { op: "i32.const", value: input.handledDecision },
        { op: "i32.eq" },
        { op: "if", blockType: { kind: "empty" }, then: input.handled() },
        { op: "local.get", index: input.decisionLocal },
        { op: "i32.const", value: input.refusedDecision },
        { op: "i32.eq" },
        { op: "if", blockType: { kind: "empty" }, then: input.refused() },
        { op: "local.get", index: input.bagLocal },
        ...input.key(),
        ...input.value(),
        { op: "call", funcIdx: input.setOwn },
        { op: "i32.const", value: 1 },
        { op: "i32.ne" },
        { op: "if", blockType: { kind: "empty" }, then: input.refused() },
      ],
    },
  ];
}
