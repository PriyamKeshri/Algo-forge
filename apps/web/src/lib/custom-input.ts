import type {
  AlgorithmInput,
  InputConstraints,
  LinkedListOperation,
  QueueOperation,
  StackOperation,
} from "@algoviz/core";
import { generateArrayFromValues, generateSearchTarget } from "@algoviz/algorithms";

export type CustomInputResult = { ok: true; input: AlgorithmInput } | { ok: false; error: string };

function parseNumberTokens(raw: string, separator: RegExp = /[\s,]+/): number[] {
  return raw
    .split(separator)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(Number);
}

function sizeError(kind: string, min: number, max: number, got: number): string {
  return `${kind} must have between ${min} and ${max} (got ${got}).`;
}

function parseArrayInput(raw: string, constraints: InputConstraints): CustomInputResult {
  const values = parseNumberTokens(raw);
  if (values.length === 0 || values.some((v) => !Number.isFinite(v))) {
    return { ok: false, error: "Enter a comma- or space-separated list of numbers." };
  }
  if (values.length < constraints.minSize || values.length > constraints.maxSize) {
    return { ok: false, error: sizeError("Array", constraints.minSize, constraints.maxSize, values.length) };
  }
  const finalValues = constraints.sorted ? [...values].sort((a, b) => a - b) : values;
  let input = generateArrayFromValues(finalValues);
  if (constraints.needsTarget) input = { ...input, target: generateSearchTarget(finalValues) };
  return { ok: true, input };
}

/**
 * Stack Operations' script syntax: a comma-separated list where each token
 * is either a number (push) or one of pop/peek/isEmpty/isFull. Deliberately
 * unbounded (no capacity) — the point of typing your own script is telling
 * it exactly what to do, not also fighting an artificial isFull.
 * Pop/peek against an empty stack would throw at run time
 * (InstrumentedStack.pop/peek), so a virtual size is tracked here the same
 * way generateStackOperations does, just to reject those up front with a
 * readable message instead of a worker crash.
 */
function parseStackInput(raw: string, constraints: InputConstraints): CustomInputResult {
  const tokens = raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tokens.length === 0) {
    return { ok: false, error: "Enter numbers to push, and/or pop, peek, isEmpty, isFull." };
  }
  if (tokens.length < constraints.minSize || tokens.length > constraints.maxSize) {
    return { ok: false, error: sizeError("Script", constraints.minSize, constraints.maxSize, tokens.length) };
  }

  const operations: StackOperation[] = [];
  let virtualSize = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const lower = token.toLowerCase();
    if (lower === "pop") {
      if (virtualSize === 0) {
        return { ok: false, error: `"${token}" at position ${i + 1} would run against an empty stack.` };
      }
      operations.push({ type: "pop" });
      virtualSize--;
    } else if (lower === "peek") {
      if (virtualSize === 0) {
        return { ok: false, error: `"${token}" at position ${i + 1} would run against an empty stack.` };
      }
      operations.push({ type: "peek" });
    } else if (lower === "isempty") {
      operations.push({ type: "isEmpty" });
    } else if (lower === "isfull") {
      operations.push({ type: "isFull" });
    } else {
      const value = Number(token);
      if (!Number.isFinite(value)) {
        return {
          ok: false,
          error: `"${token}" at position ${i + 1} isn't a number or a recognized operation (pop, peek, isEmpty, isFull).`,
        };
      }
      operations.push({ type: "push", value });
      virtualSize++;
    }
  }
  return { ok: true, input: { kind: "stack", operations } };
}

/**
 * Queue/Deque/Circular Queue Operations share this syntax: a
 * comma-separated list where each token is a number (enqueue, always at
 * the rear — the custom script doesn't offer Deque's either-end freedom,
 * only its random generator does) or one of dequeue/peek/isEmpty/isFull.
 * Circular Queue's capacity is set to the total enqueue count, the tightest
 * bound that's still guaranteed to never overflow regardless of where the
 * dequeues fall in the script.
 */
