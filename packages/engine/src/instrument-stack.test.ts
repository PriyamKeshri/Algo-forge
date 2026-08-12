import { describe, expect, it } from "vitest";
import { createInstrumentedStack } from "./instrument-stack";

describe("createInstrumentedStack", () => {
  it("starts empty", () => {
    const stack = createInstrumentedStack();
    expect(stack.size).toBe(0);
    expect(stack.isEmpty).toBe(true);
    expect(stack.isFull).toBe(false);
    expect(stack.top()).toBeUndefined();
  });

  it("push() adds to the top and returns a PushEvent", () => {
    const stack = createInstrumentedStack();
    const event = stack.push(5);
    expect(event).toMatchObject({ type: "push", value: 5, step: 0 });
    expect(stack.size).toBe(1);
    expect(stack.top()).toBe(5);
    expect(stack.isEmpty).toBe(false);
  });

  it("pop() removes and returns the top value on the event", () => {
    const stack = createInstrumentedStack();
    stack.push(5);
    stack.push(9);
    const event = stack.pop();
    expect(event).toMatchObject({ type: "pop", value: 9 });
    expect(stack.size).toBe(1);
    expect(stack.top()).toBe(5);
  });

  it("pop() on an empty stack throws RangeError", () => {
    const stack = createInstrumentedStack();
    expect(() => stack.pop()).toThrow(RangeError);
  });

  it("peek() reuses ReadEvent, tagged with the top's index, without mutating", () => {
    const stack = createInstrumentedStack();
    stack.push(1);
    stack.push(2);
    stack.push(3);
    const event = stack.peek();
    expect(event).toMatchObject({ type: "read", index: 2, value: 3 });
    expect(stack.size).toBe(3); // peek doesn't remove anything
  });

  it("peek() on an empty stack throws RangeError", () => {
    const stack = createInstrumentedStack();
    expect(() => stack.peek()).toThrow(RangeError);
  });

  it("isFull is always false when no capacity is given", () => {
    const stack = createInstrumentedStack();
    for (let i = 0; i < 50; i++) stack.push(i);
    expect(stack.isFull).toBe(false);
  });

  it("respects capacity: isFull flips true at the limit, push() past it throws", () => {
    const stack = createInstrumentedStack(2);
    expect(stack.isFull).toBe(false);
    stack.push(1);
    expect(stack.isFull).toBe(false);
    stack.push(2);
    expect(stack.isFull).toBe(true);
    expect(() => stack.push(3)).toThrow(RangeError);
  });

  it("checkEmpty()/checkFull() report the correct boolean without mutating", () => {
    const stack = createInstrumentedStack(1);
    expect(stack.checkEmpty()).toMatchObject({ type: "stack-check", check: "isEmpty", result: true });
    expect(stack.checkFull()).toMatchObject({ type: "stack-check", check: "isFull", result: false });
    stack.push(1);
    expect(stack.checkEmpty().result).toBe(false);
    expect(stack.checkFull().result).toBe(true);
    expect(stack.size).toBe(1); // neither check mutated anything
  });

  it("step numbers are monotonically increasing across mixed operations", () => {
    const stack = createInstrumentedStack();
    const steps = [
      stack.push(1).step,
      stack.push(2).step,
      stack.peek().step,
      stack.checkEmpty().step,
      stack.pop().step,
      stack.checkFull().step,
    ];
    expect(steps).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("propagates meta (line/note) onto the returned event", () => {
    const stack = createInstrumentedStack();
    const event = stack.push(5, { line: 2, note: "pushing" });
    expect(event.line).toBe(2);
    expect(event.note).toBe("pushing");
  });

  it("snapshot() reflects current values (top last) and capacity, and is an independent copy", () => {
    const stack = createInstrumentedStack(5);
    stack.push(1);
    stack.push(2);
    const snap = stack.snapshot();
    expect(snap).toEqual({ kind: "stack", values: [1, 2], capacity: 5 });

    stack.push(3);
    expect(snap.values).toEqual([1, 2]); // earlier snapshot unaffected
  });
});
