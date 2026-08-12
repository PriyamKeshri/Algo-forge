import { algorithmId } from "@algoviz/core";
import { algorithmRegistry } from "@algoviz/algorithms";

export interface RaceAlgorithm {
  id: string;
  name: string;
  /** Average-case Big-O, pulled from the same plugin metadata the regular visualizer shows — one source of truth, no risk of the two drifting apart. */
  complexity: string;
  /** Sorts `values` in place. Deliberately *not* the instrumented/generator versions used elsewhere in this app — those exist to emit one event per compare/swap for step-by-step playback, which is exactly the overhead Race Mode needs to not pay in order to measure real wall-clock time. */
  sort: (values: number[]) => void;
}

function bubbleSort(values: number[]): void {
  const n = values.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      if (values[j]! > values[j + 1]!) {
        const tmp = values[j]!;
        values[j] = values[j + 1]!;
        values[j + 1] = tmp;
        swapped = true;
      }
    }
    if (!swapped) break;
  }
}

function insertionSort(values: number[]): void {
  for (let i = 1; i < values.length; i++) {
    const current = values[i]!;
    let j = i - 1;
    while (j >= 0 && values[j]! > current) {
      values[j + 1] = values[j]!;
      j--;
    }
    values[j + 1] = current;
  }
}

function merge(values: number[], buffer: number[], left: number, mid: number, right: number): void {
  let i = left;
  let j = mid + 1;
  let k = left;
  while (i <= mid && j <= right) {
    buffer[k++] = values[i]! <= values[j]! ? values[i++]! : values[j++]!;
  }
  while (i <= mid) buffer[k++] = values[i++]!;
  while (j <= right) buffer[k++] = values[j++]!;
  for (let x = left; x <= right; x++) values[x] = buffer[x]!;
}

function mergeSortRange(values: number[], buffer: number[], left: number, right: number): void {
  if (left >= right) return;
  const mid = (left + right) >> 1;
  mergeSortRange(values, buffer, left, mid);
  mergeSortRange(values, buffer, mid + 1, right);
  merge(values, buffer, left, mid, right);
}

function mergeSort(values: number[]): void {
  if (values.length <= 1) return;
  // One shared scratch buffer for the whole sort (reused by every merge
  // call) rather than each merge allocating its own — same end result,
  // far less garbage for large race sizes.
  const buffer: number[] = new Array(values.length);
  mergeSortRange(values, buffer, 0, values.length - 1);
}

function quickSortRange(values: number[], low: number, high: number): void {
  if (low >= high) return;
  // Lomuto partition, last element as pivot — same choice the visualized
  // Quick Sort plugin makes (packages/algorithms/src/sorting/quick-sort.ts),
  // so Race Mode's relative behavior matches what that page teaches
  // (average-case O(n log n), degrades on adversarial input).
  const pivot = values[high]!;
  let i = low - 1;
  for (let j = low; j < high; j++) {
    if (values[j]! <= pivot) {
      i++;
      const tmp = values[i]!;
      values[i] = values[j]!;
      values[j] = tmp;
    }
  }
  const tmp = values[i + 1]!;
  values[i + 1] = values[high]!;
  values[high] = tmp;
  const pivotIndex = i + 1;
  quickSortRange(values, low, pivotIndex - 1);
  quickSortRange(values, pivotIndex + 1, high);
}

function quickSort(values: number[]): void {
  quickSortRange(values, 0, values.length - 1);
}

/** Looks up `pluginId`'s display name/complexity in the shared registry (populated by importing `@algoviz/algorithms`, same as every other page in this app) so Race Mode never hand-duplicates strings that could drift from the real plugin metadata. */
function algorithmFor(pluginId: string, sort: (values: number[]) => void): RaceAlgorithm {
  const plugin = algorithmRegistry.get(algorithmId(pluginId));
  if (!plugin) throw new Error(`Race mode: unknown algorithm id "${pluginId}".`);
  return { id: pluginId, name: plugin.metadata.name, complexity: plugin.metadata.complexity.average, sort };
}

export const RACE_ALGORITHMS: RaceAlgorithm[] = [
  algorithmFor("bubble-sort", bubbleSort),
  algorithmFor("insertion-sort", insertionSort),
  algorithmFor("merge-sort", mergeSort),
  algorithmFor("quick-sort", quickSort),
];
