// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compileMulti } from "../src/index.js";
import { ts } from "../src/ts-api.js";

for (const operator of ["|=", "||=", "+="]) {
  for (const experimentalIR of [false, true]) {
    for (const optimize of [false, true]) {
      it(`pads late constructor fields once: ${operator} IR=${experimentalIR} optimize=${optimize}`, async () => {
        const types = `export interface NodeLinks { flags: number; calculatedFlags?: number; }`;
        // Exporting make forces its constructor to exist before mark discovers
        // the additional field. Without it this test misses the late-growth path.
        const source = `
          function NodeLinks(this: NodeLinks) { this.flags = 0; }
          export function make(): NodeLinks { return new (NodeLinks as any)(); }
          function mark(links: NodeLinks) { links.calculatedFlags ${operator} 7; }
          export function run() {
            const links: NodeLinks = new (NodeLinks as any)();
            mark(links);
            return links.flags === 0 && ${operator === "+=" ? "Number.isNaN(links.calculatedFlags)" : "links.calculatedFlags === 7"} ? 73 : -1;
          }
        `;
        const native: { run?: () => number } = {};
        new Function(
          "exports",
          ts.transpileModule(`${types}\n${source}`, {
            compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
          }).outputText,
        )(native);
        expect(native.run!()).toBe(73);
        const result = await compileMulti(
          {
            "./types.ts": types,
            "./entry.ts": `import { NodeLinks } from './types.js';\n${source}`,
          },
          "./entry.ts",
          { target: "standalone", experimentalIR, optimize },
        );
        expect(result.success, JSON.stringify(result.errors)).toBe(true);
        const module = new WebAssembly.Module(result.binary);
        expect(WebAssembly.Module.imports(module)).toEqual([]);
        expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(73);
      });
    }
  }
}
