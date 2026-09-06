// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.

import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const FUNC_SPACE = new URL("../src/codegen/func-space.ts", import.meta.url).href;
const RESOLVE_LAYOUT = new URL("../src/emit/resolve-layout.ts", import.meta.url).href;
const TS_API = new URL("../src/ts-api.ts", import.meta.url).href;
const SOURCE_INTEGRATION = new URL("../src/codegen/multi-source-ir-integration.ts", import.meta.url).href;

function importWithFrontendBarrier(body: string) {
  const loader = `
    export async function load(url, context, next) {
      const path = decodeURIComponent(url);
      if (/\\/src\\/(?:ts-api|compiler|ir\\/(?:from-ast|async-prepare|async-linear-prepare)|codegen\\/(?:index|multi-source-ir-integration|async-ir-planning|async-linear-planning))\\.[cm]?[jt]s(?:\\?|$)|\\/node_modules\\/typescript\\//.test(path)) {
        throw new Error('blocked frontend module: ' + url);
      }
      const result = await next(url, context);
      if (/\\/src\\//.test(path)) process.stderr.write('IR_HANDLE_LOADED:' + JSON.stringify(url) + '\\n');
      return result;
    }
  `;
  const script = `
    import assert from 'node:assert/strict';
    import { register } from 'node:module';
    register(${JSON.stringify(`data:text/javascript,${encodeURIComponent(loader)}`)}, import.meta.url);
    ${body}
  `;
  return spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], {
    encoding: "utf8",
    timeout: 30_000,
  });
}

describe("#3518 physical runtime handle import boundary", () => {
  it("loads and uses the same stable handle registry without loading source integration", () => {
    const child = importWithFrontendBarrier(`
      const { definedFuncAt, definedFuncHandleOf } = await import(${JSON.stringify(FUNC_SPACE)});
      const { STABLE_FUNC_BASE } = await import(${JSON.stringify(RESOLVE_LAYOUT)});
      const fn = { name: 'prepared-helper', typeIdx: 0, params: [], locals: [], body: [] };
      const ctx = { numImportFuncs: 3, mod: { functions: [fn], funcOrdinalToPosition: [0] } };
      assert.equal(definedFuncAt(ctx, STABLE_FUNC_BASE), fn);
      assert.equal(definedFuncHandleOf(ctx, fn), STABLE_FUNC_BASE);
      assert.equal(definedFuncAt(ctx, STABLE_FUNC_BASE + 1), undefined);
      console.log(JSON.stringify({ stableHandleLookup: true }));
    `);
    expect(child.status, child.stderr).toBe(0);
    expect(JSON.parse(child.stdout)).toEqual({ stableHandleLookup: true });
    const loaded = child.stderr
      .split("\n")
      .filter((line) => line.startsWith("IR_HANDLE_LOADED:"))
      .map((line) => JSON.parse(line.slice("IR_HANDLE_LOADED:".length)));
    expect(loaded).toContain(FUNC_SPACE);
    expect(loaded).toContain(RESOLVE_LAYOUT);
  });

  it("rejects deliberate frontend and source-integration imports in a fresh process", () => {
    const child = importWithFrontendBarrier(`
      const blocked = [];
      for (const url of ${JSON.stringify([TS_API, SOURCE_INTEGRATION])}) {
        try { await import(url); }
        catch (error) {
          if (!String(error).includes('blocked frontend module: ' + url)) throw error;
          blocked.push(url);
        }
      }
      console.log(JSON.stringify({ blocked }));
    `);
    expect(child.status, child.stderr).toBe(0);
    expect(JSON.parse(child.stdout)).toEqual({ blocked: [TS_API, SOURCE_INTEGRATION] });
  });
});
