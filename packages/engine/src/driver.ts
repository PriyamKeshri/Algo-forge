import type { DataStructureSnapshot, RunStats, VisualizationEvent } from "@algoviz/core";
import { deriveStats } from "@algoviz/core";

/**
 * What every algorithm plugin's `run(input, ctx)` returns: a generator that
 * only ever *publishes* events outward. The `Next` type parameter is `void`
 * on purpose — see packages/engine/src/instrument.ts for why `yield` must
 * never be used to receive a value back.
 */
export type AlgorithmGenerator = Generator<VisualizationEvent, void, void>;

/** The minimum shape the driver needs from an instrumented context (array/graph/tree). */
export interface RunnableContext {
  snapshot(): DataStructureSnapshot;
}

export interface RunOptions {
  /** Hard cap on collected events, guarding against a runaway/buggy generator. */
  stepLimit?: number;
  signal?: AbortSignal;
}

export interface RunResult {
  events: VisualizationEvent[];
  stats: RunStats;
  /** false if execution stopped early due to stepLimit or an aborted signal. */
  completed: boolean;
  finalSnapshot: DataStructureSnapshot;
}

export const DEFAULT_STEP_LIMIT = 500_000;

export interface DriveResult {
  events: VisualizationEvent[];
  done: boolean;
  aborted: boolean;
}

/**
 * Advances `generator` by at most `maxSteps` events, stopping early if the
 * generator finishes or `signal` is observed aborted. `signal.aborted` is
 * only checked *between* `.next()` calls, so an abort that happens while a
 * `.next()` call is in flight takes effect on the following check, not
 * mid-call — generators can't be interrupted synchronously mid-step.
 *
 * Pure aside from advancing the generator's internal state. Shared by both
 * `ExecutionEngine` (one big chunk) and `MainThreadRunner` (many small
 * chunks) so the two driving strategies can never drift out of sync.
 */
export function driveGenerator(
  generator: AlgorithmGenerator,
  maxSteps: number,
  signal?: AbortSignal,
): DriveResult {
  const events: VisualizationEvent[] = [];
  let done = false;
  let aborted = false;

  while (events.length < maxSteps) {
    if (signal?.aborted) {
      aborted = true;
      break;
    }
    const result = generator.next();
    if (result.done) {
      done = true;
      break;
    }
    events.push(result.value);
  }

  return { events, done, aborted };
}

/**
 * Drives a plugin's generator to completion synchronously, eagerly
 * materializing the full event stream in one call. This is what makes
 * timeline scrubbing (packages/engine/timeline.ts) trivial — the whole run
 * already exists as a plain array before playback starts. It suits
 * algorithms on realistic inputs (sorting/searching on up to a few hundred
 * elements finishes in microseconds-to-low-milliseconds); it is not meant
 * for interactive or unbounded runs. For long/CPU-heavy runs where the UI
 * must stay responsive, use `MainThreadRunner` (packages/engine/src/runner.ts)
 * instead, which drives the same generator in chunks.
 */
export class ExecutionEngine {
  run(generator: AlgorithmGenerator, ctx: RunnableContext, options: RunOptions = {}): RunResult {
    const stepLimit = options.stepLimit ?? DEFAULT_STEP_LIMIT;
    const { events, done } = driveGenerator(generator, stepLimit, options.signal);

    return {
      events,
      stats: deriveStats(events),
      completed: done,
      finalSnapshot: ctx.snapshot(),
    };
  }
}
