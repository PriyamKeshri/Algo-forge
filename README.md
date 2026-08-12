# ⚒️ AlgoForge — Algorithm Laboratory

An interactive algorithm visualizer with time-travel playback, synchronized pseudocode highlighting, and a plugin-based algorithm architecture.

> Package names (`@algoviz/*`) and the repo directory (`Algorithm-Visualizer`) are unchanged from before the rename — only the user-facing title (browser tab, in-app heading, this README) changed.

Currently implemented: **sorting** (Bubble, Insertion, Merge, Quick), **searching** (Linear, Binary), **graph traversal** (BFS, DFS), **binary search trees** (BST Insert, Inorder Traversal), **stacks** (Stack Operations, Postfix/Prefix Evaluation), and **queues** (Queue Operations, Deque Operations, Circular Queue Operations) end to end — pick an algorithm, generate or hand-build an input (a random/edited graph, a sequence to sort/search or build a tree from, a scripted operation sequence, or a generated expression), run it, then scrub/step/play through every event with live stats and synchronized pseudocode + real-source highlighting shown side by side. Graph algorithms also get an **interactive editor** — click to add nodes, drag to connect, click to set the start node — instead of only randomized input. Search algorithms get an editable **target value** to look for, alongside the usual size/randomize controls. DP and the rest of the feature set below (see "Algorithm & data-structure library backlog") are planned but not built yet.

## Stack

- **pnpm workspace monorepo** — `apps/web` (the app) + 4 packages (`core`, `engine`, `algorithms`, `ui`), source-only (no build step; Vite/Vitest/tsc all read `.ts`/`.tsx` directly).
- **TypeScript** (strict, `noUncheckedIndexedAccess`) throughout.
- **React 18 + Vite 6 + Tailwind CSS v4** for the app.
- **Zustand** for timeline/playback state.
- **Vitest** for tests.

```
apps/web/                 Vite + React app — algorithm picker, input controls, layout;
                            workers/ (WorkerRunner + the algorithm.worker.ts entry point
                            that runs a plugin off the main thread)
packages/core/             Domain types: algorithm metadata, data-structure snapshots,
                            the VisualizationEvent union, stats helpers
packages/engine/            InstrumentedArray + InstrumentedGraph + InstrumentedTree +
                            InstrumentedStack + InstrumentedQueue + InstrumentedCircularQueue,
                            ExecutionEngine/MainThreadRunner (generator drivers), timeline
                            snapshotting + reconstruction (replays array/graph/tree/stack/
                            queue mutations alike), worker-protocol (the postMessage
                            message shapes WorkerRunner and the worker handler share)
packages/algorithms/        AlgorithmRegistry + plugin interface, input generators,
                            sorting/ (bubble, insertion, merge, quick), searching/
                            (linear, binary), graph/ (bfs, dfs), tree/ (bst-insert,
                            inorder-traversal), stack/ (stack-operations, postfix/prefix
                            evaluation), queue/ (queue-operations, deque-operations,
                            circular-queue-operations); execute.ts (PluginRunner contract,
                            preparePluginRun's category/input-kind branching,
                            MainThreadPluginRunner) and worker-handler.ts (the worker-side
                            counterpart WorkerRunner talks to)
packages/ui/                Timeline Zustand store + playback loop, array/graph/tree/
                            stack/queue/circular-queue structure renderers, playback
                            controls, stats panel, pseudocode + source-code panels,
                            editors/ (interactive GraphEditor + its pure
                            graph-editor-logic functions)
```

## Commands

Run from the repo root:

```bash
pnpm install       # first time, or after pulling new dependencies
pnpm dev           # apps/web dev server (Vite)
pnpm test          # Vitest, whole workspace
pnpm typecheck     # tsc --noEmit, every package
pnpm lint          # eslint, whole workspace
pnpm build         # typecheck + apps/web production build
```

Target a single package: `cd packages/engine && ./node_modules/.bin/tsc --noEmit -p tsconfig.json`, etc. Prefer direct binary invocation (or `pnpm -r run typecheck` for everything) over `pnpm --filter <pkg> exec <cmd>` — the latter has intermittently triggered a pathological out-of-memory crash in this environment (unrelated to the command being run; direct invocation of the same command is reliable).

**Tailwind + pnpm workspaces gotcha:** Tailwind v4's automatic class-source detection skips anything resolved through `node_modules` — which includes pnpm's symlinked workspace packages. Any first-party package whose `.tsx` files use Tailwind classes (currently just `packages/ui`) must be listed explicitly via `@source` in [apps/web/src/styles/globals.css](apps/web/src/styles/globals.css), or its classes silently disappear from the built stylesheet. Add a new `@source` line there if a future package outside `packages/ui` also ships Tailwind-classed components.

