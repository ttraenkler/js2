// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
//
// #3518 package C — lossless PreparedIrProgram codec, the shared backend
// consumer, and fresh-process replay without a source frontend.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { IR_CLASS_SHAPE_CELL, type IrClassShape, type IrInstr, type IrType } from "../src/ir/nodes.js";
import {
  assertPreparedIrProgramShape,
  decodePreparedIrProgram,
  digestEncodedPreparedIrProgram,
  encodePreparedIrProgram,
  PREPARED_IR_PROGRAM_CODEC,
  PREPARED_IR_PROGRAM_SCHEMA,
} from "../src/ir/program-codec.js";
import { freezePreparedIrValue, PreparedIrProgramInvariantError, type PreparedIrProgram } from "../src/ir/program.js";
import { buildCodecFixture, CODEC_FIXTURE_EXPECTED } from "./helpers/ir-whole-program-codec-fixture.js";
import { consumeForReplay, replayProgram, runFixtureExports } from "./helpers/ir-whole-program-replay.js";

const REPO_ROOT = resolve(import.meta.dirname, "..");

function expectInvalid(action: () => unknown, detail: string | RegExp): void {
  let caught: unknown;
  try {
    action();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(PreparedIrProgramInvariantError);
  expect((caught as PreparedIrProgramInvariantError).code).toBe("invalid-prepared-data");
  expect((caught as PreparedIrProgramInvariantError).message).toMatch(detail);
}

/** Tamper with canonical bytes through JSON so key order and spellings stay canonical elsewhere. */
function tamper(text: string, edit: (envelope: Record<string, unknown>) => void): string {
  const parsed = JSON.parse(text) as Record<string, unknown>;
  edit(parsed);
  return JSON.stringify(parsed);
}

type Json = Record<string, unknown>;
const at = (value: unknown, ...path: (string | number)[]): Json =>
  path.reduce<unknown>((cursor, key) => (cursor as Record<string | number, unknown>)[key], value) as Json;

function constants(fn: { readonly blocks: readonly { readonly instrs: readonly IrInstr[] }[] }) {
  return fn.blocks.flatMap((block) => block.instrs).filter((instr) => instr.kind === "const");
}

describe("#3518 C — PreparedIrProgram codec", () => {
  const fixture = buildCodecFixture();
  const encoded = encodePreparedIrProgram(fixture.program);

  it("re-encodes a decoded program byte-identically and keeps every non-JSON value", () => {
    const decoded = decodePreparedIrProgram(encoded);
    expect(encodePreparedIrProgram(decoded)).toBe(encoded);
    expect(digestEncodedPreparedIrProgram(encodePreparedIrProgram(decoded))).toBe(
      digestEncodedPreparedIrProgram(encoded),
    );
    expect(decoded).not.toBe(fixture.program);
    expect(Object.isFrozen(decoded)).toBe(true);

    // ReadonlyMap survives as a lookup surface with its exact key set.
    expect(typeof decoded.units.get).toBe("function");
    expect([...decoded.units.keys()]).toEqual([...fixture.program.units.keys()]);
    for (const [id, record] of decoded.units) expect(record.id).toBe(id);

    // Recursive class shape: brand restored, cycle closed onto the same object.
    const classContract = decoded.abi.entries.find((entry) => entry.contract.kind === "class")!.contract;
    expect(classContract.kind).toBe("class");
    const shape = (classContract as { readonly shape: IrClassShape }).shape;
    expect(shape[IR_CLASS_SHAPE_CELL]).toBe(true);
    expect(shape.classId).toBe(fixture.classShape.classId);
    const next = shape.fields.find((field) => field.name === "next")!.type as Extract<IrType, { kind: "class" }>;
    expect(next.shape).toBe(shape);

    // Special numerics and bigint keep their exact identity.
    const special = decoded.ir.functions.find((fn) => fn.name === "special")!;
    const values = constants(special).map((instr) => (instr as { value: { value: unknown } }).value.value);
    expect(values.some((value) => Object.is(value, -0))).toBe(true);
    expect(values.some((value) => value === Number.POSITIVE_INFINITY)).toBe(true);
    const big = decoded.ir.functions.find((fn) => fn.name === "big")!;
    expect(constants(big).map((instr) => (instr as { value: { value: unknown } }).value.value)).toEqual([
      CODEC_FIXTURE_EXPECTED.big,
    ]);

    // A present-but-undefined optional key is a key, not an omission.
    const classRecord = decoded.inventory.classes[0]!;
    expect(Object.hasOwn(classRecord, "syntheticRole")).toBe(true);
    expect(classRecord.syntheticRole).toBeUndefined();
  });

  it("emits canonical, sorted, single-spelling bytes", () => {
    const envelope = JSON.parse(encoded) as Record<string, unknown>;
    expect(Object.keys(envelope)).toEqual(["codec", "program", "schema"]);
    expect(envelope.codec).toBe(PREPARED_IR_PROGRAM_CODEC);
    expect(envelope.schema).toBe(PREPARED_IR_PROGRAM_SCHEMA);
    expect(encoded).toContain('{"$number":"-0"}');
    expect(encoded).toContain('{"$number":"Infinity"}');
    expect(encoded).toContain(`{"$bigint":"${CODEC_FIXTURE_EXPECTED.big}"}`);
    expect(encoded).toContain('{"$undefined":true}');
    expect(encoded).toContain('"$irClassShapeCell":true');
    expect(encoded).toContain('{"$classShapeRef":"');
    expect(encoded).toContain('"units":{"$map":[[');
    expect(encoded).not.toContain("-0,");
    expect(encoded).not.toContain('null,"$'); // no lossy JSON.stringify of NaN/Infinity anywhere
  });

  it("refuses non-canonical, malformed and unknown bytes before returning anything", () => {
    expectInvalid(() => decodePreparedIrProgram(encoded.slice(0, encoded.length - 20)), /not valid JSON/);
    expectInvalid(() => decodePreparedIrProgram("[]"), /must be a JSON object/);
    expectInvalid(
      () => decodePreparedIrProgram(tamper(encoded, (e) => void (e.schema = "prepared-ir-program-v0"))),
      /unsupported schema/,
    );
    expectInvalid(() => decodePreparedIrProgram(tamper(encoded, (e) => void (e.codec = "other"))), /unsupported codec/);
    expectInvalid(
      () => decodePreparedIrProgram(tamper(encoded, (e) => void (e.extra = 1))),
      /envelope must be exactly/,
    );
    expectInvalid(
      () => decodePreparedIrProgram(tamper(encoded, (e) => void (at(e, "program", "ir").functions = { $mystery: 1 }))),
      /unknown codec tag \$mystery/,
    );
    expectInvalid(
      () =>
        decodePreparedIrProgram(
          tamper(encoded, (e) => {
            at(e, "program").zzz = 1;
            at(e, "program").aaa = 1;
          }),
        ),
      /not in canonical order/,
    );
    expectInvalid(
      () =>
        decodePreparedIrProgram(
          tamper(encoded, (e) => {
            const fn = at(e, "program", "ir", "functions", 0);
            (fn.blocks as unknown[])[0] = { $classShapeRef: "ir-class:v1:nowhere" };
          }),
        ),
      /does not name an enclosing class shape/,
    );
    expectInvalid(
      // JSON.stringify cannot spell -0, so tamper the bytes directly.
      () => decodePreparedIrProgram(encoded.replace(/"valueCount":\d+/, '"valueCount":-0')),
      /-0 must be spelled/,
    );
    expectInvalid(
      () =>
        decodePreparedIrProgram(
          tamper(encoded, (e) => {
            const entries = at(e, "program", "units").$map as unknown[][];
            entries.push(entries[0]!);
          }),
        ),
      /repeats key/,
    );
    expectInvalid(
      () =>
        decodePreparedIrProgram(
          tamper(encoded, (e) => {
            const entries = at(e, "program", "abi").entries as Json[];
            entries.push(entries[0]!);
          }),
        ),
      /duplicate binding IDs/,
    );
    expectInvalid(
      () => decodePreparedIrProgram(tamper(encoded, (e) => void (at(e, "program").sealed = false))),
      /sealed must be true/,
    );
    expectInvalid(
      () =>
        decodePreparedIrProgram(
          tamper(encoded, (e) => void (at(e, "program").reconciliation = "pending-production-wiring")),
        ),
      /reconciliation must be "complete"/,
    );
    expectInvalid(
      () =>
        decodePreparedIrProgram(
          tamper(encoded, (e) => {
            (at(e, "program", "inventory").terminalUnits as unknown[]).pop();
          }),
        ),
      /program\.units holds 4 units but the inventory has 3 terminals/,
    );
  });

  it("refuses to encode executable or foreign values", () => {
    const withFunction = {
      ...fixture.program,
      ir: { functions: [{ ...fixture.program.ir.functions[0]!, hook: () => 1 }] },
    };
    expectInvalid(() => encodePreparedIrProgram(withFunction as unknown as PreparedIrProgram), /executable functions/);
    class Foreign {}
    const withInstance = { ...fixture.program, inventory: { ...fixture.program.inventory, classes: [new Foreign()] } };
    expectInvalid(
      () => encodePreparedIrProgram(withInstance as unknown as PreparedIrProgram),
      /unsupported Foreign instance/,
    );
    const cyclic: Record<string, unknown> = { kind: "loop" };
    cyclic.self = cyclic;
    const withCycle = { ...fixture.program, inventory: { ...fixture.program.inventory, classes: [cyclic] } };
    expectInvalid(
      () => encodePreparedIrProgram(withCycle as unknown as PreparedIrProgram),
      /acyclic outside exact IR class shapes/,
    );
    expectInvalid(
      () => assertPreparedIrProgramShape(freezePreparedIrValue({ ...fixture.program, schema: "other" })),
      /schema must be/,
    );
  });
});

describe("#3518 C — shared backend consumer", () => {
  const fixture = buildCodecFixture();
  const decoded = decodePreparedIrProgram(encodePreparedIrProgram(fixture.program));

  it("lowers the same decoded object through both backends and matches the native oracle", async () => {
    const wasmgc = await replayProgram(decoded, "wasmgc");
    const linear = await replayProgram(decoded, "linear");
    for (const run of [wasmgc, linear]) {
      const results = runFixtureExports(run.exports);
      expect(results.main, run.backend).toBe(CODEC_FIXTURE_EXPECTED.main);
      expect(results.helper21, run.backend).toBe(CODEC_FIXTURE_EXPECTED.helper(21));
      expect(results.big, run.backend).toBe(String(CODEC_FIXTURE_EXPECTED.big));
      expect(results.special, run.backend).toBe(String(CODEC_FIXTURE_EXPECTED.special));
      expect(run.bytes).toBeGreaterThan(0);
    }
  });

  it("fails typed and before emission when a call target is not in the program", () => {
    const dropped = freezePreparedIrValue({
      ...fixture.program,
      ir: { functions: fixture.program.ir.functions.filter((fn) => fn.name !== "helper") },
    }) as PreparedIrProgram;
    for (const backend of ["wasmgc", "linear"] as const) {
      const trace = { emitters: 0 };
      const outcome = consumeForReplay(dropped, backend, trace);
      expect(outcome.kind).toBe("invariant");
      if (outcome.kind !== "invariant") return;
      expect(outcome.stage).toBe("resolve");
      expect(outcome.code).toBe("unknown-function-ref");
      expect(outcome.unitId).toBe(fixture.program.ir.functions.find((fn) => fn.name === "main")!.unitId);
      expect(outcome.owner?.sourceFile).toBe("@test/ir-whole-program-codec");
      expect(trace.emitters).toBe(0);
    }
  });

  it("fails typed and before emission when a body contradicts its declared result", () => {
    const text = tamper(encodePreparedIrProgram(fixture.program), (e) => {
      const main = at(e, "program", "ir", "functions", 1);
      expect(main.name).toBe("main");
      at(main, "resultTypes", 0, "val").kind = "i32";
    });
    const contradicted = decodePreparedIrProgram(text);
    const trace = { emitters: 0 };
    const outcome = consumeForReplay(contradicted, "wasmgc", trace);
    expect(outcome.kind).toBe("invariant");
    if (outcome.kind !== "invariant") return;
    expect(outcome.stage).toBe("verify");
    expect(outcome.code).toBe("verifier-failure");
    expect(trace.emitters).toBe(0);
  });

  it("fails typed and before emission when a support binding is not planned in the ABI", () => {
    const text = tamper(encodePreparedIrProgram(fixture.program), (e) => {
      const main = at(e, "program", "ir", "functions", 1);
      const call = (at(main, "blocks", 0).instrs as Json[]).find((instr) => instr.kind === "call")!;
      at(call, "target").binding = { bindingId: "ir-binding:v1:support:nowhere:x:0", kind: "support" };
    });
    const unplanned = decodePreparedIrProgram(text);
    const trace = { emitters: 0 };
    const outcome = consumeForReplay(unplanned, "linear", trace);
    expect(outcome.kind).toBe("invariant");
    if (outcome.kind !== "invariant") return;
    expect(outcome.code).toBe("unknown-function-ref");
    expect(outcome.detail).toMatch(/support callable .* does not plan/);
    expect(trace.emitters).toBe(0);
  });
});

describe("#3518 C — fresh-process replay", () => {
  it("replays the encoded program in a child process that never loads a source frontend", () => {
    const fixture = buildCodecFixture();
    const encoded = encodePreparedIrProgram(fixture.program);
    const dir = mkdtempSync(join(tmpdir(), "ir-whole-program-replay-"));
    try {
      const file = join(dir, "program.json");
      writeFileSync(file, encoded);
      const child = spawnSync(process.execPath, ["--import", "tsx", "scripts/ir-whole-program-replay.mjs", file], {
        cwd: REPO_ROOT,
        encoding: "utf8",
        timeout: 120_000,
      });
      expect(child.status, child.stderr).toBe(0);
      const report = JSON.parse(child.stdout.trim().split("\n").at(-1)!) as {
        digest: string;
        reencodedIdentical: boolean;
        decodeFailure?: string;
        backends: Record<string, { kind: string; bytes?: number; results?: Record<string, unknown>; detail?: string }>;
        frontendModules: string[];
        typescriptModules: string[];
        loadedModuleCount: number;
      };
      expect(report.decodeFailure).toBeUndefined();
      expect(report.digest).toBe(digestEncodedPreparedIrProgram(encoded));
      expect(report.reencodedIdentical).toBe(true);
      for (const backend of ["wasmgc", "linear"]) {
        const run = report.backends[backend]!;
        expect(run.kind, `${backend}: ${run.detail ?? ""}`).toBe("ran");
        expect(run.results).toEqual({
          main: CODEC_FIXTURE_EXPECTED.main,
          helper21: CODEC_FIXTURE_EXPECTED.helper(21),
          big: String(CODEC_FIXTURE_EXPECTED.big),
          special: String(CODEC_FIXTURE_EXPECTED.special),
        });
      }
      // The hook must have seen the codec itself, so an empty record is not a pass.
      expect(report.loadedModuleCount).toBeGreaterThan(10);
      expect(report.frontendModules).toEqual([]);
      // Measured, not asserted: whether the TypeScript library was pulled in by
      // a transitive value import (identity.ts today). See the handoff notes.
      console.info(
        `[#3518 C] replay child loaded ${report.loadedModuleCount} modules; typescript-library modules: ${report.typescriptModules.length}`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
