// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { locateCallArgProducers } from "../src/codegen/call-arg-producers.js";
import { fixupExternConvertAny } from "../src/codegen/fixups.js";
import type { CodegenContext } from "../src/codegen/context/types.js";
import { createEmptyModule, type Instr } from "../src/ir/types.js";
import { emitBinary } from "../src/emit/binary.js";

function fixture() {
  const mod = createEmptyModule();
  mod.types.push(
    { kind: "struct", name: "Context", fields: [] },
    { kind: "struct", name: "Closure", fields: [{ name: "bag", type: { kind: "externref" }, mutable: true }] },
    {
      kind: "func",
      name: "callee",
      params: [{ kind: "ref_null", typeIdx: 0 }, { kind: "externref" }, { kind: "externref" }],
      results: [],
    },
    { kind: "func", name: "caller", params: [], results: [] },
  );
  const body: Instr[] = [
    { op: "ref.null", typeIdx: 0 },
    { op: "ref.null.extern" },
    { op: "ref.null.extern" },
    { op: "nop" },
    { op: "struct.new", typeIdx: 1 },
    { op: "extern.convert_any" },
    { op: "return_call", funcIdx: 0 },
  ];
  mod.functions.push(
    { name: "callee", typeIdx: 2, locals: [], body: [], exported: false },
    { name: "caller", typeIdx: 3, locals: [], body, exported: false },
  );
  return { mod, body };
}

it("attributes tail-call arguments without treating closure fields as arguments", () => {
  const { mod, body } = fixture();
  expect(locateCallArgProducers(body, mod).get(6)).toEqual([0, 1, 5]);
});

it("does not retag an externref closure bag during tail-call repair", () => {
  const { mod, body } = fixture();
  fixupExternConvertAny({ mod, errors: [] } as unknown as CodegenContext);
  expect(body[2]).toEqual({ op: "ref.null.extern" });
});

it("stops after a terminal call instead of attributing unreachable operands", () => {
  const { mod, body } = fixture();
  body.push(...structuredClone(body));
  expect([...locateCallArgProducers(body, mod).keys()]).toEqual([6]);
});

it("still repairs an actual typed-null tail-call argument", () => {
  const { mod, body } = fixture();
  body[0] = { op: "ref.null.extern" };
  fixupExternConvertAny({ mod, errors: [] } as unknown as CodegenContext);
  expect(body[0]).toEqual({ op: "ref.null", typeIdx: 0 });
  expect(body[1]).toEqual({ op: "ref.null.extern" });
  expect(body[2]).toEqual({ op: "ref.null.extern" });
});

it("validates and preserves the closure bag through a real tail call", () => {
  const { mod } = fixture();
  for (const index of [2, 3]) {
    const signature = mod.types[index]!;
    if (signature.kind !== "func") throw new Error("Missing fixture signature");
    signature.results = [{ kind: "i32" }];
  }
  mod.functions[0]!.body = [
    { op: "local.get", index: 2 },
    { op: "any.convert_extern" },
    { op: "ref.cast", typeIdx: 1 },
    { op: "struct.get", typeIdx: 1, fieldIdx: 0 },
    { op: "ref.is_null" },
  ];
  mod.exports.push({ name: "run", desc: { kind: "func", index: 1 } });
  fixupExternConvertAny({ mod, errors: [] } as unknown as CodegenContext);
  const module = new WebAssembly.Module(emitBinary(mod));
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(1);
});
