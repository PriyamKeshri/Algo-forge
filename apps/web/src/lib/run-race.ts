import { RACE_ALGORITHMS } from "./race-sorts";

export interface RaceResult {
  id: string;
  name: string;
  complexity: string;
  ms: number;
}

function randomArray(size: number): number[] {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 1_000_000));
}

/**
 * Times every RACE_ALGORITHMS entry sorting an *identical* random array —
 * one shared base array, a fresh `.slice()` per algorithm since sorting is
 * in place, so every algorithm is racing the exact same input. Timed with
 * `performance.now()` around the real (non-instrumented) sort call, so the
 * same O(n²)-vs-O(n log n) gap a real codebase would show shows up here
 * too, rather than a step-count proxy for it.
 *
 * Runs fully synchronously — for the sizes Race Mode exposes (a few
 * thousand elements) this is a handful of milliseconds even for the O(n²)
 * algorithms, but callers driving this from a click handler should still
 * defer the call with a rAF/setTimeout first so a "Racing…" state gets to
 * actually paint before this (brief) main-thread block happens.
 *
 * `baseValues` is normally omitted (a fresh random array is generated from
 * `size`) — it's there so tests can inject a fixed array and assert it's
 * never mutated (each algorithm only ever touches its own `.slice()` of it).
 */
export function runRace(size: number, baseValues?: number[]): RaceResult[] {
  const base = baseValues ?? randomArray(size);
  return RACE_ALGORITHMS.map((algo) => {
    const values = base.slice();
    const start = performance.now();
    algo.sort(values);
    const ms = performance.now() - start;
    return { id: algo.id, name: algo.name, complexity: algo.complexity, ms };
  });
}
