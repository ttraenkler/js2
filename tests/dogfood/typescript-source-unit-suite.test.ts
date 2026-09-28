// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";
import { build as bundle } from "esbuild";
import ts from "typescript";
import { compile } from "../../src/index.js";
// @ts-expect-error — .mjs dogfood helpers have no declaration files
import { UPSTREAM_TEST_SHIM } from "./upstream-suite-runner.mjs";
// @ts-expect-error — .mjs dogfood helpers have no declaration files
import {
  SOURCE_UNIT_DIAGNOSTIC_EXPORTS,
  SOURCE_UNIT_NATIVE_BANNER,
  sourceUnitFileSucceeded,
  redirectSourceUnitImports,
  sourceUnitInventory,
  sourceUnitHarnessBootstrap,
} from "./typescript-source-unit-suite.mjs";
// @ts-expect-error — .mjs dogfood helpers have no declaration files
import { readStandaloneGuestError } from "./upstream-suite-worker-protocol.mjs";

function passingResult() {
  return {
    file: "src/testRunner/unittests/factory.ts",
    expectedTests: 3,
    native: { count: 3, statuses: [true, true, true] },
    wasm: { count: 3, statuses: [true, true, true] },
    compile: {
      success: true,
      validates: true,
      requestedTarget: "standalone",
      actualTarget: "standalone",
      targetMatches: true,
      importPolicyMatches: true,
      moduleImports: [] as unknown[],
      linkedModuleImports: [] as { imports: unknown[] }[],
    },
  };
}

it("accepts a complete zero-import source unit result", () => {
  expect(sourceUnitFileSucceeded(passingResult())).toBe(true);
});

