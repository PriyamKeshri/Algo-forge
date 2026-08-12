import { describe, expect, it, vi } from "vitest";
import { algorithmId, EMPTY_STATS, type ArrayInput } from "@algoviz/core";
import type { RunResult, WorkerRequestMessage, WorkerResponseMessage } from "@algoviz/engine";
import { WorkerRunner, type WorkerLike } from "./worker-runner";

/**
 * A `WorkerLike` fake — no real thread, no `postMessage` serialization.
 * `emit`/`emitError` simulate the worker "replying" so tests can drive the
 * request/response protocol from both ends without a browser.
 */
function fakeWorker(): {
  worker: WorkerLike;
  posted: WorkerRequestMessage[];
  emit(message: WorkerResponseMessage): void;
  emitError(message: string): void;
} {
  const posted: WorkerRequestMessage[] = [];
  const worker: WorkerLike = {
    postMessage: (message) => posted.push(message),
    terminate: vi.fn(),
    onmessage: null,
    onerror: null,
  };
  return {
    worker,
    posted,
    emit: (message) => worker.onmessage?.({ data: message } as MessageEvent<WorkerResponseMessage>),
    emitError: (message) => worker.onerror?.({ message } as ErrorEvent),
  };
}

const input: ArrayInput = { kind: "array", values: [3, 1, 2] };

function fakeResult(overrides: Partial<RunResult> = {}): RunResult {
  return {
    events: [],
    stats: EMPTY_STATS,
    completed: true,
    finalSnapshot: { kind: "array", values: [1, 2, 3] },
    ...overrides,
  };
}

describe("WorkerRunner", () => {
  it("posts a run request and resolves when the worker replies done", async () => {
    const fake = fakeWorker();
    const runner = new WorkerRunner(() => fake.worker);

    const resultPromise = runner.run(algorithmId("bubble-sort"), input, { stepLimit: 500 });
    expect(fake.posted).toHaveLength(1);
    expect(fake.posted[0]).toMatchObject({
      type: "run",
      pluginId: "bubble-sort",
      input,
      options: { stepLimit: 500 },
    });

    const requestId = fake.posted[0]!.requestId;
    const result = fakeResult();
    fake.emit({ type: "done", requestId, result });

    await expect(resultPromise).resolves.toEqual(result);
  });

  it("ignores progress messages and only resolves on the terminal message", async () => {
    const fake = fakeWorker();
    const runner = new WorkerRunner(() => fake.worker);
    const resultPromise = runner.run(algorithmId("bubble-sort"), input);
    const requestId = fake.posted[0]!.requestId;

    fake.emit({ type: "progress", requestId, eventsSoFar: 10 });
    fake.emit({ type: "progress", requestId, eventsSoFar: 20 });
    const result = fakeResult();
    fake.emit({ type: "done", requestId, result });

    await expect(resultPromise).resolves.toEqual(result);
  });

  it("rejects when the worker replies with an error", async () => {
    const fake = fakeWorker();
    const runner = new WorkerRunner(() => fake.worker);
    const resultPromise = runner.run(algorithmId("bubble-sort"), input);
    const requestId = fake.posted[0]!.requestId;

    fake.emit({ type: "error", requestId, message: "boom" });

    await expect(resultPromise).rejects.toThrow("boom");
  });

  it("resolves (not rejects) on an aborted reply, carrying the partial result", async () => {
    const fake = fakeWorker();
    const runner = new WorkerRunner(() => fake.worker);
    const resultPromise = runner.run(algorithmId("bubble-sort"), input);
    const requestId = fake.posted[0]!.requestId;

    const partial = fakeResult({ completed: false, events: [{ type: "highlight", step: 0, indices: [0] }] });
    fake.emit({ type: "aborted", requestId, result: partial });

    await expect(resultPromise).resolves.toEqual(partial);
  });

  it("posts an abort message with the matching requestId when the signal fires mid-run", async () => {
    const fake = fakeWorker();
    const runner = new WorkerRunner(() => fake.worker);
    const controller = new AbortController();

    const resultPromise = runner.run(algorithmId("bubble-sort"), input, { signal: controller.signal });
    const requestId = fake.posted[0]!.requestId;

    controller.abort();
    expect(fake.posted).toHaveLength(2);
    expect(fake.posted[1]).toEqual({ type: "abort", requestId });

    fake.emit({ type: "aborted", requestId, result: fakeResult({ completed: false }) });
    await resultPromise;
  });

  it("posts an abort message right away when the signal is already aborted", () => {
    const fake = fakeWorker();
    const runner = new WorkerRunner(() => fake.worker);
    const controller = new AbortController();
    controller.abort();

    void runner.run(algorithmId("bubble-sort"), input, { signal: controller.signal });

    expect(fake.posted.map((m) => m.type)).toEqual(["run", "abort"]);
  });

  it("rejects every in-flight request if the worker itself crashes", async () => {
    const fake = fakeWorker();
    const runner = new WorkerRunner(() => fake.worker);
    const first = runner.run(algorithmId("bubble-sort"), input);
    const second = runner.run(algorithmId("bfs"), input);

    fake.emitError("worker crashed");

    await expect(first).rejects.toThrow("worker crashed");
    await expect(second).rejects.toThrow("worker crashed");
  });

  it("reuses a single lazily-created worker across multiple runs", async () => {
    const fake = fakeWorker();
    const createWorker = vi.fn(() => fake.worker);
    const runner = new WorkerRunner(createWorker);

    const p1 = runner.run(algorithmId("bubble-sort"), input);
    fake.emit({ type: "done", requestId: fake.posted[0]!.requestId, result: fakeResult() });
    await p1;

    const p2 = runner.run(algorithmId("bubble-sort"), input);
    fake.emit({ type: "done", requestId: fake.posted[1]!.requestId, result: fakeResult() });
    await p2;

    expect(createWorker).toHaveBeenCalledTimes(1);
  });

  it("ignores a response for a requestId it isn't tracking anymore", async () => {
    const fake = fakeWorker();
    const runner = new WorkerRunner(() => fake.worker);
    const resultPromise = runner.run(algorithmId("bubble-sort"), input);
    const requestId = fake.posted[0]!.requestId;

    // A stale duplicate/late reply for an already-resolved (or never-issued) request.
    fake.emit({ type: "done", requestId: "some-other-request", result: fakeResult() });

    const result = fakeResult();
    fake.emit({ type: "done", requestId, result });
    await expect(resultPromise).resolves.toEqual(result);
  });

  it("terminate() tears down the worker and rejects anything still in flight", async () => {
    const fake = fakeWorker();
    const runner = new WorkerRunner(() => fake.worker);
    const resultPromise = runner.run(algorithmId("bubble-sort"), input);

    runner.terminate();

    expect(fake.worker.terminate).toHaveBeenCalledTimes(1);
    await expect(resultPromise).rejects.toThrow("Worker terminated");
  });
});
