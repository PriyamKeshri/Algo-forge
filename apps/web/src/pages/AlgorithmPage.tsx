import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { algorithmId, EMPTY_STATS, type AlgorithmInput, type QueueInput, type StackInput } from "@algoviz/core";
import { algorithmRegistry } from "@algoviz/algorithms";
import {
  AITutorPanel,
  ArraySearchRenderer,
  clearGraph,
  GraphEditor,
  PlaybackControls,
  PseudocodePanel,
  SourceCodePanel,
  StatsPanel,
  StructureView,
  useCurrentFrame,
  usePlaybackLoop,
  useTimelineStore,
} from "@algoviz/ui";
import { InputControls } from "../components/InputControls";
import { QueueOperationBuilder } from "../components/QueueOperationBuilder";
import { StackOperationBuilder } from "../components/StackOperationBuilder";
import { emptyStructureFor, generateInputFor, SIZE_LABELS } from "../lib/algorithm-input";
import { parseCustomInput, sizeOfInput } from "../lib/custom-input";
import { runner } from "../lib/runner";

/**
 * Route wrapper: looks up `:id` and just picks a `key` for the real detail
 * component below. Remounting AlgorithmDetail on every id change is what
 * resets its `size`/`input`/etc. state for free (via the `useState` lazy
 * initializers, same as switching algorithms via the old in-page dropdown
 * used to do by hand) — simpler than syncing that state with an effect,
 * and it's necessary anyway: navigating from one algorithm straight to
 * another (browser back/forward between two `/algorithm/:id` URLs) keeps
 * this same route matched, so React wouldn't otherwise remount anything.
 */
export function AlgorithmPage() {
  const { id } = useParams<{ id: string }>();
  return <AlgorithmDetail key={id} rawId={id} />;
}

