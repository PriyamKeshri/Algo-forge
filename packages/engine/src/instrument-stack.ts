import type { PopEvent, PushEvent, ReadEvent, StackCheckEvent, StackSnapshot } from "@algoviz/core";
import type { EventMeta } from "./instrument";

/**
 * The object stack algorithm plugins (Stack Operations, Postfix/Prefix
 * Evaluation, ...) write against — the stack counterpart to
 * `InstrumentedArray`/`InstrumentedTree`. Like `InstrumentedTree`, a stack
 * *starts empty* (`createInstrumentedStack()` takes no data, just an
 * optional `capacity`) and grows via `push()`.
 *
 * `top`/`size`/`isEmpty`/`isFull` are silent (no event) — control-flow
 * reads only, mirroring `InstrumentedArray.get()`. `peek()` is the
 * *visualized* read of the top and reuses `ReadEvent` (`{ index: size - 1,
 * value }`) rather than getting its own event type — peeking the top *is*
 * "read the value at the top index."
 */
export interface InstrumentedStack {
  readonly size: number;
  readonly isEmpty: boolean;
  /** Always `false` when no `capacity` was given (an unbounded stack). */
  readonly isFull: boolean;
  top(): number | undefined;
  push(value: number, meta?: EventMeta): PushEvent;
  pop(meta?: EventMeta): PopEvent;
  peek(meta?: EventMeta): ReadEvent;
  checkEmpty(meta?: EventMeta): StackCheckEvent;
  checkFull(meta?: EventMeta): StackCheckEvent;
  snapshot(): StackSnapshot;
}

export function createInstrumentedStack(capacity?: number): InstrumentedStack {
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

    top() {
      return values[values.length - 1];
    },

    push(value, meta) {
      if (full()) {
        throw new RangeError(`InstrumentedStack.push: stack is full (capacity ${capacity})`);
      }
      values.push(value);
      return { type: "push", step: nextStep(), value, ...meta };
    },

    pop(meta) {
      if (values.length === 0) {
        throw new RangeError("InstrumentedStack.pop: stack is empty");
      }
      const value = values.pop()!;
      return { type: "pop", step: nextStep(), value, ...meta };
    },

    peek(meta) {
      if (values.length === 0) {
        throw new RangeError("InstrumentedStack.peek: stack is empty");
      }
      const index = values.length - 1;
      return { type: "read", step: nextStep(), index, value: values[index]!, ...meta };
    },

    checkEmpty(meta) {
      return { type: "stack-check", step: nextStep(), check: "isEmpty", result: values.length === 0, ...meta };
    },

    checkFull(meta) {
      return { type: "stack-check", step: nextStep(), check: "isFull", result: full(), ...meta };
    },

    snapshot(): StackSnapshot {
      return { kind: "stack", values: [...values], capacity };
    },
  };
}
