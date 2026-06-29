import { describe, it, expect } from "vitest";
import { compile } from "../src/index.js";
import { buildImports } from "../src/runtime.js";

// #2849 — a `var o = {}` expando written via computed `o[k] = …` (a for-in copy
// loop, acorn's getOptions shape) AND read/written via static `o.prop` used to
// split storage in host/gc mode: the static `.prop` widened to a `$__anon_N`
// struct slot (f64, init 0) while the computed write landed in the host WeakMap
// sidecar (__extern_set) — disjoint, so the static read returned the never-written
// 0 slot. Fixed by running markObjectHashConsumers in host mode too (the #2584
// poison-scan was standalone-gated). The poisoned var stays `$Object`, so static
// and computed access share storage.
async function run(source: string, fn: string, args: unknown[] = []): Promise<unknown> {
  const result = await compile(source);
  if (!result.success) {
    throw new Error(`Compile failed:\n${result.errors.map((e) => `  L${e.line}: ${e.message}`).join("\n")}`);
  }
  const imports = buildImports(result.imports, undefined, result.stringPool);
  const { instance } = await WebAssembly.instantiate(result.binary, imports);
  imports.setExports?.(instance.exports as Record<string, Function>);
  return (instance.exports as Record<string, (...a: unknown[]) => unknown>)[fn](...args);
}

describe("#2849 expando computed-write → static-read storage parity (host mode)", () => {
  // The acorn-shaped guarded form: `=== "latest"` / `== null` guards before the
  // numeric normalisation branch. ecmaVersion 2022 -> 13 (2022 - 2009).
  const src = `
// @ts-nocheck
var d = { ecmaVersion: null, sourceType: 0 };
export function runGuarded(ev) {
  var opts = { ecmaVersion: ev, sourceType: 1 };
  var o = {};
  for (var k in d) { o[k] = opts[k]; }
  if (o.ecmaVersion === "latest") { o.ecmaVersion = 1e8; }
  else if (o.ecmaVersion == null) { o.ecmaVersion = 11; }
  else if (o.ecmaVersion >= 2015) { o.ecmaVersion -= 2009; }
  return o.ecmaVersion;
}
export function runPlain(ev) {
  var opts = { ecmaVersion: ev, sourceType: 1 };
  var o = {};
  for (var k in d) { o[k] = opts[k]; }
  if (o.ecmaVersion < 0) { o.ecmaVersion = 1e8; }  // plain static assign, no string cmp
  if (o.ecmaVersion >= 2015) { o.ecmaVersion -= 2009; }
  return o.ecmaVersion;
}
`;

  it("guarded form (=== / ==null) reads back the copied value, not 0", async () => {
    expect(await run(src, "runGuarded", [2022])).toBe(13);
  });

  it("bare plain-assign form (no string compare) reads back the copied value, not 0", async () => {
    expect(await run(src, "runPlain", [2022])).toBe(13);
  });

  it("ecmaVersion 2025 stays >= 16 after normalisation (attributes gate)", async () => {
    // 2025 - 2009 = 16, which is >= 16 (import-attributes enabled). Confirms the
    // normalised value flows correctly, not just that 2022 lands below the gate.
    expect(await run(src, "runGuarded", [2025])).toBe(16);
  });
});
