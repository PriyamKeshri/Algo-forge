/**
 * Talks to the Gemini API on the algorithm's behalf. This lives on the
 * server (not in apps/web) for one reason: `GEMINI_API_KEY` must never ship
 * inside the browser bundle — anything in client code is visible to anyone
 * who opens devtools. `askTutor` is the one function that ever sees the key.
 */

const DEFAULT_MODEL = "gemini-3.5-flash";

/**
 * Everything apps/web already knows about the current step, forwarded
 * as-is — this server has no visualization state of its own, so it can only
 * ground its answer in whatever the client hands it. Every field is
 * optional because a fresh page (no algorithm selected yet, or no run
 * started) legitimately has less to say.
 */
export interface TutorContext {
  algorithmName?: string;
  category?: string;
  description?: string;
  pseudocode?: string;
  activeLine?: number;
  activeEventSummary?: string;
  structureSummary?: string;
  stepInfo?: string;
  stats?: string;
}

export function isTutorContext(value: unknown): value is TutorContext {
  return typeof value === "object" && value !== null;
}

function buildPrompt(question: string, context: TutorContext): string {
  const stateLines = [
    context.algorithmName ? `Algorithm: ${context.algorithmName} (${context.category ?? "unknown category"})` : null,
    context.description ? `Description: ${context.description}` : null,
    context.pseudocode ? `Pseudocode:\n${context.pseudocode}` : null,
    context.activeLine !== undefined ? `Current pseudocode line: ${context.activeLine}` : null,
    context.stepInfo ? `Progress: ${context.stepInfo}` : null,
    context.activeEventSummary ? `Current step: ${context.activeEventSummary}` : null,
    context.structureSummary ? `Current data: ${context.structureSummary}` : null,
    context.stats ? `Stats so far: ${context.stats}` : null,
  ].filter((line): line is string => line !== null);

  return [
    "You are a friendly, precise algorithms tutor embedded inside AlgoForge, an interactive algorithm visualizer.",
    "Answer the student's question about what's happening RIGHT NOW in the visualization below.",
    "Be specific to the current state given — reference actual values, node ids, or step numbers instead of speaking generically, whenever the state below lets you.",
    "Keep the answer to 2-4 sentences unless the question explicitly asks for more detail.",
    "If the current state doesn't contain enough information to answer precisely, say so briefly, then give your best general answer.",
    "",
    "--- Current visualization state ---",
    stateLines.length > 0 ? stateLines.join("\n") : "(no algorithm selected / no run started yet)",
    "--- End state ---",
    "",
    `Student's question: ${question}`,
  ].join("\n");
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    /** "MAX_TOKENS" here (with little/no text) means the budget ran out — surfaced as a distinct error so it's not confused with a genuinely empty response. */
    finishReason?: string;
  }>;
}

/** Thrown for anything that should surface as a 5xx to the client with a readable message — missing key, network failure, or a malformed/empty Gemini response. */
export class TutorError extends Error {}

export async function askTutor(question: string, context: TutorContext): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new TutorError("GEMINI_API_KEY is not set on the server — see apps/server/.env.example.");
  }
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const prompt = buildPrompt(question, context);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          // A "thinking" model (Gemini 2.5+/3.x flash) spends part of
          // maxOutputTokens on an internal reasoning pass before it ever
          // writes the visible answer — thinkingBudget: 0 turns that off,
          // so the whole budget below goes to the answer text itself. A
          // short tutor reply doesn't need multi-step reasoning anyway.
          thinkingConfig: { thinkingBudget: 0 },
          maxOutputTokens: 400,
        },
      }),
    });
  } catch (err) {
    throw new TutorError(`Could not reach Gemini: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new TutorError(`Gemini API error (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const candidate = data.candidates?.[0];
  const answer = candidate?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!answer) {
    if (candidate?.finishReason === "MAX_TOKENS") {
      throw new TutorError("Gemini ran out of its output-token budget before writing an answer — try a shorter question.");
    }
    throw new TutorError("Gemini returned an empty response.");
  }
  return answer;
}
