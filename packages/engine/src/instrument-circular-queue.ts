import type { CircularQueueSnapshot, DequeueEvent, EnqueueEvent, QueueCheckEvent, ReadEvent } from "@algoviz/core";
import type { EventMeta } from "./instrument";

/**
 * The object the Circular Queue Operations plugin writes against — unlike
 * `InstrumentedQueue`, `capacity` is required (a circular queue without a
 * fixed size isn't one) and there's no `end` parameter (a circular queue
 * is always FIFO: enqueue → rear, dequeue/peek → front — that's not this
 * type's point, wraparound is). Internally a fixed-size array + a `front`
 * index + a `size` counter, wrapping via modulo — the actual "circular"
 * mechanic. `snapshot()` exposes the raw backing array (including empty
 * slots) plus the pointer positions, since losing either would lose the
 * whole point of visualizing this over a plain queue.
 */
export interface InstrumentedCircularQueue {
  readonly size: number;
  readonly capacity: number;
  readonly isEmpty: boolean;
  readonly isFull: boolean;
  frontValue(): number | undefined;
  enqueue(value: number, meta?: EventMeta): EnqueueEvent;
  dequeue(meta?: EventMeta): DequeueEvent;
  peek(meta?: EventMeta): ReadEvent;
  checkEmpty(meta?: EventMeta): QueueCheckEvent;
  checkFull(meta?: EventMeta): QueueCheckEvent;
  snapshot(): CircularQueueSnapshot;
}

export function createInstrumentedCircularQueue(capacity: number): InstrumentedCircularQueue {
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new RangeError(`createInstrumentedCircularQueue: capacity must be a positive integer, got ${capacity}`);
  }

  const slots: (number | null)[] = new Array(capacity).fill(null);
  let front = 0;
  let size = 0;
  let step = 0;
  const nextStep = () => step++;
  const rearIndex = () => (front + size - 1 + capacity) % capacity;

  return {
    get size() {
      return size;
    },
    get capacity() {
      return capacity;
    },
    get isEmpty() {
      return size === 0;
    },
    get isFull() {
      return size === capacity;
    },

    frontValue() {
      return size === 0 ? undefined : slots[front]!;
    },

    enqueue(value, meta) {
      if (size === capacity) {
        throw new RangeError(`InstrumentedCircularQueue.enqueue: queue is full (capacity ${capacity})`);
      }
      const index = (front + size) % capacity;
      slots[index] = value;
      size++;
      return { type: "enqueue", step: nextStep(), value, ...meta };
    },

    dequeue(meta) {
      if (size === 0) {
        throw new RangeError("InstrumentedCircularQueue.dequeue: queue is empty");
      }
      const value = slots[front]!;
      slots[front] = null; // clear the slot so snapshot() shows it as empty, not stale
      front = (front + 1) % capacity;
      size--;
      return { type: "dequeue", step: nextStep(), value, ...meta };
    },

    peek(meta) {
      if (size === 0) {
        throw new RangeError("InstrumentedCircularQueue.peek: queue is empty");
      }
      return { type: "read", step: nextStep(), index: front, value: slots[front]!, ...meta };
    },

    checkEmpty(meta) {
      return { type: "queue-check", step: nextStep(), check: "isEmpty", result: size === 0, ...meta };
    },

    checkFull(meta) {
      return { type: "queue-check", step: nextStep(), check: "isFull", result: size === capacity, ...meta };
    },

    snapshot(): CircularQueueSnapshot {
      return { kind: "circular-queue", slots: [...slots], front, rear: rearIndex(), size, capacity };
    },
  };
}
