// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { analyzeSource } from "../src/checker/index.js";
import { createCodegenContext } from "../src/codegen/context/create-context.js";
import { mintDefinedFunc, pushDefinedFunc } from "../src/codegen/func-space.js";
import { ProgramAbiSession } from "../src/codegen/program-abi-session.js";
import {
  ProgramAbiSourceCallableRegistry,
  pushProgramAbiTopLevelCallable,
} from "../src/codegen/program-abi-source-callable-planning.js";
import { collectSourceParameterCarriers } from "../src/codegen/source-parameter-carrier-evidence.js";
import { buildIrUnitInventory } from "../src/ir/identity.js";
import { buildIrPlanningIdentityContext } from "../src/ir/planning-identity.js";
import { createEmptyModule, type FuncTypeDef, type StructTypeDef, type ValType } from "../src/ir/types.js";
import { ts } from "../src/ts-api.js";
import { ProgramAbiTypeRegistry } from "../src/codegen/program-abi-type-planning.js";
import { lowerPreparedClosureSupportType } from "../src/ir/prepared-closure-support.js";
import { describePreparedSupportTypes } from "../src/codegen/program-abi-support-type-preparation.js";
import { planProgramAbiUnitCallable } from "../src/codegen/program-abi-planning.js";
import { irUnitFuncRef } from "../src/ir/callable-bindings.js";
import { describeProgramAbiSupportType } from "../src/codegen/program-abi-support-type-description.js";
import { irSupportTypeRef } from "../src/ir/abi-bindings.js";
import { irInferredClosureCarriers } from "../src/codegen/ir-inferred-closure-carriers.js";
import { inferredClosureSignature } from "../src/ir/inferred-closure-signature.js";
import { lowerFunctionAstToIr } from "../src/ir/from-ast.js";
import { sourceObjectFieldType } from "../src/codegen/ir-source-object-field.js";

function fixture() {
  const ast = analyzeSource(
    `
    interface Node { parent: Node; value: number; }
    export function a(node: Node) { return node; }
    export function b(node: Node) { return node; }
    export function outer() { function nested(node: Node) { return node; } return nested; }
    export function read(node: Node) { return node.value; }
  `,
    "/repo/carrier-evidence.ts",
  );
  const inventory = buildIrUnitInventory([ast.sourceFile], { entrySource: ast.sourceFile, checker: ast.checker });
  const identity = buildIrPlanningIdentityContext(inventory);
  const module = createEmptyModule();
  const session = new ProgramAbiSession(inventory, module);
  const ctx = createCodegenContext(module, ast.checker, undefined, session);
  ctx.programAbiSourceCallables = new ProgramAbiSourceCallableRegistry(ctx, session, identity);
  ctx.programAbiTypes = new ProgramAbiTypeRegistry(session, ctx, identity);
  const typeIdx = module.types.length;
  const type: StructTypeDef = {
    kind: "struct",
    name: "Node",
    fields: [
      { name: "parent", type: { kind: "ref_null", typeIdx }, mutable: true },
      { name: "value", type: { kind: "f64" }, mutable: true },
    ],
  };
  module.types.push(type);
  const declarations = [...identity.declarationByUnitId.values()].filter(ts.isFunctionDeclaration);
  const a = declarations.find((d) => d.name?.text === "a")!;
  const b = declarations.find((d) => d.name?.text === "b")!;
  const nested = declarations.find((d) => d.name?.text === "nested")!;
  const allocate = (declaration: ts.FunctionDeclaration, params: ValType[], isNested = false) => {
    const signature: FuncTypeDef = { kind: "func", params, results: [] };
    const func = { name: "same-display-name", typeIdx: module.types.length, locals: [], body: [], exported: false };
    module.types.push(signature);
    const handle = mintDefinedFunc(ctx);
    if (isNested) {
      pushDefinedFunc(ctx, handle, func);
      ctx.sourceFunctionHandleByDeclaration.set(declaration, handle);
      ctx.programAbiSourceCallables!.observeNestedFunctionDeclaration(declaration, handle);
    } else pushProgramAbiTopLevelCallable(ctx, declaration, handle, func);
    return { handle, signature, func };
  };
  const key = ctx.oracle.signaturePositionOf(a, [0])!.typeKey;
  expect(ctx.oracle.signaturePositionOf(b, [0])!.typeKey).toBe(key);
  const read = declarations.find((d) => d.name?.text === "read")!;
  return { ctx, identity, session, type, typeIdx, a, b, nested, read, allocate, key };
}

