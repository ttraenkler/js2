// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { Instr } from "./instructions.js";

/** Normalize an anyref overlay key to the JavaScript array's shared identity. */
export function vecProjectionOverlayIdentity(rootIdx: number | undefined): Instr[] {
  return rootIdx === undefined
    ? []
    : [
        { op: "local.get", index: 0 },
        { op: "extern.convert_any" },
        { op: "call", funcIdx: rootIdx },
        { op: "any.convert_extern" },
        { op: "local.set", index: 0 },
      ];
}

/** Shared descriptor lookup. Parameter 0 is anyref; locals 1–5 are state/table/index/count/pair. */
export function buildVecOverlayLookupBody({
  stateGlobalIdx,
  stateTypeIdx,
  tabTypeIdx,
  pairTypeIdx,
  rootIdx,
}: {
  stateGlobalIdx: number;
  stateTypeIdx: number;
  tabTypeIdx: number;
  pairTypeIdx: number;
  rootIdx: number | undefined;
}): Instr[] {
  return [
    // st = state ; if st == null → null (the fast path for overlay-free runs)
    ...vecProjectionOverlayIdentity(rootIdx),
    { op: "global.get", index: stateGlobalIdx },
    { op: "local.tee", index: 1 },
    { op: "ref.is_null" },
    {
      op: "if",
      blockType: { kind: "empty" },
      then: [{ op: "ref.null", typeIdx: -15 }, { op: "return" }],
    },
    { op: "local.get", index: 1 },
    { op: "ref.as_non_null" },
    { op: "struct.get", typeIdx: stateTypeIdx, fieldIdx: 1 },
    { op: "local.set", index: 2 },
    { op: "local.get", index: 1 },
    { op: "ref.as_non_null" },
    { op: "struct.get", typeIdx: stateTypeIdx, fieldIdx: 0 },
    { op: "local.set", index: 4 },
    // (#3673 round 14) Scan NEWEST-FIRST (count-1 → 0). `__vec_overlay_ensure`
    // appends at tab[count], and the hot probes — the standalone regex-exec
    // path defining/reading `index`/`input` on a FRESH match array — always
    // target the most recently ensured pair, which the old forward scan
    // reached only after walking every older (usually dead) entry. The table
    // is append-only (identity pairs, no eviction), so as it grows across a
    // run the forward scan degraded superlinearly; newest-first makes the
    // common hit O(1) regardless of table size. Identities are unique, so
    // scan order cannot change which pair matches.
    { op: "local.get", index: 4 },
    { op: "i32.const", value: 1 },
    { op: "i32.sub" },
    { op: "local.set", index: 3 },
    {
      op: "block",
      blockType: { kind: "empty" },
      body: [
        {
          op: "loop",
          blockType: { kind: "empty" },
          body: [
            { op: "local.get", index: 3 },
            { op: "i32.const", value: 0 },
            { op: "i32.lt_s" },
            { op: "br_if", depth: 1 },
            // pair = tab[i] ; if (pair.vec ref.eq vec) → pair.companion
            { op: "local.get", index: 2 },
            { op: "ref.as_non_null" },
            { op: "local.get", index: 3 },
            { op: "array.get", typeIdx: tabTypeIdx },
            { op: "local.tee", index: 5 },
            { op: "ref.as_non_null" },
            { op: "struct.get", typeIdx: pairTypeIdx, fieldIdx: 0 },
            // ref.eq operands must be eqref — struct refs are.
            { op: "ref.cast", typeIdx: -19 /* eq */ },
            { op: "local.get", index: 0 },
            { op: "ref.cast", typeIdx: -19 /* eq */ },
            { op: "ref.eq" },
            {
              op: "if",
              blockType: { kind: "empty" },
              then: [
                { op: "local.get", index: 5 },
                { op: "ref.as_non_null" },
                { op: "struct.get", typeIdx: pairTypeIdx, fieldIdx: 1 },
                { op: "return" },
              ],
            },
            { op: "local.get", index: 3 },
            { op: "i32.const", value: 1 },
            { op: "i32.sub" },
            { op: "local.set", index: 3 },
            { op: "br", depth: 0 },
          ],
        },
      ],
    },
    { op: "ref.null", typeIdx: -15 },
  ];
}
