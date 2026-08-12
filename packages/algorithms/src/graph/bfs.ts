import { algorithmId, type AlgorithmMetadata, type GraphInput, type InputConstraints, type NodeId } from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedGraph } from "@algoviz/engine";
import type { GraphPlugin } from "../registry";

// Mirrors the `run` function below line-for-line (sourceLine tags
// themselves omitted — see the note in ../sorting/bubble-sort.ts for why),
// checked by the drift-detection tests in graph.test.ts.
const SOURCE_CODE = `function* run(input: GraphInput, graph: InstrumentedGraph): AlgorithmGenerator {
  const start = input.startNodeId;
  if (!start || !graph.nodeIds.includes(start)) return;

  const queue: NodeId[] = [start];
  yield graph.visitNode(start, { line: 1 });

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighborId of graph.neighbors(current)) {
      const edge = graph.findEdge(current, neighborId);
      if (edge) yield graph.traverseEdge(edge.id, { line: 5 });
      if (!graph.isVisited(neighborId)) {
        yield graph.visitNode(neighborId, { line: 6 });
        queue.push(neighborId);
      }
    }
  }
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("bfs"),
  name: "Breadth-First Search",
  category: "graph",
  description:
    "Explores a graph outward from a start node one layer at a time using a queue: visits the start, then all its neighbors, then their unvisited neighbors, and so on — guaranteeing the fewest-edges path to every reachable node.",
  complexity: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)", space: "O(V)" },
  pseudocode: [
    { line: 1, text: "queue = [start]; mark start visited" },
    { line: 2, text: "while queue is not empty:" },
    { line: 3, text: "current = queue.dequeue()", indent: 1 },
    { line: 4, text: "for each neighbor of current:", indent: 1 },
    { line: 5, text: "examine edge(current, neighbor)", indent: 2 },
    { line: 6, text: "if neighbor not visited: mark visited, enqueue", indent: 2 },
  ],
  sourceCode: { language: "typescript", code: SOURCE_CODE },
};

const inputConstraints: InputConstraints = {
  kind: "graph",
  minSize: 2,
  maxSize: 40,
  defaultSize: 12,
};

function* run(input: GraphInput, graph: InstrumentedGraph): AlgorithmGenerator {
  const start = input.startNodeId;
  if (!start || !graph.nodeIds.includes(start)) return;

  const queue: NodeId[] = [start];
  yield graph.visitNode(start, { line: 1, sourceLine: 6 });

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighborId of graph.neighbors(current)) {
      const edge = graph.findEdge(current, neighborId);
      if (edge) yield graph.traverseEdge(edge.id, { line: 5, sourceLine: 12 });
      if (!graph.isVisited(neighborId)) {
        yield graph.visitNode(neighborId, { line: 6, sourceLine: 14 });
        queue.push(neighborId);
      }
    }
  }
}

export const bfsPlugin: GraphPlugin = {
  metadata,
  inputConstraints,
  run,
};