it("resolves only a semantically matching field on an authenticated physical carrier", () => {
  const f = fixture();
  f.allocate(f.a, [{ kind: "ref", typeIdx: f.typeIdx }]);
  const carrier = f.ctx.programAbiTypes!.prepareSourceParameterCarrier(f.key)!;
  const expression = (f.read.body!.statements[0] as ts.ReturnStatement).expression as ts.PropertyAccessExpression;
  expect(sourceObjectFieldType(f.ctx, carrier, expression)).toEqual({ kind: "val", val: { kind: "f64" } });
  expect(
    sourceObjectFieldType(f.ctx, { kind: "val", val: { kind: "ref", typeIdx: f.typeIdx } }, expression),
  ).toBeUndefined();
  f.ctx.mod.types[f.typeIdx] = { ...f.type };
  expect(() => sourceObjectFieldType(f.ctx, carrier, expression)).toThrow(/exact candidate allocator/);
});

it("does not treat packed numeric field storage as a proved f64 representation", () => {
  const f = fixture();
  f.type.fields[1]!.type = { kind: "i32" };
  f.allocate(f.a, [{ kind: "ref", typeIdx: f.typeIdx }]);
  const carrier = f.ctx.programAbiTypes!.prepareSourceParameterCarrier(f.key)!;
  const expression = (f.read.body!.statements[0] as ts.ReturnStatement).expression as ts.PropertyAccessExpression;
  expect(sourceObjectFieldType(f.ctx, carrier, expression)).toBeUndefined();
});

it("uses a nested result without mistaking hidden captures for source parameters", () => {
  const f = fixture();
  const allocated = f.allocate(f.nested, [{ kind: "f64" }, { kind: "ref", typeIdx: f.typeIdx }], true);
  allocated.signature.results.push({ kind: "ref", typeIdx: f.typeIdx });
  const evidence = collectSourceParameterCarriers(f.ctx, f.identity).get(f.key)!;
  expect(evidence).toMatchObject({ sourcePosition: "return", nullable: false });
  expect(evidence.type).toBe(f.type);
  const carrier = f.ctx.programAbiTypes!.prepareSourceParameterCarrier(f.key)!;
  expect(lowerPreparedClosureSupportType(f.ctx, carrier)).toEqual({ kind: "ref", typeIdx: f.typeIdx });
  expect(f.ctx.programAbiTypes!.provisionalSupportTypes()).toHaveLength(1);
});

it.each(["layout", "nullability", "scalar", "arity"] as const)(
  "rejects conflicting result-only %s evidence",
  (conflict) => {
    const f = fixture();
    f.allocate(f.nested, [], true).signature.results.push({ kind: "ref", typeIdx: f.typeIdx });
    const other = f.ctx.mod.types.length;
    f.ctx.mod.types.push({ ...f.type });
    const allocated = f.allocate(f.a, []);
    if (conflict !== "arity")
      allocated.signature.results.push(
        conflict === "scalar"
          ? { kind: "f64" }
          : {
              kind: conflict === "nullability" ? "ref_null" : "ref",
              typeIdx: conflict === "layout" ? other : f.typeIdx,
            },
      );
    expect(collectSourceParameterCarriers(f.ctx, f.identity).has(f.key)).toBe(false);
  },
);

it("does not redeem conflicting parameter evidence with a valid result", () => {
  const f = fixture();
  f.allocate(f.a, [{ kind: "ref", typeIdx: f.typeIdx }]);
  f.allocate(f.b, [{ kind: "f64" }]);
  f.allocate(f.nested, [], true).signature.results.push({ kind: "ref", typeIdx: f.typeIdx });
  expect(collectSourceParameterCarriers(f.ctx, f.identity).has(f.key)).toBe(false);
});

