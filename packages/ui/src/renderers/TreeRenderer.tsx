import type { NodeId, TreeSnapshot, VisualizationEvent } from "@algoviz/core";
import type { StructureRendererProps } from "./renderer-types";

type NodeRole = "default" | "visited" | "current";

/**
 * Unlike GraphRenderer, tree nodes have no pre-set `position` — a graph's
 * shape is fixed by its input generator, but a tree starts empty and grows
 * node-by-node as the algorithm runs, so there's nothing to pre-position.
 * This computes a simple, well-known layout on every render instead: an
 * inorder walk assigns each node the next available x-slot (which, for a
 * BST, also happens to lay nodes out left-to-right in sorted order — a
 * nice property, not a coincidence), and y is just depth. Not a full
 * tidy-tree algorithm (no subtree-width balancing), but adequate for the
 * node counts this app generates.
 */
function computeLayout(
  nodes: TreeSnapshot["nodes"],
  rootId: NodeId | null,
): { positions: Map<string, { x: number; y: number }>; width: number; depth: number } {
  const positions = new Map<string, { x: number; y: number }>();
  let counter = 0;
  let maxDepth = 0;

  function visit(id: NodeId | undefined, depth: number): void {
    if (id === undefined) return;
    const node = nodes[id];
    if (!node) return;
    visit(node.left, depth + 1);
    positions.set(id, { x: counter, y: depth });
    counter += 1;
    maxDepth = Math.max(maxDepth, depth);
    visit(node.right, depth + 1);
  }

  if (rootId !== null) visit(rootId, 0);
  return { positions, width: counter, depth: maxDepth + 1 };
}

function nodeRole(id: NodeId, visited: boolean, activeEvent: VisualizationEvent | null): NodeRole {
  if (
    activeEvent &&
    "nodeId" in activeEvent &&
    activeEvent.nodeId === id &&
    (activeEvent.type === "visit-node" || activeEvent.type === "insert-node" || activeEvent.type === "compare-node")
  ) {
    return "current";
  }
  return visited ? "visited" : "default";
}

const NODE_FILL: Record<NodeRole, string> = {
  default: "fill-surface-alt",
  visited: "fill-accent",
  current: "fill-accent-2",
};

const NODE_STROKE: Record<NodeRole, string> = {
  default: "stroke-border",
  visited: "stroke-accent",
  current: "stroke-accent-2",
};

const NODE_RADIUS = 14;
const H_SPACING = 40;
const V_SPACING = 56;
const PADDING = 30;

export function TreeRenderer({ structure, activeEvent }: StructureRendererProps<TreeSnapshot>) {
  const { nodes, rootId } = structure;

  if (rootId === null) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-border bg-surface text-sm text-slate-500">
        Empty tree — run BST Insert or Inorder Traversal to build one
      </div>
    );
  }

  const { positions, width, depth } = computeLayout(nodes, rootId);
  const toPixel = (slot: { x: number; y: number }) => ({
    x: PADDING + slot.x * H_SPACING,
    y: PADDING + slot.y * V_SPACING,
  });
  const viewWidth = PADDING * 2 + Math.max(1, width - 1) * H_SPACING;
  const viewHeight = PADDING * 2 + Math.max(1, depth - 1) * V_SPACING;

  const nodeList = Object.values(nodes);

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} className="h-72 w-full">
        <g>
          {nodeList.map((node) => {
            if (node.parent === undefined) return null;
            const from = positions.get(node.parent);
            const to = positions.get(node.id);
            if (!from || !to) return null;
            const p1 = toPixel(from);
            const p2 = toPixel(to);
            return (
              <line
                key={`edge-${node.id}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                className="stroke-border transition-all duration-150"
                strokeWidth={1.5}
              />
            );
          })}
        </g>
        <g>
          {nodeList.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const p = toPixel(pos);
            const role = nodeRole(node.id, Boolean(node.visited), activeEvent);
            return (
              <g key={node.id}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={NODE_RADIUS}
                  className={`${NODE_FILL[role]} ${NODE_STROKE[role]} transition-all duration-150`}
                  strokeWidth={role === "current" ? 3 : 2}
                />
                <text
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="select-none fill-white text-[10px] font-medium"
                >
                  {node.value}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
