// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import ts from "typescript";

/** Retain the pinned harness's assertion augmentation without its chai bootstrap. */
export function typescriptHarnessAugmentation(source) {
  const file = ts.createSourceFile("harnessGlobals.ts", source, ts.ScriptTarget.Latest, true);
  const blocks = file.statements.filter(ts.isBlock);
  if (file.parseDiagnostics.length || blocks.length !== 1) throw new Error("TypeScript harness augmentation changed");
  const block = blocks[0].getText(file);
  if (!block.includes("assert.deepEqual =") || !block.includes("arrayExtraKeysObject")) {
    throw new Error("TypeScript array assertion augmentation missing");
  }
  return block;
}
