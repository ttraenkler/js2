// #2693 — bounded fixtures assembler for the real eslint `Linter.verify` compile.
//
// compileProject(eslint/lib/linter/linter.js) must resolve linter.js's external
// requires. The deps live ONLY in the pnpm store (node_modules/.pnpm/...), not
// hoisted to top-level node_modules — so a bare `require("eslint-scope")` from
// the symlinked eslint entry fails. This assembler builds a SELF-CONTAINED
// fixtures node_modules (gitignored `.eslint-deps/`) that:
//   1. symlinks `eslint` → the real package (no copy of its ~hundreds of files),
//   2. symlinks the COMPILE deps + their transitive closure from the pnpm store,
//   3. drops the host-delegate SHIMS (espree/esquery/debug) at those specifier
//      paths so compileProject resolves a BOUNDED graph (no full espree/acorn or
//      esquery/PEG source pulled in → no OOM; parse + select host-delegated).
//
// The compileProject ENTRY is `<root>/node_modules/eslint/lib/linter/linter.js`;
// the resolver walks up to `<root>/node_modules/` (it does NOT realpath the
// eslint symlink — verified), so the fixtures deps + shims win over the pnpm
// store's real espree/esquery. No runtime network; pure symlink/copy from the
// already-installed store.

import { cpSync, existsSync, mkdirSync, realpathSync, rmSync, symlinkSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const STORE = join(REPO, "node_modules/.pnpm");
const SHIM_SRC = join(REPO, "tests/fixtures/eslint-shims");

// name → relative path under .pnpm/<pkg>@<ver>/node_modules/<name>
const STORE_DEPS = {
  "eslint-scope": "eslint-scope@9.1.2/node_modules/eslint-scope",
  "eslint-visitor-keys": "eslint-visitor-keys@5.0.1/node_modules/eslint-visitor-keys",
  esrecurse: "esrecurse@4.3.0/node_modules/esrecurse",
  estraverse: "estraverse@5.3.0/node_modules/estraverse",
  levn: "levn@0.4.1/node_modules/levn",
  "prelude-ls": "prelude-ls@1.2.1/node_modules/prelude-ls",
  "type-check": "type-check@0.4.0/node_modules/type-check",
  "@eslint/core": "@eslint+core@1.1.1/node_modules/@eslint/core",
  "@eslint/plugin-kit": "@eslint+plugin-kit@0.6.1/node_modules/@eslint/plugin-kit",
};

// host-delegate shims: specifier → shim .ts under tests/fixtures/eslint-shims
const SHIMS = { espree: "espree.ts", esquery: "esquery.ts", debug: "debug.ts" };

function linkInto(nm, name, target) {
  const dest = join(nm, name);
  if (name.includes("/")) mkdirSync(dirname(dest), { recursive: true });
  if (existsSync(dest)) return;
  // COPY (deref) rather than symlink — the TS-program checker's module
  // resolution does not reliably follow symlinked deps from a fixtures dir.
  cpSync(target, dest, { recursive: true, dereference: true });
}

/**
 * Build the bounded fixtures node_modules. Returns the compileProject entry path.
 * @param {{force?: boolean}} [opts]
 */
export function setupEslintDeps(opts = {}) {
  const root = join(HERE, ".eslint-deps");
  const nm = join(root, "node_modules");
  if (opts.force && existsSync(root)) rmSync(root, { recursive: true, force: true });
  mkdirSync(nm, { recursive: true });

  // 1. COPY the real eslint package into the fixtures node_modules (real files,
  //    NOT a symlink — a symlinked `eslint` breaks the resolver's RELATIVE
  //    require resolution `../shared/traverser`; copying gives a clean dir whose
  //    relative requires resolve natively while bare deps resolve from the
  //    sibling fixtures node_modules).
  const eslintReal = realpathSync(join(REPO, "node_modules/eslint"));
  const eslintDest = join(nm, "eslint");
  if (!existsSync(eslintDest)) {
    cpSync(eslintReal, eslintDest, { recursive: true, dereference: true });
  }

  // 2. symlink the COMPILE deps + transitive closure from the pnpm store
  for (const [name, rel] of Object.entries(STORE_DEPS)) {
    const target = join(STORE, rel);
    if (!existsSync(target)) {
      throw new Error(`[setup-eslint-deps] missing store dep ${name} at ${target} — run pnpm install`);
    }
    linkInto(nm, name, target);
  }

  // 3. drop the host-delegate shim packages (espree/esquery/debug)
  for (const [spec, file] of Object.entries(SHIMS)) {
    const pkgDir = join(nm, spec);
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      join(pkgDir, "package.json"),
      JSON.stringify({ name: spec, version: "0.0.0-shim", main: "index.ts" }, null, 2),
    );
    copyFileSync(join(SHIM_SRC, file), join(pkgDir, "index.ts"));
  }

  return {
    root,
    nodeModules: nm,
    entry: join(nm, "eslint/lib/linter/linter.js"),
  };
}

// CLI: `node tests/dogfood/setup-eslint-deps.mjs [--force]`
if (import.meta.url === `file://${process.argv[1]}`) {
  const r = setupEslintDeps({ force: process.argv.includes("--force") });
  console.log("[setup-eslint-deps] fixtures ready:");
  console.log("  node_modules:", r.nodeModules);
  console.log("  entry:", r.entry);
}
