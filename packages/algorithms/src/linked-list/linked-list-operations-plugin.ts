import {
  algorithmId,
  type AlgorithmMetadata,
  type InputConstraints,
  type LinkedListInput,
  type LinkedListVariant,
  type PseudocodeLine,
} from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedLinkedList } from "@algoviz/engine";
import type { LinkedListPlugin } from "../registry";

// Mirrors `run` below line-for-line (sourceLine tags themselves omitted —
// see the note in ../sorting/bubble-sort.ts for why), checked by the
// drift-detection test in linked-list.test.ts. Shared by all three variant
// plugins: insert/delete/search/traverse/reverse are expressed purely
// against InstrumentedLinkedList's head/`next`-pointer API, which is
// identical across variants — `variant` only changes what the
// snapshot/renderer additionally track (a `prev` pointer for doubly, a
// tail->head wraparound for circular), not what operations are available.
// Walks are bounded by `list.size` rather than "until `next` is null" —
// for a circular list, `next` never becomes null (the tail always wraps
// back to the head), so an unbounded walk would never terminate.
const SOURCE_CODE = `function* run(input: LinkedListInput, list: InstrumentedLinkedList): AlgorithmGenerator {
  for (const op of input.operations) {
    if (op.type === "insertHead") {
      yield list.insertHead(op.value, { line: 3 });
    } else if (op.type === "insertTail") {
      yield list.insertTail(op.value, { line: 4 });
    } else if (op.type === "deleteValue") {
      let cur = list.headId;
      for (let i = 0; i < list.size && cur !== null; i++) {
        const cmp = list.compare(cur, op.value, { line: 5 });
        yield cmp;
        if (cmp.result === 0) {
          yield list.deleteNode(cur, { line: 5 });
          break;
        }
        cur = list.nextOf(cur) ?? null;
      }
    } else if (op.type === "search") {
      let cur = list.headId;
      for (let i = 0; i < list.size && cur !== null; i++) {
        const cmp = list.compare(cur, op.value, { line: 6 });
        yield cmp;
        if (cmp.result === 0) break;
        cur = list.nextOf(cur) ?? null;
      }
    } else if (op.type === "traverse") {
      let cur = list.headId;
      for (let i = 0; i < list.size && cur !== null; i++) {
        yield list.visit(cur, { line: 7 });
        cur = list.nextOf(cur) ?? null;
      }
    } else {
      yield list.reverse({ line: 8 });
    }
  }
}`;

const PSEUDOCODE: PseudocodeLine[] = [
  { line: 1, text: "for each operation in the sequence" },
  { line: 2, text: "match operation:", indent: 1 },
  { line: 3, text: "insertHead(value): new node becomes head", indent: 2 },
  { line: 4, text: "insertTail(value): new node becomes tail", indent: 2 },
  { line: 5, text: "deleteValue(value): walk from head, compare, unlink on match", indent: 2 },
  { line: 6, text: "search(value): walk from head, compare until found", indent: 2 },
  { line: 7, text: "traverse: visit every node head to tail", indent: 2 },
  { line: 8, text: "reverse: flip every next pointer", indent: 2 },
];

function* run(input: LinkedListInput, list: InstrumentedLinkedList): AlgorithmGenerator {
  for (const op of input.operations) {
    if (op.type === "insertHead") {
      yield list.insertHead(op.value, { line: 3, sourceLine: 4 });
    } else if (op.type === "insertTail") {
      yield list.insertTail(op.value, { line: 4, sourceLine: 6 });
    } else if (op.type === "deleteValue") {
      let cur = list.headId;
      for (let i = 0; i < list.size && cur !== null; i++) {
        const cmp = list.compare(cur, op.value, { line: 5, sourceLine: 10 });
        yield cmp;
        if (cmp.result === 0) {
          yield list.deleteNode(cur, { line: 5, sourceLine: 13 });
          break;
        }
        cur = list.nextOf(cur) ?? null;
      }
    } else if (op.type === "search") {
      let cur = list.headId;
      for (let i = 0; i < list.size && cur !== null; i++) {
        const cmp = list.compare(cur, op.value, { line: 6, sourceLine: 21 });
        yield cmp;
        if (cmp.result === 0) break;
        cur = list.nextOf(cur) ?? null;
      }
    } else if (op.type === "traverse") {
      let cur = list.headId;
      for (let i = 0; i < list.size && cur !== null; i++) {
        yield list.visit(cur, { line: 7, sourceLine: 29 });
        cur = list.nextOf(cur) ?? null;
      }
    } else {
      yield list.reverse({ line: 8, sourceLine: 33 });
    }
  }
}

/** Builds one of the three Linked List Operations plugins — same `run`/pseudocode/source, different id/name/description/variant. */
export function createLinkedListOperationsPlugin(
  variant: LinkedListVariant,
  id: string,
  name: string,
  description: string,
): LinkedListPlugin {
  const metadata: AlgorithmMetadata = {
    id: algorithmId(id),
    name,
    category: "linked-list",
    description,
    complexity: { best: "O(1)", average: "O(n)", worst: "O(n)", space: "O(n)" },
    pseudocode: PSEUDOCODE,
    sourceCode: { language: "typescript", code: SOURCE_CODE },
  };

  const inputConstraints: InputConstraints = {
    kind: "linked-list",
    minSize: 1,
    // LinkedListRenderer draws one fixed-size box (+ arrow) per node in a
    // horizontally scrollable row — kept small enough to stay a quick,
    // legible scroll.
    maxSize: 50,
    defaultSize: 20,
    valueRange: [1, 100],
    listVariant: variant,
  };

  return { metadata, inputConstraints, run };
}
