// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { ts } from "../ts-api.js";
import { runtimeModuleDeclarationGroups, type RuntimeModuleDeclarationGroup } from "../ir/runtime-namespace-plan.js";
import type { GlobalDef, ValType } from "../ir/types.js";
import type { CodegenContext, FunctionContext } from "./context/types.js";
import { canonicalUndefinedExternInstrs } from "./any-helpers.js";
import { allocLocal } from "./context/locals.js";
import { emitCachedFuncClosureAccess } from "./closures.js";
import { compileExpression } from "./expressions.js";
import { ensureLateImport, flushLateImportShifts } from "./expressions/late-imports.js";
import { stringConstantExternrefInstrs } from "./native-strings.js";
import { addStringConstantGlobal } from "./registry/imports.js";
import { withRuntimeModuleCallableBindings } from "./runtime-module-callable-metadata.js";
import { coerceType } from "./shared.js";
import { emitNullCheckThrow } from "./property-access.js";
import { emitLazyClassObjectGet } from "./expressions/extern.js";
import { emitRuntimeEnumObjectRead } from "./runtime-enum-object.js";
import { emitNamespacePatternPublication } from "./namespace-pattern-publication.js";

interface Binding {
  readonly owner: ts.Declaration;
  readonly global: GlobalDef;
}
interface PropertyBinding {
  readonly object: Binding;
  readonly key: string;
}
interface NamespaceObjects {
  readonly objects: Map<ts.Declaration, Binding>;
  readonly groups: Map<ts.ModuleBlock, RuntimeModuleDeclarationGroup>;
  readonly properties: Map<ts.Declaration, PropertyBinding>;
}
const states = new WeakMap<CodegenContext, NamespaceObjects>();

function declarationOf(ctx: CodegenContext, expression: ts.Node): ts.Declaration | undefined {
  const site = ts.isPropertyAccessExpression(expression) ? expression.name : expression;
  const alias = ctx.oracle.declarationsOf(site)?.find(ts.isImportEqualsDeclaration);
  if (alias && states.get(ctx)?.properties.has(alias)) return alias;
  return ctx.oracle.aliasedValueDeclarationOf(ts.isPropertyAccessExpression(expression) ? expression.name : expression);
}

function bindingOf(ctx: CodegenContext, expression: ts.Node): Binding | undefined {
  const declaration = declarationOf(ctx, expression);
  return declaration && states.get(ctx)?.objects.get(declaration);
}

/** Owned globals retain allocator identity across import-index shifts. */
export function prepareRuntimeNamespaceObjects(ctx: CodegenContext, sources: readonly ts.SourceFile[]): void {
  if (!ctx.standalone) return;
  const state: NamespaceObjects = { objects: new Map(), groups: new Map(), properties: new Map() };
  for (const source of sources)
    for (const group of runtimeModuleDeclarationGroups(source)) {
      if (group.initialization.length === 0) continue;
      for (const declaration of group.path) {
        const owner = declarationOf(ctx, declaration.name);
        if (!owner || state.objects.has(owner)) continue;
        const global: GlobalDef = {
          name: `__runtime_namespace_${ctx.mod.globals.length}`,
          type: { kind: "externref" },
          mutable: true,
          init: [{ op: "ref.null.extern" }],
        };
        ctx.mod.globals.push(global);
        state.objects.set(owner, { owner, global });
      }
      const owner = declarationOf(ctx, group.declaration.name);
      const binding = owner && state.objects.get(owner);
      if (!binding) continue;
      state.groups.set(group.block, group);
      for (const step of group.initialization)
        if (step.kind === "variable") {
          for (const property of step.properties)
            state.properties.set(property.declaration, { object: binding, key: property.name.text });
        } else if (step.kind === "export-alias") {
          state.properties.set(step.declaration, { object: binding, key: step.declaration.name.text });
        }
    }
  states.set(ctx, state);
}

export function runtimeNamespaceObjectGroups(ctx: CodegenContext): readonly RuntimeModuleDeclarationGroup[] {
  return [...(states.get(ctx)?.groups.values() ?? [])];
}

