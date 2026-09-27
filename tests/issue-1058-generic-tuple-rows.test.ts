// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";
import { compileProject } from "../src/index.js";

const helper = `
export function collect<T extends any[]>(data:T[]):number {
 let total=0;for(const row of data)total+=row.map(value=>String(value)).join(',').length;return total;
}
export function same<T extends any[]>(rows:T[],expected:T){return rows[0]===expected;}
export function callbackIdentity<T extends any[]>(rows:T[]){const row=rows[0];return row.map((v,i,a)=>a===row?1:0).join(',');}
export function reduceIdentity<T extends any[]>(rows:T[]){const row=rows[0];return row.reduce((acc,v,i,a)=>acc+(a===row?1:0),0);}
export function indexedMutation<T extends any[]>(rows:T[]){rows[0][1]='z';return rows[0][1]==='z'?1:0;}
export function mutate<T extends any[]>(rows:T[]){
 const row=rows[0];let seen=0;
 const mapped=row.map((v,i,a)=>{if(a===row)seen++;if(i===0)a[1]='z';return String(v);});
 return seen*100+(mapped[1]==='z'?10:0)+(row[1]==='z'?1:0);
}
export function readonlyRows<T extends readonly any[]>(rows:readonly T[]){return rows[0].map(v=>String(v)).join(',').length;}
`;
const cases = [
  [
    "named Object.entries numeric values",
    "const object={a:7,b:8};const rows=Object.entries(object);return rows.length*100+rows[0][1]*10+rows[1][1];",
    278,
  ],
  [
    "named Object.entries mutable pair",
    "const object={a:7};const row=Object.entries(object)[0];const alias:any=row;alias[1]=8;alias.push(9);return row.length*100+row[1]*10+alias[2];",
    389,
  ],
  [
    "named Object.entries string values",
    "const object={a:'z'};const row=Object.entries(object)[0];return (row[0]==='a'?10:0)+(row[1]==='z'?1:0);",
    11,
  ],
  [
    "named Object.entries Map initializer",
    "const object={a:7,b:8};const map=new Map(Object.entries(object));return map.get('a')!*10+map.get('b')!;",
    78,
  ],
  [
    "Object.entries numeric values",
    "const rows=Object.entries({a:7,b:8});return rows.length*100+rows[0][1]*10+rows[1][1];",
    278,
  ],
  [
    "Object.entries mutable pair",
    "const row=Object.entries({a:7})[0];const alias:any=row;alias[1]=8;alias.push(9);return row.length*100+row[1]*10+alias[2];",
    389,
  ],
  [
    "Object.entries string values",
    "const row=Object.entries({a:'z'})[0];return (row[0]==='a'?10:0)+(row[1]==='z'?1:0);",
    11,
  ],
  [
    "Object.entries Map initializer",
    "const map=new Map(Object.entries({a:7,b:8}));return map.get('a')!*10+map.get('b')!;",
    78,
  ],
  [
    "tuple grows through an alias",
    "const row:[string,boolean]=['a',true];const alias:any=row;alias.push(7);return row.length*10+alias[2];",
    37,
  ],
  [
    "readonly tuple is not frozen",
    "const row:readonly [string,boolean]=['a',true];const alias:any=row;alias[0]='z';return row[0]==='z'?1:0;",
    1,
  ],
  [
    "optional tuple keeps actual length",
    "const row:[string,number?]=['a'];return row.length*10+(row[1]===undefined?1:0);",
    11,
  ],
  [
    "empty tuple grows",
    "const row:[]=[];const alias:any=row;alias.push('z');return row.length*10+(alias[0]==='z'?1:0);",
    11,
  ],
  [
    "tuple spread retains all values",
    "const tail:[number,boolean]=[7,true];const row:[string,number,boolean]=['a',...tail];return row.length*100+row[1]*10+(row[2]?1:0);",
    371,
  ],
  [
    "tuple shape does not brand ordinary objects",
    "const row:[string,string]=['a','b'];const object:any={a:'a',b:'b'};return (Array.isArray(row)?1:0)+(Array.isArray(object)?10:0);",
    1,
  ],
  [
    "mixed tuple rows",
    "const rows:[string,string,boolean][]=[['a','b',true],['c','d',false]];return collect(rows);",
    17,
  ],
  ["empty rows", "const rows:[string,string,boolean][]=[];return collect(rows);", 0],
  ["numeric vector rows", "const rows:number[][]=[[1,2],[3,4]];return collect(rows);", 6],
  ["row identity", "const row:[string,boolean]=['a',true];return same([row],row)?1:0;", 1],
  ["callback identity", "const row:[string,boolean]=['a',true];return callbackIdentity([row])==='1,1'?1:0;", 1],
  ["reduce callback identity", "const row:[string,boolean]=['a',true];return reduceIdentity([row]);", 2],
  [
    "vector callback mutation",
    "const row:(string|boolean)[]=['a','b',true];const result=mutate([row]);return result+(row[1]==='z'?1000:0);",
    1311,
  ],
  [
    "indexed mutation",
    "const row:[string,string]=['a','b'];const result=indexedMutation([row]);return result+(row[1]==='z'?10:0);",
    11,
  ],
  [
    "callback identity and live mutation",
    "const row:[string,string,boolean]=['a','b',true];const result=mutate([row]);return result+(row[1]==='z'?1000:0);",
    1311,
  ],
  ["readonly tuple constraint", "const row:readonly [string,boolean]=['a',true];return readonlyRows([row]);", 6],
] as const;

for (const experimentalIR of [false, true])
  for (const [name, body, expected] of cases) {
    it(`${name} IR=${experimentalIR}`, async () => {
      const main = `export function run(){${body}}`;
      const native: { run?: () => number } = {};
      new Function(
        "exports",
        ts.transpileModule(helper + main, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText,
      )(native);
      expect(native.run!()).toBe(expected);
      const dir = mkdtempSync(join(tmpdir(), "ts5-tuple-rows-"));
      try {
        writeFileSync(join(dir, "helper.ts"), helper);
        writeFileSync(
          join(dir, "main.ts"),
          'import {collect,same,callbackIdentity,reduceIdentity,indexedMutation,mutate,readonlyRows} from "./helper.js";\n' +
            main,
        );
        const result = await compileProject(join(dir, "main.ts"), {
          target: "standalone",
          experimentalIR,
          skipSemanticDiagnostics: true,
        });
        expect(result.success, JSON.stringify(result.errors)).toBe(true);
        const module = new WebAssembly.Module(result.binary);
        expect(WebAssembly.Module.imports(module)).toEqual([]);
        expect((new WebAssembly.Instance(module).exports.run as () => number)()).toBe(expected);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }
