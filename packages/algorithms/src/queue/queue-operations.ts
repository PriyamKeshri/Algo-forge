import { algorithmId, type AlgorithmMetadata, type InputConstraints, type QueueInput } from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedQueue } from "@algoviz/engine";
import type { QueuePlugin } from "../registry";

// Mirrors the `run` function below line-for-line (sourceLine tags
// themselves omitted — see the note in bubble-sort.ts for why), checked by
// the drift-detection tests in queue.test.ts. `input.operations` is
// generated already-valid (see generateQueueOperations in
// generate-input.ts, called with allowDeque: false here) — every op omits
// `end`, meaning the FIFO convention (enqueue → rear, dequeue/peek →
// front) — so passing `op.end` straight through is a no-op in practice,
// not a deque feature leaking in.
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
  id: algorithmId("queue-operations"),
  name: "Queue Operations",
  category: "queue",
  description:
    "Walks a scripted sequence of Enqueue/Dequeue/Peek/isEmpty/isFull calls against a FIFO queue — enqueue always adds at the rear, dequeue/peek always act on the front, so elements come out in the same order they went in.",
  complexity: { best: "O(1)", average: "O(1)", worst: "O(1)", space: "O(n)" },
  pseudocode: [
    { line: 1, text: "for each operation in the sequence" },
    { line: 2, text: "match operation:", indent: 1 },
    { line: 3, text: "enqueue(value): add at rear", indent: 2 },
    { line: 4, text: "dequeue: remove from front", indent: 2 },
    { line: 5, text: "peek: read front", indent: 2 },
    { line: 6, text: "isEmpty: isEmpty()", indent: 2 },
    { line: 7, text: "isFull: isFull()", indent: 2 },
  ],
  sourceCode: { language: "typescript", code: SOURCE_CODE },
};

const inputConstraints: InputConstraints = {
  kind: "queue",
  minSize: 1,
  // QueueRenderer draws one fixed-size box per element in a horizontally
  // scrollable row — kept small enough to stay a quick, legible scroll.
  maxSize: 50,
  defaultSize: 20,
  valueRange: [1, 100],
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

export const queueOperationsPlugin: QueuePlugin = {
  metadata,
  inputConstraints,
  run,
};
