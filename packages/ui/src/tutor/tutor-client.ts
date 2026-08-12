/**
 * Everything the tutor backend (apps/server) knows about the current step —
 * mirrors `TutorContext` in apps/server/src/tutor.ts (not imported from
 * there; apps/web has no dependency on apps/server, they only ever talk over
 * HTTP). Every field is optional so a fresh page — no algorithm selected, or
 * no run started yet — still has *something* valid to send.
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

interface TutorResponseBody {
  answer?: string;
  error?: string;
}

/**
 * Calls the tutor backend's one endpoint. Not a straight call to Gemini from
 * here — see apps/server/README.md for why the API key can't live in this
 * package (or anywhere else that ships to the browser).
 */
export async function askTutor(question: string, context: TutorContext, endpoint = "/api/tutor"): Promise<string> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, context }),
  });

  const body: TutorResponseBody | null = await response.json().catch(() => null);
  if (!response.ok || !body?.answer) {
    throw new Error(body?.error ?? `Tutor request failed (${response.status}).`);
  }
  return body.answer;
}
