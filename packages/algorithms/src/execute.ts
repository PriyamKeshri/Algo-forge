import type { AlgorithmId, AlgorithmInput } from "@algoviz/core";
import {
  createInstrumentedArray,
  createInstrumentedCircularQueue,
  createInstrumentedGraph,
  createInstrumentedLinkedList,
  createInstrumentedQueue,
  createInstrumentedStack,
  createInstrumentedTree,
  MainThreadRunner,
  type AlgorithmGenerator,
  type RunnableContext,
  type RunOptions,
  type RunResult,
} from "@algoviz/engine";
import {
  algorithmRegistry,
  type CircularQueuePlugin,
  type ExpressionPlugin,
  type GraphPlugin,
  type LinkedListPairPlugin,
  type LinkedListPlugin,
  type QueuePlugin,
  type SearchingPlugin,
  type SortingPlugin,
  type StackPlugin,
  type TreePlugin,
} from "./registry";

export class UnknownAlgorithmError extends Error {
  constructor(id: AlgorithmId) {
    super(`Unknown algorithm id: "${id}".`);
    this.name = "UnknownAlgorithmError";
  }
}

export class UnsupportedInputError extends Error {
  constructor(id: AlgorithmId, input: AlgorithmInput) {
    super(`Algorithm "${id}" has no context strategy for input kind "${input.kind}".`);
    this.name = "UnsupportedInputError";
  }
}

export interface PreparedRun {
  generator: AlgorithmGenerator;
  ctx: RunnableContext;
}

/**
 * Looks up `pluginId` in the shared registry and builds the matching
 * instrumented context (tree/graph/array) for `input`, mirroring the
 * category/kind branching `apps/web/src/App.tsx`'s `run()` used to do by
 * hand. This is the one place that logic lives now, so it can be shared by
 * both an in-process runner (`MainThreadPluginRunner` below) and a
 * postMessage-driven one running inside a Web Worker (see
 * `worker-handler.ts`) — neither a live generator nor an instrumented
 * context is structured-cloneable, so a worker can only be handed the
 * plugin id + plain `input` and must reconstruct both itself, the same way
 * this function does.
 */
export function preparePluginRun(pluginId: AlgorithmId, input: AlgorithmInput): PreparedRun {
  const plugin = algorithmRegistry.get(pluginId);
  if (!plugin) {
    throw new UnknownAlgorithmError(pluginId);
  }

  // Branch on the plugin's *category* first (which instrumented context it
  // needs), then validate `input.kind` matches — not the other way around.
  // A generator function's body doesn't run until it's first `.next()`d, so
  // calling e.g. a graph plugin's `run(arrayInput, wrongCtx)` wouldn't fail
  // here if we matched on `input.kind` alone; it would fail confusingly
  // later, mid-drive, instead of with a clear error at prepare time.
  const category = plugin.metadata.category;

  if (category === "tree") {
    if (input.kind !== "array") throw new UnsupportedInputError(pluginId, input);
    const ctx = createInstrumentedTree();
    return { generator: (plugin as TreePlugin).run(input, ctx), ctx };
  }
  if (category === "graph") {
    if (input.kind !== "graph") throw new UnsupportedInputError(pluginId, input);
    const ctx = createInstrumentedGraph(input.nodes, input.edges);
    return { generator: (plugin as GraphPlugin).run(input, ctx), ctx };
  }
  if (category === "sorting" || category === "searching") {
    if (input.kind !== "array") throw new UnsupportedInputError(pluginId, input);
    const ctx = createInstrumentedArray(input.values);
    return { generator: (plugin as SortingPlugin | SearchingPlugin).run(input, ctx), ctx };
  }
  if (category === "stack") {
    // Two different input shapes share this category: a scripted operation
    // sequence (Stack Operations) or a tokenized expression (Postfix/Prefix
    // Evaluation) — both just need an (initially empty) InstrumentedStack
    // as their working structure.
    if (input.kind === "stack") {
      const ctx = createInstrumentedStack(input.capacity);
      return { generator: (plugin as StackPlugin).run(input, ctx), ctx };
    }
    if (input.kind === "expression") {
      const ctx = createInstrumentedStack();
      return { generator: (plugin as ExpressionPlugin).run(input, ctx), ctx };
    }
    throw new UnsupportedInputError(pluginId, input);
  }
  if (category === "queue") {
    // Two different input shapes/context types share this category: a
    // plain/deque scripted operation sequence (Queue Operations, Deque
    // Operations) or the fixed-capacity circular-buffer variant (Circular
    // Queue Operations) — mirrors the "stack" branch above.
    if (input.kind === "queue") {
      const ctx = createInstrumentedQueue(input.capacity);
      return { generator: (plugin as QueuePlugin).run(input, ctx), ctx };
    }
    if (input.kind === "circular-queue") {
      if (input.capacity === undefined) throw new UnsupportedInputError(pluginId, input);
      const ctx = createInstrumentedCircularQueue(input.capacity);
      return { generator: (plugin as CircularQueuePlugin).run(input, ctx), ctx };
    }
    throw new UnsupportedInputError(pluginId, input);
  }
  if (category === "linked-list") {
    // Two different input shapes/context types share this category: a
    // scripted operation sequence against a specific variant (Singly/
    // Doubly/Circular Linked List Operations) or a pair of plain value
    // sequences (Merge, Comparison) — mirrors the "stack"/"queue" branches
    // above. The pair plugins always build/compare against a fresh singly
    // list regardless of what variant their source values came from.
    if (input.kind === "linked-list") {
      const ctx = createInstrumentedLinkedList(input.variant);
      return { generator: (plugin as LinkedListPlugin).run(input, ctx), ctx };
    }
    if (input.kind === "linked-list-pair") {
      const ctx = createInstrumentedLinkedList("singly");
      return { generator: (plugin as LinkedListPairPlugin).run(input, ctx), ctx };
    }
    throw new UnsupportedInputError(pluginId, input);
  }

  throw new UnsupportedInputError(pluginId, input);
}

/**
 * The interface `apps/web` programs against: run a *plugin* by id against
 * an `AlgorithmInput`, rather than an already-built generator/ctx pair (see
 * `AlgorithmRunner` in `@algoviz/engine`'s runner.ts, which stays the
 * lower-level "drive this generator" primitive both implementations below
 * this line are built on top of).
 */
export interface PluginRunner {
  run(pluginId: AlgorithmId, input: AlgorithmInput, options?: RunOptions): Promise<RunResult>;
}

/**
 * In-process `PluginRunner`: `preparePluginRun` then hands off to the
 * existing chunked `MainThreadRunner`. This is the fallback for
 * environments without `Worker` (tests, and any non-browser host) and the
 * baseline `WorkerRunner` (apps/web/src/workers/worker-runner.ts) is
 * measured against.
 */
export class MainThreadPluginRunner implements PluginRunner {
  private readonly runner: MainThreadRunner;

  constructor(chunkSize?: number) {
    this.runner = new MainThreadRunner(chunkSize);
  }

  run(pluginId: AlgorithmId, input: AlgorithmInput, options: RunOptions = {}): Promise<RunResult> {
    const { generator, ctx } = preparePluginRun(pluginId, input);
    return this.runner.run(generator, ctx, options);
  }
}
