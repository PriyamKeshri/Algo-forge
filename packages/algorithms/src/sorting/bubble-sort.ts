import { algorithmId, type AlgorithmMetadata, type ArrayInput, type InputConstraints } from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedArray } from "@algoviz/engine";
import type { SortingPlugin } from "../registry";

// Mirrors the `run` function below line-for-line, with one intentional
// omission: the `sourceLine` tags themselves aren't shown here, since a
// line pointing at its own line number would just be confusing noise, not
// a real part of the algorithm. This is what renders in the Source panel,
// synchronized with the pseudocode panel via each yield's `sourceLine` tag.
// See the "Authoring an algorithm plugin" section of the repo README for
// the convention, and sorting.test.ts for the drift-detection tests that
// check every sourceLine actually falls within this snippet and lands on
// a plausible line.
const SOURCE_CODE = `function* run(_input: ArrayInput, arr: InstrumentedArray): AlgorithmGenerator {
  const n = arr.length;
  let sortedBoundary = n;

  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      yield arr.compare(j, j + 1, { line: 3 });
      if (arr.get(j) > arr.get(j + 1)) {
        yield arr.swap(j, j + 1, { line: 4 });
        swapped = true;
      }
    }
    sortedBoundary = n - i - 1;
    yield arr.markDone(sortedBoundary, { line: 1 });
    if (!swapped) break;
  }

  const remaining = Array.from({ length: sortedBoundary }, (_, idx) => idx);
  if (remaining.length > 0) {
    yield arr.markDone(remaining, { line: 5 });
  }
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("bubble-sort"),
  name: "Bubble Sort",
  category: "sorting",
  description:
    "Repeatedly steps through the array, comparing adjacent elements and swapping them if out of order. Each pass bubbles the largest remaining element to its final position; stops early once a full pass makes no swaps.",
  complexity: { best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)" },
  pseudocode: [
    { line: 1, text: "for i from 0 to n - 2" },
    { line: 2, text: "for j from 0 to n - i - 2", indent: 1 },
    { line: 3, text: "if arr[j] > arr[j + 1]", indent: 2 },
    { line: 4, text: "swap(arr[j], arr[j + 1])", indent: 3 },
    { line: 5, text: "if no swaps this pass, break", indent: 1 },
  ],
  sourceCode: { language: "typescript", code: SOURCE_CODE },
};

const inputConstraints: InputConstraints = {
  kind: "array",
  minSize: 1,
  // Bars shrink to fit (ArrayRenderer's min-w-0 + DENSE_THRESHOLD), but
  // stay a sane size to visualize/scrub through — not the actual JS engine
  // limit.
  maxSize: 100,
  defaultSize: 30,
  valueRange: [1, 100],
};

function* run(_input: ArrayInput, arr: InstrumentedArray): AlgorithmGenerator {
  const n = arr.length;
  let sortedBoundary = n;

  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      yield arr.compare(j, j + 1, { line: 3, sourceLine: 8 });
      if (arr.get(j) > arr.get(j + 1)) {
        yield arr.swap(j, j + 1, { line: 4, sourceLine: 10 });
        swapped = true;
      }
    }
    sortedBoundary = n - i - 1;
    yield arr.markDone(sortedBoundary, { line: 1, sourceLine: 15 });
    if (!swapped) break;
  }

  const remaining = Array.from({ length: sortedBoundary }, (_, idx) => idx);
  if (remaining.length > 0) {
    yield arr.markDone(remaining, { line: 5, sourceLine: 21 });
  }
}

export const bubbleSortPlugin: SortingPlugin = {
  metadata,
  inputConstraints,
  run,
};
