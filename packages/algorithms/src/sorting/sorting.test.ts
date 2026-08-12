import { describe, expect, it } from "vitest";
import { createInstrumentedArray, ExecutionEngine } from "@algoviz/engine";
import type { ArrayInput } from "@algoviz/core";
import { bubbleSortPlugin } from "./bubble-sort";
import { insertionSortPlugin } from "./insertion-sort";
import { mergeSortPlugin } from "./merge-sort";
import { quickSortPlugin } from "./quick-sort";
import type { SortingPlugin } from "../registry";

const plugins: Array<{ name: string; plugin: SortingPlugin }> = [
  { name: "Bubble Sort", plugin: bubbleSortPlugin },
  { name: "Insertion Sort", plugin: insertionSortPlugin },
  { name: "Merge Sort", plugin: mergeSortPlugin },
  { name: "Quick Sort", plugin: quickSortPlugin },
];

const cases: Array<{ name: string; values: number[] }> = [
  { name: "empty", values: [] },
  { name: "single element", values: [42] },
  { name: "already sorted", values: [1, 2, 3, 4, 5] },
  { name: "reverse sorted", values: [5, 4, 3, 2, 1] },
  { name: "duplicates", values: [3, 1, 3, 2, 3, 1] },
  { name: "random", values: [7, 2, 9, 4, 4, 1, 8, 3, 6, 0] },
];

// A sourceLine-tagged line should always be part of an instrumented
// operation (a yield, or a call into the InstrumentedArray). This is the
// drift detector: if a plugin's SOURCE_CODE snippet and its real yield
// sites ever get out of sync (e.g. a line was added/removed in one but not
// the other), a sourceLine will end up pointing at an unrelated line —
// blank, a brace, a comment — and this check catches it immediately.
const OPERATION_MARKERS = ["yield", ".compare(", ".swap(", ".set(", ".read(", ".markDone(", ".highlight("];

function isNonDecreasing(values: number[]): boolean {
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1]! > values[i]!) return false;
  }
  return true;
}

function runPlugin(plugin: SortingPlugin, values: number[]) {
  const engine = new ExecutionEngine();
  const arr = createInstrumentedArray(values);
  const input: ArrayInput = { kind: "array", values };
  return engine.run(plugin.run(input, arr), arr);
}

describe.each(plugins)("$name", ({ plugin }) => {
  it.each(cases)("sorts the $name case correctly", ({ values }) => {
    const result = runPlugin(plugin, values);

    expect(result.completed).toBe(true);
    expect(result.finalSnapshot.kind).toBe("array");
    const finalValues = (result.finalSnapshot as { kind: "array"; values: number[] }).values;
    expect(finalValues).toEqual([...values].sort((a, b) => a - b));
    expect(isNonDecreasing(finalValues)).toBe(true);
  });

  it("produces monotonically increasing event steps, each referencing a valid pseudocode line", () => {
    const values = [7, 2, 9, 4, 4, 1, 8, 3, 6, 0];
    const result = runPlugin(plugin, values);
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
    const values = [7, 2, 9, 4, 4, 1, 8, 3, 6, 0];
    const result = runPlugin(plugin, values);
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

  it("produces non-negative stats consistent with the event stream", () => {
    const values = [7, 2, 9, 4, 4, 1, 8, 3, 6, 0];
    const result = runPlugin(plugin, values);

    expect(result.stats.comparisons).toBeGreaterThanOrEqual(0);
    expect(result.stats.swaps).toBeGreaterThanOrEqual(0);
    expect(result.stats.reads).toBeGreaterThanOrEqual(0);
    expect(result.stats.writes).toBeGreaterThanOrEqual(0);

    const compareCount = result.events.filter((e) => e.type === "compare").length;
    const swapCount = result.events.filter((e) => e.type === "swap").length;
    expect(result.stats.comparisons).toBe(compareCount);
    expect(result.stats.swaps).toBe(swapCount);
  });

  it("leaves every index marked done exactly covering the array", () => {
    const values = [7, 2, 9, 4, 4, 1, 8, 3, 6, 0];
    const result = runPlugin(plugin, values);
    const markedDone = new Set<number>();
    for (const event of result.events) {
      if (event.type === "mark-done") {
        for (const idx of event.indices) markedDone.add(idx);
      }
    }
    expect(markedDone.size).toBe(values.length);
    for (let i = 0; i < values.length; i++) {
      expect(markedDone.has(i)).toBe(true);
    }
  });
});
