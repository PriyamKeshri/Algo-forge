import { useEffect, useRef } from "react";
import { useTimelineStore } from "./timeline-store";

/**
 * Advances the timeline store's `currentStep` while `isPlaying` is true,
 * paced by `speed` (steps per second), via `requestAnimationFrame`. Lives
 * outside the store on purpose: `timeline-store.ts` stays a plain,
 * synchronously-testable state container with no timers, and this hook is
 * the only thing that touches the animation clock.
 *
 * The tick callback reads/writes the store via `getState()`/`setState()`
 * directly instead of through reactive selectors, so `currentStep` and
 * `events` don't need to be effect dependencies — putting them there would
 * tear down and rebuild the rAF loop on every single step, which defeats
 * smooth pacing. Only `isPlaying`/`speed` (which change rarely, not once
 * per frame) drive the effect.
 *
 * Call this once, near the root of whatever tree renders the playback
 * controls/visualization (e.g. once in `apps/web`'s `App`) — it has no
 * visual output of its own.
 */
export function usePlaybackLoop(): void {
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const speed = useTimelineStore((s) => s.speed);

  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const carryRef = useRef(0);

  useEffect(() => {
    if (!isPlaying) {
      lastTickRef.current = null;
      carryRef.current = 0;
      return;
    }

    const tick = (now: number) => {
      const store = useTimelineStore.getState();
      if (!store.isPlaying) return;

      if (lastTickRef.current === null) {
        lastTickRef.current = now;
      }
      const elapsedSeconds = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      carryRef.current += elapsedSeconds * speed;

      const stepsToAdvance = Math.floor(carryRef.current);
      if (stepsToAdvance > 0) {
        carryRef.current -= stepsToAdvance;
        const lastStep = store.events.length > 0 ? store.events[store.events.length - 1]!.step : -1;
        const nextStep = Math.min(store.currentStep + stepsToAdvance, lastStep);

        if (nextStep >= lastStep) {
          useTimelineStore.setState({ currentStep: lastStep, isPlaying: false });
          return; // Reached the end — stop scheduling further frames.
        }
        useTimelineStore.setState({ currentStep: nextStep });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isPlaying, speed]);
}
