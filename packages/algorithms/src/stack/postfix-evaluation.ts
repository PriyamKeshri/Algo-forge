import { algorithmId, type AlgorithmMetadata, type ExpressionInput, type InputConstraints } from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedStack } from "@algoviz/engine";
import type { ExpressionPlugin } from "../registry";

// Mirrors the run/applyOperator functions below line-for-line (sourceLine
// tags themselves omitted — see the note in bubble-sort.ts for why),
// checked by the drift-detection tests in stack.test.ts.
const SOURCE_CODE = `function* run(input: ExpressionInput, stack: InstrumentedStack): AlgorithmGenerator {
  for (const token of input.tokens) {
    const value = Number(token);
    if (!Number.isNaN(value)) {
      yield stack.push(value, { line: 2 });
      continue;
    }
    const right = stack.pop({ line: 4 });
    yield right;
    const left = stack.pop({ line: 4 });
    yield left;
    const result = applyOperator(left.value, token, right.value);
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
  id: algorithmId("postfix-evaluation"),
  name: "Postfix Evaluation",
  category: "stack",
  description:
    "Scans a postfix (Reverse Polish) expression left to right: pushes each operand, and on each operator pops the two most recently pushed operands, applies the operator, and pushes the result back. No parentheses or precedence rules needed — the token order already encodes evaluation order.",
  complexity: { best: "O(n)", average: "O(n)", worst: "O(n)", space: "O(n)" },
  pseudocode: [
    { line: 1, text: "for each token, left to right" },
    { line: 2, text: "if token is a number: push(token)", indent: 1 },
    { line: 3, text: "else (an operator):", indent: 1 },
    { line: 4, text: "right = pop(); left = pop()", indent: 2 },
    { line: 5, text: "push(left <op> right)", indent: 2 },
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
  notation: "postfix",
};

function* run(input: ExpressionInput, stack: InstrumentedStack): AlgorithmGenerator {
  for (const token of input.tokens) {
    const value = Number(token);
    if (!Number.isNaN(value)) {
      yield stack.push(value, { line: 2, sourceLine: 5 });
      continue;
    }
    const right = stack.pop({ line: 4, sourceLine: 8 });
    yield right;
    const left = stack.pop({ line: 4, sourceLine: 10 });
    yield left;
    const result = applyOperator(left.value, token, right.value);
    yield stack.push(result, { line: 5, sourceLine: 13 });
  }
  if (stack.size > 0) yield stack.peek({ line: 6, sourceLine: 15 });
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

export const postfixEvaluationPlugin: ExpressionPlugin = {
  metadata,
  inputConstraints,
  run,
};
