import { algorithmId, type AlgorithmMetadata, type ArrayInput, type InputConstraints } from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedArray } from "@algoviz/engine";
import type { SortingPlugin } from "../registry";

// Mirrors the merge/mergeSortRange/run functions below line-for-line
// (sourceLine tags themselves omitted — see the note in bubble-sort.ts for
// why), checked by the drift-detection tests in sorting.test.ts.
// sourceLine resolves more finely than the pseudocode's `line`: e.g. the
// left-buffer read and right-buffer read below are both pseudocode line 6,
// but are two distinct sourceLines.
const SOURCE_CODE = `function* merge(arr: InstrumentedArray, left: number, mid: number, right: number): AlgorithmGenerator {
  const leftValues: number[] = [];
  for (let i = left; i <= mid; i++) {
    const event = arr.read(i, { line: 6 });
    yield event;
    leftValues.push(event.value);
  }

  const rightValues: number[] = [];
  for (let i = mid + 1; i <= right; i++) {
    const event = arr.read(i, { line: 6 });
    yield event;
    rightValues.push(event.value);
  }

  let i = 0;
  let j = 0;
  let k = left;

  while (i < leftValues.length && j < rightValues.length) {
    if (leftValues[i]! <= rightValues[j]!) {
      yield arr.set(k, leftValues[i]!, { line: 7 });
      i++;
    } else {
      yield arr.set(k, rightValues[j]!, { line: 7 });
      j++;
    }
    k++;
  }
  while (i < leftValues.length) {
    yield arr.set(k, leftValues[i]!, { line: 7 });
    i++;
    k++;
  }
  while (j < rightValues.length) {
    yield arr.set(k, rightValues[j]!, { line: 7 });
    j++;
    k++;
  }

  yield arr.markDone(
    Array.from({ length: right - left + 1 }, (_, idx) => left + idx),
    { line: 8 },
  );
}

function* mergeSortRange(arr: InstrumentedArray, left: number, right: number): AlgorithmGenerator {
  if (left >= right) {
    if (left === right) yield arr.markDone(left, { line: 2 });
    return;
  }
  const mid = (left + right) >> 1;
  yield* mergeSortRange(arr, left, mid);
  yield* mergeSortRange(arr, mid + 1, right);
  yield* merge(arr, left, mid, right);
}

function* run(_input: ArrayInput, arr: InstrumentedArray): AlgorithmGenerator {
  if (arr.length === 0) return;
  yield* mergeSortRange(arr, 0, arr.length - 1);
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("merge-sort"),
  name: "Merge Sort",
  category: "sorting",
  description:
    "Recursively splits the array in half until each piece is trivially sorted, then merges sorted pieces back together. Merge comparisons happen against values already copied into a temp buffer rather than live array indices, so this visualization shows the copy-out reads and merge-back writes rather than index-pair compares.",
  complexity: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)", space: "O(n)" },
  pseudocode: [
    { line: 1, text: "mergeSort(arr, left, right):" },
    { line: 2, text: "if left >= right: return", indent: 1 },
    { line: 3, text: "mid = (left + right) / 2", indent: 1 },
    { line: 4, text: "mergeSort(arr, left, mid)", indent: 1 },
    { line: 5, text: "mergeSort(arr, mid + 1, right)", indent: 1 },
    { line: 6, text: "copy arr[left..right] into left/right buffers", indent: 1 },
    { line: 7, text: "write smaller front of the two buffers into arr[k]", indent: 1 },
    { line: 8, text: "mark arr[left..right] done", indent: 1 },
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

function* merge(arr: InstrumentedArray, left: number, mid: number, right: number): AlgorithmGenerator {
  const leftValues: number[] = [];
  for (let i = left; i <= mid; i++) {
    const event = arr.read(i, { line: 6, sourceLine: 4 });
    yield event;
    leftValues.push(event.value);
  }

  const rightValues: number[] = [];
  for (let i = mid + 1; i <= right; i++) {
    const event = arr.read(i, { line: 6, sourceLine: 11 });
    yield event;
    rightValues.push(event.value);
  }

  let i = 0;
  let j = 0;
  let k = left;

  while (i < leftValues.length && j < rightValues.length) {
    if (leftValues[i]! <= rightValues[j]!) {
      yield arr.set(k, leftValues[i]!, { line: 7, sourceLine: 22 });
      i++;
    } else {
      yield arr.set(k, rightValues[j]!, { line: 7, sourceLine: 25 });
      j++;
    }
    k++;
  }
  while (i < leftValues.length) {
    yield arr.set(k, leftValues[i]!, { line: 7, sourceLine: 31 });
    i++;
    k++;
  }
  while (j < rightValues.length) {
    yield arr.set(k, rightValues[j]!, { line: 7, sourceLine: 36 });
    j++;
    k++;
  }

  yield arr.markDone(
    Array.from({ length: right - left + 1 }, (_, idx) => left + idx),
    { line: 8, sourceLine: 41 },
  );
}

function* mergeSortRange(arr: InstrumentedArray, left: number, right: number): AlgorithmGenerator {
  if (left >= right) {
    if (left === right) yield arr.markDone(left, { line: 2, sourceLine: 49 });
    return;
  }
  const mid = (left + right) >> 1;
  yield* mergeSortRange(arr, left, mid);
  yield* mergeSortRange(arr, mid + 1, right);
  yield* merge(arr, left, mid, right);
}

function* run(_input: ArrayInput, arr: InstrumentedArray): AlgorithmGenerator {
  if (arr.length === 0) return;
  yield* mergeSortRange(arr, 0, arr.length - 1);
}

export const mergeSortPlugin: SortingPlugin = {
  metadata,
  inputConstraints,
  run,
};
