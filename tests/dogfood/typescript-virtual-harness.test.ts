// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
// @ts-expect-error — .mjs dogfood helpers have no declaration files
import { sourceUnitVirtualHarness } from "./typescript-virtual-harness.mjs";

it("does not inject filesystem support into unrelated unit files", () => {
  expect(sourceUnitVirtualHarness("factory", "/missing", "/generated/factory.ts")).toEqual({
    modules: [],
    importSource: "",
  });
});

it("requires all pinned JSON references and initializes the System before the cyclic harness", () => {
  const root = mkdtempSync(join(tmpdir(), "ts5-virtual-harness-"));
  try {
    const references = join(root, "tests/baselines/reference/jsonParserRecovery");
    mkdirSync(references, { recursive: true });
    const entry = join(root, "generated/jsonParserRecovery.ts");
    expect(() => sourceUnitVirtualHarness("jsonParserRecovery", root, entry)).toThrow();
    const names = [
      "JSX.errors.txt",
      "Two_comma-separated_objects.errors.txt",
      "Two_objects.errors.txt",
      "TypeScript_code.errors.txt",
      "trailing_identifier.errors.txt",
    ];
    for (const name of names) writeFileSync(join(references, name), `reference ${name}\r\n`);
    const plan = sourceUnitVirtualHarness("jsonParserRecovery", root, entry);
    expect(plan.importSource).toBe('import "./json-harness-init.js";\n');
    expect(plan.modules).toHaveLength(2);
    const [prelude, bootstrap] = plan.modules.map((module: string[]) => module[1]);
    const imports = ts
      .createSourceFile("init.ts", bootstrap, ts.ScriptTarget.Latest)
      .statements.filter(ts.isImportDeclaration)
      .map((statement) => (statement.moduleSpecifier as ts.StringLiteral).text);
    expect(imports[0]).toBe("./json-harness-prelude.js");
    expect(imports[1]).toContain("harness/_namespaces/Harness.js");
    expect(bootstrap).toContain("new fakes.System");
    expect(bootstrap).toContain("new vfs.FileSystem");
    expect(bootstrap).not.toContain("Baseline.runBaseline");
    for (const name of names) {
      expect(bootstrap).toContain(JSON.stringify(`reference ${name}\r\n`));
      expect(readFileSync(join(references, name), "utf8")).toBe(`reference ${name}\r\n`);
    }
    const upstream: { sys?: { getAccessibleFileSystemEntries(path: string): unknown }; setSys(value: unknown): void } =
      {
        setSys(value) {
          this.sys = value as typeof this.sys;
        },
      };
    const findUpRoot = { cached: "" };
    const exports: { installSystem?: (value: unknown) => void } = {};
    runInNewContext(ts.transpileModule(prelude, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
      exports,
      require: (path: string) => (path.includes("findUpDir") ? { findUpRoot } : upstream),
    });
    expect(findUpRoot.cached).toBe("/typescript");
    const earlyRead = upstream.sys!.getAccessibleFileSystemEntries;
    expect(() => earlyRead("/")).toThrow("System used before initialization");
    const system = { getAccessibleFileSystemEntries: (path: string) => [path] };
    exports.installSystem!(system);
    expect(upstream.sys).toBe(system);
    expect(earlyRead("/typescript")).toEqual(["/typescript"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
