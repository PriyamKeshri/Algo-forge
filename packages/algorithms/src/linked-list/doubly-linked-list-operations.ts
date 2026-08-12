import { createLinkedListOperationsPlugin } from "./linked-list-operations-plugin";

export const doublyLinkedListOperationsPlugin = createLinkedListOperationsPlugin(
  "doubly",
  "doubly-linked-list-operations",
  "Doubly Linked List Operations",
  "Same scripted Insert/Delete/Search/Traverse/Reverse sequence as Singly Linked List Operations, but every node also keeps a `prev` pointer back to its predecessor — reversal is still just re-pointing `next`; `prev` is re-derived from it afterward.",
);
