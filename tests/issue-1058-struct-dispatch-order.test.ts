// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import type { TypeDef } from "../src/ir/types.js";
import { orderStructDispatchBySpecificity } from "../src/ir/struct-dispatch-order.js";

it("orders by physical ancestry, retaining same-heap shape order and the input", () => {
  const types: TypeDef[] = [
    { kind: "struct", name: "Base", fields: [], superTypeIdx: -1 },
    { kind: "struct", name: "Other", fields: [] },
    { kind: "struct", name: "Middle", fields: [], superTypeIdx: 0 },
    { kind: "struct", name: "Leaf", fields: [], superTypeIdx: 2 },
  ];
  const entries = [0, 1, 3, 2, 3].map((typeIdx, ordinal) => ({ typeIdx, ordinal }));
  expect(orderStructDispatchBySpecificity(types, entries).map((entry) => entry.ordinal)).toEqual([2, 4, 3, 0, 1]);
  expect(entries.map((entry) => entry.ordinal)).toEqual([0, 1, 2, 3, 4]);
});

it("rejects a cycle even for a single dispatch entry", () => {
  const types: TypeDef[] = [{ kind: "struct", name: "Cycle", fields: [], superTypeIdx: 0 }];
  expect(() => orderStructDispatchBySpecificity(types, [{ typeIdx: 0 }])).toThrow("Cyclic struct dispatch");
});

it("rejects unknown or negative dispatch types instead of assigning a rank", () => {
  expect(() => orderStructDispatchBySpecificity([], [{ typeIdx: 0 }])).toThrow("Invalid struct dispatch");
  expect(() => orderStructDispatchBySpecificity([], [{ typeIdx: -1 }])).toThrow("Invalid struct dispatch");
});
