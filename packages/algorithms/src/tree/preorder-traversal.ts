import { algorithmId, type AlgorithmMetadata, type ArrayInput, type InputConstraints, type NodeId } from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedTree } from "@algoviz/engine";
import type { TreePlugin } from "../registry";

// Mirrors the insertOne/preorderWalk/run functions below line-for-line
// (sourceLine tags themselves omitted — see the note in
// ../sorting/bubble-sort.ts for why), checked by the drift-detection tests
// in tree.test.ts.
//
// `insertOne` here is a deliberate, self-contained duplicate of
// ../tree/bst-insert.ts's own `insertOne` (see inorder-traversal.ts's
// identical note for why it isn't shared via import).
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

function* preorderWalk(tree: InstrumentedTree, id: NodeId | undefined): AlgorithmGenerator {
  if (id === undefined) return;
  yield tree.visitNode(id, { line: 5 });
  yield* preorderWalk(tree, tree.leftOf(id));
  yield* preorderWalk(tree, tree.rightOf(id));
}

function* run(input: ArrayInput, tree: InstrumentedTree): AlgorithmGenerator {
  for (const value of input.values) {
    yield* insertOne(tree, value);
  }
  yield* preorderWalk(tree, tree.rootId ?? undefined);
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("preorder-traversal"),
  name: "Preorder Traversal",
  category: "tree",
  description:
    "Builds a binary search tree from the input, then walks it preorder: visit the current node first, then recursively visit the left subtree, then the right — the natural order for recreating the tree's shape (each visited node's value always arrives before its children's), e.g. serializing a tree to rebuild later.",
  complexity: { best: "O(n)", average: "O(n)", worst: "O(n)", space: "O(n)" },
  pseudocode: [
    { line: 1, text: "build a BST by inserting each input value (see BST Insert)" },
    { line: 2, text: "preorder(node):" },
    { line: 3, text: "if node is empty: return", indent: 1 },
    { line: 4, text: "visit node", indent: 1 },
    { line: 5, text: "preorder(node.left)", indent: 1 },
    { line: 6, text: "preorder(node.right)", indent: 1 },
    { line: 7, text: "preorder(root)" },
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

function* preorderWalk(tree: InstrumentedTree, id: NodeId | undefined): AlgorithmGenerator {
  if (id === undefined) return;
  yield tree.visitNode(id, { line: 4, sourceLine: 23 });
  yield* preorderWalk(tree, tree.leftOf(id));
  yield* preorderWalk(tree, tree.rightOf(id));
}

function* run(input: ArrayInput, tree: InstrumentedTree): AlgorithmGenerator {
  for (const value of input.values) {
    yield* insertOne(tree, value);
  }
  yield* preorderWalk(tree, tree.rootId ?? undefined);
}

export const preorderTraversalPlugin: TreePlugin = {
  metadata,
  inputConstraints,
  run,
};
