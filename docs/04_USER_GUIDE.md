# User Guide & Operations Manual

This document provides complete instructions on effectively utilizing and managing the Automata Workflow Builder.

## 1. Initialization and Workspaces

Upon initializing the application, you are presented with the **Default: Academic Preset Model**.
This read-only template, the **Stateful Security Inspection Gatekeeper**, demonstrates a perfect working DFA mechanism built around Session and Threat Analysis.

### Creating and Managing Workspaces
To deviate from the default sandbox, users leverage the custom builder module natively locked in the top navigation panel.
1. **Create Custom Scenario:** Pressing the `+ Create Custom Scenario` button clears the workspace entirely. The system provisions a blank canvas, empties the evaluation test sequence map, and sanitizes the state definitions.
2. **Rename Workspace:** Located beside the scenario dropdown, the `Rename Scenario` (Edit Icon) invokes an internal dialog system allowing custom project titling.
3. **Delete Workspace:** Located beside the renaming dialog, the `Delete Scenario` (Trash Icon) securely wipes the memory-bank storage via a rigid secondary-confirmation protocol safely. 

*(Note: The system explicitly locks the "Default" preset behind rigid guard layers. It cannot be renamed, nor cleanly deleted, ensuring foundational examples perpetually persist.)*

## 2. Display View Modes
The top header array toggles real-time environmental context:
- **User View (Layout Icon):** Emphasizes standard business logic strings. Labels display readable SaaS metrics (e.g., "TRUSTED_SESSION" "Timeout Trap").
- **Automata Math Mode (Binary Icon):** Hard-strips GUI elements mapping directly to theoretical computation (e.g. $q_1$, $q_2$, $q_{rej}$).

## 3. Constructing the Finite Automaton

### Adding States (Nodes)
Navigate to the left-hand column inside the `Control Panel` tool set. 
Click **"Add New State"**. A node generates synchronously. By default, numerical offsets calculate inherently resolving identifier collisions. (e.g., constructing `q_0`, `q_1`, `q_2`).
- To modify specific Node logic, **Double-Click** the node inside the visual Canvas. A custom Configuration Modal opens allowing precise injection mappings into: `Label`, Mathematical State (`mathState`), Operational logic `Type` and Mathematical classification (`mathType`: Initial, Normal, Accepting, or Rejecting).

### Establishing Logical Edges (Transitions)
Transitions map strings derived from the Alphabet $\Sigma$.
1. Add an event to the global **Alphabet Parameter**.
2. Using the Control panel, dictate the Source identifier (e.g., $q_0$).
3. Identify the Target identifier (e.g., $q_1$).
4. Bind the defined Transition Event triggering the directional edge.
5. Click **"Connect"**. `sonner` validates execution immediately across the UI map.

Additionally, interactive edge linking occurs natively via cursor drag-and-drop utilizing React Flow native hook parameters.

## 4. Test Suite Execution & Simulation
Ensure your nodes feature at least **ONE explicitly defined Initial State.** 

Inside the **Test Case Runner** table:
- Enter event strings (comma-separated, natively checking the Alphabet library). Select your Expected Output Target (Accept vs Reject) internally checking the user hypothesis against machine physics.
- Hit **Play (Run Simulation).**
- Watch as the visual matrix calculates logic mathematically, locking edge routes iteratively displaying precise node processing, confirming success arrays or error traps dynamically per the `automataEngine.ts`.