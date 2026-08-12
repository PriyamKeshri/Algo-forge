import { describe, expect, it } from "vitest";
import { createInstrumentedStack, ExecutionEngine, type RunResult } from "@algoviz/engine";
import type { ExpressionInput, StackInput, StackOperation, StackSnapshot } from "@algoviz/core";
import { stackOperationsPlugin } from "./stack-operations";
import { postfixEvaluationPlugin } from "./postfix-evaluation";
import { prefixEvaluationPlugin } from "./prefix-evaluation";
import { generateExpression, generateStackOperations } from "../generate-input";
import type { AlgorithmPlugin } from "../registry";

// A sourceLine-tagged line should always be part of an instrumented
// operation. See ../sorting/sorting.test.ts for the full rationale — this
// is the stack-plugin equivalent of that drift detector.
const OPERATION_MARKERS = ["yield", ".push(", ".pop(", ".peek(", ".checkEmpty(", ".checkFull("];

function runStackPlugin(plugin: AlgorithmPlugin<StackInput, unknown>, input: StackInput): RunResult {
  const ctx = createInstrumentedStack(input.capacity);
  return new ExecutionEngine().run(plugin.run(input, ctx), ctx);
}

function runExpressionPlugin(
  plugin: AlgorithmPlugin<ExpressionInput, unknown>,
  input: ExpressionInput,
): RunResult {
  const ctx = createInstrumentedStack();
  return new ExecutionEngine().run(plugin.run(input, ctx), ctx);
}

function assertDriftFree(result: RunResult, plugin: AlgorithmPlugin): void {
  const validLines = new Set(plugin.metadata.pseudocode.map((p) => p.line));
  const sourceLines = plugin.metadata.sourceCode.code.split("\n");

  expect(result.events.length).toBeGreaterThan(0);
  let previousStep = -1;
  for (const event of result.events) {
    expect(event.step).toBeGreaterThan(previousStep);
    previousStep = event.step;
    if (event.line !== undefined) expect(validLines.has(event.line)).toBe(true);
    if (event.sourceLine === undefined) continue;
    expect(event.sourceLine).toBeGreaterThanOrEqual(1);
    expect(event.sourceLine).toBeLessThanOrEqual(sourceLines.length);
    const lineText = sourceLines[event.sourceLine - 1]!;
    expect(OPERATION_MARKERS.some((marker) => lineText.includes(marker))).toBe(true);
  }
  expect(result.events.some((e) => e.sourceLine !== undefined)).toBe(true);
}

describe("Stack Operations", () => {
  it("runs a hand-built sequence, producing the expected final stack", () => {
    const operations: StackOperation[] = [
      { type: "push", value: 1 },
      { type: "push", value: 2 },
      { type: "peek" },
      { type: "push", value: 3 },
      { type: "pop" },
      { type: "isEmpty" },
    ];
    const input: StackInput = { kind: "stack", operations };
    const result = runStackPlugin(stackOperationsPlugin, input);

    expect(result.completed).toBe(true);
    expect((result.finalSnapshot as StackSnapshot).values).toEqual([1, 2]);
    // Every operation yields exactly one event — push/pop/peek/isEmpty/isFull are all one-shot.
    expect(result.events).toHaveLength(operations.length);
  });

  it("respects capacity: a generated sequence never overflows or throws", () => {
    const input = generateStackOperations(60, { capacity: 5, seed: 1 });
    const result = runStackPlugin(stackOperationsPlugin, input);

    expect(result.completed).toBe(true);
    expect((result.finalSnapshot as StackSnapshot).values.length).toBeLessThanOrEqual(5);
  });

  it("an unbounded generated sequence never pops/peeks an empty stack", () => {
    // If the generator ever produced an invalid op, InstrumentedStack would
    // throw and ExecutionEngine.run would propagate it — so "doesn't throw,
    // completes" is itself the correctness assertion here.
    const input = generateStackOperations(200, { seed: 7 });
    expect(() => runStackPlugin(stackOperationsPlugin, input)).not.toThrow();
  });

  it("is drift-free and stats-consistent", () => {
    const input = generateStackOperations(40, { capacity: 10, seed: 3 });
    const result = runStackPlugin(stackOperationsPlugin, input);
    assertDriftFree(result, stackOperationsPlugin);

    const pushes = input.operations.filter((op) => op.type === "push").length;
    const pops = input.operations.filter((op) => op.type === "pop").length;
    const checks = input.operations.filter((op) => op.type === "peek" || op.type === "isEmpty" || op.type === "isFull").length;
    expect(result.stats.writes).toBe(pushes + pops);
    expect(result.stats.reads).toBe(checks);
  });
});

const KNOWN_EXPRESSIONS: Array<{ postfix: string[]; prefix: string[]; expected: number }> = [
  { postfix: ["2", "3", "+"], prefix: ["+", "2", "3"], expected: 5 },
  { postfix: ["2", "3", "+", "4", "*"], prefix: ["*", "+", "2", "3", "4"], expected: 20 },
  { postfix: ["10", "3", "-"], prefix: ["-", "10", "3"], expected: 7 },
  { postfix: ["4"], prefix: ["4"], expected: 4 }, // no operators at all
];

describe("Postfix Evaluation", () => {
  it.each(KNOWN_EXPRESSIONS)("evaluates $postfix to $expected", ({ postfix, expected }) => {
    const input: ExpressionInput = { kind: "expression", tokens: postfix, notation: "postfix" };
    const result = runExpressionPlugin(postfixEvaluationPlugin, input);

    expect(result.completed).toBe(true);
    const snapshot = result.finalSnapshot as StackSnapshot;
    expect(snapshot.values).toEqual([expected]);
  });

  it.each([1, 2, 5, 10])("fully reduces a generated %i-operand expression to a single value", (operandCount) => {
    const input = generateExpression(operandCount, "postfix", { seed: operandCount * 17 });
    const result = runExpressionPlugin(postfixEvaluationPlugin, input);

    expect(result.completed).toBe(true);
    expect((result.finalSnapshot as StackSnapshot).values).toHaveLength(1);
  });

  it("is drift-free", () => {
    const input = generateExpression(6, "postfix", { seed: 99 });
    const result = runExpressionPlugin(postfixEvaluationPlugin, input);
    assertDriftFree(result, postfixEvaluationPlugin);
  });
});

describe("Prefix Evaluation", () => {
  it.each(KNOWN_EXPRESSIONS)("evaluates $prefix to $expected", ({ prefix, expected }) => {
    const input: ExpressionInput = { kind: "expression", tokens: prefix, notation: "prefix" };
    const result = runExpressionPlugin(prefixEvaluationPlugin, input);

    expect(result.completed).toBe(true);
    const snapshot = result.finalSnapshot as StackSnapshot;
    expect(snapshot.values).toEqual([expected]);
  });

  it.each([1, 2, 5, 10])("fully reduces a generated %i-operand expression to a single value", (operandCount) => {
    const input = generateExpression(operandCount, "prefix", { seed: operandCount * 31 });
    const result = runExpressionPlugin(prefixEvaluationPlugin, input);

    expect(result.completed).toBe(true);
    expect((result.finalSnapshot as StackSnapshot).values).toHaveLength(1);
  });

  it("is drift-free", () => {
    const input = generateExpression(6, "prefix", { seed: 100 });
    const result = runExpressionPlugin(prefixEvaluationPlugin, input);
    assertDriftFree(result, prefixEvaluationPlugin);
  });
});
