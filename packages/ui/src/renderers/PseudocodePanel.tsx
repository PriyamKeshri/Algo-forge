import type { AlgorithmMetadata, VisualizationEvent } from "@algoviz/core";

export interface PseudocodePanelProps {
  metadata: AlgorithmMetadata | null;
  activeEvent: VisualizationEvent | null;
}

export function PseudocodePanel({ metadata, activeEvent }: PseudocodePanelProps) {
  if (!metadata) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-slate-500">
        Pick an algorithm to see its pseudocode.
      </div>
    );
  }

  const activeLine = activeEvent?.line;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-2 text-sm font-medium text-white">{metadata.name}</h3>
      <pre className="overflow-x-auto font-mono text-xs leading-6 text-slate-300">
        {metadata.pseudocode.map((line) => (
          <div
            key={line.line}
            className={`rounded px-2 ${line.line === activeLine ? "bg-accent/20 text-accent-2" : ""}`}
            style={{ paddingLeft: `${(line.indent ?? 0) * 1}rem` }}
          >
            {line.text}
          </div>
        ))}
      </pre>
    </div>
  );
}
