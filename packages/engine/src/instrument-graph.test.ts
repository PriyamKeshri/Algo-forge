import { describe, expect, it } from "vitest";
import { edgeId, nodeId, type GraphEdge, type GraphNode } from "@algoviz/core";
import { createInstrumentedGraph } from "./instrument-graph";

// A(0) - B(1) - C(2) - D(3), plus a cycle-forming A-C edge.
const nodes: GraphNode[] = [
  { id: nodeId("A") },
  { id: nodeId("B") },
  { id: nodeId("C") },
  { id: nodeId("D") },
];

const edges: GraphEdge[] = [
  { id: edgeId("AB"), source: nodeId("A"), target: nodeId("B") },
  { id: edgeId("BC"), source: nodeId("B"), target: nodeId("C") },
  { id: edgeId("CD"), source: nodeId("C"), target: nodeId("D") },
  { id: edgeId("AC"), source: nodeId("A"), target: nodeId("C") },
];

describe("createInstrumentedGraph", () => {
  it("does not mutate the input node/edge arrays", () => {
    const graph = createInstrumentedGraph(nodes, edges);
    graph.visitNode(nodeId("A"));
    expect(nodes[0]!.visited).toBeUndefined();
  });

  it("exposes all node ids", () => {
    const graph = createInstrumentedGraph(nodes, edges);
    expect(graph.nodeIds.sort()).toEqual(["A", "B", "C", "D"]);
  });

  it("neighbors() returns adjacent node ids for undirected edges (both directions)", () => {
    const graph = createInstrumentedGraph(nodes, edges);
    expect(graph.neighbors(nodeId("B")).sort()).toEqual(["A", "C"]);
    expect(graph.neighbors(nodeId("A")).sort()).toEqual(["B", "C"]);
  });

  it("neighbors() throws for an unknown node id", () => {
    const graph = createInstrumentedGraph(nodes, edges);
    expect(() => graph.neighbors(nodeId("nope"))).toThrow(RangeError);
  });

  it("findEdge() matches regardless of argument order", () => {
    const graph = createInstrumentedGraph(nodes, edges);
    expect(graph.findEdge(nodeId("A"), nodeId("B"))?.id).toBe("AB");
    expect(graph.findEdge(nodeId("B"), nodeId("A"))?.id).toBe("AB");
    expect(graph.findEdge(nodeId("A"), nodeId("D"))).toBeUndefined();
  });

  it("isVisited() starts false and flips true after visitNode()", () => {
    const graph = createInstrumentedGraph(nodes, edges);
    expect(graph.isVisited(nodeId("A"))).toBe(false);
    graph.visitNode(nodeId("A"));
    expect(graph.isVisited(nodeId("A"))).toBe(true);
  });

  it("visitNode() returns a well-formed event and is idempotent to call again", () => {
    const graph = createInstrumentedGraph(nodes, edges);
    const event = graph.visitNode(nodeId("A"), { line: 2 });
    expect(event).toMatchObject({ type: "visit-node", nodeId: "A", line: 2 });
    expect(() => graph.visitNode(nodeId("A"))).not.toThrow();
  });

  it("traverseEdge() returns a well-formed event and marks the edge traversed", () => {
    const graph = createInstrumentedGraph(nodes, edges);
    const event = graph.traverseEdge(edgeId("AB"), { line: 5 });
    expect(event).toMatchObject({ type: "traverse-edge", edgeId: "AB", line: 5 });
    expect(graph.snapshot().edges.find((e) => e.id === "AB")?.traversed).toBe(true);
  });

  it("traverseEdge() throws for an unknown edge id", () => {
    const graph = createInstrumentedGraph(nodes, edges);
    expect(() => graph.traverseEdge(edgeId("nope"))).toThrow(RangeError);
  });

  it("step numbers are monotonically increasing across mixed operations", () => {
    const graph = createInstrumentedGraph(nodes, edges);
    const steps = [
      graph.visitNode(nodeId("A")).step,
      graph.traverseEdge(edgeId("AB")).step,
      graph.visitNode(nodeId("B")).step,
    ];
    expect(steps).toEqual([0, 1, 2]);
  });

  it("snapshot() reflects current visited/traversed state and is an independent copy", () => {
    const graph = createInstrumentedGraph(nodes, edges);
    graph.visitNode(nodeId("A"));
    graph.traverseEdge(edgeId("AB"));
    const snap = graph.snapshot();
    expect(snap.kind).toBe("graph");
    expect(snap.nodes.find((n) => n.id === "A")?.visited).toBe(true);
    expect(snap.nodes.find((n) => n.id === "B")?.visited).toBe(false);
    expect(snap.edges.find((e) => e.id === "AB")?.traversed).toBe(true);

    graph.visitNode(nodeId("B"));
    expect(snap.nodes.find((n) => n.id === "B")?.visited).toBe(false); // earlier snapshot unaffected
  });

  it("updateNodeValue() returns a well-formed event and updates the live node's value", () => {
    const graph = createInstrumentedGraph(nodes, edges);
    const event = graph.updateNodeValue(nodeId("A"), 0, { line: 3 });
    expect(event).toMatchObject({ type: "update-node-value", nodeId: "A", value: 0, line: 3 });
    expect(graph.snapshot().nodes.find((n) => n.id === "A")?.value).toBe(0);

    graph.updateNodeValue(nodeId("A"), 7);
    expect(graph.snapshot().nodes.find((n) => n.id === "A")?.value).toBe(7);
  });

  it("updateNodeValue() throws for an unknown node id", () => {
    const graph = createInstrumentedGraph(nodes, edges);
    expect(() => graph.updateNodeValue(nodeId("nope"), 1)).toThrow(RangeError);
  });

  it("rejectEdge() returns a well-formed event and marks the edge rejected", () => {
    const graph = createInstrumentedGraph(nodes, edges);
    const event = graph.rejectEdge(edgeId("AC"), { line: 4 });
    expect(event).toMatchObject({ type: "reject-edge", edgeId: "AC", line: 4 });
    expect(graph.snapshot().edges.find((e) => e.id === "AC")?.rejected).toBe(true);
  });

  it("rejectEdge() throws for an unknown edge id", () => {
    const graph = createInstrumentedGraph(nodes, edges);
    expect(() => graph.rejectEdge(edgeId("nope"))).toThrow(RangeError);
  });

  it("a directed edge only creates adjacency from source to target", () => {
    const directedEdges: GraphEdge[] = [{ id: edgeId("XY"), source: nodeId("X"), target: nodeId("Y"), directed: true }];
    const directedNodes: GraphNode[] = [{ id: nodeId("X") }, { id: nodeId("Y") }];
    const graph = createInstrumentedGraph(directedNodes, directedEdges);
    expect(graph.neighbors(nodeId("X"))).toEqual(["Y"]);
    expect(graph.neighbors(nodeId("Y"))).toEqual([]);
  });
});
