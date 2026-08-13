import { describe, expect, it } from "vitest";
import {
  edgeId,
  nodeId,
  type ArraySnapshot,
  type GraphEdge,
  type GraphNode,
  type GraphSnapshot,
  type LinkedListSnapshot,
  type LinkedListVariant,
  type NodeId,
  type TreeSnapshot,
} from "@algoviz/core";
import { createInstrumentedArray, type InstrumentedArray } from "./instrument";
import { createInstrumentedGraph, type InstrumentedGraph } from "./instrument-graph";
import { createInstrumentedTree, type InstrumentedTree } from "./instrument-tree";
import { createInstrumentedLinkedList, type InstrumentedLinkedList } from "./instrument-linked-list";
import { ExecutionEngine, type AlgorithmGenerator } from "./driver";
import { buildSnapshots, reconstructFrame, reconstructFrameNaive } from "./timeline";

// A small local bubble sort generator just for exercising the timeline
// machinery below — the real sorting plugins live in @algoviz/algorithms,
// which (correctly) depends on this package, not the other way around.
function* bubbleSort(arr: InstrumentedArray): AlgorithmGenerator {
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      yield arr.compare(j, j + 1);
      if (arr.get(j) > arr.get(j + 1)) {
        yield arr.swap(j, j + 1);
      }
    }
  }
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

function randomArray(size: number, seed: number): number[] {
  const rand = mulberry32(seed);
  return Array.from({ length: size }, () => Math.floor(rand() * 50));
}

function runBubbleSort(values: number[]) {
  const initial: ArraySnapshot = { kind: "array", values };
  const arr = createInstrumentedArray(values);
  const engine = new ExecutionEngine();
  const result = engine.run(bubbleSort(arr), arr);
  return { initial, result };
}

// A small local BFS generator + random-spanning-tree graph, just for
// exercising graph replay below — the real BFS/DFS plugins live in
// @algoviz/algorithms, which (correctly) depends on this package.
function randomConnectedGraph(size: number, seed: number): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const rand = mulberry32(seed);
  const nodes: GraphNode[] = Array.from({ length: size }, (_, i) => ({ id: nodeId(`n${i}`) }));
  const edges: GraphEdge[] = [];
  for (let i = 1; i < size; i++) {
    const parent = Math.floor(rand() * i);
    edges.push({ id: edgeId(`e${i}`), source: nodeId(`n${parent}`), target: nodeId(`n${i}`) });
  }
  return { nodes, edges };
}

function* bfs(graph: InstrumentedGraph, start: NodeId): AlgorithmGenerator {
  const queue: NodeId[] = [start];
  yield graph.visitNode(start);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighborId of graph.neighbors(current)) {
      const edge = graph.findEdge(current, neighborId);
      if (edge) yield graph.traverseEdge(edge.id);
      if (!graph.isVisited(neighborId)) {
        yield graph.visitNode(neighborId);
        queue.push(neighborId);
      }
    }
  }
}

function runBfs(size: number, seed: number) {
  const { nodes, edges } = randomConnectedGraph(size, seed);
  const initial: GraphSnapshot = { kind: "graph", nodes, edges };
  const graph = createInstrumentedGraph(nodes, edges);
  const engine = new ExecutionEngine();
  const result = engine.run(bfs(graph, nodeId("n0")), graph);
  return { initial, result };
}

// A tiny local generator exercising updateNodeValue/rejectEdge — the
// weighted-graph event counterparts to bfs()'s visitNode/traverseEdge —
// just for replay coverage; the real Dijkstra/Prim's/Kruskal's plugins live
// in @algoviz/algorithms.
function* weightedWalk(graph: InstrumentedGraph): AlgorithmGenerator {
  yield graph.updateNodeValue(nodeId("n0"), 0);
  yield graph.updateNodeValue(nodeId("n1"), 5);
  yield graph.rejectEdge(edgeId("e2"));
  yield graph.highlightPath([nodeId("n0"), nodeId("n1")], [edgeId("e1")]);
}

function runWeightedWalk() {
  const nodes: GraphNode[] = [{ id: nodeId("n0") }, { id: nodeId("n1") }, { id: nodeId("n2") }];
  const edges: GraphEdge[] = [
    { id: edgeId("e1"), source: nodeId("n0"), target: nodeId("n1"), weight: 5 },
    { id: edgeId("e2"), source: nodeId("n1"), target: nodeId("n2"), weight: 3 },
  ];
  const initial: GraphSnapshot = { kind: "graph", nodes, edges };
  const graph = createInstrumentedGraph(nodes, edges);
  const engine = new ExecutionEngine();
  const result = engine.run(weightedWalk(graph), graph);
  return { initial, result };
}

