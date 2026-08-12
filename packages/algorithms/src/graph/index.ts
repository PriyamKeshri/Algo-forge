import { algorithmRegistry } from "../registry";
import { bfsPlugin } from "./bfs";
import { dfsPlugin } from "./dfs";
import { dijkstraPlugin } from "./dijkstra";
import { primsPlugin } from "./prims";
import { kruskalsPlugin } from "./kruskals";

// Side-effect registration — see ../sorting/index.ts for the pattern and
// why registerReplacing (not register) is used here.
algorithmRegistry.registerReplacing(bfsPlugin);
algorithmRegistry.registerReplacing(dfsPlugin);
algorithmRegistry.registerReplacing(dijkstraPlugin);
algorithmRegistry.registerReplacing(primsPlugin);
algorithmRegistry.registerReplacing(kruskalsPlugin);

export { bfsPlugin, dfsPlugin, dijkstraPlugin, primsPlugin, kruskalsPlugin };
