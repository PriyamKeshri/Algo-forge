import { algorithmRegistry } from "../registry";
import { linearSearchPlugin } from "./linear-search";
import { binarySearchPlugin } from "./binary-search";

// Side-effect registration — see ../sorting/index.ts for the pattern and
// why registerReplacing (not register) is used here.
algorithmRegistry.registerReplacing(linearSearchPlugin);
algorithmRegistry.registerReplacing(binarySearchPlugin);

export { linearSearchPlugin, binarySearchPlugin };
