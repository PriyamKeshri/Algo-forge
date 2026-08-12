import { algorithmId, type AlgorithmMetadata, type InputConstraints, type LinkedListPairInput } from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedLinkedList } from "@algoviz/engine";
import type { LinkedListPairPlugin } from "../registry";

// Mirrors the `run` function below line-for-line (sourceLine tags
// themselves omitted — see the note in ../sorting/bubble-sort.ts for why),
// checked by the drift-detection test in linked-list.test.ts. `merged`
// starts as an empty InstrumentedLinkedList (see execute.ts's
// "linked-list-pair" branch) — every value from `listA`/`listB` reaches it
// only via a visible `insertTail`, so the merge builds up on screen node by
// node instead of appearing all at once.
const SOURCE_CODE = `function* run(input: LinkedListPairInput, merged: InstrumentedLinkedList): AlgorithmGenerator {
  let i = 0;
  let j = 0;
  const { listA, listB } = input;
  while (i < listA.length && j < listB.length) {
    if (listA[i] <= listB[j]) {
      yield merged.insertTail(listA[i], { line: 3 });
      i++;
    } else {
      yield merged.insertTail(listB[j], { line: 4 });
      j++;
    }
  }
  while (i < listA.length) {
    yield merged.insertTail(listA[i], { line: 6 });
    i++;
  }
  while (j < listB.length) {
    yield merged.insertTail(listB[j], { line: 7 });
    j++;
  }
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("linked-list-merge"),
  name: "Linked List Merge",
  category: "linked-list",
  description:
    "Merges two sorted singly linked lists into one sorted list by repeatedly taking the smaller of the two current heads and appending it to the result — the classic building block behind merge sort's merge step, adapted from arrays to linked lists.",
  complexity: { best: "O(n + m)", average: "O(n + m)", worst: "O(n + m)", space: "O(n + m)" },
  pseudocode: [
    { line: 1, text: "while both lists have remaining nodes:" },
    { line: 2, text: "compare the two current heads", indent: 1 },
    { line: 3, text: "listA's head is smaller/equal: append it", indent: 1 },
    { line: 4, text: "otherwise: append listB's head", indent: 1 },
    { line: 5, text: "once one list is exhausted:" },
    { line: 6, text: "append the rest of listA", indent: 1 },
    { line: 7, text: "append the rest of listB", indent: 1 },
  ],
  sourceCode: { language: "typescript", code: SOURCE_CODE },
};

const inputConstraints: InputConstraints = {
  kind: "linked-list-pair",
  minSize: 1,
  // The merged result can hold up to listA.length + listB.length nodes —
  // half of LinkedListRenderer's own single-list cap (see
  // linked-list-operations-plugin.ts's comment), since this plugin
  // generates *two* lists of this size and merges both into one.
  maxSize: 25,
  defaultSize: 10,
  valueRange: [1, 100],
  sorted: true,
};

function* run(input: LinkedListPairInput, merged: InstrumentedLinkedList): AlgorithmGenerator {
  let i = 0;
  let j = 0;
  const { listA, listB } = input;
  while (i < listA.length && j < listB.length) {
    if (listA[i]! <= listB[j]!) {
      yield merged.insertTail(listA[i]!, { line: 3, sourceLine: 7 });
      i++;
    } else {
      yield merged.insertTail(listB[j]!, { line: 4, sourceLine: 10 });
      j++;
    }
  }
  while (i < listA.length) {
    yield merged.insertTail(listA[i]!, { line: 6, sourceLine: 15 });
    i++;
  }
  while (j < listB.length) {
    yield merged.insertTail(listB[j]!, { line: 7, sourceLine: 19 });
    j++;
  }
}

export const linkedListMergePlugin: LinkedListPairPlugin = { metadata, inputConstraints, run };
