// Copyright (c) 2026 Loopdive GmbH. Licensed under Apache-2.0 WITH LLVM-exception.
//
// #3518 package C — lossless codec for the production `PreparedIrProgram`.
//
// The codec owns no schema of its own. It encodes exactly the prepared-data
// model that `freezePreparedIrValue` (src/ir/program.ts, package A) already
// accepts — plain records, arrays, Map/Set, primitives, the IR_CLASS_SHAPE_CELL
// brand and recursion only through exact IR class shapes — and it decodes
// back into that same frozen model by handing the rebuilt value to the very
// same copier. Anything the copier rejects the codec rejects too, so there is
// one definition of "prepared data" and this file is a byte projection of it.
//
// Canonical bytes: keys are emitted sorted, tagged forms are single-key
// records, and every non-JSON value (bigint, -0, NaN, ±Infinity, undefined,
// Map, Set, the class-shape brand, a recursive shape reference) has exactly one
// spelling. `encode(decode(text)) === text` for every text `decode` accepts.

import { IR_CLASS_SHAPE_CELL } from "./nodes.js";
import {
  freezePreparedIrValue,
  preparedIrProgramAbiLookup,
  PreparedIrProgramInvariantError,
  type PreparedIrProgram,
} from "./program.js";

export const PREPARED_IR_PROGRAM_CODEC = "prepared-ir-program-codec-v1" as const;
export const PREPARED_IR_PROGRAM_SCHEMA = "prepared-ir-program-v1" as const;

/** Tagged single-key records. A real record key starting with `$` is escaped to `$$…`. */
const TAG_NUMBER = "$number";
const TAG_BIGINT = "$bigint";
const TAG_UNDEFINED = "$undefined";
const TAG_MAP = "$map";
const TAG_SET = "$set";
const TAG_CLASS_SHAPE_REF = "$classShapeRef";
/** The only symbol-keyed property prepared data may carry, spelled as a reserved string key. */
const KEY_CLASS_SHAPE_CELL = "$irClassShapeCell";

const SPECIAL_NUMBERS = new Map<string, number>([
  ["-0", -0],
  ["NaN", Number.NaN],
  ["Infinity", Number.POSITIVE_INFINITY],
  ["-Infinity", Number.NEGATIVE_INFINITY],
]);

function invalid(detail: string): never {
  throw new PreparedIrProgramInvariantError("invalid-prepared-data", `program codec: ${detail}`);
}

