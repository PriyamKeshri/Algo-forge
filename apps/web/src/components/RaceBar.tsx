import { useEffect, useState } from "react";

export interface RaceBarProps {
  rank: number;
  name: string;
  complexity: string;
  ms: number;
  /** The slowest result among this race's four — this bar's own width is `ms / maxMs`, so the slowest algorithm always fills the full track and everyone else is proportionally shorter. */
  maxMs: number;
  isWinner: boolean;
}

/** The slowest algorithm's bar takes this long to finish growing; every other bar's grow-duration scales down by the same `ms / maxMs` ratio as its width does — so every bar grows at the same visual rate, the fast ones just stop sooner. That's what makes this read as an actual *race* (bars visibly moving, fastest stops first) rather than an instantly-drawn static bar chart, even though the real sort underneath already finished before any of this renders. */
const MAX_GROW_DURATION_MS = 1800;
/** Floors so a near-instant result still shows a sliver of bar and a barely-there but non-zero grow animation, instead of disappearing/looking broken. */
const MIN_WIDTH_PERCENT = 2;
const MIN_GROW_DURATION_MS = 150;

export function RaceBar({ rank, name, complexity, ms, maxMs, isWinner }: RaceBarProps) {
  const ratio = maxMs > 0 ? ms / maxMs : 0;
  const targetWidth = Math.max(ratio * 100, MIN_WIDTH_PERCENT);
  const growDuration = Math.max(ratio * MAX_GROW_DURATION_MS, MIN_GROW_DURATION_MS);

  const [width, setWidth] = useState(0);

  // Renders at width 0 first, then bumps to targetWidth a frame later —
  // the classic "animate a CSS property in from a starting value" trick:
  // if width were just `targetWidth` from the first render, the browser
  // would never see the 0% state to transition *from*, and the bar would
  // just appear fully grown instead of animating.
  useEffect(() => {
    setWidth(0);
    const frame = requestAnimationFrame(() => setWidth(targetWidth));
    return () => cancelAnimationFrame(frame);
  }, [targetWidth]);

  return (
    <div className="flex items-center gap-3">
      <div className="w-6 shrink-0 text-right text-xs tabular-nums text-slate-500">#{rank}</div>
      <div className="flex w-40 shrink-0 items-center gap-1 truncate text-sm text-white">
        {name}
        {isWinner && <span title="Fastest this race">🏆</span>}
      </div>
      <div className="w-16 shrink-0 text-[10px] text-slate-500">{complexity}</div>
      <div className="h-6 flex-1 overflow-hidden rounded bg-surface-alt">
        <div
          className={`h-full rounded ${isWinner ? "bg-success" : "bg-accent"}`}
          style={{
            width: `${width}%`,
            transitionProperty: "width",
            transitionDuration: `${growDuration}ms`,
            transitionTimingFunction: "linear",
          }}
        />
      </div>
      <div className="w-20 shrink-0 text-right text-xs tabular-nums text-slate-300">{ms.toFixed(ms < 10 ? 2 : 0)} ms</div>
    </div>
  );
}
