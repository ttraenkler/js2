// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
/**
 * (#3544) Dynamic `.call` dispatch on callable receivers for `--target
 * standalone`.
 *
 * ## The gap
 * `m.call(thisArg, ...args)` on a function VALUE flowing through the dynamic
 * path lowers to `__call_m_call_N(m, ...)` → `__extern_method_call(m, "call",
 * argvec)`. A callable receiver — a funcref-wrapper closure struct, most
 * importantly the builtin proto-method closures minted by
 * `ensureStandaloneNativeMethodClosure` (`$__proto_method_<brand>_<member>`) —
 * is neither `$Object` nor `$Vec` nor a capturing-closure prop-carrier, so the
 * else-arm chain answered `ref.null.extern`: the call NEVER dispatched,
 * silently returning undefined. That swallow gates the entire
 * builtin receiver-validation cluster of the #3468 exposure histogram
 * (~232 projected tests asserting `assert.throws(TypeError, () =>
 * Builtin.prototype.m.call(badReceiver))`) — the minted closure bodies already
 * carry the spec TypeError (wired receiver checks, or the #2984
 * degrade-to-catchable refusal body); only the routing was missing.
 *
 * ## The fix
 * A leading arm in `__extern_method_call`'s non-`$Object` else chain
 * (COMPOSED around the #3537/#3468 arms — neither module is edited):
 * `if (name == "call" && callable(recv)) → invoke(recv, argvec)` where invoke
 * splits argvec into `thisArg = argvec[0]` + `rest = argvec[1..]` and
 * dispatches through `__apply_closure` (the #1888 arity bridge). Bonus: this
 * also fixes `f.call(x)` on ordinary capturing closures through the dynamic
 * path (previously the prop-carrier arm consulted the expando bag and
 * answered undefined).
 *
 * `.apply` is a follow-on slice (array-argument spreading).
 *
 * ## Reserve-then-fill (same discipline as closure-props/vec-props)
 * The name gate needs native-string helpers, the callable gate needs the
 * COMPLETE closure-wrapper type set (`collectClosureBaseWrapperTypeIdxs` via
 * `buildClosureRefTestArms`, the #3140 `__bind_dyn` classification), and the
 * invoke body needs `__objvec_new/push` + `__apply_closure` funcIdxs — all
 * finalize-complete. So three helpers are reserved as stubs before the
 * `__extern_method_call` body bakes its `call <idx>`s and filled by
 * `fillFnCallDispatch` at FINALIZE.
 *
 * ## Byte-neutrality
 * Reserved only under `ctx.standalone || ctx.wasi` (the reserve call site);
 * gc/host mode uses the `env::__extern_*` imports and never emits any of this.
 */
import type { Instr, ValType, WasmFunction } from "../ir/types.js";
import { undefinedExternInstrs } from "./any-helpers.js";
import { buildClosureRefTestArms } from "./closure-classifier.js";
import type { CodegenContext } from "./context/types.js";
import { definedFuncAt, mintDefinedFunc, pushDefinedFunc } from "./func-space.js";
import { nativeStringLiteralInstrs } from "./native-strings.js";
import { addFuncType } from "./registry/types.js";
import { buildVecOrClosurePropMethodCallElseArm } from "./vec-props.js";

const FN_CALL_NAME_GATE = "__fn_call_name_gate";
const IS_FN_CALLABLE = "__is_fn_callable";
const FN_CALL_INVOKE = "__fn_call_invoke";

/**
 * `__extern_method_call`'s non-object else arm: `.call`-on-callable dispatch
 * first, then the UNCHANGED #3537 vec / #3468 closure composition.
 */
export function buildFnCallDispatchElseArm(
  ctx: CodegenContext,
  externGetIdx: number,
  applyClosureIdx: number,
): Instr[] {
  const inner = buildVecOrClosurePropMethodCallElseArm(ctx, externGetIdx, applyClosureIdx);
  const nameGateIdx = ctx.funcMap.get(FN_CALL_NAME_GATE);
  const isCallableIdx = ctx.funcMap.get(IS_FN_CALLABLE);
  const invokeIdx = ctx.funcMap.get(FN_CALL_INVOKE);
  if (nameGateIdx === undefined || isCallableIdx === undefined || invokeIdx === undefined) return inner;
  return [
    { op: "local.get", index: 1 }, // name
    { op: "call", funcIdx: nameGateIdx },
    { op: "local.get", index: 0 }, // recv
    { op: "call", funcIdx: isCallableIdx },
    { op: "i32.and" },
    {
      op: "if",
      blockType: { kind: "val", type: { kind: "externref" } },
      then: [
        { op: "local.get", index: 0 }, // recv (the function to invoke)
        { op: "local.get", index: 2 }, // argvec [thisArg, ...args]
        { op: "call", funcIdx: invokeIdx },
      ],
      else: inner,
    },
  ];
}

/**
 * Reserve the three `.call`-dispatch helper placeholders. Called from
 * `ensureObjectRuntime` (standalone/wasi) BEFORE `__extern_method_call` bakes
 * its arm. Idempotent; appends indices only.
 */
