import { describe, expect, it } from "vitest";
import { createInstrumentedGraph, ExecutionEngine } from "@algoviz/engine";
import {
  edgeId,
  nodeId,
  type GraphEdge,
  type GraphInput,
  type GraphNode,
  type VisitNodeEvent,
} from "@algoviz/core";
import { bfsPlugin } from "./bfs";
import { dfsPlugin } from "./dfs";
import { dijkstraPlugin } from "./dijkstra";
import { primsPlugin } from "./prims";
import { kruskalsPlugin } from "./kruskals";
import type { GraphPlugin } from "../registry";

// BFS/DFS/Dijkstra/Prim's all share the same contract: given a start node,
// visit exactly the reachable set, each node exactly once, and produce no
// events at all when the start is missing/unknown. Kruskal's doesn't (it
// ignores startNodeId entirely and looks at the whole edge list at once),
// so it isn't in this shared list — see its own describe block below.
const plugins: Array<{ name: string; plugin: GraphPlugin }> = [
  { name: "BFS", plugin: bfsPlugin },
  { name: "DFS", plugin: dfsPlugin },
  { name: "Dijkstra", plugin: dijkstraPlugin },
  { name: "Prim's", plugin: primsPlugin },
];

// A sourceLine-tagged line should always be part of an instrumented
// operation. See ../sorting/sorting.test.ts for the full rationale — this
// is the graph-plugin equivalent of that drift detector.
const OPERATION_MARKERS = ["yield", ".visitNode(", ".traverseEdge(", ".updateNodeValue(", ".rejectEdge("];

function n(id: string): GraphNode {
  return { id: nodeId(id) };
}

function e(id: string, a: string, b: string): GraphEdge {
  return { id: edgeId(id), source: nodeId(a), target: nodeId(b) };
}

function isVisitNode(ev: { type: string }): ev is VisitNodeEvent {
  return ev.type === "visit-node";
}

interface Fixture {
  name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  start: string | null;
  reachable: string[]; // node ids expected to be visited from `start`
}

const fixtures: Fixture[] = [
  {
    name: "single node, no edges",
    nodes: [n("A")],
    edges: [],
    start: "A",
    reachable: ["A"],
  },
  {
    name: "diamond (cycle)",
    nodes: [n("A"), n("B"), n("C"), n("D")],
    edges: [e("AB", "A", "B"), e("AC", "A", "C"), e("BD", "B", "D"), e("CD", "C", "D")],
    start: "A",
    reachable: ["A", "B", "C", "D"],
  },
  {
    name: "path",
    nodes: [n("A"), n("B"), n("C"), n("D"), n("E")],
    edges: [e("AB", "A", "B"), e("BC", "B", "C"), e("CD", "C", "D"), e("DE", "D", "E")],
    start: "A",
    reachable: ["A", "B", "C", "D", "E"],
  },
  {
    name: "disconnected (start component only)",
    nodes: [n("A"), n("B"), n("C"), n("D")],
    edges: [e("AB", "A", "B"), e("CD", "C", "D")],
    start: "A",
    reachable: ["A", "B"],
  },
];

function runPlugin(plugin: GraphPlugin, nodes: GraphNode[], edges: GraphEdge[], start: string | null) {
  const input: GraphInput = { kind: "graph", nodes, edges, startNodeId: start ? nodeId(start) : undefined };
  const graph = createInstrumentedGraph(nodes, edges);
  const engine = new ExecutionEngine();
  return engine.run(plugin.run(input, graph), graph);
}