export function hasRuntimeNamespaceObject(ctx: CodegenContext, expression: ts.Node): boolean {
  const declaration = declarationOf(ctx, expression);
  return (
    bindingOf(ctx, expression) !== undefined ||
    !!(declaration && ts.isImportEqualsDeclaration(declaration) && states.get(ctx)?.properties.has(declaration))
  );
}

function globalIndex(ctx: CodegenContext, binding: Binding): number {
  const index = ctx.mod.globals.indexOf(binding.global);
  if (index < 0) throw new Error("runtime namespace lost its owned global");
  return ctx.numImportGlobals + index;
}

function backingValue(ctx: CodegenContext, fctx: FunctionContext, binding: Binding): ValType | undefined {
  if (ts.isFunctionDeclaration(binding.owner)) {
    coerceType(ctx, fctx, functionValue(ctx, fctx, binding.owner), { kind: "externref" });
    return { kind: "externref" };
  }
  if (ts.isEnumDeclaration(binding.owner)) {
    return emitRuntimeEnumObjectRead(ctx, fctx, binding.owner.name);
  }
  if (ts.isClassDeclaration(binding.owner) && binding.owner.name) {
    const name =
      ctx.anonClassExprNames.get(binding.owner) ??
      ctx.classExprNameMap.get(binding.owner.name.text) ??
      binding.owner.name.text;
    if (ctx.classObjectGlobals?.has(name) && emitLazyClassObjectGet(ctx, fctx, name)) {
      return { kind: "externref" };
    }
  }
  return undefined;
}

function objectRead(ctx: CodegenContext, fctx: FunctionContext, binding: Binding): ValType {
  // Augmentation retains the existing value, including reads before the
  // namespace's first execution site. Never manufacture a second object.
  const existing = backingValue(ctx, fctx, binding);
  if (existing) return existing;
  const index = globalIndex(ctx, binding);
  fctx.body.push(
    { op: "global.get", index },
    { op: "ref.is_null" },
    {
      op: "if",
      blockType: { kind: "val", type: { kind: "externref" } },
      then: canonicalUndefinedExternInstrs(ctx),
      else: [{ op: "global.get", index }],
    },
  );
  return { kind: "externref" };
}

export function emitRuntimeNamespaceObjectRead(
  ctx: CodegenContext,
  fctx: FunctionContext,
  expression: ts.Node,
): ValType | undefined {
  const binding = bindingOf(ctx, expression);
  return binding ? objectRead(ctx, fctx, binding) : undefined;
}

function propertyOperation(ctx: CodegenContext, fctx: FunctionContext, key: string, write: boolean): void {
  ensureLateImport(
    ctx,
    write ? "__extern_set" : "__extern_get",
    write
      ? [{ kind: "externref" }, { kind: "externref" }, { kind: "externref" }]
      : [{ kind: "externref" }, { kind: "externref" }],
    write ? [] : [{ kind: "externref" }],
  );
  addStringConstantGlobal(ctx, key);
  flushLateImportShifts(ctx, fctx);
}

export function emitRuntimeNamespacePropertyRead(
  ctx: CodegenContext,
  fctx: FunctionContext,
  expression: ts.PropertyAccessExpression,
): ValType | undefined {
  if (ts.isPrivateIdentifier(expression.name)) return undefined;
  const binding = bindingOf(ctx, expression.expression);
  const receiver = declarationOf(ctx, expression.expression);
  const alias = receiver && ts.isImportEqualsDeclaration(receiver) && states.get(ctx)?.properties.has(receiver);
  if (!binding && !alias) return emitRuntimeNamespaceObjectRead(ctx, fctx, expression);
  // The class owns its declared static fields/accessors. Namespace exports
  // augment that same value, but must not bypass the class storage lowering.
  if (binding && ts.isClassDeclaration(binding.owner) && declarationOf(ctx, expression)?.parent === binding.owner) {
    return undefined;
  }
  propertyOperation(ctx, fctx, expression.name.text, false);
  ensureLateImport(ctx, "__extern_is_undefined", [{ kind: "externref" }], [{ kind: "i32" }]);
  flushLateImportShifts(ctx, fctx);
  if (binding) objectRead(ctx, fctx, binding);
  else compileExpression(ctx, fctx, expression.expression, { kind: "externref" });
  emitNullCheckThrow(ctx, fctx, { kind: "externref" }, expression, undefined, ctx.funcMap.get("__extern_is_undefined"));
  fctx.body.push(...stringConstantExternrefInstrs(ctx, expression.name.text), {
    op: "call",
    funcIdx: ctx.funcMap.get("__extern_get")!,
  });
  return { kind: "externref" };
}

