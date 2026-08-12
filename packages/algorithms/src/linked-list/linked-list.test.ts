import { describe, expect, it } from "vitest";
import { createInstrumentedLinkedList, ExecutionEngine, type RunResult } from "@algoviz/engine";
import type { LinkedListInput, LinkedListOperation, LinkedListPairInput, LinkedListSnapshot } from "@algoviz/core";
import { singlyLinkedListOperationsPlugin } from "./singly-linked-list-operations";
import { doublyLinkedListOperationsPlugin } from "./doubly-linked-list-operations";
import { circularLinkedListOperationsPlugin } from "./circular-linked-list-operations";
import { linkedListMergePlugin } from "./linked-list-merge";
import { linkedListComparisonPlugin } from "./linked-list-comparison";
import { generateLinkedListOperations, generateLinkedListPair } from "../generate-input";
import type { LinkedListPairPlugin, LinkedListPlugin } from "../registry";

// A sourceLine-tagged line should always be part of an instrumented
// operation. See ../sorting/sorting.test.ts for the full rationale.
const OPERATION_MARKERS = [
  "yield",
  ".insertHead(",
  ".insertTail(",
  ".compare(",
  ".deleteNode(",
  ".visit(",
  ".reverse(",
];

function runListPlugin(plugin: LinkedListPlugin, input: LinkedListInput): RunResult {
  const ctx = createInstrumentedLinkedList(input.variant);
  return new ExecutionEngine().run(plugin.run(input, ctx), ctx);
}

function runPairPlugin(plugin: LinkedListPairPlugin, input: LinkedListPairInput): RunResult {
  const ctx = createInstrumentedLinkedList("singly");
  return new ExecutionEngine().run(plugin.run(input, ctx), ctx);
}

function assertDriftFree(result: RunResult, metadata: { pseudocode: { line: number }[]; sourceCode: { code: string } }): void {
  const validLines = new Set(metadata.pseudocode.map((p) => p.line));
  const sourceLines = metadata.sourceCode.code.split("\n");

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

describe.each([
  { name: "Singly Linked List Operations", plugin: singlyLinkedListOperationsPlugin, variant: "singly" as const },
  { name: "Doubly Linked List Operations", plugin: doublyLinkedListOperationsPlugin, variant: "doubly" as const },
  { name: "Circular Linked List Operations", plugin: circularLinkedListOperationsPlugin, variant: "circular" as const },
])("$name", ({ plugin, variant }) => {
  it("runs a hand-built sequence, producing the expected final state", () => {
    const operations: LinkedListOperation[] = [
      { type: "insertTail", value: 1 },
      { type: "insertTail", value: 2 },
      { type: "insertHead", value: 0 },
      { type: "search", value: 2 },
      { type: "deleteValue", value: 1 },
      { type: "traverse" },
      { type: "reverse" },
    ];
    const input: LinkedListInput = { kind: "linked-list", variant, operations };
    const result = runListPlugin(plugin, input);

    expect(result.completed).toBe(true);
    const snap = result.finalSnapshot as LinkedListSnapshot;
    const values: number[] = [];
    let cur = snap.headId;
    for (let i = 0; i < Object.keys(snap.nodes).length && cur !== null; i++) {
      values.push(snap.nodes[cur]!.value);
      cur = snap.nodes[cur]!.next ?? null;
    }
    // [0, 2] reversed -> [2, 0]
    expect(values).toEqual([2, 0]);
  });

  it("generated sequences across many seeds/sizes never throw (deleteValue/search always target a present value, and traversal bounds by size rather than looping forever on a circular list)", () => {
    for (let seed = 0; seed < 30; seed++) {
      for (const size of [1, 5, 20, 80]) {
        const input = generateLinkedListOperations(size, variant, { seed });
        expect(() => runListPlugin(plugin, input)).not.toThrow();
      }
    }
  });

  it("is drift-free and stats-consistent", () => {
    const input = generateLinkedListOperations(40, variant, { seed: 9 });
    const result = runListPlugin(plugin, input);
    assertDriftFree(result, plugin.metadata);

    const inserts = input.operations.filter((op) => op.type === "insertHead" || op.type === "insertTail").length;
    expect(result.stats.writes).toBeGreaterThanOrEqual(inserts);
  });
});

describe("Linked List Merge", () => {
  it("merges two sorted lists into one sorted list", () => {
    const input: LinkedListPairInput = { kind: "linked-list-pair", listA: [1, 3, 5], listB: [2, 4, 6, 8] };
    const result = runPairPlugin(linkedListMergePlugin, input);
    const snap = result.finalSnapshot as LinkedListSnapshot;

    const values: number[] = [];
    let cur = snap.headId;
    while (cur !== null) {
      values.push(snap.nodes[cur]!.value);
      cur = snap.nodes[cur]!.next ?? null;
    }
    expect(values).toEqual([1, 2, 3, 4, 5, 6, 8]);
  });

  it("is drift-free", () => {
    const input = generateLinkedListPair(10, 12, { seed: 2, sorted: true });
    const result = runPairPlugin(linkedListMergePlugin, input);
    assertDriftFree(result, linkedListMergePlugin.metadata);
  });
});

describe("Linked List Comparison", () => {
  it("compares equal lists to a run of compare-node result 0", () => {
    const input: LinkedListPairInput = { kind: "linked-list-pair", listA: [1, 2, 3], listB: [1, 2, 3] };
    const result = runPairPlugin(linkedListComparisonPlugin, input);
    const compares = result.events.filter((e) => e.type === "compare-node");
    expect(compares.every((e) => e.type === "compare-node" && e.result === 0)).toBe(true);
  });

  it("flags a mismatch via a non-zero compare result", () => {
    const input: LinkedListPairInput = { kind: "linked-list-pair", listA: [1, 2, 3], listB: [1, 9, 3] };
    const result = runPairPlugin(linkedListComparisonPlugin, input);
    const compares = result.events.filter((e) => e.type === "compare-node");
    expect(compares.some((e) => e.type === "compare-node" && e.result !== 0)).toBe(true);
  });

  it("is drift-free", () => {
    const input = generateLinkedListPair(10, 10, { seed: 6 });
    const result = runPairPlugin(linkedListComparisonPlugin, input);
    assertDriftFree(result, linkedListComparisonPlugin.metadata);
  });
});
