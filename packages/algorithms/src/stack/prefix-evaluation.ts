import { algorithmId, type AlgorithmMetadata, type ExpressionInput, type InputConstraints } from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedStack } from "@algoviz/engine";
import type { ExpressionPlugin } from "../registry";

// Mirrors the run/applyOperator functions below line-for-line (sourceLine
// tags themselves omitted — see the note in bubble-sort.ts for why),
// checked by the drift-detection tests in stack.test.ts.
const SOURCE_CODE = `function* run(input: ExpressionInput, stack: InstrumentedStack): AlgorithmGenerator {
  for (let i = input.tokens.length - 1; i >= 0; i--) {
    const token = input.tokens[i]!;
    const value = Number(token);
    if (!Number.isNaN(value)) {
      yield stack.push(value, { line: 2 });
      continue;
    }
    const first = stack.pop({ line: 4 });
    yield first;
    const second = stack.pop({ line: 4 });
    yield second;
    const result = applyOperator(first.value, token, second.value);
    yield stack.push(result, { line: 5 });
  }
  if (stack.size > 0) yield stack.peek({ line: 6 });
}

function applyOperator(a: number, op: string, b: number): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    default:
      throw new Error("Unknown operator: " + op);
  }
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("prefix-evaluation"),
  name: "Prefix Evaluation",
  category: "stack",
  description:
    "Scans a prefix (Polish) expression right to left: pushes each operand, and on each operator pops the two most recently pushed operands (first-popped is the left operand, since the scan runs backward), applies the operator, and pushes the result back.",
  complexity: { best: "O(n)", average: "O(n)", worst: "O(n)", space: "O(n)" },
  pseudocode: [
    { line: 1, text: "for each token, right to left" },
    { line: 2, text: "if token is a number: push(token)", indent: 1 },
    { line: 3, text: "else (an operator):", indent: 1 },
    { line: 4, text: "first = pop(); second = pop()", indent: 2 },
    { line: 5, text: "push(first <op> second)", indent: 2 },
    { line: 6, text: "result = peek()" },
  ],
  sourceCode: { language: "typescript", code: SOURCE_CODE },
};

const inputConstraints: InputConstraints = {
  kind: "expression",
  minSize: 1,
  maxSize: 20,
  defaultSize: 5,
  valueRange: [1, 20],
  notation: "prefix",
};

function* run(input: ExpressionInput, stack: InstrumentedStack): AlgorithmGenerator {
  for (let i = input.tokens.length - 1; i >= 0; i--) {
    const token = input.tokens[i]!;
    const value = Number(token);
    if (!Number.isNaN(value)) {
      yield stack.push(value, { line: 2, sourceLine: 6 });
      continue;
    }
    const first = stack.pop({ line: 4, sourceLine: 9 });
    yield first;
    const second = stack.pop({ line: 4, sourceLine: 11 });
    yield second;
    const result = applyOperator(first.value, token, second.value);
    yield stack.push(result, { line: 5, sourceLine: 14 });
  }
  if (stack.size > 0) yield stack.peek({ line: 6, sourceLine: 16 });
}

function applyOperator(a: number, op: string, b: number): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    default:
      throw new Error("Unknown operator: " + op);
  }
}

export const prefixEvaluationPlugin: ExpressionPlugin = {
  metadata,
  inputConstraints,
  run,
};
