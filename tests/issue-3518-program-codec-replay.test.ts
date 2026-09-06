// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
//
// #3518 package C — lossless PreparedIrProgram codec, runtime re-authentication,
// the shared backend consumer (accept/emit), and fresh-process replay.
//
// Denominators, kept separate on purpose:
//   - synthetic complete fixture (tests/helpers/ir-whole-program-codec-fixture.ts)
//   - codec data-model probes on that fixture's container (data-level decode)
//   - A-produced programs from source through `prepareWholeIrProgram`

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeMultiSource } from "../src/checker/index.js";
import { IR_CLASS_SHAPE_CELL, type IrClassShape, type IrInstr, type IrType } from "../src/ir/nodes.js";
import {
  acceptPreparedIrProgram,
  emitAcceptedIrProgram,
  isAuthenticAcceptedIrProgram,
} from "../src/ir/backend/program-consumer.js";
import {
  assertPreparedIrProgramShape,
  decodePreparedIrProgram,
  decodePreparedIrProgramData,
  digestEncodedPreparedIrProgram,
  encodePreparedIrProgram,
  PREPARED_IR_PROGRAM_CODEC,
  PREPARED_IR_PROGRAM_SCHEMA,
} from "../src/ir/program-codec.js";
import { prepareWholeIrProgram } from "../src/ir/program-preparation.js";
import {
  freezePreparedIrValue,
  preparedIrDataMismatch,
  PreparedIrProgramInvariantError,
  type AcceptedPreparedIrProgram,
  type PreparedIrProgram,
} from "../src/ir/program.js";
import { buildCodecFixture, CODEC_FIXTURE_ORACLE } from "./helpers/ir-whole-program-codec-fixture.js";
import {
  compareExports,
  replayOptions,
  replayProgram,
  scalarPhysicalPlan,
  type OracleCall,
  type PlanTrace,
} from "./helpers/ir-whole-program-replay.js";

const REPO_ROOT = resolve(import.meta.dirname, "..");

function expectInvalid(action: () => unknown, detail: string | RegExp): void {
  let caught: unknown;
  try {
    action();
  } catch (error) {
    caught = error;
  }
  expect(caught, `expected a PreparedIrProgramInvariantError matching ${String(detail)}`).toBeInstanceOf(
    PreparedIrProgramInvariantError,
  );
  expect((caught as PreparedIrProgramInvariantError).message).toMatch(detail);
}

/** Minimal canonical writer for tampered JSON: sorted keys, no whitespace (mirrors the codec). */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value).sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Tamper with canonical bytes through JSON, then re-serialize with the codec's own key order. */
function tamper(text: string, edit: (envelope: Record<string, unknown>) => void): string {
  const parsed = JSON.parse(text) as Record<string, unknown>;
  edit(parsed);
  return canonicalJson(parsed);
}

type Json = Record<string, unknown>;
const at = (value: unknown, ...path: (string | number)[]): Json =>
  path.reduce<unknown>((cursor, key) => (cursor as Record<string | number, unknown>)[key], value) as Json;

function constants(fn: { readonly blocks: readonly { readonly instrs: readonly IrInstr[] }[] }) {
  return fn.blocks.flatMap((block) => block.instrs).filter((instr) => instr.kind === "const");
}

const ORACLE_CALLS = CODEC_FIXTURE_ORACLE.calls as readonly OracleCall[];

function expectOracle(exports: WebAssembly.Exports, label: string): void {
  const rows = compareExports(exports, ORACLE_CALLS);
  expect(rows.length).toBe(ORACLE_CALLS.length);
  for (const row of rows) {
    expect(row.match, `${label}: ${row.export}(${row.args.join(",")}) = ${row.actual}, expected ${row.expected}`).toBe(
      true,
    );
  }
}

