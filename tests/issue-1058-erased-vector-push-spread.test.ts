// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import ts from "typescript";
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

const core = `interface Directive{range:{pos:number;end:number};type:number;}
function append<T extends {}>(to:T[]|undefined,value:T|undefined):T[]|undefined{
 if(value===undefined)return to;if(to===undefined)return [value];to.push(value);return to;
}
function merge(old:Directive[]|undefined,fresh:Directive[]|undefined,start:number,end:number,delta:number):Directive[]|undefined{
 if(!old)return fresh;
 let out:Directive[]|undefined;
 let added=false;
 for(const directive of old){
  const {range,type}=directive;
  if(range.end<start)out=append(out,directive);
  else if(range.pos>end){addFresh();const updated:Directive={range:{pos:range.pos+delta,end:range.end+delta},type};out=append(out,updated);}
 }
 addFresh();return out;
 function addFresh(){if(added)return;added=true;if(!out)out=fresh;else if(fresh)out.push(...fresh);}
}`;
const old = "[{range:{pos:10,end:15},type:0},{range:{pos:30,end:35},type:0},{range:{pos:50,end:55},type:0}]";
const cases = [
  ["delete middle", `${old},undefined,20,40,-10`, 2782],
  ["insert between old directives", `${old},[{range:{pos:20,end:25},type:1}],20,20,10`, 4485825],
  ["delete all", `${old},undefined,0,100,-100`, -1],
  ["fresh only", "undefined,[{range:{pos:20,end:25},type:1}],0,0,10", 77],
  ["empty insertion", `${old},[],20,20,0`, 115518],
] as const;
const controls = [
  [
    "undefined receiver before arguments",
    `let calls=0;export function run(){let out:Directive[]|undefined;function source():Directive[]{calls++;return [];}function go(){out=out;return out!.push(...source());}try{go();return 0;}catch{return calls===0?1:-1;}}`,
  ],
  [
    "erased self spread preserves identity",
    `export function run(){let out:Directive[]|undefined=append(undefined,{range:{pos:1,end:2},type:0});function go(){if(out){const n=out.push(...out);return n===2&&out[0]===out[1]?1:0;}return 0;}return go();}`,
  ],
] as const;
for (const experimentalIR of [false, true]) {
  const programs: readonly (readonly [string, string, number])[] = [
    ...cases.map(
      ([name, argumentsText, expected]) =>
        [
          name,
          `export function run(){const out=merge(${argumentsText});if(out===undefined)return -1;let hash=out.length;for(const d of out)hash=hash*31+d.range.pos+d.range.end+d.type;return hash;}`,
          expected,
        ] as const,
    ),
    ...controls.map(([name, body]) => [name, body, 1] as const),
  ];
  for (const [name, body, expected] of programs) {
    it(`${name} IR=${experimentalIR}`, async () => {
      const source = core + body;
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
}
