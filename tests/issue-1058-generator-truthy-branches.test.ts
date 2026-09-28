// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

for (const experimentalIR of [false, true]) {
  it(`preserves the checker-style object branch across loop suspensions (IR=${experimentalIR})`, async () => {
    const result = await compile(
      `
        interface Child { valid: boolean; value: number; }
        export function run() {
          const node = { children: [{ valid: true, value: 7 }, { valid: false, value: 99 }, { valid: true, value: 9 }] };
          const bias = 0;
          function getElement(child: Child, name: number) {
            return child.valid ? { value: child.value + name + bias } : undefined;
          }
          function* generateChildren(node: { children: Child[] }) {
            if (!node.children.length) return;
            let memberOffset = 0;
            for (let i = 0; i < node.children.length; i++) {
              const child = node.children[i];
              const elem = getElement(child, i - memberOffset);
              if (elem) { yield elem; } else { memberOffset++; }
            }
          }
          let score = 0;
          for (const elem of generateChildren(node)) score = score * 100 + elem.value;
          return score;
        }
      `,
      { target: "standalone", experimentalIR },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(710);
  });

  for (const comma of [false, true]) {
    it(`uses JS truthiness in a suspended branch (IR=${experimentalIR}, comma=${comma})`, async () => {
      const result = await compile(
        `
          let checks = 0;
          function* select(value: any) {
            if (${comma ? "(checks++, value)" : "value"}) { yield 1; } else { yield 0; }
          }
          export function run() {
            let score = 0;
            const values: any[] = [{}, [], 'x', 1, true, null, undefined, '', 0, false, NaN];
            for (let i = 0; i < values.length; i++) {
              const iter = select(values[i]);
              if (checks !== ${comma ? "i" : "0"}) return -10;
              const actual = iter.next();
              if (actual.value === (i < 5 ? 1 : 0)) score++;
              if (!iter.next().done) return -20;
            }
            if (checks !== ${comma ? "values.length" : "0"}) return -30;
            return score;
          }
        `,
        { target: "standalone", experimentalIR },
      );
      expect(result.success, JSON.stringify(result.errors)).toBe(true);
      const module = new WebAssembly.Module(result.binary);
      expect(WebAssembly.Module.imports(module)).toEqual([]);
      expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(11);
    });
  }
}
