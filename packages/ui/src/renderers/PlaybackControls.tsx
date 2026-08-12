import { useTimelineStore } from "../timeline/timeline-store";

export interface PlaybackControlsProps {
  /**
   * Called instead of toggling play/pause when no run is loaded yet (no
   * `events`) — this is what lets Play double as "compute this run", so a
   * host app (apps/web) doesn't need a separate Run button: show this
   * component the moment an algorithm is selected, and pressing Play both
   * executes it and starts watching. Omit to keep the old behavior (Play
   * stays disabled until a run already exists).
   */
  onStart?: () => void;
  /** True while `onStart`'s work is in flight (e.g. awaiting a Worker run) — shows a loading label and keeps Play from firing again mid-request. */
  isStarting?: boolean;
}

export function PlaybackControls({ onStart, isStarting = false }: PlaybackControlsProps = {}) {
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const currentStep = useTimelineStore((s) => s.currentStep);
  const speed = useTimelineStore((s) => s.speed);
  const events = useTimelineStore((s) => s.events);
  const play = useTimelineStore((s) => s.play);
  const pause = useTimelineStore((s) => s.pause);
  const stepForward = useTimelineStore((s) => s.stepForward);
  const stepBackward = useTimelineStore((s) => s.stepBackward);
  const seek = useTimelineStore((s) => s.seek);
  const setSpeed = useTimelineStore((s) => s.setSpeed);
  const reset = useTimelineStore((s) => s.reset);

  const hasRun = events.length > 0;
  const lastStep = hasRun ? events[events.length - 1]!.step : -1;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={reset}
          disabled={!hasRun}
          className="rounded px-3 py-1.5 text-sm text-slate-300 hover:bg-surface-alt disabled:opacity-40"
        >
          ⟲ Reset
        </button>
        <button
          type="button"
          onClick={stepBackward}
          disabled={!hasRun || currentStep <= -1}
          className="rounded px-3 py-1.5 text-sm text-slate-300 hover:bg-surface-alt disabled:opacity-40"
        >
          ◁ Step
        </button>
        <button
          type="button"
          onClick={hasRun ? (isPlaying ? pause : play) : onStart}
          disabled={(!hasRun && !onStart) || isStarting}
          className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          {isStarting ? "Loading…" : isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={stepForward}
          disabled={!hasRun || currentStep >= lastStep}
          className="rounded px-3 py-1.5 text-sm text-slate-300 hover:bg-surface-alt disabled:opacity-40"
        >
          Step ▷
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
          <span>Speed</span>
          <input
            type="range"
            min={0.25}
            max={32}
            step={0.25}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="accent-accent"
            aria-label="Playback speed"
          />
          <span className="tabular-nums">{speed}x</span>
        </div>
      </div>
      <input
        type="range"
        min={-1}
        max={Math.max(-1, lastStep)}
        step={1}
        value={currentStep}
        disabled={!hasRun}
        onChange={(e) => seek(Number(e.target.value))}
        className="w-full accent-accent disabled:opacity-40"
        aria-label="Timeline position"
      />
      <div className="text-xs tabular-nums text-slate-500">
        Step {currentStep + 1} / {lastStep + 1}
      </div>
    </div>
  );
}
