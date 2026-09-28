// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { emitFuncRefAsClosure } from "../src/codegen/closures/funcref-as-closure.js";
import type { CodegenContext, FunctionContext } from "../src/codegen/context/types.js";

for (const transported of [false, true])
  for (const visible of [false, true])
    it(`capture forwarding precedes global fallback: transported=${transported}, visible=${visible}`, () => {
      // A hidden capture parameter survives source-scope isolation even when
      // the ordinary name lookup no longer exposes it. The promoted global
      // may belong to a different activation and has not necessarily been set.
      const valueType = { kind: "ref", typeIdx: 101 };
      const fctx = {
        name: "builder",
        params: [{ name: "helper", type: valueType }],
        locals: [],
        localMap: new Map(visible ? [["helper", 0]] : []),
        liftedCaptureSlots: new Map(transported ? [["helper", 0]] : []),
        body: [],
        savedBodies: [],
      } as unknown as FunctionContext;
      const ctx = {
        numImportFuncs: 1,
        mod: {
          imports: [{ module: "test", name: "selected", desc: { kind: "func", typeIdx: 0 } }],
          types: [{ kind: "func", params: [valueType], results: [] }],
        },
        capturedGlobals: new Map([["helper", 7]]),
        capturedGlobalsWidened: new Set(["helper"]),
        sourceFunctionDeclarationByHandle: new Map(),
        nativeGenerators: new Map(),
        nestedFuncCaptures: new Map([
          ["selected", [{ name: "helper", outerLocalIdx: 435, mutable: false, valType: valueType }]],
        ]),
        funcMap: new Map([["trampoline", 1]]),
        nestedFnClosureArtifacts: new Map([["selected", { structTypeIdx: 102, trampolineName: "trampoline" }]]),
        funcRefWrapperCache: new Map([
          ["->", { structTypeIdx: 100, funcTypeIdx: 103, paramTypes: [], returnType: null }],
        ]),
        closureMinimumArgumentCountByFuncTypeIdx: new Map(),
      } as unknown as CodegenContext;
      expect(emitFuncRefAsClosure(ctx, fctx, "selected", 0)).toEqual({ kind: "ref", typeIdx: 102 });
      const guard = fctx.body.find((instruction) => instruction.op === "if");
      if (guard?.op !== "if") throw new Error("closure memo guard missing");
      const local = transported || visible;
      expect(guard.then.slice(3, local ? 4 : 5)).toEqual(
        local ? [{ op: "local.get", index: 0 }] : [{ op: "global.get", index: 7 }, { op: "ref.as_non_null" }],
      );
    });
