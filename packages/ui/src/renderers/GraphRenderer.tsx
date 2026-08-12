import type { GraphEdge, GraphNode, GraphSnapshot, VisualizationEvent } from "@algoviz/core";
import type { StructureRendererProps } from "./renderer-types";

type NodeRole = "default" | "visited" | "current";
type EdgeRole = "default" | "traversed" | "current" | "rejected";

/**
 * Unlike ArrayRenderer's role derivation, this genuinely needs persistent
 * state (`node.visited`/`edge.traversed`/`edge.rejected`, set by
 * packages/engine/src/timeline.ts's applyEvent when replaying visit-node/
 * traverse-edge/reject-edge) on top of the current activeEvent — for a
 * traversal to read as a traversal, "visited so far" has to accumulate
 * across the scrub, not reset every frame.
 */
function nodeRole(node: GraphNode, activeEvent: VisualizationEvent | null): NodeRole {
  if (activeEvent?.type === "visit-node" && activeEvent.nodeId === node.id) return "current";
  if (node.visited) return "visited";
  return "default";
}

function edgeRole(edge: GraphEdge, activeEvent: VisualizationEvent | null): EdgeRole {
  if (activeEvent?.type === "traverse-edge" && activeEvent.edgeId === edge.id) return "current";
  if (edge.traversed) return "traversed";
  if (edge.rejected) return "rejected";
  return "default";
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

const EDGE_STROKE: Record<EdgeRole, string> = {
  default: "stroke-border",
  traversed: "stroke-accent",
  current: "stroke-accent-2",
  // Kruskal's: examined but excluded (would've closed a cycle) — dashed and
  // dim rather than just absent, so "considered and rejected" reads
  // differently from "never looked at."
  rejected: "stroke-danger opacity-50",
};

const EDGE_WIDTH: Record<EdgeRole, number> = {
  default: 1.5,
  traversed: 2,
  current: 3,
  rejected: 1.5,
};

// Nodes are always positioned by generate-graph-input.ts today (a fixed
// circular layout), so this is only a defensive fallback — real per-node
// placement is what the future interactive graph editor replaces it with.
const FALLBACK_POSITION = { x: 150, y: 150 };
const NODE_RADIUS = 14;

export function GraphRenderer({ structure, activeEvent }: StructureRendererProps<GraphSnapshot>) {
  const { nodes, edges } = structure;

  if (nodes.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-border bg-surface text-sm text-slate-500">
        Empty graph
      </div>
    );
  }

  const positionOf = (id: string) => nodes.find((node) => node.id === id)?.position ?? FALLBACK_POSITION;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <svg viewBox="0 0 300 300" className="h-72 w-full">
        <g>
          {edges.map((edge) => {
            const role = edgeRole(edge, activeEvent);
            const from = positionOf(edge.source);
            const to = positionOf(edge.target);
            const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
            return (
              <g key={edge.id}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className={`${EDGE_STROKE[role]} transition-all duration-150`}
                  strokeWidth={EDGE_WIDTH[role]}
                  strokeDasharray={role === "rejected" ? "3 3" : undefined}
                />
                {edge.weight !== undefined && (
                  <text
                    x={mid.x}
                    y={mid.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="select-none fill-slate-400 text-[9px]"
                  >
                    {edge.weight}
                  </text>
                )}
              </g>
            );
          })}
        </g>
        <g>
          {nodes.map((node) => {
            const role = nodeRole(node, activeEvent);
            const pos = node.position ?? FALLBACK_POSITION;
            return (
              <g key={node.id}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={NODE_RADIUS}
                  className={`${NODE_FILL[role]} ${NODE_STROKE[role]} transition-all duration-150`}
                  strokeWidth={role === "current" ? 3 : 2}
                />
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="select-none fill-white text-[10px] font-medium"
                >
                  {node.label ?? node.id}
                </text>
                {/* Dijkstra's distance / Prim's key — only ever set on weighted-graph runs (BFS/DFS never call updateNodeValue, so this stays hidden for them). */}
                {node.value !== undefined && (
                  <text
                    x={pos.x}
                    y={pos.y + NODE_RADIUS + 10}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="select-none fill-accent-2 text-[9px] font-medium"
                  >
                    {Number.isFinite(node.value) ? node.value : "∞"}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
