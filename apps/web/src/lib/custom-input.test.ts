import { describe, expect, it } from "vitest";
import type { InputConstraints } from "@algoviz/core";
import { parseCustomInput, sizeOfInput } from "./custom-input";

const ARRAY: InputConstraints = { kind: "array", minSize: 1, maxSize: 10, defaultSize: 5, valueRange: [1, 100] };
const SORTED_ARRAY: InputConstraints = { ...ARRAY, sorted: true };
const STACK: InputConstraints = { kind: "stack", minSize: 1, maxSize: 10, defaultSize: 5 };
const QUEUE: InputConstraints = { kind: "queue", minSize: 1, maxSize: 10, defaultSize: 5 };
const CIRCULAR_QUEUE: InputConstraints = { kind: "circular-queue", minSize: 1, maxSize: 10, defaultSize: 5 };
const POSTFIX: InputConstraints = { kind: "expression", minSize: 1, maxSize: 10, defaultSize: 5, notation: "postfix" };
const PREFIX: InputConstraints = { kind: "expression", minSize: 1, maxSize: 10, defaultSize: 5, notation: "prefix" };
const LL: InputConstraints = { kind: "linked-list", minSize: 1, maxSize: 10, defaultSize: 5, listVariant: "singly" };
const LL_PAIR: InputConstraints = { kind: "linked-list-pair", minSize: 1, maxSize: 10, defaultSize: 5 };

describe("parseCustomInput: array", () => {
  it("parses a plain comma-separated array", () => {
    const result = parseCustomInput("5, 3, 9, 1", ARRAY);
    expect(result).toEqual({ ok: true, input: { kind: "array", values: [5, 3, 9, 1] } });
  });

  it("sorts when the plugin requires sorted input", () => {
    const result = parseCustomInput("5, 3, 9, 1", SORTED_ARRAY);
    expect(result.ok && result.input.kind === "array" && result.input.values).toEqual([1, 3, 5, 9]);
  });

  it("rejects non-numeric tokens", () => {
    const result = parseCustomInput("5, foo, 3", ARRAY);
    expect(result.ok).toBe(false);
  });

  it("rejects a count outside min/maxSize", () => {
    const tooMany = Array.from({ length: 11 }, (_, i) => i).join(",");
    const result = parseCustomInput(tooMany, ARRAY);
    expect(result).toEqual({ ok: false, error: expect.stringContaining("between 1 and 10") });
  });
});

describe("parseCustomInput: stack", () => {
  it("parses pushes and operations", () => {
    const result = parseCustomInput("5, 3, pop, peek, isEmpty, isFull", STACK);
    expect(result.ok).toBe(true);
    expect(result.ok && result.input).toEqual({
      kind: "stack",
      operations: [
        { type: "push", value: 5 },
        { type: "push", value: 3 },
        { type: "pop" },
        { type: "peek" },
        { type: "isEmpty" },
        { type: "isFull" },
      ],
    });
  });

  it("rejects pop against an empty stack", () => {
    const result = parseCustomInput("pop", STACK);
    expect(result).toEqual({ ok: false, error: expect.stringContaining("empty stack") });
  });

  it("rejects an unrecognized token", () => {
    const result = parseCustomInput("5, bogus", STACK);
    expect(result.ok).toBe(false);
  });
});

describe("parseCustomInput: queue / circular-queue", () => {
  it("parses enqueues and operations for a plain queue", () => {
    const result = parseCustomInput("1, 2, dequeue, peek", QUEUE);
    expect(result.ok && result.input).toEqual({
      kind: "queue",
      operations: [
        { type: "enqueue", value: 1 },
        { type: "enqueue", value: 2 },
        { type: "dequeue" },
        { type: "peek" },
      ],
    });
  });

  it("rejects dequeue against an empty queue", () => {
    const result = parseCustomInput("dequeue", QUEUE);
    expect(result).toEqual({ ok: false, error: expect.stringContaining("empty queue") });
  });

  it("sets circular-queue capacity to the enqueue count", () => {
    const result = parseCustomInput("1, 2, 3, dequeue, 4", CIRCULAR_QUEUE);
    expect(result.ok && result.input.kind === "circular-queue" && result.input.capacity).toBe(4);
  });
});

describe("parseCustomInput: expression", () => {
  it("accepts a valid postfix expression", () => {
    const result = parseCustomInput("2 3 + 4 *", POSTFIX);
    expect(result).toEqual({ ok: true, input: { kind: "expression", tokens: ["2", "3", "+", "4", "*"], notation: "postfix" } });
  });

  it("accepts a valid prefix expression", () => {
    const result = parseCustomInput("* + 2 3 4", PREFIX);
    expect(result.ok).toBe(true);
  });

  it("rejects a postfix expression with too few operands", () => {
    const result = parseCustomInput("2 + +", POSTFIX);
    expect(result.ok).toBe(false);
  });

  it("rejects a postfix expression that doesn't reduce to one result", () => {
    const result = parseCustomInput("2 3", POSTFIX);
    expect(result).toEqual({ ok: false, error: expect.stringContaining("single result") });
  });

  it("rejects an unsupported operator", () => {
    const result = parseCustomInput("2 3 /", POSTFIX);
    expect(result.ok).toBe(false);
  });
});

describe("parseCustomInput: linked-list", () => {
  it("parses a full operation script", () => {
    const result = parseCustomInput("insertHead 5, insertTail 3, delete 5, search 3, traverse, reverse", LL);
    expect(result.ok && result.input).toEqual({
      kind: "linked-list",
      variant: "singly",
      operations: [
        { type: "insertHead", value: 5 },
        { type: "insertTail", value: 3 },
        { type: "deleteValue", value: 5 },
        { type: "search", value: 3 },
        { type: "traverse" },
        { type: "reverse" },
      ],
    });
  });

  it("rejects a keyword missing its numeric argument", () => {
    const result = parseCustomInput("insertHead", LL);
    expect(result.ok).toBe(false);
  });

  it("rejects an unrecognized keyword", () => {
    const result = parseCustomInput("bogus 5", LL);
    expect(result.ok).toBe(false);
  });
});

describe("parseCustomInput: linked-list-pair", () => {
  it("parses two semicolon-separated lists", () => {
    const result = parseCustomInput("1,3,5;2,4,6", LL_PAIR);
    expect(result).toEqual({ ok: true, input: { kind: "linked-list-pair", listA: [1, 3, 5], listB: [2, 4, 6] } });
  });

  it("sorts both lists when required", () => {
    const result = parseCustomInput("5,1,3;6,2,4", { ...LL_PAIR, sorted: true });
    expect(result.ok && result.input.kind === "linked-list-pair" && result.input).toEqual({
      kind: "linked-list-pair",
      listA: [1, 3, 5],
      listB: [2, 4, 6],
    });
  });

  it("rejects input without exactly one semicolon", () => {
    expect(parseCustomInput("1,2,3", LL_PAIR).ok).toBe(false);
    expect(parseCustomInput("1,2;3,4;5,6", LL_PAIR).ok).toBe(false);
  });
});

describe("sizeOfInput", () => {
  it("reads the right field per kind", () => {
    expect(sizeOfInput({ kind: "array", values: [1, 2, 3] })).toBe(3);
    expect(sizeOfInput({ kind: "stack", operations: [{ type: "push", value: 1 }] })).toBe(1);
    expect(sizeOfInput({ kind: "linked-list-pair", listA: [1, 2], listB: [1, 2, 3] })).toBe(3);
  });
});
