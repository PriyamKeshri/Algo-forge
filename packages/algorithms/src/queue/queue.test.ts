import { describe, expect, it } from "vitest";
import { createInstrumentedCircularQueue, createInstrumentedQueue, ExecutionEngine, type RunResult } from "@algoviz/engine";
import type { CircularQueueSnapshot, QueueInput, QueueOperation, QueueSnapshot } from "@algoviz/core";
import { queueOperationsPlugin } from "./queue-operations";
import { dequeOperationsPlugin } from "./deque-operations";
import { circularQueueOperationsPlugin } from "./circular-queue-operations";
import { generateQueueOperations } from "../generate-input";
import type { AlgorithmPlugin } from "../registry";

// A sourceLine-tagged line should always be part of an instrumented
// operation. See ../sorting/sorting.test.ts for the full rationale — this
// is the queue-plugin equivalent of that drift detector.
const OPERATION_MARKERS = ["yield", ".enqueue(", ".dequeue(", ".peek(", ".checkEmpty(", ".checkFull("];

function runQueuePlugin(plugin: AlgorithmPlugin<QueueInput, unknown>, input: QueueInput): RunResult {
  const ctx = createInstrumentedQueue(input.capacity);
  return new ExecutionEngine().run(plugin.run(input, ctx), ctx);
}

function runCircularQueuePlugin(plugin: AlgorithmPlugin<QueueInput, unknown>, input: QueueInput): RunResult {
  const ctx = createInstrumentedCircularQueue(input.capacity!);
  return new ExecutionEngine().run(plugin.run(input, ctx), ctx);
}

function assertDriftFree(result: RunResult, plugin: AlgorithmPlugin): void {
  const validLines = new Set(plugin.metadata.pseudocode.map((p) => p.line));
  const sourceLines = plugin.metadata.sourceCode.code.split("\n");

  expect(result.events.length).toBeGreaterThan(0);
  let previousStep = -1;
  for (const event of result.events) {
    expect(event.step).toBeGreaterThan(previousStep);
    previousStep = event.step;
    if (event.line !== undefined) expect(validLines.has(event.line)).toBe(true);
    if (event.sourceLine === undefined) continue;
    expect(event.sourceLine).toBeGreaterThanOrEqual(1);
    expect(event.sourceLine).toBeLessThanOrEqual(sourceLines.length);
    const lineText = sourceLines[event.sourceLine - 1]!;
    expect(OPERATION_MARKERS.some((marker) => lineText.includes(marker))).toBe(true);
  }
  expect(result.events.some((e) => e.sourceLine !== undefined)).toBe(true);
}

describe("Queue Operations", () => {
  it("runs a hand-built sequence, producing the expected FIFO final state", () => {
    const operations: QueueOperation[] = [
      { type: "enqueue", value: 1 },
      { type: "enqueue", value: 2 },
      { type: "peek" },
      { type: "enqueue", value: 3 },
      { type: "dequeue" },
      { type: "isEmpty" },
    ];
    const input: QueueInput = { kind: "queue", operations };
    const result = runQueuePlugin(queueOperationsPlugin, input);

    expect(result.completed).toBe(true);
    expect((result.finalSnapshot as QueueSnapshot).values).toEqual([2, 3]);
    // Every operation yields exactly one event — enqueue/dequeue/peek/isEmpty/isFull are all one-shot.
    expect(result.events).toHaveLength(operations.length);
  });

  it("respects capacity: a generated sequence never overflows or throws", () => {
    const input = generateQueueOperations(60, "queue", { capacity: 5, seed: 1 });
    const result = runQueuePlugin(queueOperationsPlugin, input);

    expect(result.completed).toBe(true);
    expect((result.finalSnapshot as QueueSnapshot).values.length).toBeLessThanOrEqual(5);
  });

  it("an unbounded generated sequence never dequeues/peeks an empty queue", () => {
    const input = generateQueueOperations(200, "queue", { seed: 7 });
    expect(() => runQueuePlugin(queueOperationsPlugin, input)).not.toThrow();
  });

  it("is drift-free and stats-consistent", () => {
    const input = generateQueueOperations(40, "queue", { capacity: 10, seed: 3 });
    const result = runQueuePlugin(queueOperationsPlugin, input);
    assertDriftFree(result, queueOperationsPlugin);

    const enqueues = input.operations.filter((op) => op.type === "enqueue").length;
    const dequeues = input.operations.filter((op) => op.type === "dequeue").length;
    const checks = input.operations.filter(
      (op) => op.type === "peek" || op.type === "isEmpty" || op.type === "isFull",
    ).length;
    expect(result.stats.writes).toBe(enqueues + dequeues);
    expect(result.stats.reads).toBe(checks);
  });
});

