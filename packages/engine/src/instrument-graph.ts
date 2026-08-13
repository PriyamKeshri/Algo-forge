import type {
  EdgeId,
  GraphEdge,
  GraphNode,
  GraphSnapshot,
  HighlightPathEvent,
  NodeId,
  RejectEdgeEvent,
  TraverseEdgeEvent,
  UpdateNodeValueEvent,
  VisitNodeEvent,
} from "@algoviz/core";
import type { EventMeta } from "./instrument";

/**
 * The object graph algorithm plugins (BFS, DFS, ...) write against — the
 * graph counterpart to `InstrumentedArray`. `visitNode`/`traverseEdge` are
 * synchronous, return the fully-formed event immediately, and (unlike the
 * array's `.get()`) also update this instance's own internal `visited`/
 * `traversed` state, which is what `isVisited()` reads. That makes this
 * context the single source of truth for "what's already happened" during
 * the run, the same role `InstrumentedArray`'s backing array plays —
 * algorithms don't need a redundant local `Set<NodeId>`.
 *
 * `neighbors`, `isVisited`, and `findEdge` are silent (no event) —
 * control-flow reads only, mirroring `InstrumentedArray.get()`.
 */
export interface InstrumentedGraph {
  readonly nodeIds: NodeId[];
  neighbors(nodeId: NodeId): NodeId[];
  isVisited(nodeId: NodeId): boolean;
  /** Undirected lookup: matches an edge regardless of which endpoint is `a` vs `b`. */
  findEdge(a: NodeId, b: NodeId): GraphEdge | undefined;
  visitNode(nodeId: NodeId, meta?: EventMeta): VisitNodeEvent;
  traverseEdge(edgeId: EdgeId, meta?: EventMeta): TraverseEdgeEvent;
  /** Weighted algorithms only (Dijkstra/Prim's/Kruskal's) — see UpdateNodeValueEvent's doc comment. */
  updateNodeValue(nodeId: NodeId, value: number, meta?: EventMeta): UpdateNodeValueEvent;
  /** Kruskal's only — see RejectEdgeEvent's doc comment. */
  rejectEdge(edgeId: EdgeId, meta?: EventMeta): RejectEdgeEvent;
  /** Dijkstra/Prim's/Kruskal's, only when `GraphInput.endNodeId` is set — see HighlightPathEvent's doc comment. */
  highlightPath(nodeIds: NodeId[], edgeIds: EdgeId[], meta?: EventMeta): HighlightPathEvent;
  snapshot(): GraphSnapshot;
}

function pushAdjacency(adjacency: Map<NodeId, EdgeId[]>, nodeId: NodeId, edgeId: EdgeId): void {
  const list = adjacency.get(nodeId);
  if (list) list.push(edgeId);
  else adjacency.set(nodeId, [edgeId]);
}

export function createInstrumentedGraph(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
): InstrumentedGraph {
  const nodeMap = new Map<NodeId, GraphNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, { ...node, visited: node.visited ?? false });
  }

  const edgeMap = new Map<EdgeId, GraphEdge>();
  const adjacency = new Map<NodeId, EdgeId[]>();
  for (const edge of edges) {
    // `rejected` deliberately isn't defaulted the way `traversed` is —
    // unlike traversed (which every BFS/DFS/Dijkstra/Prim's/Kruskal's run
    // sets on *some* edges), only Kruskal's ever calls rejectEdge; defaulting
    // it to `false` here would make every other algorithm's edges disagree
    // with a hand-built initial snapshot that simply leaves the key absent
    // (`undefined` and absent read the same to every actual consumer, but
    // not to strict equality in a few tests that already compare full
    // snapshots) for no benefit.
    edgeMap.set(edge.id, { ...edge, traversed: edge.traversed ?? false });
    pushAdjacency(adjacency, edge.source, edge.id);
    // Undirected by default: an edge is only added from `target`'s side too
    // when it isn't explicitly marked directed. Directed-graph algorithms
    // (not built yet) are the reason `directed` exists at all.
    if (!edge.directed) {
      pushAdjacency(adjacency, edge.target, edge.id);
    }
  }

  let step = 0;
  const nextStep = () => step++;

  function requireNode(id: NodeId, op: string): GraphNode {
    const node = nodeMap.get(id);
    if (!node) throw new RangeError(`InstrumentedGraph.${op}: unknown node id "${id}"`);
    return node;
  }

  function requireEdge(id: EdgeId, op: string): GraphEdge {
    const edge = edgeMap.get(id);
    if (!edge) throw new RangeError(`InstrumentedGraph.${op}: unknown edge id "${id}"`);
    return edge;
  }

  return {
    get nodeIds() {
      return [...nodeMap.keys()];
    },

    neighbors(nodeId) {
      requireNode(nodeId, "neighbors");
      const edgeIds = adjacency.get(nodeId) ?? [];
      return edgeIds.map((edgeId) => {
        const edge = edgeMap.get(edgeId)!;
        return edge.source === nodeId ? edge.target : edge.source;
      });
    },

    isVisited(nodeId) {
      return requireNode(nodeId, "isVisited").visited === true;
    },

    findEdge(a, b) {
      for (const edgeId of adjacency.get(a) ?? []) {
        const edge = edgeMap.get(edgeId)!;
        if ((edge.source === a && edge.target === b) || (edge.source === b && edge.target === a)) {
          return edge;
        }
      }
      return undefined;
    },

    visitNode(nodeId, meta) {
      const node = requireNode(nodeId, "visitNode");
      node.visited = true;
      return { type: "visit-node", step: nextStep(), nodeId, ...meta };
    },

    traverseEdge(edgeId, meta) {
      const edge = requireEdge(edgeId, "traverseEdge");
      edge.traversed = true;
      return { type: "traverse-edge", step: nextStep(), edgeId, ...meta };
    },

    updateNodeValue(nodeId, value, meta) {
      const node = requireNode(nodeId, "updateNodeValue");
      node.value = value;
      return { type: "update-node-value", step: nextStep(), nodeId, value, ...meta };
    },

    rejectEdge(edgeId, meta) {
      const edge = requireEdge(edgeId, "rejectEdge");
      edge.rejected = true;
      return { type: "reject-edge", step: nextStep(), edgeId, ...meta };
    },

    highlightPath(nodeIds, edgeIds, meta) {
      for (const id of nodeIds) requireNode(id, "highlightPath").onPath = true;
      for (const id of edgeIds) requireEdge(id, "highlightPath").onPath = true;
      return { type: "highlight-path", step: nextStep(), nodeIds, edgeIds, ...meta };
    },

    snapshot(): GraphSnapshot {
      return {
        kind: "graph",
        nodes: [...nodeMap.values()].map((n) => ({ ...n, position: n.position ? { ...n.position } : undefined })),
        edges: [...edgeMap.values()].map((e) => ({ ...e })),
      };
    },
  };
}
