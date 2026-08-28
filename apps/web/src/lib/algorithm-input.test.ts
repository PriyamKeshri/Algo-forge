import { describe, expect, it } from "vitest";
import type {
  AlgorithmInput,
  ArrayInput,
  InputConstraints,
  LinkedListInput,
  LinkedListPairInput,
  QueueInput,
  StackInput,
} from "@algoviz/core";
import type { AlgorithmPlugin } from "@algoviz/algorithms";
import { emptyStructureFor, generateInputFor } from "./algorithm-input";

function plugin(category: string): AlgorithmPlugin {
  return { metadata: { category } } as unknown as AlgorithmPlugin;
}

describe("generateInputFor", () => {
  it("generates a graph input with the requested node count", () => {
    const constraints: InputConstraints = { kind: "graph", minSize: 3, maxSize: 20, defaultSize: 6 };
    const input = generateInputFor(constraints, 6);
    expect(input.kind).toBe("graph");
    if (input.kind === "graph") {
      expect(input.nodes).toHaveLength(6);
    }
  });

  it("scales stack capacity to 80% of the operation count (min 1)", () => {
    const constraints: InputConstraints = { kind: "stack", minSize: 1, maxSize: 50, defaultSize: 10 };
    const input = generateInputFor(constraints, 10) as StackInput;
    expect(input.kind).toBe("stack");
    expect(input.capacity).toBe(8); // ceil(10 * 0.8)
    expect(input.operations).toHaveLength(10);

    const tiny = generateInputFor(constraints, 1) as StackInput;
    expect(tiny.capacity).toBe(1); // never below 1, even for a tiny size
  });

  it("generates an expression input honoring the requested notation", () => {
    const constraints: InputConstraints = {
      kind: "expression",
      minSize: 2,
      maxSize: 10,
      defaultSize: 4,
      notation: "prefix",
    };
    const input = generateInputFor(constraints, 4);
    expect(input.kind).toBe("expression");
    if (input.kind === "expression") {
      expect(input.notation).toBe("prefix");
    }
  });

  it("scales a plain queue's capacity to 80% of the operation count", () => {
    const constraints: InputConstraints = { kind: "queue", minSize: 1, maxSize: 50, defaultSize: 10 };
    const input = generateInputFor(constraints, 10) as QueueInput;
    expect(input.kind).toBe("queue");
    expect(input.capacity).toBe(8);
  });

  it("scales a circular queue's capacity tighter (size / 3) to force wraparound", () => {
    const constraints: InputConstraints = { kind: "circular-queue", minSize: 1, maxSize: 50, defaultSize: 9 };
    const input = generateInputFor(constraints, 9) as QueueInput;
    expect(input.kind).toBe("circular-queue");
    expect(input.capacity).toBe(3); // ceil(9 / 3)
  });

  it("defaults a linked-list input to the singly variant when none is specified", () => {
    const constraints: InputConstraints = { kind: "linked-list", minSize: 1, maxSize: 30, defaultSize: 5 };
    const input = generateInputFor(constraints, 5) as LinkedListInput;
    expect(input.kind).toBe("linked-list");
    expect(input.variant).toBe("singly");
  });

  it("honors an explicit linked-list variant", () => {
    const constraints: InputConstraints = {
      kind: "linked-list",
      minSize: 1,
      maxSize: 30,
      defaultSize: 5,
      listVariant: "doubly",
    };
    const input = generateInputFor(constraints, 5) as LinkedListInput;
    expect(input.variant).toBe("doubly");
  });

  it("generates a linked-list-pair input with two equal-length lists", () => {
    const constraints: InputConstraints = { kind: "linked-list-pair", minSize: 1, maxSize: 20, defaultSize: 5 };
    const input = generateInputFor(constraints, 5) as LinkedListPairInput;
    expect(input.kind).toBe("linked-list-pair");
    expect(input.listA).toHaveLength(5);
    expect(input.listB).toHaveLength(5);
  });

  it("falls back to a plain (unsorted) array when constraints are undefined", () => {
    const input = generateInputFor(undefined, 15) as ArrayInput;
    expect(input.kind).toBe("array");
    expect(input.values).toHaveLength(15);
    expect(input.target).toBeUndefined();
  });

  it("generates a pre-sorted array when constraints.sorted is set", () => {
    const constraints: InputConstraints = { kind: "array", minSize: 1, maxSize: 50, defaultSize: 20, sorted: true };
    const input = generateInputFor(constraints, 20) as ArrayInput;
    const sortedCopy = [...input.values].sort((a, b) => a - b);
    expect(input.values).toEqual(sortedCopy);
  });

  it("attaches a target value within range when constraints.needsTarget is set", () => {
    const constraints: InputConstraints = {
      kind: "array",
      minSize: 1,
      maxSize: 50,
      defaultSize: 20,
      needsTarget: true,
      valueRange: [1, 100],
    };
    const input = generateInputFor(constraints, 20) as ArrayInput;
    expect(input.target).toBeDefined();
    expect(input.target as number).toBeGreaterThanOrEqual(1);
    expect(input.target as number).toBeLessThanOrEqual(100);
  });
});

