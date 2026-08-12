import type {
  ArraySnapshot,
  CompareEvent,
  CompareValueEvent,
  HighlightEvent,
  MarkDoneEvent,
  ReadEvent,
  SetEvent,
  SwapEvent,
} from "@algoviz/core";

export interface EventMeta {
  line?: number;
  sourceLine?: number;
  note?: string;
}

/**
 * The object algorithm plugins write against. Every method except `.get()`
 * synchronously builds and returns a fully-formed `VisualizationEvent` (with
 * `.value`/`.result` already computed) and stamps it with the next step
 * index. Plugins are expected to `yield` that return value to *publish* it —
 * `yield` is never used to receive data back, since a plugin's generator is
 * typed `Generator<VisualizationEvent, void, void>`. `.get()` is the escape
 * hatch for control-flow reads (e.g. `if (arr.get(j) > arr.get(j+1))`) that
 * shouldn't themselves appear as a visualized "read" event.
 */
export interface InstrumentedArray {
  readonly length: number;
  get(index: number): number;
  read(index: number, meta?: EventMeta): ReadEvent;
  compare(i: number, j: number, meta?: EventMeta): CompareEvent;
  /** A search counterpart to `compare`: checks `values[index]` against an external `target` instead of another array index — see `CompareValueEvent`. */
  compareTarget(index: number, target: number, meta?: EventMeta): CompareValueEvent;
  swap(i: number, j: number, meta?: EventMeta): SwapEvent;
  set(index: number, value: number, meta?: EventMeta): SetEvent;
  highlight(indices: number[], role?: string, meta?: EventMeta): HighlightEvent;
  markDone(indices: number | number[], meta?: EventMeta): MarkDoneEvent;
  snapshot(): ArraySnapshot;
}

function assertIndex(values: readonly number[], index: number, op: string): void {
  if (!Number.isInteger(index) || index < 0 || index >= values.length) {
    throw new RangeError(
      `InstrumentedArray.${op}: index ${index} out of bounds for length ${values.length}`,
    );
  }
}

export function createInstrumentedArray(initial: readonly number[]): InstrumentedArray {
  const values = [...initial];
  let step = 0;
  const nextStep = () => step++;

  return {
    get length() {
      return values.length;
    },

    get(index) {
      assertIndex(values, index, "get");
      return values[index]!;
    },

    read(index, meta) {
      assertIndex(values, index, "read");
      return { type: "read", step: nextStep(), index, value: values[index]!, ...meta };
    },

    compare(i, j, meta) {
      assertIndex(values, i, "compare");
      assertIndex(values, j, "compare");
      const a = values[i]!;
      const b = values[j]!;
      const result = a < b ? -1 : a > b ? 1 : 0;
      return { type: "compare", step: nextStep(), indices: [i, j], result, ...meta };
    },

    compareTarget(index, target, meta) {
      assertIndex(values, index, "compareTarget");
      const value = values[index]!;
      const result = value < target ? -1 : value > target ? 1 : 0;
      return { type: "compare-value", step: nextStep(), index, target, result, ...meta };
    },

    swap(i, j, meta) {
      assertIndex(values, i, "swap");
      assertIndex(values, j, "swap");
      const tmp = values[i]!;
      values[i] = values[j]!;
      values[j] = tmp;
      return { type: "swap", step: nextStep(), indices: [i, j], ...meta };
    },

    set(index, value, meta) {
      assertIndex(values, index, "set");
      const previousValue = values[index]!;
      values[index] = value;
      return { type: "set", step: nextStep(), index, value, previousValue, ...meta };
    },

    highlight(indices, role, meta) {
      return { type: "highlight", step: nextStep(), indices: [...indices], role, ...meta };
    },

    markDone(indices, meta) {
      const list = Array.isArray(indices) ? indices : [indices];
      return { type: "mark-done", step: nextStep(), indices: [...list], ...meta };
    },

    snapshot(): ArraySnapshot {
      return { kind: "array", values: [...values] };
    },
  };
}
