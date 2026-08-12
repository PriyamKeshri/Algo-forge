import { algorithmId, type AlgorithmMetadata, type ArrayInput, type InputConstraints } from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedArray } from "@algoviz/engine";
import type { SortingPlugin } from "../registry";

// Mirrors the quickSortRange/run functions below line-for-line (sourceLine
// tags themselves omitted — see the note in bubble-sort.ts for why),
// checked by the drift-detection tests in sorting.test.ts. Partitioning is
// kept inline in quickSortRange rather than split into its own `yield*`-
// delegated helper (contrast merge-sort.ts's separate `merge` function) —
// a plugin generator's return type is `void` (see the "yield only
// publishes" note in the repo README), so a helper can't hand back the
// pivot's final index the way a normal function could; recursing needs
// that index, so partitioning has to happen in the same scope that recurses.
const SOURCE_CODE = `function* quickSortRange(arr: InstrumentedArray, low: number, high: number): AlgorithmGenerator {
  if (low >= high) {
    if (low === high) yield arr.markDone(low, { line: 2 });
    return;
  }

  let i = low - 1;
  for (let j = low; j < high; j++) {
    yield arr.compare(j, high, { line: 5 });
    if (arr.get(j) <= arr.get(high)) {
      i++;
      if (i !== j) yield arr.swap(i, j, { line: 6 });
    }
  }
  if (i + 1 !== high) yield arr.swap(i + 1, high, { line: 7 });
  const pivotIndex = i + 1;
  yield arr.markDone(pivotIndex, { line: 8 });

  yield* quickSortRange(arr, low, pivotIndex - 1);
  yield* quickSortRange(arr, pivotIndex + 1, high);
}

function* run(_input: ArrayInput, arr: InstrumentedArray): AlgorithmGenerator {
  if (arr.length === 0) return;
  yield* quickSortRange(arr, 0, arr.length - 1);
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("quick-sort"),
  name: "Quick Sort",
  category: "sorting",
  description:
    "Picks the last element of the range as a pivot, partitions in place so everything ≤ pivot ends up left of it and everything greater ends up right — which drops the pivot straight into its final sorted position — then recurses on the two partitions. In-place, unlike Merge Sort's temp-buffer approach; degrades to O(n²) on already-sorted/reverse-sorted input since always picking the last element as pivot gives the least balanced possible split there.",
  complexity: { best: "O(n log n)", average: "O(n log n)", worst: "O(n²)", space: "O(log n)" },
  pseudocode: [
    { line: 1, text: "quickSort(arr, low, high):" },
    { line: 2, text: "if low >= high: return", indent: 1 },
    { line: 3, text: "pivot = arr[high]", indent: 1 },
    { line: 4, text: "i = low - 1", indent: 1 },
    { line: 5, text: "for j from low to high - 1: if arr[j] <= pivot", indent: 1 },
    { line: 6, text: "i++; swap(arr[i], arr[j])", indent: 2 },
    { line: 7, text: "swap(arr[i + 1], arr[high])", indent: 1 },
    { line: 8, text: "pivotIndex = i + 1; mark pivotIndex done", indent: 1 },
    { line: 9, text: "quickSort(arr, low, pivotIndex - 1)", indent: 1 },
    { line: 10, text: "quickSort(arr, pivotIndex + 1, high)", indent: 1 },
  ],
  sourceCode: { language: "typescript", code: SOURCE_CODE },
};

const inputConstraints: InputConstraints = {
  kind: "array",
  minSize: 1,
  // See bubble-sort.ts's identical comment.
  maxSize: 100,
  defaultSize: 30,
  valueRange: [1, 100],
};

function* quickSortRange(arr: InstrumentedArray, low: number, high: number): AlgorithmGenerator {
  if (low >= high) {
    if (low === high) yield arr.markDone(low, { line: 2, sourceLine: 3 });
    return;
  }

  // Lomuto partition: `arr[high]` is the pivot and stays put at index
  // `high` for the whole loop (nothing below writes to it), so comparing
  // against it by index — `arr.compare(j, high, ...)` — is valid
  // throughout, the same way bubble/insertion sort compare two live array
  // indices rather than needing an external target.
  let i = low - 1;
  for (let j = low; j < high; j++) {
    yield arr.compare(j, high, { line: 5, sourceLine: 9 });
    if (arr.get(j) <= arr.get(high)) {
      i++;
      if (i !== j) yield arr.swap(i, j, { line: 6, sourceLine: 12 });
    }
  }
  if (i + 1 !== high) yield arr.swap(i + 1, high, { line: 7, sourceLine: 15 });
  const pivotIndex = i + 1;
  // The pivot is in its final sorted position the instant partitioning
  // finishes — unlike bubble sort's growing suffix, there's no later pass
  // that could still move it.
  yield arr.markDone(pivotIndex, { line: 8, sourceLine: 17 });

  yield* quickSortRange(arr, low, pivotIndex - 1);
  yield* quickSortRange(arr, pivotIndex + 1, high);
}

function* run(_input: ArrayInput, arr: InstrumentedArray): AlgorithmGenerator {
  if (arr.length === 0) return;
  yield* quickSortRange(arr, 0, arr.length - 1);
}

export const quickSortPlugin: SortingPlugin = {
  metadata,
  inputConstraints,
  run,
};
