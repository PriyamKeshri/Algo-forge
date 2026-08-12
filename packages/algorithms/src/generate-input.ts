import type {
  ArrayInput,
  ExpressionInput,
  LinkedListInput,
  LinkedListOperation,
  LinkedListPairInput,
  LinkedListVariant,
  QueueInput,
  QueueOperation,
  StackInput,
  StackOperation,
} from "@algoviz/core";

export interface GenerateArrayOptions {
  size: number;
  seed?: number;
  min?: number;
  max?: number;
}

/** Small deterministic PRNG (mulberry32) so a given seed always reproduces the same array. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateRandomArray(options: GenerateArrayOptions): ArrayInput {
  const { size, min = 1, max = 100 } = options;
  const seed = options.seed ?? Math.floor(Math.random() * 0xffffffff);
  const rand = mulberry32(seed);
  const values = Array.from({ length: size }, () => Math.floor(rand() * (max - min + 1)) + min);
  return { kind: "array", values, seed };
}

export function generateSortedArray(size: number, min = 1, max = 100): ArrayInput {
  if (size <= 0) return { kind: "array", values: [] };
  const step = size === 1 ? 0 : (max - min) / (size - 1);
  const values = Array.from({ length: size }, (_, i) => Math.round(min + step * i));
  return { kind: "array", values };
}

export function generateReversedArray(size: number, min = 1, max = 100): ArrayInput {
  const sorted = generateSortedArray(size, min, max);
  return { kind: "array", values: [...sorted.values].reverse() };
}

export function generateArrayFromValues(values: number[]): ArrayInput {
  return { kind: "array", values: [...values] };
}

export interface GenerateSearchTargetOptions {
  seed?: number;
  min?: number;
  max?: number;
}

/**
 * Picks a value for a search algorithm (Linear/Binary Search) to look for
 * against `values`. About 60% of the time it's an existing element (so the
 * common case a player sees is "found"); the rest of the time it's just a
 * random value in `[min, max]`, which usually — but not always, since the
 * range can coincidentally still land on a present value — demonstrates
 * the not-found path too. Takes its own seed (independent of whatever
 * generated `values`) so picking a target never perturbs `values`' own
 * reproducibility.
 */
export function generateSearchTarget(values: readonly number[], options: GenerateSearchTargetOptions = {}): number {
  const { min = 1, max = 100 } = options;
  const seed = options.seed ?? Math.floor(Math.random() * 0xffffffff);
  const rand = mulberry32(seed);
  if (values.length > 0 && rand() < 0.6) {
    return values[Math.floor(rand() * values.length)]!;
  }
  return Math.floor(rand() * (max - min + 1)) + min;
}

export interface GenerateStackOperationsOptions {
  seed?: number;
  min?: number;
  max?: number;
  /** Undefined = unbounded (isFull always reports false; no push in the generated sequence can fail). */
  capacity?: number;
}

/**
 * Generates a `size`-long sequence of stack operations that's always
 * *valid to execute* — it tracks a virtual stack size while picking ops,
 * so it never emits a `pop`/`peek` against an empty stack or a `push`
 * past `capacity`; `isEmpty`/`isFull` checks are unconditionally valid and
 * get mixed in throughout. `push` is weighted heavier while the virtual
 * stack is still under half the target length, so the sequence builds up
 * before it starts draining, rather than oscillating near-empty the whole
 * way through.
 */
export function generateStackOperations(size: number, options: GenerateStackOperationsOptions = {}): StackInput {
  const { min = 1, max = 100, capacity } = options;
  const seed = options.seed ?? Math.floor(Math.random() * 0xffffffff);
  const rand = mulberry32(seed);

  const operations: StackOperation[] = [];
  let virtualSize = 0;

  for (let i = 0; i < size; i++) {
    const canPop = virtualSize > 0;
    const canPush = capacity === undefined || virtualSize < capacity;

    const pushWeight = canPush ? (virtualSize < size / 2 ? 3 : 1) : 0;
    const popWeight = canPop ? 1 : 0;
    const peekWeight = canPop ? 1 : 0;
    const isEmptyWeight = 0.5; // always valid, so always a nonzero option — guarantees `total` is never 0
    const isFullWeight = capacity !== undefined ? 0.5 : 0;

    const total = pushWeight + popWeight + peekWeight + isEmptyWeight + isFullWeight;
    let roll = rand() * total;

    if ((roll -= pushWeight) < 0) {
      const value = Math.floor(rand() * (max - min + 1)) + min;
      operations.push({ type: "push", value });
      virtualSize++;
    } else if ((roll -= popWeight) < 0) {
      operations.push({ type: "pop" });
      virtualSize--;
    } else if ((roll -= peekWeight) < 0) {
      operations.push({ type: "peek" });
    } else if ((roll -= isEmptyWeight) < 0) {
      operations.push({ type: "isEmpty" });
    } else {
      operations.push({ type: "isFull" });
    }
  }

  return { kind: "stack", operations, capacity, seed };
}

