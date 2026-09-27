// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import ts from "typescript";
import { expect, it } from "vitest";
import { compile } from "../src/index.js";

const types = "interface TextRange{pos:number;end:number;} interface Directive{range:TextRange;type:number;}";
const cases = [
  [
    "factory layout through optional field",
    "function make(){return {pos:43,end:56,extra:7};}const root:{range?:TextRange}={range:make()};const range:TextRange=root.range!;return range.pos+range.end;",
    99,
  ],
  [
    "destructured nested factory layout",
    "function make(){return {range:{pos:43,end:56,extra:7},type:1};}const root:{directive?:Directive}={directive:make()};const {range}=root.directive!;return range.pos+range.end;",
    99,
  ],
  [
    "zero and negative fields",
    "function make(){return {pos:0,end:-7,extra:7};}const root:{range?:TextRange}={range:make()};const range:TextRange=root.range!;return range.pos+range.end;",
    -7,
  ],
  ["exact layout control", "const range:TextRange={pos:43,end:56};return range.pos+range.end;", 99],
  [
    "genuinely undefined still throws",
    "const root:{range?:TextRange}={};const range:TextRange=root.range!;try{return range.pos;}catch{return 7;}",
    7,
  ],
  [
    "genuinely null still throws",
    "const root:{range:TextRange|null}={range:null};const range:TextRange=root.range!;try{return range.pos;}catch{return 7;}",
    7,
  ],
] as const;
for (const experimentalIR of [false, true])
  for (const [name, body, expected] of cases) {
    it(`${name} IR=${experimentalIR}`, async () => {
      const source = types + `export function run(){${body}}`;
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
