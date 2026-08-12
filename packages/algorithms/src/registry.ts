import type {
  AlgorithmCategory,
  AlgorithmId,
  AlgorithmInput,
  AlgorithmMetadata,
  ArrayInput,
  ExpressionInput,
  GraphInput,
  InputConstraints,
  LinkedListInput,
  LinkedListPairInput,
  QueueInput,
  StackInput,
} from "@algoviz/core";
import type {
  AlgorithmGenerator,
  InstrumentedArray,
  InstrumentedCircularQueue,
  InstrumentedGraph,
  InstrumentedLinkedList,
  InstrumentedQueue,
  InstrumentedStack,
  InstrumentedTree,
} from "@algoviz/engine";

/**
 * The contract every algorithm family implements. `TContext` is whatever
 * instrumented structure the algorithm operates on (`InstrumentedArray` for
 * sorting/searching, `InstrumentedGraph` for graph algorithms,
 * `InstrumentedTree` for tree algorithms). `run` returns a generator that
 * only ever *publishes* events — see packages/engine/src/instrument.ts.
 *
 * Declared with method syntax (`run(...)`, not `run: (...) => ...`) so that
 * differently-instantiated plugins (e.g. `SortingPlugin`, `GraphPlugin`) are
 * structurally assignable to the general `AlgorithmPlugin` the registry
 * stores against — TypeScript checks method parameters bivariantly, which
 * is what makes a heterogeneous plugin registry like this one typecheck
 * without `any`.
 */
export interface AlgorithmPlugin<TInput extends AlgorithmInput = AlgorithmInput, TContext = unknown> {
  metadata: AlgorithmMetadata;
  inputConstraints: InputConstraints;
  run(input: TInput, ctx: TContext): AlgorithmGenerator;
}

/** Array algorithms (Bubble/Insertion/Merge/Quick Sort) driven by InstrumentedArray. */
export type SortingPlugin = AlgorithmPlugin<ArrayInput, InstrumentedArray>;

/**
 * Array *search* algorithms (Linear/Binary Search) — structurally identical
 * to `SortingPlugin` (both drive an `InstrumentedArray` off `ArrayInput`),
 * but named separately since `AlgorithmMetadata.category` distinguishes
 * "sorting" from "searching" and a plugin's declared type should say which
 * family it actually belongs to.
 */
export type SearchingPlugin = AlgorithmPlugin<ArrayInput, InstrumentedArray>;

/** Graph algorithms (BFS, DFS, ...) driven by InstrumentedGraph. */
export type GraphPlugin = AlgorithmPlugin<GraphInput, InstrumentedGraph>;

/**
 * Tree algorithms (BST Insert, Inorder Traversal, ...) driven by
 * InstrumentedTree. Input is `ArrayInput` (a plain sequence of numbers to
 * insert), not a dedicated tree-shaped input type — the tree itself starts
 * empty and is built by the plugin, so there's no existing structure to
 * describe upfront the way GraphInput describes a graph's nodes/edges.
 */
export type TreePlugin = AlgorithmPlugin<ArrayInput, InstrumentedTree>;

/** Stack Operations (Push/Pop/Peek/isEmpty/isFull), driven by InstrumentedStack against a scripted operation sequence. */
export type StackPlugin = AlgorithmPlugin<StackInput, InstrumentedStack>;

/** Postfix/Prefix Evaluation — also driven by InstrumentedStack (that's the algorithm's working structure), but off a tokenized expression rather than a scripted operation sequence. */
export type ExpressionPlugin = AlgorithmPlugin<ExpressionInput, InstrumentedStack>;

/** Queue Operations and Deque Operations — both driven by InstrumentedQueue off a scripted operation sequence (`QueueInput.kind === "queue"`); Deque Operations is the one that actually sets `end` on enqueue/dequeue/peek. */
export type QueuePlugin = AlgorithmPlugin<QueueInput, InstrumentedQueue>;

/** Circular Queue Operations — same scripted-sequence input shape as QueuePlugin (`QueueInput.kind === "circular-queue"`), but driven by InstrumentedCircularQueue instead. */
export type CircularQueuePlugin = AlgorithmPlugin<QueueInput, InstrumentedCircularQueue>;

/** Singly/Doubly/Circular Linked List Operations — a scripted operation sequence against InstrumentedLinkedList; which variant's list it runs against comes from `LinkedListInput.variant`. */
export type LinkedListPlugin = AlgorithmPlugin<LinkedListInput, InstrumentedLinkedList>;

/** Linked List Merge and Linked List Comparison — driven by a pair of plain value sequences rather than a scripted operation log; both build/compare against a fresh (always-singly) InstrumentedLinkedList. */
export type LinkedListPairPlugin = AlgorithmPlugin<LinkedListPairInput, InstrumentedLinkedList>;

export class DuplicateAlgorithmError extends Error {
  constructor(id: AlgorithmId) {
    super(`Algorithm "${id}" is already registered.`);
    this.name = "DuplicateAlgorithmError";
  }
}

export class AlgorithmRegistry {
  private readonly plugins = new Map<AlgorithmId, AlgorithmPlugin>();

  register(plugin: AlgorithmPlugin): void {
    if (this.plugins.has(plugin.metadata.id)) {
      throw new DuplicateAlgorithmError(plugin.metadata.id);
    }
    this.plugins.set(plugin.metadata.id, plugin);
  }

  /**
   * Registers a plugin, silently replacing any existing registration with
   * the same id. Family index files (sorting/index.ts, and future
   * searching/graph/tree/dp equivalents) use this instead of `register()`
   * for their module-level side-effect registration, because a dev-mode
   * hot reload can legitimately re-execute that side effect when an
   * unrelated edit propagates through the module graph — `register()`'s
   * duplicate-id guard exists to catch a real authoring mistake (two
   * different plugins colliding on one id), not to reject a family
   * re-registering its own plugins after a hot reload.
   */
  registerReplacing(plugin: AlgorithmPlugin): void {
    this.plugins.set(plugin.metadata.id, plugin);
  }

  get(id: AlgorithmId): AlgorithmPlugin | undefined {
    return this.plugins.get(id);
  }

  getByCategory(category: AlgorithmCategory): AlgorithmPlugin[] {
    return [...this.plugins.values()].filter((plugin) => plugin.metadata.category === category);
  }

  list(): AlgorithmMetadata[] {
    return [...this.plugins.values()].map((plugin) => plugin.metadata);
  }

  /** Test/dev utility for resetting between test cases — not used by production code paths. */
  clear(): void {
    this.plugins.clear();
  }
}

/** Shared, process-wide registry. Algorithm family index files (e.g. sorting/index.ts) register into this via side-effect import. */
export const algorithmRegistry = new AlgorithmRegistry();