export function reserveFnCallDispatch(ctx: CodegenContext): void {
  if (ctx.fnCallDispatchReserved) return;

  const reserve = (name: string, params: ValType[], results: ValType[]): void => {
    if (ctx.funcMap.get(name) !== undefined) return;
    const typeIdx = addFuncType(ctx, params, results, `$${name}_type`);
    const funcIdx = mintDefinedFunc(ctx);
    const placeholder: WasmFunction = {
      name,
      typeIdx,
      locals: [],
      body: [{ op: "unreachable" }],
      exported: false,
    };
    pushDefinedFunc(ctx, funcIdx, placeholder);
    ctx.funcMap.set(name, funcIdx);
  };

  const externref: ValType = { kind: "externref" };
  reserve(FN_CALL_NAME_GATE, [externref], [{ kind: "i32" }]);
  reserve(IS_FN_CALLABLE, [externref], [{ kind: "i32" }]);
  reserve(FN_CALL_INVOKE, [externref, externref], [externref]);

  ctx.fnCallDispatchReserved = true;
}

/**
 * Fill the three reserved helper bodies at FINALIZE (closure-wrapper set and
 * every object-runtime funcIdx complete). No-op when never reserved. Any
 * missing dependency degrades the helper to "never dispatch" (gate answers 0 /
 * invoke answers the undefined sentinel), i.e. exactly the pre-#3544 behavior.
 */
