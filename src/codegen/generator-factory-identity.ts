// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";
import type { CodegenContext, NativeGeneratorInfo } from "./context/types.js";

/** State-machine names may be disambiguated independently of source function slots. */
export function nativeGeneratorFactoryIdentity(
  ctx: CodegenContext,
  info: NativeGeneratorInfo,
): { name: string; index: number } | undefined {
  const direct = ctx.funcMap.get(info.functionName);
  if (direct !== undefined) return { name: info.functionName, index: direct };
  if (!ts.isFunctionDeclaration(info.decl)) return undefined;
  for (const [name, declaration] of ctx.funcMapOwnerDecl) {
    if (declaration !== info.decl) continue;
    const index = ctx.funcMap.get(name);
    if (index !== undefined) return { name, index };
  }
  return undefined;
}
