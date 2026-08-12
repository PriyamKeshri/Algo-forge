import {
  generateId,
  nodeId,
  type CompareNodeEvent,
  type LinkedListDeleteEvent,
  type LinkedListInsertEvent,
  type LinkedListReverseEvent,
  type LinkedListSnapshot,
  type LinkedListVariant,
  type NodeId,
  type VisitNodeEvent,
} from "@algoviz/core";
import type { EventMeta } from "./instrument";

interface LiveNode {
  id: NodeId;
  value: number;
  next?: NodeId;
  prev?: NodeId;
  visited: boolean;
}

/**
 * The object Linked List plugins write against — one implementation shared
 * by all three variants (`variant` only changes what `snapshot()` exposes:
 * `prev` pointers for `doubly`, a tail->head wraparound for `circular`; the
 * splicing logic itself is identical). Like `InstrumentedStack`/
 * `InstrumentedTree`, a list starts empty and grows via `insertHead`/
 * `insertTail`, which generate their own `NodeId` the same way
 * `InstrumentedTree.insertNode` does.
 *
 * `valueOf`/`nextOf` are silent (no event) — control-flow reads only,
 * mirroring `InstrumentedArray.get()`.
 */
export interface InstrumentedLinkedList {
  readonly size: number;
  readonly headId: NodeId | null;
  readonly variant: LinkedListVariant;
  valueOf(id: NodeId): number;
  nextOf(id: NodeId): NodeId | undefined;
  insertHead(value: number, meta?: EventMeta): LinkedListInsertEvent;
  insertTail(value: number, meta?: EventMeta): LinkedListInsertEvent;
  deleteNode(id: NodeId, meta?: EventMeta): LinkedListDeleteEvent;
  visit(id: NodeId, meta?: EventMeta): VisitNodeEvent;
  compare(id: NodeId, value: number, meta?: EventMeta): CompareNodeEvent;
  /** Flips every `next` pointer so the list reads tail-to-head; the new head-to-tail id order travels on the returned event. */
  reverse(meta?: EventMeta): LinkedListReverseEvent;
  snapshot(): LinkedListSnapshot;
}

export function createInstrumentedLinkedList(variant: LinkedListVariant): InstrumentedLinkedList {
  const nodes = new Map<NodeId, LiveNode>();
  let head: NodeId | null = null;
  let tail: NodeId | null = null;
  let step = 0;
  const nextStep = () => step++;

  function requireNode(id: NodeId, op: string): LiveNode {
    const node = nodes.get(id);
    if (!node) throw new RangeError(`InstrumentedLinkedList.${op}: unknown node id "${id}"`);
    return node;
  }

  /**
   * Re-derives `prev` (doubly) and the tail->head wraparound (circular)
   * from the current head/tail/`next` chain — cheaper to recompute in one
   * O(n) pass after a splice than to patch every affected pointer by hand
   * at each call site, mirroring `InstrumentedCircularQueue`'s own
   * from-scratch `rearIndex()` recompute.
   */
  function relink(): void {
    if (variant === "doubly") {
      let prev: NodeId | undefined;
      let cur = head;
      while (cur !== null) {
        const node = nodes.get(cur)!;
        node.prev = prev;
        prev = cur;
        cur = node.next ?? null;
      }
    }
    if (tail !== null) {
      nodes.get(tail)!.next = variant === "circular" ? (head ?? undefined) : undefined;
    }
  }

  /** O(n) scan from head, since only `doubly` tracks `prev` directly. */
  function predecessorOf(id: NodeId): NodeId | undefined {
    if (variant === "doubly") return nodes.get(id)?.prev;
    if (head === null || head === id) return undefined;
    let cur = head;
    for (let i = 0; i < nodes.size; i++) {
      const node = nodes.get(cur)!;
      if (node.next === id) return cur;
      if (node.next === undefined) return undefined;
      cur = node.next;
    }
    return undefined;
  }

  return {
    get size() {
      return nodes.size;
    },
    get headId() {
      return head;
    },
    get variant() {
      return variant;
    },

    valueOf(id) {
      return requireNode(id, "valueOf").value;
    },
    nextOf(id) {
      return requireNode(id, "nextOf").next;
    },

    insertHead(value, meta) {
      const id = nodeId(generateId("ll"));
      nodes.set(id, { id, value, next: head ?? undefined, visited: false });
      head = id;
      if (tail === null) tail = id;
      relink();
      return { type: "ll-insert", step: nextStep(), nodeId: id, value, afterId: undefined, ...meta };
    },

    insertTail(value, meta) {
      const id = nodeId(generateId("ll"));
      const afterId = tail ?? undefined;
      nodes.set(id, { id, value, visited: false });
      if (tail !== null) nodes.get(tail)!.next = id;
      tail = id;
      if (head === null) head = id;
      relink();
      return { type: "ll-insert", step: nextStep(), nodeId: id, value, afterId, ...meta };
    },

    deleteNode(id, meta) {
      const { value } = requireNode(id, "deleteNode");
      const prevId = predecessorOf(id);
      const next = nodes.get(id)!.next;

      if (prevId !== undefined) nodes.get(prevId)!.next = next;
      else head = next ?? null;
      if (id === tail) tail = prevId ?? null;

      nodes.delete(id);
      if (nodes.size === 0) {
        head = null;
        tail = null;
      }
      relink();
      return { type: "ll-delete", step: nextStep(), nodeId: id, value, ...meta };
    },

    visit(id, meta) {
      const node = requireNode(id, "visit");
      node.visited = true;
      return { type: "visit-node", step: nextStep(), nodeId: id, ...meta };
    },

    compare(id, value, meta) {
      const node = requireNode(id, "compare");
      const result = value < node.value ? -1 : value > node.value ? 1 : 0;
      return { type: "compare-node", step: nextStep(), nodeId: id, value, result, ...meta };
    },

    reverse(meta) {
      const order: NodeId[] = [];
      let cur = head;
      for (let i = 0; i < nodes.size && cur !== null; i++) {
        order.push(cur);
        cur = nodes.get(cur)!.next ?? null;
      }
      order.reverse();
      for (let i = 0; i < order.length; i++) {
        nodes.get(order[i]!)!.next = order[i + 1];
      }
      head = order[0] ?? null;
      tail = order[order.length - 1] ?? null;
      relink();
      return { type: "ll-reverse", step: nextStep(), order: [...order], ...meta };
    },

    snapshot(): LinkedListSnapshot {
      const out: LinkedListSnapshot["nodes"] = {};
      for (const [id, node] of nodes) {
        out[id] = { id: node.id, value: node.value, next: node.next, prev: node.prev, visited: node.visited };
      }
      return { kind: "linked-list", variant, nodes: out, headId: head };
    },
  };
}
