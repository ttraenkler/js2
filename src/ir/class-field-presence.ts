// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";
import type { FieldDef } from "./types.js";
import { irClassInstanceFieldName } from "./class-instance-initializers.js";

/** Declare/abstract slots reserve storage without creating an own property. */
export function appendClassFieldPresence(
  declaration: ts.ClassDeclaration | ts.ClassExpression,
  fields: FieldDef[],
  inherited: readonly FieldDef[],
): void {
  const inheritedNames = new Set(inherited.map((field) => field.name));
  let nextBit = 0;
  for (const field of fields) {
    if (field.presenceBit !== undefined) nextBit = Math.max(nextBit, field.presenceBit + 1);
  }
  for (const member of declaration.members) {
    if (!ts.isPropertyDeclaration(member)) continue;
    const modifiers = member.modifiers;
    if (modifiers?.some(({ kind }) => kind === ts.SyntaxKind.StaticKeyword)) continue;
    if (!modifiers?.some(({ kind }) => kind === ts.SyntaxKind.DeclareKeyword || kind === ts.SyntaxKind.AbstractKeyword))
      continue;
    const name = irClassInstanceFieldName(member.name);
    if (name === undefined || inheritedNames.has(name)) continue;
    const field = fields.find((candidate) => candidate.name === name);
    if (!field || field.presenceTracked) continue;
    field.presenceTracked = true;
    field.presenceBit = nextBit++;
    if (field.type.kind === "f64") field.undefinedDefault = true;
    const wordName = `$presence_${field.presenceBit >>> 5}`;
    if (!fields.some((candidate) => candidate.name === wordName)) {
      fields.push({ name: wordName, type: { kind: "i32" }, mutable: true });
    }
  }
}
