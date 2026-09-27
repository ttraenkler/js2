// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { TypeDef } from "./types.js";

/** A first-match ref.test dispatch must test descendants before their ancestors. */
export function orderStructDispatchBySpecificity<T extends { typeIdx: number }>(
  types: readonly TypeDef[],
  entries: readonly T[],
): T[] {
  const depths = new Map<number, number>();
  const depth = (typeIdx: number): number => {
    if (typeIdx < 0) throw new Error(`Invalid struct dispatch type ${typeIdx}`);
    const cached = depths.get(typeIdx);
    if (cached !== undefined) return cached;
    const chain: number[] = [];
    const seen = new Set<number>();
    let current = typeIdx;
    let result = 0;
    while (current >= 0) {
      const known = depths.get(current);
      if (known !== undefined) {
        result = known;
        break;
      }
      if (seen.has(current)) throw new Error(`Cyclic struct dispatch hierarchy at ${current}`);
      seen.add(current);
      const definition = types[current];
      if (definition?.kind !== "struct") throw new Error(`Invalid struct dispatch type ${current}`);
      chain.push(current);
      current = definition.superTypeIdx ?? -1;
    }
    for (let index = chain.length - 1; index >= 0; index--) depths.set(chain[index], ++result);
    return depths.get(typeIdx)!;
  };
  for (const entry of entries) depth(entry.typeIdx);
  // Stable ties retain existing same-heap shape/stamp guard ordering.
  return [...entries].sort((left, right) => depth(right.typeIdx) - depth(left.typeIdx));
}
