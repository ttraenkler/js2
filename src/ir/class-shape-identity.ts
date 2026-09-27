// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { IrClassId } from "./identity.js";
import type { IrClassShape } from "./nodes.js";
import { IrPlanningIdentityInvariantError } from "./planning-identity.js";

/** Namespace source spellings are not unique; retain the exact class owner. */
export function indexIrClassShapesByIdentity(shapes: Iterable<IrClassShape>): ReadonlyMap<IrClassId, IrClassShape> {
  const result = new Map<IrClassId, IrClassShape>();
  for (const shape of shapes) {
    const previous = result.get(shape.classId);
    if (previous !== undefined && previous !== shape) {
      throw new IrPlanningIdentityInvariantError(
        "class-record-mismatch",
        `class identity ${shape.classId} has conflicting projected shapes`,
      );
    }
    result.set(shape.classId, shape);
  }
  return result;
}
