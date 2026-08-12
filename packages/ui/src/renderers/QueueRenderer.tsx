import type { QueueSnapshot, VisualizationEvent } from "@algoviz/core";
import type { StructureRendererProps } from "./renderer-types";

type BoxRole = "default" | "pushed" | "peeked";

/**
 * Front at the left, rear at the right — the usual "line of people" mental
 * model. Dequeue can't be highlighted by index the way enqueue/peek can:
 * the dequeued value is already gone from the current snapshot by the time
 * this renders (the same "event removed the data" problem
 * `StackRenderer`'s pop handling has), so `captionFor` derives a
 * human-readable line straight from the event instead.
 */
function roleForIndex(index: number, size: number, activeEvent: VisualizationEvent | null): BoxRole {
  if (!activeEvent) return "default";
  if (activeEvent.type === "enqueue") {
    const targetIndex = activeEvent.end === "front" ? 0 : size - 1;
    return index === targetIndex ? "pushed" : "default";
  }
  if (activeEvent.type === "read") return activeEvent.index === index ? "peeked" : "default"; // peek reuses ReadEvent
  return "default";
}

/** A queue-category run only ever produces enqueue/dequeue/read(peek)/queue-check events — every case here is exhaustive for that. */
function captionFor(activeEvent: VisualizationEvent | null): string | null {
  if (!activeEvent) return null;
  switch (activeEvent.type) {
    case "enqueue":
      return `Enqueued ${activeEvent.value}${activeEvent.end ? ` (${activeEvent.end})` : ""}`;
    case "dequeue":
      return `Dequeued ${activeEvent.value}${activeEvent.end ? ` (${activeEvent.end})` : ""}`;
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

export function QueueRenderer({ structure, activeEvent }: StructureRendererProps<QueueSnapshot>) {
  const { values, capacity } = structure;

  if (values.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface text-sm text-slate-500">
        <span>Empty queue</span>
        <span className="text-xs text-slate-600">Run Queue Operations or Deque Operations to build one</span>
      </div>
    );
  }

  return (
    <div className="flex h-40 flex-col rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 text-xs tabular-nums text-slate-500">
        {values.length}
        {capacity !== undefined ? ` / ${capacity}` : ""} item{values.length === 1 ? "" : "s"}
      </div>
      <div className="flex flex-1 items-center gap-1 overflow-x-auto">
        {values.map((value, index) => {
          const role = roleForIndex(index, values.length, activeEvent);
          const isFront = index === 0;
          const isRear = index === values.length - 1;
          return (
            <div key={index} className="flex flex-col items-center gap-1">
              {(isFront || isRear) && (
                <span className="text-[10px] uppercase tracking-wide text-slate-500">
                  {isFront && isRear ? "front/rear" : isFront ? "front" : "rear"}
                </span>
              )}
              <div
                className={`flex h-9 w-16 flex-shrink-0 items-center justify-center rounded border text-sm font-medium tabular-nums text-white transition-all duration-150 ${BOX_CLASSES[role]}`}
              >
                {value}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 h-4 text-xs text-slate-400">{captionFor(activeEvent)}</div>
    </div>
  );
}
