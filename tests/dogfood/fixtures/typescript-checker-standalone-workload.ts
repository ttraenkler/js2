// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
// Keep input strings inside Wasm; the standalone boundary carries only numbers.
import { runCase } from "./typescript-checker-workload.js";

export function runAssignMismatch(): number {
  return runCase('const x: number = "str";\n');
}

export function runAssignOk(): number {
  return runCase("const x: number = 1;\n");
}

export function runTwoMismatches(): number {
  return runCase('const a: string = 1;\nconst b: boolean = "s";\n');
}
