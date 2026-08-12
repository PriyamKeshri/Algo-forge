import type { StackSnapshot, VisualizationEvent } from "@algoviz/core";
import type { StructureRendererProps } from "./renderer-types";

type BoxRole = "default" | "pushed" | "peeked";

/**
 * Push/peek can be highlighted by index against the *current* snapshot the
 * same way ArrayRenderer does — but pop can't: the popped value is already
 * gone from `values` by the time this renders (the classic "the event
 * removed the data it describes" problem). `captionFor` below sidesteps
 * that by deriving a human-readable line straight from the event's own
 * fields instead of trying to highlight a box that no longer exists.
 */
function roleForIndex(index: number, size: number, activeEvent: VisualizationEvent | null): BoxRole {
  if (!activeEvent) return "default";
  if (activeEvent.type === "push") return index === size - 1 ? "pushed" : "default";
  if (activeEvent.type === "read") return activeEvent.index === index ? "peeked" : "default"; // peek reuses ReadEvent
  return "default";
}

/** A stack-category run only ever produces push/pop/read(peek)/stack-check events — every case here is exhaustive for that. */
function captionFor(activeEvent: VisualizationEvent | null): string | null {
  if (!activeEvent) return null;
  switch (activeEvent.type) {
    case "push":
      return `Pushed ${activeEvent.value}`;
    case "pop":
      return `Popped ${activeEvent.value}`;
    case "read":
      return `Peeked ${activeEvent.value}`;
    case "stack-check":
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

/** Above this count, per-box value labels (and the "top" tag) are dropped — a box stops having room for legible text well before it stops being present. A hover title still shows the exact value. */
const DENSE_THRESHOLD = 15;

export function StackRenderer({ structure, activeEvent }: StructureRendererProps<StackSnapshot>) {
  const { values, capacity } = structure;
  const dense = values.length > DENSE_THRESHOLD;

  if (values.length === 0) {
    return (
      <div className="flex h-80 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface text-sm text-slate-500">
        <span>Empty stack</span>
        <span className="text-xs text-slate-600">Run Stack Operations, Postfix Evaluation, or Prefix Evaluation to build one</span>
      </div>
    );
  }

  return (
    <div className="flex h-80 flex-col rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 text-xs tabular-nums text-slate-500">
        {values.length}
        {capacity !== undefined ? ` / ${capacity}` : ""} item{values.length === 1 ? "" : "s"}
      </div>
      {/* flex-col-reverse: the first DOM child (index 0, the base) lands at
          the bottom, and the last (values.length - 1, the top) lands at the
          top — exactly the "base at bottom, top at top" mental model,
          without manual position math.

          overflow-hidden (not overflow-y-auto): each row below is flex-1,
          so the whole stack always divides this container's fixed height
          between however many boxes there are — it never needs to scroll
          in the first place. `gap` shrinks too at high density, so what's
          left goes to the boxes instead. */}
      <div className={`flex min-h-0 flex-1 flex-col-reverse items-center overflow-hidden ${dense ? "gap-px" : "gap-1"}`}>
        {values.map((value, index) => {
          const isTop = index === values.length - 1;
          const role = roleForIndex(index, values.length, activeEvent);
          return (
            // min-h-0 overrides flexbox's default min-height: auto, which
            // otherwise floors each row at its *content's* intrinsic height
            // (the box's own min-content) no matter how much flex-1 wants
            // to shrink it — the vertical counterpart to ArrayRenderer's
            // min-w-0 note for exactly the same reason.
            <div key={index} className="flex min-h-0 w-16 flex-1 items-center gap-2">
              <div
                className={`h-full w-16 flex-shrink-0 rounded border text-sm font-medium tabular-nums text-white transition-all duration-150 ${BOX_CLASSES[role]} ${dense ? "" : "flex items-center justify-center"}`}
                title={dense ? String(value) : undefined}
              >
                {!dense && value}
              </div>
              {isTop && !dense && <span className="text-[10px] uppercase tracking-wide text-slate-500">top</span>}
            </div>
          );
        })}
      </div>
      <div className="mt-2 h-4 text-xs text-slate-400">{captionFor(activeEvent)}</div>
    </div>
  );
}
