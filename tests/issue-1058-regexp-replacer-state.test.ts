// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

const source = String.raw`
function lower(x: string): string { return x.toLowerCase(); }
export function repeated(): number {
  const re = /[^\u0130\u0131\u00DFa-z0-9\\/:\-_. ]+/g;
  function canonical(x: string): string { return re.test(x) ? x.replace(re, lower) : x; }
  const a = canonical('/user/UserName/projects/Project/file.ts');
  const b = canonical('/user/UserName/projects/projectß/file.ts');
  const c = canonical('/user/UserName/projects/İproject/file.ts');
  return (a === '/user/username/projects/project/file.ts' ? 1 : 0)
    | (b === '/user/username/projects/projectß/file.ts' ? 2 : 0)
    | (c === '/user/username/projects/İproject/file.ts' ? 4 : 0);
}
export function state(): number {
  const re = /[A-Z]/g;
  re.test('AbC');
  let calls = 0;
  let observed = 0;
  const out = 'AbC'.replace(re, (match: string): string => {
    observed = observed * 10 + re.lastIndex;
    re.lastIndex = 4;
    calls++;
    return match.toLowerCase();
  });
  return out === 'abc' && calls === 2 && observed === 4 && re.lastIndex === 4 ? 1 : 0;
}
export function noMatch(): number {
  const re = /Z/g;
  re.lastIndex = 9;
  const out = 'abc'.replace(re, lower);
  return out === 'abc' && re.lastIndex === 0 ? 1 : 0;
}
export function nonGlobal(): number {
  const re = /A/;
  re.lastIndex = 9;
  const out = 'AbA'.replace(re, lower);
  return out === 'abA' && re.lastIndex === 9 ? 1 : 0;
}
export function throwing(): number {
  const re = /A/g;
  re.lastIndex = 9;
  try { 'AA'.replace(re, (): string => { throw new Error('stop'); }); }
  catch { return re.lastIndex === 0 ? 1 : 0; }
  return 0;
}
`;

it.each([true, false])("preserves global regexp state before and during replacers (IR=%s)", async (experimentalIR) => {
  const result = await compile(source, { target: "standalone", experimentalIR });
  expect(result.success, JSON.stringify(result.errors)).toBe(true);
  const module = new WebAssembly.Module(result.binary);
  expect(WebAssembly.Module.imports(module)).toEqual([]);
  const exports = new WebAssembly.Instance(module, {}).exports;
  for (const [name, expected] of Object.entries({ repeated: 7, state: 1, noMatch: 1, nonGlobal: 1, throwing: 1 })) {
    expect((exports[name] as () => number)(), name).toBe(expected);
  }
});
