---
id: 2702
title: "compileProject resolve.alias — inject host-delegate shims for npm-package compiles (without polluting node_modules)"
status: in-progress
created: 2026-06-26
updated: 2026-06-26
assignee: ttraenkler/sendev-eslint
priority: high
area: module-resolution
goal: npm-library-support
feasibility: medium
related: [2693, 2119, 2107, 1573]
---
# compileProject `resolve.alias` — host-delegate shim injection

## Problem

To compile a real npm package to Wasm with SOME deps **host-delegated**
(parse/select/logging running on the JS host) rather than compiled, the
compiler must resolve those specifiers to thin SHIM modules — WITHOUT touching
the shared `/workspace/node_modules` (10 concurrent agents) and WITHOUT a
fixtures-dir copy (which breaks resolution — see Findings).

Concretely for the real eslint `Linter.verify` (#2693): compile `linter.js` +
eslint-scope + eslint-visitor-keys + @eslint/plugin-kit (+ transitive), while
`espree` / `esquery` / `debug` resolve to host-delegate shims
(`tests/fixtures/eslint-shims/{espree,esquery,debug}.ts`, landed via #2119).

This is the **reusable npm-library-support primitive**: "compile package X with
deps Y host-delegated."

## Design — `CompileOptions.resolve.alias`

Add `resolve.alias?: Record<string, string>` (bare specifier → ABSOLUTE file
path of the replacement/shim). Honored in BOTH resolution layers:

1. **`ModuleResolver.resolve(specifier, containingFile)`** (`src/resolve.ts`):
   at the TOP of `resolve()`, if `getBarePackageName(specifier)` (or the exact
   specifier) is in `alias`, return the aliased abs path directly (short-circuit
   `ts.resolveModuleName`). This makes `resolveAllImports` pull the shim file
   into the compiled files map. **(Bounded — ~10 lines.)**

2. **`analyzeMultiSource`'s in-memory TS program** (`src/compiler.ts` →
   wherever `analyzeMultiSource` builds its program): the TS2307 "Cannot find
   module" errors come from HERE, not from `ModuleResolver`. The in-memory
   program resolves bare specifiers against the files map; it does NOT walk
   node_modules. The alias must reach this program too, via ONE of:
   - a `resolveModuleNames` / `resolveModuleNameLiterals` host hook that maps an
     aliased specifier → the shim's map key, OR
   - inject the shim content into the files map under a conventional key the
     program's standard resolution finds (e.g. `node_modules/<spec>/index.ts`),
     plus the `compilerOptions.paths` entry `{ "<spec>": ["node_modules/<spec>"] }`.
   **This is the harder half — INVESTIGATE `analyzeMultiSource` first** (it was
   not located before budget cutoff; grep `analyzeMultiSource` definition; it
   likely lives in `src/ts-api.ts` / a multi-analyze module behind the TS7/TS5
   backend split).

### Acceptance / test
A focused test: compile a tiny 2-file pkg where the entry `require("somelib")`
resolves — via `resolve.alias: { somelib: <abs shim path> }` — to a shim that
`declare`s a host import; assert `r.success` + `WebAssembly.validate` + the host
import is wired (instantiate + call). Then the eslint bounded compile consumes
it.

## Findings (verified this session, pre-cutoff)

- `compileProject` flow: `ModuleResolver` + `resolveAllImports` build an
  abs-path→content map → `compileProject` re-keys to RELATIVE-from-rootDir →
  `compileMultiSource` → `analyzeMultiSource` builds the TS program → TS2307.
- **Real-path compile resolves RELATIVE requires fine**: `compileProject(
  /workspace/node_modules/eslint/lib/linter/source-code-fixer.js, {allowJs})`
  → `success:true`. So the canonical-node_modules entry is the right base.
- **Fixtures-dir compile BREAKS even relative requires**: copying eslint +
  deps into a `.eslint-deps/node_modules` and compiling the entry there →
  TS2307 on `../shared/traverser` (real copied file). So DON'T use a
  fixtures-dir copy; use the REAL eslint entry + alias the BARE deps only.
- The bounded external dep set (sd-2674b validated): eslint-scope@9.1.2,
  eslint-visitor-keys@5.0.1, @eslint/plugin-kit@0.6.1 COMPILE; @eslint/core@1.1.1
  is type-only; esquery → host-delegate (#2700). Transitive: esrecurse,
  estraverse (eslint-scope); levn→prelude-ls,type-check (plugin-kit). All in the
  pnpm store at `node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>`.
- `setup-eslint-deps.mjs` (this branch) assembles the dep list + store paths +
  shim injection — but its fixtures-dir approach is the one that breaks (2).
  Reuse its STORE_DEPS map + shim list; switch the strategy to alias-the-real-entry.

## Resume point (next session)

Worktree: `/workspace/.claude/worktrees/agent-a860399d6466e8098`
Branch: `issue-2702-resolve-alias` (off upstream/main; no code yet — WIP banked)

1. Locate `analyzeMultiSource` + its module-resolution host; decide alias hook
   (resolveModuleNameLiterals vs files-map injection + `paths`).
2. Implement `resolve.alias` in both layers (1)+(2); add the focused test; land
   #2702 as its own PR (full floor, one-shot enqueue) — it's independently
   valuable.
3. THEN the literal-class run (#2693 endgame), ONE disciplined attempt:
   - Adapter entry: `export function lintSemi(code: string): string { const l =
     new Linter(); const m = l.verify(code, { languageOptions:{ ecmaVersion:2022,
     sourceType:"script" }, rules:{ semi:"error" } }); return m.length ?
     m[0].message + " (" + m[0].line + ":" + m[0].column + ")" : ""; }` —
     compiled as the entry (pulls real Linter + bounded deps, aliased shims).
   - compileProject the adapter with `resolve.alias` for espree/esquery/debug
     (+ the store deps if the alias also bounds those, else they compile).
   - Instantiate via `r.importObject` (auto stringPool, src/index.ts:414); wire
     env host imports: `__host_espree_parse/parseForESLint/tokenize`,
     `__host_esquery_parse/matches` (real Node espree/esquery via realpath
     createRequire — see tests/issue-2693-host-delegated-select.test.ts), debug
     no-op. node:path is the #1791 host route.
   - Config marshaling: pass a PRE-BUILT flat config to verify() (avoid the
     FlatConfigArray/config-array/config-helpers/minimatch layer).
   - Run `lintSemi("var x = 1")` → expect "Missing semicolon. (1:9)".
   - **First FRESH codegen bug (likely in the full-eslint AST traversal /
     compiled-walks-host-AST boundary) → STOP, diagnose, carve a new issue,
     report. Do NOT grind.**

## Status / banking
- Milestone ARCHITECTURE proven + merged: #2107 (eslint-style Linter.verify runs
  as Wasm) + #2119 (dual host-delegation seam with REAL espree+esquery).
- #2120 (#2688 apply-disable struct-shape) merged → the eslint compile set is
  codegen-clear up to the resolver gap this issue closes.
- This issue (#2702) is the resolver unblock; then the literal-class run spans
  into next sprint via the steps above.
