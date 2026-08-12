import type { CircularQueueSnapshot, VisualizationEvent } from "@algoviz/core";
import type { StructureRendererProps } from "./renderer-types";

type BoxRole = "default" | "pushed" | "peeked";

/**
 * Shows every slot (`capacity` of them, fixed) as a row, rather than a
 * literal ring — a rear pointer visibly jumping from the last slot back to
 * slot 0 teaches the wraparound just as clearly as an actual circular
 * layout, without the added engineering cost of positioning boxes and
 * labels around a ring. The front/rear pointer labels sit under whichever
 * slots they currently point at (not necessarily the row's own first/last
 * slot, unlike the plain `QueueRenderer`) — that's the whole visual point
 * of a circular queue.
 */
function roleForIndex(index: number, structure: CircularQueueSnapshot, activeEvent: VisualizationEvent | null): BoxRole {
  if (!activeEvent) return "default";
  // Dequeue can't be highlighted by index — the cleared slot is already
  // null in the current snapshot by the time this renders (the same
  // "event removed the data" problem StackRenderer's pop handling has).
  if (activeEvent.type === "enqueue") return index === structure.rear ? "pushed" : "default";
  if (activeEvent.type === "read") return activeEvent.index === index ? "peeked" : "default"; // peek reuses ReadEvent
  return "default";
}

/** A queue-category run only ever produces enqueue/dequeue/read(peek)/queue-check events — every case here is exhaustive for that. */
function captionFor(activeEvent: VisualizationEvent | null): string | null {
  if (!activeEvent) return null;
  switch (activeEvent.type) {
    case "enqueue":
      return `Enqueued ${activeEvent.value}`;
    case "dequeue":
      return `Dequeued ${activeEvent.value}`;
    case "read":
      return `Peeked ${activeEvent.value}`;
    case "queue-check":
      return `${activeEvent.check}() → ${activeEvent.result}`;
    default:
      return null;
  }
}

const BOX_CLASSES: Record<BoxRole, string> = {
  default: "border-border bg-accent/40",
  pushed: "border-accent-2 bg-accent-2 shadow-[0_0_10px_var(--color-accent-2)]",
  peeked: "border-accent bg-accent",
};

export function CircularQueueRenderer({ structure, activeEvent }: StructureRendererProps<CircularQueueSnapshot>) {
  const { slots, front, rear, size, capacity } = structure;

  return (
    <div className="flex h-40 flex-col rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 text-xs tabular-nums text-slate-500">
        {size} / {capacity} slots
      </div>
      <div className="flex flex-1 items-center gap-1 overflow-x-auto">
        {slots.map((value, index) => {
          const occupied = value !== null;
          const role = occupied ? roleForIndex(index, structure, activeEvent) : "default";
          const isFront = occupied && index === front;
          const isRear = occupied && index === rear;
          return (
            <div key={index} className="flex flex-col items-center gap-1">
              <span className="h-3 text-[10px] uppercase tracking-wide text-slate-500">
                {isFront && isRear ? "front/rear" : isFront ? "front" : isRear ? "rear" : ""}
              </span>
              <div
                className={`flex h-9 w-16 flex-shrink-0 items-center justify-center rounded border text-sm font-medium tabular-nums transition-all duration-150 ${
                  occupied ? `text-white ${BOX_CLASSES[role]}` : "border-dashed border-border text-slate-600"
                }`}
              >
                {value ?? ""}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 h-4 text-xs text-slate-400">{captionFor(activeEvent)}</div>
    </div>
  );
}
