// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../../src/index.js";
// @ts-expect-error — .mjs dogfood helpers have no declaration files
import { readStandaloneException } from "./upstream-suite-worker-protocol.mjs";

it("renders a real standalone initialization exception through bounded numeric exports", async () => {
  const result = await compile(
    `function fail() { throw new Error("init sentinel π"); } fail(); export function run() { return 1; }`,
    {
      target: "standalone",
      deferTopLevelInit: true,
    },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const instance = new WebAssembly.Instance(module);
  let thrown: unknown;
  try {
    (instance.exports.__module_init as () => void)();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeDefined();
  expect(readStandaloneException(thrown, instance.exports)).toContain("init sentinel π");
});

it("does not conceal an error when the tag or renderer is unavailable or invalid", () => {
  expect(readStandaloneException(new Error("host"), {})).toBe("");
  const error = { getArg: () => 1 };
  for (const length of [NaN, -1, 0, 16_385]) {
    expect(
      readStandaloneException(error, {
        __exn_tag: {},
        __exn_render_prepare: () => length,
        __exn_render_char: () => {
          throw new Error("must not read");
        },
      }),
    ).toBe("");
  }
  expect(
    readStandaloneException(
      {
        getArg: () => {
          throw new Error("wrong tag");
        },
      },
      {
        __exn_tag: {},
        __exn_render_prepare: () => 1,
        __exn_render_char: () => 65,
      },
    ),
  ).toBe("");
  expect(
    readStandaloneException(error, {
      __exn_tag: {},
      __exn_render_prepare: () => 1,
      __exn_render_char: () => 65_536,
    }),
  ).toBe("");
});
