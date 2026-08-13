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

// Mirrors the find/addToTree/run functions below line-for-line (sourceLine
// tags themselves omitted — see the note in ../sorting/bubble-sort.ts for
// why), checked by the drift-detection tests in graph.test.ts. `find` is a
// union-find "which component is this node in" lookup with path
// compression — the standard way to test "would adding this edge close a
// cycle" in O(~1) instead of walking the whole tree being built so far.
//
// `addToTree`/`treeAdjacency` exist purely for the optional end-node path
// highlight at the bottom of `run` — Kruskal's core algorithm (everything
// above that point) never needed an adjacency structure at all, since
// union-find only answers "same component?", not "how do I walk from one
// node to another." Unlike Prim's (which grows outward from `start`, so a
// simple parent-pointer map falls out for free), Kruskal's accepts edges
// in weight order regardless of position, so reconstructing a path needs
// its own small BFS over just the edges that made it into the tree.
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

function addToTree(
  adjacency: Map<NodeId, Array<{ to: NodeId; edgeId: EdgeId }>>,
  from: NodeId,
  to: NodeId,
  edgeId: EdgeId,
): void {
  const list = adjacency.get(from);
  if (list) list.push({ to, edgeId });
  else adjacency.set(from, [{ to, edgeId }]);
}

function* run(input: GraphInput, graph: InstrumentedGraph): AlgorithmGenerator {
  const parent = new Map<NodeId, NodeId>();
  for (const id of graph.nodeIds) parent.set(id, id);
  const visited = new Set<NodeId>();
  const treeAdjacency = new Map<NodeId, Array<{ to: NodeId; edgeId: EdgeId }>>();

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
    addToTree(treeAdjacency, edge.source, edge.target, edge.id);
    addToTree(treeAdjacency, edge.target, edge.source, edge.id);
    edgesUsed++;
  }

  const start = input.startNodeId;
  const end = input.endNodeId;
  if (!start || !end) return;

  const cameFrom = new Map<NodeId, { via: NodeId; edgeId: EdgeId }>();
  const queue: NodeId[] = [start];
  const seen = new Set<NodeId>([start]);
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node === end) break;
    for (const link of treeAdjacency.get(node) ?? []) {
      if (seen.has(link.to)) continue;
      seen.add(link.to);
      cameFrom.set(link.to, { via: node, edgeId: link.edgeId });
      queue.push(link.to);
    }
  }
  if (start !== end && !cameFrom.has(end)) return;

  const pathNodeIds: NodeId[] = [];
  const pathEdgeIds: EdgeId[] = [];
  let cur: NodeId | undefined = end;
  while (cur !== undefined) {
    pathNodeIds.unshift(cur);
    if (cur === start) break;
    const step = cameFrom.get(cur);
    if (!step) break;
    pathEdgeIds.unshift(step.edgeId);
    cur = step.via;
  }
  yield graph.highlightPath(pathNodeIds, pathEdgeIds, { line: 9 });
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("kruskals"),
  name: "Kruskal's Algorithm",
  category: "graph",
  description:
    "Builds a minimum spanning tree by sorting every edge by weight and adding them cheapest-first, skipping any edge that would connect two nodes already in the same growing component (which would close a cycle) — tracked with a union-find structure rather than a single growing tree. Unlike Prim's, it doesn't need a start node for the core algorithm: it looks at the whole edge list at once. Pick both a start and an end node (in the graph editor, before running) and the unique path connecting them *within the finished tree* gets highlighted — like Prim's, that's generally NOT the shortest path in the original graph, just the path an MST happens to connect them by.",
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
    { line: 9, text: "if a start and end node were both picked: highlight the tree path connecting them" },
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

function addToTree(
  adjacency: Map<NodeId, Array<{ to: NodeId; edgeId: EdgeId }>>,
  from: NodeId,
  to: NodeId,
  edgeId: EdgeId,
): void {
  const list = adjacency.get(from);
  if (list) list.push({ to, edgeId });
  else adjacency.set(from, [{ to, edgeId }]);
}

function* run(input: GraphInput, graph: InstrumentedGraph): AlgorithmGenerator {
  const parent = new Map<NodeId, NodeId>();
  for (const id of graph.nodeIds) parent.set(id, id);
  const visited = new Set<NodeId>();
  const treeAdjacency = new Map<NodeId, Array<{ to: NodeId; edgeId: EdgeId }>>();

  const sortedEdges = [...input.edges].sort((a, b) => (a.weight ?? 1) - (b.weight ?? 1));

  let edgesUsed = 0;
  for (const edge of sortedEdges) {
    if (edgesUsed === graph.nodeIds.length - 1) break;

    const rootA = find(parent, edge.source);
    const rootB = find(parent, edge.target);
    if (rootA === rootB) {
      yield graph.rejectEdge(edge.id, { line: 4, sourceLine: 39 });
      continue;
    }

    parent.set(rootA, rootB);
    if (!visited.has(edge.source)) {
      yield graph.visitNode(edge.source, { line: 6, sourceLine: 45 });
      visited.add(edge.source);
    }
    if (!visited.has(edge.target)) {
      yield graph.visitNode(edge.target, { line: 6, sourceLine: 49 });
      visited.add(edge.target);
    }
    yield graph.traverseEdge(edge.id, { line: 7, sourceLine: 52 });
    addToTree(treeAdjacency, edge.source, edge.target, edge.id);
    addToTree(treeAdjacency, edge.target, edge.source, edge.id);
    edgesUsed++;
  }

  // Only ever runs when the caller picked *both* a start and end node —
  // Kruskal's core algorithm above never reads `startNodeId` at all, so
  // unlike Dijkstra/Prim's (which already have a start for their own
  // reasons), this optional highlight needs the caller to supply one
  // explicitly rather than reusing something the algorithm was tracking
  // anyway.
  const start = input.startNodeId;
  const end = input.endNodeId;
  if (!start || !end) return;

  // Small BFS over just the tree edges accepted above (treeAdjacency) —
  // see this file's top-of-file comment for why Kruskal's needs this BFS
  // instead of Prim's simpler parent-pointer walk.
  const cameFrom = new Map<NodeId, { via: NodeId; edgeId: EdgeId }>();
  const queue: NodeId[] = [start];
  const seen = new Set<NodeId>([start]);
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node === end) break;
    for (const link of treeAdjacency.get(node) ?? []) {
      if (seen.has(link.to)) continue;
      seen.add(link.to);
      cameFrom.set(link.to, { via: node, edgeId: link.edgeId });
      queue.push(link.to);
    }
  }
  if (start !== end && !cameFrom.has(end)) return;

  const pathNodeIds: NodeId[] = [];
  const pathEdgeIds: EdgeId[] = [];
  let cur: NodeId | undefined = end;
  while (cur !== undefined) {
    pathNodeIds.unshift(cur);
    if (cur === start) break;
    const step = cameFrom.get(cur);
    if (!step) break;
    pathEdgeIds.unshift(step.edgeId);
    cur = step.via;
  }
  yield graph.highlightPath(pathNodeIds, pathEdgeIds, { line: 9, sourceLine: 88 });
}

export const kruskalsPlugin: GraphPlugin = {
  metadata,
  inputConstraints,
  run,
};
