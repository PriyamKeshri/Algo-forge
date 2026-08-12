import type { RunStats } from "@algoviz/core";

export function StatsPanel({ stats }: { stats: RunStats }) {
  const items: Array<{ label: string; value: number }> = [
    { label: "Comparisons", value: stats.comparisons },
    { label: "Swaps", value: stats.swaps },
    { label: "Reads", value: stats.reads },
    { label: "Writes", value: stats.writes },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-slate-500">{item.label}</span>
          <span className="text-xl font-semibold tabular-nums text-white">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
