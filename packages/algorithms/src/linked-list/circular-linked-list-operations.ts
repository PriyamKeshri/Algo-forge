import { createLinkedListOperationsPlugin } from "./linked-list-operations-plugin";

export const circularLinkedListOperationsPlugin = createLinkedListOperationsPlugin(
  "circular",
  "circular-linked-list-operations",
  "Circular Linked List Operations",
  "Same scripted Insert/Delete/Search/Traverse/Reverse sequence, but the tail's `next` always wraps back around to the head — traversal still stops after visiting every node once, since the operations themselves don't know or care that they're circular.",
);