interface ExpressionTreeNode {
  operand?: number;
  operator?: string;
  left?: ExpressionTreeNode;
  right?: ExpressionTreeNode;
}

// Division deliberately excluded — keeps every intermediate result a plain
// integer, so Postfix/Prefix Evaluation never has to display or reason
// about fractions (or guard against dividing by zero).
const EXPRESSION_OPERATORS = ["+", "-", "*"];

function buildExpressionTree(operandCount: number, rand: () => number, min: number, max: number): ExpressionTreeNode {
  if (operandCount <= 1) {
    return { operand: Math.floor(rand() * (max - min + 1)) + min };
  }
  const split = 1 + Math.floor(rand() * (operandCount - 1)); // left gets 1..operandCount-1 operands
  const left = buildExpressionTree(split, rand, min, max);
  const right = buildExpressionTree(operandCount - split, rand, min, max);
  const operator = EXPRESSION_OPERATORS[Math.floor(rand() * EXPRESSION_OPERATORS.length)]!;
  return { operator, left, right };
}

function serializeExpression(node: ExpressionTreeNode, notation: "prefix" | "postfix", tokens: string[]): void {
  if (node.operand !== undefined) {
    tokens.push(String(node.operand));
    return;
  }
  if (notation === "prefix") tokens.push(node.operator!);
  serializeExpression(node.left!, notation, tokens);
  serializeExpression(node.right!, notation, tokens);
  if (notation === "postfix") tokens.push(node.operator!);
}

export interface GenerateExpressionOptions {
  seed?: number;
  min?: number;
  max?: number;
}

/**
 * Builds a random arithmetic expression tree with `operandCount` operand
 * leaves and `operandCount - 1` operator nodes, then serializes it as
 * postfix or prefix tokens — guaranteed syntactically and semantically
 * valid (always fully evaluable) by construction, unlike generating tokens
 * directly, which could easily produce an unbalanced/invalid stream.
 */
export function generateExpression(
  operandCount: number,
  notation: "prefix" | "postfix",
  options: GenerateExpressionOptions = {},
): ExpressionInput {
  const { min = 1, max = 20 } = options; // smaller default range than arrays' — keeps multiplied-out results readable
  const seed = options.seed ?? Math.floor(Math.random() * 0xffffffff);
  const rand = mulberry32(seed);

  const tree = buildExpressionTree(Math.max(1, operandCount), rand, min, max);
  const tokens: string[] = [];
  serializeExpression(tree, notation, tokens);

  return { kind: "expression", tokens, notation, seed };
}

export interface GenerateQueueOperationsOptions {
  seed?: number;
  min?: number;
  max?: number;
  /** Undefined = unbounded for `kind: "queue"`; always required for `kind: "circular-queue"`. */
  capacity?: number;
  /** Freely pick either end for enqueue/dequeue/peek (Deque Operations) instead of always the FIFO end (Queue/Circular Queue Operations). */
  allowDeque?: boolean;
}

/**
 * Generates a `size`-long sequence of queue operations that's always valid
 * to execute — same validity-by-construction approach as
 * `generateStackOperations` (tracks a virtual size while picking ops, so
 * it never dequeues/peeks an empty queue or enqueues past `capacity`).
 * One generator covers all three queue plugins: `kind` picks which input
 * literal gets stamped on the result, and `allowDeque` picks whether
 * enqueue/dequeue/peek target a random end or always the FIFO one.
 */
