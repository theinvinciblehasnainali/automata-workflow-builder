import { WorkflowNode, WorkflowEdge, EventType, SavedTestSequence } from '../types/automata';
import { CustomScenario } from '../components/TestSuiteTable';

const STORAGE_KEY = 'automata_workflow_app_state_v1';

export interface ScenarioState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  alphabet: EventType[];
  testSequence: string;
  savedTestSequences: SavedTestSequence[];
}

export interface AppSavedState {
  currentScenarioId: string;
  defaultScenarioState?: ScenarioState;
  userCreatedCases: CustomScenario[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  alphabet: EventType[];
  testSequence: string;
}

/**
 * Saves the structured workflow application state to the browser's localStorage.
 */
export function saveToStorage(state: AppSavedState): void {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serializedState);
  } catch (error) {
    console.warn('Unable to save application state to localStorage.', error);
    // Storage might be full, disabled, or we are in a restricted environment.
  }
}

/**
 * Loads the application state from the browser's localStorage.
 * Returns null if no state is found or if parsing fails.
 */
export function loadFromStorage(): AppSavedState | null {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEY);
    if (!serializedState) {
      return null;
    }
    const parsedState = JSON.parse(serializedState) as AppSavedState;
    
    // Safety checks in case the schema changes or data is corrupted
    if (parsedState && typeof parsedState === 'object') {
      return {
        currentScenarioId: parsedState.currentScenarioId || 'default',
        defaultScenarioState: parsedState.defaultScenarioState,
        userCreatedCases: Array.isArray(parsedState.userCreatedCases) ? parsedState.userCreatedCases : [],
        nodes: Array.isArray(parsedState.nodes) ? parsedState.nodes : [],
        edges: Array.isArray(parsedState.edges) ? parsedState.edges : [],
        alphabet: Array.isArray(parsedState.alphabet) ? parsedState.alphabet : [],
        testSequence: parsedState.testSequence || ''
      };
    }
    return null;
  } catch (error) {
    console.warn('Unable to load application state from localStorage.', error);
    return null;
  }
}
