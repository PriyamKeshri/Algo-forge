import { algorithmId, type AlgorithmMetadata, type ArrayInput, type InputConstraints, type NodeId } from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedTree } from "@algoviz/engine";
import type { TreePlugin } from "../registry";

// Mirrors the insertOne/inorderWalk/run functions below line-for-line
// (sourceLine tags themselves omitted — see the note in
// ../sorting/bubble-sort.ts for why), checked by the drift-detection tests
// in tree.test.ts.
//
// `insertOne` here is a deliberate, self-contained duplicate of
// ../tree/bst-insert.ts's own `insertOne` — not shared via import — so
// that *this* file's sourceLine tags always point at *this* file's own
// snippet. Delegating via cross-file `yield*` would make an event's
// sourceLine (baked into the shared function) correct for one plugin's
// panel but land on an arbitrary, likely-wrong line in the other's.
const SOURCE_CODE = `function* insertOne(tree: InstrumentedTree, value: number): AlgorithmGenerator {
  if (tree.rootId === null) {
    yield tree.insertNode(value, undefined, undefined, { line: 1 });
    return;
  }
  let current = tree.rootId;
  while (true) {
    const cmp = tree.compareNode(current, value, { line: 1 });
    yield cmp;
    if (cmp.result === 0) return;
    const side = cmp.result < 0 ? "left" : "right";
    const child = side === "left" ? tree.leftOf(current) : tree.rightOf(current);
    if (child === undefined) {
      yield tree.insertNode(value, current, side, { line: 1 });
      return;
    }
    current = child;
  }
}

function* inorderWalk(tree: InstrumentedTree, id: NodeId | undefined): AlgorithmGenerator {
  if (id === undefined) return;
  yield* inorderWalk(tree, tree.leftOf(id));
  yield tree.visitNode(id, { line: 5 });
  yield* inorderWalk(tree, tree.rightOf(id));
}

function* run(input: ArrayInput, tree: InstrumentedTree): AlgorithmGenerator {
  for (const value of input.values) {
    yield* insertOne(tree, value);
  }
  yield* inorderWalk(tree, tree.rootId ?? undefined);
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("inorder-traversal"),
  name: "Inorder Traversal",
  category: "tree",
  description:
    "Builds a binary search tree from the input, then walks it inorder: recursively visit the left subtree, then the current node, then the right subtree — which for a BST always visits every value in ascending sorted order.",
  complexity: { best: "O(n)", average: "O(n)", worst: "O(n)", space: "O(n)" },
  pseudocode: [
    { line: 1, text: "build a BST by inserting each input value (see BST Insert)" },
    { line: 2, text: "inorder(node):" },
    { line: 3, text: "if node is empty: return", indent: 1 },
    { line: 4, text: "inorder(node.left)", indent: 1 },
    { line: 5, text: "visit node", indent: 1 },
    { line: 6, text: "inorder(node.right)", indent: 1 },
    { line: 7, text: "inorder(root)" },
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
    const cmp = tree.compareNode(current, value, { line: 1, sourceLine: 8 });
    yield cmp;
    if (cmp.result === 0) return;
    const side = cmp.result < 0 ? "left" : "right";
    const child = side === "left" ? tree.leftOf(current) : tree.rightOf(current);
    if (child === undefined) {
      yield tree.insertNode(value, current, side, { line: 1, sourceLine: 14 });
      return;
    }
    current = child;
  }
}

function* inorderWalk(tree: InstrumentedTree, id: NodeId | undefined): AlgorithmGenerator {
  if (id === undefined) return;
  yield* inorderWalk(tree, tree.leftOf(id));
  yield tree.visitNode(id, { line: 5, sourceLine: 24 });
  yield* inorderWalk(tree, tree.rightOf(id));
}

function* run(input: ArrayInput, tree: InstrumentedTree): AlgorithmGenerator {
  for (const value of input.values) {
    yield* insertOne(tree, value);
  }
  yield* inorderWalk(tree, tree.rootId ?? undefined);
}

export const inorderTraversalPlugin: TreePlugin = {
  metadata,
  inputConstraints,
  run,
};
