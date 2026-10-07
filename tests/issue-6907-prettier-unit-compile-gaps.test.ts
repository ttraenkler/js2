// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
//
// #6907 — the compiler gaps that kept four of prettier's upstream unit files
// (get-parser-plugin-by-parser-name, get-printer-plugin-by-ast-format,
// massage-ast, resolve-parser) from compiling or initializing on the JS-host
// lane. Each case is the reduced two-file (or one-file) untyped JS shape, and
// each asserts the value Node produces for the same source.
//
//   1. async: an awaited try/catch nested inside a CATCH block
//      (prettier `readBunPackageJson`) — refused with "async shape not
//      supported" before; now driven by the CFG machine.
//   2. concise arrow returning an array literal whose closure result is a
//      typed vec — invalid Wasm before (`expected (ref null $vec_struct)`).
//   3. callable receiver with an expando method (`test.each = fn`) — was
//      cast to an unrelated class that defines a same-named method.
//   4. `findLast` / `findLastIndex` on an `any` array — was bound to
//      `Uint8ClampedArray_findLast` and answered undefined.
//   5. a module reached only through a JSDoc `@import` must NOT run its
//      top-level code (Node never loads it).
//
// Anti-vacuity: case 5 carries a control where the same module IS imported
// by value through another file and must still run exactly once.

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { compileProject } from "../src/index.js";
import { buildCompiledImports } from "../src/runtime.js";

const roots: string[] = [];
afterAll(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

async function runProject(files: Record<string, string>): Promise<unknown> {
  const root = mkdtempSync(join(tmpdir(), "js2-6907-"));
  roots.push(root);
  for (const [name, source] of Object.entries(files)) writeFileSync(join(root, name), source);
  const result = await compileProject(join(root, "main.js"), {
    allowJs: true,
    skipSemanticDiagnostics: true,
    target: "gc",
    deferTopLevelInit: true,
  });
  const errors = result.errors.filter((error) => error.severity === "error").map((error) => error.message);
  expect(result.success, errors.join("\n")).toBe(true);
  const imports = buildCompiledImports(result, {}, { dynamicCode: "hostEval" }) as Record<string, any>;
  const { instance } = await WebAssembly.instantiate(result.binary, imports);
  imports.setInstance?.(instance);
  imports.__setInstance?.(instance);
  (instance.exports as Record<string, () => unknown>).__module_init?.();
  return await (instance.exports as Record<string, () => unknown>).run!();
}

describe("#6907 prettier unit-suite compile gaps (JS host)", () => {
  it("drives an awaited try/catch nested inside a catch block", async () => {
    const out = await runProject({
      "main.js": `async function primary(x) {
  if (x === "bad" || x === "both") throw new Error("primary:" + x);
  return "p:" + x;
}
async function fallback(x) {
  if (x === "both") throw new Error("fallback:" + x);
  return "f:" + x;
}
async function viaFallback(x) {
  try {
    return await primary(x);
  } catch (error) {
    try {
      return await fallback(x);
    } catch {
      // ignore
    }
    throw error;
  }
}
async function keepsCatchParam(x) {
  let log = "";
  try {
    const a = await primary(x);
    log += a;
  } catch (outer) {
    try {
      const b = await fallback(x);
      log += "[" + b + "]";
    } catch (inner) {
      log += "{" + inner.message + "}";
    }
    log += "<" + outer.message + ">";
  }
  return log;
}
async function settle(p) {
  try {
    const v = await p;
    return "ok " + v;
  } catch (e) {
    return "err " + e.message;
  }
}
export async function run() {
  const out = [];
  out.push(await settle(viaFallback("ok")));
  out.push(await settle(viaFallback("bad")));
  out.push(await settle(viaFallback("both")));
  out.push(await settle(keepsCatchParam("bad")));
  out.push(await settle(keepsCatchParam("both")));
  return out.join(";");
}`,
    });
    expect(out).toBe("ok p:ok;ok f:bad;err primary:both;ok [f:bad]<primary:bad>;ok {fallback:both}<primary:both>");
  });

  it("compiles a concise arrow that returns a typed array literal", async () => {
    const out = await runProject({
      "main.js": `function createPlugin(name) { return { name }; }
export function run() {
  const f = (name) => [{ name: "x" }, createPlugin(name)];
  const a = f("a");
  return a.length + ":" + a[0].name + ":" + a[1].name;
}`,
    });
    expect(out).toBe("2:x:a");
  });

  it("keeps a callable receiver's expando method off a same-named class method", async () => {
    const out = await runProject({
      "main.js": `export class AstPath {
  constructor() { this.stack = [1]; }
  each(callback, ...names) { callback(this); }
}
function test(name, body) { return name; }
function myEach(cases) {
  return function (name, body) { return name + ":" + cases.length; };
}
test.each = myEach;
export function run() {
  const r = test.each([{ a: 1 }, { a: 2 }])("t", () => {});
  new AstPath().each(() => {});
  return r;
}`,
    });
    expect(out).toBe("t:2");
  });

  it("dispatches findLast / findLastIndex on an any-typed array across modules", async () => {
    const out = await runProject({
      "pp.js": `export function find(plugins, parserName) {
  const plugin = plugins.findLast((plugin) => plugin.parsers && Object.hasOwn(plugin.parsers, parserName));
  const index = plugins.findLastIndex((plugin) => plugin.parsers && Object.hasOwn(plugin.parsers, parserName));
  return (plugin ? plugin.parsers[parserName].id : "missing") + "@" + index;
}`,
      "main.js": `import { find } from "./pp.js";
function mk(name, id) { return { parsers: { [name]: { id } } }; }
export function run() {
  const plugins = [{ name: "x" }, mk("p", "first"), mk("p", "last"), mk("q", "other")];
  return find(plugins, "p") + "|" + find(plugins, "zz");
}`,
    });
    expect(out).toBe("last@2|missing@-1");
  });

  it("does not evaluate a module reached only through a JSDoc @import", async () => {
    const out = await runProject({
      "side.js": `globalThis.__js2_6907_side = (globalThis.__js2_6907_side || 0) + 1;
export const X = 1;`,
      "main.js": `/** @import {X} from "./side.js" */
export function run() {
  const seen = String(globalThis.__js2_6907_side);
  delete globalThis.__js2_6907_side;
  return "side:" + seen;
}`,
    });
    expect(out).toBe("side:undefined");
  });

  it("control: the same module still runs once when another file imports it by value", async () => {
    const out = await runProject({
      "side.js": `globalThis.__js2_6907_side2 = (globalThis.__js2_6907_side2 || 0) + 1;
export const X = 1;`,
      "mid.js": `import { X } from "./side.js";
export const Y = X + 1;`,
      "main.js": `/** @import {X} from "./side.js" */
import { Y } from "./mid.js";
export function run() {
  const seen = String(globalThis.__js2_6907_side2);
  delete globalThis.__js2_6907_side2;
  return "side:" + seen + ":" + Y;
}`,
    });
    expect(out).toBe("side:1:2");
  });
});
