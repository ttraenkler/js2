// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
// Exact upstream option helpers: imported and same-source callable aliases.
import {
  getEmitScriptTarget,
  getEmitStandardClassFields,
  getUseDefineForClassFields,
} from "../.npm-upstream-suites/typescript/src/compiler/utilities.js";
import { ScriptTarget, type CompilerOptions } from "../.npm-upstream-suites/typescript/src/compiler/types.js";

function options(): CompilerOptions {
  return { target: ScriptTarget.Latest, noLib: true, strict: true };
}

export function runTarget(): number {
  return getEmitScriptTarget(options());
}

export function runDefine(): number {
  return getUseDefineForClassFields(options()) ? 1 : 0;
}

export function runStandard(): number {
  return getEmitStandardClassFields(options()) ? 1 : 0;
}
