// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
/**
 * (#4491 wave-5 T5 / the owed #1472 follow-up) §7.1.1.1 OrdinaryToPrimitive for
 * a user `toString` / `valueOf` that lives on the receiver's **PROTOTYPE**.
 *
 * ## The defect
 *
 * `__class_to_primitive` (class-to-primitive.ts) dispatches only on the
 * per-struct `__call_valueOf` / `__call_toString` arms, and those are built
 * from `ctx.structFields` — the instance struct's OWN fields — plus a
 * name-keyed `<Struct>_<method>` body. The ES5 way to give an instance a
 * `toString` is neither:
 *
 * ```js
 * function F(v){ this.value = v; }
 * F.prototype.toString = function(){ return this.value + ''; };
 * var q = new F(7);
 * ```
 *
 * That write lands on the prototype OBJECT at runtime (`__set_member_nonstrict`),
 * so no struct field carries it, no `__call_toString` arm is emitted at all, and
 * the driver returns the instance unchanged. Measured on `7dd91b7bad`,
 * `--target standalone` — and the split is why it survived: the DYNAMIC member
 * route already resolves the prototype method correctly.
 *
 * | spelling | before | after |
 * | --- | --- | --- |
 * | `q["toString"]` → `typeof` | `"function"` | unchanged |
 * | `m.call(q)` for that `m` | `"7"` | unchanged |
 * | `q.toString()` | `"7"` | unchanged |
 * | `String(q)` | **`"[object Object]"`** | `"7"` |
 * | `"" + q` | **`"[object Object]"`** | `"7"` |
 *
 * It costs the Sputnik "is generic" rows that borrow a String method onto such
 * an instance — `String.prototype.slice.call` on `new __FACTORY(void 0)` must
 * render `ToString(this)` through the prototype's `toString`.
 *
 * ## The fix, and why it is not a blanket object rule
 *
 * A tail on the driver that asks the SAME runtime the dynamic member read asks:
 * `__extern_get(obj, "<name>")`, and only when `__typeof_function` says the
 * result is callable, invoke it through `__call_accessor_get(obj, method)` —
 * the arity-0 `this`-threading bridge the accessor path already uses. The
 * result is accepted ONLY if it is a primitive (number / boolean / string).
 *
 * Every other outcome falls through to the driver's existing "return the input
 * unchanged" tail, so:
 *
 * - a receiver with no user `toString`/`valueOf` is byte-identical, including
 *   every non-object carrier that reaches this driver (the `$AnyValue` box, a
 *   `$PropEntry` slot value, `undefined`) — the action-at-a-distance hazard
 *   class-to-primitive.ts documents at length;
 * - a builtin TAG is never fabricated here. `"[object Object]"` still comes
 *   from the CALLER, which knows whether the value is an object;
 * - a method that returns an OBJECT is not accepted, so the driver cannot be
 *   made to hand a non-primitive back to `__to_primitive`.
 *
 * A null receiver short-circuits before the `__extern_get`, so the tail adds
 * nothing to the null path.
 *
 * ## Ordering
 *
 * Hint order is §7.1.1.1's: string hint ⇒ `toString` then `valueOf`; number /
 * default hint ⇒ `valueOf` then `toString`. The tail runs AFTER the per-struct
 * dispatchers, so an OWN method still wins — the prototype is only consulted
 * where the own layer had nothing, which is the chain order.
 */
import type { Instr } from "../ir/types.js";
import type { CodegenContext } from "./context/types.js";
import { addStringConstantGlobal } from "./registry/imports.js";
import { stringConstantExternrefInstrs } from "./native-strings.js";

/** Everything the tail needs; `undefined` when any of it is missing. */
interface ProtoMethodDeps {
  externGetIdx: number;
  accessorGetIdx: number;
  typeofFunctionIdx: number;
  typeofNumberIdx: number;
  typeofStringIdx: number;
  typeofBooleanIdx: number | undefined;
}

