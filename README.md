# ⚒️ AlgoForge

### Interactive Algorithm Laboratory

> An interactive algorithm laboratory for visualizing, debugging, comparing, and understanding algorithms and data structures through step-by-step execution, time travel, benchmarking, and AI-powered learning.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Vitest](https://img.shields.io/badge/Vitest-testing-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## 🚀 Live Demo

- **Web app:** [algo-forge.vercel.app](https://algo-forge.vercel.app/)
- **AI Tutor backend:** [algo-forge-h8f8.onrender.com](https://algo-forge-h8f8.onrender.com/) (`apps/server` — see [Installation](#installation) for running it locally)

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

## ✨ Overview

**AlgoForge** is a production-oriented algorithm visualization platform designed to make algorithm execution observable and interactive.

Instead of simply animating an algorithm, AlgoForge exposes the underlying execution process:

- What operation is happening?
- Why is it happening?
- Which values are being compared?
- What changed?
- What is the algorithm's current state?
- How does the implementation map to the visualization?
- How does theoretical complexity compare with actual performance?

The platform combines **visualization, execution tracing, debugging, benchmarking, and learning** into one environment.

---

## 🎯 Core Features

### 🎬 Interactive Execution

- ▶️ Play / pause / resume
- ⏭️ Step forward and backward
- ⏪ Rewind and replay
- 🎚️ Timeline scrubbing
- 🕐 Time-travel through execution
- 📊 Live operation statistics
- 🔍 Execution state inspection


### 🧮 Dynamic Programming

DP receives a dedicated visualization layer built on top of reusable grid primitives.

Features include:

- DP table visualization
- Cell highlighting
- Dependency highlighting
- Recurrence visualization
- Memoization visualization
- Backtracking
- Optimal-path visualization
- DP heatmaps

### 🌐 Interactive Graphs

Create and modify graphs directly in the visualizer.

- Add/remove nodes
- Add/remove edges
- Weighted edges
- Directed/undirected graphs
- Start/end node selection
- Random graph generation
- Pathfinding visualization

### 🌳 Data Structures

Interactive visualizations for:

- Arrays
- Linked Lists
- Stacks
- Queues
- Binary Trees
- Binary Search Trees
- AVL Trees
- Heaps
- Tries
- Hash Tables

Compare:

- Execution time
- Comparisons
- Swaps
- Assignments
- Total operations
- Recursion depth
- Memory usage where measurable
- Correctness

### 🤖 AI Algorithm Tutor

The AI layer can use the algorithm's execution context to provide explanations.

Possible interactions:

```text
"Why did this comparison happen?"

"Explain the current step."

"Why is this O(n log n)?"

"Why did Dijkstra choose this node?"

"Explain this DP recurrence."

"Give me a hint."
```
---

## Installation

Clone the repository:

```bash
git clone https://github.com/PriyamKeshri/algo-forge.git
cd algo-forge
```

Install dependencies:

```bash
pnpm install
```

---


## 📄 License

This project is licensed under the Apache License 2.0.

See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ⚒️, TypeScript, and a lot of algorithmic curiosity.
</p>
