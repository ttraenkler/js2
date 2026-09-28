// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
// Original upstream unit callbacks against complete source modules, not projections.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import ts from "typescript";
import { setupTypescriptUpstreamSuite } from "./setup-typescript-upstream-suite.mjs";
import { typescriptHarnessAugmentation } from "./typescript-harness-augmentation.mjs";
import { sourceUnitVirtualHarness } from "./typescript-virtual-harness.mjs";
import { TYPESCRIPT_SOURCE_ASSERT } from "./typescript-source-assert.mjs";
import { TYPESCRIPT_STANDALONE_TEST_EXPORTS } from "./typescript-upstream-suite.mjs";
import {
  UPSTREAM_TEST_EXPORTS,
  UPSTREAM_TEST_SHIM,
  compileAndRunUpstreamModule,
  writeUpstreamReport,
} from "./upstream-suite-runner.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SOURCE_UNIT_NATIVE_BANNER =
  'import { createRequire as __sourceUnitCreateRequire } from "node:module"; import { fileURLToPath as __sourceUnitFileURLToPath } from "node:url"; import { dirname as __sourceUnitDirname } from "node:path"; const require = __sourceUnitCreateRequire(import.meta.url); const __filename = __sourceUnitFileURLToPath(import.meta.url); const __dirname = __sourceUnitDirname(__filename);';
const FILES = {
  factory: 3,
  diagnosticCollection: 5,
  compilerCore: 11,
  base64: 1,
  comments: 3,
  parsePseudoBigInt: 5,
  paths: 14,
  asserts: 2,
  regExpScannerRecovery: 984,
  incrementalParser: 153,
  semver: 692,
  debugDeprecation: 6,
  jsonParserRecovery: 5,
};

/** Unit-directory files are an inventory, not a count of registered callbacks. */
export function sourceUnitInventory(root) {
  const directory = join(root, "src/testRunner/unittests");
  const entryPath = join(root, "src/testRunner/tests.ts");
  const entrySource = ts.createSourceFile(entryPath, readFileSync(entryPath, "utf8"), ts.ScriptTarget.Latest, true);
  if (entrySource.parseDiagnostics.length) throw new Error("Upstream test-entry manifest does not parse");
  const entries = new Set();
  for (const statement of entrySource.statements) {
    if (
      !ts.isExportDeclaration(statement) ||
      statement.exportClause ||
      statement.isTypeOnly ||
      !statement.moduleSpecifier ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      throw new Error("Upstream test-entry manifest shape changed");
    }
    const match = statement.moduleSpecifier.text.match(/^\.\/unittests\/(.+)\.js$/);
    const name = match?.[1];
    if (!name || name.split("/").some((part) => !part || part === "." || part === "..")) {
      throw new Error("Upstream test-entry manifest contains an unexpected path");
    }
    if (entries.has(name)) throw new Error(`Duplicate upstream test entry: ${name}`);
    entries.add(name);
  }
  if (entries.size === 0) throw new Error("Upstream test-entry manifest is empty");
  const files = [];
  function visit(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (entry.isFile() && entry.name.endsWith(".ts")) {
        const name = relative(directory, child).replace(/\\/g, "/").replace(/\.ts$/, "");
        files.push({
          name,
          entry: entries.has(name),
          expectedTests: Object.hasOwn(FILES, name) ? FILES[name] : null,
          runnable: Object.hasOwn(FILES, name),
        });
      }
    }
  }
  visit(directory);
  files.sort((a, b) => a.name.localeCompare(b.name));
  if (files.length === 0) throw new Error("Upstream source unit inventory is empty");
  for (const name of entries) {
    if (!files.some((file) => file.name === name)) throw new Error(`Upstream test entry is missing: ${name}`);
  }
  for (const name of Object.keys(FILES)) {
    if (!files.some((file) => file.name === name)) throw new Error(`Upstream source unit file missing: ${name}`);
    if (!entries.has(name)) throw new Error(`Registered source unit is not an upstream test entry: ${name}`);
  }
  return {
    files,
    sourceFiles: files.length,
    entryFiles: entries.size,
    supportFiles: files.length - entries.size,
    runnableFiles: files.filter((file) => file.runnable).length,
  };
}

