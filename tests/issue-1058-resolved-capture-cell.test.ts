// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { emitFuncRefAsClosure } from "../src/codegen/closures/funcref-as-closure.js";
import type { CodegenContext, FunctionContext } from "../src/codegen/context/types.js";
import type { ValType } from "../src/ir/types.js";

for (const transported of [true, false]) {
  for (const expectsCell of [true, false]) {
    it(`resolves the capture representation: transported=${transported}, cell=${expectsCell}`, () => {
      // Reduced from TypeScript's createNodeBuilder: the declaring slot still
      // names a boolean cell, but the lifted frame transports its raw value.
      // This tests the public emitter, not an exported private implementation.
      const fctx = {
        name: "builder",
        params: [{ name: "flag", type: { kind: "i32" } }],
        locals: [{ name: "__boxed_flag", type: { kind: "ref", typeIdx: 101 } }],
        localMap: new Map([["flag", 1]]),
        body: [],
        savedBodies: [],
        boxedCaptures: new Map([["flag", { refCellTypeIdx: 101, valType: { kind: "i32" } }]]),
        liftedCaptureSlots: new Map(transported ? [["flag", 0]] : []),
      } as unknown as FunctionContext;
      const valType: ValType = expectsCell ? { kind: "ref", typeIdx: 101 } : { kind: "i32" };
      const cap = { name: "flag", outerLocalIdx: 1, mutable: false, valType };
      const ctx = {
        numImportFuncs: 1,
        mod: {
          imports: [{ module: "test", name: "selected", desc: { kind: "func", typeIdx: 0 } }],
          types: [{ kind: "func", params: [valType], results: [] }],
        },
        capturedGlobals: new Map(),
        sourceFunctionDeclarationByHandle: new Map(),
        nativeGenerators: new Map(),
        nestedFuncCaptures: new Map([["selected", [cap]]]),
        funcMap: new Map([["trampoline", 1]]),
        nestedFnClosureArtifacts: new Map([["selected", { structTypeIdx: 102, trampolineName: "trampoline" }]]),
        funcRefWrapperCache: new Map([
          ["->", { structTypeIdx: 100, funcTypeIdx: 103, paramTypes: [], returnType: null }],
        ]),
        closureMinimumArgumentCountByFuncTypeIdx: new Map(),
      } as unknown as CodegenContext;
      expect(emitFuncRefAsClosure(ctx, fctx, "selected", 0)).toEqual({ kind: "ref", typeIdx: 102 });
      const guard = fctx.body.find((instr) => instr.op === "if");
      expect(guard?.op).toBe("if");
      if (guard?.op !== "if") throw new Error("closure memo guard missing");
      expect(guard.then.slice(3, expectsCell ? 4 : 5)).toEqual([
        { op: "local.get", index: 1 },
        ...(!expectsCell ? [{ op: "struct.get", typeIdx: 101, fieldIdx: 0 }] : []),
      ]);
    });
  }
}
