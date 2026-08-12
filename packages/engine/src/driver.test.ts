import { describe, expect, it } from "vitest";
import { ExecutionEngine, driveGenerator, type AlgorithmGenerator, type RunnableContext } from "./driver";
import type { VisualizationEvent } from "@algoviz/core";

const fakeCtx: RunnableContext = {
  snapshot: () => ({ kind: "array", values: [1, 2, 3] }),
};

function highlightEvent(step: number): VisualizationEvent {
  return { type: "highlight", step, indices: [step] };
}

function* finiteGenerator(count: number): AlgorithmGenerator {
  for (let i = 0; i < count; i++) {
    yield highlightEvent(i);
  }
}

function* infiniteGenerator(): AlgorithmGenerator {
  let i = 0;
  while (true) {
    yield highlightEvent(i);
    i++;
  }
}

describe("driveGenerator", () => {
  it("collects all events and reports done for a generator that finishes within budget", () => {
    const result = driveGenerator(finiteGenerator(3), 100);
    expect(result.events).toHaveLength(3);
    expect(result.done).toBe(true);
    expect(result.aborted).toBe(false);
  });

  it("stops at maxSteps without marking done for a longer/infinite generator", () => {
    const result = driveGenerator(infiniteGenerator(), 5);
    expect(result.events).toHaveLength(5);
    expect(result.done).toBe(false);
    expect(result.aborted).toBe(false);
  });

  it("stops immediately if the signal is already aborted", () => {
    const controller = new AbortController();
    controller.abort();
    const result = driveGenerator(finiteGenerator(5), 100, controller.signal);
    expect(result.events).toHaveLength(0);
    expect(result.aborted).toBe(true);
    expect(result.done).toBe(false);
  });
});

describe("ExecutionEngine.run", () => {
  it("runs a finite generator to completion", () => {
    const engine = new ExecutionEngine();
    const result = engine.run(finiteGenerator(4), fakeCtx);
    expect(result.completed).toBe(true);
    expect(result.events).toHaveLength(4);
    expect(result.finalSnapshot).toEqual({ kind: "array", values: [1, 2, 3] });
  });

  it("derives stats from the collected events", () => {
    const engine = new ExecutionEngine();
    function* gen(): AlgorithmGenerator {
      yield { type: "compare", step: 0, indices: [0, 1], result: 1 };
      yield { type: "swap", step: 1, indices: [0, 1] };
    }
    const result = engine.run(gen(), fakeCtx);
    expect(result.stats).toEqual({ comparisons: 1, swaps: 1, reads: 0, writes: 0 });
  });

  it("respects a custom stepLimit and marks the run incomplete", () => {
    const engine = new ExecutionEngine();
    const result = engine.run(infiniteGenerator(), fakeCtx, { stepLimit: 10 });
    expect(result.events).toHaveLength(10);
    expect(result.completed).toBe(false);
  });

  it("stops immediately and returns no events when already aborted", () => {
    const engine = new ExecutionEngine();
    const controller = new AbortController();
    controller.abort();
    const result = engine.run(finiteGenerator(5), fakeCtx, { signal: controller.signal });
    expect(result.events).toHaveLength(0);
    expect(result.completed).toBe(false);
  });
});
