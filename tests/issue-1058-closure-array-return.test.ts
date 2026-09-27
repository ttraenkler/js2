// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

it.each([true, false])(
  "coerces a contextual array return after a callback side effect (IR=%s)",
  async (experimentalIR) => {
    const result = await compile(
      `
    interface Change { fileName: string; }
    interface Tracker { value: number; }
    type Track = (cb: (tracker: Tracker) => void) => Change[];
    export function run(): number {
      const tracker: Tracker = {value: 42};
      const track: Track = cb => (cb(tracker), []);
      let value = 0;
      const changes = track(t => { value = t.value; });
      return changes.length === 0 ? value : 0;
    }
  `,
      { target: "standalone", experimentalIR },
    );
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(42);
  },
);
