/**
 * Branded string IDs. Branding prevents accidentally passing a plain string
 * (or the wrong kind of ID) where a specific ID type is expected, while still
 * being a plain string at runtime (no wrapper object, cheap to compare/serialize).
 */
type Brand<T, B extends string> = T & { readonly __brand: B };

export type AlgorithmId = Brand<string, "AlgorithmId">;
export type NodeId = Brand<string, "NodeId">;
export type EdgeId = Brand<string, "EdgeId">;

export function algorithmId(id: string): AlgorithmId {
  return id as AlgorithmId;
}

export function nodeId(id: string): NodeId {
  return id as NodeId;
}

export function edgeId(id: string): EdgeId {
  return id as EdgeId;
}

let idCounter = 0;

/** Generates a short, unique-enough runtime ID for nodes/edges created during a session. */
export function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}
