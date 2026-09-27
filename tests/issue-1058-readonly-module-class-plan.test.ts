// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { ts } from "../src/ts-api.js";
import { readonlyModuleClasses } from "../src/ir/readonly-module-class-plan.js";

function plan(text: string, unknown = false) {
  const source = ts.createSourceFile("classes.ts", text, ts.ScriptTarget.Latest, true);
  const host = ts.createCompilerHost({ noLib: true });
  host.getSourceFile = (name) => (name === source.fileName ? source : undefined);
  const checker = ts.createProgram([source.fileName], { noLib: true }, host).getTypeChecker();
  return readonlyModuleClasses(source, {
    valueDeclarationOf: (node) => (unknown ? undefined : checker.getSymbolAtLocation(node)?.valueDeclaration),
  });
}

for (const target of [
  "C=class {};",
  "C ||= class {};",
  "C++;",
  "[C]=values;",
  "({value:C}=record);",
  "for(C of values){}",
  "(C as any)=value;",
]) {
  it(`rejects a class binding write: ${target}`, () => {
    expect(plan(`class C{} function mutate(){${target}}`)).toHaveLength(0);
  });
}
it("preserves identity across shadowing and does not mistake property writes for binding writes", () => {
  const declarations = plan("class C{} function f(C:any){C=1;} C.method=()=>2;");
  expect(declarations).toHaveLength(1);
  expect(declarations[0]!.name!.text).toBe("C");
});
it("declines eval and unresolved potentially matching assignment targets", () => {
  expect(plan("class C{} eval(source);")).toHaveLength(0);
  expect(plan("class C{} C=value;", true)).toHaveLength(0);
});
it("keeps only executable source-file-direct declarations", () => {
  expect(
    plan("declare class Ambient{} namespace N {export class Nested{}} class C{};").map((node) => node.name!.text),
  ).toEqual(["C"]);
});
