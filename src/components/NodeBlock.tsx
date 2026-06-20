import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { WorkflowNodeData } from '../types/automata';
import { 
  Sparkles, 
  Mail, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle,
  Plus
} from 'lucide-react';

export default function NodeBlock({ data, selected }: { data: WorkflowNodeData; selected: boolean }) {
  const getIcon = (type: WorkflowNodeData['type'], mathType: WorkflowNodeData['mathType'], active: boolean) => {
    const size = 16;
    if (mathType === 'accepting' || mathType === 'initial_accepting') {
      return <CheckCircle2 size={size} className={active ? "text-emerald-600 dark:text-emerald-400 animate-pulse" : "text-emerald-500 dark:text-emerald-400"} />;
    }
    if (mathType === 'rejecting') {
      return <AlertTriangle size={size} className={active ? "text-rose-600 dark:text-rose-400 animate-pulse" : "text-rose-500 dark:text-rose-400"} />;
    }
    
    switch (type) {
      case 'trigger': return <Sparkles size={size} className={active ? "text-emerald-600 dark:text-emerald-400 animate-pulse" : "text-emerald-500 dark:text-emerald-400"} />;
      case 'action': return <Mail size={size} className={active ? "text-indigo-600 dark:text-indigo-400 animate-pulse" : "text-indigo-500 dark:text-indigo-400"} />;
      case 'condition': return <Eye size={size} className={active ? "text-amber-600 dark:text-amber-400 animate-pulse" : "text-amber-500 dark:text-amber-400"} />;
      case 'accept': return <CheckCircle2 size={size} className="text-emerald-600 dark:text-emerald-400" />;
      case 'reject': return <AlertTriangle size={size} className="text-rose-600 dark:text-rose-400" />;
      default: return <HelpCircle size={size} className="text-slate-500 dark:text-slate-400" />;
    }
  };

  const isActive = data.isActive;
  let borderClass = 'border-2';
  let badgeBg = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  let cardBg = 'bg-white dark:bg-slate-900';
  let shadowClass = 'shadow-md';
  let ringClass = 'ring-0';

  if (data.mathType === 'accepting' || data.mathType === 'initial_accepting') {
    borderClass = 'border-2 border-dashed border-emerald-500 dark:border-emerald-600';
    badgeBg = 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
    cardBg = 'bg-emerald-50/80 dark:bg-emerald-900/20';
    shadowClass = selected ? 'shadow-lg dark:shadow-emerald-900/30' : 'shadow-sm';
  } else if (data.mathType === 'rejecting') {
    borderClass = 'border-2 border-dashed border-rose-500 dark:border-rose-600';
    badgeBg = 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700';
    cardBg = 'bg-rose-50/80 dark:bg-rose-900/20';
    shadowClass = selected ? 'shadow-lg dark:shadow-rose-900/30' : 'shadow-sm';
  } else if (data.mathType === 'initial') {
    borderClass = 'border-2 border-emerald-400 dark:border-emerald-500';
    badgeBg = 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700';
    shadowClass = selected ? 'shadow-lg dark:shadow-emerald-900/20' : 'shadow-sm';
  } else {
    switch (data.type) {
      case 'trigger': borderClass = 'border-2 border-indigo-400 dark:border-indigo-500'; badgeBg = 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'; break;
      case 'action': borderClass = 'border-2 border-indigo-500 dark:border-indigo-600'; badgeBg = 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'; break;
      case 'condition': borderClass = 'border-2 border-amber-500 dark:border-amber-600'; badgeBg = 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'; break;
      default: borderClass = 'border-2 border-slate-300 dark:border-slate-700'; badgeBg = 'bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
    shadowClass = selected ? 'shadow-lg' : 'shadow-sm';
  }

  if (isActive) {
    ringClass = 'ring-4 ring-offset-2 dark:ring-offset-slate-900';
    if (data.mathType === 'accepting' || data.mathType === 'initial_accepting') { ringClass += ' ring-emerald-400 dark:ring-emerald-500'; cardBg = 'bg-emerald-100/95 dark:bg-emerald-900/40'; shadowClass = 'shadow-2xl shadow-emerald-200 dark:shadow-emerald-900/50'; }
    else if (data.mathType === 'rejecting') { ringClass += ' ring-rose-400 dark:ring-rose-500'; cardBg = 'bg-rose-100/95 dark:bg-rose-900/40'; shadowClass = 'shadow-2xl shadow-rose-200 dark:shadow-rose-900/50'; }
    else if (data.mathType === 'initial' || data.type === 'trigger') { ringClass += ' ring-emerald-400 dark:ring-emerald-500 animate-pulse'; shadowClass = 'shadow-2xl shadow-emerald-200 dark:shadow-emerald-900/50'; }
    else if (data.type === 'action') { ringClass += ' ring-indigo-400 dark:ring-indigo-500 animate-pulse'; shadowClass = 'shadow-2xl shadow-indigo-200 dark:shadow-indigo-900/50'; }
    else { ringClass += ' ring-amber-400 dark:ring-amber-500 animate-pulse'; shadowClass = 'shadow-2xl shadow-amber-200 dark:shadow-amber-900/50'; }
  } else if (selected) {
    ringClass = 'ring-4 ring-slate-800 dark:ring-slate-400 ring-offset-1 dark:ring-offset-slate-900';
  }

  return (
    <div 
      className={`group relative flex flex-col w-[170px] min-h-[90px] rounded-xl p-3 ${borderClass} ${cardBg} ${shadowClass} ${ringClass} transition-all duration-200`}
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-6 !h-6 !bg-blue-600 text-white border-2 border-white dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity !-left-3 flex items-center justify-center rounded-full cursor-crosshair shadow-sm z-10"
      >
        <Plus size={14} />
      </Handle>
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-6 !h-6 !bg-blue-600 text-white border-2 border-white dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity !-right-3 flex items-center justify-center rounded-full cursor-crosshair shadow-sm z-10"
      >
        <Plus size={14} />
      </Handle>
      <Handle type="target" position={Position.Top} className="opacity-0 w-full h-2 rounded-none border-0 pt-0 mt-0 cursor-crosshair" />
      <Handle type="source" position={Position.Bottom} className="opacity-0 w-full h-2 rounded-none border-0 pb-0 mb-0 cursor-crosshair" />
      
      <div className="flex justify-between items-start gap-1 mb-1">
        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider font-bold border ${badgeBg}`}>
          {data.viewMode === 'math' ? data.mathState : `${data.mathType}`}
        </span>

        <div className="flex gap-1">
          {isActive && (
            <span className="flex h-1.5 w-1.5 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                (data.mathType === 'accepting' || data.mathType === 'initial_accepting') ? 'bg-emerald-400 dark:bg-emerald-500' : data.mathType === 'rejecting' ? 'bg-rose-400 dark:bg-rose-500' : 'bg-indigo-400 dark:bg-indigo-500'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                (data.mathType === 'accepting' || data.mathType === 'initial_accepting') ? 'bg-emerald-500 dark:bg-emerald-400' : data.mathType === 'rejecting' ? 'bg-rose-500 dark:bg-rose-400' : 'bg-indigo-500 dark:bg-indigo-400'
              }`}></span>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-start gap-1.5 mt-1 flex-1">
        {data.viewMode === 'user' && (
          <div className="p-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex-shrink-0 mt-0.5">
            {getIcon(data.type, data.mathType, isActive || false)}
          </div>
        )}
        <h4 className={`text-xs font-bold leading-tight whitespace-normal break-words flex-1 ${data.viewMode === 'math' ? 'text-center text-xl mt-2 text-indigo-700 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-100'}`}>
          {data.viewMode === 'math' ? data.mathState : data.label}
        </h4>
      </div>

      {data.viewMode === 'user' && (
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 whitespace-normal break-words leading-snug flex-1">
          {data.description}
        </p>
      )}

      {(data.mathType === 'initial' || data.mathType === 'initial_accepting') && (
        <span className="absolute -left-3 -top-3 bg-emerald-100 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 px-1 py-0.5 rounded text-[8px] font-mono text-emerald-700 dark:text-emerald-300 font-bold tracking-tighter uppercase whitespace-nowrap shadow-sm">
          ▶ Start
        </span>
      )}
      
      {(data.mathType === 'accepting' || data.mathType === 'initial_accepting') && (
        <div className="absolute -inset-1 rounded-xl border border-dashed border-emerald-400 dark:border-emerald-600 pointer-events-none opacity-60" />
      )}
    </div>
  );
}
