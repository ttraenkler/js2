// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
// Original upstream unit callbacks against complete source modules, not projections.
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { setupTypescriptUpstreamSuite } from "./setup-typescript-upstream-suite.mjs";
import { typescriptHarnessAugmentation } from "./typescript-harness-augmentation.mjs";
import { TYPESCRIPT_SOURCE_ASSERT } from "./typescript-source-assert.mjs";
import { TYPESCRIPT_STANDALONE_TEST_EXPORTS } from "./typescript-upstream-suite.mjs";
import {
  UPSTREAM_TEST_EXPORTS,
  UPSTREAM_TEST_SHIM,
  compileAndRunUpstreamModule,
  writeUpstreamReport,
} from "./upstream-suite-runner.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
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
};

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
  const needsServices = name === "regExpScannerRecovery" || name === "incrementalParser";
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
  const source = `${UPSTREAM_TEST_SHIM}\n${assertionBootstrap}\n${augmentation}\n${transformed}\n${UPSTREAM_TEST_EXPORTS}\n${testBody}\n${SOURCE_UNIT_DIAGNOSTIC_EXPORTS}`;
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
      js: 'import { createRequire } from "node:module"; import { fileURLToPath } from "node:url"; import { dirname } from "node:path"; const require = createRequire(import.meta.url); const __filename = fileURLToPath(import.meta.url); const __dirname = dirname(__filename);',
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
  const expected = FILES[result?.file?.split("/").pop()?.replace(/\.ts$/, "")];
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
  const result = await runSourceUnitFile(name);
  writeUpstreamReport(join(HERE, "report", `typescript-source-unit-${name}.json`), result);
  console.log(JSON.stringify(result));
  process.exitCode = sourceUnitFileSucceeded(result) ? 0 : 1;
}
