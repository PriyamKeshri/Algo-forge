import type { StructureRendererProps } from "./renderer-types";
import { ArrayRenderer } from "./ArrayRenderer";
import { GraphRenderer } from "./GraphRenderer";
import { TreeRenderer } from "./TreeRenderer";
import { StackRenderer } from "./StackRenderer";
import { QueueRenderer } from "./QueueRenderer";
import { CircularQueueRenderer } from "./CircularQueueRenderer";
import { LinkedListRenderer } from "./LinkedListRenderer";

/**
 * Dispatches on `structure.kind`. `array`, `graph`, `tree`, `stack`,
 * `queue`, `circular-queue`, and `linked-list` all have real renderers
 * now — this component just routes to the right one.
 */
export function StructureView({ structure, activeEvent }: StructureRendererProps) {
  switch (structure.kind) {
    case "array":
      return <ArrayRenderer structure={structure} activeEvent={activeEvent} />;
    case "graph":
      return <GraphRenderer structure={structure} activeEvent={activeEvent} />;
    case "tree":
      return <TreeRenderer structure={structure} activeEvent={activeEvent} />;
    case "stack":
      return <StackRenderer structure={structure} activeEvent={activeEvent} />;
    case "queue":
      return <QueueRenderer structure={structure} activeEvent={activeEvent} />;
    case "circular-queue":
      return <CircularQueueRenderer structure={structure} activeEvent={activeEvent} />;
    case "linked-list":
      return <LinkedListRenderer structure={structure} activeEvent={activeEvent} />;
    default: {
      const exhaustiveCheck: never = structure;
      throw new Error(`Unhandled structure kind: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}
