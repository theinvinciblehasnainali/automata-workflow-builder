# Workflow Automata Builder

An interactive, client-side web application built with React, Vite, and TypeScript that allows users to visually design, modify, and test workflow automata graphs.

## 🚀 Features
* **Visual Graph Builder:** Create states (nodes) and transitions (edges) dynamically on an interactive canvas.
* **Local-First State Persistence:** Automatically caches and hydrates the user's workflow state directly within the browser (`localStorage`), ensuring work is never lost on page refreshes.
* **Input Testing/Inspection:** Built-in validation structures (`MathInspector`, `TestSuiteTable`) to evaluate string inputs against the designed automata.
* **Strict Type Safety:** Fully typed architectural layer managing automata definitions cleanly.

## 🛠️ Tech Stack
* **Frontend Framework:** React 18+ (with TypeScript)
* **Build Tool:** Vite (Optimized for ultra-fast production bundling)
* **Styling:** CSS / Tailwind CSS
* **Deployment:** Vercel

## 📦 Project Structure Overview
* `src/components/`: Modular UI elements split into canvas controls and inspection tables.
* `src/types/`: Centralized TypeScript interfaces managing the state machine structure (`automata.ts`).
* `src/utils/`: Pure helper functions for tracking graph errors and structural rules.

## ⚙️ Getting Started

### Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/theinvinciblehasnainali/automata-workflow-builder.git
   cd automata-workflow-builder

2. Install dependencies:
   ```bash
   npm install

3. Run the development server:
   ```bash
   npm run dev

4. Build for production:
   ```bash
   npm run build

## 🔬 Connection to Automata Theory
This application serves as a visual bridge between abstract computational theory and practical software implementation. The architecture mirrors the formal definition of a **Finite Automaton 5-tuple (Q, Σ, δ, q₀, F):**

### States (Q):
Represented visually as nodes on the canvas canvas workspace.

### Alphabet (Σ):
The restricted input character set defined by the user to evaluate edge triggers.

### Transition Function (δ):
Implemented via directed interactive edges connecting the node blocks. The underlying automataEngine.ts processes inputs sequentially across these paths.

### Initial State (q₀):
Designated via the control panel interface to establish the computation's entry point.

### Accepting States (F):
Highlighted visually as final/target states to signify successful string recognition upon input consumption.

The system dynamically processes arbitrary input strings to verify whether they are formally accepted or rejected by the configured machine layout, exposing the step-by-step state transition pipeline.

## ✍️ Credits
**Developer:** Hasnain Ali

**Project Type:** Semester / Portfolio Project

## 📄 License
This project is licensed under the **MIT License.**