import { beforeEach, describe, expect, it } from "vitest";
import { algorithmId, type AlgorithmMetadata, type InputConstraints } from "@algoviz/core";
import { AlgorithmRegistry, DuplicateAlgorithmError, type AlgorithmPlugin } from "./registry";

function fakeMetadata(id: string, category: AlgorithmMetadata["category"]): AlgorithmMetadata {
  return {
    id: algorithmId(id),
    name: id,
    category,
    description: `${id} test plugin`,
    complexity: { best: "O(n)", average: "O(n)", worst: "O(n)", space: "O(1)" },
    pseudocode: [{ line: 1, text: "no-op" }],
    sourceCode: { language: "typescript", code: "function* run() {}" },
  };
}

const constraints: InputConstraints = { kind: "array", minSize: 1, maxSize: 100, defaultSize: 10 };

function fakePlugin(id: string, category: AlgorithmMetadata["category"] = "sorting"): AlgorithmPlugin {
  return {
    metadata: fakeMetadata(id, category),
    inputConstraints: constraints,
    *run() {
      // no-op generator; registry tests don't need to actually execute it
    },
  };
}

describe("AlgorithmRegistry", () => {
  let registry: AlgorithmRegistry;

  beforeEach(() => {
    registry = new AlgorithmRegistry();
  });

  it("registers and retrieves a plugin by id", () => {
    const plugin = fakePlugin("bubble-sort");
    registry.register(plugin);
    expect(registry.get(algorithmId("bubble-sort"))).toBe(plugin);
  });

  it("returns undefined for an unknown id", () => {
    expect(registry.get(algorithmId("nope"))).toBeUndefined();
  });

  it("throws DuplicateAlgorithmError when registering the same id twice", () => {
    registry.register(fakePlugin("bubble-sort"));
    expect(() => registry.register(fakePlugin("bubble-sort"))).toThrow(DuplicateAlgorithmError);
  });

  it("registerReplacing silently swaps in a new plugin for an existing id", () => {
    const original = fakePlugin("bubble-sort");
    const replacement = fakePlugin("bubble-sort");
    registry.registerReplacing(original);
    expect(() => registry.registerReplacing(replacement)).not.toThrow();
    expect(registry.get(algorithmId("bubble-sort"))).toBe(replacement);
    expect(registry.list()).toHaveLength(1);
  });

  it("registerReplacing works for a brand-new id too", () => {
    registry.registerReplacing(fakePlugin("bubble-sort"));
    expect(registry.get(algorithmId("bubble-sort"))).toBeDefined();
  });

  it("filters plugins by category", () => {
    registry.register(fakePlugin("bubble-sort", "sorting"));
    registry.register(fakePlugin("merge-sort", "sorting"));
    registry.register(fakePlugin("binary-search", "searching"));

    const sorting = registry.getByCategory("sorting");
    expect(sorting.map((p) => p.metadata.id)).toEqual(["bubble-sort", "merge-sort"]);
    expect(registry.getByCategory("graph")).toEqual([]);
  });

  it("lists metadata for every registered plugin", () => {
    registry.register(fakePlugin("bubble-sort"));
    registry.register(fakePlugin("insertion-sort"));
    expect(registry.list().map((m) => m.id).sort()).toEqual(["bubble-sort", "insertion-sort"]);
  });

  it("clear() removes all registered plugins", () => {
    registry.register(fakePlugin("bubble-sort"));
    registry.clear();
    expect(registry.list()).toEqual([]);
  });
});
