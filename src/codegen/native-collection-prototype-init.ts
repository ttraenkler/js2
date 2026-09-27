// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { CodegenContext } from "./context/types.js";
import type { Instr } from "../ir/types.js";
import { ensureMapNativeProtoGlue, ensureSetNativeProtoGlue } from "./array-object-proto.js";
import { buildLazyNativeProtoGetInstrs } from "./native-proto.js";

/** Ordinary collection writes need intrinsic descriptors without reflection. */
export function nativeCollectionPrototypeInitInstrs(ctx: CodegenContext, name: "Map" | "Set"): Instr[] {
  if (!ctx.standalone) return [];
  const brand = name === "Map" ? ensureMapNativeProtoGlue(ctx) : ensureSetNativeProtoGlue(ctx);
  if (brand === undefined) return [];
  const instructions = buildLazyNativeProtoGetInstrs(ctx, brand);
  return instructions ? [...instructions, { op: "drop" }] : [];
}
