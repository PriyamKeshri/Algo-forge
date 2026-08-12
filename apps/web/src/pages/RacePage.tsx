import { useState } from "react";
import { Link } from "react-router-dom";
import { runRace, type RaceResult } from "../lib/run-race";
import { RaceBar } from "../components/RaceBar";

const MIN_SIZE = 100;
const MAX_SIZE = 8000;
const SIZE_STEP = 100;
const DEFAULT_SIZE = 3000;

type Phase = "idle" | "racing" | "done";

/**
 * Every sorting algorithm's *own page* (`/algorithm/:id`) already shows it
 * step by step against a small (≤100-element) array — that's the right
 * scale for watching individual compares/swaps, but it's the wrong scale
 * to actually feel an O(n²)-vs-O(n log n) gap, which only shows up once n
 * is big enough for real wall-clock time to diverge. Race Mode is the
 * complementary view: no step-by-step, much larger n (up to 8,000), every
 * algorithm sorts the exact same random array (see runRace), and the
 * result is real milliseconds — not a step-count stand-in for them.
 */
export function RacePage() {
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<RaceResult[] | null>(null);

  function startRace() {
    setPhase("racing");
    setResults(null);
    // setTimeout(0), not requestAnimationFrame: this only needs to run
    // *after* the "Racing…" state above gets painted, and rAF callbacks are
    // fully paused (not just throttled) on a backgrounded tab — a race
    // started right before a tab loses focus would hang on "Racing…"
    // forever. A macrotask still runs a render/paint opportunity first,
    // same as rAF would in the foreground case, but it isn't dependent on
    // the tab actually being visible to ever fire at all.
    setTimeout(() => {
      setResults(runRace(size));
      setPhase("done");
    }, 0);
  }

  const ranked = results ? [...results].sort((a, b) => a.ms - b.ms) : null;
  const maxMs = ranked ? Math.max(...ranked.map((r) => r.ms)) : 0;
  const winnerId = ranked?.[0]?.id;

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 p-6">
      <header className="flex flex-col gap-1">
        <Link to="/" className="text-sm text-accent-2 hover:underline">
          ← All algorithms
        </Link>
        <h1 className="text-2xl font-semibold text-white">🏁 Algorithm Race</h1>
        <p className="text-sm text-slate-400">
          Every sorting algorithm races the exact same random array — real wall-clock time, not a step count.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-surface p-4">
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Array size ({size.toLocaleString()})
          <input
            type="range"
            min={MIN_SIZE}
            max={MAX_SIZE}
            step={SIZE_STEP}
            value={size}
            disabled={phase === "racing"}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-64"
          />
        </label>
        <button
          type="button"
          onClick={startRace}
          disabled={phase === "racing"}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {phase === "racing" ? "Racing…" : phase === "done" ? "🔁 Race again" : "🏁 Start race"}
        </button>
      </div>

      <div className="flex min-h-[16rem] flex-col justify-center gap-4 rounded-lg border border-border bg-surface p-6">
        {phase === "idle" && (
          <p className="text-center text-sm text-slate-500">
            Press "Start race" to sort {size.toLocaleString()} random numbers with every algorithm at once.
          </p>
        )}
        {phase === "racing" && !ranked && <p className="text-center text-sm text-slate-500">Racing…</p>}
        {ranked && (
          <div className="flex flex-col gap-3">
            {ranked.map((result, index) => (
              <RaceBar
                key={result.id}
                rank={index + 1}
                name={result.name}
                complexity={result.complexity}
                ms={result.ms}
                maxMs={maxMs}
                isWinner={result.id === winnerId}
              />
            ))}
          </div>
        )}
      </div>

      {ranked && (
        <p className="text-xs text-slate-500">
          Bar length is each algorithm's time relative to the slowest this race ({ranked[ranked.length - 1]!.name}) — n ={" "}
          {size.toLocaleString()}, freshly randomized, identical for every algorithm.
        </p>
      )}
    </div>
  );
}
