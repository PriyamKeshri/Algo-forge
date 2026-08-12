import { useMemo } from "react";
import type { AlgorithmMetadata } from "@algoviz/core";
import { algorithmRegistry } from "@algoviz/algorithms";
import { AlgorithmCard } from "../components/AlgorithmCard";

const CATEGORY_LABELS: Record<AlgorithmMetadata["category"], string> = {
  sorting: "Sorting",
  searching: "Searching",
  stack: "Stack",
  queue: "Queue",
  "linked-list": "Linked List",
  tree: "Tree",
  graph: "Graph",
  "dynamic-programming": "Dynamic Programming",
};

/** Section display order — roughly the curriculum's own progression (arrays, then linear structures, then trees/graphs), not just registration order. */
const CATEGORY_ORDER: AlgorithmMetadata["category"][] = [
  "sorting",
  "searching",
  "stack",
  "queue",
  "linked-list",
  "tree",
  "graph",
  "dynamic-programming",
];

function groupByCategory(options: AlgorithmMetadata[]): Map<AlgorithmMetadata["category"], AlgorithmMetadata[]> {
  const groups = new Map<AlgorithmMetadata["category"], AlgorithmMetadata[]>();
  for (const option of options) {
    const list = groups.get(option.category);
    if (list) list.push(option);
    else groups.set(option.category, [option]);
  }
  return groups;
}

/**
 * The landing page — one section per category (Sorting, Searching, Stack,
 * ...), each a grid of clickable cards. Replaces the old single dropdown
 * picker; every card is a real route (`/algorithm/:id`, see AlgorithmPage)
 * rather than in-page state, so a specific algorithm is linkable/bookmarkable
 * and the browser's back button does something sensible.
 */
export function HomePage() {
  // Importing @algoviz/algorithms triggers each family's side-effect
  // registration (see packages/algorithms/src/sorting/index.ts and its
  // siblings), so the registry is already populated by the time this
  // component first renders.
  const allAlgorithms = useMemo(() => algorithmRegistry.list(), []);
  const grouped = useMemo(() => groupByCategory(allAlgorithms), [allAlgorithms]);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">⚒️ AlgoForge — Algorithm Laboratory</h1>
        <p className="text-sm text-slate-400">Pick an algorithm to explore it, one step at a time</p>
      </header>

      {CATEGORY_ORDER.filter((category) => (grouped.get(category)?.length ?? 0) > 0).map((category) => (
        <section key={category} className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-white">{CATEGORY_LABELS[category]}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {grouped.get(category)!.map((metadata) => (
              <AlgorithmCard key={metadata.id} metadata={metadata} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
