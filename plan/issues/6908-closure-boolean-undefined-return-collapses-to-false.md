---
id: 6908
title: "JS host: a closure whose result is `boolean | undefined` returns `false` on fall-off-the-end — prettier `isEmptyDoc` answers \"empty\" for every non-empty doc (6 is-empty-doc tests)"
status: ready
sprint: Backlog
created: 2026-10-07
updated: 2026-10-07
priority: medium
horizon: m
feasibility: medium
reasoning_effort: high
task_type: bug
area: codegen
language_feature: closures, return-values, undefined
goal: core-semantics
related: [4641, 3580, 6771, 6907]
requested_by: ttraenkler/wave13-prettier
origin: "2026-10-07 — prettier is-empty-doc.js 10/16; reduced while working #6907"
---

# #6908 — closure `boolean | undefined` result collapses to `false`

## Problem

Measured on upstream main `e7760d1c2a` (JS host, `compileProject` + `allowJs`).
Node answers in brackets.

```js
function h(x) { if (x) return false; }            // declaration
function call(cb, v) { return cb(v); }
const k = (x) => { if (x) return false; };        // arrow
const k2 = function (x) { switch (x) { case 1: return false; } };
h(0) === false          // false  [false]   (#4641 fixed declarations)
call(k, 0) === false    // TRUE   [false]
call(k2, 0) === false   // TRUE   [false]
String(call(k, 0))      // "false" ["undefined"]
```

TypeScript infers the closure result as `false | undefined`;
`resolveWasmTypeForClosureReturn` strips the nullish member and lowers it to
`i32`, and `emitDefaultReturnValue` materializes the fall-off-the-end as `0`.

Prettier's `isEmptyDoc` / `canBreak` / `findInDoc` all use
`traverseDoc(doc, (doc) => { switch … return false; })`, and `traverseDoc`
stops descending when `onEnter?.(doc) === false`. So the first `""` child
already stops the walk and `isEmptyDoc(["", "a"])` answers `true`.

## Implementation Plan

Two halves must agree, or the fix only moves the bug:

1. **Definition** — in `closures.ts` (the return-type ladder at
   `widenProxyTrapMixedReturn(…)`, ~L2232) wrap with a
   `widenClosureMixedBooleanReturn(fn, retType, lowered)` that returns
   `widenMixedUndefinedReturn(retType, lowered)` when `lowered.kind === "i32"`
   and `fn` is an arrow / function expression. Measured on its own (not
   shipped) it fixes the one-module shapes above (`call(k, 0)`):
   ```ts
   export function widenClosureMixedBooleanReturn(fn, retType: ts.Type, lowered: ValType): ValType {
     if (ts.isFunctionDeclaration(fn) || lowered.kind !== "i32") return lowered;
     return widenMixedUndefinedReturn(retType, lowered);
   }
   ```
2. **Call site** — it does NOT fix prettier: `traverseDoc`'s `onEnter` is
   typed by a JSDoc typedef `(doc) => void | boolean`, and the CALL
   `onEnter?.(doc)` lowers its result through that declared function type,
   whose `void | boolean` also strips to `i32`, so the widened externref
   `undefined` is coerced back to `false` at the call. Apply the same
   `T | undefined|void → externref` rule to the result type the closure-call
   path derives from a function TYPE (`ts.Signature` of the callee
   expression) so a widened closure and its callers agree.
3. Scope: boolean carrier only (the #4641 census shape). `number | undefined`
   closures are #3580 S3.

## Acceptance

- The four lines above match Node.
- prettier `tests/unit/is-empty-doc.js` 16/16 (with `cleanDoc` — see note).
- Scoped test262 (both lanes) over `language/expressions/arrow-function`,
  `language/expressions/function`, `built-ins/Array/prototype/{find,some,every,filter}`:
  no regression.

Note: `cleanDoc(group([]))` also differs from Node (keeps the group,
`expandedStates: null`, a `line` part of `fill` reads `null`); measure
is-empty-doc after half 2 before assuming 16/16.
