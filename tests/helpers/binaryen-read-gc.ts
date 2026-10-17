// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
/**
 * (#7014) `binaryen.readBinary` for a js2wasm WasmGC module.
 *
 * binaryen.js's `readBinary(data)` takes no feature set: it starts from
 * binaryen's DEFAULT features and widens them only from a `target_features`
 * custom section, which js2wasm does not emit. Without GC enabled binaryen
 * cannot keep two structurally identical singleton rec groups distinct, so a
 * module that declares the same shape twice under different names (e.g.
 * `$__str_data` and `$__arr_i16_byte`, both `(array (mut i16))`) is rejected
 * with "invalid type: distinct rec groups would be identical after binary
 * writing (to resolve this, use --enable-gc)". V8 accepts the module (the two
 * types simply canonicalize), and the compiler's own optimizer is unaffected
 * because the wasm-opt CLI runs with the GC feature flags.
 *
 * This appends a `target_features` section that enables the feature superset
 * js2wasm emits, which is exactly what binaryen reads it for. The input binary
 * is not modified.
 */

const FEATURES = [
  "gc",
  "reference-types",
  "exception-handling",
  "tail-call",
  "multivalue",
  "bulk-memory",
  "nontrapping-fptoint",
  "sign-ext",
  "mutable-globals",
  "simd128",
  "extended-const",
];

function uleb(n: number): number[] {
  const out: number[] = [];
  do {
    let byte = n & 0x7f;
    n >>>= 7;
    if (n !== 0) byte |= 0x80;
    out.push(byte);
  } while (n !== 0);
  return out;
}

function name(text: string): number[] {
  const bytes = [...new TextEncoder().encode(text)];
  return [...uleb(bytes.length), ...bytes];
}

/** `binary` plus a trailing `target_features` custom section enabling GC & co. */
function withTargetFeatures(binary: Uint8Array): Uint8Array {
  const payload = [...name("target_features"), ...uleb(FEATURES.length)];
  for (const feature of FEATURES) payload.push(0x2b /* '+' used */, ...name(feature));
  const section = [0x00, ...uleb(payload.length), ...payload];
  const out = new Uint8Array(binary.length + section.length);
  out.set(binary, 0);
  out.set(section, binary.length);
  return out;
}

/** `binaryen.readBinary`, with the module's GC feature set declared. */
// biome-ignore lint/suspicious/noExplicitAny: binaryen.js ships no usable types for Module
export function readBinaryWithGc(binaryen: { readBinary(data: Uint8Array): any }, binary: Uint8Array): any {
  return binaryen.readBinary(withTargetFeatures(binary));
}
