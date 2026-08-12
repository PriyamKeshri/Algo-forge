import type { AlgorithmId } from "./ids";

export type AlgorithmCategory =
  | "sorting"
  | "searching"
  | "graph"
  | "tree"
  | "stack"
  | "queue"
  | "linked-list"
  | "dynamic-programming";

export interface ComplexityInfo {
  best: string;
  average: string;
  worst: string;
  space: string;
}

/** One line of an algorithm's pseudocode, used to sync highlighting with emitted events. */
export interface PseudocodeLine {
  /** 1-indexed line number, referenced by VisualizationEvent.line. */
  line: number;
  text: string;
  /** Indentation depth, purely for rendering (0 = top level). */
  indent?: number;
}

/**
 * The real, syntactically valid implementation source shown alongside the
 * hand-written pseudocode above — "Synchronized source/pseudocode
 * highlighting." `code` is a literal snippet of the plugin's actual `run`
 * generator, kept in sync with the executing code by convention (the same
 * hand-maintained relationship `pseudocode`/`line` already has), and
 * verified by a drift-detection test per plugin (see
 * packages/algorithms/src/sorting/sorting.test.ts) rather than derived at
 * runtime — extracting real transpiled source via `Function.toString()`
 * would be fragile under minification (comments/formatting aren't
 * guaranteed to survive a production build).
 */
export interface SourceCodeInfo {
  language: "typescript";
  code: string;
}

export interface AlgorithmMetadata {
  id: AlgorithmId;
  name: string;
  category: AlgorithmCategory;
  description: string;
  complexity: ComplexityInfo;
  pseudocode: PseudocodeLine[];
  sourceCode: SourceCodeInfo;
}
