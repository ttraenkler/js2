// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import ts from "typescript";

/** Keep a single concrete contextual shape behind an optional/nullable slot. */
export function singleNonNullishContext(type: ts.Type | undefined): ts.Type | undefined {
  if (!type?.isUnion()) return type;
  const parts = type.types.filter((part) => (part.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)) === 0);
  return parts.length === 1 ? parts[0] : type;
}
