import type { DataStructureSnapshot, VisualizationEvent } from "@algoviz/core";

/**
 * Turns the current `activeEvent` into a plain-English sentence for the AI
 * Tutor's prompt context — "Explain this step, directly from the execution
 * inspector" needs *some* textual description of what just happened, and
 * this is that description. Deliberately separate from each renderer's own
 * `captionFor` (StackRenderer, QueueRenderer, ...): those are tuned for a
 * one-line UI caption next to a specific structure; this covers every event
 * type in one place since the tutor doesn't know in advance which
 * structure kind it's describing.
 */
export function describeEvent(event: VisualizationEvent | null): string | undefined {
  if (!event) return undefined;
  switch (event.type) {
    case "compare":
      return `Compared array[${event.indices[0]}] and array[${event.indices[1]}] (${relation(event.result)}).`;
    case "compare-value":
      return `Compared array[${event.index}] against the target ${event.target} (${relation(event.result)}).`;
    case "swap":
      return `Swapped array[${event.indices[0]}] and array[${event.indices[1]}].`;
    case "set":
      return `Set array[${event.index}] = ${event.value}${event.previousValue !== undefined ? ` (was ${event.previousValue})` : ""}.`;
    case "read":
      return `Read the value ${event.value} at index ${event.index}.`;
    case "highlight":
      return `Highlighted indices [${event.indices.join(", ")}]${event.role ? ` (role: ${event.role})` : ""}.`;
    case "mark-done":
      return `Marked indices [${event.indices.join(", ")}] as finished.`;
    case "visit-node":
      return `Visited node ${event.nodeId}.`;
    case "traverse-edge":
      return `Traversed edge ${event.edgeId}.`;
    case "rotate":
      return `Rotated node ${event.nodeId} ${event.direction}.`;
    case "insert-node":
      return `Inserted node ${event.nodeId} (value ${event.value})${
        event.parentId !== undefined ? ` under ${event.parentId} as its ${event.side} child` : " as the root"
      }.`;
    case "compare-node":
      return `Compared the value ${event.value} against node ${event.nodeId} (${relation(event.result)}).`;
    case "push":
      return `Pushed ${event.value} onto the stack.`;
    case "pop":
      return `Popped ${event.value} off the stack.`;
    case "stack-check":
      return `Checked ${event.check}() → ${event.result}.`;
    case "enqueue":
      return `Enqueued ${event.value}${event.end ? ` at the ${event.end}` : ""}.`;
    case "dequeue":
      return `Dequeued ${event.value}${event.end ? ` from the ${event.end}` : ""}.`;
    case "queue-check":
      return `Checked ${event.check}() → ${event.result}.`;
    case "ll-insert":
      return `Inserted a node with value ${event.value}${
        event.afterId !== undefined ? ` after node ${event.afterId}` : " as the new head"
      }.`;
    case "ll-delete":
      return `Deleted the node holding value ${event.value}.`;
    case "ll-reverse":
      return "Reversed the list.";
  }
}

function relation(result: -1 | 0 | 1): string {
  return result < 0 ? "less than" : result > 0 ? "greater than" : "equal";
}

const MAX_SUMMARY_LENGTH = 400;

function truncate(text: string): string {
  return text.length > MAX_SUMMARY_LENGTH ? `${text.slice(0, MAX_SUMMARY_LENGTH)}…` : text;
}

/** Walks `next` pointers from `headId`, bounded by node count — safe for a circular list's wraparound. Mirrors LinkedListRenderer's own walk, duplicated locally since this is describing text, not rendering boxes. */
function linkedListValuesInOrder(structure: Extract<DataStructureSnapshot, { kind: "linked-list" }>): number[] {
  const size = Object.keys(structure.nodes).length;
  const values: number[] = [];
  let cur = structure.headId;
  const seen = new Set<string>();
  while (cur !== null && !seen.has(cur) && values.length < size) {
    const node = structure.nodes[cur];
    if (!node) break;
    values.push(node.value);
    seen.add(cur);
    cur = node.next ?? null;
  }
  return values;
}

/**
 * A short textual snapshot of "what the data looks like right now" for the
 * tutor's prompt — every structure kind gets its own compact rendering
 * (values in order, capacity, front/rear, visited nodes, ...) since a
 * generic `JSON.stringify` would be both harder for the model to read and
 * far larger than it needs to be.
 */
export function describeStructure(structure: DataStructureSnapshot): string {
  switch (structure.kind) {
    case "array":
      return truncate(`Array: [${structure.values.join(", ")}]`);
    case "graph": {
      const visited = structure.nodes.filter((n) => n.visited).map((n) => n.id);
      return truncate(
        `Graph: ${structure.nodes.length} nodes, ${structure.edges.length} edges. Visited so far: ${
          visited.length > 0 ? visited.join(", ") : "none"
        }.`,
      );
    }
    case "tree":
      return truncate(`Tree with ${Object.keys(structure.nodes).length} node(s), root ${structure.rootId ?? "none"}.`);
    case "stack":
      return truncate(
        `Stack (top last): [${structure.values.join(", ")}]${structure.capacity !== undefined ? `, capacity ${structure.capacity}` : ""}.`,
      );
    case "queue":
      return truncate(
        `Queue (front first): [${structure.values.join(", ")}]${structure.capacity !== undefined ? `, capacity ${structure.capacity}` : ""}.`,
      );
    case "circular-queue":
      return truncate(
        `Circular queue, capacity ${structure.capacity}, front index ${structure.front}, rear index ${structure.rear}, slots: [${structure.slots
          .map((s) => (s === null ? "_" : s))
          .join(", ")}].`,
      );
    case "linked-list": {
      const values = linkedListValuesInOrder(structure);
      return truncate(
        `${structure.variant} linked list, head to tail: [${values.join(", ")}]${
          structure.variant === "circular" ? " (tail wraps back to head)" : ""
        }.`,
      );
    }
  }
}
