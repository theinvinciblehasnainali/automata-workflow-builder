import { WorkflowNode, WorkflowEdge, EventType } from '../types/automata';

export const getInitialStateId = (nodes: WorkflowNode[]): string | null => {
  const initialNode = nodes.find(n => n.data.mathType === 'initial' || n.data.mathType === 'initial_accepting');
  return initialNode?.id || nodes[0]?.id || null;
};

export const getNextDfaState = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  currentState: string,
  event: EventType
): string | null => {
  const matchingEdge = edges.find(
    edge => edge.source === currentState && edge.data?.triggerEvent === event
  );
  
  if (matchingEdge) {
    return matchingEdge.target;
  }

  return null;
};

export const evaluateSequence = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  sequence: EventType[]
): { finalState: string | null; isAccepted: boolean; pathTaken: string[] } => {
  let currentState: string | null = getInitialStateId(nodes);
  const pathTaken: string[] = [];
  
  if (currentState) {
    pathTaken.push(currentState);
  }
  
  for (const event of sequence) {
    if (currentState === null) break; // Halt execution if we reach a failure state
    currentState = getNextDfaState(nodes, edges, currentState, event);
    if (currentState) {
      pathTaken.push(currentState);
    }
  }
  
  if (currentState === null) {
    return { finalState: null, isAccepted: false, pathTaken };
  }
  
  const finalNode = nodes.find(n => n.id === currentState);
  const isAccepted = finalNode?.data.mathType === 'accepting' || finalNode?.data.mathType === 'initial_accepting';
  
  return { finalState: currentState, isAccepted, pathTaken };
};
