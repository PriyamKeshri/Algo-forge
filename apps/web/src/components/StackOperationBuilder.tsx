import { useState } from "react";
import type { StackInput, StackOperation } from "@algoviz/core";

export interface StackOperationBuilderProps {
  input: StackInput;
  /**
   * A functional updater, like `setState`'s — not a plain next-value setter.
   * See QueueOperationBuilderProps.onChange's doc comment: two clicks fired
   * close enough together land in the same React batch, and a plain setter
   * computed from this component's own `input` prop would have the second
   * one silently clobber the first instead of appending after it.
   */
  onChange: (update: (prev: StackInput) => StackInput) => void;
}

function describeOp(op: StackOperation): string {
  switch (op.type) {
    case "push":
      return `+${op.value}`;
    case "pop":
      return "pop";
    case "peek":
      return "peek";
    case "isEmpty":
      return "isEmpty?";
    case "isFull":
      return "isFull?";
  }
}

function virtualSizeAfter(operations: StackOperation[]): number {
  let size = 0;
  for (const op of operations) {
    if (op.type === "push") size++;
    else if (op.type === "pop") size--;
  }
  return size;
}

const ACTION_BUTTON = "rounded border border-border px-2.5 py-1.5 text-xs text-slate-300 hover:bg-surface-alt disabled:opacity-40";

/**
 * A click-to-build alternative to InputControls' text-script field (still
 * shown alongside it) — Push a value, Pop/Peek the top, or Reset back to an
 * empty stack, with every click landing immediately (no separate apply
 * step, matching QueueOperationBuilder's same "no separate apply step"
 * treatment).
 */
export function StackOperationBuilder({ input, onChange }: StackOperationBuilderProps) {
  const [draftValue, setDraftValue] = useState("");
  const canPop = virtualSizeAfter(input.operations) > 0;
  const canPush = draftValue.trim() !== "" && Number.isFinite(Number(draftValue));

  function append(op: StackOperation) {
    onChange((prev) => ({ ...prev, operations: [...prev.operations, op] }));
  }

  function push() {
    const value = Number(draftValue);
    if (!Number.isFinite(value)) return;
    append({ type: "push", value });
    setDraftValue("");
  }

  function removeAt(index: number) {
    onChange((prev) => ({ ...prev, operations: prev.operations.filter((_, i) => i !== index) }));
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <h3 className="text-sm font-medium text-white">Build your own sequence</h3>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          placeholder="Value"
          className="w-20 rounded border border-border bg-surface-alt px-2 py-1.5 text-sm text-white placeholder:text-slate-500"
        />
        <button type="button" onClick={push} disabled={!canPush} className={ACTION_BUTTON}>
          + Push
        </button>
        <button type="button" onClick={() => append({ type: "pop" })} disabled={!canPop} className={ACTION_BUTTON}>
          − Pop
        </button>
        <button type="button" onClick={() => append({ type: "peek" })} disabled={!canPop} className={ACTION_BUTTON}>
          Peek
        </button>
        <button type="button" onClick={() => append({ type: "isEmpty" })} className={ACTION_BUTTON}>
          isEmpty?
        </button>
        <button type="button" onClick={() => append({ type: "isFull" })} className={ACTION_BUTTON}>
          isFull?
        </button>
        <button
          type="button"
          onClick={() => onChange((prev) => ({ ...prev, operations: [], capacity: undefined }))}
          disabled={input.operations.length === 0}
          className={ACTION_BUTTON}
        >
          Reset
        </button>
      </div>

      {input.operations.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {input.operations.map((op, i) => (
            <button
              key={i}
              type="button"
              onClick={() => removeAt(i)}
              title="Click to remove"
              className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-slate-300 hover:border-danger hover:text-danger"
            >
              {describeOp(op)} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