export function fillFnCallDispatch(ctx: CodegenContext): void {
  if (!ctx.fnCallDispatchReserved) return;

  const setBody = (name: string, locals: { name: string; type: ValType }[], body: Instr[]): void => {
    const idx = ctx.funcMap.get(name);
    if (idx === undefined) return;
    const fn = definedFuncAt(ctx, idx);
    if (!fn) return;
    fn.locals = locals;
    fn.body = body;
  };

  const undefExtern = (): Instr[] => undefinedExternInstrs(ctx) ?? [{ op: "ref.null.extern" }];

  // ── __fn_call_name_gate(externref name) -> i32 — name is the string "call" ──
  {
    const strFlattenIdx = ctx.nativeStrHelpers.get("__str_flatten");
    const strEqualsIdx = ctx.nativeStrHelpers.get("__str_equals");
    const anyStrTypeIdx = ctx.anyStrTypeIdx;
    if (strFlattenIdx !== undefined && strEqualsIdx !== undefined && anyStrTypeIdx >= 0) {
      setBody(
        FN_CALL_NAME_GATE,
        [{ name: "__fkey", type: { kind: "ref_null", typeIdx: anyStrTypeIdx } }],
        [
          { op: "local.get", index: 0 },
          { op: "any.convert_extern" },
          { op: "ref.test", typeIdx: anyStrTypeIdx },
          { op: "i32.eqz" },
          { op: "if", blockType: { kind: "empty" }, then: [{ op: "i32.const", value: 0 }, { op: "return" }] },
          { op: "local.get", index: 0 },
          { op: "any.convert_extern" },
          { op: "ref.cast", typeIdx: anyStrTypeIdx },
          { op: "call", funcIdx: strFlattenIdx },
          { op: "local.set", index: 1 },
          { op: "local.get", index: 1 },
          { op: "ref.as_non_null" },
          ...nativeStringLiteralInstrs(ctx, "call"),
          { op: "call", funcIdx: strEqualsIdx },
        ],
      );
    } else {
      setBody(FN_CALL_NAME_GATE, [], [{ op: "i32.const", value: 0 }]);
    }
  }

  // ── __is_fn_callable(externref recv) -> i32 ──
  // Per-CONCRETE-type arms over `closureInfoByTypeIdx` — the SAME set the
  // `__call_fn_method_N` bodies (behind `__apply_closure`) ref.test, so the
  // gate answers 1 exactly when the invoke can dispatch. The narrower
  // `collectClosureBaseWrapperTypeIdxs` base-root walk was measured to MISS the
  // builtin proto-method wrapper structs (`$__proto_method_<brand>_<member>` —
  // String.prototype.slice stayed silent while Promise.resolve dispatched), so
  // it must not be the gate here; base arms are still appended for chains whose
  // subtypes are not individually registered.
  {
    const armTypeIdxs = new Set<number>();
    for (const [typeIdx] of ctx.closureInfoByTypeIdx) {
      const def = ctx.mod.types[typeIdx];
      if (def?.kind === "struct") armTypeIdxs.add(typeIdx);
    }
    const body: Instr[] = [{ op: "local.get", index: 0 }, { op: "any.convert_extern" }, { op: "local.set", index: 1 }];
    for (const typeIdx of [...armTypeIdxs].sort((a, b) => a - b)) {
      body.push(
        { op: "local.get", index: 1 },
        { op: "ref.test", typeIdx },
        { op: "if", blockType: { kind: "empty" }, then: [{ op: "i32.const", value: 1 }, { op: "return" }] },
      );
    }
    body.push(...buildClosureRefTestArms(ctx, 1, [{ op: "i32.const", value: 1 }, { op: "return" }]));
    body.push({ op: "i32.const", value: 0 });
    setBody(IS_FN_CALLABLE, [{ name: "__any", type: { kind: "anyref" } }], body);
  }

  // ── __fn_call_invoke(externref recv, externref args) -> externref ──
  // thisArg = args[0] (undefined when absent); rest = args[1..] re-pushed into
  // a fresh $ObjVec; dispatch __apply_closure(recv, thisArg, rest).
  {
    const applyClosureIdx = ctx.funcMap.get("__apply_closure");
    const objvecNewIdx = ctx.funcMap.get("__objvec_new");
    const objvecPushIdx = ctx.funcMap.get("__objvec_push");
    const objTypes = ctx.objectRuntimeTypes;
    if (
      applyClosureIdx !== undefined &&
      objvecNewIdx !== undefined &&
      objvecPushIdx !== undefined &&
      objTypes !== undefined
    ) {
      const { objVecTypeIdx, objVecArrTypeIdx } = objTypes;
      // params: 0=recv 1=args ; locals: 2=any 3=vec 4=len 5=i 6=thisArg 7=rest
      const locals: { name: string; type: ValType }[] = [
        { name: "__any", type: { kind: "anyref" } },
        { name: "__vec", type: { kind: "ref_null", typeIdx: objVecTypeIdx } },
        { name: "__len", type: { kind: "i32" } },
        { name: "__i", type: { kind: "i32" } },
        { name: "__thisArg", type: { kind: "externref" } },
        { name: "__rest", type: { kind: "externref" } },
      ];
      const body: Instr[] = [
        { op: "local.get", index: 1 },
        { op: "any.convert_extern" },
        { op: "local.tee", index: 2 },
        { op: "ref.test", typeIdx: objVecTypeIdx },
        { op: "i32.eqz" },
        {
          op: "if",
          blockType: { kind: "empty" },
          then: [
            // Defensive: argvec is always an $ObjVec from __call_m_*; if not,
            // invoke with undefined `this` and the args value as-is.
            { op: "local.get", index: 0 },
            ...undefExtern(),
            { op: "local.get", index: 1 },
            { op: "call", funcIdx: applyClosureIdx },
            { op: "return" },
          ],
        },
        { op: "local.get", index: 2 },
        { op: "ref.cast", typeIdx: objVecTypeIdx },
        { op: "local.set", index: 3 },
        // len = vec.len
        { op: "local.get", index: 3 },
        { op: "ref.as_non_null" },
        { op: "struct.get", typeIdx: objVecTypeIdx, fieldIdx: 0 },
        { op: "local.set", index: 4 },
        // thisArg = len > 0 ? vec.data[0] : undefined
        { op: "local.get", index: 4 },
        { op: "i32.const", value: 0 },
        { op: "i32.gt_s" },
        {
          op: "if",
          blockType: { kind: "val", type: { kind: "externref" } },
          then: [
            { op: "local.get", index: 3 },
            { op: "ref.as_non_null" },
            { op: "struct.get", typeIdx: objVecTypeIdx, fieldIdx: 1 },
            { op: "i32.const", value: 0 },
            { op: "array.get", typeIdx: objVecArrTypeIdx },
          ],
          else: [...undefExtern()],
        },
        { op: "local.set", index: 6 },
        // rest = __objvec_new(); for (i = 1; i < len; i++) push(rest, data[i])
        { op: "call", funcIdx: objvecNewIdx },
        { op: "local.set", index: 7 },
        { op: "i32.const", value: 1 },
        { op: "local.set", index: 5 },
        {
          op: "block",
          blockType: { kind: "empty" },
          body: [
            {
              op: "loop",
              blockType: { kind: "empty" },
              body: [
                { op: "local.get", index: 5 },
                { op: "local.get", index: 4 },
                { op: "i32.ge_s" },
                { op: "br_if", depth: 1 },
                { op: "local.get", index: 7 },
                { op: "local.get", index: 3 },
                { op: "ref.as_non_null" },
                { op: "struct.get", typeIdx: objVecTypeIdx, fieldIdx: 1 },
                { op: "local.get", index: 5 },
                { op: "array.get", typeIdx: objVecArrTypeIdx },
                { op: "call", funcIdx: objvecPushIdx },
                { op: "local.get", index: 5 },
                { op: "i32.const", value: 1 },
                { op: "i32.add" },
                { op: "local.set", index: 5 },
                { op: "br", depth: 0 },
              ],
            },
          ],
        },
        // __apply_closure(recv, thisArg, rest)
        { op: "local.get", index: 0 },
        { op: "local.get", index: 6 },
        { op: "local.get", index: 7 },
        { op: "call", funcIdx: applyClosureIdx },
      ];
      setBody(FN_CALL_INVOKE, locals, body);
    } else {
      // Deps absent — behave exactly like the pre-#3544 swallow (undefined).
      setBody(FN_CALL_INVOKE, [], [...undefExtern()]);
    }
  }
}
