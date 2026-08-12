import { describe, expect, it } from "vitest";
import { createInstrumentedCircularQueue } from "./instrument-circular-queue";

describe("createInstrumentedCircularQueue", () => {
  it("throws RangeError for a non-positive or non-integer capacity", () => {
    expect(() => createInstrumentedCircularQueue(0)).toThrow(RangeError);
    expect(() => createInstrumentedCircularQueue(-1)).toThrow(RangeError);
    expect(() => createInstrumentedCircularQueue(1.5)).toThrow(RangeError);
  });

  it("starts empty with capacity slots, all null", () => {
    const queue = createInstrumentedCircularQueue(3);
    expect(queue.size).toBe(0);
    expect(queue.capacity).toBe(3);
    expect(queue.isEmpty).toBe(true);
    expect(queue.isFull).toBe(false);
    expect(queue.snapshot().slots).toEqual([null, null, null]);
  });

  it("enqueue() fills slots left to right from front, returns an EnqueueEvent", () => {
    const queue = createInstrumentedCircularQueue(3);
    const event = queue.enqueue(10);
    expect(event).toMatchObject({ type: "enqueue", value: 10 });
    queue.enqueue(20);
    expect(queue.snapshot()).toMatchObject({ slots: [10, 20, null], front: 0, size: 2 });
  });

  it("enqueue() past capacity throws, without touching state", () => {
    const queue = createInstrumentedCircularQueue(2);
    queue.enqueue(1);
    queue.enqueue(2);
    expect(queue.isFull).toBe(true);
    expect(() => queue.enqueue(3)).toThrow(RangeError);
    expect(queue.size).toBe(2);
  });

  it("dequeue() removes from the front, clears the slot to null, and advances front", () => {
    const queue = createInstrumentedCircularQueue(3);
    queue.enqueue(1);
    queue.enqueue(2);
    const event = queue.dequeue();
    expect(event).toMatchObject({ type: "dequeue", value: 1 });
    const snap = queue.snapshot();
    expect(snap.slots).toEqual([null, 2, null]);
    expect(snap.front).toBe(1);
    expect(snap.size).toBe(1);
  });

  it("dequeue() on an empty queue throws RangeError", () => {
    const queue = createInstrumentedCircularQueue(3);
    expect(() => queue.dequeue()).toThrow(RangeError);
  });

  it("peek() reuses ReadEvent tagged with the front index, without mutating", () => {
    const queue = createInstrumentedCircularQueue(3);
    queue.enqueue(7);
    queue.dequeue(); // front now at index 1 (empty), nothing to peek
    queue.enqueue(8); // fills index 1
    const event = queue.peek();
    expect(event).toMatchObject({ type: "read", index: 1, value: 8 });
    expect(queue.size).toBe(1);
  });

  it("checkEmpty()/checkFull() report the correct boolean without mutating", () => {
    const queue = createInstrumentedCircularQueue(1);
    expect(queue.checkEmpty()).toMatchObject({ type: "queue-check", check: "isEmpty", result: true });
    expect(queue.checkFull()).toMatchObject({ type: "queue-check", check: "isFull", result: false });
    queue.enqueue(1);
    expect(queue.checkEmpty().result).toBe(false);
    expect(queue.checkFull().result).toBe(true);
    expect(queue.size).toBe(1);
  });

  it("wraps around: reuses freed slots after enough dequeues, never throws, indices wrap via modulo", () => {
    const queue = createInstrumentedCircularQueue(3);
    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);
    expect(queue.snapshot()).toMatchObject({ slots: [1, 2, 3], front: 0, rear: 2, size: 3 });
    expect(queue.isFull).toBe(true);

    expect(queue.dequeue().value).toBe(1);
    expect(queue.dequeue().value).toBe(2);
    expect(queue.snapshot()).toMatchObject({ slots: [null, null, 3], front: 2, size: 1 });

    // Two more enqueues wrap around to indices 0 and 1 — five total enqueues
    // into a capacity-3 buffer, only possible because of the two dequeues
    // above freeing slots. Must not throw.
    expect(() => {
      queue.enqueue(4);
      queue.enqueue(5);
    }).not.toThrow();
    expect(queue.snapshot()).toMatchObject({ slots: [4, 5, 3], front: 2, rear: 1, size: 3 });
    expect(queue.isFull).toBe(true);
    expect(queue.frontValue()).toBe(3); // FIFO order preserved: 3 was enqueued before 4 and 5

    expect(queue.dequeue().value).toBe(3);
    expect(queue.snapshot()).toMatchObject({ slots: [4, 5, null], front: 0, size: 2 });
    expect(queue.frontValue()).toBe(4);
  });

  it("step numbers are monotonically increasing across mixed operations", () => {
    const queue = createInstrumentedCircularQueue(3);
    const steps = [
      queue.enqueue(1).step,
      queue.enqueue(2).step,
      queue.peek().step,
      queue.checkEmpty().step,
      queue.dequeue().step,
      queue.checkFull().step,
    ];
    expect(steps).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("propagates meta (line/note) onto the returned event", () => {
    const queue = createInstrumentedCircularQueue(3);
    const event = queue.enqueue(5, { line: 2, note: "enqueueing" });
    expect(event.line).toBe(2);
    expect(event.note).toBe("enqueueing");
  });

  it("snapshot() is an independent copy", () => {
    const queue = createInstrumentedCircularQueue(3);
    queue.enqueue(1);
    const snap = queue.snapshot();
    queue.enqueue(2);
    expect(snap.slots).toEqual([1, null, null]); // earlier snapshot unaffected
  });
});
