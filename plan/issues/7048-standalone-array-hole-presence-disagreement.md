---
id: 7048
title: "standalone: `in` and `hasOwnProperty` disagree on array holes — `new Array(5)` owns index 2, a length-extended array has `3 in b`"
status: ready
sprint: Backlog
created: 2026-10-17
updated: 2026-10-17
priority: medium
horizon: m
feasibility: medium
reasoning_effort: high
task_type: bug
area: codegen
language_feature: arrays
goal: core-semantics
related: [6485, 4491, 7014]
requested_by: ttraenkler/wave15-grep-other-sentinels
---

# #7048 — hole presence: `in` vs `hasOwnProperty` vs `Object.keys`

## Problem

`tests/issue-6485-concat-isconcatspreadable.test.ts` → "keeps `in`,
hasOwnProperty and Object.keys agreeing on a hole-less carrier" is red
(#7014). Measured on main, `--target standalone`, each value from its own
module (`.tmp/p6485.mts`), node in brackets:

| expression | js2wasm | node |
|---|---|---|
| `2 in new Array(5)` | 0 | false |
| `hasOwnProperty.call(new Array(5), 2)` | **1** | false |
| `Object.keys(new Array(5)).length` | 0 | 0 |
| `b=[1,2]; b.length=5; 3 in b` | **1** | false |
| `hasOwnProperty.call(b, 3)` | 0 | false |
| `m=[1].concat([2],[3]); m[7]=9; 5 in m` | **1** | false |
| `hasOwnProperty.call(m, 5)` | **1** | false |

So holes are now partly modelled (`Object.keys`, `in` on `new Array(n)`) while
`hasOwnProperty` on a `new Array(n)` hole, `in` on a length-extended array, and
both checks on a grown concat result still treat the slot as present. The pin
asserted the OLD all-present model's internal consistency (its `Object.keys`
expectation is 5, annotated "Node: 0"), so once fixed its expectations should
move to node's values rather than back to 5.

## Plan

1. Locate the three presence answers for vec carriers: the `in` lowering
   (`binary-ops-in.ts` / `array/in-array-carrier.ts`), the
   `hasOwnProperty` borrowed-call arm, and `Object.keys` (the one that is
   right). Route all three through the same hole test.
2. `b.length = 5` must not mark indices 2..4 present; a write past the end
   (`m[7] = 9`) must not mark 3..6 present.
3. Update the 6485 pin to node's values; standalone test262
   `built-ins/Array` (holes) + `built-ins/Object/prototype/hasOwnProperty`
   base vs fix.
