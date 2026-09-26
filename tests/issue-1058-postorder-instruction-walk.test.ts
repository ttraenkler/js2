// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { walkInstructionArraysPostOrder } from "../src/wasm/model/instruction-postorder.js";
import type { Instr } from "../src/wasm/model/instructions.js";

it("visits shared children before parents, including exception handlers, once", () => {
  const leaf: Instr[] = [{ op: "nop" }];
  const then: Instr[] = [{ op: "block", blockType: { kind: "empty" }, body: leaf }];
  const otherwise: Instr[] = [{ op: "block", blockType: { kind: "empty" }, body: leaf }];
  const catchBody: Instr[] = [{ op: "nop" }];
  const catchAll: Instr[] = [{ op: "nop" }];
  const root = [
    { op: "if", blockType: { kind: "empty" }, then, else: otherwise },
    { op: "try", blockType: { kind: "empty" }, body: leaf, catches: [{ tagIdx: 0, body: catchBody }], catchAll },
  ] as Instr[];
  const visited: Instr[][] = [];
  const seen = new WeakSet<Instr[]>();
  walkInstructionArraysPostOrder(root, (body) => visited.push(body), seen);
  expect(visited.length).toBe(6);
  for (const [index, body] of [leaf, then, otherwise, catchBody, catchAll, root].entries()) {
    expect(visited[index]).toBe(body);
  }
  walkInstructionArraysPostOrder(
    root,
    () => {
      throw new Error("visited twice");
    },
    seen,
  );
});

it("does not visit a rejected body or its descendants", () => {
  const leaf: Instr[] = [{ op: "nop" }];
  const root: Instr[] = [{ op: "block", blockType: { kind: "empty" }, body: leaf }];
  const visited: Instr[][] = [];
  walkInstructionArraysPostOrder(
    root,
    (body) => visited.push(body),
    new WeakSet(),
    () => false,
  );
  expect(visited).toEqual([]);
});
