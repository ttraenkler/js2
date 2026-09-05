// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
//
// #3518 package C — fresh-process replay of an encoded PreparedIrProgram.
//
//   node --import tsx scripts/ir-whole-program-replay.mjs <encoded.json>
//
// The child decodes the bytes, consumes the SAME decoded object for both
// backends, assembles/instantiates each module and prints one JSON report to
// stdout. A module-resolution hook records every module the process loads so
// the report can prove, rather than assert, that no source frontend
// (`src/ir/from-ast`, `src/compiler`, `src/checker`, `src/index`) took part.
// Whether the TypeScript library itself was loaded is reported separately: it
// is a measured fact about the import graph, not a pass/fail criterion the
// codec can decide on its own (see the package C handoff notes).

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { MessageChannel } from "node:worker_threads";

const FRONTEND_MODULES = [
  /\/src\/ir\/from-ast\./,
  /\/src\/compiler\./,
  /\/src\/checker\//,
  /\/src\/index\./,
  /\/src\/codegen\/index\./,
];
const TYPESCRIPT_MODULES = [/\/node_modules\/typescript\//, /\/node_modules\/typescript7\//, /\/src\/ts-api\./];

const { port1, port2 } = new MessageChannel();
const loaded = [];
port1.on("message", (url) => loaded.push(url));
port1.unref();
register(
  `data:text/javascript,${encodeURIComponent(`
    let port;
    export function initialize(data) { port = data.port; }
    export async function resolve(specifier, context, next) {
      const result = await next(specifier, context);
      port.postMessage(result.url);
      return result;
    }
  `)}`,
  { parentURL: import.meta.url, data: { port: port2 }, transferList: [port2] },
);

const [, , encodedPath] = process.argv;
if (!encodedPath) {
  console.error("usage: node --import tsx scripts/ir-whole-program-replay.mjs <encoded.json>");
  process.exit(2);
}

const { decodePreparedIrProgram, digestEncodedPreparedIrProgram, encodePreparedIrProgram } =
  await import("../src/ir/program-codec.ts");
const { replayProgram, runFixtureExports } = await import("../tests/helpers/ir-whole-program-replay.ts");

const text = readFileSync(encodedPath, "utf8");
const report = {
  digest: digestEncodedPreparedIrProgram(text),
  reencodedIdentical: false,
  backends: {},
  frontendModules: [],
  typescriptModules: [],
  loadedModuleCount: 0,
};

try {
  const program = decodePreparedIrProgram(text);
  report.reencodedIdentical = encodePreparedIrProgram(program) === text;
  for (const backend of ["wasmgc", "linear"]) {
    try {
      const run = await replayProgram(program, backend);
      report.backends[backend] = { kind: "ran", bytes: run.bytes, results: runFixtureExports(run.exports) };
    } catch (error) {
      report.backends[backend] = { kind: "failed", detail: error instanceof Error ? error.message : String(error) };
    }
  }
} catch (error) {
  report.decodeFailure = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

// Let the hook thread flush its last messages before reading the record.
await new Promise((resolve) => setTimeout(resolve, 50));
report.loadedModuleCount = loaded.length;
report.frontendModules = loaded.filter((url) => FRONTEND_MODULES.some((pattern) => pattern.test(url)));
report.typescriptModules = loaded.filter((url) => TYPESCRIPT_MODULES.some((pattern) => pattern.test(url)));
process.stdout.write(`${JSON.stringify(report)}\n`);
