import { describe, expect, it } from "vitest";
import { edgeId, nodeId, type GraphInput } from "@algoviz/core";
import { addEdge, addNode, clearGraph, deleteEdge, deleteNode, moveNode, setStartNode } from "./graph-editor-logic";

const empty: GraphInput = { kind: "graph", nodes: [], edges: [], startNodeId: undefined };

describe("addNode", () => {
  it("adds a node at the given position with a generated id and label", () => {
    const result = addNode(empty, { x: 10, y: 20 });
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toMatchObject({ label: "A", position: { x: 10, y: 20 } });
    expect(typeof result.nodes[0]!.id).toBe("string");
  });

  it("does not mutate the input", () => {
    addNode(empty, { x: 0, y: 0 });
    expect(empty.nodes).toEqual([]);
  });

  it("auto-assigns the first node in an empty graph as the start node", () => {
    const result = addNode(empty, { x: 0, y: 0 });
    expect(result.startNodeId).toBe(result.nodes[0]!.id);
  });

  it("does not override an already-set start node", () => {
    const withOneNode = addNode(empty, { x: 0, y: 0 });
    const result = addNode(withOneNode, { x: 10, y: 10 });
    expect(result.startNodeId).toBe(withOneNode.startNodeId);
  });

  it("labels sequential nodes A, B, C, ...", () => {
    let g = empty;
    g = addNode(g, { x: 0, y: 0 });
    g = addNode(g, { x: 1, y: 1 });
    g = addNode(g, { x: 2, y: 2 });
    expect(g.nodes.map((n) => n.label)).toEqual(["A", "B", "C"]);
  });
});

describe("moveNode", () => {
  it("updates only the target node's position", () => {
    let g = addNode(empty, { x: 0, y: 0 });
    g = addNode(g, { x: 10, y: 10 });
    const [a, b] = g.nodes;
    const moved = moveNode(g, a!.id, { x: 99, y: 99 });
    expect(moved.nodes.find((n) => n.id === a!.id)?.position).toEqual({ x: 99, y: 99 });
    expect(moved.nodes.find((n) => n.id === b!.id)?.position).toEqual({ x: 10, y: 10 });
  });
});

describe("addEdge", () => {
  it("connects two distinct nodes", () => {
    let g = addNode(empty, { x: 0, y: 0 });
    g = addNode(g, { x: 1, y: 1 });
    const [a, b] = g.nodes;
    const result = addEdge(g, a!.id, b!.id);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toMatchObject({ source: a!.id, target: b!.id });
  });

  it("is a no-op for a self-loop", () => {
    const g = addNode(empty, { x: 0, y: 0 });
    const result = addEdge(g, g.nodes[0]!.id, g.nodes[0]!.id);
    expect(result.edges).toHaveLength(0);
  });

  it("is a no-op for a duplicate edge, regardless of argument order", () => {
    let g = addNode(empty, { x: 0, y: 0 });
    g = addNode(g, { x: 1, y: 1 });
    const [a, b] = g.nodes;
    g = addEdge(g, a!.id, b!.id);
    const again = addEdge(g, b!.id, a!.id);
    expect(again.edges).toHaveLength(1);
  });
});

describe("deleteNode", () => {
  it("removes the node and every edge touching it", () => {
    let g = addNode(empty, { x: 0, y: 0 });
    g = addNode(g, { x: 1, y: 1 });
    g = addNode(g, { x: 2, y: 2 });
    const [a, b, c] = g.nodes;
    g = addEdge(g, a!.id, b!.id);
    g = addEdge(g, b!.id, c!.id);

    const result = deleteNode(g, b!.id);
    expect(result.nodes.map((n) => n.id)).toEqual([a!.id, c!.id]);
    expect(result.edges).toHaveLength(0);
  });

  it("clears startNodeId if it pointed at the deleted node", () => {
    const g = addNode(empty, { x: 0, y: 0 }); // becomes start automatically
    const result = deleteNode(g, g.startNodeId!);
    expect(result.startNodeId).toBeUndefined();
  });

  it("leaves startNodeId untouched if a different node is deleted", () => {
    let g = addNode(empty, { x: 0, y: 0 });
    g = addNode(g, { x: 1, y: 1 });
    const start = g.startNodeId;
    const other = g.nodes.find((n) => n.id !== start)!;
    const result = deleteNode(g, other.id);
    expect(result.startNodeId).toBe(start);
  });
});

describe("deleteEdge", () => {
  it("removes only the targeted edge", () => {
    let g = addNode(empty, { x: 0, y: 0 });
    g = addNode(g, { x: 1, y: 1 });
    g = addNode(g, { x: 2, y: 2 });
    const [a, b, c] = g.nodes;
    g = addEdge(g, a!.id, b!.id);
    g = addEdge(g, b!.id, c!.id);
    const target = g.edges[0]!.id;

    const result = deleteEdge(g, target);
    expect(result.edges).toHaveLength(1);
    expect(result.edges.find((e) => e.id === target)).toBeUndefined();
  });

  it("is a no-op for an unknown edge id", () => {
    const g = addNode(empty, { x: 0, y: 0 });
    const result = deleteEdge(g, edgeId("nope"));
    expect(result.edges).toEqual(g.edges);
  });
});

describe("setStartNode", () => {
  it("sets startNodeId to the given node", () => {
    let g = addNode(empty, { x: 0, y: 0 });
    g = addNode(g, { x: 1, y: 1 });
    const second = g.nodes[1]!.id;
    const result = setStartNode(g, second);
    expect(result.startNodeId).toBe(second);
  });

  it("can target a node id even if it doesn't (yet) exist — pure function, no validation", () => {
    const result = setStartNode(empty, nodeId("phantom"));
    expect(result.startNodeId).toBe("phantom");
  });
});

describe("clearGraph", () => {
  it("returns an empty graph with no start node", () => {
    expect(clearGraph()).toEqual({ kind: "graph", nodes: [], edges: [], startNodeId: undefined });
  });
});
