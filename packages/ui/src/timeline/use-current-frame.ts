import { useMemo } from "react";
import { reconstructFrame, type Frame } from "@algoviz/engine";
import { useTimelineStore } from "./timeline-store";

/**
 * The "what should be on screen right now" selector. Derived rather than
 * stored, so there's exactly one source of truth (events + snapshots +
 * currentStep) and no risk of a cached frame going stale after a seek.
 * `reconstructFrame`'s snapshot+binary-search design (packages/engine/src/timeline.ts)
 * is what keeps recomputing this on every relevant render cheap.
 */
export function useCurrentFrame(): Frame | null {
  const snapshots = useTimelineStore((s) => s.snapshots);
  const events = useTimelineStore((s) => s.events);
  const currentStep = useTimelineStore((s) => s.currentStep);
  const initialStructure = useTimelineStore((s) => s.initialStructure);

  return useMemo(() => {
    if (!initialStructure) return null;
    return reconstructFrame(snapshots, events, currentStep);
  }, [snapshots, events, currentStep, initialStructure]);
}
