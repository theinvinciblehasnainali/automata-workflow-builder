import React, { useState } from 'react';
import { WorkflowNode, EventType, ViewMode } from '../types/automata';
import { Binary, Share2, Plus, Zap, Layers, Regex, AlertCircle, Sparkles } from 'lucide-react';

interface ControlPanelProps {
  alphabet: EventType[];
  nodes: WorkflowNode[];
  viewMode: ViewMode;
  onAddAlphabetTrigger: (trigger: string) => void;
  onRemoveAlphabetTrigger: (trigger: string) => void;
  onAddEdge: (source: string, target: string, event: string) => void;
  onAddNode: () => void;
  onGenerateDfaRequest: (re: string) => void;
}

export default function ControlPanel({
  alphabet,
  nodes,
  viewMode,
  onAddAlphabetTrigger,
  onRemoveAlphabetTrigger,
  onAddEdge,
  onAddNode,
  onGenerateDfaRequest,
}: ControlPanelProps) {
  const [newTrigger, setNewTrigger] = useState('');
  const [edgeSource, setEdgeSource] = useState('');
  const [edgeTarget, setEdgeTarget] = useState('');
  const [edgeEvent, setEdgeEvent] = useState('');
  const [reInput, setReInput] = useState('');
  const [reError, setReError] = useState<string | null>(null);

  const handleAddTrigger = () => {
    if (newTrigger.trim() && !alphabet.includes(newTrigger.trim())) {
      onAddAlphabetTrigger(newTrigger.trim());
      setNewTrigger('');
    }
  };

  const handleAddEdge = (e: React.FormEvent) => {
    e.preventDefault();
    if (edgeSource && edgeTarget && edgeEvent) {
      onAddEdge(edgeSource, edgeTarget, edgeEvent);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      
      {/* Node Registration Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between transition-colors duration-200">
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 uppercase">
            <Layers className="text-indigo-600 dark:text-indigo-400 w-4 h-4" /> Node Registry
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Add new states to the workspace.</p>
        </div>
        <button
          onClick={onAddNode}
          className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:text-indigo-800 dark:hover:text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border border-indigo-200 dark:border-indigo-800"
        >
          <Plus size={14} /> Add State
        </button>
      </div>

      {/* Alphabet Registration */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col gap-3 transition-colors duration-200">
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase flex items-center gap-1.5 whitespace-nowrap">
            <Binary className="text-amber-600 dark:text-amber-500 w-4 h-4" /> {viewMode === 'math' ? 'Alphabet Triggers (Σ)' : 'Event Triggers'}
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Define valid dynamic event triggers.</p>
        </div>
        <div className="flex gap-2 isolate">
          <input 
            type="text" 
            placeholder="e.g. checkout_start"
            value={newTrigger}
            onChange={(e) => setNewTrigger(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTrigger()}
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 outline-none transition-all"
          />
          <button 
            onClick={handleAddTrigger}
            disabled={!newTrigger.trim()}
            className="bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
          >
            <Plus size={14} /> Add
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {alphabet.map(sym => (
            <span key={sym} className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-400 rounded-md text-[10px] font-mono font-bold">
              {sym}
              <button 
                onClick={() => onRemoveAlphabetTrigger(sym)} 
                className="text-amber-400 hover:text-rose-500 ml-1 leading-none"
              >×</button>
            </span>
          ))}
          {alphabet.length === 0 && <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">No triggers registered.</span>}
        </div>
      </div>

      {/* Regular Expressions Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col gap-3 transition-colors duration-200">
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase flex items-center gap-1.5 whitespace-nowrap">
            <Regex className="text-violet-600 dark:text-violet-400 w-4 h-4" /> Regular Expressions
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Create automated workflows based on regular expressions.</p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder={alphabet.length === 0 ? 'Add Event Triggers first…' : 'e.g. (a+b)*abb  or  (a|b)*abb'}
              value={reInput}
              disabled={alphabet.length === 0}
              onChange={e => { setReInput(e.target.value); setReError(null); }}
              onKeyDown={e => {
                if (e.key === 'Enter' && reInput.trim() && alphabet.length > 0) {
                  onGenerateDfaRequest(reInput.trim());
                }
              }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 focus:bg-white dark:focus:bg-slate-900 focus:border-violet-500 dark:focus:border-violet-400 focus:ring-1 focus:ring-violet-100 dark:focus:ring-violet-900/50 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Alphabet hint */}
          {alphabet.length > 0 && (
            <div className="flex flex-wrap gap-1 px-0.5">
              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wide mr-1 self-center">Σ:</span>
              {alphabet.map(sym => (
                <span key={sym} className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800">{sym}</span>
              ))}
            </div>
          )}

          {/* Inline error */}
          {reError && (
            <div className="flex items-start gap-1.5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg px-2.5 py-2">
              <AlertCircle size={12} className="text-rose-500 mt-0.5 shrink-0" />
              <span className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">{reError}</span>
            </div>
          )}

          <button
            disabled={!reInput.trim() || alphabet.length === 0}
            onClick={() => {
              if (reInput.trim()) {
                setReError(null);
                onGenerateDfaRequest(reInput.trim());
              }
            }}
            className="w-full mt-0.5 flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <Sparkles size={13} />
            {viewMode === 'math' ? 'Generate DFA' : 'Generate Workflow'}
          </button>
        </div>
      </div>

      {/* Edge Connection Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col gap-3 transition-colors duration-200">
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase flex items-center gap-1.5 whitespace-nowrap">
            <Share2 className="text-emerald-600 dark:text-emerald-500 w-4 h-4" /> {viewMode === 'math' ? 'Connect States (δ)' : 'Connect Nodes'}
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Wire up deterministic transitions.</p>
        </div>
        <form onSubmit={handleAddEdge} className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <select 
              value={edgeSource} 
              onChange={e => setEdgeSource(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
            >
              <option value="">Source (From)</option>
              {nodes.map(n => <option key={n.id} value={n.id}>{viewMode === 'math' ? n.data.mathState : n.data.label}</option>)}
            </select>
            <select 
              value={edgeTarget} 
              onChange={e => setEdgeTarget(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
            >
              <option value="">Target (To)</option>
              {nodes.map(n => <option key={n.id} value={n.id}>{viewMode === 'math' ? n.data.mathState : n.data.label}</option>)}
            </select>
          </div>
          <select 
            value={edgeEvent} 
            onChange={e => setEdgeEvent(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
          >
            <option value="">Required Trigger ({viewMode === 'math' ? 'Σ' : 'Event'})</option>
            {alphabet.map(sym => <option key={sym} value={sym}>{sym}</option>)}
          </select>
          <button 
            type="submit"
            disabled={!edgeSource || !edgeTarget || !edgeEvent}
            className="w-full mt-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
            <Zap size={13} /> Link
          </button>
        </form>
      </div>

    </div>
  );
}
