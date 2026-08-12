import { algorithmId, type AlgorithmMetadata, type GraphInput, type InputConstraints, type NodeId } from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedGraph } from "@algoviz/engine";
import type { GraphPlugin } from "../registry";

// Mirrors the `run` function below line-for-line (sourceLine tags
// themselves omitted — see the note in ../sorting/bubble-sort.ts for why),
// checked by the drift-detection tests in graph.test.ts. The simple O(V^2)
// "scan for the smallest unsettled distance" selection, not a heap — the
// graphs this app generates (<= 40 nodes) don't need the asymptotics, and
// it keeps this readable next to BFS/DFS's own plain style.
const SOURCE_CODE = `function* run(input: GraphInput, graph: InstrumentedGraph): AlgorithmGenerator {
  const start = input.startNodeId;
  if (!start || !graph.nodeIds.includes(start)) return;

  const dist = new Map<NodeId, number>();
  for (const id of graph.nodeIds) dist.set(id, Infinity);
  dist.set(start, 0);
  yield graph.updateNodeValue(start, 0, { line: 1 });

  const unvisited = new Set(graph.nodeIds);

  while (unvisited.size > 0) {
    let current: NodeId | null = null;
    let currentDist = Infinity;
    for (const id of unvisited) {
      const d = dist.get(id)!;
      if (d < currentDist) {
        currentDist = d;
        current = id;
      }
    }
    if (current === null || currentDist === Infinity) break;
    unvisited.delete(current);
    yield graph.visitNode(current, { line: 4 });

    for (const neighborId of graph.neighbors(current)) {
      if (!unvisited.has(neighborId)) continue;
      const edge = graph.findEdge(current, neighborId);
      if (!edge) continue;
      yield graph.traverseEdge(edge.id, { line: 6 });
      const weight = edge.weight ?? 1;
      const candidate = currentDist + weight;
      if (candidate < dist.get(neighborId)!) {
        dist.set(neighborId, candidate);
        yield graph.updateNodeValue(neighborId, candidate, { line: 8 });
      }
    }
  }
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("dijkstra"),
  name: "Dijkstra's Algorithm",
  category: "graph",
  description:
    "Finds the shortest path from a start node to every reachable node in a weighted graph: repeatedly settles the closest not-yet-settled node, then relaxes its edges — updating a neighbor's tentative distance whenever a shorter path through the just-settled node turns up. The node badges show each node's current best-known distance from the start.",
  complexity: { best: "O(V²)", average: "O(V²)", worst: "O(V²)", space: "O(V)" },
  pseudocode: [
    { line: 1, text: "dist[v] = ∞ for every node; dist[start] = 0" },
    { line: 2, text: "while some unvisited node has dist < ∞:" },
    { line: 3, text: "current = unvisited node with smallest dist", indent: 1 },
    { line: 4, text: "mark current visited (settled)", indent: 1 },
    { line: 5, text: "for each neighbor of current:", indent: 1 },
    { line: 6, text: "examine edge(current, neighbor)", indent: 2 },
    { line: 7, text: "candidate = dist[current] + weight(edge)", indent: 2 },
    { line: 8, text: "if candidate < dist[neighbor]: dist[neighbor] = candidate", indent: 2 },
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

  const dist = new Map<NodeId, number>();
  for (const id of graph.nodeIds) dist.set(id, Infinity);
  dist.set(start, 0);
  yield graph.updateNodeValue(start, 0, { line: 1, sourceLine: 8 });

  const unvisited = new Set(graph.nodeIds);

  while (unvisited.size > 0) {
    let current: NodeId | null = null;
    let currentDist = Infinity;
    for (const id of unvisited) {
      const d = dist.get(id)!;
      if (d < currentDist) {
        currentDist = d;
        current = id;
      }
    }
    if (current === null || currentDist === Infinity) break;
    unvisited.delete(current);
    yield graph.visitNode(current, { line: 4, sourceLine: 24 });

    for (const neighborId of graph.neighbors(current)) {
      if (!unvisited.has(neighborId)) continue;
      const edge = graph.findEdge(current, neighborId);
      if (!edge) continue;
      yield graph.traverseEdge(edge.id, { line: 6, sourceLine: 30 });
      const weight = edge.weight ?? 1;
      const candidate = currentDist + weight;
      if (candidate < dist.get(neighborId)!) {
        dist.set(neighborId, candidate);
        yield graph.updateNodeValue(neighborId, candidate, { line: 8, sourceLine: 35 });
      }
    }
  }
}

export const dijkstraPlugin: GraphPlugin = {
  metadata,
  inputConstraints,
  run,
};
