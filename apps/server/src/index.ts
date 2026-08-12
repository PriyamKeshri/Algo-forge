import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { askTutor, isTutorContext, TutorError } from "./tutor.js";

// Loads apps/server/.env (gitignored) into process.env for local dev, so
// GEMINI_API_KEY doesn't have to be exported by hand in every shell. A
// production deployment that injects real env vars directly just won't
// have this file — that's fine, loadEnvFile then no-ops instead of failing.
try {
  process.loadEnvFile();
} catch {
  // No .env file present — env vars are expected to come from the environment itself.
}

const PORT = Number(process.env.PORT ?? 5175);
// "*" is fine for local dev (this server has no cookies/auth to leak); tighten
// this to the deployed web app's real origin before putting it anywhere public.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "*";

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req as AsyncIterable<Buffer>) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf-8");
  return raw ? JSON.parse(raw) : {};
}

async function handleTutorRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: "Request body must be valid JSON." });
    return;
  }

  const { question, context } = (body ?? {}) as { question?: unknown; context?: unknown };
  if (typeof question !== "string" || question.trim() === "") {
    sendJson(res, 400, { error: "`question` (a non-empty string) is required." });
    return;
  }

  try {
    const answer = await askTutor(question, isTutorContext(context) ? context : {});
    sendJson(res, 200, { answer });
  } catch (err) {
    const message = err instanceof TutorError ? err.message : "Unexpected error asking the tutor.";
    if (!(err instanceof TutorError)) console.error("[tutor] unexpected failure:", err);
    sendJson(res, 502, { error: message });
  }
}

const server = createServer((req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/api/tutor") {
    void handleTutorRequest(req, res);
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`[tutor-server] listening on http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn("[tutor-server] GEMINI_API_KEY is not set — /api/tutor will return errors until it is.");
  }
});
