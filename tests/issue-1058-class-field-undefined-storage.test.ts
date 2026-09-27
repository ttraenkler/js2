// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { ts } from "../src/ts-api.js";
import { collectUndefinedWrittenInstanceFields } from "../src/ir/class-field-undefined-storage.js";

function fields(source: string, provesUndefined = true): string[] {
  const file = ts.createSourceFile("input.ts", source, ts.ScriptTarget.Latest, true);
  const declaration = file.statements.find(ts.isClassDeclaration)!;
  return [
    ...collectUndefinedWrittenInstanceFields(
      declaration,
      (node) => provesUndefined && ts.isIdentifier(node) && node.text === "undefined",
    ),
  ].sort();
}

it("tracks constructors, field initializers, methods and lexical arrows", () => {
  expect(
    fields(`class C {
    field = undefined;
    arrow = () => { this.fromArrow = undefined; };
    constructor() { this.fromCtor = undefined!; }
    method() { this.fromMethod = (undefined as any); }
    get item() { this.fromGetter = void 0; return 1; }
    set item(value: number) { this.fromSetter = undefined; }
  }`),
  ).toEqual(["field", "fromArrow", "fromCtor", "fromGetter", "fromMethod", "fromSetter"]);
});

it("does not attribute other this scopes or static fields to the instance", () => {
  expect(
    fields(`class C {
    static field = undefined;
    static method() { this.fromStatic = undefined; }
    method() {
      function nested() { this.fromFunction = undefined; }
      const f = function () { this.fromExpression = undefined; };
      const c = class { method() { this.fromClass = undefined; } };
      const object = { method() { this.fromObject = undefined; } };
      (() => { this.own = undefined; })();
    }
  }`),
  ).toEqual(["own"]);
});

it("requires supplied semantic evidence except for void and keeps private identity", () => {
  expect(
    fields(
      `class C {
    #private = void 0;
    ["named"] = undefined;
    method() { this.unknown = undefined; this.known = void sideEffect(); }
  }`,
      false,
    ),
  ).toEqual(["__priv_private", "known"]);
});
