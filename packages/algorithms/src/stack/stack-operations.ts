import { algorithmId, type AlgorithmMetadata, type InputConstraints, type StackInput } from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedStack } from "@algoviz/engine";
import type { StackPlugin } from "../registry";

// Mirrors the `run` function below line-for-line (sourceLine tags
// themselves omitted — see the note in bubble-sort.ts for why), checked by
// the drift-detection tests in stack.test.ts. `input.operations` is
// generated already-valid (see generateStackOperations in
// generate-input.ts) — never a pop/peek against an empty stack or a push
// past capacity — so this dispatch doesn't need to guard against those
// itself; InstrumentedStack's own throw-on-invalid-op checks are still
// there as a backstop.
const SOURCE_CODE = `function* run(input: StackInput, stack: InstrumentedStack): AlgorithmGenerator {
  for (const op of input.operations) {
    if (op.type === "push") {
      yield stack.push(op.value, { line: 3 });
    } else if (op.type === "pop") {
      yield stack.pop({ line: 4 });
    } else if (op.type === "peek") {
      yield stack.peek({ line: 5 });
    } else if (op.type === "isEmpty") {
      yield stack.checkEmpty({ line: 6 });
    } else {
      yield stack.checkFull({ line: 7 });
    }
  }
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("stack-operations"),
  name: "Stack Operations",
  category: "stack",
  description:
    "Walks a scripted sequence of Push/Pop/Peek/isEmpty/isFull calls against a stack — each one O(1), since a stack only ever touches its top.",
  complexity: { best: "O(1)", average: "O(1)", worst: "O(1)", space: "O(n)" },
  pseudocode: [
    { line: 1, text: "for each operation in the sequence" },
    { line: 2, text: "match operation:", indent: 1 },
    { line: 3, text: "push(value): push(value)", indent: 2 },
    { line: 4, text: "pop: pop()", indent: 2 },
    { line: 5, text: "peek: peek()", indent: 2 },
    { line: 6, text: "isEmpty: isEmpty()", indent: 2 },
    { line: 7, text: "isFull: isFull()", indent: 2 },
  ],
  sourceCode: { language: "typescript", code: SOURCE_CODE },
};

const inputConstraints: InputConstraints = {
  kind: "stack",
  minSize: 1,
  // StackRenderer draws one fixed-size box per element in a scrollable
  // column — kept small enough to stay a quick, legible scroll rather than
  // an endless one.
  maxSize: 50,
  defaultSize: 20,
  valueRange: [1, 100],
};

function* run(input: StackInput, stack: InstrumentedStack): AlgorithmGenerator {
  for (const op of input.operations) {
    if (op.type === "push") {
      yield stack.push(op.value, { line: 3, sourceLine: 4 });
    } else if (op.type === "pop") {
      yield stack.pop({ line: 4, sourceLine: 6 });
    } else if (op.type === "peek") {
      yield stack.peek({ line: 5, sourceLine: 8 });
    } else if (op.type === "isEmpty") {
      yield stack.checkEmpty({ line: 6, sourceLine: 10 });
    } else {
      yield stack.checkFull({ line: 7, sourceLine: 12 });
    }
  }
}

export const stackOperationsPlugin: StackPlugin = {
  metadata,
  inputConstraints,
  run,
};
