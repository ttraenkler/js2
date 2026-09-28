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

it("plans exported variable initialization in declarator order without publishing missing initializers", () => {
  const group = runtimeModuleDeclarationGroups(
    parse(`namespace N {
    export let missing:number, first=1, second=first+1;
    let privateValue=3;
  }`),
  )[0]!;
  const steps = group.initialization;
  expect(steps.map((step) => step.kind)).toEqual(["variable", "variable", "variable", "variable"]);
  expect(steps.map((step) => step.kind === "variable" && step.declaration.name.getText())).toEqual([
    "missing",
    "first",
    "second",
    "privateValue",
  ]);
  expect(steps.map((step) => step.kind === "variable" && step.publishes)).toEqual([false, true, true, false]);
  expect(steps.map((step) => step.kind === "variable" && step.properties.map((binding) => binding.name.text))).toEqual([
    ["missing"],
    ["first"],
    ["second"],
    [],
  ]);
  expect(Object.isFrozen(steps)).toBe(true);
  expect(Object.isFrozen(steps[0])).toBe(true);
});

it("retains exact destructuring binding identities, including renames, holes and rest", () => {
  const group = runtimeModuleDeclarationGroups(
    parse(`namespace N {
    export const {original: renamed, nested: {leaf}, ...rest} = input;
    export let [head, , ...tail] = list;
  }`),
  )[0]!;
  const first = group.initialization[0]!;
  const second = group.initialization[1]!;
  expect(first.kind).toBe("variable");
  expect(second.kind).toBe("variable");
  if (first.kind !== "variable" || second.kind !== "variable") throw new Error("missing variable steps");
  expect(first.properties.map((binding) => binding.name.text)).toEqual(["renamed", "leaf", "rest"]);
  expect(second.properties.map((binding) => binding.name.text)).toEqual(["head", "tail"]);
  for (const binding of [...first.properties, ...second.properties]) {
    expect(binding.declaration.name).toBe(binding.name);
    expect(ts.isBindingElement(binding.declaration)).toBe(true);
    expect(Object.isFrozen(binding)).toBe(true);
  }
});

it("publishes function and class values after their source declarations without property-backing local names", () => {
  const group = runtimeModuleDeclarationGroups(
    parse(`namespace N {
    before(); export function f(){return 1;} between(); export class C {} after();
  }`),
  )[0]!;
  expect(group.initialization.map((step) => step.kind)).toEqual([
    "statement",
    "statement",
    "publish-local",
    "statement",
    "statement",
    "publish-local",
    "statement",
  ]);
  const publications = group.initialization.filter((step) => step.kind === "publish-local");
  expect(publications.map((step) => step.name.text)).toEqual(["f", "C"]);
  expect(publications[0]!.declaration).toBe(group.functions[0]);
  expect(publications[1]!.declaration).toBe(group.initializers[3]);
});

it("does not guess runtime emission for const enums or import aliases", () => {
  const group = runtimeModuleDeclarationGroups(
    parse(`namespace N {
    export enum E {A} export const enum CE {A} export import Alias = Other;
    export import type T = Other;
  }`),
  )[0]!;
  const publications = group.initialization.filter((step) => step.kind === "publish-local");
  expect(publications.map((step) => [step.name.text, step.requiresRuntimeResolution])).toEqual([
    ["E", false],
    ["CE", true],
  ]);
  const aliases = group.initialization.filter((step) => step.kind === "export-alias");
  expect(aliases).toHaveLength(1);
  expect(aliases[0]!.declaration.name.text).toBe("Alias");
  expect(aliases[0]!.requiresRuntimeResolution).toBe(true);
});

it("gives empty and type-only namespace bodies no initialization steps", () => {
  const groups = runtimeModuleDeclarationGroups(
    parse(`namespace Empty {}
    namespace Types {export interface I {} export type T=number; export declare const value:number;}`),
  );
  expect(groups.map((group) => group.initialization)).toEqual([[], []]);
});
