import { WorkflowNode, WorkflowEdge, EventType } from '../types/automata';

export const getInitialStateId = (nodes: WorkflowNode[]): string => {
  const initialNode = nodes.find(n => n.data.mathType === 'initial');
  return initialNode?.id || nodes[0]?.id || 'q0';
};

export const getNextDfaState = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  currentState: string,
  event: EventType
): string => {
  const currentNode = nodes.find(n => n.id === currentState);
  
  if (currentNode?.data.mathType === 'accepting') {
    const explicitEdge = edges.find(
      edge => edge.source === currentState && edge.data?.triggerEvent === event
    );
    if (explicitEdge) return explicitEdge.target;
    return currentState;
  }

  const matchingEdge = edges.find(
    edge => edge.source === currentState && edge.data?.triggerEvent === event
  );
  
  if (matchingEdge) {
    return matchingEdge.target;
  }

  const rejectingNode = nodes.find(n => n.data.mathType === 'rejecting');
  if (rejectingNode) {
    return rejectingNode.id;
  }

  return currentState;
};

export const evaluateSequence = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  sequence: EventType[]
): { finalState: string; isAccepted: boolean } => {
  let currentState = getInitialStateId(nodes);
  
  for (const event of sequence) {
    currentState = getNextDfaState(nodes, edges, currentState, event);
  }
  
  const finalNode = nodes.find(n => n.id === currentState);
  const isAccepted = finalNode?.data.mathType === 'accepting';
  
  return { finalState: currentState, isAccepted };
};
