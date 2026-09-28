// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Worker } from "node:worker_threads";

it("renders actual standalone guest exceptions without accepting failed or missing exports", async () => {
  const root = mkdtempSync(join(tmpdir(), "ts5-probe-error-"));
  try {
    const entry = join(root, "entry.ts");
    writeFileSync(
      entry,
      `
      export function fail(): number { throw new TypeError("checker guest failure"); }
      export function pass(): number { return 17; }
    `,
    );
    const worker = new Worker(new URL("./typescript-upstream-build-worker.mjs", import.meta.url), {
      workerData: {
        entry,
        requestedTarget: "standalone",
        requiredInvocations: 3,
        invocationCases: ["fail", "pass", "missing"].map((name) => ({
          name,
          exportName: name,
          input: null,
          expected: 17,
          zeroArguments: true,
        })),
      },
    });
    const result = await new Promise<{
      success: boolean;
      compileSuccess: boolean;
      validates: boolean;
      moduleImports: unknown[];
      invocations: { error?: string; matches: boolean; actual?: number }[];
    }>((resolve, reject) => {
      let terminal: Parameters<typeof resolve>[0] | undefined;
      worker.on("message", (message) => {
        if (message.type === "result") terminal = message;
        if (message.type === "error") reject(new Error(message.message));
      });
      worker.on("error", reject);
      worker.on("exit", (code) => {
        if (code !== 0 || !terminal) reject(new Error(`Worker exited ${code} without a result`));
        else resolve(terminal);
      });
    });
    expect(result.compileSuccess).toBe(true);
    expect(result.validates).toBe(true);
    expect(result.moduleImports).toEqual([]);
    expect(result.success).toBe(false);
    expect(result.invocations).toHaveLength(3);
    expect(result.invocations[0]!.error).toBe("TypeError: checker guest failure");
    expect(result.invocations[0]!.matches).toBe(false);
    expect(result.invocations[1]!.actual).toBe(17);
    expect(result.invocations[1]!.matches).toBe(true);
    expect(result.invocations[2]!.error).toBe("Missing export missing");
    expect(result.invocations[2]!.matches).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 120_000);
