import { algorithmRegistry } from "../registry";
import { singlyLinkedListOperationsPlugin } from "./singly-linked-list-operations";
import { doublyLinkedListOperationsPlugin } from "./doubly-linked-list-operations";
import { circularLinkedListOperationsPlugin } from "./circular-linked-list-operations";
import { linkedListMergePlugin } from "./linked-list-merge";
import { linkedListComparisonPlugin } from "./linked-list-comparison";

// Side-effect registration — see ../sorting/index.ts for the pattern and
// why registerReplacing (not register) is used here.
algorithmRegistry.registerReplacing(singlyLinkedListOperationsPlugin);
algorithmRegistry.registerReplacing(doublyLinkedListOperationsPlugin);
algorithmRegistry.registerReplacing(circularLinkedListOperationsPlugin);
algorithmRegistry.registerReplacing(linkedListMergePlugin);
algorithmRegistry.registerReplacing(linkedListComparisonPlugin);

export {
  singlyLinkedListOperationsPlugin,
  doublyLinkedListOperationsPlugin,
  circularLinkedListOperationsPlugin,
  linkedListMergePlugin,
  linkedListComparisonPlugin,
};