## Authoring an algorithm plugin

Every algorithm — sorting, searching, graph traversal, tree, stack, and queue algorithms today, DP and the rest of the [backlog](#algorithm--data-structure-library-backlog) later — follows the same contract. Look at [packages/algorithms/src/sorting/bubble-sort.ts](packages/algorithms/src/sorting/bubble-sort.ts) for the simplest complete (array) example, [packages/algorithms/src/searching/binary-search.ts](packages/algorithms/src/searching/binary-search.ts) for one keyed off an external `target` rather than another array index, [packages/algorithms/src/graph/bfs.ts](packages/algorithms/src/graph/bfs.ts) for a graph one, [packages/algorithms/src/tree/bst-insert.ts](packages/algorithms/src/tree/bst-insert.ts) for a tree one (notable for building its structure from nothing, rather than operating on a pre-existing one), [packages/algorithms/src/stack/postfix-evaluation.ts](packages/algorithms/src/stack/postfix-evaluation.ts) for a stack one (also builds from nothing, and shows the "capture the method's own return value, then yield it" idiom below in its clearest form), or [packages/algorithms/src/queue/deque-operations.ts](packages/algorithms/src/queue/deque-operations.ts) for one where a single instrumented context (`InstrumentedQueue`) serves two different plugins (Queue Operations and Deque Operations) that just exercise different parts of its API.

1. **Write pseudocode first**, as `AlgorithmMetadata.pseudocode: PseudocodeLine[]` (1-indexed `line` numbers, optional `indent`).
2. **Write the real source snippet** as a `SOURCE_CODE` template-literal constant, mirroring the `run` function (and any helpers) you're about to write line-for-line — this is what renders in the Source panel. Set it on `AlgorithmMetadata.sourceCode: { language: "typescript", code: SOURCE_CODE }`. Don't share this logic across plugins via cross-file `yield*` delegation even if two algorithms overlap (e.g. BST Insert and Inorder Traversal both build a tree) — each plugin keeps its own self-contained copy so its `sourceLine` tags always point at *its own* snippet (see the comment atop [inorder-traversal.ts](packages/algorithms/src/tree/inorder-traversal.ts) for why a shared version breaks this).
3. **Implement `run(input, ctx)` as a generator** (`function*`) that yields `VisualizationEvent`s, built by calling methods on the instrumented context (`InstrumentedArray` for array algorithms, `InstrumentedGraph` for graph algorithms, `InstrumentedTree` for tree algorithms, `InstrumentedStack` for stack algorithms, `InstrumentedQueue`/`InstrumentedCircularQueue` for queue algorithms — see [packages/engine/src/instrument.ts](packages/engine/src/instrument.ts) / [instrument-graph.ts](packages/engine/src/instrument-graph.ts) / [instrument-tree.ts](packages/engine/src/instrument-tree.ts) / [instrument-stack.ts](packages/engine/src/instrument-stack.ts) / [instrument-queue.ts](packages/engine/src/instrument-queue.ts) / [instrument-circular-queue.ts](packages/engine/src/instrument-circular-queue.ts)):
   ```ts
   yield arr.compare(j, j + 1, { line: 3, sourceLine: 8 });   // publishes a fully-formed CompareEvent
   if (arr.get(j) > arr.get(j + 1)) {                          // arr.get() is silent — control flow only
     yield arr.swap(j, j + 1, { line: 4, sourceLine: 10 });
   }
   ```
   **`yield` only ever publishes an event outward — it never receives a value back.** Every instrumented method (`compare`, `compareTarget`, `swap`, `set`, `read`, `highlight`, `markDone`) is synchronous and returns the complete event immediately, so it's fine (and the established idiom — see [binary-search.ts](packages/algorithms/src/searching/binary-search.ts)) to capture that return value in a local (`const cmp = arr.compareTarget(...)`) and branch on it for control flow, then separately `yield cmp` to publish it; what you must never do is write `const x = yield arr.compare(...)` expecting the `yield` expression itself to hand back a value — a plugin's generator is typed `Generator<VisualizationEvent, void, void>`, so that `yield` always evaluates to `undefined`, a classic generator footgun this contract is designed to avoid. `.get()` is the only silent, non-event-emitting read, for control flow that shouldn't itself be visualized at all.
   - Tag every yielded event with **both** line references: `line` (which `pseudocode` entry it corresponds to) and `sourceLine` (which line of `SOURCE_CODE`, 1-indexed, it corresponds to) — together these drive the pseudocode and source panels' synchronized line highlighting. The two numbering schemes are independent and often diverge in resolution: e.g. merge sort's left-buffer and right-buffer reads share one pseudocode line but get two distinct `sourceLine`s (see [merge-sort.ts](packages/algorithms/src/sorting/merge-sort.ts)).
   - For recursive/divide-and-conquer algorithms, delegate with `yield*` (see [merge-sort.ts](packages/algorithms/src/sorting/merge-sort.ts)) so nested generators' events flow through to the driver in order.
4. **Register the plugin** by adding it to the relevant family's `index.ts` (e.g. [sorting/index.ts](packages/algorithms/src/sorting/index.ts)), which calls `algorithmRegistry.registerReplacing(...)` as a side effect of being imported — use `registerReplacing`, not `register`, for this module-level side effect (it needs to tolerate dev-mode HMR re-executing it; `register` still throws on a genuine id collision anywhere else).
5. **Test it** by driving it through `ExecutionEngine` (see [sorting.test.ts](packages/algorithms/src/sorting/sorting.test.ts) / [graph.test.ts](packages/algorithms/src/graph/graph.test.ts) / [tree.test.ts](packages/algorithms/src/tree/tree.test.ts)) across edge cases — for arrays: empty, single-element, already-sorted, reverse-sorted, duplicates, random; for graphs: single node, cycles, disconnected components, missing/unknown start node; for trees: single value, degenerate (already-sorted/reverse-sorted) input, duplicates — asserting on final correctness, well-formed monotonically-increasing event `step`s, stats/visited-state consistent with the event stream, and (the drift detector) that every `sourceLine` lands on a line of `SOURCE_CODE` that actually contains an instrumented-context call — catches `SOURCE_CODE` and `run` silently drifting out of sync after a future edit.

A future algorithm family that isn't array-, graph-, tree-, stack-, or queue-based needs its own instrumented context with the same "synchronous method returns the event, `yield` only publishes" shape, plus a new `DataStructureSnapshot` kind (`packages/core/src/structures.ts`) and a new `structure.kind` branch in `packages/engine/src/timeline.ts`'s `applyEvent` — Linked Lists (next up in the [backlog](#algorithm--data-structure-library-backlog)) are exactly this; Queues (`InstrumentedQueue`/`InstrumentedCircularQueue`, `QueueSnapshot`/`CircularQueueSnapshot`, the two `applyEvent` queue branches) are a recent, still-fresh example of the whole pattern to copy — including the "one category, two different snapshot kinds" wrinkle (a plain queue and a deque share `QueueSnapshot`; the circular queue needed its own `CircularQueueSnapshot` to keep its fixed slots and wraparound pointers visible). `RotateEvent` (in `packages/core/src/events.ts`) is a stub declared but unused today — for a future self-balancing tree algorithm (AVL/red-black).

## Roadmap

**Done:** project foundation → domain types → plugin system → event model → execution engine → timeline/time-travel → visualization renderer → sorting algorithms → code synchronization (synchronized pseudocode + real-source line highlighting, shown side by side) → graph engine (`InstrumentedGraph`, BFS/DFS, SVG graph renderer with persistent visited/traversed state) → data structures (`InstrumentedTree`, BST Insert, Inorder Traversal, SVG tree renderer with a dynamic inorder-position layout since tree nodes have no pre-set position the way graph nodes do) → interactive graph editor (click-to-add nodes, drag-to-connect, click-to-set-start, drag-to-reposition, right-click-to-delete — see [GraphEditor.tsx](packages/ui/src/editors/GraphEditor.tsx)) → Web Workers (algorithm execution moved off the main thread — `WorkerRunner`/`algorithm.worker.ts` in `apps/web/src/workers`, backed by the `PluginRunner` contract and `preparePluginRun` in [packages/algorithms/src/execute.ts](packages/algorithms/src/execute.ts), with `MainThreadPluginRunner` as the in-process fallback) → searching (Linear Search, Binary Search — `InstrumentedArray.compareTarget`/`CompareValueEvent` alongside `compare`, an editable `target` on `ArrayInput` surfaced by `InputControls`, and `InputConstraints.sorted`/`needsTarget` so binary search gets pre-sorted input and both get a target to look for; see [packages/algorithms/src/searching/](packages/algorithms/src/searching/)) → Quick Sort (Lomuto partitioning, in-place, degrades to O(n²) on already/reverse-sorted input since the pivot is always the range's last element — see [quick-sort.ts](packages/algorithms/src/sorting/quick-sort.ts)) → Stacks (Stack Operations, Postfix Evaluation, Prefix Evaluation — the first genuinely new structure: `InstrumentedStack`/`StackSnapshot`/`StackRenderer`, plus `PushEvent`/`PopEvent`/`StackCheckEvent` in `packages/core/src/events.ts` — peeking the top deliberately reuses `ReadEvent` rather than getting its own type; see [packages/algorithms/src/stack/](packages/algorithms/src/stack/)) → Queues (Queue Operations, Deque Operations, Circular Queue Operations — `InstrumentedQueue` (optional `end: "front" | "rear"` on enqueue/dequeue/peek serves both the plain-queue and deque plugins from one context/event shape) plus `InstrumentedCircularQueue` (fixed-capacity, wraparound via modulo, its own `CircularQueueSnapshot` so the renderer can show every slot — including empty ones — and both pointers); `CircularQueueRenderer` shows the wraparound as a row with front/rear pointer labels rather than a literal ring, by design — see [packages/algorithms/src/queue/](packages/algorithms/src/queue/)). No separate Run button anymore either — selecting an algorithm shows pseudocode/source/stats/playback controls immediately, and pressing Play both computes and starts watching the run.

Note: the original "Data structures" roadmap item bundled tree algorithms *and* "interactive graph/tree editors" together; those were split into their own steps. **Tree editing specifically stayed out of scope** — BST Insert/Inorder Traversal build their tree from a plain value sequence rather than operating on a pre-existing one, so there's no structure to hand-edit yet. That becomes meaningful once a tree algorithm that operates on an *existing* tree (BST Search/Delete) exists — it would need a `TreeInput` type alongside the editor, a natural pairing for a future step.

**Planned, in order:**

13. Persistence + sharing (saved experiments, shareable visualization URLs)
14. AI algorithm tutor
15. Challenges (algorithm race mode)
16. Testing (broader unit/integration/E2E coverage, including component-level UI tests)
17. CI/CD (automated deployment)

## Algorithm & data-structure library backlog

Separate from the product-feature roadmap above (13–17): a much larger
backlog of concrete algorithms/data-structures, in the order they'll be
tackled — cheapest/most-reused-architecture first, since Stacks/Queues/
Linked Lists each need a brand-new instrumented-context class + renderer
(comparable in size to what the graph or tree engine each took), while
Searching/Quick Sort slot straight into the existing array plugin system.

1. ✅ **Searching** — Linear Search, Binary Search (done — see "Done" above)
2. ✅ **Quick Sort** — array-based, no new architecture; rounds out Sorting alongside Bubble/Insertion/Merge (done — see "Done" above)
3. ✅ **Stacks** — Push/Pop/Peek/isEmpty/isFull (Stack Operations) plus Postfix/Prefix (Polish notation) Evaluation (done — see "Done" above). `InputConstraints` gained a `notation` field (which of Postfix/Prefix Evaluation's `ExpressionInput` to generate) alongside the existing `sorted`/`needsTarget` flags — the "Size" slider is relabeled "Operations"/"Operands" for this family, same mechanism as "Nodes" for graphs.
4. ✅ **Queues** — Enqueue/Dequeue/Peek/isEmpty/isFull across all three variants asked for: Queue Operations (plain FIFO), Deque Operations (double-ended), Circular Queue Operations (fixed-capacity, wraparound) (done — see "Done" above). A plain queue and a deque turned out to share one snapshot kind and one instrumented context (`InstrumentedQueue`) — only the circular queue needed its own (`InstrumentedCircularQueue`/`CircularQueueSnapshot`), since losing its fixed slots or pointer positions would lose the point of visualizing it. `InputConstraints` gained an `allowDeque` flag (same spirit as `notation` for expressions) so Deque Operations' input generation picks a random end per operation instead of always the FIFO one.
5. **Linked Lists** — a node-and-pointer renderer (linear, unlike the graph one): singly/doubly/circular variants; Traversal, Insertion, Deletion, Search, Reverse, Merge, Comparison
6. **Tree extensions** — BST Search, BST Delete, AVL balancing (rotations — `RotateEvent` is already stubbed in `packages/core/src/events.ts` for exactly this), Preorder/Postorder traversal (Inorder already exists), B-trees (a genuinely different multi-key node shape); "applications" (Heap Sort, Huffman coding, decision/syntax trees) once the above land, since some need their own supporting structure first (Heap Sort needs a heap, Huffman needs a priority queue) rather than being pure BST work
7. **Graph algorithm additions** — Dijkstra's, Prim's, Kruskal's (all need weighted edges, which `GraphEdge` doesn't carry yet, plus a priority-queue visualization for Dijkstra/Prim), Topological Sort (DAG-only, reuses the existing unweighted `InstrumentedGraph` as-is), and an adjacency-matrix view alongside today's adjacency-list-shaped `GraphInput`

Also still planned but not sequenced within the above: DP algorithm family, custom-input playground, command palette + keyboard shortcuts.
