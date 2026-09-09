// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
import type { BlockType, Instr } from "../ir/types.js";
import { WasmEncoder } from "./encoder.js";
import { OP } from "./opcodes.js";

export interface InstrArrayEmitCache {
  shared: Set<Instr[]>;
  bytes: WeakMap<Instr[], Uint8Array>;
  encoding: WeakSet<Instr[]>;
  remainingUses: Map<Instr[], number>;
}
interface Callbacks {
  leaf(instr: Instr, encoder: WasmEncoder): void;
  blockType(type: BlockType, encoder: WasmEncoder): void;
  tag(index: number): void;
}
type Task =
  | { kind: "start"; body: Instr[]; encoder: WasmEncoder }
  | { kind: "array"; body: Instr[]; encoder: WasmEncoder; output: WasmEncoder; index: number; shared: boolean }
  | { kind: "byte"; byte: number; encoder: WasmEncoder }
  | { kind: "catch"; tag: number; encoder: WasmEncoder };

function finishUse(cache: InstrArrayEmitCache, body: Instr[]): void {
  const remaining = (cache.remainingUses.get(body) ?? 1) - 1;
  if (remaining > 0) cache.remainingUses.set(body, remaining);
  else {
    cache.remainingUses.delete(body);
    cache.bytes.delete(body);
  }
}

/** Schedule nested controls in wire order, without recursively encoding bodies. */
function control(instr: Instr, encoder: WasmEncoder, tasks: Task[], callbacks: Callbacks): boolean {
  const body = (body: Instr[]) => tasks.push({ kind: "start", body, encoder });
  const byte = (byte: number) => tasks.push({ kind: "byte", byte, encoder });
  switch (instr.op) {
    case "block":
    case "loop":
      encoder.byte(instr.op === "block" ? OP.block : OP.loop);
      callbacks.blockType(instr.blockType, encoder);
      byte(OP.end);
      body(instr.body);
      return true;
    case "if": {
      encoder.byte(OP.if);
      callbacks.blockType(instr.blockType, encoder);
      byte(OP.end);
      const hasElse = instr.else && instr.else.length > 0;
      if (hasElse || instr.blockType.kind === "val") {
        if (hasElse) body(instr.else!);
        else byte(OP.unreachable);
        byte(OP.else);
      }
      body(instr.then);
      return true;
    }
    case "try":
      encoder.byte(OP.try);
      callbacks.blockType(instr.blockType, encoder);
      byte(OP.end);
      if (instr.catchAll) {
        body(instr.catchAll);
        byte(OP.catch_all);
      }
      for (let index = instr.catches.length - 1; index >= 0; index--) {
        const clause = instr.catches[index]!;
        body(clause.body);
        tasks.push({ kind: "catch", tag: clause.tagIdx, encoder });
      }
      body(instr.body);
      return true;
    case "try_table":
      encoder.byte(OP.try_table);
      callbacks.blockType(instr.blockType, encoder);
      encoder.u32(instr.catches.length);
      for (const clause of instr.catches) {
        const tagged = clause.kind === "catch" || clause.kind === "catch_ref";
        encoder.byte(
          clause.kind === "catch" ? 0 : clause.kind === "catch_ref" ? 1 : clause.kind === "catch_all" ? 2 : 3,
        );
        if (tagged) {
          if (clause.tagIdx === undefined) throw new Error(`try_table ${clause.kind} is missing a tag index`);
          callbacks.tag(clause.tagIdx);
          encoder.u32(clause.tagIdx);
        }
        encoder.u32(clause.depth);
      }
      byte(OP.end);
      body(instr.body);
      return true;
    default:
      return false;
  }
}

/** Iterative tree/DAG emission. Only multiply referenced arrays buffer bytes. */
export function encodeInstructionArrays(
  root: Instr[],
  encoder: WasmEncoder,
  cache: InstrArrayEmitCache | null,
  callbacks: Callbacks,
): void {
  const tasks: Task[] = [{ kind: "start", body: root, encoder }];
  const active = new Set<Instr[]>();
  try {
    while (tasks.length > 0) {
      const task = tasks[tasks.length - 1]!;
      if (task.kind === "array") {
        if (task.index < task.body.length) {
          const instr = task.body[task.index++]!;
          if (!control(instr, task.encoder, tasks, callbacks)) callbacks.leaf(instr, task.encoder);
          continue;
        }
        tasks.pop();
        active.delete(task.body);
        if (task.shared) {
          const bytes = task.encoder.finish();
          cache!.encoding.delete(task.body);
          cache!.bytes.set(task.body, bytes);
          task.output.bytes(bytes);
          finishUse(cache!, task.body);
        }
        continue;
      }
      tasks.pop();
      if (task.kind === "byte") task.encoder.byte(task.byte);
      else if (task.kind === "catch") {
        callbacks.tag(task.tag);
        task.encoder.byte(OP.catch);
        task.encoder.u32(task.tag);
      } else {
        if (active.has(task.body) || cache?.encoding.has(task.body))
          throw new Error("Codegen error: cyclic instruction-array graph cannot be emitted");
        const shared = cache?.shared.has(task.body) ?? false;
        const cached = shared ? cache!.bytes.get(task.body) : undefined;
        if (cached) {
          task.encoder.bytes(cached);
          finishUse(cache!, task.body);
          continue;
        }
        active.add(task.body);
        if (shared) cache!.encoding.add(task.body);
        tasks.push({
          kind: "array",
          body: task.body,
          encoder: shared ? new WasmEncoder() : task.encoder,
          output: task.encoder,
          index: 0,
          shared,
        });
      }
    }
  } finally {
    for (const body of active) cache?.encoding.delete(body);
  }
}
