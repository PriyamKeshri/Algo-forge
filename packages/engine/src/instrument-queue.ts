import type { DequeueEvent, EnqueueEvent, QueueCheckEvent, QueueSnapshot, ReadEvent } from "@algoviz/core";
import type { EventMeta } from "./instrument";

/**
 * The object queue algorithm plugins write against — the queue counterpart
 * to `InstrumentedStack`, and shared by both Queue Operations (always
 * enqueue → rear, dequeue/peek → front) and Deque Operations (freely picks
 * either `end`). `end` defaults to the FIFO convention when omitted, so
 * Queue Operations never has to think about it.
 *
 * `size`/`isEmpty`/`isFull`/`frontValue`/`rearValue` are silent (no event)
 * — control-flow reads only, mirroring `InstrumentedArray.get()`. `peek()`
 * is the *visualized* read and reuses `ReadEvent` (`{ index: 0 | size - 1,
 * value }`) rather than getting its own type, the same choice
 * `InstrumentedStack.peek()` made.
 */
export interface InstrumentedQueue {
  readonly size: number;
  readonly isEmpty: boolean;
  /** Always `false` when no `capacity` was given (an unbounded queue). */
  readonly isFull: boolean;
  frontValue(): number | undefined;
  rearValue(): number | undefined;
  /** `end` defaults to `"rear"`. */
  enqueue(value: number, end?: "front" | "rear", meta?: EventMeta): EnqueueEvent;
  /** `end` defaults to `"front"`. */
  dequeue(end?: "front" | "rear", meta?: EventMeta): DequeueEvent;
  /** `end` defaults to `"front"`. */
  peek(end?: "front" | "rear", meta?: EventMeta): ReadEvent;
  checkEmpty(meta?: EventMeta): QueueCheckEvent;
  checkFull(meta?: EventMeta): QueueCheckEvent;
  snapshot(): QueueSnapshot;
}

export function createInstrumentedQueue(capacity?: number): InstrumentedQueue {
  const values: number[] = [];
  let step = 0;
  const nextStep = () => step++;
  const full = () => capacity !== undefined && values.length >= capacity;

  return {
    get size() {
      return values.length;
    },
    get isEmpty() {
      return values.length === 0;
    },
    get isFull() {
      return full();
    },

    frontValue() {
      return values[0];
    },
    rearValue() {
      return values[values.length - 1];
    },

    enqueue(value, end, meta) {
      if (full()) {
        throw new RangeError(`InstrumentedQueue.enqueue: queue is full (capacity ${capacity})`);
      }
      if (end === "front") values.unshift(value);
      else values.push(value);
      return { type: "enqueue", step: nextStep(), value, end, ...meta };
    },

    dequeue(end, meta) {
      if (values.length === 0) {
        throw new RangeError("InstrumentedQueue.dequeue: queue is empty");
      }
      const value = end === "rear" ? values.pop()! : values.shift()!;
      return { type: "dequeue", step: nextStep(), value, end, ...meta };
    },

    peek(end, meta) {
      if (values.length === 0) {
        throw new RangeError("InstrumentedQueue.peek: queue is empty");
      }
      const index = end === "rear" ? values.length - 1 : 0;
      return { type: "read", step: nextStep(), index, value: values[index]!, ...meta };
    },

    checkEmpty(meta) {
      return { type: "queue-check", step: nextStep(), check: "isEmpty", result: values.length === 0, ...meta };
    },

    checkFull(meta) {
      return { type: "queue-check", step: nextStep(), check: "isFull", result: full(), ...meta };
    },

    snapshot(): QueueSnapshot {
      return { kind: "queue", values: [...values], capacity };
    },
  };
}
