import { algorithmId, type AlgorithmMetadata, type InputConstraints, type LinkedListPairInput } from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedLinkedList } from "@algoviz/engine";
import type { LinkedListPairPlugin } from "../registry";

// Mirrors the `run` function below line-for-line (sourceLine tags
// themselves omitted — see the note in ../sorting/bubble-sort.ts for why),
// checked by the drift-detection test in linked-list.test.ts. `list` starts
// empty and is built from `listA` first (visible insertTail events, same
// "build then operate" shape Inorder Traversal uses for trees) so there's
// something on screen to compare `listB`'s values against.
const SOURCE_CODE = `function* run(input: LinkedListPairInput, list: InstrumentedLinkedList): AlgorithmGenerator {
  for (const value of input.listA) {
    yield list.insertTail(value, { line: 1 });
  }
  let cur = list.headId;
  let i = 0;
  while (cur !== null && i < input.listB.length) {
    yield list.compare(cur, input.listB[i], { line: 4 });
    cur = list.nextOf(cur) ?? null;
    i++;
  }
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("linked-list-comparison"),
  name: "Linked List Comparison",
  category: "linked-list",
  description:
    "Builds listA as a linked list, then walks it alongside listB comparing corresponding values one pair at a time — how you'd check whether two linked lists hold the same sequence without ever converting either to an array.",
  complexity: { best: "O(1)", average: "O(min(n, m))", worst: "O(min(n, m))", space: "O(n)" },
  pseudocode: [
    { line: 1, text: "build listA as a linked list" },
    { line: 2, text: "node = listA's head, i = 0" },
    { line: 3, text: "while node exists and i < listB.length:" },
    { line: 4, text: "compare node.value to listB[i]", indent: 1 },
    { line: 5, text: "advance node and i", indent: 1 },
  ],
  sourceCode: { language: "typescript", code: SOURCE_CODE },
};

const inputConstraints: InputConstraints = {
  kind: "linked-list-pair",
  minSize: 1,
  // See linked-list-merge.ts's identical comment (kept the same cap for
  // consistency between the two linked-list-pair plugins, even though
  // Comparison itself only ever builds listA, not both).
  maxSize: 25,
  defaultSize: 10,
  valueRange: [1, 100],
};

function* run(input: LinkedListPairInput, list: InstrumentedLinkedList): AlgorithmGenerator {
  for (const value of input.listA) {
    yield list.insertTail(value, { line: 1, sourceLine: 3 });
  }
  let cur = list.headId;
  let i = 0;
  while (cur !== null && i < input.listB.length) {
    yield list.compare(cur, input.listB[i]!, { line: 4, sourceLine: 8 });
    cur = list.nextOf(cur) ?? null;
    i++;
  }
}

export const linkedListComparisonPlugin: LinkedListPairPlugin = { metadata, inputConstraints, run };
