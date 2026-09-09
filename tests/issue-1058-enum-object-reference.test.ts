// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { analyzeSource } from "../src/checker/index.js";
import { runtimeEnumObjectDeclarations } from "../src/ir/enum-object-reference.js";

function demanded(source: string) {
  const ast = analyzeSource(source, "/repo/enum-reference.ts");
  return [...runtimeEnumObjectDeclarations([ast.sourceFile], ast.checker)];
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
