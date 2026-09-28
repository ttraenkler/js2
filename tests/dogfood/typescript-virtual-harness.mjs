// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const JSON_REFERENCES = [
  "JSX.errors.txt",
  "Two_comma-separated_objects.errors.txt",
  "Two_objects.errors.txt",
  "TypeScript_code.errors.txt",
  "trailing_identifier.errors.txt",
];

/** Use upstream's real in-memory System without depending on Node at test time. */
export function sourceUnitVirtualHarness(name, root, generatedPath) {
  if (name !== "jsonParserRecovery") return { modules: [], importSource: "" };
  const directory = dirname(generatedPath);
  const specifier = (path) => JSON.stringify("./" + relative(directory, path).replace(/\\/g, "/"));
  const upstream = (path) => specifier(join(root, "src", path));
  const virtualRoot = "/typescript";
  const references = Object.fromEntries(
    JSON_REFERENCES.map((file) => {
      const path = "tests/baselines/reference/jsonParserRecovery/" + file;
      return [virtualRoot + "/" + path, readFileSync(join(root, path), "utf8")];
    }),
  );
  const preludePath = join(directory, "json-harness-prelude.ts");
  const bootstrapPath = join(directory, "json-harness-init.ts");
  // Harness and fakes form a cycle. Install only the eagerly-read System
  // surface first; the original System takes over before any test executes.
  const prelude = `
    import * as ts from ${upstream("services/_namespaces/ts.js")};
    import { findUpRoot } from ${upstream("harness/findUpDir.js")};
    let system: ts.System | undefined;
    ts.setSys({
      getAccessibleFileSystemEntries: (path: string) => {
        if (!system) throw new Error("System used before initialization");
        return system.getAccessibleFileSystemEntries!(path);
      },
      getEnvironmentVariable: () => "",
    } as ts.System);
    findUpRoot.cached = ${JSON.stringify(virtualRoot)};
    export function installSystem(value: ts.System): void {
      system = value;
      ts.setSys(value);
    }
  `;
  const bootstrap = `
    import { installSystem } from "./json-harness-prelude.js";
    import * as Harness from ${upstream("harness/_namespaces/Harness.js")};
    import * as fakes from ${upstream("harness/fakesHosts.js")};
    import * as vfs from ${upstream("harness/vfsUtil.js")};
    import * as vpath from ${upstream("harness/vpathUtil.js")};
    const filesystem = new vfs.FileSystem(false, {
      cwd: ${JSON.stringify(virtualRoot)}, files: ${JSON.stringify(references)}, time: 0,
    });
    export const system = new fakes.System(filesystem, { executingFilePath: "/built/local/run.js", env: {} });
    installSystem(system);
    Harness.setHarnessIO({ ...Harness.IO,
      directoryName: (path: string) => vpath.dirname(path),
      joinPath: (...paths: string[]) => vpath.combine(...paths),
      createDirectory: (path: string) => system.createDirectory(path),
      deleteFile: (path: string) => system.deleteFile(path),
    });
  `;
  return {
    modules: [
      [preludePath, prelude],
      [bootstrapPath, bootstrap],
    ],
    importSource: 'import "./json-harness-init.js";\n',
  };
}
