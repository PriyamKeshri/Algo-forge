import { afterEach, describe, expect, it, vi } from "vitest";
import { askTutor } from "./tutor-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("askTutor", () => {
  it("posts the question/context and returns the answer on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: "Because it's the smallest tentative distance." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const answer = await askTutor("Why C?", { algorithmName: "Dijkstra" });
    expect(answer).toBe("Because it's the smallest tentative distance.");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/tutor");
    expect(JSON.parse(init.body as string)).toEqual({ question: "Why C?", context: { algorithmName: "Dijkstra" } });
  });

  it("throws the server's error message on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => ({ error: "Gemini is down" }) }),
    );
    await expect(askTutor("why?", {})).rejects.toThrow("Gemini is down");
  });

  it("falls back to a generic message when the response has no answer and no error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    await expect(askTutor("why?", {})).rejects.toThrow(/Tutor request failed/);
  });

  it("respects a custom endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ answer: "ok" }) });
    vi.stubGlobal("fetch", fetchMock);
    await askTutor("why?", {}, "http://localhost:5175/api/tutor");
    expect(fetchMock.mock.calls[0]![0]).toBe("http://localhost:5175/api/tutor");
  });
});
