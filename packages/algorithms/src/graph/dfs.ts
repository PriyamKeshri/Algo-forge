import { algorithmId, type AlgorithmMetadata, type GraphInput, type InputConstraints, type NodeId } from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedGraph } from "@algoviz/engine";
import type { GraphPlugin } from "../registry";

// Mirrors the dfsVisit/run functions below line-for-line (sourceLine tags
// themselves omitted — see the note in ../sorting/bubble-sort.ts for why),
// checked by the drift-detection tests in graph.test.ts.
const SOURCE_CODE = `function* dfsVisit(graph: InstrumentedGraph, nodeId: NodeId): AlgorithmGenerator {
  yield graph.visitNode(nodeId, { line: 2 });
  for (const neighborId of graph.neighbors(nodeId)) {
    const edge = graph.findEdge(nodeId, neighborId);
    if (edge) yield graph.traverseEdge(edge.id, { line: 4 });
    if (!graph.isVisited(neighborId)) {
      yield* dfsVisit(graph, neighborId);
    }
  }
}

function* run(input: GraphInput, graph: InstrumentedGraph): AlgorithmGenerator {
  const start = input.startNodeId;
  if (!start || !graph.nodeIds.includes(start)) return;
  yield* dfsVisit(graph, start);
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("dfs"),
  name: "Depth-First Search",
  category: "graph",
  description:
    "Explores a graph by plunging as deep as possible down one path before backtracking: visits a node, then recursively dives into its first unvisited neighbor, and only backtracks to try the next neighbor once that whole branch is exhausted.",
  complexity: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)", space: "O(V)" },
  pseudocode: [
    { line: 1, text: "dfs(node):" },
    { line: 2, text: "mark node visited", indent: 1 },
    { line: 3, text: "for each neighbor of node:", indent: 1 },
    { line: 4, text: "examine edge(node, neighbor)", indent: 2 },
    { line: 5, text: "if neighbor not visited: dfs(neighbor)", indent: 2 },
  ],
  sourceCode: { language: "typescript", code: SOURCE_CODE },
};

const inputConstraints: InputConstraints = {
  kind: "graph",
  minSize: 2,
  maxSize: 40,
  defaultSize: 12,
};

function* dfsVisit(graph: InstrumentedGraph, nodeId: NodeId): AlgorithmGenerator {
  yield graph.visitNode(nodeId, { line: 2, sourceLine: 2 });
  for (const neighborId of graph.neighbors(nodeId)) {
    const edge = graph.findEdge(nodeId, neighborId);
    if (edge) yield graph.traverseEdge(edge.id, { line: 4, sourceLine: 5 });
    if (!graph.isVisited(neighborId)) {
      yield* dfsVisit(graph, neighborId);
    }
  }
}

function* run(input: GraphInput, graph: InstrumentedGraph): AlgorithmGenerator {
  const start = input.startNodeId;
  if (!start || !graph.nodeIds.includes(start)) return;
  yield* dfsVisit(graph, start);
}

export const dfsPlugin: GraphPlugin = {
  metadata,
  inputConstraints,
  run,
};
