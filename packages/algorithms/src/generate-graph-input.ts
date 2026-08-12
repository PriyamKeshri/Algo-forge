import { edgeId, nodeId, type GraphEdge, type GraphInput, type GraphNode } from "@algoviz/core";

export interface GenerateGraphOptions {
  size: number;
  seed?: number;
  /** Extra random edges added on top of the guaranteed-connecting spanning tree, as a fraction of `size`. */
  extraEdgeFactor?: number;
  /** Assigns every edge a random weight (1-20) — for Dijkstra/Prim's/Kruskal's, which need one; BFS/DFS leave this false and every edge stays weightless. */
  weighted?: boolean;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LABEL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** A, B, ..., Z, A1, B1, ... — exported so the interactive graph editor (packages/ui) can label manually-added nodes consistently with generated ones. */
export function labelFor(index: number): string {
  const letter = LABEL_LETTERS[index % LABEL_LETTERS.length]!;
  const suffix = Math.floor(index / LABEL_LETTERS.length);
  return suffix === 0 ? letter : `${letter}${suffix}`;
}

/**
 * Generates a connected, undirected demo graph: nodes placed evenly around
 * a circle (a fixed layout, not a real algorithm — the interactive editor
 * with proper positioning is a later roadmap item), a guaranteed-connecting
 * random spanning tree, plus a few extra random edges so BFS/DFS have more
 * than one path to choose between and the graph doesn't just look like a
 * bare tree.
 */
export function generateRandomGraph(options: GenerateGraphOptions): GraphInput {
  const { size, weighted = false } = options;
  const seed = options.seed ?? Math.floor(Math.random() * 0xffffffff);
  const rand = mulberry32(seed);

  const radius = 130;
  const center = { x: 150, y: 150 };
  const nodes: GraphNode[] = Array.from({ length: size }, (_, i) => {
    const angle = (2 * Math.PI * i) / Math.max(1, size);
    return {
      id: nodeId(`n${i}`),
      label: labelFor(i),
      position: {
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
      },
    };
  });

  const edges: GraphEdge[] = [];
  const edgeKeys = new Set<string>();
  function addEdge(a: number, b: number): void {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    const weight = weighted ? 1 + Math.floor(rand() * 20) : undefined;
    edges.push({ id: edgeId(`e${edges.length}`), source: nodeId(`n${a}`), target: nodeId(`n${b}`), weight });
  }

  // Guaranteed-connecting random spanning tree: every node i>0 attaches to
  // a random earlier node, so the whole graph is reachable from node 0.
  for (let i = 1; i < size; i++) {
    const parent = Math.floor(rand() * i);
    addEdge(parent, i);
  }

  // A handful of extra random edges for visual interest / alternate paths.
  const extraEdgeFactor = options.extraEdgeFactor ?? 0.3;
  const extraCount = Math.floor(size * extraEdgeFactor);
  for (let i = 0; i < extraCount && size > 2; i++) {
    const a = Math.floor(rand() * size);
    let b = Math.floor(rand() * size);
    if (a === b) b = (b + 1) % size;
    addEdge(a, b);
  }

  return {
    kind: "graph",
    nodes,
    edges,
    startNodeId: size > 0 ? nodeId("n0") : undefined,
    seed,
  };
}
