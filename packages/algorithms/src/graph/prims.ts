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
const SOURCE_CODE = `function* run(input: GraphInput, graph: InstrumentedGraph): AlgorithmGenerator {
  const start = input.startNodeId;
  if (!start || !graph.nodeIds.includes(start)) return;

  const key = new Map<NodeId, number>();
  const bestEdge = new Map<NodeId, EdgeId>();
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
        yield graph.updateNodeValue(neighborId, weight, { line: 9 });
      }
    }
  }
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("prims"),
  name: "Prim's Algorithm",
  category: "graph",
  description:
    "Builds a minimum spanning tree by growing a single tree one node at a time: at each step, adds whichever node outside the tree is connected to it by the cheapest edge. The node badges show each outside node's current cheapest known connection cost to the tree.",
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
    { line: 9, text: "if weight < key[neighbor]: key[neighbor] = weight", indent: 2 },
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
  for (const id of graph.nodeIds) key.set(id, Infinity);
  key.set(start, 0);
  yield graph.updateNodeValue(start, 0, { line: 1, sourceLine: 9 });

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
    yield graph.visitNode(current, { line: 4, sourceLine: 26 });

    const connectingEdgeId = bestEdge.get(current);
    if (connectingEdgeId) yield graph.traverseEdge(connectingEdgeId, { line: 6, sourceLine: 29 });

    for (const neighborId of graph.neighbors(current)) {
      if (inTree.has(neighborId)) continue;
      const edge = graph.findEdge(current, neighborId)!;
      const weight = edge.weight ?? 1;
      if (weight < key.get(neighborId)!) {
        key.set(neighborId, weight);
        bestEdge.set(neighborId, edge.id);
        yield graph.updateNodeValue(neighborId, weight, { line: 9, sourceLine: 38 });
      }
    }
  }
}

export const primsPlugin: GraphPlugin = {
  metadata,
  inputConstraints,
  run,
};
