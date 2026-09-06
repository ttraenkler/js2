// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.

/** Physical import and exception-tag registration without source collection. */
import type { Import, TagDef } from "../../ir/types.js";
import type { CodegenContext } from "../context/types.js";
import { buildStrictHostImportError, isHostImportAllowed } from "../host-import-allowlist.js";
import { addFuncType } from "./types.js";

/**
 * Register an import (`module.name`) on the current module.
 *
 * Under `ctx.strictNoHostImports` (auto-on for `--target wasi`, controllable
 * via `--no-host-imports` / `--allow-host-imports` on the CLI; see #1524),
 * any `env`-module import that is not on the dual-mode allowlist
 * (`src/codegen/host-import-allowlist.ts`) is rejected with a structured
 * compile error referencing the tracking issue. The error is pushed onto
 * `ctx.errors`; the import itself is silently dropped to avoid producing a
 * module that references a nonexistent function index. Downstream code that
 * attempts to `call` the dropped function will fail validation if the
 * caller did not check `result.success` before consuming the binary.
 *
 * `wasi_snapshot_preview1` imports are always allowed; they are the canonical
 * WASI ABI, not JS-host bindings.
 *
 * `wasm:js-string` / `string_constants` are JS-host bindings but are usually
 * not requested under strict mode because `nativeStrings` is auto-enabled.
 * If they ARE requested under strict mode, the gate rejects them with a
 * dedicated error pointing the user at the nativeStrings option.
 */
export function addImport(ctx: CodegenContext, module: string, name: string, desc: Import["desc"]): Import | undefined {
  // #1984 — freeze-point discipline. Once the module's index spaces are
  // declared final (set right before `stackBalance` in generateModule/
  // generateMultiModule), any further import mutation is a producer bug:
  // it shifts indices that downstream code already emitted as final, the
  // #2043-class poisoning. Throw HERE so the offending producer self-identifies
  // with its own stack, instead of #2043's emit-time validation only naming the
  // downstream symptom. The throw is caught by the generate* try/catch and
  // surfaced as a `Codegen error:` (the compile fails loudly, never ships a
  // poisoned binary).
  if (ctx.indexSpaceFrozen) {
    throw new Error(
      `import space frozen (#1984): '${module}.${name}' added after finalize — ` +
        `this producer must register its import before the freeze point or refuse loudly`,
    );
  }
  if (ctx.strictNoHostImports) {
    // #2783 — pass `ctx.linkedNamespaces` so an arbitrary `--link`'d namespace's
    // import is actually REGISTERED (left as a link-time import for a preloaded
    // provider) rather than dropped-and-degraded here. Dropping it would leave a
    // stale funcMap index and the program could never satisfy the linked symbol.
    const decision = isHostImportAllowed(module, name, ctx.linkedNamespaces);
    if (!decision.allowed) {
      const message = buildStrictHostImportError(module, name);
      // #1921 — this per-call gate *drops* the import and lets codegen
      // continue, so the diagnostic is a deliberate `"degrade"`, not a hard
      // error: the binary is still produced (dropped imports degrade to no-op
      // / stale-index sites). The authoritative fatal backstop is the
      // emit-time import-section scan (`assertNoLeakedHostImports` →
      // `buildLeakedHostImportError`, severity "error"), which fires only if
      // an unsupported host import actually *survived* into the finished
      // binary. Classifying this as "error" instead would fail builds that
      // legitimately drop-and-degrade unsupported host APIs under WASI (e.g.
      // examples/native-messaging/nm_js2wasm.ts: setTimeout/fetch/…).
      ctx.errors.push({ message, line: 0, column: 0, severity: "degrade" });
      // (#3009) Record the dropped host import on the MODULE so finalize-time
      // handle resolution can name it. When a producer bakes this dropped
      // import's (now `undefined`) function index into a helper body coupled to
      // a stable handle — e.g. console.log's native-string extern bridge
      // `__str_to_extern` calling the dropped `__str_from_mem`/`__str_to_mem`/
      // `__str_extern_len` — `absoluteFuncIndex` would otherwise crash with an
      // opaque "stable handle undefined (ordinal NaN)". With the coupling
      // recorded, that resolution point surfaces a clean, actionable leak
      // diagnostic naming these imports instead of an internal-error stack.
      if (desc.kind === "func") {
        const recorded = (ctx.mod.strictDroppedHostImports ??= []);
        if (!recorded.some((d) => d.module === module && d.name === name)) {
          recorded.push({ module, name });
        }
      }
      // Skip registration. The caller may record a stale funcMap index if it
      // looks the import up by name; if that index is ever emitted into the
      // binary the emit-time leak scan / link step catches it.
      return undefined;
    }
  }
  ctx.mod.imports.push({ module, name, desc });
  if (desc.kind === "func") {
    ctx.funcMap.set(name, ctx.numImportFuncs);
    ctx.numImportFuncs++;
  }
  if (desc.kind === "global") {
    ctx.numImportGlobals++;
  }
  return ctx.mod.imports[ctx.mod.imports.length - 1]!;
}

/**
 * Lazily register the exception tag used by throw/try-catch.
 * The tag has signature (externref) — all thrown values are externref.
 */
export function ensureExnTag(ctx: CodegenContext): number {
  if (ctx.exnTagIdx >= 0) return ctx.exnTagIdx;
  const typeIdx = addFuncType(ctx, [{ kind: "externref" }], []);
  // (#5226) A separately-linked graph shares ONE host-owned tag. Wasm matches a
  // `catch` clause by tag IDENTITY, so a module-local tag per module means a
  // provider's `throw` can never be caught by its consumer's `catch` — it lands
  // in `catch_all`, whose `__get_caught_exception()` never saw a host frame and
  // answers `undefined`. Importing the tag makes the crossing lossless: the
  // externref payload (the host-native `RangeError`) is delivered unchanged, so
  // `instanceof`, `name`, `message` and any own props all survive by identity.
  if (ctx.sharedExnTag) {
    // Imported tags occupy the low indices, and this is the only tag import we
    // ever register — so index 0. `exnTagIdx` is ABSOLUTE in both regimes.
    ctx.exnTagIdx = ctx.mod.imports.filter((imp) => imp.desc.kind === "tag").length;
    addImport(ctx, "env", "__exn", { kind: "tag", typeIdx });
    return ctx.exnTagIdx;
  }
  const tagDef: TagDef = { name: "__exn", typeIdx };
  ctx.exnTagIdx = ctx.mod.tags.length;
  ctx.mod.tags.push(tagDef);
  return ctx.exnTagIdx;
}