export const SOURCE_UNIT_DIAGNOSTIC_EXPORTS = String.raw`
let __sourceUnitError = "";
export function runStandaloneUpstreamTest(index: number): number {
  __sourceUnitError = "";
  try { return runSourceUnitTestBody(index); }
  catch (error) {
    __sourceUnitError = String((error as Error).message || error);
    throw error;
  }
}
export function upstreamStandaloneErrorLength(): number { return __sourceUnitError.length; }
export function upstreamStandaloneErrorCodeUnit(index: number): number { return __sourceUnitError.charCodeAt(index); }
`;

export function redirectSourceUnitImports(name, original, root, generatedPath) {
  const needsServices =
    name === "regExpScannerRecovery" || name === "incrementalParser" || name === "jsonParserRecovery";
  const namespace = relative(
    dirname(generatedPath),
    join(root, `src/${needsServices ? "services" : "compiler"}/_namespaces/ts.js`),
  );
  const importPattern = /^import \* as ts from "\.\.\/_namespaces\/ts\.js";/m;
  if (!importPattern.test(original)) throw new Error("Upstream namespace import changed");
  // Redirect the harness-wide namespace to the original APIs under test.
  // Parser suites also use language-service source files and snapshots.
  // All original declarations and assertions remain unchanged.
  let transformed = original.replace(importPattern, `import * as ts from ${JSON.stringify(`./${namespace}`)};`);
  if (name === "jsonParserRecovery") {
    const harnessPattern = /^import \* as Harness from "\.\.\/_namespaces\/Harness\.js";/m;
    if (!harnessPattern.test(transformed)) throw new Error("Upstream Harness import changed");
    // Use the original baseline/diagnostic implementation namespace, not the
    // testRunner barrel whose side effect starts a second complete test run.
    const harness = relative(dirname(generatedPath), join(root, "src/harness/_namespaces/Harness.js"));
    transformed = transformed.replace(harnessPattern, `import * as Harness from ${JSON.stringify(`./${harness}`)};`);
  }
  if (name === "debugDeprecation") {
    const deprecationPattern = /^import \{ deprecate \} from "\.\.\/\.\.\/deprecatedCompat\/deprecate\.js";/m;
    if (!deprecationPattern.test(transformed)) throw new Error("Upstream deprecation import changed");
    const deprecation = relative(dirname(generatedPath), join(root, "src/deprecatedCompat/deprecate.js"));
    transformed = transformed.replace(
      deprecationPattern,
      `import { deprecate } from ${JSON.stringify(`./${deprecation}`)};`,
    );
  }
  if (name === "incrementalParser" || name === "semver") {
    const utilsPattern = /^import \* as Utils from "\.\.\/_namespaces\/Utils\.js";/m;
    if (!utilsPattern.test(transformed)) throw new Error("Upstream Utils import changed");
    const utils = relative(dirname(generatedPath), join(root, "src/testRunner/_namespaces/Utils.js"));
    transformed = transformed.replace(utilsPattern, `import * as Utils from ${JSON.stringify(`./${utils}`)};`);
  }
  return { transformed, needsServices };
}

