// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";
import type { ValType } from "./types.js";

/** Nullable references encode null, not the distinct JavaScript undefined. */
export function preserveUndefinedReferenceCarrier(type: ts.Type, carrier: ValType, optional = false): ValType {
  if (
    (carrier.kind === "ref" || carrier.kind === "ref_null") &&
    (optional ||
      (type.isUnion() && type.types.some((part) => (part.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void)) !== 0)))
  ) {
    return { kind: "externref" };
  }
  return carrier;
}