describe("Deque Operations", () => {
  it("runs a hand-built sequence touching both ends, producing the expected final state", () => {
    const operations: QueueOperation[] = [
      { type: "enqueue", value: 1 }, // rear (default): [1]
      { type: "enqueue", value: 2, end: "front" }, // [2, 1]
      { type: "enqueue", value: 3, end: "rear" }, // [2, 1, 3]
      { type: "dequeue", end: "rear" }, // removes 3 -> [2, 1]
      { type: "peek", end: "front" },
    ];
    const input: QueueInput = { kind: "queue", operations };
    const result = runQueuePlugin(dequeOperationsPlugin, input);

    expect(result.completed).toBe(true);
    expect((result.finalSnapshot as QueueSnapshot).values).toEqual([2, 1]);
  });

  it("respects capacity and never overflows a generated sequence that uses both ends", () => {
    const input = generateQueueOperations(60, "queue", { capacity: 5, allowDeque: true, seed: 2 });
    const result = runQueuePlugin(dequeOperationsPlugin, input);

    expect(result.completed).toBe(true);
    expect((result.finalSnapshot as QueueSnapshot).values.length).toBeLessThanOrEqual(5);
    // Confirm this generated run actually exercised both ends, not just the FIFO default.
    expect(input.operations.some((op) => "end" in op && op.end === "front")).toBe(true);
    expect(input.operations.some((op) => "end" in op && op.end === "rear")).toBe(true);
  });

  it("is drift-free", () => {
    const input = generateQueueOperations(40, "queue", { capacity: 10, allowDeque: true, seed: 5 });
    const result = runQueuePlugin(dequeOperationsPlugin, input);
    assertDriftFree(result, dequeOperationsPlugin);
  });
});

describe("Circular Queue Operations", () => {
  it("runs a hand-built sequence that wraps around, reusing freed slots without throwing", () => {
    const operations: QueueOperation[] = [
      { type: "enqueue", value: 1 },
      { type: "enqueue", value: 2 },
      { type: "enqueue", value: 3 }, // full at capacity 3
      { type: "dequeue" }, // removes 1
      { type: "dequeue" }, // removes 2
      { type: "enqueue", value: 4 }, // wraps to index 0
      { type: "enqueue", value: 5 }, // wraps to index 1
    ];
    const input: QueueInput = { kind: "circular-queue", operations, capacity: 3 };
    const result = runCircularQueuePlugin(circularQueueOperationsPlugin, input);

    expect(result.completed).toBe(true);
    const snap = result.finalSnapshot as CircularQueueSnapshot;
    expect(snap.slots).toEqual([4, 5, 3]);
    expect(snap.size).toBe(3);
  });

  it("a generated sequence with a tight capacity forces wraparound and never throws", () => {
    const input = generateQueueOperations(60, "circular-queue", { capacity: 4, seed: 11 });
    let result: RunResult | undefined;
    expect(() => {
      result = runCircularQueuePlugin(circularQueueOperationsPlugin, input);
    }).not.toThrow();

    const enqueues = input.operations.filter((op) => op.type === "enqueue").length;
    // More enqueues than the capacity is only possible if slots got reused via wraparound.
    expect(enqueues).toBeGreaterThan(4);
    expect(result?.completed).toBe(true);
  });

  it("is drift-free and stats-consistent", () => {
    const input = generateQueueOperations(40, "circular-queue", { capacity: 6, seed: 13 });
    const result = runCircularQueuePlugin(circularQueueOperationsPlugin, input);
    assertDriftFree(result, circularQueueOperationsPlugin);

    const enqueues = input.operations.filter((op) => op.type === "enqueue").length;
    const dequeues = input.operations.filter((op) => op.type === "dequeue").length;
    const checks = input.operations.filter(
      (op) => op.type === "peek" || op.type === "isEmpty" || op.type === "isFull",
    ).length;
    expect(result.stats.writes).toBe(enqueues + dequeues);
    expect(result.stats.reads).toBe(checks);
  });
});