// A small local BST-insert-then-inorder-walk generator, just for exercising
// tree replay below — the real BST Insert/Inorder Traversal plugins live in
// @algoviz/algorithms, which (correctly) depends on this package.
function* bstInsertAndWalk(tree: InstrumentedTree, values: number[]): AlgorithmGenerator {
  for (const value of values) {
    if (tree.rootId === null) {
      yield tree.insertNode(value, undefined, undefined);
      continue;
    }
    let current = tree.rootId;
    while (true) {
      const cmp = tree.compareNode(current, value);
      yield cmp;
      if (cmp.result === 0) break;
      const side = cmp.result < 0 ? "left" : "right";
      const child = side === "left" ? tree.leftOf(current) : tree.rightOf(current);
      if (child === undefined) {
        yield tree.insertNode(value, current, side);
        break;
      }
      current = child;
    }
  }
  yield* inorder(tree, tree.rootId ?? undefined);
}

function* inorder(tree: InstrumentedTree, id: NodeId | undefined): AlgorithmGenerator {
  if (id === undefined) return;
  yield* inorder(tree, tree.leftOf(id));
  yield tree.visitNode(id);
  yield* inorder(tree, tree.rightOf(id));
}

function runBst(values: number[]) {
  const initial: TreeSnapshot = { kind: "tree", nodes: {}, rootId: null };
  const tree = createInstrumentedTree();
  const engine = new ExecutionEngine();
  const result = engine.run(bstInsertAndWalk(tree, values), tree);
  return { initial, result };
}

function mulberrySeeded(size: number, seed: number): number[] {
  const rand = mulberry32(seed);
  return Array.from({ length: size }, () => Math.floor(rand() * 100));
}

// A small local op runner just for exercising the timeline machinery — the
// real Linked List Operations plugins live in @algoviz/algorithms. Bounded
// by `list.size` (not "until next is null") for the same reason the real
// plugins are: a circular list's `next` never becomes null.
type LlOp = { type: "insertHead" | "insertTail"; value: number } | { type: "delete"; value: number } | { type: "reverse" };

function* runLinkedListOps(list: InstrumentedLinkedList, ops: LlOp[]): AlgorithmGenerator {
  for (const op of ops) {
    if (op.type === "insertHead") {
      yield list.insertHead(op.value);
    } else if (op.type === "insertTail") {
      yield list.insertTail(op.value);
    } else if (op.type === "delete") {
      let cur = list.headId;
      for (let i = 0; i < list.size && cur !== null; i++) {
        if (list.valueOf(cur) === op.value) {
          yield list.deleteNode(cur);
          break;
        }
        cur = list.nextOf(cur) ?? null;
      }
    } else {
      yield list.reverse();
    }
  }
}

function runLinkedList(variant: LinkedListVariant, ops: LlOp[]) {
  const initial: LinkedListSnapshot = { kind: "linked-list", variant, nodes: {}, headId: null };
  const list = createInstrumentedLinkedList(variant);
  const engine = new ExecutionEngine();
  const result = engine.run(runLinkedListOps(list, ops), list);
  return { initial, result };
}

describe("buildSnapshots", () => {
  it("always includes a -1 sentinel, even for an empty event stream", () => {
    const initial: ArraySnapshot = { kind: "array", values: [1, 2, 3] };
    const snapshots = buildSnapshots(initial, []);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({ atStep: -1, structure: initial });
  });

  it("produces at most targetCount + 1 snapshots (keyframes + sentinel)", () => {
    const { initial, result } = runBubbleSort(randomArray(40, 1));
    const snapshots = buildSnapshots(initial, result.events, 10);
    expect(snapshots.length).toBeLessThanOrEqual(11);
  });
});

describe("reconstructFrame", () => {
  it("at step -1 returns the untouched initial structure with no active event", () => {
    const { initial, result } = runBubbleSort([5, 3, 1]);
    const snapshots = buildSnapshots(initial, result.events);
    const frame = reconstructFrame(snapshots, result.events, -1);
    expect(frame.structure).toEqual(initial);
    expect(frame.activeEvent).toBeNull();
  });

  it("at the final step matches the engine's own final snapshot and stats", () => {
    const { initial, result } = runBubbleSort(randomArray(20, 7));
    const snapshots = buildSnapshots(initial, result.events);
    const lastStep = result.events.at(-1)!.step;

    const frame = reconstructFrame(snapshots, result.events, lastStep);
    expect(frame.structure).toEqual(result.finalSnapshot);
    expect(frame.stats).toEqual(result.stats);
  });

  describe("matches the naive full-replay reference at every step", () => {
    const sizes = [0, 1, 2, 5, 13, 27];
    const snapshotTargets = [1, 5, 200];

    for (const size of sizes) {
      for (const targetCount of snapshotTargets) {
        it(`size=${size}, targetCount=${targetCount}`, () => {
          const { initial, result } = runBubbleSort(randomArray(size, size * 1000 + targetCount));
          const snapshots = buildSnapshots(initial, result.events, targetCount);

          for (let step = -1; step < result.events.length; step++) {
            const fast = reconstructFrame(snapshots, result.events, step);
            const naive = reconstructFrameNaive(initial, result.events, step);
            expect(fast.structure).toEqual(naive.structure);
            expect(fast.stats).toEqual(naive.stats);
            expect(fast.activeEvent).toEqual(naive.activeEvent);
          }
        });
      }
    }
  });
});

