<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/pnpm-workspace-F69220?logo=pnpm&logoColor=white" alt="pnpm" />
  <img src="https://img.shields.io/badge/Vitest-testing-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License" />
</p>

<h1 align="center">⚒️ AlgoForge</h1>
<p align="center"><b>Interactive Algorithm Laboratory</b></p>
<p align="center">Step through sorting, searching, graph, tree, and data-structure algorithms one operation at a time — with synced pseudocode, real source, live stats, timeline scrubbing, and an AI tutor that explains exactly what's on screen.</p>

<p align="center">
  <a href="https://algo-forge.vercel.app/"><b>🚀 Live Demo</b></a> ·
  <a href="https://algo-forge-h8f8.onrender.com/">AI Tutor backend</a>
</p>

---

## 📸 Screenshots

|  |  |
|---|---|
| ![Home page — every algorithm grouped by category](docs/screenshots/home.png) | ![Bubble Sort mid-run — comparisons, swaps, and synced pseudocode/source](docs/screenshots/sorting.png) |
| Home — every algorithm, grouped by category | Step-by-step playback, with synced pseudocode + source panels |
| ![Dijkstra's shortest path highlighted on a weighted graph](docs/screenshots/graph-shortest-path.png) | ![Algorithm Race mode ranking four sort algorithms by real wall-clock time](docs/screenshots/race.png) |
| Dijkstra — real shortest path highlighted end-to-end | Algorithm Race — four sorts, one array, real wall-clock time |
| ![AI Tutor answering a question grounded in the current step](docs/screenshots/ai-tutor.png) | |
| AI Tutor — grounded in the exact current step, not a generic answer | |

---

## ✨ What it does

Instead of just animating an algorithm, AlgoForge exposes *why* each step happened:

- ▶️ Play / pause / step forward & backward / scrub to any point in the run
- 📊 Live comparisons, swaps, reads, and writes as the algorithm runs
- 🧭 Pseudocode and real source code highlighted in sync with the current step
- 🌐 A click-to-build graph editor — add nodes, connect them, set weights, pick a start *and* end node
- 🏁 **Algorithm Race** — race Bubble/Insertion/Merge/Quick Sort against each other on the same array, timed in real milliseconds
- 🤖 An AI tutor that answers questions grounded in the exact current step, not a generic explanation

## 🧩 Algorithms & data structures

| Category | Included |
|---|---|
| **Sorting** | Bubble, Insertion, Merge, Quick |
| **Searching** | Linear, Binary |
| **Stacks** | Stack Operations, Postfix Evaluation, Prefix Evaluation |
| **Queues** | Queue, Deque, Circular Queue Operations |
| **Linked Lists** | Singly / Doubly / Circular Operations, Merge, Comparison |
| **Trees** | BST Insert, Inorder / Preorder / Postorder Traversal |
| **Graphs** | BFS, DFS, Dijkstra's, Prim's, Kruskal's — the last three highlight the resulting path between a chosen start and end node |

## 🤖 AI Algorithm Tutor

Every question is answered with the current algorithm, pseudocode line, active step, and live stats as context — so the answer is about *this exact moment* in *this exact run*, not a generic textbook explanation.

```text
"Why did it swap these two elements?"
"Explain this step like I'm a beginner."
"Why did Dijkstra pick this node next?"
"What happens if I change this input?"
```

---

## Installation

```bash
git clone https://github.com/PriyamKeshri/algo-forge.git
cd algo-forge
pnpm install
pnpm dev          # web app → http://localhost:5173
pnpm dev:all      # web app + AI Tutor backend together
```

The AI Tutor needs a Gemini API key — see [`apps/server/README.md`](apps/server/README.md) for local setup.

---

## 📄 License

Licensed under the Apache License 2.0 — see [LICENSE](LICENSE).

<p align="center">
  Built with ⚒️, TypeScript, and a lot of algorithmic curiosity.
</p>
