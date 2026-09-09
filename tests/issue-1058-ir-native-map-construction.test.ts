// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile, compileMulti } from "../src/index.js";
import { ts } from "../src/ts-api.js";
import { isEmptyAmbientMapConstruction } from "../src/ir/native-map-construction.js";

it.each(["new Map()", "new Map<number, number>()"])(
  "constructs %s in an IR function without host imports",
  async (construction) => {
    const result = await compile(
      `export function run(): number { const cache = ${construction}; if (cache) return 42; return 0; }`,
      { target: "standalone", experimentalIR: true, trackIrOutcomes: true },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    expect(
      result.irOutcomes?.find((row) => row.displayName === "run"),
      JSON.stringify(result.irOutcomes),
    ).toMatchObject({ irBodyEmitted: true, legacyBodyEmitted: false });
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    expect((new WebAssembly.Instance(module, {}).exports.run as () => number)()).toBe(42);
  },
);

function expression(source: string): ts.NewExpression {
  const sf = ts.createSourceFile("map.ts", source, ts.ScriptTarget.Latest, true);
  return (sf.statements[0] as ts.ExpressionStatement).expression as ts.NewExpression;
}

it("retains ambient Map identity during multi-source IR preselection", async () => {
  const result = await compileMulti(
    {
      "/entry.ts": `import "./other.js"; export function makeCache(): number { const cache = new Map(); if (cache) return 42; return 0; }`,
      "/other.ts": `export const unrelated = 1;`,
    },
    "/entry.ts",
    { target: "standalone", experimentalIR: true, trackIrOutcomes: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  expect(
    result.irOutcomes?.find((row) => row.displayName === "makeCache"),
    JSON.stringify(result.irOutcomes),
  ).toMatchObject({
    irBodyEmitted: true,
    // The current multi-source driver builds the direct body before applying
    // the IR overlay. This test proves the final IR body, not IR-first routing.
    legacyBodyEmitted: true,
    r2Withdrawal: { stage: "not-attempted", reason: "multi-source-driver" },
  });
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module, {}).exports.makeCache as () => number)()).toBe(42);
});

it("requires positive ambient identity rather than a missing resolver", () => {
  const node = expression("new Map()");
  expect(isEmptyAmbientMapConstruction(node, undefined)).toBe(false);
  expect(isEmptyAmbientMapConstruction(node, () => false)).toBe(false);
  expect(isEmptyAmbientMapConstruction(node, (identifier) => identifier === node.expression)).toBe(true);
});

it("does not treat an imported class named Map as the ambient constructor", async () => {
  const result = await compileMulti(
    {
      "/entry.ts": `import { Map } from "./map.js"; export function run(): number { return new Map().value; }`,
      "/map.ts": `export class Map { value: number = 7; }`,
    },
    "/entry.ts",
    { target: "standalone", experimentalIR: true, emitWat: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  expect(result.wat).not.toContain("__ir_map_new");
  // Multi-source initialization may already retain native Map helpers; the
  // imported class must not acquire the IR native-construction adapter.
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module, {}).exports.run as () => number)()).toBe(7);
});

it.each(["new Map([[1, 2]])", "new Map(...entries)", "new Map<number>()", "new Set()", "new ns.Map()"])(
  "does not certify unsupported construction %s",
  (source) => {
    expect(isEmptyAmbientMapConstruction(expression(source), () => true)).toBe(false);
  },
);

it("does not add a native Map allocator for a same-named local class", async () => {
  const result = await compile(
    `class Map { value: number = 7; } export function run(): number { return new Map().value; }`,
    { target: "standalone", experimentalIR: true, emitWat: true },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  expect(result.wat).not.toContain("__ir_map_new");
  expect(result.wat).not.toContain("__map_new");
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module, {}).exports.run as () => number)()).toBe(7);
});
