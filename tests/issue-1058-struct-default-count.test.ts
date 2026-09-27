// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { createEmptyModule, type Instr } from "../src/ir/types.js";
import { countTrailingStructDefaults } from "../src/wasm/model/struct-default-count.js";
import { fixupStructNewArgCounts } from "../src/codegen/fixups.js";
import type { CodegenContext } from "../src/codegen/context/types.js";
import { emitBinary } from "../src/emit/binary.js";

it("counts a numeric undefined expression as one field without losing the prefix", () => {
  const body: Instr[] = [
    { op: "i32.const", value: 17 },
    { op: "f64.const", value: 0 },
    { op: "i64.const", value: 9218868440963334366n },
    { op: "f64.reinterpret_i64" },
    { op: "ref.null", typeIdx: 7 },
    { op: "i32.const", value: 0 },
    { op: "struct.new", typeIdx: 9 },
  ];
  expect(countTrailingStructDefaults(body, body.length - 1)).toBe(5);
});

it("does not count ref.as_non_null as another field", () => {
  const body: Instr[] = [{ op: "ref.null", typeIdx: 7 }, { op: "ref.as_non_null" }, { op: "ref.null.extern" }];
  expect(countTrailingStructDefaults(body, body.length)).toBe(2);
});

it("does not cross an unknown producer to guess its default count", () => {
  const body: Instr[] = [{ op: "local.get", index: 0 }, { op: "f64.reinterpret_i64" }, { op: "ref.null.extern" }];
  expect(countTrailingStructDefaults(body, body.length)).toBe(1);
});

it("does not append duplicate defaults and shift a complete constructor", () => {
  const mod = createEmptyModule();
  const fields = [
    { name: "__tag", type: { kind: "i32" as const }, mutable: false },
    { name: "id", type: { kind: "f64" as const }, mutable: true },
    { name: "other", type: { kind: "externref" as const }, mutable: true },
    { name: "flag", type: { kind: "i32" as const }, mutable: true },
  ];
  mod.types.push({ kind: "struct", name: "Node", fields }, { kind: "func", params: [], results: [{ kind: "i32" }] });
  const body: Instr[] = [
    { op: "i32.const", value: 17 },
    { op: "i64.const", value: 9218868440963334366n },
    { op: "f64.reinterpret_i64" },
    { op: "ref.null.extern" },
    { op: "i32.const", value: 7 },
    { op: "struct.new", typeIdx: 0 },
    { op: "struct.get", typeIdx: 0, fieldIdx: 3 },
  ];
  mod.functions.push({ name: "run", typeIdx: 1, locals: [], body, exported: true });
  mod.exports.push({ name: "run", desc: { kind: "func", index: 0 } });
  const ctx = {
    mod,
    structMap: new Map([["Node", 0]]),
    classSet: new Set(["Node"]),
    structFields: new Map([["Node", fields]]),
    classTagMap: new Map([["Node", 17]]),
  } as unknown as CodegenContext;
  fixupStructNewArgCounts(ctx);
  fixupStructNewArgCounts(ctx);
  expect(body).toHaveLength(7);
  const module = new WebAssembly.Module(emitBinary(mod));
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(7);
});
