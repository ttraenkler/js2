// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

it.each([
  { experimentalIR: true, shortFirst: true },
  { experimentalIR: true, shortFirst: false },
  { experimentalIR: false, shortFirst: true },
  { experimentalIR: false, shortFirst: false },
])(
  "preserves an omitted overloaded closure reference parameter (IR=$experimentalIR, shortFirst=$shortFirst)",
  async ({ experimentalIR, shortFirst }) => {
    const result = await compile(
      `
    interface Diagnostic { name: string; }
    interface Collection {
      ${shortFirst ? "getDiagnostics(): Diagnostic[];" : ""}
      getDiagnostics(fileName: string): Diagnostic[];
      ${shortFirst ? "" : "getDiagnostics(): Diagnostic[];"}
    }
    function createCollection(): Collection {
      const diagnostics: Diagnostic[] = [{name: "a"}, {name: "b"}];
      return { getDiagnostics };
      function getDiagnostics(fileName: string): Diagnostic[];
      function getDiagnostics(): Diagnostic[];
      function getDiagnostics(fileName?: string): Diagnostic[] {
        return fileName === undefined ? diagnostics : diagnostics.slice(0, 1);
      }
    }
    export function omitted(): number { return createCollection().getDiagnostics().length; }
    export function supplied(): number { return createCollection().getDiagnostics("index.ts").length; }
  `,
      { target: "standalone", experimentalIR },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    const exports = new WebAssembly.Instance(module, {}).exports;
    expect((exports.omitted as () => number)()).toBe(2);
    expect((exports.supplied as () => number)()).toBe(1);
  },
);