export function generateQueueOperations(
  size: number,
  kind: "queue" | "circular-queue",
  options: GenerateQueueOperationsOptions = {},
): QueueInput {
  const { min = 1, max = 100, capacity, allowDeque = false } = options;
  const seed = options.seed ?? Math.floor(Math.random() * 0xffffffff);
  const rand = mulberry32(seed);

  const operations: QueueOperation[] = [];
  let virtualSize = 0;
  const pickEnd = (): "front" | "rear" | undefined => (allowDeque ? (rand() < 0.5 ? "front" : "rear") : undefined);

  for (let i = 0; i < size; i++) {
    const canRemove = virtualSize > 0;
    const canAdd = capacity === undefined || virtualSize < capacity;

    const enqueueWeight = canAdd ? (virtualSize < size / 2 ? 3 : 1) : 0;
    const dequeueWeight = canRemove ? 1 : 0;
    const peekWeight = canRemove ? 1 : 0;
    const isEmptyWeight = 0.5; // always valid, so always a nonzero option — guarantees `total` is never 0
    const isFullWeight = capacity !== undefined ? 0.5 : 0;

    const total = enqueueWeight + dequeueWeight + peekWeight + isEmptyWeight + isFullWeight;
    let roll = rand() * total;

    if ((roll -= enqueueWeight) < 0) {
      const value = Math.floor(rand() * (max - min + 1)) + min;
      operations.push({ type: "enqueue", value, end: pickEnd() });
      virtualSize++;
    } else if ((roll -= dequeueWeight) < 0) {
      operations.push({ type: "dequeue", end: pickEnd() });
      virtualSize--;
    } else if ((roll -= peekWeight) < 0) {
      operations.push({ type: "peek", end: pickEnd() });
    } else if ((roll -= isEmptyWeight) < 0) {
      operations.push({ type: "isEmpty" });
    } else {
      operations.push({ type: "isFull" });
    }
  }

  return { kind, operations, capacity, seed };
}

export interface GenerateLinkedListOperationsOptions {
  seed?: number;
  min?: number;
  max?: number;
}

/**
 * Generates a `size`-long sequence of linked-list operations, valid by
 * construction the same way `generateStackOperations`/
 * `generateQueueOperations` are — a virtual list tracks what's currently
 * present, so `deleteValue`/`search`/`traverse`/`reverse` never target an
 * empty list. Insert operations are weighted heavier while the virtual
 * list is still under half the target length, mirroring the same "build up
 * before draining" shape those two generators use.
 */
export function generateLinkedListOperations(
  size: number,
  variant: LinkedListVariant,
  options: GenerateLinkedListOperationsOptions = {},
): LinkedListInput {
  const { min = 1, max = 100 } = options;
  const seed = options.seed ?? Math.floor(Math.random() * 0xffffffff);
  const rand = mulberry32(seed);

  const operations: LinkedListOperation[] = [];
  const virtual: number[] = [];

  for (let i = 0; i < size; i++) {
    const canRemove = virtual.length > 0;
    const growing = virtual.length < size / 2;

    const insertHeadWeight = growing ? 3 : 1;
    const insertTailWeight = growing ? 3 : 1;
    const deleteWeight = canRemove ? 1.5 : 0;
    const searchWeight = canRemove ? 1 : 0;
    const traverseWeight = canRemove ? 0.75 : 0;
    const reverseWeight = canRemove ? 0.5 : 0;

    const total = insertHeadWeight + insertTailWeight + deleteWeight + searchWeight + traverseWeight + reverseWeight;
    let roll = rand() * total;

    if ((roll -= insertHeadWeight) < 0) {
      const value = Math.floor(rand() * (max - min + 1)) + min;
      operations.push({ type: "insertHead", value });
      virtual.unshift(value);
    } else if ((roll -= insertTailWeight) < 0) {
      const value = Math.floor(rand() * (max - min + 1)) + min;
      operations.push({ type: "insertTail", value });
      virtual.push(value);
    } else if ((roll -= deleteWeight) < 0) {
      const idx = Math.floor(rand() * virtual.length);
      const [value] = virtual.splice(idx, 1);
      operations.push({ type: "deleteValue", value: value! });
    } else if ((roll -= searchWeight) < 0) {
      operations.push({ type: "search", value: virtual[Math.floor(rand() * virtual.length)]! });
    } else if ((roll -= traverseWeight) < 0) {
      operations.push({ type: "traverse" });
    } else {
      operations.push({ type: "reverse" });
      virtual.reverse();
    }
  }

  return { kind: "linked-list", variant, operations, seed };
}

export interface GenerateLinkedListPairOptions {
  seed?: number;
  min?: number;
  max?: number;
  /** Generates two already-sorted lists — Linked List Merge only produces a correctly sorted result off sorted input. */
  sorted?: boolean;
}

export function generateLinkedListPair(
  sizeA: number,
  sizeB: number,
  options: GenerateLinkedListPairOptions = {},
): LinkedListPairInput {
  const { min = 1, max = 100, sorted = false } = options;
  const seed = options.seed ?? Math.floor(Math.random() * 0xffffffff);
  const rand = mulberry32(seed);
  const gen = (n: number) => Array.from({ length: n }, () => Math.floor(rand() * (max - min + 1)) + min);

  const listA = gen(sizeA);
  const listB = gen(sizeB);
  if (sorted) {
    listA.sort((a, b) => a - b);
    listB.sort((a, b) => a - b);
  }
  return { kind: "linked-list-pair", listA, listB, seed };
}
