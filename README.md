# Automata Workflow Builder

An interactive, client-side web application built with React, Vite, and TypeScript that allows users to visually design, modify, and test workflow automata graphs.

## 🚀 Features
* **Visual Graph Builder:** Create states (nodes) and transitions (edges) dynamically on an interactive canvas.
* **Local-First State Persistence:** Automatically caches and hydrates the user's workflow state directly within the browser (`localStorage`), ensuring work is never lost on page refreshes.
* **Input Testing/Inspection:** Built-in validation structures (`MathInspector`, `TestSuiteTable`) to evaluate string inputs against the designed automata.
* **Strict Type Safety:** Fully typed architectural layer managing automata definitions cleanly.

## � Complete Project Documentation
To ensure a highly professional approach, comprehensive standard documentation has been created in the `/docs` directory. These files serve as the benchmark for system reporting, architecture tracking, and computation mapping:

1. [**Overview & Scope (`01_OVERVIEW.md`)**](./docs/01_OVERVIEW.md) - Project objectives, features, demographics, and capabilities.
2. [**Automata Theory Engine (`02_AUTOMATA_THEORY.md`)**](./docs/02_AUTOMATA_THEORY.md) - Detailed breakdown mapping Discrete Mathematics logic equations to the structural limits of the system implementation.
3. [**System Architecture (`03_SYSTEM_ARCHITECTURE.md`)**](./docs/03_SYSTEM_ARCHITECTURE.md) - Deep dive covering technology stack, State Management lifecycles over Redux patterns, and visual components mapping.
4. [**User Guide (`04_USER_GUIDE.md`)**](./docs/04_USER_GUIDE.md) - Comprehensive step-by-step user-manual operations mapping canvas capabilities, test running formats, node configuration triggers, and Scenario manipulation hooks.

## 🛠️ Tech Stack
* **Frontend Framework:** React 19 (TypeScript)
* **Build Tool:** Vite 6
* **Canvas Engine:** `@xyflow/react` v12
* **Styling/Animations:** TailwindCSS v4, Sonner, motion
* **Asset Library:** Lucide React

## ⚙️ Getting Started

### Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/theinvinciblehasnainali/automata-workflow-builder.git
   cd automata-workflow-builder
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

## ✍️ Credits
**Developer:** Hasnain Ali

**Project Type:** Semester / Portfolio Project

## 📄 License
This project is licensed under the **MIT License.**