describe("graph replay (visit-node/traverse-edge as mutating events)", () => {
  it("at the final step matches the engine's own final snapshot", () => {
    const { initial, result } = runBfs(15, 7);
    const snapshots = buildSnapshots(initial, result.events);
    const lastStep = result.events.at(-1)!.step;
    const frame = reconstructFrame(snapshots, result.events, lastStep);
    expect(frame.structure).toEqual(result.finalSnapshot);
  });

  it("accumulates visited state persistently, not just at the active instant", () => {
    const { initial, result } = runBfs(10, 42);
    const snapshots = buildSnapshots(initial, result.events);
    const midStep = Math.floor(result.events.length / 2);
    const frame = reconstructFrame(snapshots, result.events, midStep);
    const structure = frame.structure as GraphSnapshot;
    const visitedCount = structure.nodes.filter((n) => n.visited).length;
    // Partway through a BFS over 10 connected nodes, some but not all should be visited.
    expect(visitedCount).toBeGreaterThan(0);
    expect(visitedCount).toBeLessThan(structure.nodes.length);
  });

  describe("matches the naive full-replay reference at every step", () => {
    const sizes = [1, 2, 5, 12, 20];
    const snapshotTargets = [1, 5, 200];

    for (const size of sizes) {
      for (const targetCount of snapshotTargets) {
        it(`size=${size}, targetCount=${targetCount}`, () => {
          const { initial, result } = runBfs(size, size * 1000 + targetCount);
          const snapshots = buildSnapshots(initial, result.events, targetCount);

          for (let step = -1; step < result.events.length; step++) {
            const fast = reconstructFrame(snapshots, result.events, step);
            const naive = reconstructFrameNaive(initial, result.events, step);
            expect(fast.structure).toEqual(naive.structure);
            expect(fast.activeEvent).toEqual(naive.activeEvent);
          }
        });
      }
    }
  });

  it("update-node-value/reject-edge replay to the same values the engine's own final snapshot has", () => {
    // Not a full toEqual(finalSnapshot) here, unlike the BFS test above:
    // this walk deliberately leaves n2/e1 untouched, and createInstrumentedGraph's
    // snapshot() always backfills visited/traversed to `false` for every
    // node/edge (see its nodeMap population) while a hand-built initial
    // GraphSnapshot like this test's leaves them simply absent — a
    // pre-existing, harmless divergence (StructureRendererProps callers only
    // ever check truthiness, where `false` and `undefined` read the same)
    // that just isn't what this test is about.
    const { initial, result } = runWeightedWalk();
    const snapshots = buildSnapshots(initial, result.events);
    const lastStep = result.events.at(-1)!.step;
    const frame = reconstructFrame(snapshots, result.events, lastStep);

    const structure = frame.structure as GraphSnapshot;
    const liveSnapshot = result.finalSnapshot as GraphSnapshot;
    expect(structure.nodes.find((n) => n.id === "n0")?.value).toBe(0);
    expect(structure.nodes.find((n) => n.id === "n1")?.value).toBe(5);
    expect(structure.edges.find((e) => e.id === "e2")?.rejected).toBe(true);
    // highlight-path: both endpoints of the (single) highlighted edge get
    // onPath, the untouched third node (n2) doesn't.
    expect(structure.nodes.find((n) => n.id === "n0")?.onPath).toBe(true);
    expect(structure.nodes.find((n) => n.id === "n1")?.onPath).toBe(true);
    expect(structure.nodes.find((n) => n.id === "n2")?.onPath).toBeFalsy();
    expect(structure.edges.find((e) => e.id === "e1")?.onPath).toBe(true);
    expect(structure.edges.find((e) => e.id === "e2")?.onPath).toBeFalsy();
    // Cross-check against the live engine's own idea of the same values.
    expect(structure.nodes.find((n) => n.id === "n0")?.value).toBe(liveSnapshot.nodes.find((n) => n.id === "n0")?.value);
    expect(structure.edges.find((e) => e.id === "e2")?.rejected).toBe(
      liveSnapshot.edges.find((e) => e.id === "e2")?.rejected,
    );
    expect(structure.nodes.find((n) => n.id === "n0")?.onPath).toBe(liveSnapshot.nodes.find((n) => n.id === "n0")?.onPath);
  });
});

