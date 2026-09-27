// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { analyzeSource } from "../src/checker/index.js";
import { createCodegenContext } from "../src/codegen/context/create-context.js";
import { collectClassDeclaration, compileClassBodies } from "../src/codegen/class-bodies.js";
import { collectInterface } from "../src/codegen/declarations/struct-type-registration.js";
import { ensureStructForType } from "../src/codegen/index.js";
import { createEmptyModule } from "../src/ir/types.js";
import { ts } from "../src/ts-api.js";
import "../src/codegen/expressions.js";

it("keeps a published constructor signature when its interface later gains a named layout", () => {
  const ast = analyzeSource(
    `
    interface Options { value: number; }
    interface FormatContext { options: Options; }
    class Tracker { constructor(context: FormatContext) {} }
  `,
    "/repo/constructor-interface.ts",
  );
  const ctx = createCodegenContext(createEmptyModule(), ast.checker);
  const interfaces = ast.sourceFile.statements.filter(ts.isInterfaceDeclaration);
  const declaration = ast.sourceFile.statements.find(ts.isClassDeclaration)!;
  collectInterface(ctx, interfaces[0]!);
  ensureStructForType(ctx, ast.checker.getTypeAtLocation(interfaces[1]!));
  collectClassDeclaration(ctx, declaration);
  const ctor = ctx.mod.functions.find((func) => func.name === "Tracker_new")!;
  const before = structuredClone(ctx.mod.types[ctor.typeIdx]);
  expect(before.kind).toBe("func");
  collectInterface(ctx, interfaces[1]!);
  compileClassBodies(ctx, declaration, new Map(ctx.mod.functions.map((func, index) => [func.name, index])));
  expect(ctx.mod.types[ctor.typeIdx]).toEqual(before);
});
