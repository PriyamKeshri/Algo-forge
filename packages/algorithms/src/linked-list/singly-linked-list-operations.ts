import { createLinkedListOperationsPlugin } from "./linked-list-operations-plugin";

export const singlyLinkedListOperationsPlugin = createLinkedListOperationsPlugin(
  "singly",
  "singly-linked-list-operations",
  "Singly Linked List Operations",
  "Walks a scripted sequence of Insert/Delete/Search/Traverse/Reverse calls against a singly linked list — each node only points forward, so deletion and search both walk from the head one `next` pointer at a time.",
);
