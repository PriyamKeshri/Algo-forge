/// <reference lib="webworker" />
// The above (rather than a project-wide `"webworker"` tsconfig lib) scopes
// WebWorker globals (`self`, `onmessage`, `postMessage`) to just this file —
// apps/web's tsconfig also has `"DOM"` in `lib` for the rest of the app,
// and TypeScript doesn't allow "dom" and "webworker" to coexist in one
// project-wide `lib` (both declare a differently-typed global `self`).

// Importing this triggers every algorithm family's side-effect
// registration into the shared registry (see
// packages/algorithms/src/sorting/index.ts and its graph/tree
// counterparts) — same as apps/web/src/App.tsx relies on today, just
// inside the worker instead of the main thread.
import { createWorkerMessageHandler } from "@algoviz/algorithms";
import type { WorkerRequestMessage } from "@algoviz/engine";

const handler = createWorkerMessageHandler((message) => self.postMessage(message));

self.onmessage = (event: MessageEvent<WorkerRequestMessage>) => {
  void handler.handleMessage(event.data);
};
