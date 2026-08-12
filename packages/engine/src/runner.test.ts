import { describe, expect, it } from "vitest";
import { MainThreadRunner } from "./runner";
import type { AlgorithmGenerator, RunnableContext } from "./driver";
import type { VisualizationEvent } from "@algoviz/core";

const fakeCtx: RunnableContext = {
  snapshot: () => ({ kind: "array", values: [] }),
};

function highlightEvent(step: number): VisualizationEvent {
  return { type: "highlight", step, indices: [step] };
}

function* finiteGenerator(count: number): AlgorithmGenerator {
  for (let i = 0; i < count; i++) {
    yield highlightEvent(i);
  }
}

describe("MainThreadRunner.run", () => {
  it("collects every event across multiple chunks and completes", async () => {
    const runner = new MainThreadRunner(3); // force several chunk boundaries for 10 events
    const result = await runner.run(finiteGenerator(10), fakeCtx);
    expect(result.completed).toBe(true);
    expect(result.events).toHaveLength(10);
    expect(result.events.map((e) => e.step)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("works with a single chunk covering the whole run", async () => {
    const runner = new MainThreadRunner(100);
    const result = await runner.run(finiteGenerator(5), fakeCtx);
    expect(result.completed).toBe(true);
    expect(result.events).toHaveLength(5);
  });

  it("stops early and reports incomplete when aborted mid-run", async () => {
    const controller = new AbortController();
    function* gen(): AlgorithmGenerator {
      for (let i = 0; i < 20; i++) {
        if (i === 4) controller.abort();
        yield highlightEvent(i);
      }
    }
    const runner = new MainThreadRunner(2);
    const result = await runner.run(gen(), fakeCtx, { signal: controller.signal });
    expect(result.completed).toBe(false);
    expect(result.events.length).toBeLessThan(20);
  });

  it("respects stepLimit across chunk boundaries", async () => {
    function* infinite(): AlgorithmGenerator {
      let i = 0;
      while (true) yield highlightEvent(i++);
    }
    const runner = new MainThreadRunner(3);
    const result = await runner.run(infinite(), fakeCtx, { stepLimit: 7 });
    expect(result.completed).toBe(false);
    expect(result.events).toHaveLength(7);
  });
});
