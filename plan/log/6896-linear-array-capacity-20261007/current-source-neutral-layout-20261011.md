# Current-source allocation guard qualification — 2026-10-11

All execution arms retain actual HEAD dca6a41a470fe4eebbe1154f3b2c55eb04f350ec with dirty overlays stated in arm-receipt.json. P is current main plus original published guards; C differs only in leaf neutral layout import/type/initializer. Unguarded-main is actual current main plus original test only. No source equality or cleanliness is inferred from shared HEAD.

Original P/C:21/21 each. Unguarded main:10pass11fail/21. Original strict test-inclusive all three arms exit1 with byte-identical4 test typing diagnostics, retained in original-instrument and unguarded-main. Authorized test repair only copies bytes at the two Wasm API sites. Repaired P/C strict0 and21/21. Comparators require exact21 unique case names/statuses,23 unique expected record IDs and all22 full nonprovenance observations including binary digests across arms and before/after instrument repair. Only independently checked helper/test provenance hashes differ.

Full1047-byte runtime production binary and complete runtime module are equal. Full actual source binary is also equal and independently matches the binary SHA printed by actual test execution; source replay returns1.25. No binary/memory/owner graph data are normalized.

Test command in each own arm: JS2WASM_LINEAR_IR=1 node node_modules/vitest/dist/cli.js run tests/issue-6896-linear-array-allocation-size.test.ts --no-file-parallelism --maxWorkers=1 --reporter=default --reporter=json --outputFile=.tmp/neutral-layout/repaired21.json

Strict: node node_modules/typescript7/lib/tsc.js --noEmit -p .tmp/neutral-layout/tsconfig.test-inclusive.json
Normal source gate: node node_modules/typescript7/lib/tsc.js --noEmit -p tsconfig.ts7.json
Graph: LOC_GATE_BASE=dca6a41a470fe4eebbe1154f3b2c55eb04f350ec node scripts/check-import-cycles.mjs --json
Comparators retained under C: compare-current.mjs and compare-repaired.mjs, used from C worktree; they reference the preserved sibling P arm. Full graph maps retained. Copied old leaf restores P graph, not a claimed failing gate run on the disposable copy.

Format/lint/source normal typing/LOC/functions/coercion/oracle/import-cycle gates pass. Dead-export tool exits0 preservation-only; graph remains open, strict modeled closure fails for inherited optimize/platform nonliteral imports. Canonical inventory exits1 with exactly unclassified-module and unclassified-target for the leaf. Shared policy is unchanged and A-owned. Exploratory generic-config TS7 ambient-Node failure is preserved separately from passing normal TS7 configuration. Historical full-build failure is unresolved; no full build repeated.

Before/after full source/tests/scripts and relevant config content custody covers7914 files per P/C and7913 on unguarded main. Dependency custody covers selected tool entry/package sources and common symlink provenance, not all1.4GB node_modules contents. Node24.4.1/V813.6.233.10-node.17, Vitest3.2.4; no added heap override or external deadline. Test's native configured fork arguments retained in full logs.

Source responsibility: runtime import and original new/grow guard hunks; leaf; exact approved test typing; existing issue/evidence. No shared registry adoption, commit, push, hold or queue change occurred.

## Published review archive

The sealed205 artifacts plus their complete inner manifest are published in [current-source-neutral-layout-20261011.tar.gz](current-source-neutral-layout-20261011.tar.gz), SHA256 `41dd2db5755f5fd11be20ee73e88c3f94ad4dd22e8532a821587856f05ab208d`. Extraction revalidated every205 inner hash and every archived file byte against the private raw source. Raw JSON/logs remain private unchanged and are not individually staged. Archive receipts describe actual execution HEAD/dirty overlays; the later review commit is not an execution HEAD.

Original thirteen checkpoint evidence files remain unchanged beside this archive. [session-b-transfer-receipts-20261011.tar.gz](session-b-transfer-receipts-20261011.tar.gz) retains root's normal60-transfer receipts as raw bytes. Root's takeover audit and 6916 append accompany this review without reopening the remainder optimization.

This publication is a review checkpoint for existing PR6572, not canonical inventory acceptance, main delivery or queue release. A retains the exact shared policy classification dependency.
