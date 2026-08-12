import { useState } from "react";
import type { InputConstraints } from "@algoviz/core";

export interface InputControlsProps {
  size: number;
  constraints: InputConstraints;
  onSizeChange: (size: number) => void;
  onRandomize: () => void;
  /** What "size" means for the current algorithm's input kind — e.g. "Size" for an array, "Nodes" for a graph. */
  label?: string;
  /**
   * The value a search algorithm looks for. Only rendered when
   * `constraints.needsTarget` is set (and both handler/value are present)
   * — sorting/graph/tree plugins just don't pass these.
   */
  target?: number;
  onTargetChange?: (target: number) => void;
  /**
   * Replaces the current input with one the user typed/scripted themselves
   * instead of a generated one — every non-graph kind gets its own syntax
   * (see apps/web/src/lib/custom-input.ts). Graph input is edited directly
   * on GraphEditor's canvas instead, so this never renders for `kind === "graph"`.
   */
  onCustomInputSubmit?: (raw: string) => void;
  /** Validation error from the last `onCustomInputSubmit` call, shown next to the field until the next attempt. */
  customInputError?: string | null;
}

/** What to show/hint in the custom-input field, per input kind — matches the syntax each parser in custom-input.ts actually accepts. */
function placeholderFor(constraints: InputConstraints): string {
  switch (constraints.kind) {
    case "array":
      return `Or type your own array, e.g. 5, 3, 9, 1 (max ${constraints.maxSize} numbers)`;
    case "stack":
      return `Or script it yourself, e.g. 5, 3, 9, pop, peek (max ${constraints.maxSize} tokens)`;
    case "expression":
      return constraints.notation === "prefix"
        ? `Or type your own prefix expression, e.g. * + 2 3 4 (max ${constraints.maxSize} tokens)`
        : `Or type your own postfix expression, e.g. 2 3 + 4 * (max ${constraints.maxSize} tokens)`;
    case "queue":
    case "circular-queue":
      return `Or script it yourself, e.g. 5, 3, 9, dequeue, peek (max ${constraints.maxSize} tokens)`;
    case "linked-list":
      return `Or script it yourself, e.g. insertHead 5, insertTail 3, delete 5 (max ${constraints.maxSize} tokens)`;
    case "linked-list-pair":
      return `Or type two lists separated by ";", e.g. 1,3,5;2,4,6 (max ${constraints.maxSize} each)`;
    case "graph":
      return "";
  }
}

export function InputControls({
  size,
  constraints,
  onSizeChange,
  onRandomize,
  label = "Size",
  target,
  onTargetChange,
  onCustomInputSubmit,
  customInputError,
}: InputControlsProps) {
  const [customInputDraft, setCustomInputDraft] = useState("");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          {label} ({size})
          <input
            type="range"
            min={constraints.minSize}
            max={constraints.maxSize}
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            className="accent-accent"
          />
        </label>
        {constraints.needsTarget && target !== undefined && onTargetChange && (
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Target
            <input
              type="number"
              value={target}
              onChange={(e) => onTargetChange(Number(e.target.value))}
              className="w-20 rounded border border-border bg-surface-alt px-2 py-1 text-sm text-white"
            />
          </label>
        )}
        <button
          type="button"
          onClick={onRandomize}
          className="rounded border border-border px-3 py-1.5 text-sm text-slate-300 hover:bg-surface-alt"
        >
          🎲 Randomize
        </button>
      </div>

      {constraints.kind !== "graph" && onCustomInputSubmit && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onCustomInputSubmit(customInputDraft);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={customInputDraft}
            onChange={(e) => setCustomInputDraft(e.target.value)}
            placeholder={placeholderFor(constraints)}
            className="w-96 rounded border border-border bg-surface-alt px-2 py-1.5 text-sm text-white placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={customInputDraft.trim() === ""}
            className="rounded border border-border px-3 py-1.5 text-sm text-slate-300 hover:bg-surface-alt disabled:opacity-40"
          >
            Use this
          </button>
          {customInputError && <span className="text-xs text-danger">{customInputError}</span>}
        </form>
      )}
    </div>
  );
}
