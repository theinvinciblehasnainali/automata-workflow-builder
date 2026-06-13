# System Architecture & State Management

This document provides a holistic breakdown of the underlying front-end architecture, lifecycle hooks, and rendering paradigms utilized in the Automata Workflow Builder.

## 1. Technology Stack
- **Framework:** React 19 via Vite for accelerated Hot Module Replacement (HMR) and ultra-lean production footprint.
- **Language:** TypeScript 5.8+ enforcing rigid deterministic mapping structures (via `types/automata.ts`).
- **Graphing Core:** `@xyflow/react` v12. Powers hardware-accelerated SVG matrix generation for nodes, handles DOM manipulation for interactive physics, scaling, and canvas zooming capabilities.
- **Styling:** Tailwind CSS v4, supporting seamless dark/light rendering paradigms (`next-themes`). Components rely heavily on `lucide-react` for symbolic UI/UX.

## 2. Global State Paradigm
The entirety of the data-layer behaves synchronously within `App.tsx` avoiding overhead tools like Redux in favor of optimized complex-object React Hook rendering.

### Primary State Stores
1. `nodes: WorkflowNode[]`: Houses the matrix coordinates, UI references (ViewMode data), and math variables for graph entities.
2. `edges: WorkflowEdge[]`: Unifies ReactFlow connections.
3. `alphabet: EventType[]`: String map containing the finite input validations.
4. `testSequence: string`: Local execution sandbox variables.
5. `userCreatedCases: CustomScenario[]`: Encapsulated configurations.
6. `simState: SimulationState`: Dictates execution locking, simulation intervals, iteration counters, and animation triggers.

## 3. Persistence Mechanism (`utils/storage.ts`)
To emulate database architectures offline, the lifecycle relies on a customized DOM LocalStorage bridge.

- **Hydration:** A single synchronous load mapping via `loadFromStorage()` occurs prior to `useEffect` compilation during application boot, seeding all internal definitions instantly.
- **Continuous Syncing:** `App.tsx` observes variables inside a highly targeted `useEffect` dependency array `[currentScenarioId, userCreatedCases, nodes, edges, alphabet, testSequence]`. Mutating vectors or logic immediately invokes `saveToStorage()` providing zero-loss guarantees across unhandled closures.

## 4. Component Hierarchy

### `App.tsx` (Controller & Global Shell)
Houses memory, controls navigation routing, generates modal overlay wrappers and triggers execution cascades.

- **`WorkflowCanvas.tsx`:** Consumes `@xyflow/react`. Configured purely as an event-listener bridge executing `onNodesChange` and edge tracking while exposing dual-canvas `viewMode` logic paths.
- **`ControlPanel.tsx`:** Left-pane toolkit providing inputs mapping node generation indices (e.g., dynamic offset `q_0`, `q_1`), and mapping explicit transition pipelines.
- **`MathInspector.tsx`:** Read-only left-pane toolkit rendering theoretical DFA structural integrity equations mapped linearly from visual state hooks.
- **`TestSuiteTable.tsx`:** Bottom-span tabular grid evaluating the `simState`. Executes simulated string combinations against `automataEngine`, validating output booleans via custom logic mapping. Modifies localized `testCases` dynamically.
- **`NodeBlock.tsx`:** Override layer handling bespoke HTML/CSS injection for `@xyflow/react` standard blocks to conform styling.

## 5. User Interface (UI) Interactions
Native browser interruptions (`alert()`, `prompt()`, `confirm()`) have been engineered out completely. Interactions leverage:
1. Custom React Modals managed conditionally (`isDeleteModalOpen`, `isRenameModalOpen`) wrapped over `backdrop-blur-sm` canvases holding nested execution states safely.
2. Toast emission via `sonner` for non-blocking successful mapping operations, error flags during execution testing, or transition links.