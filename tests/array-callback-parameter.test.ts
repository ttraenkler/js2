// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import ts from "typescript";
import { expect, it } from "vitest";
import { arrayCallbackReceiverParameterIsDynamic } from "../src/frontend/ts/array-callback-parameter.js";

function callback(source: string): ts.ArrowFunction {
  const file = ts.createSourceFile("test.ts", source, ts.ScriptTarget.Latest, true);
  let result: ts.ArrowFunction | undefined;
  const visit = (node: ts.Node): void => {
    if (ts.isArrowFunction(node)) result = node;
    ts.forEachChild(node, visit);
  };
  visit(file);
  return result!;
}

function declaration(owner: string, builtin: boolean): ts.MethodSignature {
  const file = ts.createSourceFile(
    "lib.test.d.ts",
    `${builtin ? '/// <reference no-default-lib="true"/>\n' : ""}interface ${owner}<T> { map():void; }`,
    ts.ScriptTarget.Latest,
    true,
  );
  return (file.statements[0] as ts.InterfaceDeclaration).members[0] as ts.MethodSignature;
}

for (const owner of ["Array", "ReadonlyArray"]) {
  it(`retains only the receiver position for built-in ${owner} callbacks`, () => {
    const oracle = { declarationsOf: () => [declaration(owner, true)] };
    const map = callback("rows.map((value,index,array)=>array)");
    expect([0, 1, 2, 3].map((i) => arrayCallbackReceiverParameterIsDynamic(map, i, oracle))).toEqual([
      false,
      false,
      true,
      false,
    ]);
    const reduce = callback("rows.reduce((acc,value,index,array)=>acc,0)");
    expect([0, 1, 2, 3].map((i) => arrayCallbackReceiverParameterIsDynamic(reduce, i, oracle))).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });
}

it("does not infer native Array semantics from a name or absent declarations", () => {
  const map = callback("rows.map((value,index,array)=>array)");
  for (const declarations of [
    [],
    [declaration("Array", false)],
    [declaration("Custom", true)],
    [declaration("Array", true), declaration("Array", false)],
  ]) {
    expect(arrayCallbackReceiverParameterIsDynamic(map, 2, { declarationsOf: () => declarations })).toBe(false);
  }
});

it("leaves non-callback arguments and unrelated methods unchanged", () => {
  const oracle = { declarationsOf: () => [declaration("Array", true)] };
  for (const source of ["rows.map(fn,(a,b,c)=>c)", "rows.sort((a,b,c)=>c)", "take((a,b,c)=>c)"]) {
    expect(arrayCallbackReceiverParameterIsDynamic(callback(source), 2, oracle)).toBe(false);
  }
});
