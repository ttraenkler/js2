// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { CodegenContext } from "./context/types.js";
import { orderStructDispatchBySpecificity } from "../ir/struct-dispatch-order.js";
import { type PresenceSlot, presenceSlotOf } from "./fnctor-presence-bits.js";
import { type ColdFieldLocation, coldFieldNameAt, coldOwnFieldsFor } from "./fnctor-cold-tail.js";
import { fnctorLayoutOwnFieldsFor, fnctorLayoutShapeRangeFor } from "./fnctor-layout-emit.js";
import { isSyntheticStructName } from "./emit-helpers.js";
import { isUserDeclaredStruct } from "./user-declared-structs.js";
import { isInternalStructFieldName, orderNamesByInsertion } from "./struct-field-exports.js";

type EnumOwnField = { name: string; presenceSlot?: PresenceSlot; cold?: ColdFieldLocation };
export type EnumShapeEntry = {
  typeIdx: number;
  fields: EnumOwnField[];
  shapeFieldIdx?: number;
  shapeId?: number;
  /**
   * (#3927 per-type layouts) Family stamp-range guard on a split BASE entry:
   * `ref.test $base` also matches a canonical-twin family whose presence bits
   * mean different names, so the arm must fall through for out-of-range
   * stamps instead of enumerating the wrong name list.
   */
  shapeRange?: { shapeFieldIdx: number; stampLo: number; stampCount: number };
};

/**
 * (#3920) The ONE authority for "which names does a closed struct enumerate".
 *
 * Extracted so `Object.getOwnPropertyNames`, `Object.keys` and `for…in` cannot
 * drift apart. They previously could: only `__getOwnPropertyNames` had arms, so
 * the other two answered zero on every closed-struct receiver, and any fix that
 * hand-copied the derivation would have re-opened that gap on the next change.
 *
 * The name list comes from the struct's FIELD list; per-name liveness comes
 * from the base PRESENCE words (`presenceSlotOf` / `presenceTestInstrs`) and,
 * for #3927's split shapes, from the cold tail's presence. That division is
 * deliberate and is what keeps enumeration independent of where a value is
 * physically stored: presence words live in the base struct at fixed indices,
 * so a per-type layout split moves values without moving the answer. (Deriving
 * the NAMES from presence words is not possible — a presence word holds bits,
 * not names, and unconditionally-assigned fields have no presence bit at all.)
 */
export function collectClosedStructEnumerationEntries(ctx: CodegenContext): EnumShapeEntry[] {
  const entries: EnumShapeEntry[] = [];
  for (const [structName, fields] of ctx.structFields) {
    if (isSyntheticStructName(structName)) continue;
    // (#3920) Builtin carriers (`__Date.timestamp`, the 7 internal RegExp
    // fields, …) are internal slots, not own properties. Without this screen
    // the arms answer `Object.keys(new Date(0)) === ["timestamp"]` — the exact
    // wrong answer that made #4071 revert sharing them.
    if (!isUserDeclaredStruct(ctx, structName)) continue;
    const typeIdx = ctx.structMap.get(structName);
    if (typeIdx === undefined) continue;

    const byName = new Map<string, EnumOwnField>();
    for (const field of fields) {
      if (field?.name === undefined || isInternalStructFieldName(ctx, structName, field.name)) continue;
      const presenceSlot = presenceSlotOf(fields, field.name);
      byName.set(field.name, {
        name: field.name,
        ...(presenceSlot ? { presenceSlot } : {}),
      });
    }
    // (#3927) Split-out names still enumerate — `for…in` / `Object.keys` over an
    // AST node must not shrink because a slot moved to the tail. Acorn's
    // `copyNode` is the concrete consumer: `for (var p in node) newNode[p] = node[p]`.
    for (const cold of coldOwnFieldsFor(ctx, structName)) {
      const name = coldFieldNameAt(ctx, cold);
      if (name !== undefined && !byName.has(name)) byName.set(name, { name, cold });
    }
    // (#3927 per-type layouts) The split moved the flow-grown union names off
    // the base field list; their presence bits stayed in the BASE words, so
    // enumeration answers from ONE range-guarded base arm for every layout of
    // the family — layout-independent by construction (issue §6 constraint).
    for (const layoutField of fnctorLayoutOwnFieldsFor(ctx, structName)) {
      if (!byName.has(layoutField.name)) {
        byName.set(layoutField.name, { name: layoutField.name, presenceSlot: layoutField.presenceSlot });
      }
    }
    if (byName.size === 0) continue;

    const orderedNames = orderNamesByInsertion(ctx, structName, [...byName.keys()]);
    const shapeFieldIdx = fields.findIndex((field) => field?.name === "$shape");
    const shapeId = ctx.shapeIdByStructName.get(structName);
    const shapeRange = fnctorLayoutShapeRangeFor(ctx, structName);
    entries.push({
      typeIdx,
      fields: orderedNames.map((name) => byName.get(name)!),
      ...(shapeFieldIdx >= 0 && shapeId !== undefined ? { shapeFieldIdx, shapeId } : {}),
      ...(shapeRange ? { shapeRange } : {}),
    });
  }
  return orderStructDispatchBySpecificity(ctx.mod.types, entries);
}
