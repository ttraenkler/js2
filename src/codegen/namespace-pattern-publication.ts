// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";
import type { ValType } from "../ir/types.js";
import { walkInstructionArraysPostOrder } from "../wasm/model/instruction-postorder.js";
import { popBody, pushBody } from "./context/bodies.js";
import { getLocalType } from "./context/locals.js";
import type { CodegenContext, FunctionContext } from "./context/types.js";
import { compileArrayDestructuring, compileObjectDestructuring } from "./statements/destructuring.js";

/** Publish each pattern destination immediately after its physical store.
 * Reuse the existing pattern lowering (defaults, iterators, rest and closing),
 * rather than copying values only after later defaults have already executed.
 */
export function emitNamespacePatternPublication(
  ctx: CodegenContext,
  fctx: FunctionContext,
  declaration: ts.VariableDeclaration,
  publish: ReadonlyMap<ts.BindingElement, (type: ValType) => void>,
): void {
  const saved = pushBody(fctx);
  try {
    if (ts.isObjectBindingPattern(declaration.name)) compileObjectDestructuring(ctx, fctx, declaration);
    else compileArrayDestructuring(ctx, fctx, declaration);
    const body = fctx.body;
    const destinations = new Map<number, (type: ValType) => void>();
    for (const [element, emit] of publish) {
      if (!ts.isIdentifier(element.name)) continue;
      const index = fctx.localMap.get(element.name.text);
      if (index === undefined) throw new Error("namespace pattern lost its binding local");
      destinations.set(index, emit);
    }
    walkInstructionArraysPostOrder(body, (instructions) => {
      for (let i = instructions.length - 1; i >= 0; i--) {
        const instruction = instructions[i]!;
        if (instruction.op !== "local.set" && instruction.op !== "local.tee") continue;
        const emit = destinations.get(instruction.index);
        if (!emit) continue;
        const type = getLocalType(fctx, instruction.index);
        if (!type) throw new Error("namespace pattern local has no physical type");
        const prior = pushBody(fctx);
        let publication;
        try {
          fctx.body.push({ op: "local.get", index: instruction.index });
          emit(type);
          publication = fctx.body;
        } finally {
          popBody(fctx, prior);
        }
        instructions.splice(i + 1, 0, ...publication);
      }
    });
    saved.push(...body);
  } finally {
    popBody(fctx, saved);
  }
}
