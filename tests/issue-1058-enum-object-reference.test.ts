// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { analyzeMultiSource, analyzeSource } from "../src/checker/index.js";
import { TsCheckerOracle } from "../src/checker/oracle.js";
import { runtimeEnumObjectDeclarations } from "../src/ir/enum-object-reference.js";

function demanded(source: string) {
  const ast = analyzeSource(source, "/repo/enum-reference.ts");
  const oracle = new TsCheckerOracle(ast.checker);
  const declarations = [...runtimeEnumObjectDeclarations([ast.sourceFile], oracle)];
  expect(declarations).toEqual([...runtimeEnumObjectDeclarations([ast.sourceFile], ast.checker)]);
  return declarations;
}

it("does not materialize folded-only enum members or type references", () => {
  expect(demanded(`const enum Kind { A = 11 } const value: Kind = Kind.A;`)).toEqual([]);
});

it("demands the runtime enum for reverse lookup and wrapped value reads", () => {
  const declarations = demanded(`enum Kind { A = 11 } const reverse = Kind[11]; const value = (Kind as any);`);
  expect(declarations).toHaveLength(1);
  expect(declarations[0].name.text).toBe("Kind");
});

it("does not mistake shadowed values or getter results for enum bindings", () => {
  expect(
    demanded(`enum Kind { A = 11 }
    function read(Kind: object) { return Kind; }
    const receiver = { get Kind(): typeof Kind { throw 1; } };
    const value = receiver.Kind;`),
  ).toEqual([]);
});

it("resolves a namespace projection to the exact enum declaration", () => {
  const declarations = demanded(`namespace Left { export enum Kind { A = 11 } }
    namespace Right { export enum Kind { B = 12 } }
    const value = (Left as any).Kind;`);
  expect(declarations).toHaveLength(1);
  expect(declarations[0].members[0].name.getText()).toBe("A");
});

it.each([
  "export * from './provider.js';",
  "export { Kind as Renamed } from './provider.js';",
  "export * as nested from './provider.js';",
])("demands only observable enum exports through %s", (barrel) => {
  const ast = analyzeMultiSource(
    {
      "./provider.ts": "enum Hidden { A } export enum Kind { B=2 }",
      "./barrel.ts": barrel,
      "./entry.ts": "import * as ns from './barrel.js'; export const object=ns;",
    },
    "./entry.ts",
  );
  const oracle = new TsCheckerOracle(ast.checker);
  const declarations = [...runtimeEnumObjectDeclarations(ast.sourceFiles, oracle)];
  expect(declarations).toEqual([...runtimeEnumObjectDeclarations(ast.sourceFiles, ast.checker)]);
  expect(declarations.map((declaration) => declaration.name.text)).toEqual(["Kind"]);
});

it("does not demand enum runtime storage for a type-only namespace import", () => {
  const ast = analyzeMultiSource(
    {
      "./provider.ts": "export enum Kind { A }",
      "./entry.ts": "import type * as ns from './provider.js'; let value:ns.Kind;",
    },
    "./entry.ts",
  );
  expect([...runtimeEnumObjectDeclarations(ast.sourceFiles, new TsCheckerOracle(ast.checker))]).toEqual([]);
});