it("keeps native loader bindings separate from bundled upstream names", async () => {
  const root = mkdtempSync(join(tmpdir(), "ts5-native-banner-"));
  try {
    const built = await bundle({
      stdin: {
        contents:
          'export const dirname = () => "guest"; export const createRequire = "guest"; export const fileURLToPath = "guest"; export const actualDirectory = __dirname;',
        loader: "ts",
      },
      bundle: true,
      platform: "node",
      format: "esm",
      write: false,
      banner: { js: SOURCE_UNIT_NATIVE_BANNER },
    });
    const source = ts.transpileModule(built.outputFiles[0].text, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
    }).outputText;
    const path = join(root, "native.mjs");
    writeFileSync(path, source);
    const loaded = await import(/* @vite-ignore */ pathToFileURL(path).href);
    expect(loaded.actualDirectory).toBe(realpathSync(root));
    expect(loaded.dirname()).toBe("guest");
    expect(loaded.createRequire).toBe("guest");
    expect(loaded.fileURLToPath).toBe("guest");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

it("executes the deprecation throws matcher with a failing positive-control assertion in standalone Wasm", async () => {
  const result = await compile(
    `${UPSTREAM_TEST_SHIM}
    export function run(): number {
      expect(() => { throw new TypeError("deprecated"); }).throws();
      let rejected = 0;
      try { expect(() => {}).throws(); } catch { rejected++; }
      try { expect(() => { throw new Error("other"); }).throws("deprecated"); } catch { rejected++; }
      return rejected;
    }`,
    { target: "standalone", skipSemanticDiagnostics: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(2);
}, 60_000);

it.each([
  ["compilerCore", 11],
  ["base64", 1],
  ["comments", 3],
  ["parsePseudoBigInt", 5],
  ["paths", 14],
  ["asserts", 2],
  ["regExpScannerRecovery", 984],
  ["incrementalParser", 153],
  ["semver", 692],
  ["debugDeprecation", 6],
  ["jsonParserRecovery", 5],
] as const)("requires all original %s callbacks for full-source coverage", (name, count) => {
  const result = passingResult();
  result.file = `src/testRunner/unittests/${name}.ts`;
  result.expectedTests = count;
  for (const lane of ["native", "wasm"] as const) {
    result[lane].count = count;
    result[lane].statuses = Array(count).fill(true);
  }
  expect(sourceUnitFileSucceeded(result)).toBe(true);
  result.wasm.statuses.pop();
  expect(sourceUnitFileSucceeded(result)).toBe(false);
  result.wasm.count = count - 1;
  expect(sourceUnitFileSucceeded(result)).toBe(false);
});

it("preserves deprecation callbacks, hooks and assertions while redirecting original dependencies", () => {
  const imports =
    'import { deprecate } from "../../deprecatedCompat/deprecate.js";\r\nimport * as ts from "../_namespaces/ts.js";';
  const body =
    '\r\nbeforeEach(() => { previous = ts.Debug.loggingHost; });\r\nafterEach(() => { ts.Debug.loggingHost = previous; });\r\nit("warning", () => { const fn = deprecate(ts.noop); fn(); assert.isTrue(logWritten); });';
  const result = redirectSourceUnitImports("debugDeprecation", imports + body, "/suite", "/generated/unit.ts");
  expect(result.needsServices).toBe(false);
  expect(result.transformed).toBe(
    'import { deprecate } from "./../suite/src/deprecatedCompat/deprecate.js";\r\nimport * as ts from "./../suite/src/compiler/_namespaces/ts.js";' +
      body,
  );
  expect(() =>
    redirectSourceUnitImports(
      "debugDeprecation",
      imports.replace("deprecate.js", "other.js") + body,
      "/suite",
      "/generated/unit.ts",
    ),
  ).toThrow("Upstream deprecation import changed");
});

it("redirects incremental parser imports without replacing original tree checks", () => {
  const body =
    "\r\nUtils.assertInvariants(tree);\r\nUtils.assertStructuralEquals(left, right);\r\nassert.deepEqual(left.commentDirectives, right.commentDirectives);";
  const imports = 'import * as ts from "../_namespaces/ts.js";\r\nimport * as Utils from "../_namespaces/Utils.js";';
  const result = redirectSourceUnitImports("incrementalParser", imports + body, "/suite", "/generated/unit.ts");
  expect(result.needsServices).toBe(true);
  expect(result.transformed).toBe(
    'import * as ts from "./../suite/src/services/_namespaces/ts.js";\r\nimport * as Utils from "./../suite/src/testRunner/_namespaces/Utils.js";' +
      body,
  );
  expect(() =>
    redirectSourceUnitImports(
      "incrementalParser",
      imports.replace("Utils.js", "Other.js") + body,
      "/suite",
      "/generated/unit.ts",
    ),
  ).toThrow("Upstream Utils import changed");
  expect(() => redirectSourceUnitImports("incrementalParser", body, "/suite", "/generated/unit.ts")).toThrow(
    "Upstream namespace import changed",
  );
});

it("preserves semver theory callbacks and original assertions while redirecting imports", () => {
  const body =
    "\r\nUtils.theory(data, test);\r\nassert.strictEqual(ts.VersionRange.tryParse(input)!.test(version), expected);";
  const imports = 'import * as ts from "../_namespaces/ts.js";\r\nimport * as Utils from "../_namespaces/Utils.js";';
  const result = redirectSourceUnitImports("semver", imports + body, "/suite", "/generated/unit.ts");
  expect(result.needsServices).toBe(false);
  expect(result.transformed).toBe(
    'import * as ts from "./../suite/src/compiler/_namespaces/ts.js";\r\nimport * as Utils from "./../suite/src/testRunner/_namespaces/Utils.js";' +
      body,
  );
  expect(() =>
    redirectSourceUnitImports("semver", imports.replace("Utils.js", "Other.js") + body, "/suite", "/generated/unit.ts"),
  ).toThrow("Upstream Utils import changed");
});

it("rejects empty, partial, failed and unknown-file results", () => {
  expect(sourceUnitFileSucceeded(undefined)).toBe(false);
  for (const lane of ["native", "wasm"] as const) {
    const result = passingResult();
    result[lane].statuses.pop();
    expect(sourceUnitFileSucceeded(result)).toBe(false);
    result[lane].statuses.push(false);
    expect(sourceUnitFileSucceeded(result)).toBe(false);
  }
  const result = passingResult();
  result.file = "unknown.ts";
  expect(sourceUnitFileSucceeded(result)).toBe(false);
  result.file = "src/testRunner/unittests/helpers/factory.ts";
  expect(sourceUnitFileSucceeded(result)).toBe(false);
});

it("preserves JSON recovery baseline assertions and original harness implementations", () => {
  const body =
    '\r\nit("recovery", () => { const file = ts.parseJsonText("bad", "{} blah"); assert(file.parseDiagnostics.length); Harness.Baseline.runBaseline("bad.errors.txt", Harness.Compiler.getErrorBaseline([], file.parseDiagnostics)); file.getChildren(); });';
  const source =
    'import * as Harness from "../_namespaces/Harness.js";\r\nimport * as ts from "../_namespaces/ts.js";' + body;
  const result = redirectSourceUnitImports("jsonParserRecovery", source, "/suite", "/generated/unit.ts");
  expect(result.needsServices).toBe(true);
  expect(result.transformed).toBe(
    'import * as Harness from "./../suite/src/harness/_namespaces/Harness.js";\r\nimport * as ts from "./../suite/src/services/_namespaces/ts.js";' +
      body,
  );
  expect(() =>
    redirectSourceUnitImports(
      "jsonParserRecovery",
      source.replace("Harness.js", "Other.js"),
      "/suite",
      "/generated/unit.ts",
    ),
  ).toThrow("Upstream Harness import changed");
});

it("reads pinned reference baselines without redirecting or replacing output operations", () => {
  const reads: string[] = [];
  const original = {
    fileExists: (path: string) => {
      reads.push(path);
      return path === "/suite/tests/baselines/reference/a.txt";
    },
    readFile: (path: string) => {
      reads.push(path);
      return path === "/suite/tests/baselines/reference/a.txt" ? "original baseline" : undefined;
    },
    writeFile: () => {},
    deleteFile: () => {},
  };
  const Harness = {
    IO: original,
    setHarnessIO(io: typeof original) {
      this.IO = io;
    },
  };
  const source = ts.transpileModule(sourceUnitHarnessBootstrap("jsonParserRecovery", "/suite"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(source, { Harness });
  expect(Harness.IO.fileExists("tests/baselines/reference/a.txt")).toBe(true);
  expect(Harness.IO.readFile("tests/baselines/reference/a.txt")).toBe("original baseline");
  expect(Harness.IO.fileExists("tests/baselines/local/a.txt")).toBe(false);
  expect(Harness.IO.readFile("/absolute/other.txt")).toBeUndefined();
  expect(reads).toEqual([
    "/suite/tests/baselines/reference/a.txt",
    "/suite/tests/baselines/reference/a.txt",
    "tests/baselines/local/a.txt",
    "/absolute/other.txt",
  ]);
  expect(Harness.IO.writeFile).toBe(original.writeFile);
  expect(Harness.IO.deleteFile).toBe(original.deleteFile);
  expect(sourceUnitHarnessBootstrap("factory", "/suite")).toBe("");
});

it("inventories nested unsupported files without counting them as tested callbacks", () => {
  const root = mkdtempSync(join(tmpdir(), "ts5-source-inventory-"));
  try {
    const units = join(root, "src/testRunner/unittests");
    mkdirSync(join(units, "helpers"), { recursive: true });
    const names = [
      "factory",
      "diagnosticCollection",
      "compilerCore",
      "base64",
      "comments",
      "parsePseudoBigInt",
      "paths",
      "asserts",
      "regExpScannerRecovery",
      "incrementalParser",
      "semver",
      "debugDeprecation",
      "jsonParserRecovery",
    ];
    for (const name of names) writeFileSync(join(units, `${name}.ts`), "");
    const manifestPath = join(root, "src/testRunner/tests.ts");
    const manifest = names.map((name) => `export * from "./unittests/${name}.js";`).join("\n");
    writeFileSync(manifestPath, manifest);
    writeFileSync(join(units, "helpers/factory.ts"), "");
    writeFileSync(join(units, "constructor.ts"), "");
    const inventory = sourceUnitInventory(root);
    expect(inventory.sourceFiles).toBe(15);
    expect(inventory.entryFiles).toBe(13);
    expect(inventory.supportFiles).toBe(2);
    expect(inventory.runnableFiles).toBe(13);
    expect(inventory.files.find((file: { name: string }) => file.name === "factory")).toEqual({
      name: "factory",
      entry: true,
      expectedTests: 3,
      runnable: true,
    });
    for (const name of ["helpers/factory", "constructor"]) {
      expect(inventory.files.find((file: { name: string }) => file.name === name)).toEqual({
        name,
        entry: false,
        expectedTests: null,
        runnable: false,
      });
    }
    rmSync(join(units, "factory.ts"));
    expect(() => sourceUnitInventory(root)).toThrow("Upstream test entry is missing: factory");
    writeFileSync(join(units, "factory.ts"), "");
    writeFileSync(manifestPath, manifest + '\nexport * from "./unittests/factory.js";');
    expect(() => sourceUnitInventory(root)).toThrow("Duplicate upstream test entry: factory");
    writeFileSync(manifestPath, "");
    expect(() => sourceUnitInventory(root)).toThrow("Upstream test-entry manifest is empty");
    writeFileSync(manifestPath, 'export * from "./unittests/../outside.js";');
    expect(() => sourceUnitInventory(root)).toThrow("unexpected path");
    writeFileSync(manifestPath, 'import "./unittests/factory.js";');
    expect(() => sourceUnitInventory(root)).toThrow("manifest shape changed");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

it("requires validation and actual zero-import standalone provenance", () => {
  for (const key of ["success", "validates", "targetMatches", "importPolicyMatches"] as const) {
    const result = passingResult();
    result.compile[key] = false;
    expect(sourceUnitFileSucceeded(result)).toBe(false);
  }
  const result = passingResult();
  result.compile.actualTarget = "gc";
  expect(sourceUnitFileSucceeded(result)).toBe(false);
  result.compile.actualTarget = "standalone";
  result.compile.moduleImports.push({ module: "env", name: "host" });
  expect(sourceUnitFileSucceeded(result)).toBe(false);
  result.compile.moduleImports = [];
  result.compile.linkedModuleImports.push({ imports: [{}] });
  expect(sourceUnitFileSucceeded(result)).toBe(false);
});

it("reads bounded guest error text through numeric exports only", () => {
  const text = "TypeError: sentinel π";
  expect(
    readStandaloneGuestError({
      upstreamStandaloneErrorLength: () => text.length,
      upstreamStandaloneErrorCodeUnit: (index: number) => text.charCodeAt(index),
    }),
  ).toBe(text);
  expect(readStandaloneGuestError({})).toBe("");
  for (const length of [NaN, -1, 0, 16_385]) {
    expect(
      readStandaloneGuestError({
        upstreamStandaloneErrorLength: () => length,
        upstreamStandaloneErrorCodeUnit: () => {
          throw new Error("must not read");
        },
      }),
    ).toBe("");
  }
});

it("preserves a thrown standalone callback while exposing its guest message", async () => {
  const result = await compile(
    `function runSourceUnitTestBody(index: number): number { throw new Error("source-unit sentinel"); }\n${SOURCE_UNIT_DIAGNOSTIC_EXPORTS}`,
    { target: "standalone" },
  );
  expect(result.success, result.errors.map((error) => error.message).join("\n")).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const instance = new WebAssembly.Instance(module, {});
  let threw = false;
  try {
    (instance.exports.runStandaloneUpstreamTest as (index: number) => number)(0);
  } catch {
    threw = true;
  }
  expect(threw).toBe(true);
  expect(readStandaloneGuestError(instance.exports)).toBe("source-unit sentinel");
});
