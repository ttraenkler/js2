// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import ts from "typescript";
import { expect, it } from "vitest";
import { parameterObservesNullishSwitch } from "../src/frontend/ts/nullish-switch-parameter.js";

function parameter(source: string): ts.ParameterDeclaration {
  const file = ts.createSourceFile("test.ts", source, ts.ScriptTarget.Latest, true);
  return (file.statements[0] as ts.FunctionDeclaration).parameters[0]!;
}

for (const expression of ["undefined", "null", "void 0"]) {
  it(`preserves a string parameter observed by case ${expression}`, () => {
    const p = parameter(`function f(value:string){switch(value){case ${expression}:return 1;}}`);
    expect(parameterObservesNullishSwitch(p, { declarationsOf: () => [p] })).toBe(true);
    // Unresolved identity cannot prove the native string representation safe.
    expect(parameterObservesNullishSwitch(p, { declarationsOf: () => [] })).toBe(true);
  });
}

it("does not widen a different binding with the same spelling", () => {
  const p = parameter("function f(value:string){function g(value:string){switch(value){case null:return 1;}}}");
  const inner = ((p.parent as ts.FunctionDeclaration).body!.statements[0] as ts.FunctionDeclaration).parameters[0]!;
  expect(parameterObservesNullishSwitch(p, { declarationsOf: () => [inner] })).toBe(false);
});

it("leaves ordinary string switches and explicit native annotations unchanged", () => {
  for (const source of [
    "function f(value:string){switch(value){case 'x':return 1;}}",
    "function f(value:i32){switch(value){case undefined:return 1;}}",
    "function f(value:string){switch(other){case undefined:return 1;}}",
  ]) {
    const p = parameter(source);
    expect(parameterObservesNullishSwitch(p, { declarationsOf: () => [p] })).toBe(false);
  }
});
