// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { Instr, ValType } from "./instructions.js";

interface IteratorRestGeometry {
  iterRecTypeIdx: number;
  vecTypeIdx: number;
  arrTypeIdx: number;
}

/** The drain's scratch-local ABI belongs with its instruction body. */
export function iteratorRestLocals(types: IteratorRestGeometry): { name: string; type: ValType }[] {
  return [
    { name: "rec", type: { kind: "ref", typeIdx: types.iterRecTypeIdx } },
    { name: "vec", type: { kind: "ref_null", typeIdx: types.vecTypeIdx } },
    { name: "i", type: { kind: "i32" } },
    { name: "len", type: { kind: "i32" } },
    { name: "out", type: { kind: "ref_null", typeIdx: types.arrTypeIdx } },
    { name: "j", type: { kind: "i32" } },
    { name: "done", type: { kind: "i32" } },
    { name: "value", type: { kind: "externref" } },
    { name: "grow", type: { kind: "ref_null", typeIdx: types.arrTypeIdx } },
  ];
}

export function buildIteratorRestBodyWithUserArm(
  types: IteratorRestGeometry,
  iteratorNextIdx: number,
  // (#3119) The step-driven kinds the drain admits — [USER], [OBJ], or both,
  // matching which GetIterator arms the fill installed. The kind dispatch of
  // the step itself lives inside `__iterator_next`, so one drain serves all.
  stepKinds: number[],
): Instr[] {
  const { iterRecTypeIdx, vecTypeIdx, arrTypeIdx } = types;
  const userDrain: Instr[] = [
    // cap = 4; out = array.new_default(4); j = 0
    { op: "i32.const", value: 4 },
    { op: "local.set", index: 4 },
    { op: "local.get", index: 4 },
    { op: "array.new_default", typeIdx: arrTypeIdx },
    { op: "local.set", index: 5 },
    { op: "i32.const", value: 0 },
    { op: "local.set", index: 6 },
    {
      op: "block",
      blockType: { kind: "empty" },
      body: [
        {
          op: "loop",
          blockType: { kind: "empty" },
          body: [
            // (done, value) = __iterator_next(recExt)
            { op: "local.get", index: 0 },
            { op: "call", funcIdx: iteratorNextIdx },
            { op: "local.set", index: 8 },
            { op: "local.set", index: 7 },
            { op: "local.get", index: 7 },
            { op: "br_if", depth: 1 },
            // grow if j >= cap
            { op: "local.get", index: 6 },
            { op: "local.get", index: 4 },
            { op: "i32.ge_s" },
            {
              op: "if",
              blockType: { kind: "empty" },
              then: [
                { op: "local.get", index: 4 },
                { op: "i32.const", value: 2 },
                { op: "i32.mul" },
                { op: "local.set", index: 4 },
                { op: "local.get", index: 4 },
                { op: "array.new_default", typeIdx: arrTypeIdx },
                { op: "local.set", index: 9 },
                { op: "local.get", index: 9 },
                { op: "i32.const", value: 0 },
                { op: "local.get", index: 5 },
                { op: "i32.const", value: 0 },
                { op: "local.get", index: 6 },
                { op: "array.copy", dstTypeIdx: arrTypeIdx, srcTypeIdx: arrTypeIdx },
                { op: "local.get", index: 9 },
                { op: "local.set", index: 5 },
              ],
              else: [],
            },
            // out[j] = value; j++
            { op: "local.get", index: 5 },
            { op: "ref.as_non_null" },
            { op: "local.get", index: 6 },
            { op: "local.get", index: 8 },
            { op: "array.set", typeIdx: arrTypeIdx },
            { op: "local.get", index: 6 },
            { op: "i32.const", value: 1 },
            { op: "i32.add" },
            { op: "local.set", index: 6 },
            { op: "br", depth: 0 },
          ],
        },
      ],
    },
    // return $Vec{j, out} as externref
    { op: "local.get", index: 6 },
    { op: "local.get", index: 5 },
    { op: "ref.as_non_null" },
    { op: "struct.new", typeIdx: vecTypeIdx },
    { op: "extern.convert_any" },
    { op: "return" },
  ];

  return [
    // rec = cast(recExt)
    { op: "local.get", index: 0 },
    { op: "any.convert_extern" },
    { op: "ref.cast", typeIdx: iterRecTypeIdx },
    { op: "local.set", index: 1 },
    // USER/OBJ record → step-to-exhaustion drain
    ...stepKinds.flatMap((kind, i): Instr[] => [
      { op: "local.get", index: 1 },
      { op: "struct.get", typeIdx: iterRecTypeIdx, fieldIdx: 0 },
      { op: "i32.const", value: kind },
      { op: "i32.eq" },
      ...(i > 0 ? ([{ op: "i32.or" }] satisfies Instr[]) : []),
    ]),
    { op: "if", blockType: { kind: "empty" }, then: userDrain, else: [] },
    // VEC record → the existing tail-copy, reading rec from local 1
    { op: "local.get", index: 1 },
    ...buildIteratorRestVecTail(iterRecTypeIdx, vecTypeIdx, arrTypeIdx),
  ];
}

