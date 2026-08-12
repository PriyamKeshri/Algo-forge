import { describe, expect, it } from "vitest";
import { runRace } from "./run-race";
import { RACE_ALGORITHMS } from "./race-sorts";

describe("runRace", () => {
  it("returns one timed, non-negative result per race algorithm", () => {
    const results = runRace(200);
    expect(results.map((r) => r.id)).toEqual(RACE_ALGORITHMS.map((a) => a.id));
    for (const result of results) {
      expect(result.ms).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(result.ms)).toBe(true);
      expect(result.name.length).toBeGreaterThan(0);
      expect(result.complexity.length).toBeGreaterThan(0);
    }
  });

  it("never mutates a caller-supplied base array, since every algorithm races its own private copy of it", () => {
    const base = [5, 3, 9, 1, 4, 1, 5, 9, 2, 6];
    const snapshot = [...base];
    runRace(base.length, base);
    expect(base).toEqual(snapshot);
  });

  it("handles a tiny size without throwing", () => {
    const results = runRace(1);
    expect(results).toHaveLength(4);
  });
});
