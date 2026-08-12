import type { VisualizationEvent } from "./events";

export interface RunStats {
  comparisons: number;
  swaps: number;
  reads: number;
  /** Explicit `set` writes only; a `swap` is counted separately, not as two writes. */
  writes: number;
}

export const EMPTY_STATS: RunStats = { comparisons: 0, swaps: 0, reads: 0, writes: 0 };

/**
 * Folds a single event into `stats`, returning a new `RunStats` (never
 * mutates its input). Exported so callers that need to accumulate
 * incrementally over a subrange of events — e.g. `packages/engine/timeline.ts`
 * building per-snapshot stats in a single O(n) pass — can reuse the exact
 * same counting rules as `deriveStats`/`statsAtStep` instead of duplicating them.
 */
export function accumulateEvent(stats: RunStats, event: VisualizationEvent): RunStats {
  switch (event.type) {
    case "compare":
    case "compare-value":
    case "compare-node":
    case "reject-edge":
      return { ...stats, comparisons: stats.comparisons + 1 };
    case "swap":
      return { ...stats, swaps: stats.swaps + 1 };
    case "read":
    case "stack-check":
    case "queue-check":
      return { ...stats, reads: stats.reads + 1 };
    case "set":
    case "insert-node":
    case "push":
    case "pop":
    case "enqueue":
    case "dequeue":
    case "ll-insert":
    case "ll-delete":
    case "ll-reverse":
    case "update-node-value":
      return { ...stats, writes: stats.writes + 1 };
    default:
      return stats;
  }
}

/** Aggregates stats across an entire event stream. */
export function deriveStats(events: VisualizationEvent[]): RunStats {
  return events.reduce(accumulateEvent, EMPTY_STATS);
}

/**
 * Aggregates stats across events up to and including `step` (by `event.step`,
 * not array index). Assumes `events` is sorted ascending by `step`, which is
 * guaranteed for any event stream produced by the execution engine.
 * O(n) in `events.length`; fine for tests and small runs. The timeline layer
 * (packages/engine/timeline.ts) caches this per-snapshot for playback so it
 * isn't recomputed from scratch on every frame during scrubbing.
 */
export function statsAtStep(events: VisualizationEvent[], step: number): RunStats {
  let stats = EMPTY_STATS;
  for (const event of events) {
    if (event.step > step) break;
    stats = accumulateEvent(stats, event);
  }
  return stats;
}
