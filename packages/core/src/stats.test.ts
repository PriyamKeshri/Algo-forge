import { describe, expect, it } from "vitest";
import { deriveStats, statsAtStep, EMPTY_STATS } from "./stats";
import { nodeId } from "./ids";
import type { VisualizationEvent } from "./events";

const events: VisualizationEvent[] = [
  { type: "compare", step: 0, indices: [0, 1], result: 1 },
  { type: "swap", step: 1, indices: [0, 1] },
  { type: "read", step: 2, index: 0, value: 3 },
  { type: "compare", step: 3, indices: [1, 2], result: -1 },
  { type: "set", step: 4, index: 2, value: 9 },
  { type: "highlight", step: 5, indices: [2] },
];

describe("deriveStats", () => {
  it("returns zeroed stats for an empty event stream", () => {
    expect(deriveStats([])).toEqual(EMPTY_STATS);
  });

  it("counts comparisons, swaps, reads, and writes, ignoring non-counted events", () => {
    expect(deriveStats(events)).toEqual({ comparisons: 2, swaps: 1, reads: 1, writes: 1 });
  });

  it("counts tree events: compare-node as a comparison, insert-node as a write", () => {
    const treeEvents: VisualizationEvent[] = [
      { type: "compare-node", step: 0, nodeId: nodeId("a"), value: 5, result: -1 },
      { type: "insert-node", step: 1, nodeId: nodeId("b"), value: 5, parentId: nodeId("a"), side: "left" },
      { type: "visit-node", step: 2, nodeId: nodeId("a") }, // uncounted, same as graph traversal
    ];
    expect(deriveStats(treeEvents)).toEqual({ comparisons: 1, swaps: 0, reads: 0, writes: 1 });
  });

  it("counts compare-value (array search's counterpart to compare-node) as a comparison", () => {
    const searchEvents: VisualizationEvent[] = [
      { type: "compare-value", step: 0, index: 2, target: 7, result: -1 },
      { type: "compare-value", step: 1, index: 4, target: 7, result: 0 },
    ];
    expect(deriveStats(searchEvents)).toEqual({ comparisons: 2, swaps: 0, reads: 0, writes: 0 });
  });

  it("counts stack events: push/pop as writes, stack-check as a read", () => {
    const stackEvents: VisualizationEvent[] = [
      { type: "push", step: 0, value: 5 },
      { type: "pop", step: 1, value: 5 },
      { type: "stack-check", step: 2, check: "isEmpty", result: true },
    ];
    expect(deriveStats(stackEvents)).toEqual({ comparisons: 0, swaps: 0, reads: 1, writes: 2 });
  });

  it("counts queue events: enqueue/dequeue as writes, queue-check as a read", () => {
    const queueEvents: VisualizationEvent[] = [
      { type: "enqueue", step: 0, value: 5 },
      { type: "enqueue", step: 1, value: 6, end: "front" },
      { type: "dequeue", step: 2, value: 5 },
      { type: "queue-check", step: 3, check: "isFull", result: false },
    ];
    expect(deriveStats(queueEvents)).toEqual({ comparisons: 0, swaps: 0, reads: 1, writes: 3 });
  });
});

describe("statsAtStep", () => {
  it("returns zeroed stats before the first step", () => {
    expect(statsAtStep(events, -1)).toEqual(EMPTY_STATS);
  });

  it("accumulates only events up to and including the given step", () => {
    expect(statsAtStep(events, 1)).toEqual({ comparisons: 1, swaps: 1, reads: 0, writes: 0 });
    expect(statsAtStep(events, 3)).toEqual({ comparisons: 2, swaps: 1, reads: 1, writes: 0 });
  });

  it("matches deriveStats when the step covers the whole stream", () => {
    expect(statsAtStep(events, 5)).toEqual(deriveStats(events));
  });
});