it("revalidates result allocations before publishing or replacing their owner", () => {
  const f = fixture();
  const allocated = f.allocate(f.nested, [], true);
  allocated.signature.results.push({ kind: "ref", typeIdx: f.typeIdx });
  expect(f.ctx.programAbiTypes!.prepareSourceParameterCarrier(f.key)).toBeDefined();
  allocated.signature.results[0] = { kind: "f64" };
  expect(f.ctx.programAbiTypes!.prepareSourceParameterCarrier(f.key)).toBeUndefined();
  const next = f.ctx.mod.types.length;
  f.ctx.mod.types.push({ ...f.type });
  allocated.signature.results[0] = { kind: "ref", typeIdx: next };
  expect(() => f.ctx.programAbiTypes!.prepareSourceParameterCarrier(f.key)).toThrow(/changed its allocation/);
  expect(f.session.typeCellFor(f.ctx.mod.types[next]!)).toBeUndefined();
});

it("joins exact parameter identity to one shared recursive allocation without publishing", () => {
  const f = fixture();
  f.allocate(f.a, [{ kind: "ref", typeIdx: f.typeIdx }]);
  f.allocate(f.b, [{ kind: "ref", typeIdx: f.typeIdx }]);
  const carriers = collectSourceParameterCarriers(f.ctx, f.identity);
  expect(carriers.size).toBe(1);
  expect(carriers.get(f.key)).toMatchObject({ parameterIndex: 0, nullable: false });
  expect(carriers.get(f.key)!.type).toBe(f.type);
  expect(f.session.typeCellFor(f.type)).toBeUndefined();
});

it.each(["layout", "nullability", "scalar"] as const)(
  "rejects conflicting %s evidence for the same source type",
  (conflict) => {
    const f = fixture();
    f.allocate(f.a, [{ kind: "ref", typeIdx: f.typeIdx }]);
    const otherIdx = f.ctx.mod.types.length;
    f.ctx.mod.types.push({ ...f.type });
    f.allocate(f.b, [
      conflict === "scalar"
        ? { kind: "f64" }
        : {
            kind: conflict === "nullability" ? "ref_null" : "ref",
            typeIdx: conflict === "layout" ? otherIdx : f.typeIdx,
          },
    ]);
    expect(collectSourceParameterCarriers(f.ctx, f.identity).has(f.key)).toBe(false);
  },
);

it("does not treat hidden capture slots as source parameter evidence", () => {
  const f = fixture();
  f.allocate(f.nested, [{ kind: "f64" }, { kind: "ref", typeIdx: f.typeIdx }], true);
  expect(collectSourceParameterCarriers(f.ctx, f.identity).size).toBe(0);
  f.allocate(f.a, [{ kind: "ref", typeIdx: f.typeIdx }]);
  expect(collectSourceParameterCarriers(f.ctx, f.identity).get(f.key)!.type).toBe(f.type);
});

it("refuses mismatched slot counts and declaration handle aliases", () => {
  const f = fixture();
  f.allocate(f.a, [{ kind: "f64" }, { kind: "ref", typeIdx: f.typeIdx }]);
  expect(collectSourceParameterCarriers(f.ctx, f.identity).size).toBe(0);
  const b = f.allocate(f.b, [{ kind: "ref", typeIdx: f.typeIdx }]);
  f.ctx.sourceFunctionHandleByDeclaration.set(f.a, b.handle);
  f.ctx.sourceFunctionHandleByDeclaration.delete(f.b);
  expect(collectSourceParameterCarriers(f.ctx, f.identity).size).toBe(0);
});

it.each(["abort", "seal"] as const)("publishes source carrier ownership only on %s", (action) => {
  const f = fixture();
  const allocated = f.allocate(f.a, [{ kind: "ref", typeIdx: f.typeIdx }]);
  const carrier = f.ctx.programAbiTypes!.prepareSourceParameterCarrier(f.key)!;
  expect(carrier.kind).toBe("val");
  if (carrier.kind !== "val" || !carrier.typeRef) throw new Error("missing source carrier control");
  const id = carrier.typeRef.binding.bindingId;
  expect(f.ctx.programAbiTypes!.prepareSourceParameterCarrier(f.key)).toEqual(carrier);
  expect(f.ctx.programAbiTypes!.provisionalSupportTypes()).toHaveLength(1);
  expect(lowerPreparedClosureSupportType(f.ctx, carrier)).toEqual({ kind: "ref", typeIdx: f.typeIdx });
  expect(f.session.hasPlan(id)).toBe(false);
  const unitId = f.identity.unitIdByDeclaration.get(f.a)!;
  planProgramAbiUnitCallable(f.ctx, { ref: irUnitFuncRef({ unitId, name: allocated.func.name }), ...allocated });
  const scope = f.session.beginPreparedComponentScope("source-carrier", [unitId]);
  scope.stagePreparedComponentBatch({
    scopeId: "source-carrier",
    terminalUnitIds: [unitId],
    requestedStructuralReferenceKeys: [],
    supportTypes: describePreparedSupportTypes(f.ctx, [unitId], [id]),
  });
  scope.includeBinding(id);
  scope[action]();
  expect(f.session.hasPlan(id)).toBe(action === "seal");
});

