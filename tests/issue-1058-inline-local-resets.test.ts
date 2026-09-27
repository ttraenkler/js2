// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import type { Instr } from "../src/ir/types.js";
import { inlineLocalResets } from "../src/wasm/model/inline-local-resets.js";

it("resets a deeply nested read without consuming the JS call stack", () => {
  let body: Instr[] = [{ op: "local.get", index: 1 }];
  for (let i = 0; i < 12000; i++) body = [{ op: "block", blockType: { kind: "empty" }, body }];
  expect(inlineLocalResets(body, 1, [{ name: "value", type: { kind: "i32" } }], 3)).toEqual([
    { op: "i32.const", value: 0 },
    { op: "local.set", index: 4 },
  ]);
});

it.each(["local.set", "local.tee"] as const)("retains top-level first-write proof for %s", (op) => {
  const nested: Instr = { op: "block", blockType: { kind: "empty" }, body: [{ op: "local.get", index: 1 }] };
  const locals = [{ name: "value", type: { kind: "i32" } as const }];
  expect(inlineLocalResets([{ op, index: 1 }, nested], 1, locals, 3)).toEqual([]);
  expect(inlineLocalResets([nested, { op, index: 1 }], 1, locals, 3)).toHaveLength(2);
});