function isPlainRecord(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isReadonlyMapLike(value: object): value is ReadonlyMap<unknown, unknown> {
  if (value instanceof Map) return true;
  const tag = (value as { readonly [Symbol.toStringTag]?: unknown })[Symbol.toStringTag];
  return tag === "FrozenMap" && typeof (value as ReadonlyMap<unknown, unknown>).entries === "function";
}

function isReadonlySetLike(value: object): value is ReadonlySet<unknown> {
  if (value instanceof Set) return true;
  const tag = (value as { readonly [Symbol.toStringTag]?: unknown })[Symbol.toStringTag];
  return tag === "FrozenSet" && typeof (value as ReadonlySet<unknown>).values === "function";
}

/** Same predicate the prepared-data copier uses to admit a recursive class shape. */
function isRecursiveIrClassShape(value: object): value is { readonly classId: string } {
  const candidate = value as Record<PropertyKey, unknown>;
  return (
    candidate[IR_CLASS_SHAPE_CELL] === true &&
    typeof candidate.classId === "string" &&
    candidate.classId.startsWith("ir-class:v1:") &&
    typeof candidate.className === "string" &&
    Array.isArray(candidate.fields) &&
    Array.isArray(candidate.methods) &&
    Array.isArray(candidate.constructorParams)
  );
}

function compareKeys(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Encoding
// ---------------------------------------------------------------------------

type Encoded = null | boolean | number | string | Encoded[] | { readonly [key: string]: Encoded };

function encodeValue(value: unknown, path: string, ancestors: Set<object>): Encoded {
  switch (typeof value) {
    case "string":
    case "boolean":
      return value;
    case "number":
      if (Number.isFinite(value) && !Object.is(value, -0)) return value;
      for (const [spelling, special] of SPECIAL_NUMBERS) {
        if (Object.is(special, value)) return { [TAG_NUMBER]: spelling };
      }
      return invalid(`${path}: number ${String(value)} has no canonical spelling`);
    case "bigint":
      return { [TAG_BIGINT]: value.toString(10) };
    case "undefined":
      return { [TAG_UNDEFINED]: true };
    case "function":
      return invalid(`${path}: prepared data cannot contain executable functions`);
    case "symbol":
      return invalid(`${path}: prepared data cannot contain symbol values`);
    case "object":
      break;
    default:
      return invalid(`${path}: unsupported value type ${typeof value}`);
  }
  if (value === null) return null;
  if (ancestors.has(value)) {
    if (isRecursiveIrClassShape(value)) return { [TAG_CLASS_SHAPE_REF]: value.classId };
    return invalid(`${path}: prepared data must be acyclic outside exact IR class shapes`);
  }
  const next = new Set(ancestors).add(value);
  if (Array.isArray(value)) {
    return value.map((item, index) => encodeValue(item, `${path}[${index}]`, next));
  }
  if (isReadonlyMapLike(value)) {
    return {
      [TAG_MAP]: [...value.entries()].map(([key, item], index) => [
        encodeValue(key, `${path}<key ${index}>`, next),
        encodeValue(item, `${path}<value ${index}>`, next),
      ]),
    };
  }
  if (isReadonlySetLike(value)) {
    return { [TAG_SET]: [...value.values()].map((item, index) => encodeValue(item, `${path}<item ${index}>`, next)) };
  }
  if (!isPlainRecord(value)) {
    const name = (Object.getPrototypeOf(value) as { constructor?: { name?: string } } | null)?.constructor?.name;
    return invalid(`${path}: prepared data contains unsupported ${name ?? "object"} instance`);
  }
  const record: Record<string, Encoded> = {};
  const stringKeys: string[] = [];
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) {
      return invalid(`${path}: property ${String(key)} must be a data property`);
    }
    if (typeof key === "symbol") {
      if (key !== IR_CLASS_SHAPE_CELL) return invalid(`${path}: unsupported symbol property ${String(key)}`);
      if (descriptor.value !== true) return invalid(`${path}: IR_CLASS_SHAPE_CELL must be exactly true`);
      record[KEY_CLASS_SHAPE_CELL] = true;
      continue;
    }
    stringKeys.push(key);
  }
  for (const key of stringKeys) {
    const spelled = key.startsWith("$") ? `$${key}` : key;
    record[spelled] = encodeValue((value as Record<string, unknown>)[key], `${path}.${key}`, next);
  }
  const sorted: Record<string, Encoded> = {};
  for (const key of Object.keys(record).sort(compareKeys)) sorted[key] = record[key]!;
  return sorted;
}

/**
 * Canonical bytes for one production program. The program is shape-checked
 * first so the codec never publishes a value the consumer would refuse.
 */
export function encodePreparedIrProgram(program: PreparedIrProgram): string {
  assertPreparedIrProgramShape(program);
  const encoded: Record<string, Encoded> = {
    codec: PREPARED_IR_PROGRAM_CODEC,
    program: encodeValue(program, "program", new Set()),
    schema: PREPARED_IR_PROGRAM_SCHEMA,
  };
  return JSON.stringify(encoded);
}

// ---------------------------------------------------------------------------
// Decoding
// ---------------------------------------------------------------------------

type ShapeScope = ReadonlyMap<string, object>;

