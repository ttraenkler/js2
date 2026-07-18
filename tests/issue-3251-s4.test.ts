import { describe, expect, it } from "vitest";
import { compile } from "../src/index.js";

// #3251 S4 — for-in / `in` coherence over the array-descriptor overlay.
//
// The vec for-in arm (#3183) enumerated 0..len-1 unconditionally and
// `__extern_has` answered 0 for companion-backed keys, so an
// `enumerable:false` index still enumerated, expandos never did, and the
// #2066 per-visit liveness guard would have skipped companion keys. S4 adds
// a keys_forin overlay arm (index keys filtered by the companion entry's
// FLAG_ENUMERABLE, then enumerable non-index expandos in insertion order via
// __obj_ordered) and a companion consult in __extern_has.
async function runStandalone(body: string): Promise<unknown> {
  const r = await compile(body, { fileName: "test.ts", target: "standalone" });
  if (!r.success) {
    throw new Error(`Compile failed:\n${r.errors.map((e) => `  L${e.line}: ${e.message}`).join("\n")}`);
  }
  expect(WebAssembly.validate(r.binary)).toBe(true);
  const { instance } = await WebAssembly.instantiate(r.binary, {});
  return (instance.exports as { test: () => unknown }).test();
}

const MK = "function mkArr(): any { const a: any = [1, 2, 3]; return a; }";

describe("#3251 S4 — for-in enumerability over the overlay", () => {
  it("skips an enumerable:false index", async () => {
    expect(
      await runStandalone(`${MK}
        export function test(): number {
          const arr: any = mkArr();
          Object.defineProperty(arr, "1", { value: 5, enumerable: false, configurable: true });
          let keys: any = "";
          for (const k in arr) { keys = keys === "" ? k : keys + "," + k; }
          return keys === "0,2" ? 1 : 0;
        }`),
    ).toBe(1);
  });

  it("lists an enumerable named expando AFTER the index keys", async () => {
    expect(
      await runStandalone(`${MK}
        export function test(): number {
          const arr: any = mkArr();
          Object.defineProperty(arr, "foo", { value: 9, enumerable: true });
          let keys: any = "";
          for (const k in arr) { keys = keys === "" ? k : keys + "," + k; }
          return keys === "0,1,2,foo" ? 1 : 0;
        }`),
    ).toBe(1);
  });

  it("hides a non-enumerable expando (CompletePropertyDescriptor default)", async () => {
    expect(
      await runStandalone(`${MK}
        export function test(): number {
          const arr: any = mkArr();
          Object.defineProperty(arr, "bar", { value: 9 });
          let keys: any = "";
          for (const k in arr) { keys = keys === "" ? k : keys + "," + k; }
          return keys === "0,1,2" ? 1 : 0;
        }`),
    ).toBe(1);
  });

  it("`in` sees accessor indices and expandos (has-consult)", async () => {
    expect(
      await runStandalone(`${MK}
        export function test(): number {
          const arr: any = mkArr();
          Object.defineProperty(arr, "1", { get: function (): any { return 5; }, configurable: true });
          Object.defineProperty(arr, "foo", { value: 9, enumerable: true });
          return (("1" in arr) ? 1 : 0) + (("foo" in arr) ? 2 : 0);
        }`),
    ).toBe(3);
  });

  it("overlay-free arrays enumerate unchanged (fall-through)", async () => {
    expect(
      await runStandalone(`${MK}
        export function test(): number {
          const arr: any = mkArr();
          let keys: any = "";
          for (const k in arr) { keys = keys === "" ? k : keys + "," + k; }
          return keys === "0,1,2" ? 1 : 0;
        }`),
    ).toBe(1);
  });
});