export function emitRuntimeNamespaceVariableRead(
  ctx: CodegenContext,
  fctx: FunctionContext,
  identifier: ts.Identifier,
): ValType | undefined {
  const declaration = declarationOf(ctx, identifier);
  const property = declaration && states.get(ctx)?.properties.get(declaration);
  if (!property) return undefined;
  propertyOperation(ctx, fctx, property.key, false);
  objectRead(ctx, fctx, property.object);
  fctx.body.push(...stringConstantExternrefInstrs(ctx, property.key), {
    op: "call",
    funcIdx: ctx.funcMap.get("__extern_get")!,
  });
  return { kind: "externref" };
}

/** Exported namespace variables are ordinary mutable properties, even in returns. */
export function functionReturnsRuntimeNamespaceValue(ctx: CodegenContext, fn: ts.FunctionDeclaration): boolean {
  if (!fn.body) return false;
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found || ts.isFunctionLike(node)) return;
    if (ts.isReturnStatement(node) && node.expression) {
      const declaration = declarationOf(ctx, node.expression);
      found = !!declaration && states.get(ctx)?.properties.has(declaration) === true;
    }
    ts.forEachChild(node, visit);
  };
  visit(fn.body);
  return found;
}

function propertyWrite(
  ctx: CodegenContext,
  fctx: FunctionContext,
  property: PropertyBinding,
  valueType: ValType,
): void {
  coerceType(ctx, fctx, valueType, { kind: "externref" });
  const value = allocLocal(fctx, `__namespace_value_${fctx.locals.length}`, { kind: "externref" });
  fctx.body.push({ op: "local.set", index: value });
  propertyOperation(ctx, fctx, property.key, true);
  objectRead(ctx, fctx, property.object);
  fctx.body.push(
    ...stringConstantExternrefInstrs(ctx, property.key),
    { op: "local.get", index: value },
    { op: "call", funcIdx: ctx.funcMap.get("__extern_set")! },
  );
}

export function emitRuntimeNamespaceVariableWrite(
  ctx: CodegenContext,
  fctx: FunctionContext,
  identifier: ts.Identifier,
  valueType: ValType,
): boolean {
  const declaration = declarationOf(ctx, identifier);
  const property = declaration && states.get(ctx)?.properties.get(declaration);
  if (!property) return false;
  propertyWrite(ctx, fctx, property, valueType);
  return true;
}

export function emitRuntimeNamespaceVariableInitializer(
  ctx: CodegenContext,
  fctx: FunctionContext,
  declaration: ts.VariableDeclaration,
): boolean {
  if (!ts.isIdentifier(declaration.name)) {
    const publish = new Map<ts.BindingElement, (type: ValType) => void>();
    const visit = (name: ts.BindingName): void => {
      if (ts.isIdentifier(name)) return;
      for (const element of name.elements) {
        if (!ts.isBindingElement(element)) continue;
        const property = states.get(ctx)?.properties.get(element);
        if (property) publish.set(element, (type) => propertyWrite(ctx, fctx, property, type));
        else visit(element.name);
      }
    };
    visit(declaration.name);
    if (publish.size === 0) return false;
    emitNamespacePatternPublication(ctx, fctx, declaration, publish);
    return true;
  }
  const property = states.get(ctx)?.properties.get(declaration);
  if (!property) return false;
  if (declaration.initializer) {
    const type = compileExpression(ctx, fctx, declaration.initializer, { kind: "externref" });
    if (!type) throw new Error("namespace initializer did not produce a value");
    propertyWrite(ctx, fctx, property, type);
  }
  return true;
}

