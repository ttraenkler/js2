// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { ts } from "../src/ts-api.js";
import { runtimeModuleDeclarationGroups } from "../src/ir/runtime-namespace-plan.js";

function parse(source: string, name = "namespace.ts") {
  return ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true);
}

it("preserves declaration identity and source order instead of hoisting namespace exports", () => {
  const file = parse(`namespace N {
    before(); export function f(){return 1;}
    export enum Kind { A } export let x=read();
    namespace Inner { inside(); } after();
    interface T {} type U=number; declare const ambient:number;
  }`);
  const groups = runtimeModuleDeclarationGroups(file);
  expect(groups).toHaveLength(2);
  const outer = groups[0]!;
  expect(outer.declaration).toBe(file.statements[0]);
  expect(outer.initializers.map((statement) => statement.getText(file))).toEqual([
    "before();",
    "export function f(){return 1;}",
    "export enum Kind { A }",
    "export let x=read();",
    "namespace Inner { inside(); }",
    "after();",
  ]);
  expect(outer.functions).toEqual([outer.initializers[1]]);
  expect(groups[1]!.parent).toBe(outer);
  expect(groups[1]!.declaration).toBe(outer.initializers[4]);
  expect(Object.isFrozen(groups)).toBe(true);
  expect(Object.isFrozen(outer.initializers)).toBe(true);
});

it("keeps merged declarations as separate initialization sites and same-named functions distinct", () => {
  const groups = runtimeModuleDeclarationGroups(
    parse(`namespace N {export function f(){return 1;}}
    namespace N {export function g(){return 2;}} namespace M {export function f(){return 3;}}`),
  );
  expect(groups).toHaveLength(3);
  expect(groups.map((group) => group.functions[0]!.name!.text)).toEqual(["f", "g", "f"]);
  expect(groups[0]!.functions[0]).not.toBe(groups[2]!.functions[0]);
  expect(groups[0]!.block).not.toBe(groups[1]!.block);
});

it("retains the terminal block ownership of dotted namespaces", () => {
  const groups = runtimeModuleDeclarationGroups(parse("namespace A.B {namespace C {run();}}"));
  expect(groups.map((group) => group.declaration.name.getText())).toEqual(["B", "C"]);
  expect(groups[0]!.path.map((declaration) => declaration.name.getText())).toEqual(["A", "B"]);
  expect(groups[1]!.path.map((declaration) => declaration.name.getText())).toEqual(["C"]);
  expect(groups[1]!.parent).toBe(groups[0]);
});

it("uses the final function implementation without treating overload signatures as bodies", () => {
  const groups = runtimeModuleDeclarationGroups(
    parse("namespace N {function f(x:number):number; function f(x:any){return 1;} function f(x:any){return 2;}}"),
  );
  expect(groups[0]!.functions).toHaveLength(1);
  expect(groups[0]!.initializers).toHaveLength(2);
  expect(groups[0]!.functions[0]!.getText()).toContain("return 2");
});

it("retains runtime namespace alias declarations without retaining type-only aliases", () => {
  const groups = runtimeModuleDeclarationGroups(parse("namespace N {import alias = Other; import type T = Other;}"));
  expect(groups[0]!.initializers.map((statement) => statement.getText())).toEqual(["import alias = Other;"]);
});

it.each([
  "declare namespace N {namespace Inner {function f():void;}}",
  'declare module "pkg" {export function f():void;}',
  "export {}; declare global {namespace N {function f():void;}}",
])("does not allocate runtime ownership for ambient syntax: %s", (source) => {
  expect(runtimeModuleDeclarationGroups(parse(source))).toEqual([]);
});

it("does not allocate runtime ownership in declaration files", () => {
  expect(runtimeModuleDeclarationGroups(parse("namespace N {function f():void;}", "namespace.d.ts"))).toEqual([]);
});
