import type { DataStructureSnapshot, LinkedListSnapshot, NodeId, RunStats, VisualizationEvent } from "@algoviz/core";
import { accumulateEvent, cloneSnapshot, deriveStats, EMPTY_STATS, isMutatingEvent } from "@algoviz/core";

/**
 * Re-derives `prev`/wraparound on a `LinkedListSnapshot` after a splice —
 * the replay-side mirror of `InstrumentedLinkedList`'s own `relink()`
 * (packages/engine/src/instrument-linked-list.ts), kept as a plain
 * function over a snapshot rather than shared code since the two operate
 * on different node shapes (live `Map` vs. plain `Record`).
 */
function relinkLinkedList(structure: LinkedListSnapshot): void {
  if (structure.variant === "doubly") {
    let prev: NodeId | undefined;
    let cur: NodeId | null = structure.headId;
    while (cur !== null) {
      const node = structure.nodes[cur]!;
      node.prev = prev;
      prev = cur;
      cur = node.next ?? null;
    }
  }
  let tail: NodeId | undefined;
  let cur: NodeId | null = structure.headId;
  const seen = new Set<NodeId>();
  while (cur !== null && !seen.has(cur)) {
    seen.add(cur);
    tail = cur;
    cur = structure.nodes[cur]?.next ?? null;
  }
  if (tail !== undefined) {
    structure.nodes[tail]!.next = structure.variant === "circular" ? (structure.headId ?? undefined) : undefined;
  }
}

export interface TimelineSnapshot {
  /**
   * The step this snapshot represents the state *after* replaying up to and
   * including. `-1` is the sentinel "before any event" keyframe — every
   * `buildSnapshots` result starts with one, so seeking to step `-1` always
   * returns the untouched initial structure.
   */
  atStep: number;
  structure: DataStructureSnapshot;
  stats: RunStats;
}

export interface Frame {
  structure: DataStructureSnapshot;
  stats: RunStats;
  /** The event at exactly the requested step, if any — what the renderer highlights as "currently happening". */
  activeEvent: VisualizationEvent | null;
}

const DEFAULT_TARGET_SNAPSHOT_COUNT = 200;

/**
 * Applies a single mutating event to `structure` in place. No-ops for
 * non-mutating events (compare/read/highlight/mark-done/compare-node/
 * stack-check/queue-check) and for kind/event combinations with no
 * algorithm producing them yet (e.g. `rotate`, declared for a future
 * self-balancing tree algorithm).
 *
 * For graphs/trees, `visit-node`/`traverse-edge` set a *persistent*
 * `visited`/`traversed` flag on the node/edge (not just "this is the
 * current instant's event") — that's what lets the renderer show
 * accumulated traversal progress while scrubbing, not only the single
 * node/edge active at the exact current step. For trees, `insert-node`
 * additionally marks the new node `visited: true` immediately (not just on
 * a later traversal visit), so the tree visibly fills in as it's built —
 * see TreeNode.visited's doc comment in packages/core/src/structures.ts.
 */