function parseQueueInput(raw: string, constraints: InputConstraints): CustomInputResult {
  const tokens = raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tokens.length === 0) {
    return { ok: false, error: "Enter numbers to enqueue, and/or dequeue, peek, isEmpty, isFull." };
  }
  if (tokens.length < constraints.minSize || tokens.length > constraints.maxSize) {
    return { ok: false, error: sizeError("Script", constraints.minSize, constraints.maxSize, tokens.length) };
  }

  const operations: QueueOperation[] = [];
  let virtualSize = 0;
  let enqueueCount = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const lower = token.toLowerCase();
    if (lower === "dequeue") {
      if (virtualSize === 0) {
        return { ok: false, error: `"${token}" at position ${i + 1} would run against an empty queue.` };
      }
      operations.push({ type: "dequeue" });
      virtualSize--;
    } else if (lower === "peek") {
      if (virtualSize === 0) {
        return { ok: false, error: `"${token}" at position ${i + 1} would run against an empty queue.` };
      }
      operations.push({ type: "peek" });
    } else if (lower === "isempty") {
      operations.push({ type: "isEmpty" });
    } else if (lower === "isfull") {
      operations.push({ type: "isFull" });
    } else {
      const value = Number(token);
      if (!Number.isFinite(value)) {
        return {
          ok: false,
          error: `"${token}" at position ${i + 1} isn't a number or a recognized operation (dequeue, peek, isEmpty, isFull).`,
        };
      }
      operations.push({ type: "enqueue", value });
      virtualSize++;
      enqueueCount++;
    }
  }
  if (constraints.kind === "circular-queue") {
    return { ok: true, input: { kind: "circular-queue", operations, capacity: Math.max(1, enqueueCount) } };
  }
  return { ok: true, input: { kind: "queue", operations } };
}

/**
 * Linked List Operations' script syntax: a comma-separated list where each
 * token is either `traverse`/`reverse` alone, or `insertHead`/`insertTail`/
 * `delete`/`search` followed by a number, e.g. "insertHead 5, delete 5,
 * traverse". Unlike stack/queue, none of these can throw at run time even
 * against an empty list (see linked-list-operations-plugin.ts — deleteValue/
 * search just find nothing and move on, traverse/reverse just no-op), so
 * there's no virtual-state validity tracking needed here, only syntax.
 */
function parseLinkedListInput(raw: string, constraints: InputConstraints): CustomInputResult {
  const tokens = raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tokens.length === 0) {
    return { ok: false, error: "Enter operations, e.g. insertHead 5, insertTail 3, delete 5, search 3, traverse, reverse." };
  }
  if (tokens.length < constraints.minSize || tokens.length > constraints.maxSize) {
    return { ok: false, error: sizeError("Script", constraints.minSize, constraints.maxSize, tokens.length) };
  }

  const operations: LinkedListOperation[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const [keywordRaw, argRaw] = token.split(/\s+/);
    const keyword = keywordRaw?.toLowerCase();

    if (keyword === "traverse") {
      operations.push({ type: "traverse" });
      continue;
    }
    if (keyword === "reverse") {
      operations.push({ type: "reverse" });
      continue;
    }

    const value = Number(argRaw);
    const invalidArg = () => ({
      ok: false as const,
      error: `"${token}" at position ${i + 1} needs a number, e.g. "${keywordRaw} 5".`,
    });
    if (keyword === "inserthead") {
      if (!Number.isFinite(value)) return invalidArg();
      operations.push({ type: "insertHead", value });
    } else if (keyword === "inserttail") {
      if (!Number.isFinite(value)) return invalidArg();
      operations.push({ type: "insertTail", value });
    } else if (keyword === "delete" || keyword === "deletevalue") {
      if (!Number.isFinite(value)) return invalidArg();
      operations.push({ type: "deleteValue", value });
    } else if (keyword === "search") {
      if (!Number.isFinite(value)) return invalidArg();
      operations.push({ type: "search", value });
    } else {
      return {
        ok: false,
        error: `"${token}" at position ${i + 1} isn't recognized. Use insertHead/insertTail/delete/search <number>, traverse, or reverse.`,
      };
    }
  }
  if (constraints.kind !== "linked-list" || !constraints.listVariant) {
    return { ok: false, error: "Unsupported linked list variant." };
  }
  return { ok: true, input: { kind: "linked-list", variant: constraints.listVariant, operations } };
}