describe("emptyStructureFor", () => {
  const arrayInput: ArrayInput = { kind: "array", values: [1, 2, 3] };

  it("returns an empty tree snapshot for the tree category, regardless of input kind", () => {
    const snapshot = emptyStructureFor(plugin("tree"), arrayInput);
    expect(snapshot).toEqual({ kind: "tree", nodes: {}, rootId: null });
  });

  it("returns an empty stack snapshot carrying the input's capacity", () => {
    const stackInput: StackInput = { kind: "stack", operations: [], capacity: 12 };
    const snapshot = emptyStructureFor(plugin("stack"), stackInput);
    expect(snapshot).toEqual({ kind: "stack", values: [], capacity: 12 });
  });

  it("omits capacity for a stack category when the input itself isn't a StackInput", () => {
    const snapshot = emptyStructureFor(plugin("stack"), arrayInput);
    expect(snapshot).toEqual({ kind: "stack", values: [], capacity: undefined });
  });

  it("returns an empty plain-queue snapshot carrying the input's capacity", () => {
    const queueInput: QueueInput = { kind: "queue", operations: [], capacity: 7 };
    const snapshot = emptyStructureFor(plugin("queue"), queueInput);
    expect(snapshot).toEqual({ kind: "queue", values: [], capacity: 7 });
  });

  it("returns a fully-initialized empty circular-queue snapshot sized to capacity", () => {
    const circularInput: QueueInput = { kind: "circular-queue", operations: [], capacity: 4 };
    const snapshot = emptyStructureFor(plugin("queue"), circularInput);
    expect(snapshot).toEqual({
      kind: "circular-queue",
      slots: [null, null, null, null],
      front: 0,
      rear: 0,
      size: 0,
      capacity: 4,
    });
  });

  it("returns an empty linked-list snapshot carrying the input's variant", () => {
    const listInput: LinkedListInput = { kind: "linked-list", variant: "circular", operations: [] };
    const snapshot = emptyStructureFor(plugin("linked-list"), listInput);
    expect(snapshot).toEqual({ kind: "linked-list", variant: "circular", nodes: {}, headId: null });
  });

  it("defaults linked-list variant to singly for a linked-list-pair input (no variant field)", () => {
    const pairInput: LinkedListPairInput = { kind: "linked-list-pair", listA: [1], listB: [2] };
    const snapshot = emptyStructureFor(plugin("linked-list"), pairInput);
    expect(snapshot).toEqual({ kind: "linked-list", variant: "singly", nodes: {}, headId: null });
  });

  it("passes a graph input straight through when there's no matching category branch", () => {
    const graphInput: AlgorithmInput = { kind: "graph", nodes: [], edges: [] };
    const snapshot = emptyStructureFor(plugin("dynamic-programming"), graphInput);
    expect(snapshot).toEqual({ kind: "graph", nodes: [], edges: [] });
  });

  it("falls back to an empty array snapshot for a plain array input outside any special category", () => {
    const snapshot = emptyStructureFor(plugin("sorting"), arrayInput);
    expect(snapshot).toEqual({ kind: "array", values: arrayInput.values });
  });

  it("handles an undefined plugin the same way as a non-special category", () => {
    const snapshot = emptyStructureFor(undefined, arrayInput);
    expect(snapshot).toEqual({ kind: "array", values: arrayInput.values });
  });
});
