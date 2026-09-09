// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { OracleTypeKey, SignaturePositionPath, TypeFact, TypeOracle } from "../checker/oracle.js";
import { ts } from "../ts-api.js";
import type { IrClosureSignature, IrType } from "./nodes.js";

export type InferredClosureDeclaration =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration;

// Analysis-only plans, scoped to the compilation's oracle and exact AST node.
// No allocator index, registry mutation, or generated annotation is cached.
const plans = new WeakMap<TypeOracle, WeakMap<InferredClosureDeclaration, IrClosureSignature | null>>();
export interface InferredClosureCarriers {
  readonly oracle: TypeOracle;
  readonly supportsDynamicReferenceUnions?: boolean;
  readonly supportsImplicitUndefinedReturns?: boolean;
  readonly supportsOptionalArguments?: boolean;
  readonly supportsArraySignatures?: boolean;
  readonly resolve: (key: OracleTypeKey) => IrType | undefined;
}
const carrierPlans = new WeakMap<
  InferredClosureCarriers,
  WeakMap<InferredClosureDeclaration, IrClosureSignature | null>
>();

/** One fixed-arity inference decision shared by selection and nested lowering. */
export function inferredClosureSignature(
  oracle: TypeOracle | undefined,
  declaration: InferredClosureDeclaration,
  carriers?: InferredClosureCarriers,
): IrClosureSignature | undefined {
  if (!oracle) return undefined;
  if (carriers && carriers.oracle !== oracle) return undefined;
  if (
    declaration.type &&
    declaration.parameters.every((parameter) => parameter.type) &&
    !annotatedSignatureNeedsCarrierPlan(oracle, declaration, carriers)
  )
    return undefined;
  let cache = carriers ? carrierPlans.get(carriers) : plans.get(oracle);
  if (!cache) {
    cache = new WeakMap();
    if (carriers) carrierPlans.set(carriers, cache);
    else plans.set(oracle, cache);
  }
  if (cache.has(declaration)) return cache.get(declaration) ?? undefined;
  const result = planSignature(oracle, declaration, carriers);
  // Source allocations may not exist on the first selection pass. A carrier
  // provider owns a separate positive cache and never retains that refusal.
  if (result || !carriers) cache.set(declaration, result ?? null);
  return result;
}

function planSignature(
  oracle: TypeOracle,
  declaration: InferredClosureDeclaration,
  carriers?: InferredClosureCarriers,
): IrClosureSignature | undefined {
  if (
    declaration.typeParameters?.length ||
    ("asteriskToken" in declaration && declaration.asteriskToken) ||
    declaration.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) ||
    declaration.parameters.some(
      (parameter) =>
        !ts.isIdentifier(parameter.name) ||
        parameter.name.text === "this" ||
        (parameter.questionToken && carriers?.supportsOptionalArguments !== true) ||
        parameter.dotDotDotToken ||
        parameter.initializer,
    )
  )
    return undefined;
  const optional = declaration.parameters.findIndex((parameter) => !!parameter.questionToken);
  if (optional >= 0 && declaration.parameters.slice(optional).some((parameter) => !parameter.questionToken))
    return undefined;
  const signature = planPositions(oracle, declaration, [], declaration.parameters.length, carriers);
  return signature && optional >= 0 ? Object.freeze({ ...signature, optionalParamStart: optional }) : signature;
}

/** Exact callable result projection; call lowering still checks its physical ABI. */
export function inferredReturnedClosureSignature(
  oracle: TypeOracle,
  call: ts.CallExpression,
  carriers?: InferredClosureCarriers,
): IrClosureSignature | undefined {
  if (carriers && carriers.oracle !== oracle) return undefined;
  const fact = oracle.signaturePositionOf(call.expression, ["return"])?.fact;
  return fact?.kind === "function" && fact.signature
    ? planPositions(oracle, call.expression, ["return"], fact.signature.params.length, carriers)
    : undefined;
}