/**
 * Build the `__iterator_rest` body: copy the canonical vec's elements from the
 * cursor to the end into a fresh externref vec, returned as externref.
 * Locals: 0=recExt(param), 1=rec, 2=vec, 3=i, 4=len, 5=out(arr), 6=j.
 */
export function buildIteratorRestBody(iterRecTypeIdx: number, vecTypeIdx: number, arrTypeIdx: number): Instr[] {
  return [
    // rec = cast(recExt)
    { op: "local.get", index: 0 },
    { op: "any.convert_extern" },
    { op: "ref.cast", typeIdx: iterRecTypeIdx },
    { op: "local.tee", index: 1 },
    ...buildIteratorRestVecTail(iterRecTypeIdx, vecTypeIdx, arrTypeIdx),
  ];
}

/**
 * The vec tail-copy of `__iterator_rest` — everything after the record is on
 * the stack. Shared by the eager vec-only body and the (#3100 S5) USER-aware
 * rebuild. Expects the `$IterRec` (non-null ref) ON THE STACK; consumes it.
 */
function buildIteratorRestVecTail(iterRecTypeIdx: number, vecTypeIdx: number, arrTypeIdx: number): Instr[] {
  return [
    // vec = rec.vec
    { op: "struct.get", typeIdx: iterRecTypeIdx, fieldIdx: 1 },
    { op: "local.set", index: 2 },
    // i = rec.idx
    { op: "local.get", index: 1 },
    { op: "struct.get", typeIdx: iterRecTypeIdx, fieldIdx: 2 },
    { op: "local.set", index: 3 },
    // len = (vec == null) ? 0 : vec.length
    { op: "local.get", index: 2 },
    { op: "ref.is_null" },
    {
      op: "if",
      blockType: { kind: "val", type: { kind: "i32" } },
      then: [{ op: "i32.const", value: 0 }],
      else: [
        { op: "local.get", index: 2 },
        { op: "ref.as_non_null" },
        { op: "struct.get", typeIdx: vecTypeIdx, fieldIdx: 0 },
      ],
    },
    { op: "local.set", index: 4 },
    // out = new externref[ (i < len) ? len - i : 0 ]   (clamp negative to 0).
    // Compute the count cleanly: the if's condition (i < len) is the ONLY value
    // on the stack entering the `if`, and each arm leaves exactly one i32.
    { op: "local.get", index: 3 },
    { op: "local.get", index: 4 },
    { op: "i32.lt_s" },
    {
      op: "if",
      blockType: { kind: "val", type: { kind: "i32" } },
      then: [{ op: "local.get", index: 4 }, { op: "local.get", index: 3 }, { op: "i32.sub" }],
      else: [{ op: "i32.const", value: 0 }],
    },
    { op: "array.new_default", typeIdx: arrTypeIdx },
    { op: "local.set", index: 5 },
    // j = 0
    { op: "i32.const", value: 0 },
    { op: "local.set", index: 6 },
    // while (i < len) { out[j] = vec.data[i]; i++; j++; }
    {
      op: "block",
      blockType: { kind: "empty" },
      body: [
        {
          op: "loop",
          blockType: { kind: "empty" },
          body: [
            // i >= len -> break
            { op: "local.get", index: 3 },
            { op: "local.get", index: 4 },
            { op: "i32.ge_s" },
            { op: "br_if", depth: 1 },
            // out[j] = vec.data[i]
            { op: "local.get", index: 5 },
            { op: "ref.as_non_null" },
            { op: "local.get", index: 6 },
            { op: "local.get", index: 2 },
            { op: "ref.as_non_null" },
            { op: "struct.get", typeIdx: vecTypeIdx, fieldIdx: 1 },
            { op: "local.get", index: 3 },
            { op: "array.get", typeIdx: arrTypeIdx },
            { op: "array.set", typeIdx: arrTypeIdx },
            // i++ ; j++
            { op: "local.get", index: 3 },
            { op: "i32.const", value: 1 },
            { op: "i32.add" },
            { op: "local.set", index: 3 },
            { op: "local.get", index: 6 },
            { op: "i32.const", value: 1 },
            { op: "i32.add" },
            { op: "local.set", index: 6 },
            { op: "br", depth: 0 },
          ],
        },
      ],
    },
    // result vec = $vecExtern{ length: j, data: out }
    { op: "local.get", index: 6 },
    { op: "local.get", index: 5 },
    { op: "ref.as_non_null" },
    { op: "struct.new", typeIdx: vecTypeIdx },
    { op: "extern.convert_any" },
  ];
}
