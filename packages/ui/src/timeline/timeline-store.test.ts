import { beforeEach, describe, expect, it } from "vitest";
import { algorithmId, type AlgorithmMetadata, type ArraySnapshot, type VisualizationEvent } from "@algoviz/core";
import { DEFAULT_SPEED, MAX_SPEED, MIN_SPEED, useTimelineStore } from "./timeline-store";

const metadata: AlgorithmMetadata = {
  id: algorithmId("fake-sort"),
  name: "Fake Sort",
  category: "sorting",
  description: "test fixture",
  complexity: { best: "O(n)", average: "O(n)", worst: "O(n)", space: "O(1)" },
  pseudocode: [{ line: 1, text: "no-op" }],
  sourceCode: { language: "typescript", code: "function* run() {}" },
};

const initialStructure: ArraySnapshot = { kind: "array", values: [3, 1, 2] };

const events: VisualizationEvent[] = [
  { type: "compare", step: 0, indices: [0, 1], result: 1 },
  { type: "swap", step: 1, indices: [0, 1] },
  { type: "compare", step: 2, indices: [1, 2], result: -1 },
];

function resetStore() {
  useTimelineStore.setState({
    events: [],
    snapshots: [],
    initialStructure: null,
    metadata: null,
    currentStep: -1,
    isPlaying: false,
    speed: DEFAULT_SPEED,
  });
}

function loadFixtureRun() {
  useTimelineStore.getState().loadRun({ metadata, initialStructure, events });
}

describe("useTimelineStore", () => {
  beforeEach(resetStore);

  it("starts with an empty, paused state", () => {
    const s = useTimelineStore.getState();
    expect(s.events).toEqual([]);
    expect(s.currentStep).toBe(-1);
    expect(s.isPlaying).toBe(false);
    expect(s.speed).toBe(DEFAULT_SPEED);
  });

  it("loadRun populates events/snapshots/metadata and resets playback position", () => {
    useTimelineStore.getState().seek(1); // pre-existing position should be wiped by a fresh load
    loadFixtureRun();
    const s = useTimelineStore.getState();
    expect(s.metadata).toBe(metadata);
    expect(s.initialStructure).toEqual(initialStructure);
    expect(s.events).toEqual(events);
    expect(s.snapshots.length).toBeGreaterThan(0);
    expect(s.currentStep).toBe(-1);
    expect(s.isPlaying).toBe(false);
  });

  it("stepForward/stepBackward move one step at a time and pause playback", () => {
    loadFixtureRun();
    useTimelineStore.setState({ isPlaying: true });

    useTimelineStore.getState().stepForward();
    expect(useTimelineStore.getState().currentStep).toBe(0);
    expect(useTimelineStore.getState().isPlaying).toBe(false);

    useTimelineStore.getState().stepForward();
    expect(useTimelineStore.getState().currentStep).toBe(1);

    useTimelineStore.getState().stepBackward();
    expect(useTimelineStore.getState().currentStep).toBe(0);
  });

  it("stepForward clamps at the last event, stepBackward clamps at -1", () => {
    loadFixtureRun();
    for (let i = 0; i < 10; i++) useTimelineStore.getState().stepForward();
    expect(useTimelineStore.getState().currentStep).toBe(2); // last event's step

    for (let i = 0; i < 10; i++) useTimelineStore.getState().stepBackward();
    expect(useTimelineStore.getState().currentStep).toBe(-1);
  });

  it("seek clamps into [-1, lastStep] and pauses playback", () => {
    loadFixtureRun();
    useTimelineStore.setState({ isPlaying: true });

    useTimelineStore.getState().seek(1);
    expect(useTimelineStore.getState().currentStep).toBe(1);
    expect(useTimelineStore.getState().isPlaying).toBe(false);

    useTimelineStore.getState().seek(999);
    expect(useTimelineStore.getState().currentStep).toBe(2);

    useTimelineStore.getState().seek(-999);
    expect(useTimelineStore.getState().currentStep).toBe(-1);
  });

  it("play() sets isPlaying and restarts from -1 if already at the end", () => {
    loadFixtureRun();
    useTimelineStore.getState().seek(2); // last step
    useTimelineStore.getState().play();
    expect(useTimelineStore.getState().isPlaying).toBe(true);
    expect(useTimelineStore.getState().currentStep).toBe(-1);
  });

  it("play() does not reset position when not at the end", () => {
    loadFixtureRun();
    useTimelineStore.getState().seek(1);
    useTimelineStore.getState().play();
    expect(useTimelineStore.getState().isPlaying).toBe(true);
    expect(useTimelineStore.getState().currentStep).toBe(1);
  });

  it("pause() clears isPlaying without moving currentStep", () => {
    loadFixtureRun();
    useTimelineStore.getState().seek(1);
    useTimelineStore.getState().play();
    useTimelineStore.getState().pause();
    expect(useTimelineStore.getState().isPlaying).toBe(false);
    expect(useTimelineStore.getState().currentStep).toBe(1);
  });

  it("reset() returns to step -1 and pauses, without discarding the loaded run", () => {
    loadFixtureRun();
    useTimelineStore.getState().seek(2);
    useTimelineStore.getState().play();
    useTimelineStore.getState().reset();
    const s = useTimelineStore.getState();
    expect(s.currentStep).toBe(-1);
    expect(s.isPlaying).toBe(false);
    expect(s.events).toEqual(events);
  });

  it("clearRun() discards the loaded run entirely, unlike reset()", () => {
    loadFixtureRun();
    useTimelineStore.getState().seek(2);
    useTimelineStore.getState().play();
    useTimelineStore.getState().clearRun();
    const s = useTimelineStore.getState();
    expect(s.currentStep).toBe(-1);
    expect(s.isPlaying).toBe(false);
    expect(s.events).toEqual([]);
    expect(s.snapshots).toEqual([]);
    expect(s.initialStructure).toBeNull();
    expect(s.metadata).toBeNull();
  });

  it("clearRun() is safe to call when no run was ever loaded", () => {
    expect(() => useTimelineStore.getState().clearRun()).not.toThrow();
    expect(useTimelineStore.getState().events).toEqual([]);
  });

  it("setSpeed clamps into [MIN_SPEED, MAX_SPEED]", () => {
    useTimelineStore.getState().setSpeed(1000);
    expect(useTimelineStore.getState().speed).toBe(MAX_SPEED);
    useTimelineStore.getState().setSpeed(-5);
    expect(useTimelineStore.getState().speed).toBe(MIN_SPEED);
    useTimelineStore.getState().setSpeed(8);
    expect(useTimelineStore.getState().speed).toBe(8);
  });

  it("stepForward/seek on an empty (no run loaded) store stay at -1 without throwing", () => {
    expect(() => useTimelineStore.getState().stepForward()).not.toThrow();
    expect(useTimelineStore.getState().currentStep).toBe(-1);
    expect(() => useTimelineStore.getState().seek(5)).not.toThrow();
    expect(useTimelineStore.getState().currentStep).toBe(-1);
  });
});
