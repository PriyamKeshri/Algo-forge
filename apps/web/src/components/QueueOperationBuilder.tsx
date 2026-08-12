import { useState } from "react";
import type { QueueInput, QueueOperation } from "@algoviz/core";

export interface QueueOperationBuilderProps {
  input: QueueInput;
  /** Deque Operations only — lets enqueue/dequeue/peek target either end instead of always the FIFO end. */
  allowDeque: boolean;
  /**
   * A functional updater, like `setState`'s — not a plain next-value setter.
   * Two clicks fired close enough together (a fast double-click, or a
   * script) land in the same React batch; if each computed its `next` from
   * this component's own `input` prop, both would read the *same*
   * pre-update snapshot and the second call would silently clobber the
   * first's operation instead of appending after it. A functional update
   * always applies against whatever the first call already queued.
   */
  onChange: (update: (prev: QueueInput) => QueueInput) => void;
}

/** Virtual size after `operations` — same bookkeeping generateQueueOperations does, used here to disable Dequeue/Peek before they'd ever run against an empty queue. */
function virtualSizeAfter(operations: QueueOperation[]): number {
  let size = 0;
  for (const op of operations) {
    if (op.type === "enqueue") size++;
    else if (op.type === "dequeue") size--;
  }
  return size;
}

function describeOp(op: QueueOperation): string {
  switch (op.type) {
    case "enqueue":
      return `+${op.value}${op.end ? ` (${op.end})` : ""}`;
    case "dequeue":
      return `dequeue${op.end ? ` (${op.end})` : ""}`;
    case "peek":
      return `peek${op.end ? ` (${op.end})` : ""}`;
    case "isEmpty":
      return "isEmpty?";
    case "isFull":
      return "isFull?";
  }
}

const ACTION_BUTTON = "rounded border border-border px-2.5 py-1.5 text-xs text-slate-300 hover:bg-surface-alt disabled:opacity-40";

/**
 * A click-to-build alternative to InputControls' text-script field (still
 * shown alongside it) — for Queue/Deque/Circular Queue Operations, where
 * "type your own array" doesn't really apply the way it does for a plain
 * array: what you're authoring here is a *sequence of operations*, not a
 * single collection of values, so a value field plus Enqueue/Dequeue/Peek/
 * isEmpty/isFull buttons is a more direct way to build one than typing a
 * comma-separated token script by hand. Each click appends immediately —
 * there's no separate "apply" step, matching how the rest of the app's
 * controls (Size slider, Randomize) already update input live.
 */
export function QueueOperationBuilder({ input, allowDeque, onChange }: QueueOperationBuilderProps) {
  const [draftValue, setDraftValue] = useState("");
  const canRemove = virtualSizeAfter(input.operations) > 0;

  function append(op: QueueOperation) {
    onChange((prev) => {
      const operations = [...prev.operations, op];
      const next: QueueInput = { ...prev, operations };
      if (prev.kind === "circular-queue" && op.type === "enqueue") {
        // Capacity must cover the highest concurrent size reached so far —
        // grown on demand rather than fixed upfront, since this builder
        // doesn't know the final sequence length in advance the way a
        // generated/scripted one does.
        next.capacity = Math.max(prev.capacity ?? 1, virtualSizeAfter(operations));
      }
      return next;
    });
  }

  function enqueue(end?: "front" | "rear") {
    const value = Number(draftValue);
    if (!Number.isFinite(value)) return;
    append({ type: "enqueue", value, end });
    setDraftValue("");
  }

  function removeAt(index: number) {
    onChange((prev) => ({ ...prev, operations: prev.operations.filter((_, i) => i !== index) }));
  }

  const canEnqueue = draftValue.trim() !== "" && Number.isFinite(Number(draftValue));

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
        {allowDeque ? (
          <>
            <button type="button" onClick={() => enqueue("front")} disabled={!canEnqueue} className={ACTION_BUTTON}>
              ⇤ Enqueue front
            </button>
            <button type="button" onClick={() => enqueue("rear")} disabled={!canEnqueue} className={ACTION_BUTTON}>
              Enqueue rear ⇥
            </button>
            <button
              type="button"
              onClick={() => append({ type: "dequeue", end: "front" })}
              disabled={!canRemove}
              className={ACTION_BUTTON}
            >
              Dequeue front
            </button>
            <button
              type="button"
              onClick={() => append({ type: "dequeue", end: "rear" })}
              disabled={!canRemove}
              className={ACTION_BUTTON}
            >
              Dequeue rear
            </button>
            <button
              type="button"
              onClick={() => append({ type: "peek", end: "front" })}
              disabled={!canRemove}
              className={ACTION_BUTTON}
            >
              Peek front
            </button>
            <button
              type="button"
              onClick={() => append({ type: "peek", end: "rear" })}
              disabled={!canRemove}
              className={ACTION_BUTTON}
            >
              Peek rear
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => enqueue()} disabled={!canEnqueue} className={ACTION_BUTTON}>
              + Enqueue
            </button>
            <button
              type="button"
              onClick={() => append({ type: "dequeue" })}
              disabled={!canRemove}
              className={ACTION_BUTTON}
            >
              − Dequeue
            </button>
            <button type="button" onClick={() => append({ type: "peek" })} disabled={!canRemove} className={ACTION_BUTTON}>
              Peek
            </button>
          </>
        )}
        <button type="button" onClick={() => append({ type: "isEmpty" })} className={ACTION_BUTTON}>
          isEmpty?
        </button>
        <button type="button" onClick={() => append({ type: "isFull" })} className={ACTION_BUTTON}>
          isFull?
        </button>
        <button
          type="button"
          onClick={() =>
            onChange((prev) => ({
              ...prev,
              operations: [],
              // Reset to the tightest possible capacity too, not just the
              // operations — otherwise a fresh build inherits whatever
              // capacity the *previous* (possibly much larger) sequence
              // grew to, showing far more empty slots than this new
              // sequence will ever need.
              capacity: prev.kind === "circular-queue" ? 1 : prev.capacity,
            }))
          }
          disabled={input.operations.length === 0}
          className={ACTION_BUTTON}
        >
          Clear
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
