import type { ArraySnapshot, VisualizationEvent } from "@algoviz/core";
import type { StructureRendererProps } from "./renderer-types";
import { useTimelineStore } from "../timeline/timeline-store";

type BoxRole = "default" | "current" | "eliminated" | "found";

/**
 * Purely from `activeEvent`, matching ArrayRenderer's own scope decision
 * (see its doc comment) — no accumulated "checked so far" set. Linear
 * Search only ever produces `compare-value`/`mark-done`; Binary Search adds
 * `highlight` (role "window") for its shrinking [low, high] range —
 * everything outside that range is drawn dimmed ("eliminated") for the one
 * step the window event is active.
 */
function roleForIndex(index: number, activeEvent: VisualizationEvent | null): BoxRole {
  if (!activeEvent) return "default";
  switch (activeEvent.type) {
    case "compare-value":
      return activeEvent.index === index ? "current" : "default";
    case "highlight": {
      if (activeEvent.role !== "window") return "default";
      const [low, high] = activeEvent.indices;
      if (low === undefined || high === undefined) return "default";
      return index < low || index > high ? "eliminated" : "default";
    }
    case "mark-done":
      return activeEvent.indices.includes(index) ? "found" : "default";
    default:
      return "default";
  }
}

function captionFor(structure: ArraySnapshot, activeEvent: VisualizationEvent | null): string | null {
  if (!activeEvent) return null;
  switch (activeEvent.type) {
    case "compare-value": {
      const value = structure.values[activeEvent.index];
      const relation = activeEvent.result === 0 ? "= target" : activeEvent.result < 0 ? "< target" : "> target";
      return `Checking index ${activeEvent.index} (${value}) ${relation} (${activeEvent.target})`;
    }
    case "highlight":
      return activeEvent.role === "window"
        ? `Narrowing the search window to indices ${activeEvent.indices[0]}–${activeEvent.indices[1]}`
        : null;
    case "mark-done":
      return `Found ${structure.values[activeEvent.indices[0]!]} at index ${activeEvent.indices[0]}!`;
    default:
      return null;
  }
}

const BOX_CLASSES: Record<BoxRole, string> = {
  default: "border-border bg-accent/40 text-white",
  current: "border-accent-2 bg-accent-2 text-white shadow-[0_0_10px_var(--color-accent-2)]",
  eliminated: "border-border bg-surface-alt text-slate-600 opacity-40",
  found: "border-success bg-success text-white shadow-[0_0_10px_var(--color-success)]",
};

/**
 * The searching-category counterpart to ArrayRenderer — fixed-size number
 * boxes (index above, value inside) instead of a bar chart. A bar's height
 * is a natural way to compare magnitudes at a glance (sorting's whole
 * point); search doesn't care about magnitude, it cares about *position*,
 * which a box with a stable index label communicates more directly, and
 * unlike a bar's on-top text label a box's content can't be pushed outside
 * its own boundary as the array gets denser — `flex-wrap` moves overflow to
 * a new row instead of shrinking boxes into illegible slivers.
 */
export function ArraySearchRenderer({ structure, activeEvent }: StructureRendererProps<ArraySnapshot>) {
  const events = useTimelineStore((s) => s.events);
  const currentStep = useTimelineStore((s) => s.currentStep);

  const { values } = structure;

  if (values.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-border bg-surface text-sm text-slate-500">
        Empty array
      </div>
    );
  }

  // "Are we sitting on the very last event of this run?" — the one place
  // this renderer looks past `activeEvent` at the whole run, needed to show
  // a persistent found/not-found result rather than just the fleeting
  // instant `mark-done` was active.
  const lastEvent = events.length > 0 ? events[events.length - 1]! : null;
  const atEnd = lastEvent !== null && currentStep === lastEvent.step;
  const found = lastEvent && atEnd && lastEvent.type === "mark-done" ? lastEvent : null;
  const exhausted = atEnd && !found;

  return (
    <div className="flex min-h-56 flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex max-h-72 flex-wrap content-start gap-2 overflow-y-auto">
        {values.map((value, index) => {
          const role = roleForIndex(index, activeEvent);
          return (
            <div key={index} className="flex flex-col items-center gap-1">
              <span className="text-[10px] tabular-nums text-slate-500">{index}</span>
              {/* Fixed box size + overflow-hidden: a value never pushes past
                  its own box, no matter how many digits it has (valueRange
                  keeps it to at most 3, which this width comfortably fits). */}
              <div
                className={`flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded border text-sm font-medium tabular-nums transition-all duration-150 ${BOX_CLASSES[role]}`}
                title={String(value)}
              >
                {value}
              </div>
            </div>
          );
        })}
      </div>

      <div className="min-h-10 rounded border border-border bg-surface-alt px-3 py-2 text-sm">
        {found ? (
          <span className="font-medium text-success">
            🎯 Found {values[found.indices[0]!]} at index {found.indices[0]}
          </span>
        ) : exhausted ? (
          <span className="font-medium text-danger">❌ Target not found in the array</span>
        ) : (
          <span className="text-slate-400">{captionFor(structure, activeEvent) ?? "Press Play to start the search."}</span>
        )}
      </div>
    </div>
  );
}