describe.each(plugins)("$name", ({ plugin }) => {
  it.each(fixtures)("visits exactly the reachable set from start ($name)", (fixture) => {
    const result = runPlugin(plugin, fixture.nodes, fixture.edges, fixture.start);
    expect(result.completed).toBe(true);

    const visitedIds = new Set(result.events.filter(isVisitNode).map((ev) => ev.nodeId));
    expect([...visitedIds].sort()).toEqual([...fixture.reachable].sort());

    const finalNodes = (result.finalSnapshot as { kind: "graph"; nodes: GraphNode[] }).nodes;
    for (const node of finalNodes) {
      expect(Boolean(node.visited)).toBe(fixture.reachable.includes(node.id));
    }
  });

  it("visits each reachable node exactly once, never revisiting", () => {
    const fixture = fixtures[1]!; // diamond — has a cycle, the real test of "don't revisit"
    const result = runPlugin(plugin, fixture.nodes, fixture.edges, fixture.start);
    const ids = result.events.filter(isVisitNode).map((ev) => ev.nodeId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces no events when startNodeId is absent", () => {
    const fixture = fixtures[1]!;
    const result = runPlugin(plugin, fixture.nodes, fixture.edges, null);
    expect(result.events).toHaveLength(0);
    expect(result.completed).toBe(true);
  });

  it("produces no events when startNodeId doesn't exist in the graph", () => {
    const fixture = fixtures[1]!;
    const result = runPlugin(plugin, fixture.nodes, fixture.edges, "nonexistent");
    expect(result.events).toHaveLength(0);
    expect(result.completed).toBe(true);
  });

  it("produces monotonically increasing event steps, each referencing a valid pseudocode line", () => {
    const fixture = fixtures[2]!; // path
    const result = runPlugin(plugin, fixture.nodes, fixture.edges, fixture.start);
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
    const fixture = fixtures[2]!;
    const result = runPlugin(plugin, fixture.nodes, fixture.edges, fixture.start);
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
});

describe("Dijkstra distance correctness", () => {
  it("settles every reachable node with its true shortest distance from start", () => {
    // A --1--> B --1--> D
    // A --------4-------> D  (longer direct route, should lose to A->B->D = 2)
    const nodes: GraphNode[] = [n("A"), n("B"), n("C"), n("D")];
    const edges: GraphEdge[] = [
      { id: edgeId("AB"), source: nodeId("A"), target: nodeId("B"), weight: 1 },
      { id: edgeId("BD"), source: nodeId("B"), target: nodeId("D"), weight: 1 },
      { id: edgeId("AD"), source: nodeId("A"), target: nodeId("D"), weight: 4 },
      { id: edgeId("BC"), source: nodeId("B"), target: nodeId("C"), weight: 10 },
    ];
    const result = runPlugin(dijkstraPlugin, nodes, edges, "A");
    const finalNodes = (result.finalSnapshot as { kind: "graph"; nodes: GraphNode[] }).nodes;
    const valueOf = (id: string) => finalNodes.find((node) => node.id === id)?.value;

    expect(valueOf("A")).toBe(0);
    expect(valueOf("B")).toBe(1);
    expect(valueOf("D")).toBe(2); // via B, not the direct weight-4 edge
    expect(valueOf("C")).toBe(11);
  });
});

describe("Prim's / Kruskal's build a correct minimum spanning tree", () => {
  // MST is AB(1) + BC(2) + CD(4) + BE(5) = 12. AC(3) is cheap enough to be
  // examined *before* the tree completes (Kruskal's stops early once it has
  // nodes.length - 1 edges) but closes the A-B-C cycle, so it must be
  // rejected rather than silently never reached.
  const nodes: GraphNode[] = [n("A"), n("B"), n("C"), n("D"), n("E")];
  const edges: GraphEdge[] = [
    { id: edgeId("AB"), source: nodeId("A"), target: nodeId("B"), weight: 1 },
    { id: edgeId("BC"), source: nodeId("B"), target: nodeId("C"), weight: 2 },
    { id: edgeId("AC"), source: nodeId("A"), target: nodeId("C"), weight: 3 }, // would close a cycle if taken
    { id: edgeId("CD"), source: nodeId("C"), target: nodeId("D"), weight: 4 },
    { id: edgeId("BE"), source: nodeId("B"), target: nodeId("E"), weight: 5 },
    { id: edgeId("DE"), source: nodeId("D"), target: nodeId("E"), weight: 100 }, // never even reached — tree completes first
  ];

  function mstWeight(result: ReturnType<typeof runPlugin>): number {
    const finalEdges = (result.finalSnapshot as { kind: "graph"; edges: GraphEdge[] }).edges;
    return finalEdges.filter((e) => e.traversed).reduce((sum, e) => sum + (e.weight ?? 1), 0);
  }

  it("Prim's finds the correct total weight and edge count", () => {
    const result = runPlugin(primsPlugin, nodes, edges, "A");
    const finalEdges = (result.finalSnapshot as { kind: "graph"; edges: GraphEdge[] }).edges;
    expect(finalEdges.filter((e) => e.traversed)).toHaveLength(nodes.length - 1);
    expect(mstWeight(result)).toBe(12);
  });

  it("Kruskal's finds the correct total weight and edge count, ignoring startNodeId entirely", () => {
    const result = runPlugin(kruskalsPlugin, nodes, edges, null);
    const finalEdges = (result.finalSnapshot as { kind: "graph"; edges: GraphEdge[] }).edges;
    expect(finalEdges.filter((e) => e.traversed)).toHaveLength(nodes.length - 1);
    expect(mstWeight(result)).toBe(12);
  });

  it("Kruskal's rejects the edge that would close a cycle, and never even reaches the one after it", () => {
    const result = runPlugin(kruskalsPlugin, nodes, edges, null);
    const finalEdges = (result.finalSnapshot as { kind: "graph"; edges: GraphEdge[] }).edges;
    expect(finalEdges.filter((e) => e.rejected).map((e) => e.id)).toEqual(["AC"]);
    const de = finalEdges.find((e) => e.id === "DE");
    expect(de?.traversed).toBe(false);
    expect(de?.rejected).toBeUndefined();
  });

  it("Kruskal's produces well-formed sourceLine references into the real source snippet", () => {
    const result = runPlugin(kruskalsPlugin, nodes, edges, null);
    const sourceLines = kruskalsPlugin.metadata.sourceCode.code.split("\n");
    expect(result.events.some((ev) => ev.sourceLine !== undefined)).toBe(true);
    for (const event of result.events) {
      if (event.sourceLine === undefined) continue;
      const lineText = sourceLines[event.sourceLine - 1]!;
      expect(OPERATION_MARKERS.some((marker) => lineText.includes(marker))).toBe(true);
    }
  });
});
