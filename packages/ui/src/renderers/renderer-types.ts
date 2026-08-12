import type { DataStructureSnapshot, VisualizationEvent } from "@algoviz/core";

export interface StructureRendererProps<T extends DataStructureSnapshot = DataStructureSnapshot> {
  structure: T;
  /** The event at the current timeline position, if any — drives what gets highlighted. */
  activeEvent: VisualizationEvent | null;
}