function functionValue(ctx: CodegenContext, fctx: FunctionContext, declaration: ts.FunctionDeclaration): ValType {
  const registry = ctx.programAbiSourceCallables;
  const unit = registry?.identityContext?.unitIdByDeclaration.get(declaration);
  const handle = unit === undefined ? undefined : registry?.handleForUnit(unit);
  if (handle === undefined || !declaration.name) throw new Error("namespace function has no exact callable identity");
  const type = withRuntimeModuleCallableBindings(ctx, [{ declaration, handle }], () =>
    emitCachedFuncClosureAccess(
      ctx,
      fctx,
      declaration.name!.text,
      handle,
      !declaration.asteriskToken && !declaration.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword),
    ),
  );
  if (!type) throw new Error("namespace function could not be materialized");
  return type;
}

function initializeBinding(ctx: CodegenContext, fctx: FunctionContext, binding: Binding): void {
  ensureLateImport(ctx, "__new_plain_object", [], [{ kind: "externref" }]);
  flushLateImportShifts(ctx, fctx);
  const prefix = fctx.body.length;
  if (ts.isModuleDeclaration(binding.owner)) {
    fctx.body.push({ op: "call", funcIdx: ctx.funcMap.get("__new_plain_object")! });
  } else if (!backingValue(ctx, fctx, binding)) {
    throw new Error("namespace augmentation needs its existing class or enum value");
  }
  fctx.body.push({ op: "global.set", index: globalIndex(ctx, binding) });
  const initialization = fctx.body.splice(prefix);
  fctx.body.push(
    { op: "global.get", index: globalIndex(ctx, binding) },
    { op: "ref.is_null" },
    {
      op: "if",
      blockType: { kind: "empty" },
      then: initialization,
      else: [],
    },
  );
}

export function emitRuntimeNamespaceObjectInit(
  ctx: CodegenContext,
  fctx: FunctionContext,
  group: RuntimeModuleDeclarationGroup,
): void {
  let parent =
    group.parent && group.path[0]?.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      ? bindingOf(ctx, group.parent.declaration.name)
      : undefined;
  for (const declaration of group.path) {
    const binding = bindingOf(ctx, declaration.name);
    if (!binding) throw new Error("namespace initialization has no owned object");
    initializeBinding(ctx, fctx, binding);
    if (parent && ts.isIdentifier(declaration.name)) {
      const type = objectRead(ctx, fctx, binding);
      propertyWrite(ctx, fctx, { object: parent, key: declaration.name.text }, type);
    }
    parent = binding;
  }
}

function aliasValue(ctx: CodegenContext, fctx: FunctionContext, name: ts.EntityName): ValType {
  if (ts.isIdentifier(name)) {
    const type = compileExpression(ctx, fctx, name);
    if (!type) throw new Error("namespace alias target has no runtime value");
    return type;
  }
  propertyOperation(ctx, fctx, name.right.text, false);
  coerceType(ctx, fctx, aliasValue(ctx, fctx, name.left), { kind: "externref" });
  fctx.body.push(...stringConstantExternrefInstrs(ctx, name.right.text), {
    op: "call",
    funcIdx: ctx.funcMap.get("__extern_get")!,
  });
  return { kind: "externref" };
}

export function emitRuntimeNamespaceLocalPublication(
  ctx: CodegenContext,
  fctx: FunctionContext,
  group: RuntimeModuleDeclarationGroup,
  declaration: ts.FunctionDeclaration | ts.ClassDeclaration | ts.EnumDeclaration | ts.ImportEqualsDeclaration,
): void {
  const binding = bindingOf(ctx, group.declaration.name);
  if (!binding || !declaration.name) throw new Error("namespace publication has no binding");
  if (ts.isImportEqualsDeclaration(declaration) && ts.isExternalModuleReference(declaration.moduleReference)) {
    throw new Error("namespace export alias requires an internal value reference");
  }
  const type = ts.isImportEqualsDeclaration(declaration)
    ? aliasValue(ctx, fctx, declaration.moduleReference as ts.EntityName)
    : ts.isFunctionDeclaration(declaration)
      ? functionValue(ctx, fctx, declaration)
      : compileExpression(ctx, fctx, declaration.name);
  if (!type) throw new Error("namespace local publication has no value");
  propertyWrite(ctx, fctx, { object: binding, key: declaration.name.text }, type);
}
