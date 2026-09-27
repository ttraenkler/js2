// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import ts from "typescript";
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

const append = `
function append<T extends {}>(to:T[],value:T|undefined):T[];
function append<T extends {}>(to:T[]|undefined,value:T):T[];
function append<T extends {}>(to:T[]|undefined,value:T|undefined):T[]|undefined;
function append<T extends {}>(to:T[]|undefined,value:T|undefined):T[]|undefined {
  if(value===undefined)return to;
  if(to===undefined)return [value];
  to.push(value);return to;
}`;
const cases = [
  [
    "optional directive list",
    "interface D{range:{pos:number;end:number};type:number;}let a:D[]|undefined;a=append(a,{range:{pos:10,end:15},type:0});a=append(a,{range:{pos:30,end:35},type:1});return a.length+a[0].range.pos+a[1].range.end;",
    47,
  ],
  ["numeric vector alias", "const a=[2,3];const b=append(a,7);return a.length*100+b[2];", 307],
  ["string vector alias", "const a=['a','b'];const b=append(a,'c');return a.length*100+b[2].length;", 301],
  [
    "undefined value leaves vector unchanged",
    "const a=[2,3];const b=append(a,undefined);return a.length*100+b[1];",
    203,
  ],
  ["empty optional vector remains undefined", "const a=append(undefined,undefined);return a===undefined?7:0;", 7],
  [
    "multi-argument evaluation order",
    "function push<T>(a:T[]|undefined,x:T,y:T){if(a===undefined)return 0;return a.push(x,y);}const a=[1];return push(a,2,3)*100+a[1]*10+a[2];",
    323,
  ],
  [
    "zero-argument length",
    "function size<T>(a:T[]|undefined){if(a===undefined)return 0;return a.push();}return size([1,2,3]);",
    3,
  ],
] as const;

for (const experimentalIR of [false, true])
  for (const [name, body, expected] of cases) {
    it(`${name} IR=${experimentalIR}`, async () => {
      const source = append + `export function run(){${body}}`;
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
