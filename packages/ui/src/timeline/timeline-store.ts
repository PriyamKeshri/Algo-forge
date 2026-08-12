import { create } from "zustand";
import type { AlgorithmMetadata, DataStructureSnapshot, VisualizationEvent } from "@algoviz/core";
import { buildSnapshots, type TimelineSnapshot } from "@algoviz/engine";

export interface LoadRunInput {
  metadata: AlgorithmMetadata;
  initialStructure: DataStructureSnapshot;
  events: VisualizationEvent[];
  /** Forwarded to buildSnapshots; omit to use its default (~200 keyframes). */
  snapshotTargetCount?: number;
}

export interface TimelineState {
  events: VisualizationEvent[];
  snapshots: TimelineSnapshot[];
  initialStructure: DataStructureSnapshot | null;
  metadata: AlgorithmMetadata | null;
  /** -1 = before the first event (the initial structure, untouched). */
  currentStep: number;
  isPlaying: boolean;
  /** Steps per second during playback. */
  speed: number;

  loadRun(run: LoadRunInput): void;
  play(): void;
  pause(): void;
  stepForward(): void;
  stepBackward(): void;
  seek(step: number): void;
  setSpeed(speed: number): void;
  reset(): void;
  clearRun(): void;
}

export const DEFAULT_SPEED = 4;
export const MIN_SPEED = 0.25;
export const MAX_SPEED = 32;

function lastStepOf(events: VisualizationEvent[]): number {
  return events.length > 0 ? events[events.length - 1]!.step : -1;
}

function clampStep(step: number, events: VisualizationEvent[]): number {
  return Math.min(Math.max(step, -1), lastStepOf(events));
}

function clampSpeed(speed: number): number {
  return Math.min(Math.max(speed, MIN_SPEED), MAX_SPEED);
}

/**
 * Pure state container — no requestAnimationFrame, no timers. Every action
 * is a synchronous `set()` call, which is what makes this trivially
 * unit-testable and keeps "what should the state be after N actions"
 * decoupled from "how fast does playback actually advance" (that's
 * use-playback-loop.ts's job). Manual navigation (stepForward/stepBackward/
 * seek) always pauses playback first, matching standard video-scrubber UX.
 */
export const useTimelineStore = create<TimelineState>((set, get) => ({
  events: [],
  snapshots: [],
  initialStructure: null,
  metadata: null,
  currentStep: -1,
  isPlaying: false,
  speed: DEFAULT_SPEED,

  loadRun({ metadata, initialStructure, events, snapshotTargetCount }) {
    set({
      metadata,
      initialStructure,
      events,
      snapshots: buildSnapshots(initialStructure, events, snapshotTargetCount),
      currentStep: -1,
      isPlaying: false,
    });
  },

  play() {
    const { events, currentStep } = get();
    // Replay from the start if play() is hit while already at (or past) the end.
    const atEnd = currentStep >= lastStepOf(events);
    set({ isPlaying: true, currentStep: atEnd ? -1 : currentStep });
  },

  pause() {
    set({ isPlaying: false });
  },

  stepForward() {
    const { events, currentStep } = get();
    set({ currentStep: clampStep(currentStep + 1, events), isPlaying: false });
  },

  stepBackward() {
    const { events, currentStep } = get();
    set({ currentStep: clampStep(currentStep - 1, events), isPlaying: false });
  },

  seek(step) {
    const { events } = get();
    set({ currentStep: clampStep(step, events), isPlaying: false });
  },

  setSpeed(speed) {
    set({ speed: clampSpeed(speed) });
  },

  reset() {
    set({ currentStep: -1, isPlaying: false });
  },

  /**
   * Distinct from `reset()`: that rewinds playback *within* the currently
   * loaded run (keeping events/metadata so the timeline still has
   * something to scrub), while this discards the run entirely, returning
   * to the same empty state as before any `loadRun()` ever happened.
   *
   * Callers (apps/web) use this whenever the *input* changes outside of an
   * actual run — switching algorithms, randomizing, resizing, or editing a
   * graph — so the app falls back to showing a live preview of the new
   * input instead of a frozen previous run. Without it, `useCurrentFrame()`
   * keeps returning non-null (since `initialStructure` stays set) even
   * after the input backing that frame is long gone, silently showing
   * stale data until the next Run.
   */
  clearRun() {
    set({
      events: [],
      snapshots: [],
      initialStructure: null,
      metadata: null,
      currentStep: -1,
      isPlaying: false,
    });
  },
}));
