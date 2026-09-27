// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { ts } from "../src/ts-api.js";
import { appendClassFieldPresence } from "../src/ir/class-field-presence.js";
import type { FieldDef } from "../src/ir/types.js";

function declaration(source: string): ts.ClassDeclaration {
  return ts.createSourceFile("presence.ts", source, ts.ScriptTarget.Latest, true).statements[0] as ts.ClassDeclaration;
}
const numeric = (name: string): FieldDef => ({ name, type: { kind: "f64" }, mutable: true });

it("packs declared slots across word boundaries without changing source indices", () => {
  const names = Array.from({ length: 33 }, (_, index) => `f${index}`);
  const cls = declaration(`class C { ${names.map((name) => `declare ${name}:number;`).join(" ")} }`);
  const fields = names.map(numeric);
  appendClassFieldPresence(cls, fields, []);
  expect(fields.slice(0, 33).map((field) => field.name)).toEqual(names);
  expect(fields.slice(0, 33).map((field) => field.presenceBit)).toEqual(names.map((_, index) => index));
  expect(fields.slice(0, 33).every((field) => field.undefinedDefault)).toBe(true);
  expect(fields.slice(33).map((field) => field.name)).toEqual(["$presence_0", "$presence_1"]);
  const saved = structuredClone(fields);
  appendClassFieldPresence(cls, fields, []);
  expect(fields).toEqual(saved);
});

it("preserves the exact inherited prefix and does not erase runtime fields", () => {
  const parent = [numeric("installed"), numeric("optional")];
  appendClassFieldPresence(declaration("class B { installed=7; declare optional:number; }"), parent, []);
  const saved = structuredClone(parent);
  const fields = [...parent, numeric("own"), numeric("normal")];
  appendClassFieldPresence(
    declaration(
      "class C extends B { declare installed:number; declare own:number; normal=1; static declare ignored:number; }",
    ),
    fields,
    parent,
  );
  expect(parent).toEqual(saved);
  expect(fields.slice(0, parent.length).every((field, index) => field === parent[index])).toBe(true);
  expect(fields.find((field) => field.name === "installed")?.presenceTracked).toBeUndefined();
  expect(fields.find((field) => field.name === "own")?.presenceBit).toBe(1);
  expect(fields.find((field) => field.name === "normal")?.presenceTracked).toBeUndefined();
  expect(fields.filter((field) => field.name.startsWith("$presence_"))).toHaveLength(1);
});
