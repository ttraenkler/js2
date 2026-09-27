// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import { analyzeSource } from "../src/checker/index.js";
import { createCodegenContext } from "../src/codegen/context/create-context.js";
import type { FunctionContext } from "../src/codegen/context/types.js";
import { destructureParamObject } from "../src/codegen/destructuring-params.js";
import { createEmptyModule } from "../src/ir/types.js";
import { emitBinary } from "../src/emit/binary.js";
import { ts } from "../src/ts-api.js";

it("uses physical fields when a name-keyed layout describes a different carrier", () => {
  const ast = analyzeSource("function read({node}: {node: unknown}) {}", "/repo/physical-fields.ts");
  const declaration = ast.sourceFile.statements.find(ts.isFunctionDeclaration)!;
  const pattern = declaration.parameters[0]!.name as ts.ObjectBindingPattern;
  const mod = createEmptyModule();
  mod.types.push({
    kind: "struct",
    name: "Info",
    fields: [{ name: "node", type: { kind: "externref" }, mutable: true }],
  });
  const ctx = createCodegenContext(mod, ast.checker);
  ctx.typeIdxToStructName.set(0, "Info");
  ctx.structFields.set("Info", [{ name: "node", type: { kind: "ref_null", typeIdx: 0 }, mutable: true }]);
  const fctx = {
    name: "read",
    params: [{ name: "info", type: { kind: "ref_null", typeIdx: 0 } }],
    locals: [{ name: "node", type: { kind: "externref" } }],
    localMap: new Map([["node", 1]]),
    body: [],
    savedBodies: [],
    blockDepth: 0,
    breakStack: [],
    continueStack: [],
    labelMap: new Map(),
    returnType: { kind: "externref" },
  } as unknown as FunctionContext;
  destructureParamObject(ctx, fctx, 0, pattern, { kind: "ref_null", typeIdx: 0 });
  const guard = fctx.body.find((instruction) => instruction.op === "if");
  expect(guard?.op).toBe("if");
  if (guard?.op !== "if") throw new Error("Missing destructuring null guard");
  // Exercise the emitted non-null read in a minimal module; the guard's host
  // TypeError helper is unrelated to the field-carrier boundary under test.
  const probe = createEmptyModule();
  probe.types.push(
    mod.types[0]!,
    { kind: "func", params: [{ kind: "ref_null", typeIdx: 0 }], results: [{ kind: "externref" }] },
    { kind: "func", params: [{ kind: "externref" }], results: [{ kind: "externref" }] },
  );
  probe.functions.push(
    { name: "read", typeIdx: 1, locals: fctx.locals, body: [...guard.else!, { op: "local.get", index: 1 }] },
    {
      name: "run",
      typeIdx: 2,
      locals: [],
      body: [
        { op: "local.get", index: 0 },
        { op: "struct.new", typeIdx: 0 },
        { op: "call", funcIdx: 0 },
      ],
    },
  );
  probe.exports.push({ name: "run", desc: { kind: "func", index: 1 } });
  const module = new WebAssembly.Module(emitBinary(probe));
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const value = { text: "identity" };
  expect((new WebAssembly.Instance(module).exports.run as (value: unknown) => unknown)(value)).toBe(value);
});

it.each([true, false])("destructures a union node field with its physical carrier (IR=%s)", async (experimentalIR) => {
  const result = await compile(
    `
    interface Identifier { kind: 1; text: string; }
    interface PrivateIdentifier { kind: 2; text: string; extra: number; }
    interface Info { readonly node: Identifier | PrivateIdentifier; readonly className: string | undefined; }
    function doChange({node, className}: Info): string { return node.text + (className || ""); }
    export function run(): number {
      return doChange({node: {kind: 1, text: "one"}, className: undefined}) === "one" &&
        doChange({node: {kind: 2, text: "two", extra: 7}, className: "C"}) === "twoC" ? 1 : 0;
    }
  `,
    { target: "standalone", experimentalIR },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(1);
});
