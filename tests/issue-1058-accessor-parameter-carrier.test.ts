// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { analyzeSource } from "../src/checker/index.js";
import { createCodegenContext } from "../src/codegen/context/create-context.js";
import {
  parameterNeedsOpenObjectCarrier,
  prepareOpenObjectParameterCarriers,
} from "../src/codegen/open-object-parameter-carrier.js";
import { createEmptyModule } from "../src/ir/types.js";
import { ts } from "../src/ts-api.js";
import { compile } from "../src/index.js";

it("records exact accessor arguments without widening ordinary or shadowed bindings", () => {
  const ast = analyzeSource(
    `
    type Shape = { value: number };
    type i32 = number;
    function receive(value: Shape) { return value.value; }
    function plain(value: Shape) { return value.value; }
    function spread(value: Shape) { return value.value; }
    function native(value: i32) { return value; }
    const accessor = { get value() { return 42; } };
    receive(accessor); plain({ value: 42 }); spread(...[] as any, accessor); native(accessor as any);
    function scope() {
      function receive(value: Shape) { return value.value; }
      receive({ value: 1 });
    }
  `,
    "/repo/accessor-parameters.ts",
  );
  const ctx = createCodegenContext(createEmptyModule(), ast.checker);
  // This producer must consume shared oracle evidence, not reopen the checker.
  ctx.checker = new Proxy(ast.checker, {
    get() {
      throw new Error("Accessor parameter preparation bypassed the oracle");
    },
  });
  prepareOpenObjectParameterCarriers(ctx, [ast.sourceFile]);
  const results: [string, boolean][] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.parameters.length) {
      results.push([node.name!.text, parameterNeedsOpenObjectCarrier(ctx, node.parameters[0]!)]);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast.sourceFile);
  expect(results).toEqual([
    ["receive", true],
    ["plain", false],
    ["spread", false],
    ["native", false],
    ["receive", false],
  ]);
  prepareOpenObjectParameterCarriers(ctx, []);
  const first = ast.sourceFile.statements.find(ts.isFunctionDeclaration)!;
  expect(parameterNeedsOpenObjectCarrier(ctx, first.parameters[0]!)).toBe(false);
});

it("preserves an accessor argument through an IR-emitted typed reader", async () => {
  const result = await compile(
    `
    export function read(value: { value: number }): number { return value.value; }
    const answer = read({ get value() { return 42; } });
    export function run(): number { return answer; }
  `,
    { target: "standalone", experimentalIR: true, trackIrOutcomes: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module, {}).exports.run as () => number)()).toBe(42);
  expect(
    result.irOutcomes?.find((row) => row.displayName === "read"),
    JSON.stringify(result.irOutcomes),
  ).toMatchObject({ irBodyEmitted: true });
});
