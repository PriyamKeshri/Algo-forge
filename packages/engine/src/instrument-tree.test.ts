import { describe, expect, it } from "vitest";
import { createInstrumentedTree } from "./instrument-tree";

describe("createInstrumentedTree", () => {
  it("starts empty: no root, no nodes", () => {
    const tree = createInstrumentedTree();
    expect(tree.rootId).toBeNull();
    expect(tree.nodeIds).toEqual([]);
  });

  it("insertNode() with no parent sets the root and generates a fresh id", () => {
    const tree = createInstrumentedTree();
    const event = tree.insertNode(5, undefined, undefined);
    expect(event).toMatchObject({ type: "insert-node", value: 5, parentId: undefined, side: undefined });
    expect(typeof event.nodeId).toBe("string");
    expect(tree.rootId).toBe(event.nodeId);
    expect(tree.valueOf(event.nodeId)).toBe(5);
  });

  it("insertNode() with a parent links via left/right and does not touch rootId", () => {
    const tree = createInstrumentedTree();
    const root = tree.insertNode(5, undefined, undefined);
    const left = tree.insertNode(2, root.nodeId, "left");
    const right = tree.insertNode(8, root.nodeId, "right");

    expect(tree.leftOf(root.nodeId)).toBe(left.nodeId);
    expect(tree.rightOf(root.nodeId)).toBe(right.nodeId);
    expect(tree.rootId).toBe(root.nodeId);
    expect(left.parentId).toBe(root.nodeId);
    expect(left.side).toBe("left");
  });

  it("each insertNode() call generates a distinct node id even for the same value", () => {
    const tree = createInstrumentedTree();
    const a = tree.insertNode(5, undefined, undefined);
    const b = tree.insertNode(5, a.nodeId, "left");
    expect(a.nodeId).not.toBe(b.nodeId);
  });

  it("compareNode() reports -1/0/1 without mutating", () => {
    const tree = createInstrumentedTree();
    const root = tree.insertNode(10, undefined, undefined);
    expect(tree.compareNode(root.nodeId, 5).result).toBe(-1);
    expect(tree.compareNode(root.nodeId, 15).result).toBe(1);
    expect(tree.compareNode(root.nodeId, 10).result).toBe(0);
    expect(tree.valueOf(root.nodeId)).toBe(10);
  });

  it("isVisited() starts false and flips true after visitNode()", () => {
    const tree = createInstrumentedTree();
    const root = tree.insertNode(10, undefined, undefined);
    expect(tree.isVisited(root.nodeId)).toBe(false);
    tree.visitNode(root.nodeId);
    expect(tree.isVisited(root.nodeId)).toBe(true);
  });

  it("leftOf()/rightOf() return undefined for a childless node", () => {
    const tree = createInstrumentedTree();
    const root = tree.insertNode(10, undefined, undefined);
    expect(tree.leftOf(root.nodeId)).toBeUndefined();
    expect(tree.rightOf(root.nodeId)).toBeUndefined();
  });

  it("throws RangeError for an unknown node id", () => {
    const tree = createInstrumentedTree();
    expect(() => tree.valueOf("nope" as never)).toThrow(RangeError);
    expect(() => tree.compareNode("nope" as never, 1)).toThrow(RangeError);
    expect(() => tree.insertNode(1, "nope" as never, "left")).toThrow(RangeError);
  });

  it("step numbers are monotonically increasing across mixed operations", () => {
    const tree = createInstrumentedTree();
    const root = tree.insertNode(5, undefined, undefined);
    const steps = [root.step, tree.compareNode(root.nodeId, 2).step, tree.visitNode(root.nodeId).step];
    expect(steps).toEqual([0, 1, 2]);
  });

  it("snapshot() reflects current structure and is an independent copy", () => {
    const tree = createInstrumentedTree();
    const root = tree.insertNode(5, undefined, undefined);
    const left = tree.insertNode(2, root.nodeId, "left");
    tree.visitNode(root.nodeId);

    const snap = tree.snapshot();
    expect(snap.kind).toBe("tree");
    expect(snap.rootId).toBe(root.nodeId);
    expect(snap.nodes[root.nodeId]).toMatchObject({ value: 5, left: left.nodeId, visited: true });
    expect(snap.nodes[root.nodeId]?.children).toEqual([left.nodeId]);
    expect(snap.nodes[left.nodeId]).toMatchObject({ value: 2, visited: false });

    tree.insertNode(8, root.nodeId, "right");
    expect(snap.nodes[root.nodeId]?.right).toBeUndefined(); // earlier snapshot unaffected
  });
});