function resolveDeps(ctx: CodegenContext): ProtoMethodDeps | undefined {
  const externGetIdx = ctx.funcMap.get("__extern_get");
  const accessorGetIdx = ctx.funcMap.get("__call_accessor_get");
  const typeofFunctionIdx = ctx.funcMap.get("__typeof_function");
  const typeofNumberIdx = ctx.funcMap.get("__typeof_number");
  const typeofStringIdx = ctx.funcMap.get("__typeof_string");
  if (
    externGetIdx === undefined ||
    accessorGetIdx === undefined ||
    typeofFunctionIdx === undefined ||
    typeofNumberIdx === undefined ||
    typeofStringIdx === undefined
  ) {
    return undefined;
  }
  return {
    externGetIdx,
    accessorGetIdx,
    typeofFunctionIdx,
    typeofNumberIdx,
    typeofStringIdx,
    typeofBooleanIdx: ctx.funcMap.get("__typeof_boolean"),
  };
}

/**
 * Instructions for the `__class_to_primitive` tail described in the module
 * header, or `undefined` when a dependency is missing (caller keeps its
 * pre-existing tail unchanged).
 *
 * Locals: `objLocal` is the driver's externref param 0, `hintLocal` its i32
 * param 1, and `methodLocal` / `resultLocal` are two externref scratch slots
 * the caller must have appended.
 */
export function protoMethodToPrimitiveTail(
  ctx: CodegenContext,
  objLocal: number,
  hintLocal: number,
  methodLocal: number,
  resultLocal: number,
): Instr[] | undefined {
  const deps = resolveDeps(ctx);
  if (deps === undefined) return undefined;

  const isPrimitive = (localIdx: number): Instr[] => {
    const parts: Instr[] = [
      { op: "local.get", index: localIdx },
      { op: "call", funcIdx: deps.typeofNumberIdx },
    ];
    if (deps.typeofBooleanIdx !== undefined) {
      parts.push(
        { op: "local.get", index: localIdx },
        { op: "call", funcIdx: deps.typeofBooleanIdx },
        { op: "i32.or" },
      );
    }
    parts.push({ op: "local.get", index: localIdx }, { op: "call", funcIdx: deps.typeofStringIdx }, { op: "i32.or" });
    return parts;
  };

  const tryMember = (name: "toString" | "valueOf"): Instr[] => {
    addStringConstantGlobal(ctx, name);
    return [
      { op: "local.get", index: objLocal },
      ...stringConstantExternrefInstrs(ctx, name),
      { op: "call", funcIdx: deps.externGetIdx },
      { op: "local.tee", index: methodLocal },
      { op: "call", funcIdx: deps.typeofFunctionIdx },
      {
        op: "if",
        blockType: { kind: "empty" },
        then: [
          { op: "local.get", index: objLocal },
          { op: "local.get", index: methodLocal },
          { op: "call", funcIdx: deps.accessorGetIdx },
          { op: "local.set", index: resultLocal },
          { op: "local.get", index: resultLocal },
          { op: "ref.is_null" },
          { op: "i32.eqz" },
          {
            op: "if",
            blockType: { kind: "empty" },
            then: [
              ...isPrimitive(resultLocal),
              {
                op: "if",
                blockType: { kind: "empty" },
                then: [{ op: "local.get", index: resultLocal }, { op: "return" }],
              },
            ],
          },
        ],
      },
    ];
  };

  return [
    // A null receiver has no prototype chain to walk — keep the null path free.
    { op: "local.get", index: objLocal },
    { op: "ref.is_null" },
    { op: "i32.eqz" },
    {
      op: "if",
      blockType: { kind: "empty" },
      then: [
        { op: "local.get", index: hintLocal },
        {
          op: "if",
          blockType: { kind: "empty" },
          then: [...tryMember("toString"), ...tryMember("valueOf")],
          else: [...tryMember("valueOf"), ...tryMember("toString")],
        },
      ],
    },
  ];
}
