import type { ArraySnapshot, VisualizationEvent } from "@algoviz/core";
import type { StructureRendererProps } from "./renderer-types";

type BarRole = "default" | "compare" | "swap" | "read" | "sorted";

/**
 * Derives each bar's visual role purely from the current `activeEvent`
 * (not an accumulated "done so far" set) — matching this foundation step's
 * scope. A persistent "stays green once sorted" treatment would need the
 * timeline layer to expose accumulated mark-done state, which is a
 * reasonable follow-up, not part of this pass.
 */
function roleForIndex(index: number, activeEvent: VisualizationEvent | null): BarRole {
  if (!activeEvent) return "default";
  switch (activeEvent.type) {
    case "compare":
    case "highlight":
      return activeEvent.indices.includes(index) ? "compare" : "default";
    case "compare-value":
      return activeEvent.index === index ? "compare" : "default";
    case "swap":
      return activeEvent.indices.includes(index) ? "swap" : "default";
    case "read":
      return activeEvent.index === index ? "read" : "default";
    case "set":
      return activeEvent.index === index ? "swap" : "default";
    case "mark-done":
      return activeEvent.indices.includes(index) ? "sorted" : "default";
    default:
      return "default";
  }
}

const ROLE_CLASSES: Record<BarRole, string> = {
  default: "bg-accent/40",
  compare: "bg-accent-2 shadow-[0_0_10px_var(--color-accent-2)]",
  swap: "bg-danger shadow-[0_0_10px_var(--color-danger)]",
  read: "bg-accent",
  sorted: "bg-success",
};

/**
 * Above this count, per-bar value labels are dropped and the inter-bar gap
 * is tightened — both are there purely to make room for the bars
 * themselves; text stops being legible at this density well before it
 * stops being *present*, and it's the thing actually fighting the bars for
 * width (see the `min-w-0` note below).
 */
const DENSE_THRESHOLD = 60;

export function ArrayRenderer({ structure, activeEvent }: StructureRendererProps<ArraySnapshot>) {
  const { values } = structure;
  const max = Math.max(1, ...values);
  const dense = values.length > DENSE_THRESHOLD;

  if (values.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-border bg-surface text-sm text-slate-500">
        Empty array
      </div>
    );
  }

  return (
    <div className={`flex h-56 items-end rounded-lg border border-border bg-surface p-4 ${dense ? "gap-px" : "gap-1"}`}>
      {values.map((value, index) => (
        // Index as key is intentional: bars represent stable array *slots*,
        // not stable values — a swap should visibly exchange the contents
        // of two fixed positions, not have React re-key/animate a value
        // across the DOM.
        //
        // `min-w-0` overrides the flexbox default of `min-width: auto`,
        // which otherwise floors each column at its *content's* intrinsic
        // width (the label text) no matter how much `flex-1` wants to
        // shrink it — that's what let columns' combined minimum width
        // exceed the container's and push bars outside it once there were
        // enough of them. With it, columns (and the bars inside) actually
        // shrink to fit any array size up to `maxSize`.
        <div key={index} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
          {!dense && <span className="text-[10px] tabular-nums text-slate-400">{value}</span>}
          {/* Fixed-height track: a bar's `height: X%` only resolves against a
              containing block with a *definite* height. The column above is
              sized by its content (auto height), so nesting the bar directly
              in it makes every percentage height resolve to 0 — this track
              div is what gives the percentage something concrete to resolve
              against, with `items-end` anchoring the bar to its bottom. */}
          <div className="flex h-40 w-full items-end">
            <div
              className={`w-full rounded-t transition-all duration-150 ${ROLE_CLASSES[roleForIndex(index, activeEvent)]}`}
              style={{ height: `${(value / max) * 100}%` }}
              title={dense ? String(value) : undefined}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