function applyEvent(structure: DataStructureSnapshot, event: VisualizationEvent): void {
  if (structure.kind === "array") {
    if (event.type === "swap") {
      const [i, j] = event.indices;
      const tmp = structure.values[i]!;
      structure.values[i] = structure.values[j]!;
      structure.values[j] = tmp;
    } else if (event.type === "set") {
      structure.values[event.index] = event.value;
    }
  } else if (structure.kind === "graph") {
    if (event.type === "visit-node") {
      const node = structure.nodes.find((n) => n.id === event.nodeId);
      if (node) node.visited = true;
    } else if (event.type === "traverse-edge") {
      const edge = structure.edges.find((e) => e.id === event.edgeId);
      if (edge) edge.traversed = true;
    } else if (event.type === "update-node-value") {
      const node = structure.nodes.find((n) => n.id === event.nodeId);
      if (node) node.value = event.value;
    } else if (event.type === "reject-edge") {
      const edge = structure.edges.find((e) => e.id === event.edgeId);
      if (edge) edge.rejected = true;
    } else if (event.type === "highlight-path") {
      for (const nodeId of event.nodeIds) {
        const node = structure.nodes.find((n) => n.id === nodeId);
        if (node) node.onPath = true;
      }
      for (const edgeId of event.edgeIds) {
        const edge = structure.edges.find((e) => e.id === edgeId);
        if (edge) edge.onPath = true;
      }
    }
  } else if (structure.kind === "tree") {
    if (event.type === "insert-node") {
      structure.nodes[event.nodeId] = {
        id: event.nodeId,
        value: event.value,
        children: [],
        parent: event.parentId,
        left: undefined,
        right: undefined,
        visited: true,
      };
      if (event.parentId !== undefined) {
        const parent = structure.nodes[event.parentId];
        if (parent) {
          if (event.side === "left") parent.left = event.nodeId;
          else if (event.side === "right") parent.right = event.nodeId;
          parent.children = [parent.left, parent.right].filter((id) => id !== undefined);
        }
      } else {
        structure.rootId = event.nodeId;
      }
    } else if (event.type === "visit-node") {
      const node = structure.nodes[event.nodeId];
      if (node) node.visited = true;
    }
  } else if (structure.kind === "stack") {
    if (event.type === "push") {
      structure.values.push(event.value);
    } else if (event.type === "pop") {
      structure.values.pop();
    }
  } else if (structure.kind === "queue") {
    if (event.type === "enqueue") {
      if (event.end === "front") structure.values.unshift(event.value);
      else structure.values.push(event.value);
    } else if (event.type === "dequeue") {
      if (event.end === "rear") structure.values.pop();
      else structure.values.shift();
    }
  } else if (structure.kind === "circular-queue") {
    if (event.type === "enqueue") {
      const index = (structure.front + structure.size) % structure.capacity;
      structure.slots[index] = event.value;
      structure.size++;
    } else if (event.type === "dequeue") {
      structure.slots[structure.front] = null; // clear so the renderer shows an empty slot, not a stale value
      structure.front = (structure.front + 1) % structure.capacity;
      structure.size--;
    }
    // rear is fully derived from front/size/capacity — recompute rather
    // than patch incrementally, mirroring InstrumentedCircularQueue's own
    // rearIndex() so the two never drift apart.
    structure.rear = (structure.front + structure.size - 1 + structure.capacity) % structure.capacity;
  } else if (structure.kind === "linked-list") {
    if (event.type === "ll-insert") {
      // Unlike a tree's insert-node, a list node does *not* start visited —
      // InstrumentedLinkedList's own insertHead/insertTail set `visited:
      // false` (only a later traverse/search `visit()` flips it), so replay
      // has to match that instead of the tree convention.
      structure.nodes[event.nodeId] = { id: event.nodeId, value: event.value, visited: false };
      if (event.afterId === undefined) {
        structure.nodes[event.nodeId]!.next = structure.headId ?? undefined;
        structure.headId = event.nodeId;
      } else {
        const after = structure.nodes[event.afterId];
        if (after) {
          structure.nodes[event.nodeId]!.next = after.next;
          after.next = event.nodeId;
        }
      }
      relinkLinkedList(structure);
    } else if (event.type === "ll-delete") {
      // `prevEntry` (found generically by "who points at me") and "was this
      // the head" are two independent questions, not an if/else — for a
      // circular list's head, the tail's `next` already wraps around to it,
      // so `prevEntry` *is* found (the tail), but `headId` still needs its
      // own update to the new head. Only a single-node list's self-loop
      // (circular, `next === own id`) needs a dedicated empty-out path.
      const wasOnlyNode = structure.nodes[event.nodeId]?.next === event.nodeId;
      if (wasOnlyNode) {
        structure.headId = null;
      } else {
        const deletedNext = structure.nodes[event.nodeId]?.next;
        const prevEntry = Object.values(structure.nodes).find(
          (n) => n.id !== event.nodeId && n.next === event.nodeId,
        );
        if (prevEntry) prevEntry.next = deletedNext;
        if (structure.headId === event.nodeId) structure.headId = deletedNext ?? null;
      }
      delete structure.nodes[event.nodeId];
      relinkLinkedList(structure);
    } else if (event.type === "ll-reverse") {
      for (let i = 0; i < event.order.length; i++) {
        const node = structure.nodes[event.order[i]!];
        if (node) node.next = event.order[i + 1];
      }
      structure.headId = event.order[0] ?? null;
      relinkLinkedList(structure);
    } else if (event.type === "visit-node") {
      const node = structure.nodes[event.nodeId];
      if (node) node.visited = true;
    }
  }
}

/** Index of the first event with `event.step > step` (upper bound / exclusive end). */
function upperBoundStep(events: VisualizationEvent[], step: number): number {
  let lo = 0;
  let hi = events.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (events[mid]!.step <= step) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Binary search for the event with `event.step === step`, or `null` if none exists (e.g. `step` is `-1`, or falls in a gap). */
function findEventAtStep(events: VisualizationEvent[], step: number): VisualizationEvent | null {
  let lo = 0;
  let hi = events.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const event = events[mid]!;
    if (event.step === step) return event;
    if (event.step < step) lo = mid + 1;
    else hi = mid - 1;
  }
  return null;
}

