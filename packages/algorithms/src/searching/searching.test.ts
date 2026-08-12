import { describe, expect, it } from "vitest";
import { createInstrumentedArray, ExecutionEngine, type RunResult } from "@algoviz/engine";
import type { ArrayInput, VisualizationEvent } from "@algoviz/core";
import { linearSearchPlugin } from "./linear-search";
import { binarySearchPlugin } from "./binary-search";
import type { SearchingPlugin } from "../registry";

const plugins: Array<{ name: string; plugin: SearchingPlugin }> = [
  { name: "Linear Search", plugin: linearSearchPlugin },
  { name: "Binary Search", plugin: binarySearchPlugin },
];

// A sourceLine-tagged line should always be part of an instrumented
// operation. See ../sorting/sorting.test.ts for the full rationale — this
// is the searching-plugin equivalent of that drift detector.
const OPERATION_MARKERS = ["yield", ".compareTarget(", ".markDone(", ".highlight("];

// All values sorted ascending — valid input for both plugins (Binary
// Search requires it; Linear Search doesn't care about order either way).
const cases: Array<{ name: string; values: number[]; target: number; shouldFind: boolean }> = [
  { name: "empty array", values: [], target: 5, shouldFind: false },
  { name: "single element, found", values: [42], target: 42, shouldFind: true },
  { name: "single element, not found", values: [42], target: 7, shouldFind: false },
  { name: "target at the start", values: [1, 3, 5, 7, 9, 11], target: 1, shouldFind: true },
  { name: "target at the end", values: [1, 3, 5, 7, 9, 11], target: 11, shouldFind: true },
  { name: "target in the middle", values: [1, 3, 5, 7, 9, 11], target: 7, shouldFind: true },
  { name: "target absent, within range", values: [1, 3, 5, 7, 9, 11], target: 4, shouldFind: false },
  { name: "target absent, below range", values: [1, 3, 5, 7, 9, 11], target: -5, shouldFind: false },
  { name: "target absent, above range", values: [1, 3, 5, 7, 9, 11], target: 99, shouldFind: false },
  { name: "duplicates", values: [2, 2, 2, 2, 2], target: 2, shouldFind: true },
];

function runPlugin(plugin: SearchingPlugin, values: number[], target: number): RunResult {
  const engine = new ExecutionEngine();
  const arr = createInstrumentedArray(values);
  const input: ArrayInput = { kind: "array", values, target };
  return engine.run(plugin.run(input, arr), arr);
}

function foundIndices(events: VisualizationEvent[]): Set<number> {
  const found = new Set<number>();
  for (const event of events) {
    if (event.type === "mark-done") {
      for (const index of event.indices) found.add(index);
    }
  }
  return found;
}

describe.each(plugins)("$name", ({ plugin }) => {
  it.each(cases)("$name", ({ values, target, shouldFind }) => {
    const result = runPlugin(plugin, values, target);
    expect(result.completed).toBe(true);

    const found = foundIndices(result.events);
    if (shouldFind) {
      expect(found.size).toBe(1);
      const [index] = [...found];
      expect(values[index!]).toBe(target);
    } else {
      expect(found.size).toBe(0);
    }
  });

  it("produces monotonically increasing event steps, each referencing a valid pseudocode line", () => {
    const values = [1, 3, 5, 7, 9, 11, 13, 15];
    const result = runPlugin(plugin, values, 9);
    const validLines = new Set(plugin.metadata.pseudocode.map((p) => p.line));

    expect(result.events.length).toBeGreaterThan(0);
    let previousStep = -1;
    for (const event of result.events) {
      expect(event.step).toBeGreaterThan(previousStep);
      previousStep = event.step;
      if (event.line !== undefined) {
        expect(validLines.has(event.line)).toBe(true);
      }
    }
  });

  it("produces well-formed sourceLine references into the real source snippet", () => {
    const values = [1, 3, 5, 7, 9, 11, 13, 15];
    const result = runPlugin(plugin, values, 9);
    const sourceLines = plugin.metadata.sourceCode.code.split("\n");

    expect(result.events.some((e) => e.sourceLine !== undefined)).toBe(true);
    for (const event of result.events) {
      if (event.sourceLine === undefined) continue;
      expect(event.sourceLine).toBeGreaterThanOrEqual(1);
      expect(event.sourceLine).toBeLessThanOrEqual(sourceLines.length);
      const lineText = sourceLines[event.sourceLine - 1]!;
      expect(OPERATION_MARKERS.some((marker) => lineText.includes(marker))).toBe(true);
    }
  });

  it("produces non-negative stats consistent with the event stream, counting comparisons via compare-value", () => {
    const values = [1, 3, 5, 7, 9, 11, 13, 15];
    const result = runPlugin(plugin, values, 9);

    expect(result.stats.comparisons).toBeGreaterThanOrEqual(0);
    expect(result.stats.reads).toBe(0); // these plugins visualize via compare-value, not read
    expect(result.stats.swaps).toBe(0);
    expect(result.stats.writes).toBe(0);

    const compareValueCount = result.events.filter((e) => e.type === "compare-value").length;
    expect(result.stats.comparisons).toBe(compareValueCount);
  });

  it("never mutates the underlying array", () => {
    const values = [1, 3, 5, 7, 9, 11];
    const result = runPlugin(plugin, values, 7);
    expect(result.finalSnapshot).toEqual({ kind: "array", values });
  });
});

describe("Binary Search", () => {
  it("only ever examines O(log n) elements, even on a large sorted array", () => {
    const values = Array.from({ length: 1000 }, (_, i) => i);
    const result = runPlugin(binarySearchPlugin, values, 777);
    const compareCount = result.events.filter((e) => e.type === "compare-value").length;
    expect(compareCount).toBeLessThanOrEqual(Math.ceil(Math.log2(values.length)) + 1);
  });
});
