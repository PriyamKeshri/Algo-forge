import { useEffect, useState } from "react";
import type { AlgorithmMetadata, DataStructureSnapshot, RunStats, VisualizationEvent } from "@algoviz/core";
import { describeEvent, describeStructure } from "../tutor/describe";
import { askTutor, type TutorContext } from "../tutor/tutor-client";
import { useTimelineStore } from "../timeline/timeline-store";

export interface AITutorPanelProps {
  metadata: AlgorithmMetadata | null;
  activeEvent: VisualizationEvent | null;
  structure: DataStructureSnapshot | null;
  stats: RunStats;
}

interface ConversationEntry {
  id: number;
  question: string;
  answer: string;
}

/** One always-relevant question per category — a generalized stand-in for "why did it swap these?" / "why isn't BFS appropriate here?" that stays true regardless of which specific algorithm in that category is loaded. */
const CATEGORY_QUESTION: Partial<Record<AlgorithmMetadata["category"], string>> = {
  sorting: "Why did the algorithm swap (or not swap) these elements?",
  searching: "Why did the algorithm rule out this part of the array?",
  graph: "Why did the algorithm visit this node next?",
  tree: "Why did the algorithm go left or right here?",
  stack: "Why did the algorithm use this end of the stack?",
  queue: "Why did the algorithm use this end of the queue?",
  "linked-list": "Why did the algorithm walk to this node?",
};

const GENERAL_QUESTIONS = [
  "What is the invariant here?",
  "Explain this algorithm like I'm a beginner.",
  "What happens if I change this input?",
];

function suggestedQuestions(category: AlgorithmMetadata["category"]): string[] {
  const specific = CATEGORY_QUESTION[category];
  return specific ? [specific, ...GENERAL_QUESTIONS] : GENERAL_QUESTIONS;
}

let nextEntryId = 0;

/**
 * The "🤖 Algorithm Tutor" panel — free-text Q&A plus a few one-click
 * suggestions, all grounded in the *current* step (see describeEvent/
 * describeStructure) rather than the algorithm in the abstract. Answers come
 * from apps/server's /api/tutor endpoint (Gemini), never called directly
 * from here — see tutor-client.ts's doc comment for why.
 */
export function AITutorPanel({ metadata, activeEvent, structure, stats }: AITutorPanelProps) {
  const currentStep = useTimelineStore((s) => s.currentStep);
  const totalSteps = useTimelineStore((s) => s.events.length);

  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A new algorithm is a new conversation — leftover Q&A about the previous
  // one would just be confusing context clutter here.
  useEffect(() => {
    setConversation([]);
    setError(null);
  }, [metadata?.id]);

  async function ask(question: string) {
    if (!metadata || loading) return;
    const trimmed = question.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setDraft("");

    const context: TutorContext = {
      algorithmName: metadata.name,
      category: metadata.category,
      description: metadata.description,
      pseudocode: metadata.pseudocode.map((l) => `${l.line}. ${"  ".repeat(l.indent ?? 0)}${l.text}`).join("\n"),
      activeLine: activeEvent?.line,
      activeEventSummary: describeEvent(activeEvent),
      structureSummary: structure ? describeStructure(structure) : undefined,
      stepInfo: totalSteps > 0 ? `step ${currentStep + 1} of ${totalSteps}` : undefined,
      stats: `comparisons=${stats.comparisons}, swaps=${stats.swaps}, reads=${stats.reads}, writes=${stats.writes}`,
    };

    try {
      const answer = await askTutor(trimmed, context);
      setConversation((prev) => [{ id: nextEntryId++, question: trimmed, answer }, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong asking the tutor.");
    } finally {
      setLoading(false);
    }
  }

  if (!metadata) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-slate-500">
        Pick an algorithm to ask the AI tutor about it.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <h3 className="text-sm font-medium text-white">🤖 Algorithm Tutor</h3>

      <div className="flex max-h-64 flex-col gap-3 overflow-y-auto">
        {conversation.length === 0 && !loading && !error && (
          <p className="text-sm text-slate-500">Ask a question about the current step, or try a suggestion below.</p>
        )}
        {loading && <p className="text-sm italic text-slate-500">Thinking…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {conversation.map((entry) => (
          <div key={entry.id}>
            <p className="text-sm font-medium text-accent-2">{entry.question}</p>
            <p className="mt-1 text-sm text-slate-300">{entry.answer}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void ask("Explain this step, and why it just happened.")}
          disabled={loading}
          className="rounded-full border border-accent/40 px-3 py-1 text-xs text-accent-2 hover:bg-accent/10 disabled:opacity-50"
        >
          🔍 Explain this step
        </button>
        {suggestedQuestions(metadata.category).map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => void ask(q)}
            disabled={loading}
            className="rounded-full border border-border px-3 py-1 text-xs text-slate-300 hover:bg-surface-alt disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(draft);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask another question..."
          disabled={loading}
          className="flex-1 rounded border border-border bg-surface-alt px-2 py-1.5 text-sm text-white placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={loading || draft.trim() === ""}
          className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
