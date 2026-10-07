// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
/**
 * (#6907) Which project sources are reachable from the entry only through
 * TYPE edges.
 *
 * `resolveAllImports` deliberately pulls JSDoc `@import … from "…"` /
 * `import("…")` typedef targets (and `import type` targets) into the program so
 * the checker sees their declarations. A runtime never evaluates such a module
 * — Node does not load `./support.js` for `/** @import {X} from "./support.js" *\/`
 * — but every collected source contributed its top-level statements to the
 * graph `__module_init`. Prettier's `src/main/core-options.evaluate.js` (reached
 * only through JSDoc `@import`) therefore ran at startup, calling an `outdent`
 * tag the dogfood checkout never installs (`tag is not a function`), so four
 * whole upstream files died in module init while Node passed them.
 *
 * Fail-safe by construction: any VALUE edge from a reached source whose target
 * cannot be resolved to a SourceFile while it names a project-relative module
 * makes the analysis give up (empty result ⇒ nothing is filtered).
 */
import { ts } from "../ts-api.js";

type ModuleResolvingProgram = ts.Program & {
  getResolvedModuleFromModuleSpecifier?: (
    moduleSpecifier: ts.StringLiteralLike,
    sourceFile?: ts.SourceFile,
  ) => { resolvedModule?: { resolvedFileName: string } } | undefined;
};

/** Every module specifier a statement list evaluates at runtime (value edges). */
function valueModuleSpecifiers(sourceFile: ts.SourceFile): ts.StringLiteralLike[] {
  const specifiers: ts.StringLiteralLike[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      if (node.importClause?.isTypeOnly !== true && ts.isStringLiteralLike(node.moduleSpecifier)) {
        specifiers.push(node.moduleSpecifier);
      }
      return;
    }
    if (ts.isExportDeclaration(node)) {
      if (!node.isTypeOnly && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
        specifiers.push(node.moduleSpecifier);
      }
      return;
    }
    if (ts.isImportEqualsDeclaration(node)) {
      const ref = node.moduleReference;
      if (!node.isTypeOnly && ts.isExternalModuleReference(ref) && ts.isStringLiteralLike(ref.expression)) {
        specifiers.push(ref.expression);
      }
      return;
    }
    if (ts.isCallExpression(node) && node.arguments.length >= 1) {
      const callee = node.expression;
      const first = node.arguments[0]!;
      const isRequire = ts.isIdentifier(callee) && callee.text === "require";
      const isDynamicImport = callee.kind === ts.SyntaxKind.ImportKeyword;
      if ((isRequire || isDynamicImport) && ts.isStringLiteralLike(first)) specifiers.push(first);
    }
    ts.forEachChild(node, visit);
  };
  for (const statement of sourceFile.statements) visit(statement);
  return specifiers;
}

function resolveSpecifierSource(
  program: ModuleResolvingProgram,
  checker: ts.TypeChecker,
  specifier: ts.StringLiteralLike,
  sourceFile: ts.SourceFile,
): ts.SourceFile | undefined {
  const declarations = checker.getSymbolAtLocation(specifier)?.declarations ?? [];
  for (const declaration of declarations) if (ts.isSourceFile(declaration)) return declaration;
  const resolved = program.getResolvedModuleFromModuleSpecifier?.(specifier, sourceFile)?.resolvedModule;
  return resolved ? program.getSourceFile(resolved.resolvedFileName) : undefined;
}

function mayNameCompiledSource(specifier: string, sourceFiles: readonly ts.SourceFile[]): boolean {
  if (specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("#")) return true;
  if (specifier.startsWith("node:")) return false;
  const parts = specifier.split("/");
  const packageName = specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!;
  const marker = `node_modules/${packageName}/`;
  return sourceFiles.some((sourceFile) => {
    const name = sourceFile.fileName.replace(/\\/g, "/");
    return name.startsWith(marker) || name.includes(`/${marker}`);
  });
}

/**
 * The members of `sourceFiles` NOT reachable from `entry` through value edges.
 * Empty when there is nothing to filter or the walk could not be completed.
 */
export function typeOnlyReachableSources(
  program: ts.Program,
  checker: ts.TypeChecker,
  entry: ts.SourceFile,
  sourceFiles: readonly ts.SourceFile[],
): ReadonlySet<ts.SourceFile> {
  if (sourceFiles.length <= 1) return new Set();
  const members = new Set(sourceFiles);
  const reached = new Set<ts.SourceFile>([entry]);
  const queue: ts.SourceFile[] = [entry];
  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const specifier of valueModuleSpecifiers(current)) {
      const target = resolveSpecifierSource(program as ModuleResolvingProgram, checker, specifier, current);
      if (target === undefined) {
        // A value edge we cannot follow into a module that IS compiled here:
        // refuse to classify rather than drop a live initializer. Host
        // modules (`node:fs`, an external package) are simply not members.
        if (mayNameCompiledSource(specifier.text, sourceFiles)) return new Set();
        continue;
      }
      if (!members.has(target) || reached.has(target)) continue;
      reached.add(target);
      queue.push(target);
    }
  }
  const typeOnly = new Set<ts.SourceFile>();
  for (const sourceFile of sourceFiles) if (!reached.has(sourceFile)) typeOnly.add(sourceFile);
  return typeOnly;
}
