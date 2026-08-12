import { describe, expect, it } from "vitest";
import { algorithmId } from "@algoviz/core";
import { ExecutionEngine } from "@algoviz/engine";
// Importing these families registers their plugins into the shared
// algorithmRegistry as a side effect (see ./sorting/index.ts) — needed
// since preparePluginRun looks plugins up by id through that registry.
import { bubbleSortPlugin } from "./sorting";
import { bfsPlugin } from "./graph";
import { bstInsertPlugin } from "./tree";
import { generateRandomArray } from "./generate-input";
import { generateRandomGraph } from "./generate-graph-input";
import { MainThreadPluginRunner, preparePluginRun, UnknownAlgorithmError, UnsupportedInputError } from "./execute";

describe("preparePluginRun", () => {
  it("builds an InstrumentedArray context for an array/sorting plugin", () => {
    const input = generateRandomArray({ size: 8, seed: 1 });
    const { generator, ctx } = preparePluginRun(bubbleSortPlugin.metadata.id, input);

    const result = new ExecutionEngine().run(generator, ctx);
    expect(result.completed).toBe(true);
    expect(ctx.snapshot()).toEqual({ kind: "array", values: [...input.values].sort((a, b) => a - b) });
  });

  it("builds an InstrumentedGraph context for a graph plugin", () => {
    const input = generateRandomGraph({ size: 6, seed: 2 });
    const { generator, ctx } = preparePluginRun(bfsPlugin.metadata.id, input);

    const result = new ExecutionEngine().run(generator, ctx);
    expect(result.completed).toBe(true);
    expect(ctx.snapshot().kind).toBe("graph");
  });

  it("builds an InstrumentedTree context for a tree plugin (starts empty, gets built)", () => {
    const input = generateRandomArray({ size: 5, seed: 3 });
    const { generator, ctx } = preparePluginRun(bstInsertPlugin.metadata.id, input);

    expect(ctx.snapshot()).toEqual({ kind: "tree", nodes: {}, rootId: null });
    const result = new ExecutionEngine().run(generator, ctx);
    expect(result.completed).toBe(true);
    const snapshot = ctx.snapshot();
    if (snapshot.kind !== "tree") throw new Error("expected a tree snapshot");
    expect(Object.keys(snapshot.nodes)).toHaveLength(5);
  });

  it("throws UnknownAlgorithmError for an unregistered id", () => {
    const input = generateRandomArray({ size: 3, seed: 4 });
    expect(() => preparePluginRun(algorithmId("does-not-exist"), input)).toThrow(UnknownAlgorithmError);
  });

  it("throws UnsupportedInputError when a plugin can't handle the given input kind", () => {
    // bfsPlugin only handles graph input — hand it array input instead.
    const input = generateRandomArray({ size: 3, seed: 5 });
    expect(() => preparePluginRun(bfsPlugin.metadata.id, input)).toThrow(UnsupportedInputError);
  });
});

describe("MainThreadPluginRunner", () => {
  it("runs a registered plugin by id end to end", async () => {
    const input = generateRandomArray({ size: 10, seed: 6 });
    const runner = new MainThreadPluginRunner();
    const result = await runner.run(bubbleSortPlugin.metadata.id, input);

    expect(result.completed).toBe(true);
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.finalSnapshot).toEqual({
      kind: "array",
      values: [...input.values].sort((a, b) => a - b),
    });
  });

  it("throws synchronously for an unknown id, before ever returning a promise", () => {
    const input = generateRandomArray({ size: 3, seed: 7 });
    const runner = new MainThreadPluginRunner();
    expect(() => runner.run(algorithmId("nope"), input)).toThrow(UnknownAlgorithmError);
  });
});
