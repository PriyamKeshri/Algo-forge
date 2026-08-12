import { describe, expect, it } from "vitest";
import { createInstrumentedArray } from "./instrument";

describe("createInstrumentedArray", () => {
  it("does not mutate the input array it was created from", () => {
    const input = [3, 1, 2];
    const arr = createInstrumentedArray(input);
    arr.set(0, 99);
    expect(input).toEqual([3, 1, 2]);
  });

  it("get() reads the current value without emitting a step", () => {
    const arr = createInstrumentedArray([5, 6, 7]);
    expect(arr.get(1)).toBe(6);
    const event = arr.read(1);
    expect(event.step).toBe(0); // get() didn't consume a step
  });

  it("read() returns the current value and increments step", () => {
    const arr = createInstrumentedArray([10, 20]);
    const e0 = arr.read(0);
    const e1 = arr.read(1);
    expect(e0).toMatchObject({ type: "read", step: 0, index: 0, value: 10 });
    expect(e1).toMatchObject({ type: "read", step: 1, index: 1, value: 20 });
  });

  it("compare() reports -1/0/1 correctly and does not mutate", () => {
    const arr = createInstrumentedArray([5, 5, 9]);
    expect(arr.compare(0, 2).result).toBe(-1);
    expect(arr.compare(2, 0).result).toBe(1);
    expect(arr.compare(0, 1).result).toBe(0);
    expect(arr.snapshot().values).toEqual([5, 5, 9]);
  });

  it("compareTarget() reports -1/0/1 against an external value and does not mutate", () => {
    const arr = createInstrumentedArray([5, 9, 12]);
    expect(arr.compareTarget(0, 9).result).toBe(-1); // values[0]=5 < target 9
    expect(arr.compareTarget(1, 9).result).toBe(0); // values[1]=9 == target 9
    expect(arr.compareTarget(2, 9).result).toBe(1); // values[2]=12 > target 9
    expect(arr.snapshot().values).toEqual([5, 9, 12]);
  });

  it("swap() exchanges values and returns the swapped indices", () => {
    const arr = createInstrumentedArray([1, 2, 3]);
    const event = arr.swap(0, 2);
    expect(event).toMatchObject({ type: "swap", indices: [0, 2] });
    expect(arr.snapshot().values).toEqual([3, 2, 1]);
  });

  it("set() writes a value and records the previous value", () => {
    const arr = createInstrumentedArray([1, 2, 3]);
    const event = arr.set(1, 42);
    expect(event).toMatchObject({ type: "set", index: 1, value: 42, previousValue: 2 });
    expect(arr.snapshot().values).toEqual([1, 42, 3]);
  });

  it("highlight() and markDone() accept index lists without mutating", () => {
    const arr = createInstrumentedArray([1, 2, 3]);
    const highlight = arr.highlight([0, 1], "window");
    const done = arr.markDone([2]);
    expect(highlight).toMatchObject({ type: "highlight", indices: [0, 1], role: "window" });
    expect(done).toMatchObject({ type: "mark-done", indices: [2] });
    expect(arr.snapshot().values).toEqual([1, 2, 3]);
  });

  it("markDone() accepts a single index as shorthand", () => {
    const arr = createInstrumentedArray([1, 2, 3]);
    expect(arr.markDone(2)).toMatchObject({ indices: [2] });
  });

  it("step numbers are monotonically increasing across mixed operations", () => {
    const arr = createInstrumentedArray([3, 1, 2]);
    const steps = [
      arr.compare(0, 1).step,
      arr.swap(0, 1).step,
      arr.read(2).step,
      arr.set(2, 0).step,
      arr.highlight([0]).step,
      arr.markDone(0).step,
    ];
    expect(steps).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("propagates meta (line/note) onto the returned event", () => {
    const arr = createInstrumentedArray([1, 2]);
    const event = arr.compare(0, 1, { line: 4, note: "inner loop" });
    expect(event.line).toBe(4);
    expect(event.note).toBe("inner loop");
  });

  it("throws a RangeError for out-of-bounds access", () => {
    const arr = createInstrumentedArray([1, 2]);
    expect(() => arr.get(5)).toThrow(RangeError);
    expect(() => arr.compare(-1, 0)).toThrow(RangeError);
    expect(() => arr.compareTarget(5, 0)).toThrow(RangeError);
    expect(() => arr.swap(0, 2)).toThrow(RangeError);
  });

  it("snapshot() returns an independent copy", () => {
    const arr = createInstrumentedArray([1, 2, 3]);
    const snap = arr.snapshot();
    arr.set(0, 100);
    expect(snap.values).toEqual([1, 2, 3]);
  });
});
