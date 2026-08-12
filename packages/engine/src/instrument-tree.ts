import { generateId, nodeId, type CompareNodeEvent, type InsertNodeEvent, type NodeId, type TreeSnapshot, type VisitNodeEvent } from "@algoviz/core";
import type { EventMeta } from "./instrument";

interface LiveTreeNode {
  id: NodeId;
  value: number;
  left?: NodeId;
  right?: NodeId;
  parent?: NodeId;
  visited: boolean;
}

/**
 * The object tree algorithm plugins (BST Insert, Inorder Traversal, ...)
 * write against — the tree counterpart to `InstrumentedArray`/
 * `InstrumentedGraph`. Unlike those two, a tree *starts empty*
 * (`createInstrumentedTree()` takes no data) and grows via `insertNode()`,
 * which — unlike every other instrumented method in this codebase — must
 * generate a fresh `NodeId` itself, since the algorithm doesn't have one
 * for a value that doesn't exist as a node yet. The generated id comes
 * back on the returned event (`event.nodeId`), the same way `InstrumentedArray.read()`
 * returns its value on the event rather than a separate channel.
 *
 * `valueOf`/`leftOf`/`rightOf`/`isVisited` are silent (no event) —
 * control-flow reads only, mirroring `InstrumentedArray.get()`.
 */
export interface InstrumentedTree {
  readonly rootId: NodeId | null;
  readonly nodeIds: NodeId[];
  valueOf(id: NodeId): number;
  leftOf(id: NodeId): NodeId | undefined;
  rightOf(id: NodeId): NodeId | undefined;
  isVisited(id: NodeId): boolean;
  compareNode(id: NodeId, value: number, meta?: EventMeta): CompareNodeEvent;
  visitNode(id: NodeId, meta?: EventMeta): VisitNodeEvent;
  /** `side` is which of `parentId`'s binary slots the new node fills; omit both for a root insert. */
  insertNode(value: number, parentId: NodeId | undefined, side: "left" | "right" | undefined, meta?: EventMeta): InsertNodeEvent;
  snapshot(): TreeSnapshot;
}

export function createInstrumentedTree(): InstrumentedTree {
  const nodeMap = new Map<NodeId, LiveTreeNode>();
  let root: NodeId | null = null;
  let step = 0;
  const nextStep = () => step++;

  function requireNode(id: NodeId, op: string): LiveTreeNode {
    const node = nodeMap.get(id);
    if (!node) throw new RangeError(`InstrumentedTree.${op}: unknown node id "${id}"`);
    return node;
  }

  return {
    get rootId() {
      return root;
    },
    get nodeIds() {
      return [...nodeMap.keys()];
    },

    valueOf(id) {
      return requireNode(id, "valueOf").value;
    },

    leftOf(id) {
      return requireNode(id, "leftOf").left;
    },

    rightOf(id) {
      return requireNode(id, "rightOf").right;
    },

    isVisited(id) {
      return requireNode(id, "isVisited").visited;
    },

    compareNode(id, value, meta) {
      const node = requireNode(id, "compareNode");
      const result = value < node.value ? -1 : value > node.value ? 1 : 0;
      return { type: "compare-node", step: nextStep(), nodeId: id, value, result, ...meta };
    },

    visitNode(id, meta) {
      const node = requireNode(id, "visitNode");
      node.visited = true;
      return { type: "visit-node", step: nextStep(), nodeId: id, ...meta };
    },

    insertNode(value, parentId, side, meta) {
      const id = nodeId(generateId("t"));
      const node: LiveTreeNode = { id, value, visited: false };

      if (parentId !== undefined) {
        const parent = requireNode(parentId, "insertNode");
        node.parent = parentId;
        if (side === "left") parent.left = id;
        else if (side === "right") parent.right = id;
      } else {
        root = id;
      }

      nodeMap.set(id, node);
      return { type: "insert-node", step: nextStep(), nodeId: id, value, parentId, side, ...meta };
    },

    snapshot(): TreeSnapshot {
      const nodes: TreeSnapshot["nodes"] = {};
      for (const [id, node] of nodeMap) {
        const children = [node.left, node.right].filter((childId): childId is NodeId => childId !== undefined);
        nodes[id] = {
          id: node.id,
          value: node.value,
          children,
          parent: node.parent,
          left: node.left,
          right: node.right,
          visited: node.visited,
        };
      }
      return { kind: "tree", nodes, rootId: root };
    },
  };
}