describe("#3518 C — PreparedIrProgram codec (synthetic complete fixture)", () => {
  const fixture = buildCodecFixture();
  const encoded = encodePreparedIrProgram(fixture.program);

  it("the fixture is a complete program under A's validator and re-authenticates", () => {
    const decoded = decodePreparedIrProgram(encoded);
    expect(decoded).not.toBe(fixture.program);
    expect(Object.isFrozen(decoded)).toBe(true);
    // Same shape AND same bytes: the data check is not a stand-in for the byte check or vice versa.
    expect(preparedIrDataMismatch(fixture.program, decoded)).toBeUndefined();
    expect(encodePreparedIrProgram(decoded)).toBe(encoded);
    expect(digestEncodedPreparedIrProgram(encodePreparedIrProgram(decoded))).toBe(
      digestEncodedPreparedIrProgram(encoded),
    );
    expect(decoded.runtime.map((projection) => `${projection.backend}:${projection.target}`)).toEqual([
      "wasmgc:host",
      "linear:host",
    ]);
  });

  it("keeps every non-JSON value across the round trip", () => {
    const decoded = decodePreparedIrProgram(encoded);
    expect(typeof decoded.units.get).toBe("function");
    expect([...decoded.units.keys()]).toEqual([...fixture.program.units.keys()]);
    for (const [id, record] of decoded.units) expect(record.id).toBe(id);
    expect(typeof decoded.runtime[0]!.prepared.providers.get).toBe("function");

    const classContract = decoded.abi.entries.find((entry) => entry.contract.kind === "class")!.contract;
    const shape = (classContract as { readonly shape: IrClassShape }).shape;
    expect(shape[IR_CLASS_SHAPE_CELL]).toBe(true);
    expect(shape.classId).toBe(fixture.classShape.classId);
    const next = shape.fields.find((field) => field.name === "next")!.type as Extract<IrType, { kind: "class" }>;
    expect(next.shape).toBe(shape);

    const special = decoded.ir.functions.find((fn) => fn.name === "special")!;
    const values = constants(special).map((instr) => (instr as { value: { value: unknown } }).value.value);
    expect(values.some((value) => Object.is(value, -0))).toBe(true);
    expect(values.some((value) => value === Number.POSITIVE_INFINITY)).toBe(true);
    const big = decoded.ir.functions.find((fn) => fn.name === "big")!;
    expect(constants(big).map((instr) => (instr as { value: { value: unknown } }).value.value)).toEqual([
      9007199254740993n,
    ]);

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
    expect(encoded).toContain('{"$bigint":"9007199254740993"}');
    expect(encoded).toContain('{"$undefined":true}');
    expect(encoded).toContain('"$irClassShapeCell":true');
    expect(encoded).toContain('{"$classShapeRef":"');
    expect(encoded).toContain('"units":{"$map":[[');
    expect(encoded).toContain('"providers":{"$map":[');
    expect(encoded).not.toContain("-0,");
    expect(encoded).not.toMatch(/[^\\]"\s/); // no whitespace after any closing quote
  });

  it("refuses non-canonical, malformed and unknown bytes before returning anything", () => {
    expectInvalid(() => decodePreparedIrProgramData(encoded.slice(0, encoded.length - 20)), /not valid JSON/);
    expectInvalid(() => decodePreparedIrProgramData("[]"), /must be a JSON object/);
    // Probe cases from the independent review:
    expectInvalid(() => decodePreparedIrProgramData(` ${encoded}`), /not canonical \(first difference at byte 0\)/);
    expectInvalid(() => decodePreparedIrProgramData(`${encoded}\n`), /not canonical/);
    expectInvalid(
      () => decodePreparedIrProgramData(`{"codec":"x",${encoded.slice(1)}`),
      /not canonical|envelope must be exactly/,
    );
    expectInvalid(
      () => decodePreparedIrProgramData(tamper(encoded, (e) => void (e.schema = "prepared-ir-program-v0"))),
      /unsupported schema/,
    );
    expectInvalid(
      () => decodePreparedIrProgramData(tamper(encoded, (e) => void (e.codec = "other"))),
      /unsupported codec/,
    );
    expectInvalid(
      () => decodePreparedIrProgramData(tamper(encoded, (e) => void (e.extra = 1))),
      /envelope must be exactly/,
    );
    expectInvalid(
      () =>
        decodePreparedIrProgramData(tamper(encoded, (e) => void (at(e, "program", "ir").functions = { $mystery: 1 }))),
      /unknown codec tag \$mystery/,
    );
    expectInvalid(
      () => decodePreparedIrProgramData(encoded.replace('"program":{', '"program":{"zzz":1,')),
      /not canonical/,
    );
    expectInvalid(
      () =>
        decodePreparedIrProgramData(
          tamper(encoded, (e) => {
            const fn = at(e, "program", "ir", "functions", 0);
            (fn.blocks as unknown[])[0] = { $classShapeRef: "ir-class:v1:nowhere" };
          }),
        ),
      /does not name an enclosing class shape/,
    );
    expectInvalid(
      // JSON.stringify cannot spell -0, so tamper the bytes directly.
      () => decodePreparedIrProgramData(encoded.replace(/"valueCount":\d+/, '"valueCount":-0')),
      /-0 must be spelled/,
    );
    expectInvalid(
      () =>
        decodePreparedIrProgramData(
          tamper(encoded, (e) => {
            const entries = at(e, "program", "units").$map as unknown[][];
            entries.push(entries[0]!);
          }),
        ),
      /repeats key/,
    );
    expectInvalid(
      () =>
        decodePreparedIrProgramData(
          tamper(encoded, (e) => {
            const entries = at(e, "program", "abi").entries as Json[];
            entries.push(entries[0]!);
          }),
        ),
      /duplicate binding IDs/,
    );
    expectInvalid(
      () => decodePreparedIrProgramData(tamper(encoded, (e) => void (at(e, "program").sealed = false))),
      /sealed must be true/,
    );
    expectInvalid(
      () =>
        decodePreparedIrProgramData(
          tamper(encoded, (e) => void (at(e, "program").reconciliation = "pending-production-wiring")),
        ),
      /reconciliation must be "complete"/,
    );
    expectInvalid(
      () =>
        decodePreparedIrProgramData(
          tamper(encoded, (e) => {
            (at(e, "program", "inventory").terminalUnits as unknown[]).pop();
          }),
        ),
      /program\.units holds 4 units but the inventory has 3 terminals/,
    );
  });

  it("refuses to encode executable, foreign or anonymously cyclic values", () => {
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

  it("rejects persisted runtime claims that contradict the regenerated projection", () => {
    // A persisted manifest record is data; its regenerated twin must agree field for field.
    const featureTampered = tamper(encoded, (e) => {
      const manifest = at(e, "program", "runtime", 0, "prepared", "manifest");
      (manifest.features as unknown[]).push("string.compare.native");
    });
    expectInvalid(() => decodePreparedIrProgram(featureTampered), /contradicts the regenerated runtime at/);
    // Dropping a physical body from a projection is a contradiction, not a smaller program.
    const bodyDropped = tamper(encoded, (e) => {
      (at(e, "program", "runtime", 0, "prepared").functions as unknown[]).pop();
    });
    expectInvalid(() => decodePreparedIrProgram(bodyDropped), /contradicts the regenerated runtime|is missing body/);
    // The data-level decode preserves such claims verbatim; only re-authentication refuses them.
    expect(decodePreparedIrProgramData(featureTampered).runtime[0]!.prepared.manifest.features).toContain(
      "string.compare.native",
    );
  });
});

describe("#3518 C — codec data-model probes (data-level decode)", () => {
  const fixture = buildCodecFixture();

  /** Probe records ride inside `inventory.classes`, which the structural shape check only requires to be an array. */
  function withProbe(...records: unknown[]): PreparedIrProgram {
    return freezePreparedIrValue({
      ...fixture.program,
      inventory: { ...fixture.program.inventory, classes: records },
    }) as PreparedIrProgram;
  }

  it("preserves an own `__proto__` data property", () => {
    const record = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(record, "__proto__", {
      value: "retained-data",
      enumerable: true,
      writable: true,
      configurable: true,
    });
    record.label = "proto-probe";
    const program = withProbe(record);
    const encoded = encodePreparedIrProgram(program);
    expect(encoded).toContain('"__proto__":"retained-data"');
    const decoded = decodePreparedIrProgramData(encoded);
    const probe = decoded.inventory.classes[0] as unknown as object;
    expect(Object.hasOwn(probe, "__proto__")).toBe(true);
    expect(Object.getOwnPropertyDescriptor(probe, "__proto__")?.value).toBe("retained-data");
    expect(Object.getPrototypeOf(probe)).toBeNull();
    expect(preparedIrDataMismatch(program, decoded)).toBeUndefined();
  });

  it("round-trips integer-like record keys in canonical order", () => {
    const record: Record<string, unknown> = {};
    record["2"] = "two";
    record["10"] = "ten";
    record.label = "integer-like";
    const program = withProbe(record);
    const encoded = encodePreparedIrProgram(program);
    expect(encoded).toContain('{"10":"ten","2":"two","label":"integer-like"}');
    const decoded = decodePreparedIrProgramData(encoded);
    const probe = decoded.inventory.classes[0] as unknown as Record<string, unknown>;
    expect(probe["2"]).toBe("two");
    expect(probe["10"]).toBe("ten");
    expect(encodePreparedIrProgram(decoded)).toBe(encoded);
    expect(preparedIrDataMismatch(program, decoded)).toBeUndefined();
  });

  it("keeps array holes, present undefined and present null distinct", () => {
    const sparse: unknown[] = new Array(4);
    sparse[0] = "zero";
    sparse[2] = undefined;
    sparse[3] = null;
    const program = withProbe(sparse);
    const encoded = encodePreparedIrProgram(program);
    expect(encoded).toContain('["zero",{"$hole":true},{"$undefined":true},null]');
    const decoded = decodePreparedIrProgramData(encoded);
    const probe = decoded.inventory.classes[0] as unknown as unknown[];
    expect(probe.length).toBe(4);
    expect([0, 1, 2, 3].map((index) => Object.hasOwn(probe, index))).toEqual([true, false, true, true]);
    expect(probe[2]).toBeUndefined();
    expect(probe[3]).toBeNull();
    expect(encodePreparedIrProgram(decoded)).toBe(encoded);
    expect(preparedIrDataMismatch(program, decoded)).toBeUndefined();
    // A hole is not a legal record field.
    expectInvalid(
      () => decodePreparedIrProgramData(encoded.replace('"classes":[', '"classes":[{"h":{"$hole":true}},')),
      /cannot be a hole/,
    );
  });

  it("round-trips Set values and rejects repeated set items", () => {
    const program = withProbe({ tags: new Set(["a", "b"]) });
    const encoded = encodePreparedIrProgram(program);
    expect(encoded).toContain('"tags":{"$set":["a","b"]}');
    const decoded = decodePreparedIrProgramData(encoded);
    expect([...(decoded.inventory.classes[0] as unknown as { tags: ReadonlySet<string> }).tags]).toEqual(["a", "b"]);
    expectInvalid(
      () => decodePreparedIrProgramData(encoded.replace('{"$set":["a","b"]}', '{"$set":["a","a"]}')),
      /repeats item/,
    );
  });
});

describe("#3518 C — shared backend consumer (accept / emit)", () => {
  const fixture = buildCodecFixture();
  const decoded = decodePreparedIrProgram(encodePreparedIrProgram(fixture.program));

  it("accepts and emits the same decoded object through both backends with exact unit receipts", async () => {
    const trace: PlanTrace = { emitters: 0, assembled: 0 };
    for (const backend of ["wasmgc", "linear"] as const) {
      const outcome = await replayProgram(decoded, replayOptions(backend), trace);
      expect(outcome.kind, `${backend}: ${outcome.kind === "ran" ? "" : JSON.stringify(outcome)}`).toBe("ran");
      if (outcome.kind !== "ran") return;
      expect(outcome.run.accepted.program).toBe(decoded);
      expect(outcome.run.emitted.emittedUnitIds).toEqual(
        outcome.run.accepted.runtime.prepared.functions.map((fn) => fn.unitId),
      );
      expect(outcome.run.emitted.emittedUnitIds).toHaveLength(4);
      expectOracle(outcome.run.exports, backend);
    }
    // Emitter accounting: exactly one emitter per physical body per backend, all assembled.
    expect(trace.emitters).toBe(8);
    expect(trace.assembled).toBe(4);
  });

  it("fails typed, located and before emission when the program has no projection for the backend/target", () => {
    const trace: PlanTrace = { emitters: 0, assembled: 0 };
    const wasmgcOnly = decodePreparedIrProgram(
      encodePreparedIrProgram(buildCodecFixture([{ target: "host", backend: "wasmgc" }]).program),
    );
    const outcome = acceptPreparedIrProgram(wasmgcOnly, replayOptions("linear"));
    expect(outcome.kind).toBe("unsupported");
    if (outcome.kind !== "unsupported") return;
    expect(outcome.stage).toBe("build");
    expect(outcome.detail).toMatch(/no linear:host runtime projection \(available: wasmgc:host\)/);
    expect(outcome.sourceFile).toBe("@test/ir-whole-program-codec");
    expect(outcome.unitId).toBe(fixture.program.ir.functions[0]!.unitId);
    expect(trace.emitters).toBe(0);
  });

  it("refuses to emit a forged or cloned acceptance and refuses a second emission", async () => {
    const outcome = await replayProgram(decoded, replayOptions("wasmgc"));
    expect(outcome.kind).toBe("ran");
    if (outcome.kind !== "ran") return;
    const accepted = outcome.run.accepted;
    expect(isAuthenticAcceptedIrProgram(accepted)).toBe(true);
    const forged = { ...accepted } as AcceptedPreparedIrProgram;
    expect(isAuthenticAcceptedIrProgram(forged)).toBe(false);
    const trace: PlanTrace = { emitters: 0, assembled: 0 };
    expectInvalid(
      () => emitAcceptedIrProgram(forged, scalarPhysicalPlan(accepted, trace)),
      /not produced by acceptPreparedIrProgram/,
    );
    expectInvalid(() => emitAcceptedIrProgram(accepted, scalarPhysicalPlan(accepted, trace)), /already emitted/);
    expect(trace.emitters).toBe(0);
  });

  it("fails before lowering when a shared exception tag is requested and the plan cannot reserve one", () => {
    const acceptance = acceptPreparedIrProgram(decoded, { ...replayOptions("wasmgc"), sharedExceptionTag: true });
    expect(acceptance.kind).toBe("accepted");
    if (acceptance.kind !== "accepted") return;
    const trace: PlanTrace = { emitters: 0, assembled: 0 };
    // The scalar plan declares the tag a gap; build it from a tag-less view to reach the consumer's own guard.
    const plan = scalarPhysicalPlan(
      { ...acceptance, options: { ...acceptance.options, sharedExceptionTag: false } } as AcceptedPreparedIrProgram,
      trace,
    );
    expectInvalid(() => emitAcceptedIrProgram(acceptance, plan), /cannot reserve one/);
    expect(trace.emitters).toBe(0);
  });

  it("refuses linear physical options on a non-linear backend", () => {
    expectInvalid(
      () => acceptPreparedIrProgram(decoded, { ...replayOptions("wasmgc"), linear: { exposeArenaReset: true } }),
      /linear physical options were supplied for backend wasmgc/,
    );
  });
});

describe("#3518 C — A-produced programs from source", () => {
  const COMMON_SUBSET = {
    "./math.ts": "export function double(x: number): number { return x * 2; }",
    "./entry.ts": 'import { double } from "./math"; export function main(): number { return double(20) + 2; }',
  };
  const ORIGINAL_MIXED = {
    "./a.ts": "export let left: number = 1; left = left + 1;",
    "./b.ts": "export let right: number = 10; right = right + 2;",
    "./entry.ts":
      '\n    import { left } from "./a";\n    import { right } from "./b";\n    let phase: number = 0;\n    export function initial(): number { return left * 100 + right; }\n    export function readPhase(): number { return phase; }\n    function compute(seed: number): number {\n      let total = 0;\n      for (let i = 0; i < 4; i++) {\n        if (i % 2 === 0) total = total + Math.imul(seed, i + 1);\n        else total = total - i;\n      }\n      return total;\n    }\n    \n  export async function run(seed: number): Promise<number> {\n    phase = 1;\n    const first = await (seed + 1);\n    phase = 2;\n    const second = await compute(first);\n    phase = 3;\n    return second + initial();\n  }\n\n  ',
  };
  /** D's pinned source digest for the original mixed application (tests/fixtures/ir-whole-program/original-async-mixed). */
  const ORIGINAL_MIXED_DIGEST = "236fa7d971bf9b86aafa778a9a441b2440bae2e2c2c0ae7fdab3f6e517c517fb";

  const BOTH_BACKENDS = [
    { target: "host", backend: "wasmgc" },
    { target: "host", backend: "linear" },
  ] as const;

  function prepare(
    files: Record<string, string>,
    runtimePolicies: readonly { target: "host"; backend: "wasmgc" | "linear" }[] = BOTH_BACKENDS,
  ) {
    const ast = analyzeMultiSource(files, "./entry.ts");
    return prepareWholeIrProgram({
      sourceFiles: ast.sourceFiles,
      entrySource: ast.entryFile,
      checker: ast.checker,
      policy: { target: "host", backend: "wasmgc" },
      runtimePolicies,
      deferTopLevelInit: false,
    });
  }

  it("common backend subset: A's program survives codec replay and runs on both backends", async () => {
    const result = prepare(COMMON_SUBSET);
    expect(result.kind, result.kind === "prepared" ? "" : `${result.kind} ${result.code}: ${result.detail}`).toBe(
      "prepared",
    );
    if (result.kind !== "prepared") return;
    const encoded = encodePreparedIrProgram(result.program);
    const decoded = decodePreparedIrProgram(encoded);
    expect(encodePreparedIrProgram(decoded)).toBe(encoded);
    expect(preparedIrDataMismatch(result.program, decoded)).toBeUndefined();
    // `double` is exported by math.ts, not by the entry module, so it is a body but not a module export.
    expect(decoded.ir.functions.map((fn) => fn.name).sort()).toEqual(expect.arrayContaining(["double", "main"]));
    const calls: OracleCall[] = [{ export: "main", args: [], expected: 42 }];
    for (const backend of ["wasmgc", "linear"] as const) {
      const outcome = await replayProgram(decoded, replayOptions(backend));
      // A plan gap here is a finding about the subset (e.g. an executable startup body), not a pass.
      expect(outcome.kind, `${backend}: ${outcome.kind === "ran" ? "" : JSON.stringify(outcome, null, 1)}`).toBe("ran");
      if (outcome.kind !== "ran") return;
      const rows = compareExports(outcome.run.exports, calls);
      for (const row of rows) {
        expect(row.match, `${backend}: ${row.export} = ${row.actual}, expected ${row.expected}`).toBe(true);
      }
    }
  });

  it("original mixed application: exact pinned sources, codec-identical, acceptance recorded per backend", () => {
    const pathNulContent = createHash("sha256");
    for (const [path, text] of Object.entries(ORIGINAL_MIXED)) {
      pathNulContent.update(path).update("\0").update(text).update("\0");
    }
    const candidates = {
      pathNulContent: pathNulContent.digest("hex"),
      concatenated: createHash("sha256").update(Object.values(ORIGINAL_MIXED).join("")).digest("hex"),
      json: createHash("sha256").update(JSON.stringify(ORIGINAL_MIXED)).digest("hex"),
    };
    expect(
      Object.values(candidates).includes(ORIGINAL_MIXED_DIGEST),
      `no digest recipe reproduces D's pinned ${ORIGINAL_MIXED_DIGEST}: ${JSON.stringify(candidates)}`,
    ).toBe(true);

    // Requesting a linear projection for the async application is a typed, located capability gap
    // at preparation time (B's runtime has no linear Promise adapter) — recorded, not worked around.
    const withLinear = prepare(ORIGINAL_MIXED);
    expect(withLinear.kind).toBe("unsupported");
    if (withLinear.kind === "unsupported") {
      expect(withLinear.detail).toMatch(/promise\.capability\.create has no linear adapter/);
      expect(withLinear.sourceFile).toBe("entry.ts");
    }

    const result = prepare(ORIGINAL_MIXED, [{ target: "host", backend: "wasmgc" }]);
    expect(
      result.kind,
      result.kind === "prepared" ? "" : `${result.kind} ${result.code}: ${result.detail} @ ${result.sourceFile}`,
    ).toBe("prepared");
    if (result.kind !== "prepared") return;
    expect(result.program.inventory.terminalUnits).toHaveLength(7);
    expect(result.program.runtime.map((projection) => `${projection.backend}:${projection.target}`)).toEqual([
      "wasmgc:host",
    ]);
    const encoded = encodePreparedIrProgram(result.program);
    const decoded = decodePreparedIrProgram(encoded);
    expect(encodePreparedIrProgram(decoded)).toBe(encoded);
    expect(preparedIrDataMismatch(result.program, decoded)).toBeUndefined();

    const wasmgc = acceptPreparedIrProgram(decoded, replayOptions("wasmgc"));
    expect(wasmgc.kind, wasmgc.kind === "accepted" ? "" : `${wasmgc.kind} ${wasmgc.code}: ${wasmgc.detail}`).toBe(
      "accepted",
    );
    const linear = acceptPreparedIrProgram(decoded, replayOptions("linear"));
    expect(linear.kind).toBe("unsupported");
    if (linear.kind === "unsupported") expect(linear.detail).toMatch(/no linear:host runtime projection/);
    console.info(
      `[#3518 C] original mixed application: wasmgc:host ${wasmgc.kind}; linear:host ${linear.kind}${
        linear.kind === "accepted" ? "" : ` (${linear.code}: ${linear.detail})`
      }`,
    );
  });

  it("original mixed application: the scalar-subset plan reports its gaps instead of emitting a smaller module", async () => {
    const result = prepare(ORIGINAL_MIXED, [{ target: "host", backend: "wasmgc" }]);
    if (result.kind !== "prepared") throw new Error(result.detail);
    const decoded = decodePreparedIrProgram(encodePreparedIrProgram(result.program));
    const outcome = await replayProgram(decoded, replayOptions("wasmgc"));
    expect(outcome.kind).toBe("plan-gap");
    if (outcome.kind !== "plan-gap") return;
    expect(outcome.gaps).toEqual(expect.arrayContaining(["executable startup unit", "runtime providers"]));
  });
});

describe("#3518 C — fresh-process replay", () => {
  it("replays the encoded program in a child that loads no TypeScript or source frontend and fails closed", () => {
    const fixture = buildCodecFixture();
    const encoded = encodePreparedIrProgram(fixture.program);
    const dir = mkdtempSync(join(tmpdir(), "ir-whole-program-replay-"));
    try {
      const file = join(dir, "program.json");
      const oracleFile = join(dir, "oracle.json");
      writeFileSync(file, encoded);
      writeFileSync(
        oracleFile,
        JSON.stringify({
          targets: [
            { backend: "wasmgc", target: "host" },
            { backend: "linear", target: "host" },
          ],
          calls: CODEC_FIXTURE_ORACLE.calls,
        }),
      );
      const run = (encodedPath: string, oraclePath: string) =>
        spawnSync(
          process.execPath,
          ["--import", "tsx", "scripts/ir-whole-program-replay.mjs", encodedPath, oraclePath],
          { cwd: REPO_ROOT, encoding: "utf8", timeout: 180_000 },
        );
      const child = run(file, oracleFile);
      const report = JSON.parse(child.stdout.trim().split("\n").at(-1)!) as {
        ok: boolean;
        digest: string;
        reencodedIdentical: boolean;
        decodeFailure?: string;
        failures?: string[];
        targets: Record<string, { kind: string; bytes?: number; emittedUnits?: number; rows?: { match: boolean }[] }>;
        frontendModules: string[];
        typescriptModules: string[];
        loadedModuleCount: number;
      };
      const summary = JSON.stringify(
        { failures: report.failures, frontend: report.frontendModules, typescript: report.typescriptModules },
        null,
        1,
      );
      expect(report.decodeFailure, summary).toBeUndefined();
      expect(report.digest).toBe(digestEncodedPreparedIrProgram(encoded));
      expect(report.reencodedIdentical).toBe(true);
      expect(report.loadedModuleCount).toBeGreaterThan(10);
      for (const key of ["wasmgc:host", "linear:host"]) {
        const target = report.targets[key]!;
        expect(target.kind, `${key}: ${summary}`).toBe("ran");
        expect(target.emittedUnits).toBe(4);
        expect(target.rows?.every((row) => row.match)).toBe(true);
      }
      expect(report.frontendModules, summary).toEqual([]);
      expect(report.typescriptModules, summary).toEqual([]);
      expect(report.ok, summary).toBe(true);
      expect(child.status, child.stderr).toBe(0);

      // Fail-closed control: a non-canonical byte must produce a nonzero exit and a decode failure.
      writeFileSync(file, `${encoded}\n`);
      const corrupted = run(file, oracleFile);
      expect(corrupted.status).toBe(1);
      const corruptedReport = JSON.parse(corrupted.stdout.trim().split("\n").at(-1)!) as {
        ok: boolean;
        decodeFailure?: string;
      };
      expect(corruptedReport.ok).toBe(false);
      expect(corruptedReport.decodeFailure).toMatch(/not canonical/);

      // Fail-closed control: an oracle mismatch must produce a nonzero exit even though everything ran.
      writeFileSync(file, encoded);
      writeFileSync(
        oracleFile,
        JSON.stringify({
          targets: [{ backend: "wasmgc", target: "host" }],
          calls: [{ export: "main", args: [], expected: 41 }],
        }),
      );
      const mismatched = run(file, oracleFile);
      expect(mismatched.status).toBe(1);
      expect(mismatched.stdout).toContain('"expected":"41"');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
