import { algorithmId, type AlgorithmMetadata, type ArrayInput, type InputConstraints } from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedArray } from "@algoviz/engine";
import type { SearchingPlugin } from "../registry";

// Mirrors the `run` function below line-for-line — see bubble-sort.ts's
// SOURCE_CODE comment for the convention, and searching.test.ts for the
// drift-detection tests that check every sourceLine actually falls within
// this snippet and lands on a plausible line.
const SOURCE_CODE = `function* run(input: ArrayInput, arr: InstrumentedArray): AlgorithmGenerator {
  const target = input.target ?? Number.NaN;
  let low = 0;
  let high = arr.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    yield arr.highlight([low, high], "window", { line: 2 });
    const cmp = arr.compareTarget(mid, target, { line: 4 });
    yield cmp;
    if (cmp.result === 0) {
      yield arr.markDone([mid], { line: 5 });
      return;
    } else if (cmp.result < 0) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("binary-search"),
  name: "Binary Search",
  category: "searching",
  description:
    "Repeatedly halves a sorted array's search window: checks the middle element, then discards whichever half can't contain the target. Requires the array to already be sorted — that's what makes discarding a whole half valid.",
  complexity: { best: "O(1)", average: "O(log n)", worst: "O(log n)", space: "O(1)" },
  pseudocode: [
    { line: 1, text: "low = 0, high = n - 1" },
    { line: 2, text: "while low <= high" },
    { line: 3, text: "mid = floor((low + high) / 2)", indent: 1 },
    { line: 4, text: "if arr[mid] == target", indent: 1 },
    { line: 5, text: "return mid", indent: 2 },
    { line: 6, text: "else if arr[mid] < target: low = mid + 1", indent: 1 },
    { line: 7, text: "else: high = mid - 1", indent: 1 },
    { line: 8, text: "return -1 (not found)" },
  ],
  sourceCode: { language: "typescript", code: SOURCE_CODE },
};

const inputConstraints: InputConstraints = {
  kind: "array",
  minSize: 1,
  // See linear-search.ts's identical comment — ArraySearchRenderer draws
  // one fixed-size box per element, so this caps how many can ever need to
  // fit on screen at once.
  maxSize: 50,
  defaultSize: 20,
  valueRange: [1, 100],
  sorted: true,
  needsTarget: true,
};

function* run(input: ArrayInput, arr: InstrumentedArray): AlgorithmGenerator {
  // See linear-search.ts's identical comment on the NaN fallback.
  const target = input.target ?? Number.NaN;
  let low = 0;
  let high = arr.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    yield arr.highlight([low, high], "window", { line: 2, sourceLine: 8 });
    const cmp = arr.compareTarget(mid, target, { line: 4, sourceLine: 9 });
    yield cmp;
    if (cmp.result === 0) {
      yield arr.markDone([mid], { line: 5, sourceLine: 12 });
      return;
    } else if (cmp.result < 0) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
}

export const binarySearchPlugin: SearchingPlugin = {
  metadata,
  inputConstraints,
  run,
};
