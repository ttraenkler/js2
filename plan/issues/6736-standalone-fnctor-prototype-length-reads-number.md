---
id: 6736
title: "standalone: `.length` of a function's `prototype` object reads a number, so lodash's `isArrayLike(LazyWrapper.prototype)` is true and module init throws"
status: done
completed: 2026-09-29
sprint: current
created: 2026-09-28
priority: high
horizon: m
feasibility: medium
reasoning_effort: high
task_type: bug
area: compiler
goal: standalone
requested_by: ttraenkler/sendev-standalone
related: [6713, 6711, 2580, 6751]
# 2026-09-29 (#6736): one import line in the dispatcher; the lowering and its
# operand-position predicate live in src/codegen/standalone-any-length.ts.
loc-budget-allow:
  - src/codegen/property-access-dispatch.ts
---

# #6736 — `F.prototype.length` answers a number in standalone

## Problem

lodash 4.18.1 npm-compat **standalone-dynamic** lane, after
[#6713](https://js2wasm.loopdive.com/dashboard/issue.html?slug=6713-standalone-dynamic-regexp-carrier-call-construct)
(`RegExp` / Error carriers callable through a variable):

```
runtime-error (phase: module-init): TypeError: called value is not a function
```

Located with in-source step markers (a lodash copy with
`globalThis.__probeStep = N` markers, compiled standalone, no provider): module
init now runs to `lodash.js:17127`,
`baseForOwn(LazyWrapper.prototype, function(func, methodName) { … })`, and
throws inside `keys(LazyWrapper.prototype)` before the first iteratee call —
`isArrayLike(LazyWrapper.prototype)` answers **true**, so `keys` takes
`arrayLikeKeys` (never `baseKeys`), which calls a non-callable.

`isArrayLike` is `value != null && isLength(value.length) && !isFunction(value)`,
so the root is `.length` on a function's `prototype` object.

## Reduction (standalone, `runtimeEvalProvider: false`, 0 imports)

```js
var out = 0;
function ric(context) {
  var Object = context.Object;
  var objectCreate = Object.create;
  function isObject(v) { var t = typeof v; return v != null && (t == 'object' || t == 'function'); }
  var baseCreate = (function () {
    function object() {}
    return function (proto) {
      if (!isObject(proto)) return {};
      if (objectCreate) return objectCreate(proto);
      object.prototype = proto; var r = new object; object.prototype = undefined; return r;
    };
  }());
  function baseLodash() {}
  function lodash(value) { return value; }
  lodash.prototype = baseLodash.prototype;
  lodash.prototype.constructor = lodash;
  function LazyWrapper(value) { this.__wrapped__ = value; }
  LazyWrapper.prototype = baseCreate(baseLodash.prototype);
  LazyWrapper.prototype.constructor = LazyWrapper;
  var len = LazyWrapper.prototype.length;
  if (len === undefined) out += 1;
  if (typeof len === 'number') out += 2;
  if (typeof baseLodash.prototype.length === 'undefined') out += 4;
}
ric(globalThis);
export function run() { return out; }
```

Node answers **5**; standalone answers **2** (measured 2026-09-28 on
`2e23e49fb1` + #6713). A top-level variant is also internally inconsistent:
`function two(a, b) {}; var q = two.prototype;` reads `q.length === undefined`
as true (static fold) while `typeof q.length` is `"number"` (0).

## Direction

Find where a fnctor's `prototype` object answers `length` — likely the
prototype read resolving to (or inheriting from) the function carrier, whose
`length` is its arity. `F.prototype` is an ordinary object (§10.2.5
MakeConstructor), so `length` must be absent unless written. Re-run the lodash
standalone-dynamic lane for the next link.

## Implementation Plan

Executed. The design was revised once after the first merge_group attempt.

1. **Measure.** In standalone, every `recv.length` read on an `any` receiver
   went through `emitStandaloneAnyLength` (`property-access-dispatch.ts`).
   That path returns `f64` via `__extern_length`, the ToLength array-like
   reader, so an absent `length` read as `0`. Affected: `F.prototype`,
   `Object.create(p)`, `{}` and lodash's `LazyWrapper.prototype`. The
   dynamic-key spelling was already right. JS-host had fixed the same thing in
   #2580 M2.
2. **Lowering.** Add `emitStandaloneAnyLengthGet` in a new module,
   `src/codegen/standalone-any-length.ts`. It returns `externref` through
   these arms, in order:
   1. `$AnyString` → box(len).
   2. `__builtinfn_get_meta` → the metadata value.
   3. Closure → own `length` from the bag, or 0.
   4. The object runtime's ordinary `$Object` → `__extern_get(recv, "length")`,
      the real Get. It walks the prototype chain and gives `undefined` when
      absent.
   5. Anything else → box(`__extern_length`), the old value.

   Only arm 4 changes a value. Each boxed-number template is cloned per use,
   because the late-import shift rewrites `call` operands in place.
3. **Where the new read is used.** A new predicate,
   `lengthReadIsNumericOperand`, keeps the untouched numeric lowering for any
   read that is an operand of arithmetic, a relational test, `++`/`--`, an
   index, or an equality against another `.length` or a number literal
   (`i < a.length`, `b.length !== a.length`, `a.length - 1`). Every other
   position — a call argument (`isLength(value.length)`), an initializer, a
   return, `typeof`, `=== undefined` — uses the real Get. JS-host is not
   touched.
4. **Why the first cut was withdrawn.** It applied the Get to every
   non-string, non-closure receiver and read `$__vec_base` field 0 directly.
   The merge_group
   ([run 36522230625](https://github.com/loopdive/js2/actions/runs/36522230625))
   parked it on 70 standalone regressions:
   - 69 TypedArray rows. Field 0 of a TypedArray view is the `-1` auto-length
     sentinel, and detached views read their stale length; only
     `__extern_length` knows those carriers.
   - ES5 `harness/compare-array-arguments.js`. Two externref lengths compared
     with `!==` pulled `__any_to_extern` / `__any_from_extern_honest` into the
     module, which changed the module-wide `===` lowering. That exposed a
     latent `arguments[i]` read that returns an object.

   Arms 4–5 and the operand predicate are the fix for both.
5. **Acceptance.**
   - Regression test: fails on the parent, passes with the fix.
   - The 71 rows lost in the merge_group pass locally, apart from one Temporal
     row that has no provider locally.
   - Scoped standalone test262, parent vs fix, has no losses.
   - The lodash lane is measured before and after on the same base.

## Resolution

**Result.** An absent `length` on an ordinary object now reads `undefined`
in standalone. This covers `F.prototype`, `Object.create(p)` and `{}`, and
lodash's `isArrayLike(LazyWrapper.prototype)` is false again. The
implementation is described in the plan above.

**Regression test** `tests/issue-6736-any-length-absent.test.ts`: 3/3 pass
with the fix. On the parent all three fail, reading `2`, `108` and `127`
(expected `5`, `127` and `511`).

**Nearby unit tests (15 files) and `issue-2576`:** green, with no expectation
changes.

**Rows lost in the first merge_group** (run 36522230625, 71 rows):

- 70 pass locally with the fix.
- The 71st, `Temporal/Duration/prototype/round/roundingmode-trunc.js`, fails
  the same way on the parent locally, because no Temporal provider is built
  here. In the merge_group it was a `compile_timeout`.

**Scoped standalone test262**, parent `0aeb5733bb` vs fix, 1773 rows:

| | Parent | Fix |
|---|---|---|
| All rows | 1508 pass | 1507 pass |
| `built-ins/Function/prototype` + `language/statements/function` (760) | 711 pass | 711 pass |

The 1773 rows also include `Array/from`, `Array/prototype/{slice,indexOf}`,
`Object/keys`, `language/arguments-object`, `test/harness`,
`TypedArray/prototype/{length,copyWithin,fill,set}` and `rest-parameters`.
The one-row gap is `TypedArray/prototype/fill/detached-buffer.js`. It hit a
216 s compile timeout under load and passes when re-run alone. No other row
flipped.

**JS-host:** byte-identical binaries on the probe set.

**lodash standalone-dynamic lane**, same base (`3c9d85424a`), parent vs fix:

- Parent: `runtime-error`, `"TypeError: called value is not a function"`,
  phase `module-init`.
- Fix: `runtime-error`, `"TypeError: called value is not a function"`, phase
  `checksum`. Module init now completes. The next link is filed as #6751.

**Residuals, all pre-existing behaviour and unchanged here:**

- A `.length` read that is a numeric operand still uses the ToLength value,
  so `{}.length === 0` is still true. The same holds for reads that are not
  on an ordinary `$Object`, such as `(5).length`.
- `arguments[i]` read through a captured `arguments` object can report
  `typeof` `"object"`. Seen in the compare-array-arguments reduction.
- Numeric var-slot inference can type a local initialized from `v.length` as
  f64.
