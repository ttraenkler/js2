// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { InferredClosureCarriers } from "../ir/inferred-closure-signature.js";
import type { CodegenContext } from "./context/types.js";

const providers = new WeakMap<CodegenContext, InferredClosureCarriers>();

/** One explicit provider shared by this context's selector and AST lowering. */
export function irInferredClosureCarriers(ctx: CodegenContext): InferredClosureCarriers {
  let provider = providers.get(ctx);
  if (!provider || provider.oracle !== ctx.oracle) {
    provider = Object.freeze({
      oracle: ctx.oracle,
      supportsDynamicReferenceUnions: !ctx.fast,
      supportsImplicitUndefinedReturns: !ctx.fast,
      supportsOptionalArguments: !ctx.fast,
      supportsArraySignatures: !ctx.fast,
      resolve: (key: Parameters<InferredClosureCarriers["resolve"]>[0]) =>
        ctx.programAbiTypes?.prepareSourceParameterCarrier(key),
    });
    providers.set(ctx, provider);
  }
  return provider;
}
