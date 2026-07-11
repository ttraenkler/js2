// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
/**
 * #3146 — ES2025 Iterator static helpers (`Iterator.from` / `Iterator.concat`
 * / `Iterator.zip` / `Iterator.zipKeyed`) as a standalone source-prelude.
 *
 * Under `--target standalone` these were `__get_builtin` dynamic-shape hard
 * CEs (#1472 Phase B): the `Iterator` NAMESPACE identifier has no host object
 * to read the method off. Rather than a bespoke Wasm runtime, the helpers are
 * compiled AWAY as ordinary TS riding on machinery the backend already has
 * (generators, `for-of` GetIterator, closures, try/finally close semantics):
 * a library prelude is **prepended** and every `Iterator.<helper>` call-site
 * property access is **rewritten** to the corresponding `__js2wasm_iter_*`
 * library function. This mirrors the `process.stdin` Readable prelude
 * (#2632 Phase 3, `process-stdin-prelude.ts`) — same PositionMap discipline so
 * diagnostics keep reporting the user's line/column.
 *
 * The injection is scoped: it fires ONLY when the program contains an
 * `Iterator.<helper>` property access (and the caller gates on
 * `target === "standalone"`). Programs without such an access are
 * byte-identical (identity map, unchanged source). A user-declared local
 * `Iterator` binding suppresses the rewrite entirely (shadowing).
 *
 * Fidelity subset (deliberate; tracked in the issue):
 *   - `Iterator.from` always wraps (spec returns the value UNWRAPPED when it
 *     already inherits %Iterator.prototype%) — identity tests stay red.
 *   - `throw()` forwarding on the wrapper closes the inner iterator instead
 *     of forwarding to `inner.throw`.
 *   - zip/zipKeyed close-on-abrupt ordering follows spec order (reverse
 *     insertion for zip's IteratorCloseAll) to the extent the corpus checks.
 */
import { PositionMap } from "./position-map.js";
import { ts } from "./ts-api.js";

const { forEachChild } = ts;

const HELPER_NAMES = new Set(["from", "concat", "zip", "zipKeyed"]);

export interface IteratorPreludeResult {
  source: string;
  positionMap: PositionMap;
  injected: boolean;
}

/**
 * Find `Iterator.<helper>` property-access spans (the `Iterator.<helper>`
 * sub-expression only — call arguments stay in place). Skips the whole file
 * when a local `Iterator` declaration exists (conservative shadow check,
 * mirrors the stdin prelude's `process` check).
 */
function findIteratorHelperAccesses(sf: ts.SourceFile): { start: number; end: number; name: string }[] {
  let userDeclaresIterator = false;
  const declScan = (node: ts.Node): void => {
    if (userDeclaresIterator) return;
    if (
      (ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
      node.name !== undefined &&
      ts.isIdentifier(node.name) &&
      node.name.text === "Iterator"
    ) {
      userDeclaresIterator = true;
      return;
    }
    forEachChild(node, declScan);
  };
  forEachChild(sf, declScan);
  if (userDeclaresIterator) return [];

  const spans: { start: number; end: number; name: string }[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "Iterator" &&
      HELPER_NAMES.has(node.name.text) &&
      // Only CALL positions: `Iterator.from(...)`. A bare method-value read
      // (`const f = Iterator.from`) keeps its original (refusing) path.
      ts.isCallExpression(node.parent) &&
      node.parent.expression === node
    ) {
      spans.push({ start: node.getStart(sf), end: node.end, name: node.name.text });
    }
    forEachChild(node, visit);
  };
  forEachChild(sf, visit);
  return spans;
}

/**
 * Inject the Iterator-helper prelude + rewrite `Iterator.<helper>` call-site
 * accesses to `__js2wasm_iter_<helper>`. Byte-neutral (identity map) when the
 * program has no such access. The caller decides target gating.
 */
export function injectIteratorHelpersPrelude(source: string): IteratorPreludeResult {
  // Cheap pre-check: skip the parse when the literal text never appears.
  if (!source.includes("Iterator")) {
    return { source, positionMap: PositionMap.identity(), injected: false };
  }
  const sf = ts.createSourceFile("__iter_scan__.ts", source, ts.ScriptTarget.Latest, /*setParentNodes*/ true);
  const accesses = findIteratorHelperAccesses(sf);
  if (accesses.length === 0) {
    return { source, positionMap: PositionMap.identity(), injected: false };
  }

  const prelude = ITERATOR_HELPERS_PRELUDE;
  const accessor = (name: string): string => `__js2wasm_iter_${name}`;

  const edits = [
    { origStart: 0, origEnd: 0, newLength: prelude.length },
    ...accesses.map((a) => ({ origStart: a.start, origEnd: a.end, newLength: accessor(a.name).length })),
  ];
  const positionMap = new PositionMap(edits);

  let body = source;
  const sorted = [...accesses].sort((a, b) => b.start - a.start);
  for (const a of sorted) {
    body = body.substring(0, a.start) + accessor(a.name) + body.substring(a.end);
  }

  return { source: prelude + body, positionMap, injected: true };
}

