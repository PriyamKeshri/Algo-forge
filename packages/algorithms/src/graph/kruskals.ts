import {
  algorithmId,
  type AlgorithmMetadata,
  type GraphInput,
  type InputConstraints,
  type NodeId,
} from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedGraph } from "@algoviz/engine";
import type { GraphPlugin } from "../registry";

// Mirrors the find/run functions below line-for-line (sourceLine tags
// themselves omitted — see the note in ../sorting/bubble-sort.ts for why),
// checked by the drift-detection tests in graph.test.ts. `find` is a
// union-find "which component is this node in" lookup with path
// compression — the standard way to test "would adding this edge close a
// cycle" in O(~1) instead of walking the whole tree being built so far.
const SOURCE_CODE = `function find(parent: Map<NodeId, NodeId>, id: NodeId): NodeId {
  let root = id;
  while (parent.get(root) !== root) root = parent.get(root)!;
  let cur = id;
  while (parent.get(cur) !== root) {
    const next = parent.get(cur)!;
    parent.set(cur, root);
    cur = next;
  }
  return root;
}

function* run(input: GraphInput, graph: InstrumentedGraph): AlgorithmGenerator {
  const parent = new Map<NodeId, NodeId>();
  for (const id of graph.nodeIds) parent.set(id, id);
  const visited = new Set<NodeId>();

  const sortedEdges = [...input.edges].sort((a, b) => (a.weight ?? 1) - (b.weight ?? 1));

  let edgesUsed = 0;
  for (const edge of sortedEdges) {
    if (edgesUsed === graph.nodeIds.length - 1) break;

    const rootA = find(parent, edge.source);
    const rootB = find(parent, edge.target);
    if (rootA === rootB) {
      yield graph.rejectEdge(edge.id, { line: 4 });
      continue;
    }

    parent.set(rootA, rootB);
    if (!visited.has(edge.source)) {
      yield graph.visitNode(edge.source, { line: 6 });
      visited.add(edge.source);
    }
    if (!visited.has(edge.target)) {
      yield graph.visitNode(edge.target, { line: 6 });
      visited.add(edge.target);
    }
    yield graph.traverseEdge(edge.id, { line: 7 });
    edgesUsed++;
  }
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("kruskals"),
  name: "Kruskal's Algorithm",
  category: "graph",
  description:
    "Builds a minimum spanning tree by sorting every edge by weight and adding them cheapest-first, skipping any edge that would connect two nodes already in the same growing component (which would close a cycle) — tracked with a union-find structure rather than a single growing tree. Unlike Prim's, it doesn't need a start node: it looks at the whole edge list at once.",
  complexity: { best: "O(E log E)", average: "O(E log E)", worst: "O(E log E)", space: "O(V)" },
  pseudocode: [
    { line: 1, text: "sort all edges by weight, ascending" },
    { line: 2, text: "for each edge, cheapest first:" },
    { line: 3, text: "if its endpoints are already in the same component:", indent: 1 },
    { line: 4, text: "reject it (would close a cycle)", indent: 2 },
    { line: 5, text: "otherwise:", indent: 1 },
    { line: 6, text: "merge the two components; mark both endpoints visited", indent: 2 },
    { line: 7, text: "add the edge to the tree", indent: 2 },
    { line: 8, text: "stop once the tree has (nodes - 1) edges" },
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

function find(parent: Map<NodeId, NodeId>, id: NodeId): NodeId {
  let root = id;
  while (parent.get(root) !== root) root = parent.get(root)!;
  let cur = id;
  while (parent.get(cur) !== root) {
    const next = parent.get(cur)!;
    parent.set(cur, root);
    cur = next;
  }
  return root;
}

function* run(input: GraphInput, graph: InstrumentedGraph): AlgorithmGenerator {
  const parent = new Map<NodeId, NodeId>();
  for (const id of graph.nodeIds) parent.set(id, id);
  const visited = new Set<NodeId>();

  const sortedEdges = [...input.edges].sort((a, b) => (a.weight ?? 1) - (b.weight ?? 1));

  let edgesUsed = 0;
  for (const edge of sortedEdges) {
    if (edgesUsed === graph.nodeIds.length - 1) break;

    const rootA = find(parent, edge.source);
    const rootB = find(parent, edge.target);
    if (rootA === rootB) {
      yield graph.rejectEdge(edge.id, { line: 4, sourceLine: 27 });
      continue;
    }

    parent.set(rootA, rootB);
    if (!visited.has(edge.source)) {
      yield graph.visitNode(edge.source, { line: 6, sourceLine: 33 });
      visited.add(edge.source);
    }
    if (!visited.has(edge.target)) {
      yield graph.visitNode(edge.target, { line: 6, sourceLine: 37 });
      visited.add(edge.target);
    }
    yield graph.traverseEdge(edge.id, { line: 7, sourceLine: 40 });
    edgesUsed++;
  }
}

export const kruskalsPlugin: GraphPlugin = {
  metadata,
  inputConstraints,
  run,
};
