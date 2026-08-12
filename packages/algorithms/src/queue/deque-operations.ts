import { algorithmId, type AlgorithmMetadata, type InputConstraints, type QueueInput } from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedQueue } from "@algoviz/engine";
import type { QueuePlugin } from "../registry";

// Mirrors the `run` function below line-for-line (sourceLine tags
// themselves omitted — see the note in bubble-sort.ts for why), checked by
// the drift-detection tests in queue.test.ts. Same dispatch shape as
// queue-operations.ts, but `input.operations` here is generated with
// allowDeque: true (see generateQueueOperations), so `op.end` genuinely
// varies between "front" and "rear" — this is what makes it a deque
// instead of a plain FIFO queue.
const SOURCE_CODE = `function* run(input: QueueInput, queue: InstrumentedQueue): AlgorithmGenerator {
  for (const op of input.operations) {
    if (op.type === "enqueue") {
      yield queue.enqueue(op.value, op.end, { line: 3 });
    } else if (op.type === "dequeue") {
      yield queue.dequeue(op.end, { line: 4 });
    } else if (op.type === "peek") {
      yield queue.peek(op.end, { line: 5 });
    } else if (op.type === "isEmpty") {
      yield queue.checkEmpty({ line: 6 });
    } else {
      yield queue.checkFull({ line: 7 });
    }
  }
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("deque-operations"),
  name: "Deque Operations",
  category: "queue",
  description:
    "Walks a scripted sequence of Enqueue/Dequeue/Peek calls that can each target either end, plus isEmpty/isFull — a double-ended queue (deque) generalizes a plain FIFO queue by allowing insertion and removal from both the front and the rear.",
  complexity: { best: "O(1)", average: "O(1)", worst: "O(1)", space: "O(n)" },
  pseudocode: [
    { line: 1, text: "for each operation in the sequence" },
    { line: 2, text: "match operation:", indent: 1 },
    { line: 3, text: "enqueue(value, end): insert at end", indent: 2 },
    { line: 4, text: "dequeue(end): remove from end", indent: 2 },
    { line: 5, text: "peek(end): read end", indent: 2 },
    { line: 6, text: "isEmpty: isEmpty()", indent: 2 },
    { line: 7, text: "isFull: isFull()", indent: 2 },
  ],
  sourceCode: { language: "typescript", code: SOURCE_CODE },
};

const inputConstraints: InputConstraints = {
  kind: "queue",
  minSize: 1,
  // See queue-operations.ts's identical comment.
  maxSize: 50,
  defaultSize: 20,
  valueRange: [1, 100],
  allowDeque: true,
};

function* run(input: QueueInput, queue: InstrumentedQueue): AlgorithmGenerator {
  for (const op of input.operations) {
    if (op.type === "enqueue") {
      yield queue.enqueue(op.value, op.end, { line: 3, sourceLine: 4 });
    } else if (op.type === "dequeue") {
      yield queue.dequeue(op.end, { line: 4, sourceLine: 6 });
    } else if (op.type === "peek") {
      yield queue.peek(op.end, { line: 5, sourceLine: 8 });
    } else if (op.type === "isEmpty") {
      yield queue.checkEmpty({ line: 6, sourceLine: 10 });
    } else {
      yield queue.checkFull({ line: 7, sourceLine: 12 });
    }
  }
}

export const dequeOperationsPlugin: QueuePlugin = {
  metadata,
  inputConstraints,
  run,
};
