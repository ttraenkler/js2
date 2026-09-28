// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { promoteAccessorCapturesToGlobals } from "../src/codegen/closures.js";
import type { CodegenContext, FunctionContext } from "../src/codegen/context/types.js";

for (const excluded of [false, true])
  it(`transitive promotion respects transported function values: excluded=${excluded}`, () => {
    // A lifted callback carries `worker` as a parameter. A different factory
    // has a same-named declaration in the compatibility capture registry.
    // Looking through that unrelated declaration can box the wrong outer
    // variable before a sibling's reserved capture signature is emitted.
    const queried: string[] = [];
    const registry = new Map([
      ["delegate", [{ name: "worker", outerLocalIdx: 0, mutable: false }]],
      ["worker", []],
    ]);
    const ctx = {
      funcMap: new Map([["worker", 1]]),
      nestedFuncCaptures: {
        has: (name: string) => registry.has(name),
        get: (name: string) => {
          queried.push(name);
          return registry.get(name);
        },
      },
    } as unknown as CodegenContext;
    const fctx = { localMap: new Map(), params: [], locals: [], body: [] } as unknown as FunctionContext;
    promoteAccessorCapturesToGlobals(ctx, fctx, undefined, undefined, undefined, undefined, {
      fnNames: ["delegate"],
      excludeNames: new Set(excluded ? ["worker"] : []),
    });
    // The non-excluded control proves this actually traverses the worklist.
    expect(queried).toEqual(excluded ? ["delegate"] : ["delegate", "worker"]);
    expect(fctx.body).toEqual([]);
  });
