import React from 'react';
import { WorkflowNode, WorkflowEdge, EventType, ViewMode } from '../types/automata';
import { Activity, Clock } from 'lucide-react';

interface MathInspectorProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  alphabet: EventType[];
  viewMode: ViewMode;
  selectedNode: WorkflowNode | null;
  onUpdateNodeDetails: (id: string, details: Partial<WorkflowNode['data']>) => void;
  onRemoveEdge: (id: string) => void;
}

export default function MathInspector({
  nodes,
  edges,
  alphabet,
  viewMode,
  selectedNode,
  onUpdateNodeDetails,
  onRemoveEdge
}: MathInspectorProps) {
  
  const getInitialStates = () => nodes.filter(n => n.data.mathType === 'initial');
  const getAcceptingStates = () => nodes.filter(n => n.data.mathType === 'accepting');

  return (
    <div className="flex flex-col gap-4">
      
      {/* Formal Definition Panel (Only in Math Mode) */}
      {viewMode === 'math' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm text-slate-200 animate-in fade-in">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-3 flex items-center gap-1.5">
            <Activity size={14} /> Formal Specification M = (Q, Σ, δ, q₀, F)
          </h4>
          
          <div className="space-y-3 font-mono text-xs">
            <div>
              <span className="text-indigo-400 font-bold">Q (States): </span>
              <span className="text-slate-400">{'{'}</span>
              {nodes.map(n => n.data.mathState).join(', ')}
              <span className="text-slate-400">{'}'}</span>
            </div>
            <div>
              <span className="text-indigo-400 font-bold">Σ (Alphabet): </span>
              <span className="text-slate-400">{'{'}</span>
              {alphabet.join(', ')}
              <span className="text-slate-400">{'}'}</span>
            </div>
            <div>
              <span className="text-emerald-400 font-bold">q₀ (Start): </span>
              <span className="text-slate-400">{'{'}</span>
              {getInitialStates().map(n => n.data.mathState).join(', ')}
              <span className="text-slate-400">{'}'}</span>
            </div>
            <div>
              <span className="text-rose-400 font-bold">F (Accepting): </span>
              <span className="text-slate-400">{'{'}</span>
              {getAcceptingStates().map(n => n.data.mathState).join(', ')}
              <span className="text-slate-400">{'}'}</span>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-800">
            <span className="text-indigo-400 font-bold font-mono text-xs">δ (Transitions): </span>
            <div className="max-h-32 overflow-y-auto mt-2 space-y-1.5 pr-2 custom-scrollbar">
              {edges.length === 0 ? (
                <span className="text-slate-600 text-[10px] italic">No transitions mapped.</span>
              ) : edges.map(e => {
                const fromN = nodes.find(n => n.id === e.source);
                const toN = nodes.find(n => n.id === e.target);
                return (
                  <div key={e.id} className="flex items-center justify-between bg-slate-950 p-1.5 rounded border border-slate-800 text-[10px] font-mono group">
                    <div>
                      δ({fromN?.data.mathState || e.source}, <span className="text-amber-300">'{e.data?.triggerEvent}'</span>) → {toN?.data.mathState || e.target}
                    </div>
                    <button 
                      onClick={() => onRemoveEdge(e.id)}
                      className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-400 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Selected Node Properties Synced */}
      {selectedNode && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm animate-in fade-in transition-colors duration-200">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
            Selected Entity Context
          </h4>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">State Form / Math Symbol</label>
              <input 
                type="text" 
                value={selectedNode.data.mathState}
                onChange={e => onUpdateNodeDetails(selectedNode.id, { mathState: e.target.value })}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Role / Math Type</label>
              <select 
                value={selectedNode.data.mathType}
                onChange={e => onUpdateNodeDetails(selectedNode.id, { mathType: e.target.value as any })}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              >
                <option value="initial">Initial (Start)</option>
                <option value="normal">Normal</option>
                <option value="accepting">Accepting (F)</option>
                <option value="rejecting">Rejecting / Trap</option>
              </select>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
