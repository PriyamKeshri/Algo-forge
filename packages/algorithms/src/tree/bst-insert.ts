import { algorithmId, type AlgorithmMetadata, type ArrayInput, type InputConstraints } from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedTree } from "@algoviz/engine";
import type { TreePlugin } from "../registry";

// Mirrors the insertOne/run functions below line-for-line (sourceLine tags
// themselves omitted — see the note in ../sorting/bubble-sort.ts for why),
// checked by the drift-detection tests in tree.test.ts.
const SOURCE_CODE = `function* insertOne(tree: InstrumentedTree, value: number): AlgorithmGenerator {
  if (tree.rootId === null) {
    yield tree.insertNode(value, undefined, undefined, { line: 1 });
    return;
  }
  let current = tree.rootId;
  while (true) {
    const cmp = tree.compareNode(current, value, { line: 3 });
    yield cmp;
    if (cmp.result === 0) return;
    const side = cmp.result < 0 ? "left" : "right";
    const child = side === "left" ? tree.leftOf(current) : tree.rightOf(current);
    if (child === undefined) {
      yield tree.insertNode(value, current, side, { line: 5 });
      return;
    }
    current = child;
  }
}

function* run(input: ArrayInput, tree: InstrumentedTree): AlgorithmGenerator {
  for (const value of input.values) {
    yield* insertOne(tree, value);
  }
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("bst-insert"),
  name: "BST Insert",
  category: "tree",
  description:
    "Builds a binary search tree by inserting values one at a time: each value descends from the root, going left or right depending on the comparison, until it reaches an empty slot and becomes a new leaf.",
  complexity: { best: "O(log n)", average: "O(log n)", worst: "O(n)", space: "O(n)" },
  pseudocode: [
    { line: 1, text: "if tree is empty: insert value as the root" },
    { line: 2, text: "otherwise, starting at the root:" },
    { line: 3, text: "compare value to the current node", indent: 1 },
    { line: 4, text: "if equal: stop (skip duplicate)", indent: 1 },
    { line: 5, text: "if no child on the value's side: insert value there, stop", indent: 1 },
    { line: 6, text: "otherwise move to that child and repeat", indent: 1 },
  ],
  sourceCode: { language: "typescript", code: SOURCE_CODE },
};

const inputConstraints: InputConstraints = {
  kind: "array",
  minSize: 1,
  maxSize: 30,
  defaultSize: 12,
  valueRange: [1, 100],
};

function* insertOne(tree: InstrumentedTree, value: number): AlgorithmGenerator {
  if (tree.rootId === null) {
    yield tree.insertNode(value, undefined, undefined, { line: 1, sourceLine: 3 });
    return;
  }
  let current = tree.rootId;
  while (true) {
    const cmp = tree.compareNode(current, value, { line: 3, sourceLine: 8 });
    yield cmp;
    if (cmp.result === 0) return;
    const side = cmp.result < 0 ? "left" : "right";
    const child = side === "left" ? tree.leftOf(current) : tree.rightOf(current);
    if (child === undefined) {
      yield tree.insertNode(value, current, side, { line: 5, sourceLine: 14 });
      return;
    }
    current = child;
  }
}

function* run(input: ArrayInput, tree: InstrumentedTree): AlgorithmGenerator {
  for (const value of input.values) {
    yield* insertOne(tree, value);
  }
}

export const bstInsertPlugin: TreePlugin = {
  metadata,
  inputConstraints,
  run,
};
