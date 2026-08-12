import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { askTutor, isTutorContext, TutorError } from "./tutor";

const ORIGINAL_ENV = { ...process.env };

function mockFetchOnce(response: Partial<Response> & { ok: boolean }): void {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

describe("isTutorContext", () => {
  it("accepts any non-null object", () => {
    expect(isTutorContext({})).toBe(true);
    expect(isTutorContext({ algorithmName: "Bubble Sort" })).toBe(true);
  });

  it("rejects null/primitives", () => {
    expect(isTutorContext(null)).toBe(false);
    expect(isTutorContext(undefined)).toBe(false);
    expect(isTutorContext("hi")).toBe(false);
    expect(isTutorContext(42)).toBe(false);
  });
});

describe("askTutor", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL = "gemini-3.5-flash";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it("throws TutorError when GEMINI_API_KEY is unset", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(askTutor("why?", {})).rejects.toThrow(TutorError);
  });

  it("extracts the answer text from a well-formed Gemini response", async () => {
    mockFetchOnce({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: "Because it's smaller." }] } }] }),
    } as Response);

    const answer = await askTutor("Why did it swap?", { algorithmName: "Bubble Sort" });
    expect(answer).toBe("Because it's smaller.");
  });

  it("joins multiple text parts and trims whitespace", async () => {
    mockFetchOnce({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: "  Part one. " }, { text: "Part two." }] } }] }),
    } as Response);

    const answer = await askTutor("Explain", {});
    expect(answer).toBe("Part one. Part two.");
  });

  it("throws TutorError on a non-ok HTTP response", async () => {
    mockFetchOnce({ ok: false, status: 429, text: async () => "quota exceeded" } as Response);
    await expect(askTutor("why?", {})).rejects.toThrow(/Gemini API error \(429\)/);
  });

  it("throws TutorError when Gemini returns no candidates", async () => {
    mockFetchOnce({ ok: true, json: async () => ({ candidates: [] }) } as Response);
    await expect(askTutor("why?", {})).rejects.toThrow(/empty response/);
  });

  it("throws TutorError when the network call itself fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    await expect(askTutor("why?", {})).rejects.toThrow(/Could not reach Gemini/);
  });

  it("sends the model from GEMINI_MODEL and the key as a query param", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }),
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await askTutor("why?", {});
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("gemini-3.5-flash:generateContent");
    expect(url).toContain("key=test-key");
  });
});
