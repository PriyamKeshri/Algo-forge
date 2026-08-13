import { useRef, useState } from "react";
import { nodeId as toNodeId, type EdgeId, type GraphInput, type NodeId } from "@algoviz/core";
import {
  addEdge,
  addNode,
  deleteEdge,
  deleteNode,
  moveNode,
  setEdgeWeight,
  setEndNode,
  setStartNode,
} from "./graph-editor-logic";

export interface GraphEditorProps {
  input: GraphInput;
  onChange: (input: GraphInput) => void;
  /** Dijkstra/Prim's/Kruskal's all need a weight on every edge — when true, connecting two nodes prompts for one (defaulting to 1), and existing edges' weights become clickable to change. BFS/DFS leave this unset and never see a prompt. */
  weighted?: boolean;
}

/** `window.prompt` is the whole UI here on purpose — a modal number field would be more polish, but this editor is already a "click and drag on an SVG canvas" tool, not a form; one more native prompt fits that register without adding a whole new input widget for a rarely-touched action. */
function promptForWeight(defaultValue: number): number {
  const raw = window.prompt("Edge weight:", String(defaultValue));
  if (raw === null) return defaultValue;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

const VIEW_SIZE = 300;
const NODE_RADIUS = 14;
/** Below this pointer travel (px, in SVG user units), a node interaction counts as a click, not a drag. */
const DRAG_THRESHOLD = 4;

type Pending = { nodeId: NodeId; startX: number; startY: number } | null;

/**
 * Interactive companion to GraphRenderer (packages/ui/src/renderers/GraphRenderer.tsx)
 * — that one is a pure, read-only "what does this structure look like"
 * display used for both the pre-run preview and post-run playback;
 * this one is only ever shown pre-run (apps/web swaps back to
 * GraphRenderer once a run starts), so there's no risk of a stray click
 * mid-playback silently editing the graph an already-loaded run depends on.
 *
 * Interaction model (unambiguous by construction — every gesture starts
 * with a mousedown and is resolved entirely by where the mouseup lands):
 *   - mousedown on empty canvas, mouseup without much movement -> add a node there
 *   - mousedown on a node, mouseup on a *different* node        -> connect them
 *   - mousedown on a node, mouseup on empty space after a drag  -> move that node
 *   - mousedown on a node, mouseup without much movement        -> set it as the start (or end) node, per `pickMode` below
 *   - right-click a node or edge                                -> delete it
 */
export function GraphEditor({ input, onChange, weighted = false }: GraphEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [ghostPoint, setGhostPoint] = useState<{ x: number; y: number } | null>(null);
  // Only Dijkstra/Prim's/Kruskal's (weighted=true) have any use for an end
  // node — BFS/DFS never read `endNodeId`, so this toggle (and end-node
  // picking entirely) stays hidden for them, same as the edge-weight
  // prompt already does. A plain click always sets the start node when
  // this is "start" (unconditionally true whenever the toggle itself is
  // hidden), and the end node when it's "end".
  const [pickMode, setPickMode] = useState<"start" | "end">("start");

  function toSvgPoint(clientX: number, clientY: number): { x: number; y: number } {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const transformed = point.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  function handleCanvasMouseDown(event: React.MouseEvent<SVGSVGElement>) {
    if (event.button !== 0 || event.target !== svgRef.current) return; // left-click on empty canvas only
    onChange(addNode(input, toSvgPoint(event.clientX, event.clientY)));
  }

  function handleNodeMouseDown(event: React.MouseEvent, id: NodeId) {
    if (event.button !== 0) return;
    event.stopPropagation(); // don't also trigger handleCanvasMouseDown
    setPending({ nodeId: id, startX: event.clientX, startY: event.clientY });
  }

  function handleMouseMove(event: React.MouseEvent<SVGSVGElement>) {
    if (!pending) return;
    setGhostPoint(toSvgPoint(event.clientX, event.clientY));
  }

  function handleMouseUp(event: React.MouseEvent<SVGSVGElement>) {
    if (!pending) return;
    const dx = event.clientX - pending.startX;
    const dy = event.clientY - pending.startY;
    const dragged = Math.hypot(dx, dy) > DRAG_THRESHOLD;

    // elementFromPoint (rather than relying on React's event target/bubbling)
    // reliably answers "what's actually under the cursor right now" even
    // though the mouseup handler is bound to the <svg>, not the node.
    const targetEl = document.elementFromPoint(event.clientX, event.clientY);
    const targetNodeId = targetEl?.getAttribute("data-node-id");

    if (targetNodeId && targetNodeId !== pending.nodeId) {
      const weight = weighted ? promptForWeight(1) : undefined;
      onChange(addEdge(input, pending.nodeId, toNodeId(targetNodeId), weight));
    } else if (!dragged) {
      onChange(weighted && pickMode === "end" ? setEndNode(input, pending.nodeId) : setStartNode(input, pending.nodeId));
    } else {
      onChange(moveNode(input, pending.nodeId, toSvgPoint(event.clientX, event.clientY)));
    }

    setPending(null);
    setGhostPoint(null);
  }

  function handleNodeContextMenu(event: React.MouseEvent, id: NodeId) {
    event.preventDefault();
    event.stopPropagation();
    onChange(deleteNode(input, id));
  }

  function handleEdgeContextMenu(event: React.MouseEvent, id: EdgeId) {
    event.preventDefault();
    onChange(deleteEdge(input, id));
  }

  function handleEdgeClick(id: EdgeId, currentWeight: number | undefined) {
    if (!weighted) return;
    onChange(setEdgeWeight(input, id, promptForWeight(currentWeight ?? 1)));
  }

  const pendingSource = pending ? input.nodes.find((n) => n.id === pending.nodeId) : undefined;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      {weighted && (
        <div className="mb-2 flex items-center gap-2 text-xs">
          <span className="text-slate-500">Clicking a node sets it as:</span>
          <button
            type="button"
            onClick={() => setPickMode("start")}
            className={`rounded-full border px-2.5 py-1 ${
              pickMode === "start" ? "border-accent-2 bg-accent-2/20 text-accent-2" : "border-border text-slate-400 hover:bg-surface-alt"
            }`}
          >
            ● Start
          </button>
          <button
            type="button"
            onClick={() => setPickMode("end")}
            className={`rounded-full border px-2.5 py-1 ${
              pickMode === "end" ? "border-success bg-success/20 text-success" : "border-border text-slate-400 hover:bg-surface-alt"
            }`}
          >
            ● End
          </button>
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
        className="h-72 w-full cursor-crosshair"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setPending(null);
          setGhostPoint(null);
        }}
      >
        <g>
          {input.edges.map((edge) => {
            const from = input.nodes.find((n) => n.id === edge.source)?.position;
            const to = input.nodes.find((n) => n.id === edge.target)?.position;
            if (!from || !to) return null;
            const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
            return (
              <g key={edge.id}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className="cursor-pointer stroke-border hover:stroke-danger"
                  strokeWidth={2}
                  onContextMenu={(e) => handleEdgeContextMenu(e, edge.id)}
                  onClick={() => handleEdgeClick(edge.id, edge.weight)}
                />
                {weighted && edge.weight !== undefined && (
                  <text
                    x={mid.x}
                    y={mid.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    pointerEvents="none"
                    className="select-none fill-slate-400 text-[9px]"
                  >
                    {edge.weight}
                  </text>
                )}
              </g>
            );
          })}
          {pendingSource?.position && ghostPoint && (
            <line
              x1={pendingSource.position.x}
              y1={pendingSource.position.y}
              x2={ghostPoint.x}
              y2={ghostPoint.y}
              className="stroke-accent-2"
              strokeWidth={2}
              strokeDasharray="4 3"
              pointerEvents="none"
            />
          )}
        </g>
        <g>
          {input.nodes.map((node) => {
            const pos = node.position ?? { x: VIEW_SIZE / 2, y: VIEW_SIZE / 2 };
            const isStart = node.id === input.startNodeId;
            // A node being both start and end (a trivial single-node
            // "path") is legal — start's color wins visually in that rare
            // case; the label text next to the toggle above is the source
            // of truth either way, this is just a quick-glance cue.
            const isEnd = !isStart && weighted && node.id === input.endNodeId;
            return (
              <g key={node.id}>
                <circle
                  data-node-id={node.id}
                  cx={pos.x}
                  cy={pos.y}
                  r={NODE_RADIUS}
                  className={`cursor-grab ${
                    isStart
                      ? "fill-accent-2 stroke-accent-2"
                      : isEnd
                        ? "fill-success stroke-success"
                        : "fill-surface-alt stroke-border"
                  } hover:stroke-danger active:cursor-grabbing`}
                  strokeWidth={isStart || isEnd ? 3 : 2}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onContextMenu={(e) => handleNodeContextMenu(e, node.id)}
                />
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  pointerEvents="none"
                  className="select-none fill-white text-[10px] font-medium"
                >
                  {node.label ?? node.id}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <p className="mt-2 text-xs text-slate-500">
        Click empty space to add a node · drag between nodes to connect · click a node to set it as{" "}
        {weighted ? "the start or end node (see toggle above)" : "start"} · drag a node to move it · right-click to
        delete
        {weighted && " · click an edge to change its weight"}
      </p>
    </div>
  );
}
