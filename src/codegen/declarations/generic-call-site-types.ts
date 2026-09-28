// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { isVoidType, unwrapPromiseType } from "../../checker/type-mapper.js";
import { hasUnconstrainedGenericResult } from "../../frontend/ts/erased-generic-result.js";
import type { ValType } from "../../ir/types.js";
import { forEachChild, ts } from "../../ts-api.js";
import { isStandalonePromiseActive } from "../async-scheduler.js";
import type { CodegenContext } from "../context/types.js";
import { hasAsyncModifier, resolveWasmType } from "../index.js";
import { widenJsDefaultGuessSymbolSlot } from "../js-default-param-type-guess.js";

export function resolveGenericCallSiteTypes(
  ctx: CodegenContext,
  funcName: string,
  implementation: ts.FunctionDeclaration,
  sourceFile: ts.SourceFile,
  resolveMissingParam: (parameter: ts.ParameterDeclaration, index: number) => ValType,
): { params: ValType[]; results: ValType[] } | null {
  let found: { params: ValType[]; results: ValType[] } | null = null;
  const implementationArity = implementation.parameters.length;
  const erasedResult = hasUnconstrainedGenericResult(ctx.checker, implementation);

  function visit(node: ts.Node) {
    if (found && found.params.length >= implementationArity) return;
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === funcName) {
      const sig = ctx.checker.getResolvedSignature(node);
      if (sig) {
        const params: ValType[] = [];
        const sigParams = sig.getParameters();
        for (let i = 0; i < sigParams.length; i++) {
          const paramType = ctx.checker.getTypeOfSymbol(sigParams[i]!);
          params.push(widenJsDefaultGuessSymbolSlot(sigParams[i], resolveWasmType(ctx, paramType)));
        }
        const retType = ctx.checker.getReturnTypeOfSignature(sig);
        // (#2905) Carrier own-return guard. resolveWasmType(Promise<T>) lowers to
        // externref under the native $Promise carrier (index.ts), but an async
        // callee's OWN wasm result is the unwrapped T — its body returns raw T;
        // wrapAsyncReturn boxes to $Promise only at the *call* site. So for an
        // async callee under the carrier, pre-unwrap to keep this inferred
        // signature matching the actually-compiled fn (else externref-result vs
        // f64-body = invalid Wasm). Gated on the carrier so off-carrier bytes are
        // identical (effRet === retType). Non-async fns returning Promise<T> keep
        // retType → resolveWasmType → externref, which is correct (body returns a
        // real promise). Mirrors the main async-return sites (e.g. :2930).
        const callDecl = sig.getDeclaration();
        const calleeIsAsync = callDecl ? hasAsyncModifier(callDecl) : false;
        const effRetType =
          isStandalonePromiseActive(ctx) && calleeIsAsync ? unwrapPromiseType(retType, ctx.checker) : retType;
        const results: ValType[] = erasedResult
          ? [{ kind: "externref" }]
          : isVoidType(effRetType)
            ? []
            : [resolveWasmType(ctx, effRetType)];
        if (!found) {
          found = { params, results };
        } else if (params.length > found.params.length) {
          // (#4268) Preserve the first call's established specialization and
          // result ABI, but append slots from a resolved wider overload. A
          // short overload cannot erase parameters owned by the implementation.
          found = { params: [...found.params, ...params.slice(found.params.length)], results: found.results };
        }
      }
    }
    forEachChild(node, visit);
  }

  forEachChild(sourceFile, visit);
  // TypeScript does not model assignments made by the recursive visitor when
  // narrowing the captured variable after forEachChild returns.
  const resolved = found as { params: ValType[]; results: ValType[] } | null;
  if (!resolved || resolved.params.length >= implementationArity) return resolved;

  // No local call supplies every implementation parameter. Keep the omitted
  // optional slots with conservative declaration-derived carriers so body
  // locals and call-site padding still share a complete ABI.
  const params = [...resolved.params];
  for (let i = params.length; i < implementationArity; i++) {
    params.push(resolveMissingParam(implementation.parameters[i]!, i));
  }
  return { params, results: resolved.results };
}
