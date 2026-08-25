// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
/**
 * Operations on a **sloppy implicit global** — a name whose only binding is a
 * property the program created on the realm global object (`this.p = 0` at
 * script top level, or a bare `p = 0` on an otherwise-undeclared name).
 *
 * The (#3966/#4491) `f()` path uses this predicate when `f` is such a name.
 * `call-identifier.ts` then treats the name as a known variable so generic
 * dynamic dispatch reads the callee off the global object instead of throwing
 * ReferenceError or silently answering `undefined`.
 *
 * ## Why this file exists
 *
 * #3956 taught the identifier READ about those names (`emitImplicitGlobalRead`)
 * and #4500 Slice B taught the plain identifier WRITE (`p = v`) about them. The
 * UpdateExpression path was never taught either half, and its terminal fallback
 * for an unrecognised identifier is
 *
 *     fctx.body.push({ op: "f64.const", value: 0 });   // postfix
 *
 * — a silently DROPPED write that also answers `0`. So the whole
 * read-modify-write vanished:
 *
 *     this.position = 0;
 *     seat.move = function () { position++ };
 *     seat.move();
 *     position === 1        // observed 0
 *
 * (`language/types/object/S8.6.2_A5_T1/T2/T4`, and the same shape at script top
 * level.) The read half was already correct — the value `0` came back from the
 * global object — so the defect is exactly "the +1 never lands anywhere".
 *
 * ## What this deliberately does NOT do
 *
 * It does not create the binding. A name only reaches here when the pre-scan
 * (`recordSloppyImplicitGlobalNames` + `collectGlobalObjectPropertyNames`)
 * already classified it as a global-object property, and the property itself is
 * created at runtime by the assignment that the pre-scan saw. An update on a
 * genuinely never-assigned name keeps its existing ReferenceError.
 */
import type { CodegenContext, FunctionContext } from "../context/types.js";

/**
 * True when `name` has no declarative carrier and the pre-scan classified it as
 * a property of the realm global object.
 *
 * The caller is expected to have exhausted locals / boxed captures / module
 * globals / captured globals first; the redundant checks here make the
 * predicate safe to reuse from a site that has not.
 */
export function isSloppyImplicitGlobalBinding(ctx: CodegenContext, fctx: FunctionContext, name: string): boolean {
  if (ctx.sloppyImplicitGlobals?.has(name) !== true) return false;
  if (fctx.localMap.get(name) !== undefined) return false;
  if (ctx.moduleGlobals.get(name) !== undefined) return false;
  if (ctx.capturedGlobals.get(name) !== undefined) return false;
  return true;
}
