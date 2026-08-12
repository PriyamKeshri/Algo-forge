import { MainThreadPluginRunner, type PluginRunner } from "@algoviz/algorithms";
import { WorkerRunner } from "../workers/worker-runner";

// One runner instance for the app's lifetime — module-level so it survives
// AlgorithmPage mounting/unmounting as the user navigates between
// algorithms (each visit doesn't spin up a fresh Worker). WorkerRunner keeps
// algorithm execution off the main thread (a dedicated Web Worker, see
// ../workers/algorithm.worker.ts) in every real browser; MainThreadPluginRunner
// is the in-process fallback for anywhere `Worker` isn't available.
export const runner: PluginRunner = typeof Worker !== "undefined" ? new WorkerRunner() : new MainThreadPluginRunner();
