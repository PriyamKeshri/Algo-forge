import type { AlgorithmId, AlgorithmInput } from "@algoviz/core";
import type { RunOptions, RunResult } from "./driver";

/**
 * Message shapes for the Web-Worker-backed execution path ("Web Workers —
 * move execution off the main thread"). Constructed and consumed by
 * `@algoviz/algorithms`' `createWorkerMessageHandler` (worker-handler.ts,
 * the worker-side handler) and `apps/web/src/workers/worker-runner.ts`'s
 * `WorkerRunner` (the main-thread side) — a `postMessage` implementation of
 * the same "run a plugin by id against an input" contract
 * `MainThreadPluginRunner` implements in-process (see `PluginRunner` in
 * `@algoviz/algorithms`' execute.ts).
 *
 * `AbortSignal` itself isn't structured-cloneable, so abort is modeled as
 * its own request message rather than part of `RunRequestMessage.options`.
 */

export interface RunRequestMessage {
  type: "run";
  requestId: string;
  pluginId: AlgorithmId;
  input: AlgorithmInput;
  options?: Pick<RunOptions, "stepLimit">;
}

export interface AbortRequestMessage {
  type: "abort";
  requestId: string;
}

export type WorkerRequestMessage = RunRequestMessage | AbortRequestMessage;

export interface ProgressResponseMessage {
  type: "progress";
  requestId: string;
  eventsSoFar: number;
}

export interface DoneResponseMessage {
  type: "done";
  requestId: string;
  result: RunResult;
}

export interface ErrorResponseMessage {
  type: "error";
  requestId: string;
  message: string;
}

export interface AbortedResponseMessage {
  type: "aborted";
  requestId: string;
  /** Whatever was collected before the abort took effect — `completed: false`, same as `MainThreadRunner`'s abort behavior; abort never discards partial progress. */
  result: RunResult;
}

export type WorkerResponseMessage =
  | ProgressResponseMessage
  | DoneResponseMessage
  | ErrorResponseMessage
  | AbortedResponseMessage;