function planPositions(
  oracle: TypeOracle,
  declaration: ts.Node,
  root: SignaturePositionPath,
  arity: number,
  carriers?: InferredClosureCarriers,
): IrClosureSignature | undefined {
  let remaining = 64;
  const position = (path: SignaturePositionPath): IrType | undefined => {
    if (path.length > 6 || remaining-- <= 0) return undefined;
    if (
      path.length === 1 &&
      path[0] === "return" &&
      carriers?.supportsImplicitUndefinedReturns === true &&
      hasUncoveredTailCompletion(declaration)
    )
      return Object.freeze({ kind: "dynamic" });
    const evidence = oracle.signaturePositionOf(declaration, path);
    if (!evidence) return undefined;
    if (evidence.fact.kind === "array" && carriers?.supportsArraySignatures === true) {
      const elementType = position([...path, "element"]);
      if (
        !elementType ||
        (elementType.kind !== "val" && elementType.kind !== "string" && elementType.kind !== "dynamic")
      )
        return undefined;
      return Object.freeze({ kind: "vec", elementType, nullable: true });
    }
    if (
      path.length === 1 &&
      typeof path[0] === "number" &&
      carriers?.supportsOptionalArguments === true &&
      (ts.isFunctionDeclaration(declaration) ||
        ts.isFunctionExpression(declaration) ||
        ts.isArrowFunction(declaration)) &&
      declaration.parameters[path[0]]?.questionToken
    )
      return Object.freeze({ kind: "dynamic" });
    const primitive = primitiveType(evidence.fact);
    if (primitive) {
      if (primitive.kind === "val") Object.freeze(primitive.val);
      return Object.freeze(primitive);
    }
    if (carriers?.supportsDynamicReferenceUnions === true && isReferenceUnionFact(evidence.fact))
      return Object.freeze({ kind: "dynamic" });
    if (evidence.fact.kind === "object" || evidence.fact.kind === "class") {
      const carrier = carriers?.resolve(evidence.typeKey);
      return carrier?.kind === "val" &&
        carrier.typeRef &&
        (carrier.val.kind === "ref" || carrier.val.kind === "ref_null")
        ? carrier
        : undefined;
    }
    if (evidence.fact.kind !== "function" || !evidence.fact.signature) return undefined;
    const signature = signatureAt(path, evidence.fact.signature.params.length);
    return signature ? Object.freeze({ kind: "closure", signature }) : undefined;
  };
  const signatureAt = (path: SignaturePositionPath, arity: number): IrClosureSignature | undefined => {
    const params: IrType[] = [];
    for (let index = 0; index < arity; index++) {
      const type = position([...path, index]);
      if (!type) return undefined;
      params.push(type);
    }
    const returnType = position([...path, "return"]);
    return returnType ? Object.freeze({ params: Object.freeze(params), returnType }) : undefined;
  };
  return signatureAt(root, arity);
}

/** An annotation is not a physical ABI: use the same proved boxed boundary for both forms. */
function annotatedSignatureNeedsCarrierPlan(
  oracle: TypeOracle,
  declaration: InferredClosureDeclaration,
  carriers?: InferredClosureCarriers,
): boolean {
  if (
    carriers?.supportsOptionalArguments === true &&
    declaration.parameters.some((parameter) => !!parameter.questionToken)
  )
    return true;
  if (carriers?.supportsDynamicReferenceUnions !== true && carriers?.supportsArraySignatures !== true) return false;
  const positions: SignaturePositionPath[] = declaration.parameters.map((_, index) => [index]);
  positions.push(["return"]);
  return positions.some((path) => {
    const fact = oracle.signaturePositionOf(declaration, path)?.fact;
    return (
      (carriers?.supportsDynamicReferenceUnions === true && isReferenceUnionFact(fact)) ||
      (carriers?.supportsArraySignatures === true && fact?.kind === "array")
    );
  });
}

/** Tagged transport preserves each reference's layout; it does not merge layouts. */
function isReferenceUnionFact(fact: TypeFact | undefined): boolean {
  return (
    fact?.kind === "union" &&
    (fact.nullable || fact.undefinable || fact.parts.length > 1) &&
    fact.parts.length > 0 &&
    fact.parts.every((part) => part.kind === "object" || part.kind === "class")
  );
}

/** Missing guard/default arms have an observable undefined completion. */
function hasUncoveredTailCompletion(declaration: ts.Node): boolean {
  if (
    !ts.isFunctionDeclaration(declaration) &&
    !ts.isFunctionExpression(declaration) &&
    !ts.isArrowFunction(declaration)
  )
    return false;
  if (!declaration.body || !ts.isBlock(declaration.body)) return false;
  const tail = declaration.body.statements.at(-1);
  return (
    !!tail &&
    ((ts.isIfStatement(tail) && !tail.elseStatement) ||
      (ts.isSwitchStatement(tail) && !tail.caseBlock.clauses.some(ts.isDefaultClause)))
  );
}

function primitiveType(fact: TypeFact): IrType | undefined {
  if (fact.kind === "number") return { kind: "val", val: { kind: "f64" } };
  if (fact.kind === "boolean") return { kind: "val", val: { kind: "i32" } };
  if (fact.kind === "string") return { kind: "string" };
  // Numeric/string literal unions (including enums) retain one storage family.
  if (fact.kind === "union" && !fact.nullable && !fact.undefinable && fact.parts.length > 0) {
    const first = fact.parts[0]!;
    if (
      (first.kind === "number" || first.kind === "boolean" || first.kind === "string") &&
      fact.parts.every((part) => part.kind === first.kind)
    )
      return primitiveType(first);
  }
  // In particular, object/any facts do not establish a recursive Node carrier.
  return undefined;
}
