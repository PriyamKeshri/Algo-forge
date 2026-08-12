import { edgeId, generateId, nodeId, type EdgeId, type GraphInput, type NodeId } from "@algoviz/core";

// A, B, ..., Z, A1, B1, ... — kept byte-identical to the copy in
// @algoviz/algorithms's generate-graph-input.ts. Not imported from there:
// packages/ui deliberately doesn't depend on packages/algorithms (ui is the
// generic-visualization-primitives layer; algorithms is concrete algorithm
// implementations — algorithms already depends on core+engine the same way
// ui does, and keeping ui algorithm-agnostic avoids a dependency that would
// only exist for one cosmetic helper). Promote to @algoviz/core if a third
// place ever needs it.
const LABEL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function labelFor(index: number): string {
  const letter = LABEL_LETTERS[index % LABEL_LETTERS.length]!;
  const suffix = Math.floor(index / LABEL_LETTERS.length);
  return suffix === 0 ? letter : `${letter}${suffix}`;
}

/**
 * Pure GraphInput -> GraphInput edit operations, the core of the
 * interactive graph editor (GraphEditor.tsx) but usable and testable
 * without any DOM/SVG/mouse-event machinery. Each function returns a new
 * GraphInput; none mutate their input.
 */

export function addNode(input: GraphInput, position: { x: number; y: number }): GraphInput {
  const id = nodeId(generateId("n"));
  const label = labelFor(input.nodes.length);
  const nodes = [...input.nodes, { id, label, position }];
  // The very first node in an empty graph becomes the start automatically —
  // otherwise there's no legal start node to run a traversal against yet.
  const startNodeId = input.startNodeId ?? id;
  return { ...input, nodes, startNodeId };
}

export function moveNode(input: GraphInput, id: NodeId, position: { x: number; y: number }): GraphInput {
  const nodes = input.nodes.map((n) => (n.id === id ? { ...n, position } : n));
  return { ...input, nodes };
}

/** No-ops for a self-loop (source === target) or an edge that already connects these two nodes, in either direction. `weight` is optional — only weighted-graph algorithms (Dijkstra/Prim's/Kruskal's) care about it; BFS/DFS leave it undefined. */
export function addEdge(input: GraphInput, sourceId: NodeId, targetId: NodeId, weight?: number): GraphInput {
  if (sourceId === targetId) return input;
  const alreadyConnected = input.edges.some(
    (e) => (e.source === sourceId && e.target === targetId) || (e.source === targetId && e.target === sourceId),
  );
  if (alreadyConnected) return input;
  const edges = [...input.edges, { id: edgeId(generateId("e")), source: sourceId, target: targetId, weight }];
  return { ...input, edges };
}

/** Cascades: removes every edge touching this node, and clears startNodeId if it pointed here. */
export function deleteNode(input: GraphInput, id: NodeId): GraphInput {
  const nodes = input.nodes.filter((n) => n.id !== id);
  const edges = input.edges.filter((e) => e.source !== id && e.target !== id);
  const startNodeId = input.startNodeId === id ? undefined : input.startNodeId;
  return { ...input, nodes, edges, startNodeId };
}

export function deleteEdge(input: GraphInput, id: EdgeId): GraphInput {
  const edges = input.edges.filter((e) => e.id !== id);
  return { ...input, edges };
}

export function setEdgeWeight(input: GraphInput, id: EdgeId, weight: number): GraphInput {
  const edges = input.edges.map((e) => (e.id === id ? { ...e, weight } : e));
  return { ...input, edges };
}

export function setStartNode(input: GraphInput, id: NodeId): GraphInput {
  return { ...input, startNodeId: id };
}

export function clearGraph(): GraphInput {
  return { kind: "graph", nodes: [], edges: [], startNodeId: undefined };
}
