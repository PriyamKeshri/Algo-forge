import { algorithmId, type AlgorithmMetadata, type ArrayInput, type InputConstraints } from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedArray } from "@algoviz/engine";
import type { SortingPlugin } from "../registry";

// Mirrors the `run` function below line-for-line (sourceLine tags
// themselves omitted — see the note in bubble-sort.ts for why), and the
// drift-detection tests in sorting.test.ts check every sourceLine against
// this snippet.
const SOURCE_CODE = `function* run(_input: ArrayInput, arr: InstrumentedArray): AlgorithmGenerator {
  const n = arr.length;
  if (n > 0) {
    yield arr.markDone(0, { line: 2 });
  }

  for (let i = 1; i < n; i++) {
    let j = i;
    while (j > 0) {
      yield arr.compare(j - 1, j, { line: 3 });
      if (arr.get(j - 1) <= arr.get(j)) break;
      yield arr.swap(j - 1, j, { line: 4 });
      j--;
    }
    yield arr.markDone(
      Array.from({ length: i + 1 }, (_, idx) => idx),
      { line: 1 },
    );
  }
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("insertion-sort"),
  name: "Insertion Sort",
  category: "sorting",
  description:
    "Builds the sorted array one element at a time: takes the next unsorted element and shifts it backward through the already-sorted prefix until it lands in the right place.",
  complexity: { best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)" },
  pseudocode: [
    { line: 1, text: "for i from 1 to n - 1" },
    { line: 2, text: "j = i", indent: 1 },
    { line: 3, text: "while j > 0 and arr[j - 1] > arr[j]", indent: 1 },
    { line: 4, text: "swap(arr[j - 1], arr[j]); j--", indent: 2 },
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

function* run(_input: ArrayInput, arr: InstrumentedArray): AlgorithmGenerator {
  const n = arr.length;
  if (n > 0) {
    yield arr.markDone(0, { line: 2, sourceLine: 4 });
  }

  for (let i = 1; i < n; i++) {
    let j = i;
    while (j > 0) {
      yield arr.compare(j - 1, j, { line: 3, sourceLine: 10 });
      if (arr.get(j - 1) <= arr.get(j)) break;
      yield arr.swap(j - 1, j, { line: 4, sourceLine: 12 });
      j--;
    }
    yield arr.markDone(
      Array.from({ length: i + 1 }, (_, idx) => idx),
      { line: 1, sourceLine: 15 },
    );
  }
}

export const insertionSortPlugin: SortingPlugin = {
  metadata,
  inputConstraints,
  run,
};
