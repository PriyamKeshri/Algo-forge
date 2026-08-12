import { describe, expect, it } from "vitest";
import { createInstrumentedTree, ExecutionEngine } from "@algoviz/engine";
import type { ArrayInput, NodeId, TreeSnapshot, VisitNodeEvent } from "@algoviz/core";
import { bstInsertPlugin } from "./bst-insert";
import { inorderTraversalPlugin } from "./inorder-traversal";
import type { TreePlugin } from "../registry";

const plugins: Array<{ name: string; plugin: TreePlugin }> = [
  { name: "BST Insert", plugin: bstInsertPlugin },
  { name: "Inorder Traversal", plugin: inorderTraversalPlugin },
];

// A sourceLine-tagged line should always be part of an instrumented
// operation. See ../sorting/sorting.test.ts for the full rationale — this
// is the tree-plugin equivalent of that drift detector.
const OPERATION_MARKERS = ["yield", ".insertNode(", ".compareNode(", ".visitNode("];

const cases: Array<{ name: string; values: number[] }> = [
  { name: "single value", values: [42] },
  { name: "already sorted (degenerate, right-leaning)", values: [1, 2, 3, 4, 5] },
  { name: "reverse sorted (degenerate, left-leaning)", values: [5, 4, 3, 2, 1] },
  { name: "duplicates", values: [5, 3, 5, 7, 3, 1] },
  { name: "random", values: [7, 2, 9, 4, 4, 1, 8, 3, 6, 0] },
];

function runPlugin(plugin: TreePlugin, values: number[]) {
  const input: ArrayInput = { kind: "array", values };
  const tree = createInstrumentedTree();
  const engine = new ExecutionEngine();
  return engine.run(plugin.run(input, tree), tree);
}

/** Inorder walk of the *structural* result (not events) — the ground truth for "is this a valid, complete BST." */
function collectInorderValues(nodes: TreeSnapshot<number>["nodes"], id: NodeId | undefined): number[] {
  if (id === undefined) return [];
  const node = nodes[id];
  if (!node) return [];
  return [...collectInorderValues(nodes, node.left), node.value, ...collectInorderValues(nodes, node.right)];
}

function isVisitNode(ev: { type: string }): ev is VisitNodeEvent {
  return ev.type === "visit-node";
}

describe.each(plugins)("$name", ({ plugin }) => {
  it.each(cases)("builds a valid BST containing the distinct input values ($name)", ({ values }) => {
    const result = runPlugin(plugin, values);
    expect(result.completed).toBe(true);

    const tree = result.finalSnapshot as TreeSnapshot<number>;
    const inorderValues = collectInorderValues(tree.nodes, tree.rootId ?? undefined);

    // A BST's inorder walk is always strictly ascending (duplicates are skipped, never inserted twice).
    for (let i = 1; i < inorderValues.length; i++) {
      expect(inorderValues[i]).toBeGreaterThan(inorderValues[i - 1]!);
    }
    expect(inorderValues).toEqual([...new Set(values)].sort((a, b) => a - b));
    expect(Object.keys(tree.nodes)).toHaveLength(new Set(values).size);
  });

  it("produces monotonically increasing event steps, each referencing a valid pseudocode line", () => {
    const values = [7, 2, 9, 4, 4, 1, 8, 3, 6, 0];
    const result = runPlugin(plugin, values);
    const validLines = new Set(plugin.metadata.pseudocode.map((p) => p.line));

    expect(result.events.length).toBeGreaterThan(0);
    let previousStep = -1;
    for (const event of result.events) {
      expect(event.step).toBeGreaterThan(previousStep);
      previousStep = event.step;
      if (event.line !== undefined) {
        expect(validLines.has(event.line)).toBe(true);
      }
    }
  });

  it("produces well-formed sourceLine references into the real source snippet", () => {
    const values = [7, 2, 9, 4, 4, 1, 8, 3, 6, 0];
    const result = runPlugin(plugin, values);
    const sourceLines = plugin.metadata.sourceCode.code.split("\n");

    expect(result.events.some((ev) => ev.sourceLine !== undefined)).toBe(true);
    for (const event of result.events) {
      if (event.sourceLine === undefined) continue;
      expect(event.sourceLine).toBeGreaterThanOrEqual(1);
      expect(event.sourceLine).toBeLessThanOrEqual(sourceLines.length);
      const lineText = sourceLines[event.sourceLine - 1]!;
      expect(OPERATION_MARKERS.some((marker) => lineText.includes(marker))).toBe(true);
    }
  });

  it("produces non-negative stats: compare-node counted as a comparison, insert-node as a write", () => {
    const values = [7, 2, 9, 4, 4, 1, 8, 3, 6, 0];
    const result = runPlugin(plugin, values);

    const compareCount = result.events.filter((e) => e.type === "compare-node").length;
    const insertCount = result.events.filter((e) => e.type === "insert-node").length;
    expect(result.stats.comparisons).toBe(compareCount);
    expect(result.stats.writes).toBe(insertCount);
  });
});

describe("Inorder Traversal specifically", () => {
  it("visits nodes in strictly ascending value order", () => {
    const values = [7, 2, 9, 4, 4, 1, 8, 3, 6, 0];
    const result = runPlugin(inorderTraversalPlugin, values);
    const tree = result.finalSnapshot as TreeSnapshot<number>;

    const visitedValues = result.events
      .filter(isVisitNode)
      .map((ev) => tree.nodes[ev.nodeId]?.value)
      .filter((v): v is number => v !== undefined);

    for (let i = 1; i < visitedValues.length; i++) {
      expect(visitedValues[i]).toBeGreaterThan(visitedValues[i - 1]!);
    }
    expect(visitedValues).toEqual([...new Set(values)].sort((a, b) => a - b));
  });

  it("visits every node exactly once", () => {
    const values = [7, 2, 9, 4, 4, 1, 8, 3, 6, 0];
    const result = runPlugin(inorderTraversalPlugin, values);
    const visitedIds = result.events.filter(isVisitNode).map((ev) => ev.nodeId);
    expect(new Set(visitedIds).size).toBe(visitedIds.length);
    expect(visitedIds).toHaveLength(new Set(values).size);
  });
});
