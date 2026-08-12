import { algorithmRegistry } from "../registry";
import { queueOperationsPlugin } from "./queue-operations";
import { dequeOperationsPlugin } from "./deque-operations";
import { circularQueueOperationsPlugin } from "./circular-queue-operations";

// Side-effect registration — see ../sorting/index.ts for the pattern and
// why registerReplacing (not register) is used here.
algorithmRegistry.registerReplacing(queueOperationsPlugin);
algorithmRegistry.registerReplacing(dequeOperationsPlugin);
algorithmRegistry.registerReplacing(circularQueueOperationsPlugin);

export { queueOperationsPlugin, dequeOperationsPlugin, circularQueueOperationsPlugin };
