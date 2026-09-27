// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import { analyzeSource } from "../src/checker/index.js";
import { TsCheckerOracle } from "../src/checker/oracle.js";
import { iifeMayReturnAssertedUndefined } from "../src/ir/analysis/asserted-iife-result.js";
import { ts } from "../src/ts-api.js";
import { readsUndefinedHoldingVariable } from "../src/codegen/undefined-holding-variable.js";
import type { CodegenContext } from "../src/codegen/context/types.js";

it("does not classify a null-admitting consuming slot as undefined-only", () => {
  const ast = analyzeSource(`
    interface System { value: number; }
    let value: System | null = (() => { let candidate: System | undefined; return candidate!; })();
    function read() { return value; }
  `);
  const fn = ast.sourceFile.statements[2] as ts.FunctionDeclaration;
  const returned = (fn.body!.statements[0] as ts.ReturnStatement).expression!;
  expect(readsUndefinedHoldingVariable({ oracle: new TsCheckerOracle(ast.checker) } as CodegenContext, returned)).toBe(
    false,
  );
});

it.each([
  ["(() => { let x: System | undefined; return x!; })()", true],
  ["(() => { let x: System | undefined; return () => x!; })()", false],
  ["(async () => { let x: System | undefined; return x!; })()", false],
  ["(function* () { let x: System | undefined; return x!; })()", false],
  ["((flag: boolean) => { let x: System | undefined; if (flag) return null; return x!; })(false)", false],
  ["((x: unknown) => x!)(undefined)", false],
] as const)("keeps asserted-return evidence scoped to its own value: %s", (initializer, expected) => {
  const ast = analyzeSource(`interface System { value: number; } const result = ${initializer};`);
  const statement = ast.sourceFile.statements[1] as ts.VariableStatement;
  expect(
    iifeMayReturnAssertedUndefined(
      statement.declarationList.declarations[0]!.initializer!,
      new TsCheckerOracle(ast.checker),
    ),
  ).toBe(expected);
});

it.each([true, false])("preserves undefined through an asserted IIFE return IR=%s", async (experimentalIR) => {
  const result = await compile(
    `
      interface System { value: number; }
      const system: System = (() => {
        let candidate: System | undefined;
        return candidate!;
      })();
      export function run(): number { return system === undefined ? 1 : 0; }
    `,
    { target: "standalone", experimentalIR, deferTopLevelInit: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const instance = new WebAssembly.Instance(module);
  (instance.exports.__module_init as () => void)?.();
  expect((instance.exports.run as () => number)()).toBe(1);
});

it.each([true, false])("keeps present object identity beside an absent IIFE result IR=%s", async (experimentalIR) => {
  const result = await compile(
    `
      interface System { value: number; }
      const original: System = { value: 7 };
      const absent: System = ((present: boolean) => {
        let candidate: System | undefined;
        if (present) candidate = original;
        return candidate!;
      })(false);
      const present: System = ((enabled: boolean) => {
        let candidate: System | undefined;
        if (enabled) candidate = original;
        return candidate!;
      })(true);
      export function run(): number {
        return absent === undefined && absent !== null && present === original
          && present !== undefined && present.value === 7 ? 1 : 0;
      }
    `,
    { target: "standalone", experimentalIR, deferTopLevelInit: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const instance = new WebAssembly.Instance(module);
  (instance.exports.__module_init as () => void)?.();
  expect((instance.exports.run as () => number)()).toBe(1);
});
