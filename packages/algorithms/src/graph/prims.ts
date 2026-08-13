import {
  algorithmId,
  type AlgorithmMetadata,
  type EdgeId,
  type GraphInput,
  type InputConstraints,
  type NodeId,
} from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedGraph } from "@algoviz/engine";
import type { GraphPlugin } from "../registry";

// Mirrors the `run` function below line-for-line (sourceLine tags
// themselves omitted — see the note in ../sorting/bubble-sort.ts for why),
// checked by the drift-detection tests in graph.test.ts. Same plain O(V^2)
// "scan for the smallest key" selection as dijkstra.ts, for the same
// reason (no need for a heap at this app's graph sizes).
//
// `parentOf` (alongside the pre-existing `bestEdge`) is what makes the
// optional end-node path highlight near the bottom possible: every time a
// neighbor's key improves, `current` — which is already in the tree at
// that point — becomes its tree-parent, so `parentOf` ends up being
// exactly a parent-pointer tree rooted at `start`. Walking it backward
// from any in-tree node always reaches `start`.
const SOURCE_CODE = `function* run(input: GraphInput, graph: InstrumentedGraph): AlgorithmGenerator {
  const start = input.startNodeId;
  if (!start || !graph.nodeIds.includes(start)) return;

  const key = new Map<NodeId, number>();
  const bestEdge = new Map<NodeId, EdgeId>();
  const parentOf = new Map<NodeId, NodeId>();
  for (const id of graph.nodeIds) key.set(id, Infinity);
  key.set(start, 0);
  yield graph.updateNodeValue(start, 0, { line: 1 });

  const inTree = new Set<NodeId>();

  while (inTree.size < graph.nodeIds.length) {
    let current: NodeId | null = null;
    let currentKey = Infinity;
    for (const id of graph.nodeIds) {
      if (inTree.has(id)) continue;
      const k = key.get(id)!;
      if (k < currentKey) {
        currentKey = k;
        current = id;
      }
    }
    if (current === null || currentKey === Infinity) break;
    inTree.add(current);
    yield graph.visitNode(current, { line: 4 });

    const connectingEdgeId = bestEdge.get(current);
    if (connectingEdgeId) yield graph.traverseEdge(connectingEdgeId, { line: 6 });

    for (const neighborId of graph.neighbors(current)) {
      if (inTree.has(neighborId)) continue;
      const edge = graph.findEdge(current, neighborId)!;
      const weight = edge.weight ?? 1;
      if (weight < key.get(neighborId)!) {
        key.set(neighborId, weight);
        bestEdge.set(neighborId, edge.id);
        parentOf.set(neighborId, current);
        yield graph.updateNodeValue(neighborId, weight, { line: 9 });
      }
    }
  }

  const end = input.endNodeId;
  if (end && inTree.has(end)) {
    const pathNodeIds: NodeId[] = [];
    let cur: NodeId | undefined = end;
    while (cur !== undefined) {
      pathNodeIds.unshift(cur);
      cur = cur === start ? undefined : parentOf.get(cur);
    }
    const pathEdgeIds: EdgeId[] = [];
    for (const nodeId of pathNodeIds) {
      if (nodeId === start) continue;
      const edgeId = bestEdge.get(nodeId);
      if (edgeId) pathEdgeIds.push(edgeId);
    }
    yield graph.highlightPath(pathNodeIds, pathEdgeIds, { line: 10 });
  }
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("prims"),
  name: "Prim's Algorithm",
  category: "graph",
  description:
    "Builds a minimum spanning tree by growing a single tree one node at a time: at each step, adds whichever node outside the tree is connected to it by the cheapest edge. The node badges show each outside node's current cheapest known connection cost to the tree. Pick an end node too (in the graph editor, before running) and the unique path connecting start to end *within the finished tree* gets highlighted — note that's generally NOT the shortest path in the original graph (that's what Dijkstra computes); an MST only minimizes the total cost of connecting every node, not the cost between any two particular ones.",
  complexity: { best: "O(V²)", average: "O(V²)", worst: "O(V²)", space: "O(V)" },
  pseudocode: [
    { line: 1, text: "key[v] = ∞ for every node; key[start] = 0" },
    { line: 2, text: "while the tree doesn't yet contain every node:" },
    { line: 3, text: "current = outside node with smallest key", indent: 1 },
    { line: 4, text: "add current to the tree", indent: 1 },
    { line: 5, text: "if current has a connecting edge:", indent: 1 },
    { line: 6, text: "add that edge to the tree", indent: 2 },
    { line: 7, text: "for each neighbor of current still outside the tree:", indent: 1 },
    { line: 8, text: "weight = weight(edge to neighbor)", indent: 2 },
    { line: 9, text: "if weight < key[neighbor]: key[neighbor] = weight, remember current as its tree-parent", indent: 2 },
    { line: 10, text: "if an end node was picked and it's in the tree: highlight the tree path start→end" },
  ],
  sourceCode: { language: "typescript", code: SOURCE_CODE },
};

const inputConstraints: InputConstraints = {
  kind: "graph",
  minSize: 2,
  maxSize: 40,
  defaultSize: 12,
  weighted: true,
};

function* run(input: GraphInput, graph: InstrumentedGraph): AlgorithmGenerator {
  const start = input.startNodeId;
  if (!start || !graph.nodeIds.includes(start)) return;

  const key = new Map<NodeId, number>();
  const bestEdge = new Map<NodeId, EdgeId>();
  const parentOf = new Map<NodeId, NodeId>();
  for (const id of graph.nodeIds) key.set(id, Infinity);
  key.set(start, 0);
  yield graph.updateNodeValue(start, 0, { line: 1, sourceLine: 10 });

  const inTree = new Set<NodeId>();

  while (inTree.size < graph.nodeIds.length) {
    let current: NodeId | null = null;
    let currentKey = Infinity;
    for (const id of graph.nodeIds) {
      if (inTree.has(id)) continue;
      const k = key.get(id)!;
      if (k < currentKey) {
        currentKey = k;
        current = id;
      }
    }
    if (current === null || currentKey === Infinity) break;
    inTree.add(current);
    yield graph.visitNode(current, { line: 4, sourceLine: 27 });

    const connectingEdgeId = bestEdge.get(current);
    if (connectingEdgeId) yield graph.traverseEdge(connectingEdgeId, { line: 6, sourceLine: 30 });

    for (const neighborId of graph.neighbors(current)) {
      if (inTree.has(neighborId)) continue;
      const edge = graph.findEdge(current, neighborId)!;
      const weight = edge.weight ?? 1;
      if (weight < key.get(neighborId)!) {
        key.set(neighborId, weight);
        bestEdge.set(neighborId, edge.id);
        parentOf.set(neighborId, current);
        yield graph.updateNodeValue(neighborId, weight, { line: 9, sourceLine: 40 });
      }
    }
  }

  // Only ever runs when the caller picked an end node (via the graph
  // editor) that actually ended up in the tree — every connected graph
  // reaches every node, so this only stays false for a disconnected one.
  const end = input.endNodeId;
  if (end && inTree.has(end)) {
    // Walk tree-parents backward from end to start — `parentOf` is exactly
    // a rooted-at-start parent pointer (see the doc comment above this
    // function's start), so this always terminates at `start`.
    const pathNodeIds: NodeId[] = [];
    let cur: NodeId | undefined = end;
    while (cur !== undefined) {
      pathNodeIds.unshift(cur);
      cur = cur === start ? undefined : parentOf.get(cur);
    }
    const pathEdgeIds: EdgeId[] = [];
    for (const nodeId of pathNodeIds) {
      if (nodeId === start) continue;
      const edgeId = bestEdge.get(nodeId);
      if (edgeId) pathEdgeIds.push(edgeId);
    }
    yield graph.highlightPath(pathNodeIds, pathEdgeIds, { line: 10, sourceLine: 59 });
  }
}

export const primsPlugin: GraphPlugin = {
  metadata,
  inputConstraints,
  run,
};
