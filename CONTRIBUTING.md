# Contributing to AlgoForge

Thanks for considering a contribution! This is a pnpm workspace monorepo, so a
few things work a little differently than a single-package repo — this doc
covers the setup and conventions actually in use.

## Getting set up

```bash
git clone https://github.com/PriyamKeshri/Algo-forge.git
cd Algo-forge
pnpm install
pnpm dev          # web app → http://localhost:5173
```

Node 20+ is required (see `engines` in `package.json`). The AI Tutor backend
needs a Gemini API key — see [`apps/server/README.md`](apps/server/README.md)
if you're working on that piece specifically.

## Project layout

```
apps/
  web/       React + Vite frontend (@algoviz/web)
  server/    AI Tutor backend (@algoviz/tutor-server)
packages/
  core/      Shared types — AlgorithmInput, DataStructureSnapshot, etc. (@algoviz/core)
  algorithms/  Every algorithm plugin, grouped by category (@algoviz/algorithms)
  engine/    Instrumented data structures + the execution engine (@algoviz/engine)
  ui/        Shared UI components/state (@algoviz/ui)
```

Each package is independently typechecked; `apps/web` depends on all four
`packages/*` via pnpm workspace links.

## Before opening a PR

Run these from the repo root — CI expects all three to pass:

```bash
pnpm test        # vitest, runs every package's test suite
pnpm typecheck    # tsc --noEmit across every package
pnpm lint         # eslint .
```

If you're touching `apps/web` specifically, `pnpm --filter @algoviz/web run typecheck`
runs just that package's check.

## Adding a new algorithm

Every algorithm is a plugin implementing the `AlgorithmPlugin` interface
(`packages/algorithms/src/registry.ts`): `metadata` (name, category,
complexity, pseudocode, source snippet), `inputConstraints` (what shape of
input it needs), and a `run` generator that walks the input and yields
instrumentation events against the relevant `Instrumented*` structure from
`@algoviz/engine`.

The clearest way in is to read an existing plugin in the same category as
what you're adding (e.g. `packages/algorithms/src/sorting/bubble-sort.ts` for
an array algorithm, or `packages/algorithms/src/graph/bfs.ts` for a graph
one) and follow the same shape — pseudocode lines matched to `run`'s yielded
events, and a `SOURCE_CODE` string kept in sync with `run` itself (several
plugins have a drift-detection test asserting the two don't diverge — check
whether the category's `*.test.ts` file already does this before adding a
new plugin, and extend it if so). New plugins get wired in through the
category's local `index.ts` and re-exported from
`packages/algorithms/src/index.ts`.

## Tests

Vitest, colocated with the code as `*.test.ts`. If you add a new module with
real branching logic (not just wiring/composition), add a test file for it —
that's genuinely the norm here, not the exception; most modules in this repo
already have one.

## Code style

- `eslint` + `prettier` are configured at the root — run `pnpm lint` before
  pushing.
- Comments in this codebase tend to explain **why**, not just what — match
  that when the reasoning behind a choice isn't obvious from the code alone.

## License

By contributing, you agree your contribution is licensed under this
project's [Apache License 2.0](LICENSE).
