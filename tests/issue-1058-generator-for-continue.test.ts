// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import { analyzeSource } from "../src/checker/index.js";
import { createCodegenContext } from "../src/codegen/context/create-context.js";
import { isNativeGeneratorCandidate } from "../src/codegen/generators-native.js";
import { createEmptyModule } from "../src/ir/types.js";
import { ts } from "../src/ts-api.js";

for (const experimentalIR of [false, true]) {
  for (const nested of [false, true]) {
    it(`runs the owning for-loop update after continue (IR=${experimentalIR}, nested=${nested})`, async () => {
      const source = nested
        ? `
        export function run() { let updates = 0, visits = 0;
          function* g() { for (let i = 0; i < 3; i++, updates++) {
            for (let j = 0; j < 3; j++) { if (j === 1) continue; visits++; }
            if (i === 1) continue;
            yield i;
          } }
          let sum = 0; for (const value of g()) sum += value;
          return sum + updates * 10 + visits * 100;
        }
      `
        : `
        export function run() { let updates = 0, tail = 0, checks = 0; const offset = 10;
          function shouldSkip(i: number) { checks++; return i === 1; }
          function* g() { for (let i = 0; i < 4; i++, updates++) {
            if (shouldSkip(i)) continue;
            yield i + offset;
            if (i === 2) continue;
            tail++;
          } }
          const iter = g(); if (updates !== 0 || checks !== 0) return -1;
          let sequence = 0; for (const value of iter) sequence = sequence * 100 + value;
          if (checks !== 4) return -2;
          return sequence * 100 + updates * 10 + tail;
        }
      `;
      const result = await compile(source, { target: "standalone", experimentalIR });
      expect(result.success, JSON.stringify(result.errors)).toBe(true);
      const module = new WebAssembly.Module(result.binary);
      expect(WebAssembly.Module.imports(module)).toEqual([]);
      expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(nested ? 632 : 10121342);
    });
  }
}

it("preserves already-supported nested labeled loops", async () => {
  const result = await compile(
    `export function run() {
    function* g() { for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 1; j++) { inner: for (let k = 0; k < 1; k++) { continue inner; } }
      yield i;
    } }
    let result = 0; for (const value of g()) result += value + 1; return result;
  }`,
    { target: "standalone" },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(6);
});

it.each([
  "for (let i = 0; i < 3; i++) { try { if (i === 1) continue; yield i; } finally { side++; } }",
  "outer: for (let i = 0; i < 3; i++) { yield i; continue outer; }",
  "for (let i = 0; i < 3; i++) { yield i; if (i === 1) break; }",
])("does not admit an unsupported completion route: %s", (body) => {
  const ast = analyzeSource(`let side = 0; function* g() { ${body} }`);
  const declaration = ast.sourceFile.statements.find(ts.isFunctionDeclaration)!;
  const ctx = createCodegenContext(createEmptyModule(), ast.checker, { standalone: true });
  expect(isNativeGeneratorCandidate(ctx, declaration)).toBe(false);
});
