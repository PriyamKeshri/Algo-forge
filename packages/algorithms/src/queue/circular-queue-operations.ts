import { algorithmId, type AlgorithmMetadata, type InputConstraints, type QueueInput } from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedCircularQueue } from "@algoviz/engine";
import type { CircularQueuePlugin } from "../registry";

// Mirrors the `run` function below line-for-line (sourceLine tags
// themselves omitted — see the note in bubble-sort.ts for why), checked by
// the drift-detection tests in queue.test.ts. Same operation vocabulary as
// queue-operations.ts, but `InstrumentedCircularQueue.enqueue`/`dequeue`/
// `peek` don't take an `end` parameter at all — a circular queue is
// always FIFO; wraparound, not which end, is the point.
const SOURCE_CODE = `function* run(input: QueueInput, queue: InstrumentedCircularQueue): AlgorithmGenerator {
  for (const op of input.operations) {
    if (op.type === "enqueue") {
      yield queue.enqueue(op.value, { line: 3 });
    } else if (op.type === "dequeue") {
      yield queue.dequeue({ line: 4 });
    } else if (op.type === "peek") {
      yield queue.peek({ line: 5 });
    } else if (op.type === "isEmpty") {
      yield queue.checkEmpty({ line: 6 });
    } else {
      yield queue.checkFull({ line: 7 });
    }
  }
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("circular-queue-operations"),
  name: "Circular Queue Operations",
  category: "queue",
  description:
    "Walks a scripted sequence of Enqueue/Dequeue/Peek/isEmpty/isFull calls against a fixed-capacity circular buffer — front and rear pointers wrap around via modulo instead of shifting every remaining element, so enqueue/dequeue stay O(1) regardless of how full the buffer is, and freed slots get reused once the pointers wrap back around to them.",
  complexity: { best: "O(1)", average: "O(1)", worst: "O(1)", space: "O(capacity)" },
  pseudocode: [
    { line: 1, text: "for each operation in the sequence" },
    { line: 2, text: "match operation:", indent: 1 },
    { line: 3, text: "enqueue(value): add at rear, wrapping", indent: 2 },
    { line: 4, text: "dequeue: remove from front, wrapping", indent: 2 },
    { line: 5, text: "peek: read front", indent: 2 },
    { line: 6, text: "isEmpty: isEmpty()", indent: 2 },
    { line: 7, text: "isFull: isFull()", indent: 2 },
  ],
  sourceCode: { language: "typescript", code: SOURCE_CODE },
};

const inputConstraints: InputConstraints = {
  kind: "circular-queue",
  minSize: 1,
  // See queue-operations.ts's identical comment.
  maxSize: 50,
  defaultSize: 20,
  valueRange: [1, 100],
};

function* run(input: QueueInput, queue: InstrumentedCircularQueue): AlgorithmGenerator {
  for (const op of input.operations) {
    if (op.type === "enqueue") {
      yield queue.enqueue(op.value, { line: 3, sourceLine: 4 });
    } else if (op.type === "dequeue") {
      yield queue.dequeue({ line: 4, sourceLine: 6 });
    } else if (op.type === "peek") {
      yield queue.peek({ line: 5, sourceLine: 8 });
    } else if (op.type === "isEmpty") {
      yield queue.checkEmpty({ line: 6, sourceLine: 10 });
    } else {
      yield queue.checkFull({ line: 7, sourceLine: 12 });
    }
  }
}

export const circularQueueOperationsPlugin: CircularQueuePlugin = {
  metadata,
  inputConstraints,
  run,
};
