import { algorithmRegistry } from "../registry";
import { bubbleSortPlugin } from "./bubble-sort";
import { insertionSortPlugin } from "./insertion-sort";
import { mergeSortPlugin } from "./merge-sort";
import { quickSortPlugin } from "./quick-sort";

// Side-effect registration: importing this module registers every sorting
// plugin into the shared algorithmRegistry. Future algorithm families
// (packages/algorithms/src/searching, /graph, /tree, /dp) follow the same
// per-family index.ts pattern. Uses registerReplacing (not register) since
// this module-level side effect can legitimately re-run under dev-mode HMR.
algorithmRegistry.registerReplacing(bubbleSortPlugin);
algorithmRegistry.registerReplacing(insertionSortPlugin);
algorithmRegistry.registerReplacing(mergeSortPlugin);
algorithmRegistry.registerReplacing(quickSortPlugin);

export { bubbleSortPlugin, insertionSortPlugin, mergeSortPlugin, quickSortPlugin };
