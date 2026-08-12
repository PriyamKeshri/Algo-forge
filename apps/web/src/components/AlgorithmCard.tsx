import { Link } from "react-router-dom";
import type { AlgorithmMetadata } from "@algoviz/core";

export function AlgorithmCard({ metadata }: { metadata: AlgorithmMetadata }) {
  return (
    <Link
      to={`/algorithm/${metadata.id}`}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent hover:bg-surface-alt"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-white">{metadata.name}</h3>
        <span className="shrink-0 text-xs tabular-nums text-slate-500">{metadata.complexity.average}</span>
      </div>
      <p className="line-clamp-2 text-xs text-slate-400">{metadata.description}</p>
    </Link>
  );
}
