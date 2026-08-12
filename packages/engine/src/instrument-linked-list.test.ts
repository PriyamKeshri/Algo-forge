import { describe, expect, it } from "vitest";
import { createInstrumentedLinkedList } from "./instrument-linked-list";

/** Walks `next` from head, bounded by `size` so a circular list's wraparound can't infinite-loop the test. */
function toArray(list: ReturnType<typeof createInstrumentedLinkedList>): number[] {
  const out: number[] = [];
  let cur = list.headId;
  for (let i = 0; i < list.size && cur !== null; i++) {
    out.push(list.valueOf(cur));
    cur = list.nextOf(cur) ?? null;
  }
  return out;
}

describe("createInstrumentedLinkedList (singly)", () => {
  it("starts empty", () => {
    const list = createInstrumentedLinkedList("singly");
    expect(list.size).toBe(0);
    expect(list.headId).toBeNull();
  });

  it("insertHead/insertTail build the expected order and return ll-insert events", () => {
    const list = createInstrumentedLinkedList("singly");
    const e1 = list.insertTail(1); // [1]
    const e2 = list.insertHead(0); // [0, 1]
    const e3 = list.insertTail(2); // [0, 1, 2]
    expect(e1).toMatchObject({ type: "ll-insert", value: 1, afterId: undefined });
    expect(e2).toMatchObject({ type: "ll-insert", value: 0, afterId: undefined });
    expect(e3).toMatchObject({ type: "ll-insert", value: 2, afterId: e1.nodeId });
    expect(toArray(list)).toEqual([0, 1, 2]);
    expect(list.size).toBe(3);
  });

  it("deleteNode unlinks head, middle, and tail correctly", () => {
    const list = createInstrumentedLinkedList("singly");
    const a = list.insertTail(1);
    const b = list.insertTail(2);
    const c = list.insertTail(3); // [1, 2, 3]

    const delMid = list.deleteNode(b.nodeId);
    expect(delMid).toMatchObject({ type: "ll-delete", value: 2 });
    expect(toArray(list)).toEqual([1, 3]);

    list.deleteNode(a.nodeId); // delete head
    expect(toArray(list)).toEqual([3]);

    list.deleteNode(c.nodeId); // delete the only remaining node
    expect(toArray(list)).toEqual([]);
    expect(list.headId).toBeNull();
    expect(list.size).toBe(0);
  });

  it("reverse() flips the order and reports the new head-to-tail id order", () => {
    const list = createInstrumentedLinkedList("singly");
    const a = list.insertTail(1);
    const b = list.insertTail(2);
    const c = list.insertTail(3); // [1, 2, 3]
    const event = list.reverse();
    expect(event.order).toEqual([c.nodeId, b.nodeId, a.nodeId]);
    expect(toArray(list)).toEqual([3, 2, 1]);
    expect(list.headId).toBe(c.nodeId);
  });

  it("compare() reports -1/0/1 without mutating; visit() marks the node persistently visited", () => {
    const list = createInstrumentedLinkedList("singly");
    const a = list.insertTail(5);
    expect(list.compare(a.nodeId, 5).result).toBe(0);
    expect(list.compare(a.nodeId, 9).result).toBe(1); // 9 > node's value (5)
    expect(list.compare(a.nodeId, 1).result).toBe(-1); // 1 < node's value (5)
    expect(list.snapshot().nodes[a.nodeId]?.visited).toBe(false);
    list.visit(a.nodeId);
    expect(list.snapshot().nodes[a.nodeId]?.visited).toBe(true);
  });

  it("snapshot() is an independent copy", () => {
    const list = createInstrumentedLinkedList("singly");
    list.insertTail(1);
    const snap = list.snapshot();
    list.insertTail(2);
    expect(Object.keys(snap.nodes)).toHaveLength(1);
  });
});

describe("createInstrumentedLinkedList (doubly)", () => {
  it("keeps prev pointers consistent through inserts, a middle delete, and reverse", () => {
    const list = createInstrumentedLinkedList("doubly");
    const a = list.insertTail(1);
    const b = list.insertTail(2);
    const c = list.insertTail(3); // [1, 2, 3]

    let snap = list.snapshot();
    expect(snap.nodes[a.nodeId]?.prev).toBeUndefined();
    expect(snap.nodes[b.nodeId]?.prev).toBe(a.nodeId);
    expect(snap.nodes[c.nodeId]?.prev).toBe(b.nodeId);

    list.deleteNode(b.nodeId); // [1, 3]
    snap = list.snapshot();
    expect(snap.nodes[c.nodeId]?.prev).toBe(a.nodeId);

    list.reverse(); // [3, 1]
    snap = list.snapshot();
    expect(snap.nodes[a.nodeId]?.prev).toBe(c.nodeId);
    expect(snap.nodes[c.nodeId]?.prev).toBeUndefined();
  });
});

describe("createInstrumentedLinkedList (circular)", () => {
  it("keeps the tail's next wrapped back to head through inserts and deletes", () => {
    const list = createInstrumentedLinkedList("circular");
    const a = list.insertTail(1);
    const b = list.insertTail(2);
    expect(list.nextOf(b.nodeId)).toBe(a.nodeId); // wraps back to head

    list.insertHead(0); // [0, 1, 2], wraps back to the new head
    const newHead = list.headId!;
    expect(list.nextOf(b.nodeId)).toBe(newHead);

    list.deleteNode(a.nodeId);
    expect(toArray(list)).toEqual([0, 2]);
    expect(list.nextOf(b.nodeId)).toBe(newHead); // still wraps after the delete
  });
});
