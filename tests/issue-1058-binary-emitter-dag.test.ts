// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { describe, expect, it } from "vitest";

import { emitBinary, emitBinaryWithSourceMap, encodeInstr } from "../src/emit/binary.js";
import { WasmEncoder } from "../src/emit/encoder.js";
import { createEmptyModule, type Instr, type ValType, type WasmModule } from "../src/ir/types.js";

const EMPTY_BLOCK = { kind: "empty" } as const;

function moduleWithBody(body: Instr[], params: ValType[] = []): WasmModule {
  const mod = createEmptyModule();
  mod.types.push({ kind: "func", params, results: [] });
  mod.functions.push({ name: "probe", typeIdx: 0, locals: [], body, exported: false });
  return mod;
}

function leaf(): Instr[] {
  return [{ op: "i32.const", value: 7 }, { op: "drop" }];
}

function expandedMiddle(): Instr[] {
  return [
    { op: "block", blockType: EMPTY_BLOCK, body: leaf() },
    { op: "block", blockType: EMPTY_BLOCK, body: leaf() },
  ];
}

describe("#1058 binary emission of shared instruction-array DAGs", () => {
  it.each(["if", "try", "try_table"] as const)("emits deeply nested %s controls", (kind) => {
    let body: Instr[] = [{ op: "nop" }];
    for (let depth = 0; depth < 10000; depth++) {
      body =
        kind === "if"
          ? [
              { op: "i32.const", value: 1 },
              { op: "if", blockType: EMPTY_BLOCK, then: body, else: [] },
            ]
          : kind === "try"
            ? [{ op: "try", blockType: EMPTY_BLOCK, body, catches: [], catchAll: [] }]
            : [{ op: "try_table", blockType: EMPTY_BLOCK, body, catches: [] }];
    }
    expect(WebAssembly.validate(emitBinary(moduleWithBody(body)))).toBe(true);
  });

  it("preserves catch delimiters, tagged table clauses and the valued-if missing-else trap", () => {
    const encoder = new WasmEncoder();
    encodeInstr(
      {
        op: "try",
        blockType: EMPTY_BLOCK,
        body: [{ op: "nop" }],
        catches: [{ tagIdx: 0, body: [{ op: "nop" }] }],
        catchAll: [{ op: "nop" }],
      },
      encoder,
    );
    expect([...encoder.finish()]).toEqual([0x06, 0x40, 0x01, 0x07, 0, 0x01, 0x19, 0x01, 0x0b]);
    const table = new WasmEncoder();
    encodeInstr(
      {
        op: "try_table",
        blockType: EMPTY_BLOCK,
        body: [{ op: "nop" }],
        catches: [
          { kind: "catch", tagIdx: 0, depth: 0 },
          { kind: "catch_ref", tagIdx: 0, depth: 1 },
          { kind: "catch_all", depth: 2 },
          { kind: "catch_all_ref", depth: 3 },
        ],
      },
      table,
    );
    expect([...table.finish()]).toEqual([0x1f, 0x40, 4, 0, 0, 0, 1, 0, 1, 2, 2, 3, 3, 1, 0x0b]);
    const branch = new WasmEncoder();
    encodeInstr(
      { op: "if", blockType: { kind: "val", type: { kind: "i32" } }, then: [{ op: "i32.const", value: 7 }] },
      branch,
    );
    expect([...branch.finish()]).toEqual([0x04, 0x7f, 0x41, 7, 0x05, 0x00, 0x0b]);
  });

  it("rejects cyclic unshared arrays and still emits after a failure", () => {
    const body: Instr[] = [];
    const block: Instr = { op: "block", blockType: EMPTY_BLOCK, body };
    body.push(block);
    expect(() => encodeInstr(block, new WasmEncoder())).toThrow(/cyclic instruction-array graph/);
    expect(WebAssembly.validate(emitBinary(moduleWithBody([{ op: "nop" }])))).toBe(true);
    expect(() =>
      emitBinary(moduleWithBody([{ op: "try", blockType: EMPTY_BLOCK, body: [], catches: [{ tagIdx: 0, body: [] }] }])),
    ).toThrow(/exception tag.*out of range/);
  });

  it("emits a deeply nested non-shared control chain without using the JS call stack", () => {
    let body: Instr[] = [{ op: "nop" }];
    for (let depth = 0; depth < 10000; depth++) {
      body = [{ op: depth % 2 ? "loop" : "block", blockType: EMPTY_BLOCK, body }];
    }
    body[0]!.sourcePos = { file: "deep.ts", line: 1, column: 1 };
    const binary = emitBinary(moduleWithBody(body));
    expect(WebAssembly.validate(binary)).toBe(true);
    const mapped = emitBinaryWithSourceMap(moduleWithBody(body));
    expect(mapped.binary).toEqual(binary);
    expect(mapped.sourceMapEntries.map((entry) => entry.sourcePos.line)).toEqual([1]);
  });

  it("is byte-identical to the fully expanded tree and preserves source-map output", () => {
    const sharedLeaf = leaf();
    const sharedMiddle: Instr[] = [
      { op: "block", blockType: EMPTY_BLOCK, body: sharedLeaf },
      { op: "block", blockType: EMPTY_BLOCK, body: sharedLeaf },
    ];
    const sharedBody: Instr[] = [
      {
        op: "block",
        blockType: EMPTY_BLOCK,
        body: sharedMiddle,
        sourcePos: { file: "dag.ts", line: 1, column: 1 },
      },
      {
        op: "block",
        blockType: EMPTY_BLOCK,
        body: sharedMiddle,
        sourcePos: { file: "dag.ts", line: 2, column: 1 },
      },
    ];
    const expandedBody: Instr[] = [
      {
        op: "block",
        blockType: EMPTY_BLOCK,
        body: expandedMiddle(),
        sourcePos: { file: "dag.ts", line: 1, column: 1 },
      },
      {
        op: "block",
        blockType: EMPTY_BLOCK,
        body: expandedMiddle(),
        sourcePos: { file: "dag.ts", line: 2, column: 1 },
      },
    ];

    const sharedBinary = emitBinary(moduleWithBody(sharedBody));
    const expandedBinary = emitBinary(moduleWithBody(expandedBody));
    expect(sharedBinary).toEqual(expandedBinary);
    expect(WebAssembly.validate(sharedBinary)).toBe(true);

    const sharedMapped = emitBinaryWithSourceMap(moduleWithBody(sharedBody));
    const expandedMapped = emitBinaryWithSourceMap(moduleWithBody(expandedBody));
    expect(sharedMapped.binary).toEqual(sharedBinary);
    expect(sharedMapped).toEqual(expandedMapped);
    expect(sharedMapped.sourceMapEntries.map((entry) => entry.sourcePos.line)).toEqual([1, 2]);
  });

  it("validates a shared array independently in every function frame and clears state after failure", () => {
    const sharedRead: Instr[] = [{ op: "local.get", index: 0 }, { op: "drop" }];
    const sharedBody: Instr[] = [
      { op: "block", blockType: EMPTY_BLOCK, body: sharedRead },
      { op: "block", blockType: EMPTY_BLOCK, body: sharedRead },
    ];
    const mod = createEmptyModule();
    mod.types.push({ kind: "func", params: [{ kind: "i32" }], results: [] }, { kind: "func", params: [], results: [] });
    mod.functions.push(
      { name: "valid", typeIdx: 0, locals: [], body: sharedBody, exported: false },
      { name: "invalid", typeIdx: 1, locals: [], body: sharedBody, exported: false },
    );

    expect(() => emitBinary(mod)).toThrow(/local \(local\.get\) index out of range/);

    const afterFailure = emitBinary(moduleWithBody([{ op: "nop" }]));
    expect(WebAssembly.validate(afterFailure)).toBe(true);
  });

  it("completes a deep shared DAG with bounded output", () => {
    let body: Instr[] = [{ op: "nop" }];
    for (let depth = 0; depth < 18; depth++) {
      const child = body;
      body = [
        { op: "block", blockType: EMPTY_BLOCK, body: child },
        { op: "block", blockType: EMPTY_BLOCK, body: child },
      ];
    }

    const binary = emitBinary(moduleWithBody(body));
    expect(binary.byteLength).toBeLessThan(2_000_000);
    expect(WebAssembly.validate(binary)).toBe(true);
  });
});
