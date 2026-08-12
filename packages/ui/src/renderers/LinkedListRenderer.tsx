import type { LinkedListNode, LinkedListSnapshot, NodeId, VisualizationEvent } from "@algoviz/core";
import type { StructureRendererProps } from "./renderer-types";

type BoxRole = "default" | "visited" | "current";

/** Walks `next` pointers from `headId`, stopping once every node has been visited once — the natural traversal bound for every variant, including circular (whose tail wraps back to head). */
function orderedNodes(structure: LinkedListSnapshot): LinkedListNode[] {
  const { nodes, headId } = structure;
  const size = Object.keys(nodes).length;
  const out: LinkedListNode[] = [];
  let cur = headId;
  const seen = new Set<NodeId>();
  while (cur !== null && !seen.has(cur) && out.length < size) {
    const node = nodes[cur];
    if (!node) break;
    out.push(node);
    seen.add(cur);
    cur = node.next ?? null;
  }
  return out;
}

function roleFor(id: NodeId, visited: boolean, activeEvent: VisualizationEvent | null): BoxRole {
  if (activeEvent && "nodeId" in activeEvent && activeEvent.nodeId === id) {
    if (activeEvent.type === "ll-insert" || activeEvent.type === "compare-node" || activeEvent.type === "visit-node") {
      return "current";
    }
  }
  return visited ? "visited" : "default";
}

/** A linked-list-category run only ever produces ll-insert/ll-delete/ll-reverse/visit-node/compare-node events — every case here is exhaustive for that. */
function captionFor(structure: LinkedListSnapshot, activeEvent: VisualizationEvent | null): string | null {
  if (!activeEvent) return null;
  switch (activeEvent.type) {
    case "ll-insert":
      return `Inserted ${activeEvent.value}${activeEvent.afterId ? "" : " (new head)"}`;
    case "ll-delete":
      return `Deleted ${activeEvent.value}`;
    case "ll-reverse":
      return "Reversed";
    case "visit-node":
      return `Visited ${structure.nodes[activeEvent.nodeId]?.value ?? ""}`;
    case "compare-node":
      return `Compared ${activeEvent.value} → ${
        activeEvent.result === 0 ? "match" : activeEvent.result < 0 ? "node < value" : "node > value"
      }`;
    default:
      return null;
  }
}

const BOX_CLASSES: Record<BoxRole, string> = {
  default: "border-border bg-accent/40",
  visited: "border-accent bg-accent",
  current: "border-accent-2 bg-accent-2 shadow-[0_0_10px_var(--color-accent-2)]",
};

const VARIANT_LABEL: Record<LinkedListSnapshot["variant"], string> = {
  singly: "Singly",
  doubly: "Doubly",
  circular: "Circular",
};

export function LinkedListRenderer({ structure, activeEvent }: StructureRendererProps<LinkedListSnapshot>) {
  const nodes = orderedNodes(structure);

  if (nodes.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface text-sm text-slate-500">
        <span>Empty list</span>
        <span className="text-xs text-slate-600">Run a Linked List algorithm to build one</span>
      </div>
    );
  }

  return (
    <div className="flex h-40 flex-col rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 text-xs tabular-nums text-slate-500">
        {VARIANT_LABEL[structure.variant]} · {nodes.length} node{nodes.length === 1 ? "" : "s"}
      </div>
      <div className="flex flex-1 items-center gap-1 overflow-x-auto">
        {nodes.map((node, index) => {
          const role = roleFor(node.id, Boolean(node.visited), activeEvent);
          const isLast = index === nodes.length - 1;
          return (
            <div key={node.id} className="flex flex-shrink-0 items-center gap-1">
              {index === 0 && <span className="text-[10px] uppercase tracking-wide text-slate-500">head</span>}
              <div
                className={`flex h-9 w-16 flex-shrink-0 items-center justify-center rounded border text-sm font-medium tabular-nums text-white transition-all duration-150 ${BOX_CLASSES[role]}`}
              >
                {node.value}
              </div>
              {!isLast && <span className="text-slate-500">→</span>}
              {isLast && structure.variant === "circular" && (
                <span className="text-xs text-slate-500">↻ head</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 h-4 text-xs text-slate-400">{captionFor(structure, activeEvent)}</div>
    </div>
  );
}
