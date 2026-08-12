import {
  type AlgorithmInput,
  type DataStructureSnapshot,
  type InputConstraints,
} from "@algoviz/core";
import {
  generateExpression,
  generateLinkedListOperations,
  generateLinkedListPair,
  generateQueueOperations,
  generateRandomArray,
  generateRandomGraph,
  generateSearchTarget,
  generateSortedArray,
  generateStackOperations,
  type AlgorithmPlugin,
} from "@algoviz/algorithms";

/** What the "Size" slider means, labeled per input kind — same slider/state, different meaning per plugin. */
export const SIZE_LABELS: Partial<Record<AlgorithmInput["kind"], string>> = {
  graph: "Nodes",
  stack: "Operations",
  expression: "Operands",
  queue: "Operations",
  "circular-queue": "Operations",
  "linked-list": "Operations",
  "linked-list-pair": "List Size",
};

/**
 * Generates a fresh AlgorithmInput matching `constraints` — what shape of
 * data the algorithm consumes (an array of numbers, a graph, a scripted
 * stack-operation sequence, or a tokenized expression; a different axis
 * from *category*, since both sorting and tree algorithms consume
 * array-shaped input), whether it needs to already be sorted (Binary
 * Search), and whether it needs a `target` value alongside it (any search
 * algorithm) for `InputControls` to surface. `size` is reinterpreted per
 * kind — element count for an array, node count for a graph, operation
 * count for a stack, operand count for an expression — the same way
 * `InputControls`' "Size" slider already gets relabeled per kind.
 */
export function generateInputFor(constraints: InputConstraints | undefined, size: number): AlgorithmInput {
  if (constraints?.kind === "graph") return generateRandomGraph({ size, weighted: constraints.weighted });

  const [min, max] = constraints?.valueRange ?? [1, 100];

  if (constraints?.kind === "stack") {
    // Capacity scales with the requested operation count, not set to it
    // exactly, so isFull has a real chance to come up mid-sequence rather
    // than only ever right at the very end.
    const capacity = Math.max(1, Math.ceil(size * 0.8));
    return generateStackOperations(size, { min, max, capacity });
  }
  if (constraints?.kind === "expression") {
    return generateExpression(size, constraints.notation ?? "postfix", { min, max });
  }
  if (constraints?.kind === "queue" || constraints?.kind === "circular-queue") {
    // A circular queue's whole point is wraparound, so its capacity is
    // tighter relative to the operation count (forces multiple wraps in a
    // typical run) than a plain/deque queue's, which is just there to make
    // isFull occasionally reachable.
    const capacity =
      constraints.kind === "circular-queue" ? Math.max(1, Math.ceil(size / 3)) : Math.max(1, Math.ceil(size * 0.8));
    return generateQueueOperations(size, constraints.kind, { min, max, capacity, allowDeque: constraints.allowDeque });
  }
  if (constraints?.kind === "linked-list") {
    return generateLinkedListOperations(size, constraints.listVariant ?? "singly", { min, max });
  }
  if (constraints?.kind === "linked-list-pair") {
    return generateLinkedListPair(size, size, { min, max, sorted: constraints.sorted });
  }

  const base = constraints?.sorted ? generateSortedArray(size, min, max) : generateRandomArray({ size, min, max });
  if (!constraints?.needsTarget) return base;
  return { ...base, target: generateSearchTarget(base.values, { min, max }) };
}

/** The structure to show before any run — empty, but already the right kind/shape for this plugin's category. */
export function emptyStructureFor(plugin: AlgorithmPlugin | undefined, input: AlgorithmInput): DataStructureSnapshot {
  if (plugin?.metadata.category === "tree") return { kind: "tree", nodes: {}, rootId: null };
  if (plugin?.metadata.category === "stack") {
    return { kind: "stack", values: [], capacity: input.kind === "stack" ? input.capacity : undefined };
  }
  if (plugin?.metadata.category === "queue") {
    if (input.kind === "circular-queue") {
      const capacity = input.capacity ?? 1;
      return { kind: "circular-queue", slots: new Array(capacity).fill(null), front: 0, rear: 0, size: 0, capacity };
    }
    return { kind: "queue", values: [], capacity: input.kind === "queue" ? input.capacity : undefined };
  }
  if (plugin?.metadata.category === "linked-list") {
    // Merge/Comparison (`kind: "linked-list-pair"`) always build/compare
    // against a fresh singly list (see execute.ts) regardless of what the
    // source values' own variant would have been — there is none, a pair
    // input has no `variant` field.
    const variant = input.kind === "linked-list" ? input.variant : "singly";
    return { kind: "linked-list", variant, nodes: {}, headId: null };
  }
  if (input.kind === "graph") return { kind: "graph", nodes: input.nodes, edges: input.edges };
  if (input.kind === "array") return { kind: "array", values: input.values };
  // Only stack/expression/queue/circular-queue/linked-list/linked-list-pair
  // input kinds remain, all already handled by the category branches
  // above — unreachable in practice.
  return { kind: "array", values: [] };
}
