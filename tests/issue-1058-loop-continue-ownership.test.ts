// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { ts } from "../src/frontend/typescript.js";
import { sourceLoopContinues } from "../src/frontend/ts/loop-continues.js";

function inspect(body: string) {
  const file = ts.createSourceFile("loop.ts", `for (const x of values) ${body}`, ts.ScriptTarget.Latest, true);
  return sourceLoopContinues((file.statements[0] as ts.ForOfStatement).statement);
}

it.each([
  ["{ if (x) continue; else { continue; } }", 2],
  ["{ for (const y of x) { continue; } if (x) continue; }", 1],
  ["{ while (x) { break; } function nested() { while (x) continue; } }", 0],
  ["{ switch (x) { case 0: break; default: continue; } }", 1],
  ["continue;", 1],
] as const)("identifies only this source loop's continues: %s", (body, count) => {
  expect(inspect(body)).toHaveLength(count);
});

it.each(["{ break; }", "{ continue outer; }", "{ label: { break label; } }", "{ while (x) continue outer; }"])(
  "declines unresolved jump destinations: %s",
  (body) => expect(inspect(body)).toBeUndefined(),
);
