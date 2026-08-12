import { generateId, type AlgorithmId, type AlgorithmInput } from "@algoviz/core";
import type { PluginRunner } from "@algoviz/algorithms";
import type { RunOptions, RunResult, WorkerRequestMessage, WorkerResponseMessage } from "@algoviz/engine";

/**
 * The minimal `Worker` surface `WorkerRunner` needs. A real `Worker`
 * satisfies this as-is; `worker-runner.test.ts` substitutes a fake object
 * (no `postMessage` round-trip, no real thread) so the request/response
 * protocol handling below is unit-testable without a browser.
 */
export interface WorkerLike {
  postMessage(message: WorkerRequestMessage): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<WorkerResponseMessage>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

function defaultCreateWorker(): WorkerLike {
  // Vite's documented pattern for a bundled, ESM-module worker — works in
  // both `vite dev` and `vite build` (the latter emits it as its own chunk).
  return new Worker(new URL("./algorithm.worker.ts", import.meta.url), { type: "module" });
}

interface PendingRun {
  resolve(result: RunResult): void;
  reject(error: Error): void;
}

/**
 * `PluginRunner` backed by a single dedicated Web Worker — the `postMessage`
 * counterpart to `MainThreadPluginRunner`
 * (packages/algorithms/src/execute.ts), keeping algorithm execution (and
 * the event array it produces) off the page's main thread. The worker is
 * created lazily on first `run()` and reused for this runner's lifetime;
 * `apps/web/src/App.tsx` owns one app-lifetime instance, same as it did
 * for the pre-worker `MainThreadRunner`.
 *
 * Note on an already-aborted `options.signal`: unlike `MainThreadRunner`
 * (which can check the signal before driving a single step, since it's all
 * in-process), an abort here is a second `postMessage` racing the first —
 * a handful of leading events may already be in flight before the worker
 * honors it. Not worth eliminating for what's a very unlikely caller
 * pattern (aborting before a run even starts).
 */
export class WorkerRunner implements PluginRunner {
  private worker: WorkerLike | undefined;
  private readonly pending = new Map<string, PendingRun>();

  constructor(private readonly createWorker: () => WorkerLike = defaultCreateWorker) {}

  private ensureWorker(): WorkerLike {
    if (this.worker) return this.worker;
    const worker = this.createWorker();
    worker.onmessage = (event) => this.handleResponse(event.data);
    worker.onerror = (event) => this.failAllPending(event.message || "Worker error");
    this.worker = worker;
    return worker;
  }

  private handleResponse(message: WorkerResponseMessage): void {
    if (message.type === "progress") return; // no progress subscribers yet — reserved for a future progress UI
    const pending = this.pending.get(message.requestId);
    if (!pending) return; // stale response for a request we're no longer tracking

    this.pending.delete(message.requestId);
    if (message.type === "error") {
      pending.reject(new Error(message.message));
    } else {
      pending.resolve(message.result);
    }
  }

  /** The worker itself crashed (not a per-request "error" message) — every in-flight request fails, since none of them can ever get a response now. */
  private failAllPending(message: string): void {
    for (const pending of this.pending.values()) {
      pending.reject(new Error(message));
    }
    this.pending.clear();
  }

  run(pluginId: AlgorithmId, input: AlgorithmInput, options: RunOptions = {}): Promise<RunResult> {
    const worker = this.ensureWorker();
    const requestId = generateId("run");

    return new Promise<RunResult>((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });

      const message: WorkerRequestMessage = {
        type: "run",
        requestId,
        pluginId,
        input,
        options: options.stepLimit !== undefined ? { stepLimit: options.stepLimit } : undefined,
      };
      worker.postMessage(message);

      if (options.signal) {
        const postAbort = () => worker.postMessage({ type: "abort", requestId });
        if (options.signal.aborted) postAbort();
        else options.signal.addEventListener("abort", postAbort, { once: true });
      }
    });
  }

  /** Tears down the underlying worker. Not required by `PluginRunner`; call it if/when a runner's owner unmounts. */
  terminate(): void {
    this.worker?.terminate();
    this.worker = undefined;
    this.failAllPending("Worker terminated");
  }
}
