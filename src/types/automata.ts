import React from 'react';

export type EventType = string;
export type ViewMode = 'user' | 'math';

export interface WorkflowNodeData {
  label: string;
  mathState: string;
  type: 'trigger' | 'action' | 'condition' | 'accept' | 'reject';
  mathType: 'initial' | 'normal' | 'accepting' | 'rejecting' | 'initial_accepting';
  description: string;
  parameters: Record<string, string>;
  viewMode: ViewMode;
  isActive?: boolean;
  onDoubleClick?: (id: string) => void;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  style?: React.CSSProperties;
  data?: {
    triggerEvent: EventType;
    isActive?: boolean;
  };
}

export interface TestCase {
  id: number;
  sequence: EventType[];
  expected: 'ACCEPT' | 'REJECT';
  description: string;
}

export interface SavedTestSequence {
  id: string;
  name: string;
  sequence: string;
}

export interface TransitionLog {
  step: number;
  fromNodeId: string;
  toNodeId: string;
  event: EventType | 'RESET';
  status: 'active' | 'success' | 'fail' | 'transitioning';
  message: string;
}

export interface SimulationState {
  currentTestCaseId: number | null;
  activeNodeId: string;
  inputIndex: number;
  status: 'idle' | 'running' | 'paused' | 'accepted' | 'rejected';
  history: TransitionLog[];
}