describe("tree replay (insert-node building the structure from scratch, visit-node accumulating)", () => {
  it("at the final step matches the engine's own final snapshot", () => {
    const { initial, result } = runBst([5, 2, 8, 1, 9, 4]);
    const snapshots = buildSnapshots(initial, result.events);
    const lastStep = result.events.at(-1)!.step;
    const frame = reconstructFrame(snapshots, result.events, lastStep);
    expect(frame.structure).toEqual(result.finalSnapshot);
  });

  it("insert-node events grow the node count; the initial structure starts with none", () => {
    const { initial, result } = runBst([5, 2, 8]);
    expect((initial as TreeSnapshot).nodes).toEqual({});
    const snapshots = buildSnapshots(initial, result.events);
    const lastStep = result.events.at(-1)!.step;
    const frame = reconstructFrame(snapshots, result.events, lastStep);
    expect(Object.keys((frame.structure as TreeSnapshot).nodes)).toHaveLength(3);
  });

  describe("matches the naive full-replay reference at every step", () => {
    const sizes = [1, 2, 5, 12, 20];
    const snapshotTargets = [1, 5, 200];

    for (const size of sizes) {
      for (const targetCount of snapshotTargets) {
        it(`size=${size}, targetCount=${targetCount}`, () => {
          const { initial, result } = runBst(mulberrySeeded(size, size * 1000 + targetCount));
          const snapshots = buildSnapshots(initial, result.events, targetCount);

          for (let step = -1; step < result.events.length; step++) {
            const fast = reconstructFrame(snapshots, result.events, step);
            const naive = reconstructFrameNaive(initial, result.events, step);
            expect(fast.structure).toEqual(naive.structure);
            expect(fast.activeEvent).toEqual(naive.activeEvent);
          }
        });
      }
    }
  });
});

describe("linked-list replay (ll-insert/ll-delete/ll-reverse, including circular wraparound)", () => {
  it("at the final step matches the engine's own final snapshot, for each variant", () => {
    const ops: LlOp[] = [
      { type: "insertTail", value: 1 },
      { type: "insertTail", value: 2 },
      { type: "insertTail", value: 3 },
      { type: "insertHead", value: 0 },
    ];
    for (const variant of ["singly", "doubly", "circular"] as const) {
      const { initial, result } = runLinkedList(variant, ops);
      const snapshots = buildSnapshots(initial, result.events);
      const lastStep = result.events.at(-1)!.step;
      const frame = reconstructFrame(snapshots, result.events, lastStep);
      expect(frame.structure).toEqual(result.finalSnapshot);
    }
  });

  // Regression: a circular list's tail already wraps back to the head, so
  // "who points at the deleted node" finds the tail even when the deleted
  // node *was* the head — headId needs its own explicit update in that
  // case, not just whatever the generic predecessor search finds.
  it("regression: deleting a circular list's head still advances headId", () => {
    const ops: LlOp[] = [
      { type: "insertTail", value: 1 },
      { type: "insertTail", value: 2 },
      { type: "insertTail", value: 3 },
      { type: "delete", value: 1 }, // 1 is the head at this point
    ];
    const { initial, result } = runLinkedList("circular", ops);
    const snapshots = buildSnapshots(initial, result.events);
    const lastStep = result.events.at(-1)!.step;
    const frame = reconstructFrame(snapshots, result.events, lastStep);
    expect(frame.structure).toEqual(result.finalSnapshot);
  });

  describe("matches the naive full-replay reference at every step", () => {
    const opSets: LlOp[][] = [
      [
        { type: "insertTail", value: 1 },
        { type: "insertHead", value: 0 },
        { type: "insertTail", value: 2 },
        { type: "delete", value: 0 }, // head
        { type: "insertTail", value: 3 },
        { type: "delete", value: 3 }, // tail
        { type: "reverse" },
      ],
      [
        { type: "insertTail", value: 9 },
        { type: "delete", value: 9 }, // delete the only node
      ],
    ];

    for (const variant of ["singly", "doubly", "circular"] as const) {
      for (const [i, ops] of opSets.entries()) {
        it(`variant=${variant}, opSet=${i}`, () => {
          const { initial, result } = runLinkedList(variant, ops);
          // Small targetCount forces multiple keyframes despite the short op list.
          const snapshots = buildSnapshots(initial, result.events, 3);

          for (let step = -1; step < result.events.length; step++) {
            const fast = reconstructFrame(snapshots, result.events, step);
            const naive = reconstructFrameNaive(initial, result.events, step);
            expect(fast.structure).toEqual(naive.structure);
            expect(fast.activeEvent).toEqual(naive.activeEvent);
          }
        });
      }
    }
  });
});
