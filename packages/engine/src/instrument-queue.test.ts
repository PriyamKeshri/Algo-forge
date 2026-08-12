import { describe, expect, it } from "vitest";
import { createInstrumentedQueue } from "./instrument-queue";

describe("createInstrumentedQueue", () => {
  it("starts empty", () => {
    const queue = createInstrumentedQueue();
    expect(queue.size).toBe(0);
    expect(queue.isEmpty).toBe(true);
    expect(queue.isFull).toBe(false);
    expect(queue.frontValue()).toBeUndefined();
    expect(queue.rearValue()).toBeUndefined();
  });

  it("enqueue() defaults to the rear and returns an EnqueueEvent", () => {
    const queue = createInstrumentedQueue();
    queue.enqueue(1);
    const event = queue.enqueue(2);
    expect(event).toMatchObject({ type: "enqueue", value: 2, end: undefined });
    expect(queue.size).toBe(2);
    expect(queue.frontValue()).toBe(1);
    expect(queue.rearValue()).toBe(2);
  });

  it("dequeue() defaults to the front and returns the removed value on the event", () => {
    const queue = createInstrumentedQueue();
    queue.enqueue(1);
    queue.enqueue(2);
    const event = queue.dequeue();
    expect(event).toMatchObject({ type: "dequeue", value: 1, end: undefined });
    expect(queue.size).toBe(1);
    expect(queue.frontValue()).toBe(2);
  });

  it("dequeue() on an empty queue throws RangeError", () => {
    const queue = createInstrumentedQueue();
    expect(() => queue.dequeue()).toThrow(RangeError);
  });

  it("enqueue(value, 'front') and dequeue('rear') work both ends, for deque support", () => {
    const queue = createInstrumentedQueue();
    queue.enqueue(1); // rear: [1]
    queue.enqueue(2, "front"); // front: [2, 1]
    expect(queue.frontValue()).toBe(2);
    expect(queue.rearValue()).toBe(1);

    const removedFromRear = queue.dequeue("rear");
    expect(removedFromRear.value).toBe(1);
    expect(queue.size).toBe(1);
    expect(queue.frontValue()).toBe(2);
  });

  it("peek() reuses ReadEvent, tagged with the requested end's index, without mutating", () => {
    const queue = createInstrumentedQueue();
    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);

    const front = queue.peek();
    expect(front).toMatchObject({ type: "read", index: 0, value: 1 });
    const rear = queue.peek("rear");
    expect(rear).toMatchObject({ type: "read", index: 2, value: 3 });
    expect(queue.size).toBe(3); // peek doesn't remove anything
  });

  it("peek() on an empty queue throws RangeError", () => {
    const queue = createInstrumentedQueue();
    expect(() => queue.peek()).toThrow(RangeError);
  });

  it("isFull is always false when no capacity is given", () => {
    const queue = createInstrumentedQueue();
    for (let i = 0; i < 50; i++) queue.enqueue(i);
    expect(queue.isFull).toBe(false);
  });

  it("respects capacity: isFull flips true at the limit, enqueue() past it throws", () => {
    const queue = createInstrumentedQueue(2);
    expect(queue.isFull).toBe(false);
    queue.enqueue(1);
    expect(queue.isFull).toBe(false);
    queue.enqueue(2);
    expect(queue.isFull).toBe(true);
    expect(() => queue.enqueue(3)).toThrow(RangeError);
  });

  it("checkEmpty()/checkFull() report the correct boolean without mutating", () => {
    const queue = createInstrumentedQueue(1);
    expect(queue.checkEmpty()).toMatchObject({ type: "queue-check", check: "isEmpty", result: true });
    expect(queue.checkFull()).toMatchObject({ type: "queue-check", check: "isFull", result: false });
    queue.enqueue(1);
    expect(queue.checkEmpty().result).toBe(false);
    expect(queue.checkFull().result).toBe(true);
    expect(queue.size).toBe(1); // neither check mutated anything
  });

  it("step numbers are monotonically increasing across mixed operations", () => {
    const queue = createInstrumentedQueue();
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
    const queue = createInstrumentedQueue();
    const event = queue.enqueue(5, undefined, { line: 2, note: "enqueueing" });
    expect(event.line).toBe(2);
    expect(event.note).toBe("enqueueing");
  });

  it("snapshot() reflects current values (front first) and capacity, and is an independent copy", () => {
    const queue = createInstrumentedQueue(5);
    queue.enqueue(1);
    queue.enqueue(2);
    const snap = queue.snapshot();
    expect(snap).toEqual({ kind: "queue", values: [1, 2], capacity: 5 });

    queue.enqueue(3);
    expect(snap.values).toEqual([1, 2]); // earlier snapshot unaffected
  });
});
