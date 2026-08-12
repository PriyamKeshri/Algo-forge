import type { EdgeId, NodeId } from "./ids";

export interface BaseEvent {
  type: string;
  /**
   * Monotonically increasing position of this event within a run. Assigned
   * at creation time by the instrumented data structure that produced it
   * (see packages/engine/src/instrument.ts), so it reflects true creation
   * order even across recursive/delegated generators (`yield*`).
   */
  step: number;
  /** Pseudocode line this event corresponds to (see AlgorithmMetadata.pseudocode). */
  line?: number;
  /** Real-source line this event corresponds to (see AlgorithmMetadata.sourceCode). Independent of `line` — the two snippets number differently. */
  sourceLine?: number;
  note?: string;
}

// --- Array/sorting/searching events -----------------------------------------

export interface CompareEvent extends BaseEvent {
  type: "compare";
  indices: [number, number];
  /** -1 if values[i] < values[j], 0 if equal, 1 if greater. */
  result: -1 | 0 | 1;
}

/**
 * An array-search counterpart to `CompareEvent`: compares `values[index]`
 * against an external `target` (not another array index) — what Linear/
 * Binary Search need instead of `CompareEvent`, the same way tree search
 * needed `CompareNodeEvent` alongside graph/tree's `VisitNodeEvent`.
 */
export interface CompareValueEvent extends BaseEvent {
  type: "compare-value";
  index: number;
  target: number;
  /** -1 if values[index] < target, 0 if equal, 1 if greater. */
  result: -1 | 0 | 1;
}

export interface SwapEvent extends BaseEvent {
  type: "swap";
  indices: [number, number];
}

export interface SetEvent extends BaseEvent {
  type: "set";
  index: number;
  value: number;
  previousValue?: number;
}

export interface ReadEvent extends BaseEvent {
  type: "read";
  index: number;
  value: number;
}

export interface HighlightEvent extends BaseEvent {
  type: "highlight";
  indices: number[];
  /** Free-form role for renderers to key styling off, e.g. "pivot", "window". */
  role?: string;
}

export interface MarkDoneEvent extends BaseEvent {
  type: "mark-done";
  indices: number[];
}

// --- Graph events (also reused by tree traversal — "visit a node by id" is
// identical for BFS/DFS and inorder/preorder/postorder walks) --------------

export interface VisitNodeEvent extends BaseEvent {
  type: "visit-node";
  nodeId: NodeId;
}

export interface TraverseEdgeEvent extends BaseEvent {
  type: "traverse-edge";
  edgeId: EdgeId;
}

/**
 * Annotates a node with a number — Dijkstra's tentative distance, Prim's
 * key value. Generic rather than algorithm-specific (no separate
 * DistanceEvent/KeyEvent) since both are "this node's current best-known
 * numeric value," the same relationship CompareEvent/CompareNodeEvent have
 * to each other for "compare a value against something."
 */
export interface UpdateNodeValueEvent extends BaseEvent {
  type: "update-node-value";
  nodeId: NodeId;
  value: number;
}

/** Kruskal's: an edge examined and excluded because both endpoints were already in the same component (accepting it would close a cycle). The accepted-into-the-MST case reuses TraverseEdgeEvent — this is only for the rejected case, which needs its own persistent visual state to read as "considered, not just ignored." */
export interface RejectEdgeEvent extends BaseEvent {
  type: "reject-edge";
  edgeId: EdgeId;
}

// --- Tree events ------------------------------------------------------------

/** Declared now for a future self-balancing tree algorithm (AVL/red-black); unused until then. */
export interface RotateEvent extends BaseEvent {
  type: "rotate";
  nodeId: NodeId;
  direction: "left" | "right";
}

export interface InsertNodeEvent extends BaseEvent {
  type: "insert-node";
  nodeId: NodeId;
  value: number;
  parentId?: NodeId;
  /** Which of the parent's binary slots this node fills. Omitted for a root insert or a non-binary tree. */
  side?: "left" | "right";
}

/**
 * A tree-node counterpart to `CompareEvent`: compares `value` against the
 * value already stored at `nodeId` (not two array indices, since tree nodes
 * are addressed by id, not position). `result` follows the same convention:
 * -1 if `value` < the node's value, 0 if equal, 1 if greater.
 */
export interface CompareNodeEvent extends BaseEvent {
  type: "compare-node";
  nodeId: NodeId;
  value: number;
  result: -1 | 0 | 1;
}

