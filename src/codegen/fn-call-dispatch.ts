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
 * discriminates the receiver's calling convention (see the `__fn_call_invoke`
 * fill below): SPLIT closures get `thisArg = argvec[0]` + `rest = argvec[1..]`
 * through `__apply_closure` (the #1888 arity bridge); FOLDED
 * this-as-first-param proto-method closures get the ORIGINAL argvec padded to
 * their declared user-param count (the runtime mirror of the #2193 PR-B
 * static `m.call(t, a)` → `m(t, a)` rewrite). Bonus: this also fixes
 * `f.call(x)` on ordinary capturing closures through the dynamic path
 * (previously the prop-carrier arm consulted the expando bag and answered
 * undefined).
 *
 * `.apply` is a follow-on slice (array-argument spreading).
 *
 * ## Narrow gate (#3544): 8 curated floor-load-bearing refusal stubs do NOT
 * dispatch. `ctx.fnCallRefusalMetaTypeIdxs` (registered from the curated
 * `FN_CALL_REFUSAL_EXCLUDED_*` lists below) answer 0 in `__is_fn_callable` — a
 * measured, documented deferral (silent-undefined is wrong; the floor's #3468
 * vacuous passes can't absorb the honest throw yet). Every OTHER refusal stub
 * dispatches and its catchable TypeError is a measured truth win. Census,
 * member list and removal condition: see the list constants below.
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
 * (#3544 narrow gate) The CURATED floor-load-bearing exclusion lists — the
 * exact members whose #2984 "not yet implemented" refusal stubs, if dispatched
 * by the dynamic `.call` arm, throw at module init inside currently-PASSING
 * standalone-floor tests and regress the merge_group baseline.
 *
 * This is a documented, KNOWN-WRONG deferral, not a design: silent-undefined
 * for `m.call(x)` on these members is a spec violation the compiler is
 * deliberately keeping (status quo) because the test262 standalone floor still
 * contains vacuous passes (#3468: assert.* never runs, so a module-init throw
 * is the only way a floor test can fail) that the honest refusal throw would
 * flip. Measured 2026-07-23 on the FULL census of pass-baseline standalone
 * tests containing `.call` (2,242 tests, paired against a main control):
 * dispatching ALL refusal stubs cost exactly 19 floor tests, wholly
 * attributable to the 8 members below (Array.of 4, Array.from 4,
 * Promise.resolve 2, Promise.reject 2, Date.prototype.toJSON 2,
 * String.prototype.valueOf 2, Symbol.prototype.valueOf 2,
 * WeakRef.prototype.deref 1) — with ZERO CI-visible wins as offset, because
 * the receiver-validation wins live entirely inside vacuous-pass territory
 * (the CI floor metric CANNOT see them; see the #3544 issue file).
 *
 * The lists are CURATED (not "every refusal stub") on purpose: refusal stubs
 * outside this list — e.g. `String.prototype.slice`/`concat` as VALUES, the
 * DisposableStack methods — DO dispatch, and their catchable refusal TypeError
 * is a measured truth win (the #3468-cliff receiver-validation tests assert
 * only the error constructor). Only members with a measured top-level dynamic
 * `.call` in a currently-passing floor test are pinned here. New floor entries
 * cannot re-create the hazard after this lands: with dispatch shipped, such a
 * test enters the baseline as `fail` from the start (no regression event).
 *
 * REAL FIX per member: wire its native body (follow-up issues filed from
 * #3544) and DELETE it from this list — dispatch then widens automatically.
 * REMOVAL CONDITION for the whole mechanism: once the #3468 observability
 * work lands and the standalone baseline no longer carries vacuous passes for
 * these members, delete both lists and the mint-time registrations — the
 * refusal throw is then a strict truth win the floor can absorb.
 */
export const FN_CALL_REFUSAL_EXCLUDED_PROTO_MEMBERS: ReadonlySet<string> = new Set([
  "Date.toJSON",
  "String.valueOf",
  "Symbol.valueOf",
  "WeakRef.deref",
]);
export const FN_CALL_REFUSAL_EXCLUDED_STATICS: ReadonlySet<string> = new Set([
  "Array.of",
  "Array.from",
  "Promise.resolve",
  "Promise.reject",
]);

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
  //
  // ── #3544 NARROW GATE — a documented, KNOWN-WRONG deferral, not a design ──
  // The CURATED floor-load-bearing refusal stubs
  // (`ctx.fnCallRefusalMetaTypeIdxs`, registered at mint time from
  // `FN_CALL_REFUSAL_EXCLUDED_PROTO_MEMBERS` / `…_STATICS` above) are tested
  // FIRST and answer 0 (NOT callable), so `m.call(x)` on those 8 members keeps
  // today's silent undefined instead of newly reaching the refusal throw.
  // Silent-undefined is WRONG; see the census, rationale and removal condition
  // on the list constants at the top of this module. All other refusal stubs
  // and every refusal GETTER (spec-correct receiver error, #3250) dispatch.
  {
    const armTypeIdxs = new Set<number>();
    for (const [typeIdx] of ctx.closureInfoByTypeIdx) {
      const def = ctx.mod.types[typeIdx];
      if (def?.kind === "struct") armTypeIdxs.add(typeIdx);
    }
    const body: Instr[] = [{ op: "local.get", index: 0 }, { op: "any.convert_extern" }, { op: "local.set", index: 1 }];
    // Exclusion arms FIRST: a refusal meta is a SUBTYPE of its (possibly
    // signature-shared) base wrapper, so testing it before the inclusive arms
    // is what makes the exclusion authoritative.
    const refusalTypeIdxs = [...(ctx.fnCallRefusalMetaTypeIdxs ?? [])]
      .filter((typeIdx) => ctx.mod.types[typeIdx]?.kind === "struct")
      .sort((a, b) => a - b);
    for (const typeIdx of refusalTypeIdxs) {
      armTypeIdxs.delete(typeIdx);
      body.push(
        { op: "local.get", index: 1 },
        { op: "ref.test", typeIdx },
        { op: "if", blockType: { kind: "empty" }, then: [{ op: "i32.const", value: 0 }, { op: "return" }] },
      );
    }
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
  //
  // TWO closure calling conventions coexist (the #3544 key discovery), so the
  // invoke must discriminate the receiver before shaping the arg vector:
  //
  //  - SPLIT — ordinary user closures and the static-shape builtin closures:
  //    lifted sig `(self, ...args)`; `this` flows via the `__current_this`
  //    global. `.call(t, a…)` splits the argvec: thisArg = argvec[0],
  //    rest = argvec[1..] → `__apply_closure(m, t, rest)`.
  //  - FOLDED — builtin proto-method closures (`ensureStandaloneNativeMethod-
  //    Closure`, native-proto.ts) and the @@species getters: lifted sig
  //    `(self, THIS-AS-PARAM, ...args)` — the receiver is user param 1. Same
  //    contract as the STATIC reflective route (`emitReflectiveNativeProto-
  //    ClosureCall` / the #2193 PR-B `m.call(t, a)` → `m(t, a)` rewrite in
  //    calls.ts): pass the ORIGINAL argvec `[t, a…]` (this folded as the first
  //    user arg), PADDED with undefined up to the closure's declared user-param
  //    count. The pad matters because `__apply_closure` dispatches on the
  //    VECTOR LENGTH: an under-length vec routes to a smaller
  //    `__call_fn_method_N` that carries no arm for this closure's func type —
  //    which was exactly the measured silent-undefined
  //    (`String.prototype.slice.call(undefined, 0)` → argvec len 2 →
  //    `__call_fn_method_2`, but the slice closure has 3 user params).
  //
  // Discrimination set: `nativeProtoReceiverClosureStructTypes` (#2193 PR-B —
  // the definitive "first user param IS the receiver" registry) INTERSECTED
  // with `builtinFnMetaByTypeIdx` (meta subtypes only). The registry also
  // holds the base signature-wrapper structs (native-proto.ts adds both), but
  // base wrappers are SHARED with ordinary user closures of the same signature
  // (#1712: capture structs subtype their signature wrapper), so a `ref.test`
  // on a base wrapper would mis-fold a user closure's `f.call(x)`. Meta-only is
  // still COMPLETE: every proto-method VALUE is minted as its unique
  // per-(brand, member) meta subtype (`ensureStandaloneNativeMethodClosure`
  // returns the meta type; the #2963 singleton materializer allocates it).
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

      // Folded-convention (this-as-first-param) meta types, with each closure's
      // declared user-param count (this + arg slots) as the pad target.
      const foldedMetas: { typeIdx: number; userParamCount: number }[] = [];
      if (ctx.nativeProtoReceiverClosureStructTypes) {
        for (const typeIdx of ctx.nativeProtoReceiverClosureStructTypes) {
          if (!ctx.builtinFnMetaByTypeIdx?.has(typeIdx)) continue; // meta subtypes only — base wrappers are signature-shared
          const info = ctx.closureInfoByTypeIdx.get(typeIdx);
          if (!info) continue;
          const def = ctx.mod.types[typeIdx];
          if (def?.kind !== "struct") continue;
          foldedMetas.push({ typeIdx, userParamCount: info.paramTypes.length });
        }
        foldedMetas.sort((a, b) => a.typeIdx - b.typeIdx);
      }

      // params: 0=recv 1=args ;
      // locals: 2=any 3=vec 4=len 5=i 6=thisArg 7=out 8=recvAny 9=fold
      const locals: { name: string; type: ValType }[] = [
        { name: "__any", type: { kind: "anyref" } },
        { name: "__vec", type: { kind: "ref_null", typeIdx: objVecTypeIdx } },
        { name: "__len", type: { kind: "i32" } },
        { name: "__i", type: { kind: "i32" } },
        { name: "__thisArg", type: { kind: "externref" } },
        { name: "__out", type: { kind: "externref" } },
        { name: "__recvany", type: { kind: "anyref" } },
        { name: "__fold", type: { kind: "i32" } },
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
        // fold = -1 (split), or the matched folded closure's user-param count.
        // Locals default to 0, and 0 is a valid pad target — set -1 explicitly.
        { op: "i32.const", value: -1 },
        { op: "local.set", index: 9 },
        { op: "local.get", index: 0 },
        { op: "any.convert_extern" },
        { op: "local.set", index: 8 },
        ...foldedMetas.flatMap((meta): Instr[] => [
          { op: "local.get", index: 8 },
          { op: "ref.test", typeIdx: meta.typeIdx },
          {
            op: "if",
            blockType: { kind: "empty" },
            then: [
              { op: "i32.const", value: meta.userParamCount },
              { op: "local.set", index: 9 },
            ],
          },
        ]),
        // thisArg = len > 0 ? vec.data[0] : undefined (both conventions:
        // installed into __current_this by __call_fn_method_N — the split
        // closures read it there; folded bodies read their param 1 instead).
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
        // out = __objvec_new(); i = folded ? 0 : 1;
        // copy loop: while (i < len) push(out, data[i++])
        //   → folded keeps the this-carrying original argvec, split drops [0].
        { op: "call", funcIdx: objvecNewIdx },
        { op: "local.set", index: 7 },
        { op: "local.get", index: 9 },
        { op: "i32.const", value: 0 },
        { op: "i32.ge_s" },
        {
          op: "if",
          blockType: { kind: "val", type: { kind: "i32" } },
          then: [{ op: "i32.const", value: 0 }],
          else: [{ op: "i32.const", value: 1 }],
        },
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
        // pad loop (folded only): while (i < fold) push(out, undefined) —
        // no-op on the split path (i ≥ 0 > fold = -1 exits immediately).
        {
          op: "block",
          blockType: { kind: "empty" },
          body: [
            {
              op: "loop",
              blockType: { kind: "empty" },
              body: [
                { op: "local.get", index: 5 },
                { op: "local.get", index: 9 },
                { op: "i32.ge_s" },
                { op: "br_if", depth: 1 },
                { op: "local.get", index: 7 },
                ...undefExtern(),
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
        // __apply_closure(recv, thisArg, out)
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