/**
 * The helper library. Plain TS, no imports — every construct (generators,
 * try/finally-in-generator close, `for-of`, closures, `Symbol.iterator`
 * computed access, rest params) is existing standalone surface.
 *
 * Protocol notes:
 *   - Each wrapper generator tracks `done` and closes the CURRENT inner
 *     iterator in `finally`, so an abrupt completion on the wrapper
 *     (`.return()` / `.throw()` / a `for-of` break) forwards a close — but a
 *     NORMALLY exhausted inner iterator is NOT re-closed
 *     (concat "return-is-not-forwarded-after-exhaustion").
 *   - `Iterator.concat` validates every source's `[Symbol.iterator]` method
 *     EAGERLY (spec: ToIteratorRecord-ish upfront), then iterates lazily.
 *   - `Iterator.zip` implements modes `shortest` (default) / `longest`
 *     (with `padding`) / `strict`, closing the remaining iterators when the
 *     zip finishes early (reverse order, matching IteratorCloseAll).
 */
const ITERATOR_HELPERS_PRELUDE = `// ── #3146 Iterator static helpers prelude (standalone lowering) ──
function __js2wasm_iter_getiter(__s: any): any {
  if (__s === null || __s === undefined) {
    throw new TypeError("Iterator helper: source is not iterable");
  }
  const __m: any = __s[Symbol.iterator];
  if (typeof __m === "function") {
    return __m.call(__s);
  }
  if (typeof __s.next === "function") {
    return __s;
  }
  throw new TypeError("Iterator helper: source is not iterable");
}
function __js2wasm_iter_close(__it: any): void {
  if (__it !== null && __it !== undefined && typeof __it.return === "function") {
    __it.return();
  }
}
function __js2wasm_iter_from(__src: any): any {
  const __it: any = __js2wasm_iter_getiter(__src);
  return (function* (): any {
    let __exhausted = false;
    try {
      while (true) {
        const __r: any = __it.next();
        if (__r.done) {
          __exhausted = true;
          return __r.value;
        }
        yield __r.value;
      }
    } finally {
      if (!__exhausted) {
        __js2wasm_iter_close(__it);
      }
    }
  })();
}
function __js2wasm_iter_concat(...__sources: any[]): any {
  for (const __s of __sources) {
    if (__s === null || __s === undefined || typeof __s[Symbol.iterator] !== "function") {
      throw new TypeError("Iterator.concat: argument is not iterable");
    }
  }
  return (function* (): any {
    for (const __s of __sources) {
      const __it: any = __s[Symbol.iterator].call(__s);
      let __exhausted = false;
      try {
        while (true) {
          const __r: any = __it.next();
          if (__r.done) {
            __exhausted = true;
            break;
          }
          yield __r.value;
        }
      } finally {
        if (!__exhausted) {
          __js2wasm_iter_close(__it);
        }
      }
    }
  })();
}
function __js2wasm_iter_zip_core(__its: any[], __keys: any, __mode: string, __hasPadding: boolean, __padding: any): any {
  return (function* (): any {
    const __n: any = __its.length;
    const __doneFlags: any = [];
    for (let __i = 0; __i < __n; __i++) {
      __doneFlags.push(false);
    }
    let __openCount: any = __n;
    try {
      if (__n === 0 && __mode !== "longest") {
        return;
      }
      while (true) {
        const __tuple: any = [];
        let __anyValue = false;
        for (let __i = 0; __i < __n; __i++) {
          if (__doneFlags[__i]) {
            __tuple.push(__hasPadding ? __padding[__i] : undefined);
            continue;
          }
          const __r: any = __its[__i].next();
          if (__r.done) {
            __doneFlags[__i] = true;
            __openCount = __openCount - 1;
            if (__mode === "shortest") {
              return;
            }
            if (__mode === "strict") {
              if (__i !== 0 || __openCount !== 0) {
                // strict: iterator __i finished — every other must finish NOW.
                for (let __j = 0; __j < __n; __j++) {
                  if (__j === __i || __doneFlags[__j]) continue;
                  const __rj: any = __its[__j].next();
                  if (!__rj.done) {
                    throw new TypeError("Iterator.zip strict: iterators have different lengths");
                  }
                  __doneFlags[__j] = true;
                  __openCount = __openCount - 1;
                }
              }
              return;
            }
            // longest
            if (__openCount === 0) {
              return;
            }
            __tuple.push(__hasPadding ? __padding[__i] : undefined);
            continue;
          }
          __tuple.push(__r.value);
          __anyValue = true;
        }
        if (__mode === "longest" && !__anyValue && __openCount === 0) {
          return;
        }
        if (__keys === null) {
          yield __tuple;
        } else {
          const __obj: any = {};
          for (let __i = 0; __i < __n; __i++) {
            __obj[__keys[__i]] = __tuple[__i];
          }
          yield __obj;
        }
      }
    } finally {
      // IteratorCloseAll: close every still-open iterator, reverse order.
      for (let __i = __n - 1; __i >= 0; __i--) {
        if (!__doneFlags[__i]) {
          __js2wasm_iter_close(__its[__i]);
        }
      }
    }
  })();
}
function __js2wasm_iter_zip_options(__options: any): any {
  let __mode: any = "shortest";
  let __padding: any = null;
  if (__options !== null && __options !== undefined) {
    if (typeof __options !== "object" && typeof __options !== "function") {
      throw new TypeError("Iterator.zip: options is not an object");
    }
    const __m: any = __options.mode;
    if (__m !== undefined) {
      if (__m !== "shortest" && __m !== "longest" && __m !== "strict") {
        throw new TypeError("Iterator.zip: invalid mode");
      }
      __mode = __m;
    }
    const __p: any = __options.padding;
    if (__p !== undefined) {
      if (__mode !== "longest") {
        throw new TypeError("Iterator.zip: padding requires longest mode");
      }
      __padding = __p;
    }
  }
  return { mode: __mode, padding: __padding };
}
function __js2wasm_iter_zip(__iterables: any, __options?: any): any {
  if (__iterables === null || __iterables === undefined || (typeof __iterables !== "object" && typeof __iterables !== "function")) {
    throw new TypeError("Iterator.zip: iterables is not an object");
  }
  const __opts: any = __js2wasm_iter_zip_options(__options);
  const __its: any = [];
  const __pads: any = [];
  let __ok = false;
  try {
    for (const __src of __iterables) {
      __its.push(__js2wasm_iter_getiter(__src));
    }
    __ok = true;
  } finally {
    if (!__ok) {
      for (let __i = __its.length - 1; __i >= 0; __i--) {
        __js2wasm_iter_close(__its[__i]);
      }
    }
  }
  let __hasPadding = false;
  if (__opts.mode === "longest" && __opts.padding !== null) {
    __hasPadding = true;
    let __k = 0;
    for (const __p of __opts.padding) {
      __pads.push(__p);
      __k = __k + 1;
    }
    while (__pads.length < __its.length) {
      __pads.push(undefined);
    }
  }
  return __js2wasm_iter_zip_core(__its, null, __opts.mode, __hasPadding, __pads);
}
function __js2wasm_iter_zipKeyed(__iterables: any, __options?: any): any {
  if (__iterables === null || __iterables === undefined || (typeof __iterables !== "object" && typeof __iterables !== "function")) {
    throw new TypeError("Iterator.zipKeyed: iterables is not an object");
  }
  const __opts: any = __js2wasm_iter_zip_options(__options);
  const __keys: any = [];
  const __its: any = [];
  let __ok = false;
  try {
    for (const __k of Object.keys(__iterables)) {
      __keys.push(__k);
      __its.push(__js2wasm_iter_getiter(__iterables[__k]));
    }
    __ok = true;
  } finally {
    if (!__ok) {
      for (let __i = __its.length - 1; __i >= 0; __i--) {
        __js2wasm_iter_close(__its[__i]);
      }
    }
  }
  const __pads: any = [];
  let __hasPadding = false;
  if (__opts.mode === "longest" && __opts.padding !== null) {
    __hasPadding = true;
    for (const __k of __keys) {
      __pads.push(__opts.padding[__k]);
    }
  }
  return __js2wasm_iter_zip_core(__its, __keys, __opts.mode, __hasPadding, __pads);
}
`;