// --- Stack events -------------------------------------------------------
// Peeking the top reuses ReadEvent (`{ index: size - 1, value }`) rather
// than getting its own type — peeking the top *is* "read the value at the
// top index," the same relationship Binary Search's `read(mid)` already
// has to "check the middle element."

export interface PushEvent extends BaseEvent {
  type: "push";
  value: number;
}

export interface PopEvent extends BaseEvent {
  type: "pop";
  /** The value that was popped — no longer present in the structure by the time this event is rendered, so it has to travel on the event itself. */
  value: number;
}

/** isEmpty/isFull checks — no existing event carries a boolean result, which the renderer needs to show. */
export interface StackCheckEvent extends BaseEvent {
  type: "stack-check";
  check: "isEmpty" | "isFull";
  result: boolean;
}

// --- Queue events ---------------------------------------------------------
// Peeking reuses ReadEvent too (index 0 for front, values.length - 1 for
// rear) — same reasoning as the stack section above.

export interface EnqueueEvent extends BaseEvent {
  type: "enqueue";
  value: number;
  /**
   * Which end this touched. Omitted means the FIFO convention (enqueue at
   * the rear) both a plain queue and the circular queue always use —
   * `end` only ever gets set by the deque plugin, which is what lets one
   * `InstrumentedQueue` serve both without two near-identical event types.
   */
  end?: "front" | "rear";
}

export interface DequeueEvent extends BaseEvent {
  type: "dequeue";
  /** The value that was dequeued — no longer present in the structure by the time this event is rendered, so it has to travel on the event itself. */
  value: number;
  /** Omitted means the FIFO convention (dequeue from the front) — see EnqueueEvent.end. */
  end?: "front" | "rear";
}

/**
 * isEmpty/isFull checks for a queue — mirrors `StackCheckEvent` rather than
 * sharing it, matching the codebase's per-family-type convention (see
 * `CompareEvent`/`CompareValueEvent`/`CompareNodeEvent`).
 */
export interface QueueCheckEvent extends BaseEvent {
  type: "queue-check";
  check: "isEmpty" | "isFull";
  result: boolean;
}

// --- Linked list events ---------------------------------------------------
// Traversal/search reuse VisitNodeEvent/CompareNodeEvent — "visit/compare a
// node by id" is identical to graph/tree. Insertion/deletion/reversal get
// their own types since a list splices pointers, not array indices.

export interface LinkedListInsertEvent extends BaseEvent {
  type: "ll-insert";
  nodeId: NodeId;
  value: number;
  /** Node the new one gets spliced in after; undefined = new head. */
  afterId?: NodeId;
}

export interface LinkedListDeleteEvent extends BaseEvent {
  type: "ll-delete";
  nodeId: NodeId;
  /** The value that was removed — gone from the structure by the time this renders, so it travels on the event (mirrors PopEvent/DequeueEvent). */
  value: number;
}

export interface LinkedListReverseEvent extends BaseEvent {
  type: "ll-reverse";
  /** Node ids in their new head-to-tail order. */
  order: NodeId[];
}

export type VisualizationEvent =
  | CompareEvent
  | CompareValueEvent
  | SwapEvent
  | SetEvent
  | ReadEvent
  | HighlightEvent
  | MarkDoneEvent
  | VisitNodeEvent
  | TraverseEdgeEvent
  | RotateEvent
  | InsertNodeEvent
  | CompareNodeEvent
  | PushEvent
  | PopEvent
  | StackCheckEvent
  | EnqueueEvent
  | DequeueEvent
  | QueueCheckEvent
  | LinkedListInsertEvent
  | LinkedListDeleteEvent
  | LinkedListReverseEvent
  | UpdateNodeValueEvent
  | RejectEdgeEvent;

/** Event types that mutate the underlying structure (relevant to timeline replay). */
export const MUTATING_EVENT_TYPES = new Set<VisualizationEvent["type"]>([
  "swap",
  "set",
  "rotate",
  "insert-node",
  "visit-node",
  "traverse-edge",
  "push",
  "pop",
  "enqueue",
  "dequeue",
  "ll-insert",
  "ll-delete",
  "ll-reverse",
  "update-node-value",
  "reject-edge",
]);

export function isMutatingEvent(event: VisualizationEvent): boolean {
  return MUTATING_EVENT_TYPES.has(event.type);
}
