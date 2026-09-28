// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compileMulti } from "../src/index.js";

for (const experimentalIR of [false, true]) {
  it(`initializes a staged System before cyclic harness imports (IR=${experimentalIR})`, async () => {
    const sources = {
      "./system.ts": `
        export interface System { read(path: string): number; unused(): number; }
        export let sys: System;
        export function setSys(value: System): void { sys = value; }
      `,
      "./prelude.ts": `
        import { type System, setSys } from './system.js';
        let installed: System | undefined;
        setSys({ read: (path: string) => {
          if (!installed) throw new Error('uninitialized');
          return installed.read(path);
        }} as System);
        export function install(value: System): void { installed = value; setSys(value); }
      `,
      "./harness.ts": `
        import { sys } from './system.js';
        import { RealSystem } from './fake.js';
        export const savedRead = sys.read;
        export function currentRead(): number { return sys.read('/input'); }
        export function marker(): number { return 7; }
        export function make(): RealSystem { return new RealSystem(19); }
      `,
      "./fake.ts": `
        import { type System } from './system.js';
        import { marker } from './harness.js';
        export class RealSystem implements System {
          constructor(public value: number) {}
          read(path: string): number { return path === '/input' ? this.value + marker() : -1; }
          unused(): number { return 0; }
        }
      `,
      "./init.ts": `
        import { install } from './prelude.js';
        import { make } from './harness.js';
        install(make());
      `,
      "./entry.ts": `
        import './init.js';
        import { savedRead, currentRead } from './harness.js';
        export function run(): number { return savedRead('/input') + currentRead(); }
      `,
    };
    const result = await compileMulti(sources, "./entry.ts", { target: "standalone", experimentalIR });
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(52);
  });
}
