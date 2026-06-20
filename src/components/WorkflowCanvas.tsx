import React, { useState, useCallback } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  NodeTypes, 
  Edge, 
  Node, 
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection
} from '@xyflow/react';
import { useTheme } from 'next-themes';
import '@xyflow/react/dist/style.css';
import NodeBlock from './NodeBlock';
import { WorkflowNode, WorkflowEdge, ViewMode } from '../types/automata';
import { Info, Play } from 'lucide-react';

const nodeTypes: NodeTypes = {
  customNode: NodeBlock,
};

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewMode: ViewMode;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onNodeDoubleClick: (event: React.MouseEvent, node: Node) => void;
  testSequence: string;
  onTestSequenceChange: (val: string) => void;
  onExecute: () => void;
  onConnectRequest?: (source: string, target: string) => void;
  onEdgeDoubleClick?: (event: React.MouseEvent, edge: Edge) => void;
  onNodeContextMenu?: (event: React.MouseEvent, node: Node) => void;
  onEdgeContextMenu?: (event: React.MouseEvent, edge: Edge) => void;
  onPaneContextMenu?: (event: React.MouseEvent) => void;
  onPaneClick?: (event: React.MouseEvent) => void;
}

export default function WorkflowCanvas({
  nodes,
  edges,
  viewMode,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onNodeDoubleClick,
  testSequence,
  onTestSequenceChange,
  onExecute,
  onConnectRequest,
  onEdgeDoubleClick,
  onNodeContextMenu,
  onEdgeContextMenu,
  onPaneContextMenu,
  onPaneClick
}: WorkflowCanvasProps) {
  const [showInfo, setShowInfo] = useState(false);
  const { theme, resolvedTheme } = useTheme();
  
  const isDark = resolvedTheme === 'dark' || theme === 'dark';

  const onConnect = useCallback((params: Connection) => {
    if (onConnectRequest && params.source && params.target) {
      onConnectRequest(params.source, params.target);
    }
  }, [onConnectRequest]);

  // Convert custom edges to React Flow valid edges
  const flowEdges: Edge[] = edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: viewMode === 'math' ? `δ('${e.data?.triggerEvent}')` : e.data?.triggerEvent,
    animated: e.data?.isActive,
    interactionWidth: 20,
    style: { 
      stroke: e.data?.isActive 
        ? (e.target.includes('acc') ? '#10b981' : e.target.includes('rej') ? '#f43f5e' : '#6366f1') 
        : (isDark ? '#334155' : '#cbd5e1'),
      strokeWidth: e.data?.isActive ? 3 : 1.5,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: e.data?.isActive 
        ? (e.target.includes('acc') ? '#10b981' : e.target.includes('rej') ? '#f43f5e' : '#6366f1') 
        : (isDark ? '#334155' : '#cbd5e1'),
    },
    labelBgPadding: [4, 4],
    labelBgBorderRadius: 4,
    labelBgStyle: { 
      fill: e.data?.isActive ? (isDark ? '#312e81' : '#f5f3ff') : (isDark ? '#0f172a' : '#ffffff'), 
      stroke: e.data?.isActive ? (isDark ? '#4338ca' : '#c7d2fe') : (isDark ? '#334155' : '#e2e8f0') 
    },
    labelStyle: { 
      fill: e.data?.isActive ? (isDark ? '#a5b4fc' : '#4338ca') : (isDark ? '#94a3b8' : '#475569'), 
      fontWeight: e.data?.isActive ? 700 : 500, 
      fontSize: 10, 
      fontFamily: 'monospace' 
    },
  }));

  return (
    <div className="relative w-full h-[600px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col transition-colors duration-200">
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onPaneClick={onPaneClick}
        onConnect={onConnect}
        colorMode={isDark ? 'dark' : 'light'}
        fitView
      >
        <Background color={isDark ? "#334155" : "#e2e8f0"} gap={24} size={1.2} />
        <Controls className="fill-slate-500 dark:fill-slate-400 dark:bg-slate-800 dark:border-slate-700" />
      </ReactFlow>

      {/* Execute Ribbon top-right */}
      <div className="absolute top-4 right-4 z-10 flex flex-col md:flex-row gap-2 items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-2 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 transition-colors duration-200">
        <input 
          type="text" 
          placeholder="e.g. on_click, on_pay" 
          value={testSequence}
          onChange={(e) => onTestSequenceChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onExecute();
          }}
          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 w-48"
        />
        <button 
          onClick={onExecute}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Play size={14} className="fill-current" /> Execute
        </button>
      </div>

      {/* Info portal bottom-right */}
      <div 
        className="absolute bottom-4 right-4 z-10"
        onMouseEnter={() => setShowInfo(true)}
        onMouseLeave={() => setShowInfo(false)}
      >
        <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 p-2 rounded-full shadow-md transition-colors">
          <Info size={20} />
        </button>
        
        {showInfo && (
          <div className="absolute bottom-12 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xl w-72 mb-2 animate-in fade-in slide-in-from-bottom-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-2 border-b border-slate-100 dark:border-slate-800 pb-2">Context Information</h4>
            <div className="space-y-1.5 font-mono text-[10px] text-slate-500 dark:text-slate-400">
              <p>• <strong className="text-slate-700 dark:text-slate-300">Start State</strong>: Marked with Start tag.</p>
              <p>• <strong className="text-slate-700 dark:text-slate-300">Highlighted</strong>: Active δ-transition rules.</p>
              <p>• <strong className="text-emerald-600 dark:text-emerald-400">Accepting States</strong>: Dashed border category.</p>
              <p>• <strong className="text-rose-600 dark:text-rose-400">Rejecting States</strong>: Trap failure states.</p>
              <p className="mt-2 text-indigo-600 dark:text-indigo-400">Double click any node to edit configurations.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
