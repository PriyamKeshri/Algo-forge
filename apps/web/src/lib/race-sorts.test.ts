import { describe, expect, it } from "vitest";
import { RACE_ALGORITHMS } from "./race-sorts";

function randomValues(n: number): number[] {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 1000));
}

describe("race-sorts", () => {
  it("registers exactly the four sorting plugins, each with a name/complexity pulled from the registry", () => {
    expect(RACE_ALGORITHMS.map((a) => a.id)).toEqual(["bubble-sort", "insertion-sort", "merge-sort", "quick-sort"]);
    for (const algo of RACE_ALGORITHMS) {
      expect(algo.name.length).toBeGreaterThan(0);
      expect(algo.complexity.length).toBeGreaterThan(0);
    }
  });

  for (const algo of RACE_ALGORITHMS) {
    describe(algo.id, () => {
      it("sorts a random array in place, matching Array.prototype.sort", () => {
        const values = randomValues(500);
        const expected = [...values].sort((a, b) => a - b);
        algo.sort(values);
        expect(values).toEqual(expected);
      });

      it("handles already-sorted, reverse-sorted, and constant-value input", () => {
        const sorted = Array.from({ length: 50 }, (_, i) => i);
        const reversed = [...sorted].reverse();
        const constant = Array.from({ length: 50 }, () => 7);

        algo.sort(sorted);
        expect(sorted).toEqual(Array.from({ length: 50 }, (_, i) => i));

        algo.sort(reversed);
        expect(reversed).toEqual(Array.from({ length: 50 }, (_, i) => i));

        algo.sort(constant);
        expect(constant).toEqual(Array.from({ length: 50 }, () => 7));
      });

      it("handles empty and single-element arrays without throwing", () => {
        const empty: number[] = [];
        algo.sort(empty);
        expect(empty).toEqual([]);

        const single = [42];
        algo.sort(single);
        expect(single).toEqual([42]);
      });
    });
  }
});
