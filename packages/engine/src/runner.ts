import { deriveStats } from "@algoviz/core";
import {
  DEFAULT_STEP_LIMIT,
  driveGenerator,
  type AlgorithmGenerator,
  type RunnableContext,
  type RunOptions,
  type RunResult,
} from "./driver";

/**
 * The interface `apps/web` (and later, race mode) programs against, instead
 * of a concrete runner class. Swapping `MainThreadRunner` for a future
 * Web-Worker-backed runner (see worker-protocol.ts) is then a one-line
 * change at the call site.
 */
export interface AlgorithmRunner {
  run(generator: AlgorithmGenerator, ctx: RunnableContext, options?: RunOptions): Promise<RunResult>;
}

const DEFAULT_CHUNK_SIZE = 2000;

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Drives a generator on the main thread, same as `ExecutionEngine`, but in
 * chunks of `chunkSize` events with a `setTimeout(0)` yield to the event
 * loop between chunks. This keeps the tab responsive during a large/slow
 * run and gives `options.signal` somewhere to actually be observed mid-run
 * (see `driveGenerator`'s abort-timing note). It's also a deliberate
 * rehearsal for the eventual `WorkerRunner`: that implementation will trade
 * this in-process chunk loop for `postMessage` round-trips using the same
 * request/response shapes declared in worker-protocol.ts, without changing
 * this class's public interface.
 */
export class MainThreadRunner implements AlgorithmRunner {
  constructor(private readonly chunkSize: number = DEFAULT_CHUNK_SIZE) {}

  async run(
    generator: AlgorithmGenerator,
    ctx: RunnableContext,
    options: RunOptions = {},
  ): Promise<RunResult> {
    const stepLimit = options.stepLimit ?? DEFAULT_STEP_LIMIT;
    const events: RunResult["events"] = [];
    let completed = false;

    while (true) {
      const budget = Math.min(this.chunkSize, stepLimit - events.length);
      const chunk = driveGenerator(generator, budget, options.signal);
      events.push(...chunk.events);

      if (chunk.done) {
        completed = true;
        break;
      }
      if (chunk.aborted || events.length >= stepLimit) {
        break;
      }

      await yieldToEventLoop();
    }

    return {
      events,
      stats: deriveStats(events),
      completed,
      finalSnapshot: ctx.snapshot(),
    };
  }
}
