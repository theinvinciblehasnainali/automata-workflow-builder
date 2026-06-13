# Formal Automata Theory & The Simulation Engine

This document provides a highly technical mapping between discrete mathematics and the TypeScript implementation under `src/utils/automataEngine.ts`. 

## 1. The 5-Tuple Mapping
A Deterministic Finite Automaton is formally defined as a 5-tuple: **$(Q, \Sigma, \delta, q_0, F)$**.

### 1.1 Finite Set of States ($Q$)
In the application, $Q$ is represented by the `WorkflowNode[]` state array. 
- **Implementation:** Each node is assigned a unique `mathState` string identifier (e.g., $q_0$, $q_{acc}$, $q_{rej}$). 
- **Validation:** The application ensures state uniqueness. Nodes are designated functional markers:
  - `trigger` (Entry)
  - `action` (Standard Operation)
  - `condition` (Branching Logic)
  - `accept` (Success Termination)
  - `reject` (Trap / Error State)

### 1.2 The Alphabet ($\Sigma$)
$\Sigma$ refers to a finite, non-empty set of input symbols.
- **Implementation:** Represented by the `alphabet` state variable (an array of `EventType` strings, e.g., `["connect", "scan_clean", "terminate"]`).
- **Engine Logic:** The engine purely rejects any event attempting to transition to a non-existent edge. The string must exclusively utilize characters/events bound by $\Sigma$.

### 1.3 Transition Function ($\delta$)
Mathematically defined as $\delta: Q \times \Sigma \rightarrow Q$.
- **Implementation:** Stored in the `WorkflowEdge[]` array. Each edge defines a precise mapping: `source` ($Q_{current}$), `data.triggerEvent` ($\Sigma_{input}$), and `target` ($Q_{next}$).
- **Engine Logic:** The `getNextDfaState` function intercepts the current node and the current chronological input sequence index to isolate the target node matching the strict deterministic transition criteria.

### 1.4 Initial State ($q_0$)
Defined mathematically as $q_0 \in Q$.
- **Implementation:** Defined dynamically by mapping the `WorkflowNode` where `mathType === 'initial'`. The engine enforces that exactly one initial state serves as the mandatory execution entry point.

### 1.5 Set of Accept States ($F$)
Defined mathematically as $F \subseteq Q$.
- **Implementation:** Nodes evaluated where `mathType === 'accepting'`. 
- **Execution Traversal:** Sequence evaluation (`evaluateSequence`) concludes cleanly *only* if the final computation index lands explicitly on a Node registered inside $F$.

## 2. Core Execution Engine (`automataEngine.ts`)

The deterministic workflow is operated by `evaluateSequence`:

```typescript
export const evaluateSequence = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  sequence: EventType[]
): { finalState: string | null; isAccepted: boolean; pathTaken: string[] }
```

### Execution Flow Algorithm
1. **Entry Extraction:** Isolates the root initial node. Returns null computation path if zero initialization points exist.
2. **Chained Iteration:** Iterates through the raw input sequence array map (`sequence`).
3. **Step Resolution (`getNextDfaState`):** Cross-references current node string against the array of `WorkflowEdge` elements to retrieve `$Q_{next}$`.
4. **Halt Condition Check:** If an invalid event maps to a non-existent transition, the node evaluates to `null`. The chain forcefully breaks, flagging an immediate `false` acceptance and capturing the halt point.
5. **Final Evaluation Phase:** When array depletion occurs successfully, queries the mathematical state (`mathType`) of the target computational residue. Emits `isAccepted: true` structurally mapping to $F \subseteq Q$.