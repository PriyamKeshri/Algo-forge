import type { GraphEdge, GraphNode, LinkedListVariant } from "./structures";
import type { NodeId } from "./ids";

export interface ArrayInput {
  kind: "array";
  values: number[];
  /** Optional seed used to (re)generate `values`, for reproducible runs. */
  seed?: number;
  /** The value a search algorithm (Linear/Binary Search) looks for. Ignored by sorting algorithms. */
  target?: number;
}

export interface GraphInput {
  kind: "graph";
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Traversal algorithms (BFS/DFS) start here; algorithms that don't need one (e.g. a future "count components") can ignore it. */
  startNodeId?: NodeId;
  seed?: number;
}

/**
 * A scripted sequence of stack operations — the "Stack Operations" plugin
 * (Push/Pop/Peek/isEmpty/isFull) walks these in order, the same way BST
 * Insert walks `ArrayInput.values` to build a tree from nothing. Tree
 * algorithms similarly have no dedicated `TreeInput`: they build their
 * structure from a plain `ArrayInput` of values instead.
 */
export type StackOperation =
  | { type: "push"; value: number }
  | { type: "pop" }
  | { type: "peek" }
  | { type: "isEmpty" }
  | { type: "isFull" };

export interface StackInput {
  kind: "stack";
  operations: StackOperation[];
  /** Undefined = unbounded; only set to make an isFull check meaningful. */
  capacity?: number;
  seed?: number;
}

/** Postfix/Prefix Evaluation's input: a tokenized arithmetic expression, e.g. `["2", "3", "+", "4", "*"]` for postfix `(2 + 3) * 4`. */
export interface ExpressionInput {
  kind: "expression";
  tokens: string[];
  notation: "prefix" | "postfix";
  seed?: number;
}

/**
 * A scripted sequence of queue operations — shared by Queue Operations,
 * Deque Operations, and Circular Queue Operations (see StackOperation's
 * doc comment for the same "walk a scripted sequence" pattern). `end` is
 * only ever set by Deque Operations; Queue/Circular Queue Operations
 * always omit it, meaning the FIFO convention (enqueue → rear,
 * dequeue/peek → front).
 */
export type QueueOperation =
  | { type: "enqueue"; value: number; end?: "front" | "rear" }
  | { type: "dequeue"; end?: "front" | "rear" }
  | { type: "peek"; end?: "front" | "rear" }
  | { type: "isEmpty" }
  | { type: "isFull" };

/**
 * `kind` distinguishes a plain/deque queue (`InstrumentedQueue`, unbounded
 * unless `capacity` is set) from a circular queue (`InstrumentedCircularQueue`,
 * always fixed-size) — both share this same input shape since the
 * *operations* are what differ, not the input.
 */
export interface QueueInput {
  kind: "queue" | "circular-queue";
  operations: QueueOperation[];
  /** Undefined = unbounded for `kind: "queue"`; always required in practice for `kind: "circular-queue"` (a circular queue without a fixed size isn't one). */
  capacity?: number;
  seed?: number;
}

/**
 * A scripted sequence of linked-list operations — same "walk a scripted
 * sequence" pattern as StackOperation/QueueOperation. Shared by all three
 * variant plugins (Singly/Doubly/Circular Linked List Operations); which
 * variant's instrumented list the sequence runs against comes from
 * `LinkedListInput.variant`, not from the operations themselves.
 */
export type LinkedListOperation =
  | { type: "insertHead"; value: number }
  | { type: "insertTail"; value: number }
  | { type: "deleteValue"; value: number }
  | { type: "search"; value: number }
  | { type: "traverse" }
  | { type: "reverse" };

export interface LinkedListInput {
  kind: "linked-list";
  variant: LinkedListVariant;
  operations: LinkedListOperation[];
  seed?: number;
}

/**
 * A pair of independent value sequences — what Linked List Merge (combines
 * two sorted lists) and Linked List Comparison (walks both in lockstep)
 * need, instead of a single scripted operation log.
 */
export interface LinkedListPairInput {
  kind: "linked-list-pair";
  listA: number[];
  listB: number[];
  seed?: number;
}

export type AlgorithmInput =
  | ArrayInput
  | GraphInput
  | StackInput
  | ExpressionInput
  | QueueInput
  | LinkedListInput
  | LinkedListPairInput;

export interface InputConstraints {
  kind: AlgorithmInput["kind"];
  minSize: number;
  maxSize: number;
  defaultSize: number;
  valueRange?: [number, number];
  /** Generate a pre-sorted array for this plugin — Binary Search only works correctly against sorted input. Also used by `kind: "linked-list-pair"` plugins: Linked List Merge only produces a correctly sorted result off sorted input. */
  sorted?: boolean;
  /** Generate (and let the app's InputControls surface, editable) a `target` value for a search algorithm to look for. */
  needsTarget?: boolean;
  /** For `kind: "expression"` plugins — which notation to generate tokens in. */
  notation?: "prefix" | "postfix";
  /** For `kind: "queue"` plugins — generate operations that freely pick either end (Deque Operations) instead of always the FIFO end (Queue/Circular Queue Operations). */
  allowDeque?: boolean;
  /** For `kind: "linked-list"` plugins — which variant to generate operations for (Singly/Doubly/Circular Linked List Operations). */
  listVariant?: LinkedListVariant;
  /** For `kind: "graph"` plugins — generate a random weight on every edge (Dijkstra/Prim's/Kruskal's all need one; BFS/DFS don't care about weight at all). */
  weighted?: boolean;
}