function decodeTagged(tag: string, payload: unknown, path: string, shapes: ShapeScope): unknown {
  switch (tag) {
    case TAG_NUMBER: {
      if (typeof payload !== "string" || !SPECIAL_NUMBERS.has(payload)) {
        return invalid(`${path}: ${TAG_NUMBER} payload must be one of ${[...SPECIAL_NUMBERS.keys()].join(", ")}`);
      }
      return SPECIAL_NUMBERS.get(payload);
    }
    case TAG_BIGINT: {
      if (typeof payload !== "string" || !/^-?(0|[1-9][0-9]*)$/.test(payload) || payload === "-0") {
        return invalid(`${path}: ${TAG_BIGINT} payload must be a canonical decimal integer`);
      }
      return BigInt(payload);
    }
    case TAG_UNDEFINED:
      if (payload !== true) return invalid(`${path}: ${TAG_UNDEFINED} payload must be true`);
      return undefined;
    case TAG_MAP: {
      if (!Array.isArray(payload)) return invalid(`${path}: ${TAG_MAP} payload must be an entry array`);
      const map = new Map<unknown, unknown>();
      payload.forEach((entry, index) => {
        if (!Array.isArray(entry) || entry.length !== 2) {
          return invalid(`${path}: ${TAG_MAP} entry ${index} must be a [key, value] pair`);
        }
        const key = decodeValue(entry[0], `${path}<key ${index}>`, shapes);
        if (map.has(key)) return invalid(`${path}: ${TAG_MAP} repeats key ${String(key)}`);
        map.set(key, decodeValue(entry[1], `${path}<value ${index}>`, shapes));
      });
      return map;
    }
    case TAG_SET: {
      if (!Array.isArray(payload)) return invalid(`${path}: ${TAG_SET} payload must be an item array`);
      const set = new Set<unknown>();
      payload.forEach((item, index) => {
        const decoded = decodeValue(item, `${path}<item ${index}>`, shapes);
        if (set.has(decoded)) return invalid(`${path}: ${TAG_SET} repeats item ${String(decoded)}`);
        set.add(decoded);
      });
      return set;
    }
    case TAG_CLASS_SHAPE_REF: {
      if (typeof payload !== "string") return invalid(`${path}: ${TAG_CLASS_SHAPE_REF} payload must be a class id`);
      const shape = shapes.get(payload);
      if (!shape) return invalid(`${path}: ${TAG_CLASS_SHAPE_REF} ${payload} does not name an enclosing class shape`);
      return shape;
    }
    default:
      return invalid(`${path}: unknown codec tag ${tag}`);
  }
}

function decodeValue(node: unknown, path: string, shapes: ShapeScope): unknown {
  if (node === null || typeof node === "string" || typeof node === "boolean") return node;
  if (typeof node === "number") {
    if (Object.is(node, -0)) return invalid(`${path}: -0 must be spelled through ${TAG_NUMBER}`);
    if (!Number.isFinite(node)) return invalid(`${path}: non-finite number is not canonical JSON`);
    return node;
  }
  if (typeof node !== "object") return invalid(`${path}: unsupported JSON value type ${typeof node}`);
  if (Array.isArray(node)) return node.map((item, index) => decodeValue(item, `${path}[${index}]`, shapes));
  const keys = Object.keys(node);
  if (keys.length === 1 && keys[0]!.startsWith("$") && !keys[0]!.startsWith("$$") && keys[0] !== KEY_CLASS_SHAPE_CELL) {
    return decodeTagged(keys[0]!, (node as Record<string, unknown>)[keys[0]!], path, shapes);
  }
  for (let index = 1; index < keys.length; index++) {
    if (compareKeys(keys[index - 1]!, keys[index]!) >= 0) {
      return invalid(`${path}: record keys are not in canonical order (${keys[index - 1]} before ${keys[index]})`);
    }
  }
  const record: Record<PropertyKey, unknown> = {};
  let branded = false;
  const fieldKeys: { readonly spelled: string; readonly key: string }[] = [];
  for (const spelled of keys) {
    if (spelled === KEY_CLASS_SHAPE_CELL) {
      if ((node as Record<string, unknown>)[spelled] !== true) {
        return invalid(`${path}: ${KEY_CLASS_SHAPE_CELL} must be exactly true`);
      }
      record[IR_CLASS_SHAPE_CELL] = true;
      branded = true;
      continue;
    }
    if (spelled.startsWith("$")) {
      if (!spelled.startsWith("$$")) return invalid(`${path}: unknown codec tag ${spelled} inside a record`);
      fieldKeys.push({ spelled, key: spelled.slice(1) });
      continue;
    }
    fieldKeys.push({ spelled, key: spelled });
  }
  // A recursive class shape must be reachable by its own `$classShapeRef`
  // while its fields are still being decoded, so register it before descending.
  let scope = shapes;
  if (branded) {
    const classId = (node as Record<string, unknown>).classId;
    if (typeof classId !== "string" || !classId.startsWith("ir-class:v1:")) {
      return invalid(`${path}: a branded class shape must carry an ir-class:v1 classId`);
    }
    if (shapes.has(classId)) return invalid(`${path}: class shape ${classId} is nested inside itself twice`);
    scope = new Map(shapes).set(classId, record);
  }
  for (const { spelled, key } of fieldKeys) {
    record[key] = decodeValue((node as Record<string, unknown>)[spelled], `${path}.${key}`, scope);
  }
  if (branded && !isRecursiveIrClassShape(record)) {
    return invalid(`${path}: ${KEY_CLASS_SHAPE_CELL} is only valid on an exact IR class shape`);
  }
  return record;
}

