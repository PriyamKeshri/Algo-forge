import { algorithmId, type AlgorithmMetadata, type ArrayInput, type InputConstraints } from "@algoviz/core";
import type { AlgorithmGenerator, InstrumentedArray } from "@algoviz/engine";
import type { SearchingPlugin } from "../registry";

// Mirrors the `run` function below line-for-line — see bubble-sort.ts's
// SOURCE_CODE comment for the convention, and searching.test.ts for the
// drift-detection tests that check every sourceLine actually falls within
// this snippet and lands on a plausible line.
const SOURCE_CODE = `function* run(input: ArrayInput, arr: InstrumentedArray): AlgorithmGenerator {
  const target = input.target ?? Number.NaN;
  for (let i = 0; i < arr.length; i++) {
    const cmp = arr.compareTarget(i, target, { line: 2 });
    yield cmp;
    if (cmp.result === 0) {
      yield arr.markDone([i], { line: 3 });
      return;
    }
  }
}`;

const metadata: AlgorithmMetadata = {
  id: algorithmId("linear-search"),
  name: "Linear Search",
  category: "searching",
  description:
    "Checks each element in order until it finds one equal to the target (or runs out of array). Makes no assumption about ordering — it's the only search that works on an unsorted array.",
  complexity: { best: "O(1)", average: "O(n)", worst: "O(n)", space: "O(1)" },
  pseudocode: [
    { line: 1, text: "for i from 0 to n - 1" },
    { line: 2, text: "if arr[i] == target", indent: 1 },
    { line: 3, text: "return i", indent: 2 },
    { line: 4, text: "return -1 (not found)" },
  ],
  sourceCode: { language: "typescript", code: SOURCE_CODE },
};

const inputConstraints: InputConstraints = {
  kind: "array",
  minSize: 1,
  // Kept small deliberately — ArraySearchRenderer draws one fixed-size box
  // per element (not a bar whose width can shrink to fit), so this is the
  // point past which boxes would either overflow or become illegibly tiny.
  maxSize: 50,
  defaultSize: 20,
  valueRange: [1, 100],
  needsTarget: true,
};

function* run(input: ArrayInput, arr: InstrumentedArray): AlgorithmGenerator {
  // `target` should always be present — inputConstraints.needsTarget tells
  // the app to generate one — but a NaN fallback keeps a missing target a
  // harmless "search for nothing found" instead of a crash (NaN !== any
  // number, including itself, so no index can ever match it).
  const target = input.target ?? Number.NaN;
  for (let i = 0; i < arr.length; i++) {
    const cmp = arr.compareTarget(i, target, { line: 2, sourceLine: 4 });
    yield cmp;
    if (cmp.result === 0) {
      yield arr.markDone([i], { line: 3, sourceLine: 7 });
      return;
    }
  }
}

export const linearSearchPlugin: SearchingPlugin = {
  metadata,
  inputConstraints,
  run,
};
