import { describe, expect, it } from "vitest";
import { algorithmId } from "@algoviz/core";
import type { WorkerResponseMessage } from "@algoviz/engine";
// Side-effect registration — see execute.test.ts for why this is needed.
import { bubbleSortPlugin } from "./sorting";
import { generateRandomArray } from "./generate-input";
import { createWorkerMessageHandler } from "./worker-handler";

function collectingPost(): { post: (message: WorkerResponseMessage) => void; posted: WorkerResponseMessage[] } {
  const posted: WorkerResponseMessage[] = [];
  return { post: (message) => posted.push(message), posted };
}

describe("createWorkerMessageHandler", () => {
  it("runs a plugin to completion, posting progress messages then done", async () => {
    const { post, posted } = collectingPost();
    const handler = createWorkerMessageHandler(post, 3); // small chunk size to force multiple chunks
    const input = generateRandomArray({ size: 12, seed: 1 });

    await handler.handleMessage({
      type: "run",
      requestId: "req-1",
      pluginId: bubbleSortPlugin.metadata.id,
      input,
    });

    expect(posted.length).toBeGreaterThan(1);
    expect(posted.slice(0, -1).every((m) => m.type === "progress")).toBe(true);

    const last = posted[posted.length - 1]!;
    expect(last.type).toBe("done");
    if (last.type !== "done") throw new Error("expected a done message");
    expect(last.requestId).toBe("req-1");
    expect(last.result.completed).toBe(true);
    expect(last.result.finalSnapshot).toEqual({
      kind: "array",
      values: [...input.values].sort((a, b) => a - b),
    });
  });

  it("posts aborted (with partial events) when abort arrives mid-run", async () => {
    const { post, posted } = collectingPost();
    const handler = createWorkerMessageHandler(post, 2); // tiny chunks so the abort has room to land mid-run
    const input = generateRandomArray({ size: 30, seed: 2 });

    const runPromise = handler.handleMessage({
      type: "run",
      requestId: "req-2",
      pluginId: bubbleSortPlugin.metadata.id,
      input,
    });
    // Fires synchronously up to the abort() call — the run above is
    // suspended on its first setTimeout(0) yield by this point, so this
    // reliably lands before the run finishes.
    void handler.handleMessage({ type: "abort", requestId: "req-2" });
    await runPromise;

    const last = posted[posted.length - 1]!;
    expect(last.type).toBe("aborted");
    if (last.type !== "aborted") throw new Error("expected an aborted message");
    expect(last.requestId).toBe("req-2");
    expect(last.result.completed).toBe(false);
    // Partial progress isn't discarded on abort.
    expect(last.result.events.length).toBeGreaterThan(0);
    expect(last.result.events.length).toBeLessThan(200); // well short of a full bubble-sort run on 30 elements
  });

  it("posts an error message for an unknown plugin id, without throwing", async () => {
    const { post, posted } = collectingPost();
    const handler = createWorkerMessageHandler(post);
    const input = generateRandomArray({ size: 5, seed: 3 });

    await expect(
      handler.handleMessage({ type: "run", requestId: "req-3", pluginId: algorithmId("nope"), input }),
    ).resolves.toBeUndefined();

    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({ type: "error", requestId: "req-3" });
  });

  it("an abort for an unknown/already-finished requestId is a harmless no-op", async () => {
    const { post, posted } = collectingPost();
    const handler = createWorkerMessageHandler(post);

    await expect(handler.handleMessage({ type: "abort", requestId: "never-started" })).resolves.toBeUndefined();
    expect(posted).toHaveLength(0);
  });
});
