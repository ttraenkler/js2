// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { FunctionContext } from "./context/types.js";
import { allocLocal } from "./context/locals.js";
import { emitLocalTdzInit } from "./statements/tdz.js";

/** Pattern stores target a cell's value, never overwrite its reference. */
export function planPatternCaptureStore(fctx: FunctionContext, name: string, localIdx: number) {
  const box = fctx.boxedCaptures?.get(name);
  const cellLocal = box ? fctx.localMap.get(name) : undefined;
  if (!box || cellLocal !== localIdx) return { valueLocal: localIdx };
  return {
    valueLocal: allocLocal(fctx, `__box_dstr_${name}_${fctx.locals.length}`, box.valType),
    cellLocal,
    cellType: box.refCellTypeIdx,
  };
}

/** Preserve the existing externref-pattern path's nullable-cell guard. */
export function finishPatternCaptureStore(
  fctx: FunctionContext,
  store: ReturnType<typeof planPatternCaptureStore>,
  initializeName?: string,
): void {
  if (store.cellLocal !== undefined && store.cellType !== undefined)
    fctx.body.push(
      { op: "local.get", index: store.cellLocal },
      { op: "ref.is_null" },
      {
        op: "if",
        blockType: { kind: "empty" },
        then: [],
        else: [
          { op: "local.get", index: store.cellLocal },
          { op: "local.get", index: store.valueLocal },
          { op: "struct.set", typeIdx: store.cellType, fieldIdx: 0 },
        ],
      },
    );
  if (initializeName !== undefined) emitLocalTdzInit(fctx, initializeName);
}
