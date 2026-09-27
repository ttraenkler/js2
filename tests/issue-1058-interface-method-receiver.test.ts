// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import { expect, it } from "vitest";
import { compile } from "../src/index.js";
import ts from "typescript";

const cases = {
  "attached native Map method": `
    interface MultiMap<K,V> extends Map<K,V[]> { add(key:K,value:V):V[]; }
    function createMultiMap<K,V>():MultiMap<K,V>{
      const map=new Map<K,V[]>() as MultiMap<K,V>; map.add=multiMapAdd; return map;
    }
    function multiMapAdd<K,V>(this:MultiMap<K,V>,key:K,value:V){
      let values=this.get(key);if(values!==undefined)values.push(value);else this.set(key,values=[value]);return values;
    }
    interface Registration {errorCodes: number[];}
    const registrations=createMultiMap<string,Registration>();
    function register(reg:Registration){for(const error of reg.errorCodes)registrations.add(String(error),reg);}
    register({errorCodes:[42]});
    export function run():number {return registrations.get('42')![0].errorCodes[0];}
  `,
  "interface hides ordinary function declaration": `
    interface Reader { value: number; read(): number; }
    function read(this: Reader): number { return this.value; }
    const reader: Reader = {value: 42, read};
    export function run(): number { return reader.read(); }
  `,
  "receiver evaluated once before arguments": `
    interface Reader { value: number; read(n: number): number; }
    function read(this: Reader, n: number): number { return this.value + n; }
    const reader: Reader = {value: 40, read};
    let count = 0;
    function receiver(): Reader { count++; return reader; }
    function argument(): number { return count + 1; }
    export function run(): number { return receiver().read(argument()); }
  `,
  "lexical arrow does not acquire interface receiver": `
    interface Reader { value: number; read(): number; }
    function make(this: {value: number}): Reader { return {value: 7, read: () => this.value}; }
    const reader: Reader = make.call({value: 42});
    export function run(): number { return reader.read(); }
  `,
  "arguments read caller receiver and normal return restores it": `
    interface Reader { value: number; read(n: number): number; }
    function read(this: Reader, n: number): number { return this.value + n; }
    const reader: Reader = {value: 2, read};
    const outer = {value: 40, run: function() {
      const result = reader.read(this.value);
      return result + this.value - 40;
    }};
    export function run(): number { return outer.run(); }
  `,
};

it.each([true, false].flatMap((ir) => Object.entries(cases).map(([name, source]) => [ir, name, source] as const)))(
  "preserves interface method receiver IR=%s: %s",
  async (experimentalIR, _name, source) => {
    const native: { run?: () => number } = {};
    new Function(
      "exports",
      ts.transpileModule(source, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.CommonJS,
        },
      }).outputText,
    )(native);
    expect(native.run!()).toBe(42);
    const result = await compile(source, { target: "standalone", experimentalIR, deferTopLevelInit: true });
    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    const module = new WebAssembly.Module(result.binary);
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    const instance = new WebAssembly.Instance(module);
    (instance.exports.__module_init as (() => void) | undefined)?.();
    expect((instance.exports.run as () => number)()).toBe(42);
  },
);
