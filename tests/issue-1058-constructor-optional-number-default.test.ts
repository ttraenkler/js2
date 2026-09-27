// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

it.each([true, false])("keeps optional numeric defaults aligned with later fields (IR=%s)", async (experimentalIR) => {
  const result = await compile(
    `
    class Node {
      kind: number;
      id?: number;
      flag: boolean;
      other?: Node;
      constructor(kind: number) { this.kind = kind; this.flag = true; this.other = this; }
    }
    export function run(): number {
      const node = new Node(3);
      return (node.kind === 3 ? 1 : 0) + (node.id === undefined ? 10 : 0) + (node.flag ? 100 : 0) + (node.other === node ? 1000 : 0);
    }
  `,
    { target: "standalone", experimentalIR },
  );
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  expect((new WebAssembly.Instance(module, {}).exports.run as () => number)()).toBe(1111);
});