it("reuses a published support owner instead of assigning the allocation twice", () => {
  const f = fixture();
  f.allocate(f.a, [{ kind: "ref", typeIdx: f.typeIdx }]);
  const ref = irSupportTypeRef(f.identity.inventory.sources[0]!.id, "existing", "existing");
  const cell = f.session.createTypeCell(f.type);
  const description = describeProgramAbiSupportType({
    session: f.session,
    entrySourceId: f.identity.inventory.sources[0]!.id,
    ref,
    cell,
    type: f.type,
    roleOrdinal: 0,
    derivedOrdinal: 0,
  });
  f.session.ensurePlan(description.draft);
  f.session.registerStructuralReference(description.draft.id, description.structuralReferenceKey!);
  f.session.attachLocator(description.draft.id, description.locator!);
  const carrier = f.ctx.programAbiTypes!.prepareSourceParameterCarrier(f.key)!;
  expect(carrier.kind === "val" && carrier.typeRef?.binding.bindingId).toBe(ref.binding.bindingId);
  expect(f.ctx.programAbiTypes!.provisionalSupportTypes()).toHaveLength(0);
});

it("rechecks source evidence and rejects replacement of an already described allocation", () => {
  const f = fixture();
  const allocated = f.allocate(f.a, [{ kind: "ref", typeIdx: f.typeIdx }]);
  expect(f.ctx.programAbiTypes!.prepareSourceParameterCarrier(f.key)).toBeDefined();
  allocated.signature.params[0] = { kind: "f64" };
  expect(f.ctx.programAbiTypes!.prepareSourceParameterCarrier(f.key)).toBeUndefined();
  const nextIdx = f.ctx.mod.types.length;
  f.ctx.mod.types.push({ ...f.type });
  allocated.signature.params[0] = { kind: "ref", typeIdx: nextIdx };
  expect(() => f.ctx.programAbiTypes!.prepareSourceParameterCarrier(f.key)).toThrow(/changed its allocation/);
  expect(f.session.typeCellFor(f.ctx.mod.types[nextIdx]!)).toBeUndefined();
});

it("retries missing carrier evidence and shares the resulting signature with nested AST lowering", () => {
  const f = fixture();
  const outer = [...f.identity.declarationByUnitId.values()].find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === "outer",
  ) as ts.FunctionDeclaration;
  const provider = irInferredClosureCarriers(f.ctx);
  expect(irInferredClosureCarriers(f.ctx)).toBe(provider);
  expect(inferredClosureSignature(f.ctx.oracle, outer)).toBeUndefined();
  expect(inferredClosureSignature(f.ctx.oracle, outer, provider)).toBeUndefined();
  f.allocate(f.a, [{ kind: "ref", typeIdx: f.typeIdx }]);
  const plan = inferredClosureSignature(f.ctx.oracle, outer, provider)!;
  expect(plan?.returnType?.kind).toBe("closure");
  expect(inferredClosureSignature(f.ctx.oracle, outer, provider)).toBe(plan);
  // The analysis-only negative cache and a different compilation stay isolated.
  expect(inferredClosureSignature(f.ctx.oracle, outer)).toBeUndefined();
  expect(inferredClosureSignature(f.ctx.oracle, outer, irInferredClosureCarriers(fixture().ctx))).toBeUndefined();
  const lowered = lowerFunctionAstToIr(outer, {
    funcName: "outer",
    ownerUnitId: f.identity.unitIdByDeclaration.get(outer)!,
    identityContext: f.identity,
    checker: f.ctx.checker,
    oracle: f.ctx.oracle,
    inferredClosureCarriers: provider,
    returnTypeOverride: plan.returnType,
  });
  expect(lowered.lifted).toHaveLength(1);
  expect(lowered.lifted[0]!.params.some((param) => param.type.kind === "val" && param.type.typeRef !== undefined)).toBe(
    true,
  );
});
