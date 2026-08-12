import type { EdgeId, NodeId } from "./ids";

export interface ArraySnapshot<T = number> {
  kind: "array";
  values: T[];
}

export interface GraphNode<T = unknown> {
  id: NodeId;
  label?: string;
  data?: T;
  position?: { x: number; y: number };
  /**
   * Persistent traversal state, set by replaying a `visit-node` event (see
   * packages/engine/src/timeline.ts's applyEvent) — not just the current
   * instant's activeEvent. Baked directly into the node (like an array's
   * `values` are the array) rather than derived at render time, so the
   * renderer can show "visited so far," not only "visited right now."
   */
  visited?: boolean;
  /**
   * A generic persistent numeric annotation, set by replaying an
   * `update-node-value` event — what this node's "distance" (Dijkstra) or
   * "key" (Prim's) is currently known to be. Undefined means "no value
   * assigned yet" (BFS/DFS never set this at all), not zero.
   */
  value?: number;
}

export interface GraphEdge<T = unknown> {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
  weight?: number;
  directed?: boolean;
  data?: T;
  /** Persistent traversal state — see GraphNode.visited. Set by replaying a `traverse-edge` event. */
  traversed?: boolean;
  /** Persistent "considered but excluded" state (Kruskal's: would have closed a cycle) — set by replaying a `reject-edge` event. Mutually exclusive with `traversed` in practice, but not enforced at the type level. */
  rejected?: boolean;
}

/** Real graph algorithms (BFS, DFS) and GraphRenderer are implemented; the interactive editor is not yet. */
export interface GraphSnapshot<T = unknown> {
  kind: "graph";
  nodes: GraphNode<T>[];
  edges: GraphEdge<T>[];
}

export interface TreeNode<T = number> {
  id: NodeId;
  value: T;
  /**
   * Generic child list, for future n-ary tree algorithms — kept in sync
   * with `left`/`right` ([left, right].filter(Boolean)) by binary tree
   * algorithms, which use `left`/`right` directly instead since a plain
   * array can't distinguish "only a right child" from "only a left child."
   */
  children: NodeId[];
  parent?: NodeId;
  left?: NodeId;
  right?: NodeId;
  /** Persistent "touched during this run" state — see GraphNode.visited for the same role. Set true on insert as well as on traversal-visit, so a tree visibly fills in as it's built. */
  visited?: boolean;
}

/** Real tree algorithms (BST Insert, Inorder Traversal) and TreeRenderer are implemented; the interactive editor is not yet. */
export interface TreeSnapshot<T = number> {
  kind: "tree";
  nodes: Record<string, TreeNode<T>>;
  rootId: NodeId | null;
}

/**
 * Unlike array/graph/tree elements, a stack element needs no persistent
 * identity — there's no "revisit" concept, so it's just an ordered array
 * with LIFO semantics baked into how `InstrumentedStack` mutates it
 * (packages/engine/src/instrument-stack.ts).
 */
export interface StackSnapshot {
  kind: "stack";
  /** `values[values.length - 1]` is the top. */
  values: number[];
  /** Undefined = unbounded; only set to make `isFull` meaningful. */
  capacity?: number;
}

/**
 * A plain FIFO queue and a deque share this shape — structurally identical
 * (an ordered list with a front and a rear end); the only difference is
 * *which* ends a given plugin's operations touch, not the data shape
 * itself. See `InstrumentedQueue` (packages/engine/src/instrument-queue.ts).
 */
export interface QueueSnapshot {
  kind: "queue";
  /** `values[0]` is the front, `values[values.length - 1]` is the rear. */
  values: number[];
  /** Undefined = unbounded; only set to make `isFull` meaningful. */
  capacity?: number;
}

/**
 * Deliberately *not* the same shape as `QueueSnapshot` — a circular queue
 * is a fixed-size buffer with wraparound front/rear pointers, and losing
 * the empty slots or the pointer positions would lose the entire point of
 * visualizing it. `slots` is the raw fixed-size backing array (length
 * always equals `capacity`); `front`/`rear` are indices into it.
 */
export interface CircularQueueSnapshot {
  kind: "circular-queue";
  slots: (number | null)[];
  front: number;
  rear: number;
  size: number;
  capacity: number;
}

/** Which pointer discipline a linked list follows — see `LinkedListSnapshot`. */
export type LinkedListVariant = "singly" | "doubly" | "circular";

export interface LinkedListNode<T = number> {
  id: NodeId;
  value: T;
  next?: NodeId;
  /** Only ever set for `variant: "doubly"`; re-derived from `next` after every mutation rather than tracked independently. */
  prev?: NodeId;
  /** Persistent "touched during this run" state — see GraphNode.visited for the same role. */
  visited?: boolean;
}

/**
 * One shape for all three list types — `variant` says whether `prev` is
 * meaningful (`doubly`) and whether the last node's `next` wraps back to
 * `headId` (`circular`) rather than being `undefined`; the node/pointer
 * shape itself doesn't change. Like `StackSnapshot`/`QueueSnapshot`, a list
 * starts empty and grows via insert operations.
 */
export interface LinkedListSnapshot<T = number> {
  kind: "linked-list";
  variant: LinkedListVariant;
  nodes: Record<string, LinkedListNode<T>>;
  headId: NodeId | null;
}

/**
 * Unified, kind-discriminated shape for "the thing being visualized."
 * `array`, `graph`, `tree`, `stack`, `queue`, `circular-queue`, and
 * `linked-list` all have real algorithms/instrumentation/renderer support;
 * the union is designed so a future kind (e.g. a different structure
 * family) extends it rather than replacing it.
 */
export type DataStructureSnapshot =
  | ArraySnapshot
  | GraphSnapshot
  | TreeSnapshot
  | StackSnapshot
  | QueueSnapshot
  | CircularQueueSnapshot
  | LinkedListSnapshot;

export function cloneSnapshot<S extends DataStructureSnapshot>(snapshot: S): S {
  switch (snapshot.kind) {
    case "array":
      return { kind: "array", values: [...snapshot.values] } as S;
    case "graph":
      return {
        kind: "graph",
        nodes: snapshot.nodes.map((n) => ({ ...n, position: n.position ? { ...n.position } : undefined })),
        edges: snapshot.edges.map((e) => ({ ...e })),
      } as S;
    case "tree":
      return {
        kind: "tree",
        rootId: snapshot.rootId,
        nodes: Object.fromEntries(
          Object.entries(snapshot.nodes).map(([id, node]) => [id, { ...node, children: [...node.children] }]),
        ),
      } as S;
    case "stack":
      return { kind: "stack", values: [...snapshot.values], capacity: snapshot.capacity } as S;
    case "queue":
      return { kind: "queue", values: [...snapshot.values], capacity: snapshot.capacity } as S;
    case "circular-queue":
      return {
        kind: "circular-queue",
        slots: [...snapshot.slots],
        front: snapshot.front,
        rear: snapshot.rear,
        size: snapshot.size,
        capacity: snapshot.capacity,
      } as S;
    case "linked-list":
      return {
        kind: "linked-list",
        variant: snapshot.variant,
        headId: snapshot.headId,
        nodes: Object.fromEntries(Object.entries(snapshot.nodes).map(([id, node]) => [id, { ...node }])),
      } as S;
  }
}