function AlgorithmDetail({ rawId }: { rawId: string | undefined }) {
  // Drives timeline playback off the animation clock; renders nothing itself.
  usePlaybackLoop();

  const selectedPlugin = useMemo(() => (rawId ? algorithmRegistry.get(algorithmId(rawId)) : undefined), [rawId]);

  const [size, setSize] = useState(selectedPlugin?.inputConstraints.defaultSize ?? 30);
  const [input, setInput] = useState<AlgorithmInput>(() => generateInputFor(selectedPlugin?.inputConstraints, size));
  const [isStarting, setIsStarting] = useState(false);
  const [customInputError, setCustomInputError] = useState<string | null>(null);

  const loadRun = useTimelineStore((s) => s.loadRun);
  const clearRun = useTimelineStore((s) => s.clearRun);
  const play = useTimelineStore((s) => s.play);
  const frame = useCurrentFrame();

  // The timeline store is a module-level singleton, not component state —
  // it outlives this component's own mount/unmount, so a leftover run from
  // whatever algorithm was open before would otherwise still be showing
  // here. AlgorithmDetail remounts fresh per algorithm (see the `key` in
  // AlgorithmPage above), so "once per mount" is exactly "once per
  // algorithm" — no `[id]` dependency needed.
  useEffect(() => {
    clearRun();
  }, [clearRun]);

  // Keeps the Size slider/label honest after Queue/StackOperationBuilder
  // edit `input.operations` directly (see updateQueueInput/updateStackInput
  // below) — split out into its own effect rather than set alongside
  // `input` at the same call site specifically so it always reads the
  // latest *committed* operations length, never a value racing against a
  // same-batch update.
  useEffect(() => {
    if (input.kind === "queue" || input.kind === "circular-queue" || input.kind === "stack") {
      setSize(input.operations.length);
    }
  }, [input]);

  function randomize() {
    if (!selectedPlugin) return;
    setInput(generateInputFor(selectedPlugin.inputConstraints, size));
    setCustomInputError(null);
    clearRun();
  }

  /** Editing the target manually is only reachable when `input.kind === "array"` (InputControls only renders the field then), so the narrowing here always holds in practice. */
  function changeTarget(target: number) {
    if (input.kind !== "array") return;
    setInput({ ...input, target });
    clearRun();
  }

  /**
   * QueueOperationBuilder's onChange — every click (Enqueue/Dequeue/Peek/
   * isEmpty/isFull/remove) lands here immediately, same "no separate apply
   * step" treatment the rest of this page's controls already get. Takes a
   * functional updater (not a plain next-value) and forwards it straight
   * into `setInput`'s own functional form — see QueueOperationBuilderProps.onChange's
   * doc comment for why that's what makes rapid clicks compose correctly
   * instead of racing. `size` syncs separately, via the effect above.
   */
  function updateQueueInput(update: (prev: QueueInput) => QueueInput) {
    setInput((prev) => (prev.kind === "queue" || prev.kind === "circular-queue" ? update(prev) : prev));
    clearRun();
  }

  /** StackOperationBuilder's onChange — same shape/reasoning as updateQueueInput above, just for `kind: "stack"` (Stack Operations only — Postfix/Prefix Evaluation are `kind: "expression"`, not this). */
  function updateStackInput(update: (prev: StackInput) => StackInput) {
    setInput((prev) => (prev.kind === "stack" ? update(prev) : prev));
    clearRun();
  }

  /**
   * Replaces the current input with one the user typed/scripted themselves
   * instead of a generated one — parseCustomInput (apps/web/src/lib/custom-input.ts)
   * has the actual per-kind syntax/validation; this just wires its result
   * into state. `size` is updated to match so the Size slider/label stay
   * meaningful after a custom submission (e.g. typing a 12-number array
   * moves the slider to 12).
   */
  function applyCustomInput(raw: string) {
    if (!selectedPlugin) return;
    const result = parseCustomInput(raw, selectedPlugin.inputConstraints);
    if (!result.ok) {
      setCustomInputError(result.error);
      return;
    }
    setCustomInputError(null);
    setSize(sizeOfInput(result.input));
    setInput(result.input);
    clearRun();
  }

  // Passed to PlaybackControls as `onStart` — there's no separate Run
  // button. The page already shows everything below (controls, structure
  // preview, stats, pseudocode + source) the moment it loads; pressing Play
  // is what first computes the run, and then — since that's what pressing
  // Play means — immediately starts watching it instead of leaving
  // playback paused on frame 0 waiting for a second press.
  async function startRun() {
    if (!selectedPlugin) return;
    setIsStarting(true);
    try {
      // preparePluginRun (packages/algorithms/src/execute.ts) — which both
      // MainThreadPluginRunner and the algorithm.worker.ts worker call
      // under the hood — does the category/input-kind branching that used
      // to live here by hand, building whichever instrumented context
      // (array/graph/tree) the plugin needs.
      const result = await runner.run(selectedPlugin.metadata.id, input, { stepLimit: 200_000 });
      loadRun({
        metadata: selectedPlugin.metadata,
        // Same per-category shape preparePluginRun just built a live
        // context from — this is its plain-data (pre-run) equivalent.
        initialStructure: emptyStructureFor(selectedPlugin, input),
        events: result.events,
      });
      play();
    } finally {
      setIsStarting(false);
    }
  }

  const previewStructure = frame?.structure ?? emptyStructureFor(selectedPlugin, input);
  const previewActiveEvent = frame?.activeEvent ?? null;

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 p-6">
      <header className="flex flex-col gap-1">
        <Link to="/" className="text-sm text-accent-2 hover:underline">
          ← All algorithms
        </Link>
        {selectedPlugin ? (
          <>
            <h1 className="text-2xl font-semibold text-white">{selectedPlugin.metadata.name}</h1>
            <p className="text-sm text-slate-400">{selectedPlugin.metadata.description}</p>
          </>
        ) : (
          <h1 className="text-2xl font-semibold text-white">Algorithm not found</h1>
        )}
      </header>

      {!selectedPlugin ? (
        <p className="text-sm text-slate-500">
          No algorithm matches "{rawId}". <Link to="/" className="text-accent-2 hover:underline">Go back home.</Link>
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-surface p-4">
            <InputControls
              size={size}
              constraints={selectedPlugin.inputConstraints}
              label={SIZE_LABELS[selectedPlugin.inputConstraints.kind] ?? "Size"}
              onSizeChange={(next) => {
                setSize(next);
                setInput(generateInputFor(selectedPlugin.inputConstraints, next));
                clearRun();
              }}
              onRandomize={randomize}
              target={input.kind === "array" ? input.target : undefined}
              onTargetChange={changeTarget}
              onCustomInputSubmit={applyCustomInput}
              customInputError={customInputError}
            />
            {input.kind === "graph" && !frame && (
              <button
                type="button"
                onClick={() => setInput(clearGraph())}
                className="rounded border border-border px-3 py-1.5 text-sm text-slate-300 hover:bg-surface-alt"
              >
                ✕ Clear
              </button>
            )}
          </div>

          {/* Queue/Deque/Circular Queue Operations: a click-to-build
              alternative to InputControls' text-script field above — see
              QueueOperationBuilder's own doc comment for why a plain array's
              "type your own" doesn't fit an *operation sequence* the same way. */}
          {(input.kind === "queue" || input.kind === "circular-queue") && (
            <QueueOperationBuilder
              input={input}
              allowDeque={Boolean(selectedPlugin.inputConstraints.allowDeque)}
              onChange={updateQueueInput}
            />
          )}
          {/* Stack Operations only (not Postfix/Prefix Evaluation, which share
              the "stack" category but take `kind: "expression"` input instead). */}
          {input.kind === "stack" && <StackOperationBuilder input={input} onChange={updateStackInput} />}

          <PlaybackControls onStart={startRun} isStarting={isStarting} />

          {/* Before a run, a graph algorithm gets the interactive editor
              instead of the read-only StructureView — editing only makes
              sense while there's no run to conflict with. StructureView
              takes back over for playback the moment `frame` exists (right
              after pressing Play). Search algorithms get ArraySearchRenderer
              (number boxes + traversal) instead of StructureView's bar chart. */}
          {!frame && input.kind === "graph" ? (
            <GraphEditor input={input} onChange={setInput} weighted={selectedPlugin.inputConstraints.weighted} />
          ) : selectedPlugin.metadata.category === "searching" && previewStructure.kind === "array" ? (
            <ArraySearchRenderer structure={previewStructure} activeEvent={previewActiveEvent} />
          ) : (
            <StructureView structure={previewStructure} activeEvent={previewActiveEvent} />
          )}

          <StatsPanel stats={frame?.stats ?? EMPTY_STATS} />
          {/* Synchronized source/pseudocode highlighting: both panels read
              the same activeEvent, each keying off its own line field (line
              for pseudocode, sourceLine for real source), so they always
              highlight in lockstep as the timeline scrubs. */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <PseudocodePanel metadata={selectedPlugin.metadata} activeEvent={previewActiveEvent} />
            <SourceCodePanel metadata={selectedPlugin.metadata} activeEvent={previewActiveEvent} />
            <AITutorPanel
              metadata={selectedPlugin.metadata}
              activeEvent={previewActiveEvent}
              structure={previewStructure}
              stats={frame?.stats ?? EMPTY_STATS}
            />
          </div>
        </>
      )}
    </div>
  );
}
