import { describe, expect, it } from "vitest";
import { nodeId, type ArraySnapshot, type LinkedListSnapshot, type SwapEvent } from "@algoviz/core";
import { describeEvent, describeStructure } from "./describe";

describe("describeEvent", () => {
  it("returns undefined for no event", () => {
    expect(describeEvent(null)).toBeUndefined();
  });

  it("describes a swap event with both indices", () => {
    const event: SwapEvent = { type: "swap", step: 0, indices: [1, 3] };
    expect(describeEvent(event)).toBe("Swapped array[1] and array[3].");
  });

  it("describes a compare-node event, phrasing the -1/0/1 result", () => {
    expect(describeEvent({ type: "compare-node", step: 0, nodeId: nodeId("n1"), value: 5, result: -1 })).toContain(
      "less than",
    );
    expect(describeEvent({ type: "compare-node", step: 0, nodeId: nodeId("n1"), value: 5, result: 1 })).toContain(
      "greater than",
    );
    expect(describeEvent({ type: "compare-node", step: 0, nodeId: nodeId("n1"), value: 5, result: 0 })).toContain(
      "equal",
    );
  });

  it("describes an ll-insert event, distinguishing new-head from mid-list insertion", () => {
    expect(describeEvent({ type: "ll-insert", step: 0, nodeId: nodeId("a"), value: 7 })).toContain("new head");
    expect(
      describeEvent({ type: "ll-insert", step: 0, nodeId: nodeId("a"), value: 7, afterId: nodeId("b") }),
    ).toContain("after node b");
  });
});

describe("describeStructure", () => {
  it("describes an array in order", () => {
    const snap: ArraySnapshot = { kind: "array", values: [3, 1, 2] };
    expect(describeStructure(snap)).toBe("Array: [3, 1, 2]");
  });

  it("describes a linked list head-to-tail, noting circular wraparound", () => {
    const a = nodeId("a");
    const b = nodeId("b");
    const snap: LinkedListSnapshot = {
      kind: "linked-list",
      variant: "circular",
      headId: a,
      nodes: {
        [a]: { id: a, value: 1, next: b },
        [b]: { id: b, value: 2, next: a },
      },
    };
    const result = describeStructure(snap);
    expect(result).toContain("[1, 2]");
    expect(result).toContain("wraps back to head");
  });

  it("truncates very long descriptions", () => {
    const values = Array.from({ length: 200 }, (_, i) => i);
    const snap: ArraySnapshot = { kind: "array", values };
    const result = describeStructure(snap);
    expect(result.length).toBeLessThanOrEqual(410);
    expect(result.endsWith("…")).toBe(true);
  });
});