/** Index of the last snapshot with `atStep <= targetStep` (there's always at least the `-1` sentinel). */
function findNearestSnapshot(snapshots: TimelineSnapshot[], targetStep: number): TimelineSnapshot {
  let lo = 0;
  let hi = snapshots.length - 1;
  let best = snapshots[0]!;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const candidate = snapshots[mid]!;
    if (candidate.atStep <= targetStep) {
      best = candidate;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

/**
 * Produces up to `targetCount` full snapshots ("keyframes") spaced evenly
 * across the run, plus a `-1` sentinel for the pre-run state. Keeping the
 * *count* constant (rather than a fixed step interval) bounds both memory
 * and worst-case seek/replay cost to roughly the same constant regardless
 * of run length — a 10-event merge sort and a 250,000-event worst-case
 * bubble sort both cost about the same to scrub.
 */
export function buildSnapshots(
  initial: DataStructureSnapshot,
  events: VisualizationEvent[],
  targetCount: number = DEFAULT_TARGET_SNAPSHOT_COUNT,
): TimelineSnapshot[] {
  const snapshots: TimelineSnapshot[] = [
    { atStep: -1, structure: cloneSnapshot(initial), stats: EMPTY_STATS },
  ];
  if (events.length === 0) return snapshots;

  const interval = Math.max(1, Math.ceil(events.length / targetCount));
  const structure = cloneSnapshot(initial);
  let stats = EMPTY_STATS;

  for (let i = 0; i < events.length; i++) {
    const event = events[i]!;
    if (isMutatingEvent(event)) applyEvent(structure, event);
    stats = accumulateEvent(stats, event);

    const isLast = i === events.length - 1;
    if ((i + 1) % interval === 0 || isLast) {
      snapshots.push({ atStep: event.step, structure: cloneSnapshot(structure), stats });
    }
  }

  return snapshots;
}

/**
 * Reconstructs visualization state at `targetStep`: binary-searches
 * `snapshots` for the nearest keyframe at or before `targetStep`, then
 * replays only the events strictly between that keyframe and `targetStep`
 * (also found by binary search on `events`, which is sorted ascending by
 * `step`). Cost is O(log n) for the two searches plus O(k) for the replay,
 * where k is bounded by the snapshot interval — not O(n) — regardless of
 * how far into the run `targetStep` is.
 *
 * `targetStep` must be in `[-1, lastEvent.step]`; callers (the timeline
 * store) are responsible for clamping user input into that range.
 *
 * `activeEvent` lookup is deliberately independent of the replay loop
 * below: when `targetStep` lands exactly on a snapshot's own `atStep`, the
 * `(base.atStep, targetStep]` replay range is empty (that event's effects
 * are already baked into the snapshot) — but there's still an event *at*
 * that step that the renderer should highlight, so it's found by its own
 * binary search rather than as a side effect of the replay.
 */
export function reconstructFrame(
  snapshots: TimelineSnapshot[],
  events: VisualizationEvent[],
  targetStep: number,
): Frame {
  const base = findNearestSnapshot(snapshots, targetStep);
  const structure = cloneSnapshot(base.structure);
  let stats = base.stats;

  const startIdx = upperBoundStep(events, base.atStep);
  const endIdx = upperBoundStep(events, targetStep);

  for (let i = startIdx; i < endIdx; i++) {
    const event = events[i]!;
    if (isMutatingEvent(event)) applyEvent(structure, event);
    stats = accumulateEvent(stats, event);
  }

  return { structure, stats, activeEvent: findEventAtStep(events, targetStep) };
}

/**
 * Naive reference implementation — replays from the very start every time.
 * O(n) per call; exported only for tests to check `reconstructFrame`
 * against, never for production use.
 */
export function reconstructFrameNaive(
  initial: DataStructureSnapshot,
  events: VisualizationEvent[],
  targetStep: number,
): Frame {
  const structure = cloneSnapshot(initial);
  let activeEvent: VisualizationEvent | null = null;
  const relevant = events.filter((e) => e.step <= targetStep);
  for (const event of relevant) {
    if (isMutatingEvent(event)) applyEvent(structure, event);
    if (event.step === targetStep) activeEvent = event;
  }
  return { structure, stats: deriveStats(relevant), activeEvent };
}
