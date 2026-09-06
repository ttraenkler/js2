// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
//
// #3518 package C — fresh-process replay of an encoded PreparedIrProgram.
//
//   node --import tsx scripts/ir-whole-program-replay.mjs <encoded.json> <oracle.json>
//
// oracle.json: { "targets": [{ "backend", "target" }], "calls": [{ "export", "args", "expected" }] }
// where `expected` is plain JSON or a codec-style tag ({"$bigint":"…"} / {"$number":"Infinity"}).
//
// The child decodes the bytes through the complete (re-authenticating) decode,
// accepts and emits the SAME decoded object for every requested backend/target,
// instantiates each module and compares the program's own declared exports with
// the separately pinned oracle. A module-resolution hook records every module
// the process loads. The child FAILS CLOSED (exit 1) when: the bytes do not
// decode or re-encode identically, any target fails to accept/emit/run or
// mismatches the oracle, the census is empty, or any TypeScript / source
// frontend / compiler module was loaded. A physical-plan capability gap is a
// failure too — it is incomplete coverage, never success. Exit 2 is usage.

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { MessageChannel } from "node:worker_threads";

const FRONTEND_MODULES = [
  /\/src\/ir\/from-ast\./,
  /\/src\/compiler\./,
  /\/src\/checker\//,
  /\/src\/index\./,
  /\/src\/codegen\/index\./,
  /\/src\/codegen-linear\/index\./,
  /\/src\/ir\/async-from-ast\./,
  /\/src\/ir\/async-prepare\./,
  /\/src\/ir\/runtime-program-producers\./,
  /\/src\/ir\/program-source\./,
  /\/src\/ir\/program-preparation\./,
];
const TYPESCRIPT_MODULES = [/\/node_modules\/typescript\//, /\/node_modules\/typescript7\//, /\/src\/ts-api\./];

const { port1, port2 } = new MessageChannel();
/** @type {{ url: string, parent: string | undefined }[]} */
const loaded = [];
port1.on("message", (record) => loaded.push(record));
port1.unref();
register(
  `data:text/javascript,${encodeURIComponent(`
    let port;
    export function initialize(data) { port = data.port; }
    export async function resolve(specifier, context, next) {
      const result = await next(specifier, context);
      port.postMessage({ url: result.url, parent: context.parentURL });
      return result;
    }
  `)}`,
  { parentURL: import.meta.url, data: { port: port2 }, transferList: [port2] },
);

const [, , encodedPath, oraclePath] = process.argv;
if (!encodedPath || !oraclePath) {
  console.error("usage: node --import tsx scripts/ir-whole-program-replay.mjs <encoded.json> <oracle.json>");
  process.exit(2);
}

const report = {
  digest: undefined,
  reencodedIdentical: false,
  decodeFailure: undefined,
  targets: {},
  loadedModuleCount: 0,
  frontendModules: [],
  typescriptModules: [],
  ok: false,
};

let failed = false;
const fail = (why) => {
  failed = true;
  report.failures = [...(report.failures ?? []), why];
};

try {
  const { decodePreparedIrProgram, digestEncodedPreparedIrProgram, encodePreparedIrProgram } =
    await import("../src/ir/program-codec.ts");
  const { compareExports, replayOptions, replayProgram } = await import("../tests/helpers/ir-whole-program-replay.ts");

  const text = readFileSync(encodedPath, "utf8");
  const oracle = JSON.parse(readFileSync(oraclePath, "utf8"));
  report.digest = digestEncodedPreparedIrProgram(text);
  const program = decodePreparedIrProgram(text);
  report.reencodedIdentical = encodePreparedIrProgram(program) === text;
  if (!report.reencodedIdentical) fail("decoded program does not re-encode to the input bytes");

  for (const { backend, target } of oracle.targets) {
    const key = `${backend}:${target}`;
    try {
      const outcome = await replayProgram(program, replayOptions(backend, target));
      if (outcome.kind === "not-accepted") {
        report.targets[key] = { kind: "not-accepted", failure: outcome.failure };
        fail(`${key}: not accepted (${outcome.failure.kind} ${outcome.failure.code}: ${outcome.failure.detail})`);
        continue;
      }
      if (outcome.kind === "plan-gap") {
        report.targets[key] = { kind: "plan-gap", gaps: outcome.gaps };
        fail(`${key}: physical plan gap — ${outcome.gaps.join(", ")}`);
        continue;
      }
      const rows = compareExports(outcome.run.exports, oracle.calls);
      const emitted = outcome.run.emitted.emittedUnitIds;
      report.targets[key] = {
        kind: "ran",
        bytes: outcome.run.bytes,
        emittedUnits: emitted.length,
        projectionUnits: outcome.run.accepted.runtime.prepared.functions.length,
        rows,
      };
      if (emitted.length !== outcome.run.accepted.runtime.prepared.functions.length)
        fail(`${key}: emitted unit receipts differ from the projection`);
      for (const row of rows)
        if (!row.match) fail(`${key}: ${row.export}(${row.args.join(",")}) = ${row.actual}, expected ${row.expected}`);
    } catch (error) {
      report.targets[key] = {
        kind: "threw",
        detail: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      };
      fail(`${key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} catch (error) {
  report.decodeFailure = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  fail(report.decodeFailure);
}

// Let the hook thread flush its last messages before reading the record.
await new Promise((resolve) => setTimeout(resolve, 50));
report.loadedModuleCount = loaded.length;
const chain = (record) => (record.parent ? `${record.url} <- ${record.parent}` : record.url);
report.frontendModules = loaded.filter(({ url }) => FRONTEND_MODULES.some((pattern) => pattern.test(url))).map(chain);
report.typescriptModules = loaded
  .filter(({ url }) => TYPESCRIPT_MODULES.some((pattern) => pattern.test(url)))
  .map(chain);
if (report.loadedModuleCount === 0) fail("module-load census is empty; the hook recorded nothing");
if (report.frontendModules.length > 0)
  fail(`source frontend modules were loaded: ${report.frontendModules.join("; ")}`);
if (report.typescriptModules.length > 0) fail(`TypeScript modules were loaded: ${report.typescriptModules.join("; ")}`);
report.ok = !failed;
process.stdout.write(`${JSON.stringify(report)}\n`);
process.exit(failed ? 1 : 0);
