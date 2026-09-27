// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { createEmptyModule } from "../src/ir/types.js";
import { emitBinary } from "../src/emit/binary.js";
import { toLengthClamp } from "../src/wasm/model/to-length.js";
import { buildArrayLikeToLengthFromExternref } from "../src/codegen/object-runtime-enumeration.js";
import type { CodegenContext } from "../src/codegen/context/types.js";

it.each([
  [NaN, 0],
  [-Infinity, 0],
  [-3.5, 0],
  [-0, 0],
  [0, 0],
  [0.8, 0],
  [3.9, 3],
  [9007199254740991, 9007199254740991],
  [9007199254740992, 9007199254740991],
  [Infinity, 9007199254740991],
])("clamps %s to %s in the shared Wasm model", (input, expected) => {
  const module = createEmptyModule();
  module.types.push({ kind: "func", params: [{ kind: "f64" }], results: [{ kind: "f64" }] });
  module.functions.push({
    name: "run",
    typeIdx: 0,
    exported: true,
    locals: [
      { name: "number", type: { kind: "f64" } },
      { name: "integer", type: { kind: "f64" } },
    ],
    body: [{ op: "local.get", index: 0 }, ...toLengthClamp(1, 2)],
  });
  module.exports.push({ name: "run", desc: { kind: "func", index: 0 } });
  const binary = emitBinary(module);
  expect(WebAssembly.validate(binary)).toBe(true);
  const compiled = new WebAssembly.Module(binary);
  expect(WebAssembly.Module.imports(compiled)).toEqual([]);
  const run = new WebAssembly.Instance(compiled).exports.run as (value: number) => number;
  expect(run(input)).toBe(expected);
});

const providers = ["__unbox_number", "__to_primitive", "__typeof_string", "__str_to_number"];
it.each(providers)("rejects a missing %s for a full conversion", (missing) => {
  const ctx = {
    funcMap: new Map(providers.filter((name) => name !== missing).map((name, index) => [name, index])),
  } as CodegenContext;
  expect(() => buildArrayLikeToLengthFromExternref(ctx, -1, true)).toThrow("Missing provider");
});
