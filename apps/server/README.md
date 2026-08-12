# @algoviz/tutor-server

Tiny backend for the AI Tutor panel. It exists for exactly one reason: the
Gemini API key can't live in `apps/web`'s browser bundle (anything shipped to
the client is visible in devtools), so this server holds the key and proxies
one endpoint.

## Setup

```bash
cd apps/server
cp .env.example .env
# edit .env, set GEMINI_API_KEY=<your key>
pnpm dev
```

Runs on `http://localhost:5175` by default. `apps/web`'s dev server proxies
`/api/*` to it (see `apps/web/vite.config.ts`), so the frontend just calls
`fetch("/api/tutor")` — no CORS setup needed in dev.

## API

`POST /api/tutor`

```jsonc
// request
{ "question": "Why did it swap these?", "context": { "algorithmName": "Bubble Sort", "...": "..." } }

// response (200)
{ "answer": "..." }

// response (4xx/502)
{ "error": "..." }
```

`context` is a `TutorContext` (see `src/tutor.ts`) — every field is optional;
the server just forwards whatever `apps/web` sends into the prompt.
