// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";
import type { TypeOracle } from "../checker/oracle.js";

export interface EnumObjectWrite {
  readonly key: string;
  readonly value: number | string;
}

export interface EnumObjectPlan {
  readonly declaration: ts.EnumDeclaration;
  readonly members: readonly EnumObjectWrite[];
  /** Assignment order matters: later numeric aliases replace reverse names. */
  readonly writes: readonly EnumObjectWrite[];
}

/**
 * Source-owned constant enum contents, independent of a physical object layout.
 * This is not permission to hoist initialization or to snapshot a live binding.
 * Runtime-valued initializers and multiple enum declarations need ordered evaluation
 * and therefore decline this static plan rather than silently dropping effects.
 */
export function planEnumObject(
  declaration: ts.EnumDeclaration,
  checker: ts.TypeChecker | Pick<TypeOracle, "declarationsOf" | "enumConstantValueOf">,
): EnumObjectPlan | undefined {
  const declarations =
    "declarationsOf" in checker
      ? checker.declarationsOf(declaration.name)
      : checker.getSymbolAtLocation(declaration.name)?.declarations;
  // A namespace augmentation executes separately and reuses the enum object;
  // it does not add enum members to this source-owned initialization plan.
  if (
    !declarations?.includes(declaration) ||
    declarations.some((other) => other !== declaration && !ts.isModuleDeclaration(other))
  )
    return undefined;
  if (declaration.getSourceFile().isDeclarationFile) return undefined;
  for (let node: ts.Node | undefined = declaration; node; node = node.parent) {
    if (
      (ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined)?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.DeclareKeyword,
      )
    )
      return undefined;
  }
  const members: EnumObjectWrite[] = [];
  const writes: EnumObjectWrite[] = [];
  for (const member of declaration.members) {
    if (!ts.isIdentifier(member.name) && !ts.isStringLiteral(member.name)) return undefined;
    const value =
      "enumConstantValueOf" in checker ? checker.enumConstantValueOf(member) : checker.getConstantValue(member);
    if (typeof value !== "number" && typeof value !== "string") return undefined;
    const forward = Object.freeze({ key: member.name.text, value });
    members.push(forward);
    writes.push(forward);
    if (typeof value === "number") writes.push(Object.freeze({ key: String(value), value: member.name.text }));
  }
  return Object.freeze({ declaration, members: Object.freeze(members), writes: Object.freeze(writes) });
}