/** Linked List Merge/Comparison: two comma-separated lists, separated by a semicolon, e.g. "1,3,5;2,4,6". */
function parseLinkedListPairInput(raw: string, constraints: InputConstraints): CustomInputResult {
  const parts = raw.split(";");
  if (parts.length !== 2) {
    return { ok: false, error: 'Enter two lists separated by ";", e.g. "1,3,5;2,4,6".' };
  }
  const listA = parseNumberTokens(parts[0]!);
  const listB = parseNumberTokens(parts[1]!);
  if (
    listA.length === 0 ||
    listB.length === 0 ||
    listA.some((v) => !Number.isFinite(v)) ||
    listB.some((v) => !Number.isFinite(v))
  ) {
    return { ok: false, error: 'Both lists must be non-empty comma-separated numbers, e.g. "1,3,5;2,4,6".' };
  }
  if (listA.length > constraints.maxSize || listB.length > constraints.maxSize) {
    return { ok: false, error: `Each list can have at most ${constraints.maxSize} numbers.` };
  }
  const finalize = (values: number[]) => (constraints.sorted ? [...values].sort((a, b) => a - b) : values);
  return { ok: true, input: { kind: "linked-list-pair", listA: finalize(listA), listB: finalize(listB) } };
}

/** Dispatches on `constraints.kind` — see each parser above for that kind's script syntax. */
export function parseCustomInput(raw: string, constraints: InputConstraints): CustomInputResult {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: false, error: "Type something first." };

  switch (constraints.kind) {
    case "array":
      return parseArrayInput(trimmed, constraints);
    case "stack":
      return parseStackInput(trimmed, constraints);
    case "expression":
      return parseExpressionInput(trimmed, constraints);
    case "queue":
    case "circular-queue":
      return parseQueueInput(trimmed, constraints);
    case "linked-list":
      return parseLinkedListInput(trimmed, constraints);
    case "linked-list-pair":
      return parseLinkedListPairInput(trimmed, constraints);
    case "graph":
      return { ok: false, error: "Graph input is edited directly on the canvas below." };
  }
}

const EXPRESSION_OPERATORS = new Set(["+", "-", "*"]);

/**
 * Postfix/Prefix Evaluation: the expression's own tokens, space- or
 * comma-separated, e.g. postfix "2 3 + 4 *" or prefix "* + 2 3 4". Validated
 * by simulating the same stack-depth bookkeeping the real algorithm does
 * (postfix scans left to right, prefix right to left — see
 * prefix-evaluation.ts's comment on why), so a malformed expression is
 * rejected here with a readable message instead of throwing mid-run.
 */
function parseExpressionInput(raw: string, constraints: InputConstraints): CustomInputResult {
  const tokens = raw
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tokens.length === 0) {
    return { ok: false, error: "Enter a space- or comma-separated list of numbers and operators (+, -, *)." };
  }
  if (tokens.length < constraints.minSize || tokens.length > constraints.maxSize) {
    return { ok: false, error: sizeError("Expression", constraints.minSize, constraints.maxSize, tokens.length) };
  }
  for (const token of tokens) {
    if (!EXPRESSION_OPERATORS.has(token) && !Number.isFinite(Number(token))) {
      return { ok: false, error: `"${token}" isn't a number or a supported operator (+, -, *).` };
    }
  }

  const notation = constraints.notation ?? "postfix";
  const scanOrder = notation === "postfix" ? tokens : [...tokens].reverse();
  let depth = 0;
  for (const token of scanOrder) {
    if (EXPRESSION_OPERATORS.has(token)) {
      if (depth < 2) return { ok: false, error: `Not enough operands before "${token}" — check the ${notation} order.` };
      depth -= 1; // pops two operands, pushes one result
    } else {
      depth += 1;
    }
  }
  if (depth !== 1) {
    return { ok: false, error: `Expression doesn't reduce to a single result — check the ${notation} order.` };
  }

  return { ok: true, input: { kind: "expression", tokens, notation } };
}

/** The "size" a freshly-parsed custom input represents, for keeping the Size slider/label meaningful afterward. */
export function sizeOfInput(input: AlgorithmInput): number {
  switch (input.kind) {
    case "array":
      return input.values.length;
    case "graph":
      return input.nodes.length;
    case "stack":
      return input.operations.length;
    case "expression":
      return input.tokens.length;
    case "queue":
    case "circular-queue":
      return input.operations.length;
    case "linked-list":
      return input.operations.length;
    case "linked-list-pair":
      return Math.max(input.listA.length, input.listB.length);
  }
}
