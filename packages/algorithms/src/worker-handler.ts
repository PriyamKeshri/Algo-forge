import { deriveStats, type VisualizationEvent } from "@algoviz/core";
import {
  DEFAULT_STEP_LIMIT,
  driveGenerator,
  type RunRequestMessage,
  type RunResult,
  type WorkerRequestMessage,
  type WorkerResponseMessage,
} from "@algoviz/engine";
import { preparePluginRun } from "./execute";

const DEFAULT_CHUNK_SIZE = 2000;

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export interface WorkerMessageHandler {
  handleMessage(message: WorkerRequestMessage): Promise<void>;
}

/**
 * Pure `postMessage`-protocol logic for the algorithm-execution worker — no
 * `self`/`postMessage` globals here, so it's unit-testable in Node by
 * passing a fake `post` and driving `handleMessage` directly (see
 * worker-handler.test.ts).
 * `apps/web/src/workers/algorithm.worker.ts` is the thin real entry point
 * that wires this handler to actual worker globals.
 *
 * Drives each `run` request through the same chunk + `setTimeout(0)`-yield
 * loop `MainThreadRunner` uses (packages/engine/src/runner.ts) — for the
 * same reason: yielding between chunks is what lets this handler's own
 * `handleMessage` for a concurrent `abort` message actually get a turn to
 * run while a `run` request is still in flight (a worker has only one
 * thread too; it just isn't the page's main one).
 */
export function createWorkerMessageHandler(
  post: (message: WorkerResponseMessage) => void,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): WorkerMessageHandler {
  const controllers = new Map<string, AbortController>();

  async function handleRun(message: RunRequestMessage): Promise<void> {
    const { requestId, pluginId, input, options } = message;
    const controller = new AbortController();
    controllers.set(requestId, controller);

    try {
      const { generator, ctx } = preparePluginRun(pluginId, input);
      const stepLimit = options?.stepLimit ?? DEFAULT_STEP_LIMIT;
      const events: VisualizationEvent[] = [];
      let completed = false;

      while (true) {
        const budget = Math.min(chunkSize, stepLimit - events.length);
        const chunk = driveGenerator(generator, budget, controller.signal);
        events.push(...chunk.events);

        if (chunk.done) {
          completed = true;
          break;
        }
        if (chunk.aborted || events.length >= stepLimit) {
          break;
        }

        post({ type: "progress", requestId, eventsSoFar: events.length });
        await yieldToEventLoop();
      }

      const result: RunResult = {
        events,
        stats: deriveStats(events),
        completed,
        finalSnapshot: ctx.snapshot(),
      };

      // Only a genuine abort() call gets the "aborted" message — hitting
      // stepLimit is a normal (if incomplete) "done", matching
      // MainThreadRunner's undifferentiated `completed: false` for both
      // cases; the worker protocol just has a reason to tell them apart.
      post(
        !completed && controller.signal.aborted
          ? { type: "aborted", requestId, result }
          : { type: "done", requestId, result },
      );
    } catch (err) {
      post({ type: "error", requestId, message: err instanceof Error ? err.message : String(err) });
    } finally {
      controllers.delete(requestId);
    }
  }

  async function handleMessage(message: WorkerRequestMessage): Promise<void> {
    if (message.type === "run") {
      await handleRun(message);
    } else {
      controllers.get(message.requestId)?.abort();
    }
  }

  return { handleMessage };
}
