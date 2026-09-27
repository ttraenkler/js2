// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import ts from "typescript";
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

const cases = [
  [
    "string",
    "const a:(string|boolean)[]=['a',true];write(a,'z');return (a[0]==='z'?1:0)+(read(a)==='z'?2:0)+(typeof read(a)==='string'?4:0);",
    7,
  ],
  [
    "boolean",
    "const a:(string|boolean)[]=['a',true];write(a,false);return (a[0]===false?1:0)+(read(a)===false?2:0)+(typeof read(a)==='boolean'?4:0);",
    7,
  ],
  [
    "number",
    "const a:(string|number)[]=['a',1];write(a,42);return (a[0]===42?1:0)+(read(a)===42?2:0)+(typeof read(a)==='number'?4:0);",
    7,
  ],
  [
    "object identity",
    "const o={v:7};const a:(number|{v:number})[]=[1,o];write(a,o);return (a[0]===o?1:0)+(read(a)===o?2:0);",
    3,
  ],
  [
    "null",
    "const a:(string|boolean|null)[]=['a',true];write(a,null);return (a[0]===null?1:0)+(read(a)===null?2:0);",
    3,
  ],
  [
    "undefined",
    "const a:(string|boolean|undefined)[]=['a',true];write(a,undefined);return (a[0]===undefined?1:0)+(read(a)===undefined?2:0);",
    3,
  ],
  [
    "descriptor write",
    "const a:(string|boolean)[]=['a',true];Object.defineProperty(a,'0',{value:'z'});return a[0]==='z'?1:0;",
    1,
  ],
  [
    "refused descriptor write",
    "const a:(string|boolean)[]=['a',true];Object.defineProperty(a,'0',{writable:false});try{write(a,'z');}catch{}return a[0]==='a'?1:0;",
    1,
  ],
] as const;

for (const experimentalIR of [false, true])
  for (const [name, body, expected] of cases) {
    it(`${name} IR=${experimentalIR}`, async () => {
      const source = `function write(a:any,v:any){a[0]=v;}function read(a:any){return a[0];}export function run(){${body}}`;
      const native: { run?: () => number } = {};
      new Function(
        "exports",
        ts.transpileModule(source, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText,
      )(native);
      expect(native.run!()).toBe(expected);
      const result = await compile(source, { target: "standalone", experimentalIR });
      expect(result.success, JSON.stringify(result.errors)).toBe(true);
      const module = new WebAssembly.Module(result.binary);
      expect(WebAssembly.Module.imports(module)).toEqual([]);
      expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(expected);
    });
  }
