// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { CodegenContext } from "./context/types.js";
import type { ValType } from "../ir/types.js";
import {
  liveArrayIteratorStep,
  liveArrayIteratorDispatch,
  LIVE_ARRAY_ITERATOR_KIND,
} from "../wasm/model/live-array-iterator.js";
import { ensureNativeIteratorRuntime, getOrRegisterIterRecType, ITER_FAMILY_ARRAY } from "./iterator-native.js";
import { ensureObjectRuntime } from "./object-runtime.js";
import { buildArrayLikeToLengthFromExternref } from "./object-runtime-enumeration.js";
import { getArrTypeIdxFromVec, getOrRegisterVecType, addFuncType } from "./registry/types.js";
import { mintDefinedFunc, pushDefinedFunc, definedFuncAt } from "./func-space.js";
import { canonicalUndefinedExternInstrs } from "./any-helpers.js";
import { stringConstantExternrefInstrs } from "./native-strings.js";
import { buildThrowJsErrorInstrs } from "./js-errors.js";

const ER: ValType = { kind: "externref" };
const I32: ValType = { kind: "i32" };
const F64: ValType = { kind: "f64" };
const STATE = "__LiveArrayIterator";
const NEW = "__live_array_iterator_new";
const STEP = "__live_array_iterator_step";
const LENGTH = "__live_array_iterator_length";

/** Register once before receiver emission; step semantics live in the model. */
export function ensureLiveArrayIterator(ctx: CodegenContext): number {
  const existing = ctx.funcMap.get(NEW);
  if (existing !== undefined) return existing;
  ensureObjectRuntime(ctx);
  ensureNativeIteratorRuntime(ctx);
  const recursive = ctx.funcMap.get(NEW);
  if (recursive !== undefined) return recursive;
  const record = getOrRegisterIterRecType(ctx);
  const vec = getOrRegisterVecType(ctx, "externref", ER);
  const state = ctx.mod.types.length;
  ctx.mod.types.push({
    kind: "struct",
    name: STATE,
    fields: [
      { name: "receiver", type: ER, mutable: true },
      { name: "index", type: F64, mutable: true },
      { name: "mode", type: I32, mutable: false },
    ],
  });
  ctx.structMap.set(STATE, state);
  const reserve = (name: string, params: ValType[], results: ValType[], locals: ValType[]) => {
    const typeIdx = addFuncType(ctx, params, results);
    const index = mintDefinedFunc(ctx);
    ctx.funcMap.set(name, index);
    pushDefinedFunc(ctx, index, {
      name,
      typeIdx,
      exported: false,
      locals: locals.map((type, i) => ({ name: `t${i}`, type })),
      body: [{ op: "unreachable" }],
    });
    return index;
  };
  reserve(LENGTH, [ER], [F64], [ER, F64, F64, ER]);
  reserve(STEP, [ER], [I32, ER], [{ kind: "ref_null", typeIdx: state }, ER, F64, ER]);
  const index = reserve(NEW, [ER, I32], [ER], []);
  const fn = definedFuncAt(ctx, index)!;
  const throwNull = buildThrowJsErrorInstrs(ctx, "TypeError", "Array iterator receiver is null or undefined");
  const undefinedCheck = ctx.funcMap.get("__extern_is_undefined");
  if (undefinedCheck === undefined) throw new Error("Missing array iterator nullish check");
  fn.body = [
    { op: "local.get", index: 0 },
    { op: "ref.is_null" },
    { op: "local.get", index: 0 },
    { op: "call", funcIdx: undefinedCheck },
    { op: "i32.or" },
    { op: "if", blockType: { kind: "empty" }, then: throwNull },
    { op: "i32.const", value: LIVE_ARRAY_ITERATOR_KIND },
    { op: "ref.null", typeIdx: vec },
    { op: "i32.const", value: 0 },
    { op: "local.get", index: 0 },
    { op: "f64.const", value: 0 },
    { op: "local.get", index: 1 },
    { op: "struct.new", typeIdx: state },
    { op: "extern.convert_any" },
    { op: "i32.const", value: ITER_FAMILY_ARRAY },
    { op: "struct.new", typeIdx: record },
    { op: "extern.convert_any" },
  ];
  // Reserve the string before finalization freezes constants.
  stringConstantExternrefInstrs(ctx, "length");
  return ctx.funcMap.get(NEW)!;
}

/** Finalize only after the ordinary iterator providers have been rebuilt. */
export function fillLiveArrayIterator(ctx: CodegenContext): void {
  const state = ctx.structMap.get(STATE);
  if (state === undefined) return;
  const required = (name: string): number => {
    const index = ctx.funcMap.get(name);
    if (index === undefined) throw new Error(`Missing live array iterator dependency ${name}`);
    return index;
  };
  definedFuncAt(ctx, required(LENGTH))!.body = [
    { op: "local.get", index: 0 },
    ...stringConstantExternrefInstrs(ctx, "length"),
    { op: "call", funcIdx: required("__extern_get") },
    ...buildArrayLikeToLengthFromExternref(ctx, ctx.symbolTypeIdx, true),
  ];
  const vec = getOrRegisterVecType(ctx, "externref", ER);
  definedFuncAt(ctx, required(STEP))!.body = liveArrayIteratorStep({
    stateType: state,
    vecType: vec,
    arrayType: getArrTypeIdxFromVec(ctx, vec),
    length: required(LENGTH),
    getIndex: required("__extern_get_idx"),
    boxNumber: required("__box_number"),
    undefinedValue: canonicalUndefinedExternInstrs(ctx),
  });
  const record = getOrRegisterIterRecType(ctx);
  for (const name of ["__iterator_next", "__iterator_next_strict"]) {
    const index = ctx.funcMap.get(name);
    const fn = index === undefined ? undefined : definedFuncAt(ctx, index);
    if (fn) fn.body = [...liveArrayIteratorDispatch(record, required(STEP)), ...fn.body];
  }
}