export async function runSourceUnitFile(name) {
  if (!Object.hasOwn(FILES, name)) throw new Error(`Unsupported source unit file: ${name}`);
  const suite = setupTypescriptUpstreamSuite();
  const originalPath = join(suite.root, "src/testRunner/unittests", `${name}.ts`);
  const generatedPath = resolve(HERE, "../../.typescript-upstream-suite-generated/source-modules", `${name}.ts`);
  mkdirSync(dirname(generatedPath), { recursive: true });
  const { transformed, needsServices } = redirectSourceUnitImports(
    name,
    readFileSync(originalPath, "utf8"),
    suite.root,
    generatedPath,
  );
  const augmentation = typescriptHarnessAugmentation(
    readFileSync(join(suite.root, "src/harness/harnessGlobals.ts"), "utf8"),
  );
  const testBody = TYPESCRIPT_STANDALONE_TEST_EXPORTS.replace("runStandaloneUpstreamTest", "runSourceUnitTestBody");
  // Preserve the measured compiler-only bootstrap; service tests also call
  // assert itself, in addition to its methods and the upstream augmentation.
  let assertionBootstrap =
    needsServices || name === "semver" ? TYPESCRIPT_SOURCE_ASSERT : "const assert = __qunitAssert;";
  if (name === "incrementalParser" || name === "semver") assertionBootstrap += "\nglobalThis.assert = assert;";
  if (name === "semver") assertionBootstrap += "\nglobalThis.it = it; globalThis.describe = describe;";
  const virtualHarness = sourceUnitVirtualHarness(name, suite.root, generatedPath);
  for (const [path, contents] of virtualHarness.modules) writeFileSync(path, contents);
  const source = `${virtualHarness.importSource}${UPSTREAM_TEST_SHIM}\n${assertionBootstrap}\n${augmentation}\n${transformed}\n${UPSTREAM_TEST_EXPORTS}\n${testBody}\n${SOURCE_UNIT_DIAGNOSTIC_EXPORTS}`;
  // Upstream's cyclic namespace graph relies on bundled initialization and
  // const-enum folding. Use the same source for the native reference, bundled
  // independently; Wasm still compiles the original source module graph.
  const nativeBundle = await build({
    stdin: { contents: source, resolveDir: dirname(generatedPath), loader: "ts" },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    // pnpm exposes transitive harness dependencies (chai/diff) here. Ordinary
    // upstream/root node_modules resolution still runs first; no stubs are used.
    nodePaths: [resolve(HERE, "../../node_modules/.pnpm/node_modules")],
    banner: {
      js: SOURCE_UNIT_NATIVE_BANNER,
    },
  });
  const result = await compileAndRunUpstreamModule({
    generatedPath,
    source,
    nativeSource: nativeBundle.outputFiles[0].text,
    timeoutMs: 1_200_000,
    workerEnv: {
      DOGFOOD_TARGET: "standalone",
      DOGFOOD_CONSUMER_DRIVEN_BARRELS: "1",
      DOGFOOD_SOURCE_DIAG: "1",
      DOGFOOD_PLATFORM: undefined,
      DOGFOOD_NODE_HOST_DEPS: undefined,
      DOGFOOD_INSTALL_JSDOM: undefined,
    },
  });
  return { file: suite.relativePath(originalPath), pin: suite.pin.commit, expectedTests: FILES[name], ...result };
}

export function sourceUnitFileSucceeded(result) {
  const name = result?.file?.match(/^src\/testRunner\/unittests\/(.+)\.ts$/)?.[1];
  const expected = Object.hasOwn(FILES, name) ? FILES[name] : undefined;
  if (!expected || result.expectedTests !== expected) return false;
  const passes = (run) =>
    !run?.fatal &&
    run?.count === expected &&
    Array.isArray(run.statuses) &&
    run.statuses.length === expected &&
    run.statuses.every((status) => status === true);
  const compilation = result.compile;
  return (
    passes(result.native) &&
    passes(result.wasm) &&
    compilation?.success === true &&
    compilation.validates === true &&
    compilation.requestedTarget === "standalone" &&
    compilation.actualTarget === "standalone" &&
    compilation.targetMatches === true &&
    compilation.importPolicyMatches === true &&
    Array.isArray(compilation.moduleImports) &&
    compilation.moduleImports.length === 0 &&
    Array.isArray(compilation.linkedModuleImports) &&
    compilation.linkedModuleImports.every((module) => Array.isArray(module.imports) && module.imports.length === 0)
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  // Guest callbacks must not turn an unfinished run into an implicit exit 0.
  process.exitCode = 1;
  const name = process.argv[2] ?? "factory";
  if (name === "--inventory") {
    const suite = setupTypescriptUpstreamSuite();
    console.log(JSON.stringify({ pin: suite.pin.commit, ...sourceUnitInventory(suite.root) }));
    process.exitCode = 0; // Inventory completion is not test-suite success.
  } else {
    const result = await runSourceUnitFile(name);
    writeUpstreamReport(join(HERE, "report", `typescript-source-unit-${name}.json`), result);
    console.log(JSON.stringify(result));
    process.exitCode = sourceUnitFileSucceeded(result) ? 0 : 1;
  }
}