/**
 * Parse canonical bytes into a frozen, shape-checked production program.
 * Malformed bytes, unknown tags, noncanonical spellings and anything the
 * prepared-data copier refuses all fail here — before any consumer sees it.
 */
export function decodePreparedIrProgram(text: string): PreparedIrProgram {
  if (typeof text !== "string") return invalid("encoded program must be a string");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return invalid(`encoded program is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return invalid("encoded program must be a JSON object");
  }
  const envelope = parsed as Record<string, unknown>;
  const envelopeKeys = Object.keys(envelope);
  if (envelopeKeys.join(",") !== "codec,program,schema") {
    return invalid(
      `encoded program envelope must be exactly {codec, program, schema}, got {${envelopeKeys.join(", ")}}`,
    );
  }
  if (envelope.codec !== PREPARED_IR_PROGRAM_CODEC) {
    return invalid(`unsupported codec ${String(envelope.codec)}; expected ${PREPARED_IR_PROGRAM_CODEC}`);
  }
  if (envelope.schema !== PREPARED_IR_PROGRAM_SCHEMA) {
    return invalid(`unsupported schema ${String(envelope.schema)}; expected ${PREPARED_IR_PROGRAM_SCHEMA}`);
  }
  const decoded = freezePreparedIrValue(decodeValue(envelope.program, "program", new Map()));
  assertPreparedIrProgramShape(decoded);
  return decoded;
}

/** Content fingerprint of canonical bytes (FNV-1a-64; identity aid, not a security hash). */
export function digestEncodedPreparedIrProgram(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let hash = 0xcbf29ce484222325n;
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `${PREPARED_IR_PROGRAM_CODEC}:${hash.toString(16).padStart(16, "0")}`;
}

// ---------------------------------------------------------------------------
// Shape check shared by encode, decode and the backend consumer
// ---------------------------------------------------------------------------

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return invalid(`${path} must be a record`);
  }
  return value as Record<string, unknown>;
}

function requireArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) return invalid(`${path} must be an array`);
  return value;
}

function requireMap(value: unknown, path: string): ReadonlyMap<unknown, unknown> {
  if (value === null || typeof value !== "object" || !isReadonlyMapLike(value)) {
    return invalid(`${path} must be a ReadonlyMap`);
  }
  return value;
}

/**
 * Structural contract of `PreparedIrProgram` as published by package A. This
 * is the codec/consumer-level check — container kinds, discriminators and the
 * joins a backend needs before it can even look up a body. Semantic
 * population checks (ownership, provenance, call closure) belong to A's
 * preparation driver and are run by the consumer when that module is present.
 */
export function assertPreparedIrProgramShape(value: unknown): asserts value is PreparedIrProgram {
  const program = requireRecord(value, "program");
  if (program.schema !== PREPARED_IR_PROGRAM_SCHEMA) {
    return invalid(`program.schema must be ${PREPARED_IR_PROGRAM_SCHEMA}, got ${String(program.schema)}`);
  }
  if (program.reconciliation !== "complete") {
    return invalid(`program.reconciliation must be "complete", got ${String(program.reconciliation)}`);
  }
  if (program.sealed !== true) return invalid("program.sealed must be true");

  const inventory = requireRecord(program.inventory, "program.inventory");
  const sources = requireArray(inventory.sources, "program.inventory.sources");
  requireArray(inventory.classes, "program.inventory.classes");
  requireArray(inventory.allUnits, "program.inventory.allUnits");
  const terminals = requireArray(inventory.terminalUnits, "program.inventory.terminalUnits");
  const sourceIds = new Set<string>();
  for (const [index, source] of sources.entries()) {
    const record = requireRecord(source, `program.inventory.sources[${index}]`);
    if (typeof record.id !== "string") return invalid(`program.inventory.sources[${index}].id must be a string`);
    if (sourceIds.has(record.id)) return invalid(`program.inventory.sources repeats ${record.id}`);
    sourceIds.add(record.id);
  }
  const terminalIds = new Set<string>();
  for (const [index, terminal] of terminals.entries()) {
    const record = requireRecord(terminal, `program.inventory.terminalUnits[${index}]`);
    if (typeof record.id !== "string") return invalid(`program.inventory.terminalUnits[${index}].id must be a string`);
    if (record.terminal !== true) return invalid(`program.inventory.terminalUnits[${index}] must be terminal`);
    if (terminalIds.has(record.id)) return invalid(`program.inventory.terminalUnits repeats ${record.id}`);
    if (typeof record.sourceId !== "string" || !sourceIds.has(record.sourceId)) {
      return invalid(`terminal ${record.id} names source ${String(record.sourceId)} absent from the inventory`);
    }
    terminalIds.add(record.id);
  }

  const units = requireMap(program.units, "program.units");
  if (units.size !== terminalIds.size) {
    return invalid(`program.units holds ${units.size} units but the inventory has ${terminalIds.size} terminals`);
  }
  for (const [key, unit] of units) {
    if (typeof key !== "string" || !terminalIds.has(key))
      return invalid(`program.units key ${String(key)} is not a terminal`);
    const record = requireRecord(unit, `program.units[${key}]`);
    if (record.id !== key) return invalid(`program.units[${key}] carries id ${String(record.id)}`);
  }

  const ir = requireRecord(program.ir, "program.ir");
  const functions = requireArray(ir.functions, "program.ir.functions");
  const bodyIds = new Set<string>();
  for (const [index, fn] of functions.entries()) {
    const record = requireRecord(fn, `program.ir.functions[${index}]`);
    if (typeof record.unitId !== "string") return invalid(`program.ir.functions[${index}].unitId must be a string`);
    if (typeof record.name !== "string") return invalid(`program.ir.functions[${index}].name must be a string`);
    if (bodyIds.has(record.unitId)) return invalid(`program.ir.functions repeats body ${record.unitId}`);
    requireArray(record.blocks, `program.ir.functions[${index}].blocks`);
    requireArray(record.params, `program.ir.functions[${index}].params`);
    requireArray(record.resultTypes, `program.ir.functions[${index}].resultTypes`);
    bodyIds.add(record.unitId);
  }

  const abi = requireRecord(program.abi, "program.abi");
  const entries = requireArray(abi.entries, "program.abi.entries");
  for (const [index, entry] of entries.entries()) {
    const record = requireRecord(entry, `program.abi.entries[${index}]`);
    const plan = requireRecord(record.plan, `program.abi.entries[${index}].plan`);
    if (typeof plan.id !== "string") return invalid(`program.abi.entries[${index}].plan.id must be a string`);
    const contract = requireRecord(record.contract, `program.abi.entries[${index}].contract`);
    if (typeof contract.kind !== "string")
      return invalid(`program.abi.entries[${index}].contract.kind must be a string`);
  }
  // Duplicate binding IDs are refused by A's own lookup reconstruction.
  preparedIrProgramAbiLookup(program.abi as PreparedIrProgram["abi"]);

  const derived = requireArray(program.derivedUnits, "program.derivedUnits");
  for (const [index, record] of derived.entries()) {
    const unit = requireRecord(record, `program.derivedUnits[${index}]`);
    if (typeof unit.id !== "string") return invalid(`program.derivedUnits[${index}].id must be a string`);
  }

  const startup = requireArray(program.startup, "program.startup");
  for (const [index, plan] of startup.entries()) {
    const record = requireRecord(plan, `program.startup[${index}]`);
    if (typeof record.sourceId !== "string" || !sourceIds.has(record.sourceId)) {
      return invalid(`program.startup[${index}] names source ${String(record.sourceId)} absent from the inventory`);
    }
    if (typeof record.executable !== "boolean") return invalid(`program.startup[${index}].executable must be boolean`);
    requireArray(record.evaluations, `program.startup[${index}].evaluations`);
  }

  const runtime = requireArray(program.runtime, "program.runtime");
  const projections = new Set<string>();
  for (const [index, projection] of runtime.entries()) {
    const record = requireRecord(projection, `program.runtime[${index}]`);
    if (typeof record.backend !== "string" || typeof record.target !== "string") {
      return invalid(`program.runtime[${index}] must name backend and target`);
    }
    const key = `${record.backend}/${record.target}`;
    if (projections.has(key)) return invalid(`program.runtime repeats projection ${key}`);
    projections.add(key);
    const prepared = requireRecord(record.prepared, `program.runtime[${index}].prepared`);
    requireArray(prepared.functions, `program.runtime[${index}].prepared.functions`);
    requireRecord(prepared.manifest, `program.runtime[${index}].prepared.manifest`);
    requireMap(prepared.providers, `program.runtime[${index}].prepared.providers`);
  }
}
