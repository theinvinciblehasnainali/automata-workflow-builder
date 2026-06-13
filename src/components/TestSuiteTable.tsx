import React, { useState } from 'react';
import { TestCase, EventType, WorkflowNode, WorkflowEdge, SavedTestSequence } from '../types/automata';
import { FlaskConical, CheckCircle, XCircle, ChevronDown, Play, FileCode, Save, Trash2 } from 'lucide-react';
import { evaluateSequence } from '../utils/automataEngine';

export interface CustomScenario {
  id: string;
  name: string;
  nodes: any[];
  edges: any[];
  alphabet: string[];
  testSequence: string;
  savedTestSequences: SavedTestSequence[];
}

interface TestSuiteTableProps {
  currentScenarioId: string;
  testCases: TestCase[];
  savedTestSequences: SavedTestSequence[];
  alphabet: EventType[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  currentSimulationId: number | string | null;
  status: 'idle' | 'running' | 'paused' | 'accepted' | 'rejected';
  onRunTest: (id: number) => void;
  onRunSavedSequence: (id: string) => void;
  onSaveSequence: (name: string, sequence: string) => void;
  onDeleteSequence: (id: string) => void;
}

export default function TestSuiteTable({
  currentScenarioId,
  testCases,
  savedTestSequences,
  alphabet,
  nodes,
  edges,
  currentSimulationId,
  status,
  onRunTest,
  onRunSavedSequence,
  onSaveSequence,
  onDeleteSequence
}: TestSuiteTableProps) {
  const [customInput, setCustomInput] = useState('');
  const [liveStatus, setLiveStatus] = useState<'IDLE' | 'ACCEPTED' | 'REJECTED'>('IDLE');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveSequenceName, setSaveSequenceName] = useState('');

  const handleLiveEvaluate = () => {
    const seqArr = customInput.split(',').map(s => s.trim()).filter(Boolean);
    const result = evaluateSequence(nodes, edges, seqArr);
    setLiveStatus(result.isAccepted ? 'ACCEPTED' : 'REJECTED');
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm mt-4 transition-colors duration-200">
      <details className="group" open>
        <summary className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between cursor-pointer select-none list-none font-bold text-xs text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <div className="flex items-center gap-2">
            <FlaskConical size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span>Compiled Test Suite & Custom Scenarios</span>
          </div>
          <ChevronDown size={14} className="text-slate-400 dark:text-slate-500 group-open:rotate-180 transition-transform duration-200" />
        </summary>
        
        <div className="max-h-[400px] overflow-auto bg-white dark:bg-slate-900 custom-scrollbar">
          <div className="w-full min-w-max">
            {currentScenarioId === 'default' && (
              <>
                <div className="px-4 py-2 bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Academic Preset Templates
                </div>
                <table className="w-full border-collapse font-mono text-[10px] text-left">
                  <thead className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-100 dark:border-slate-800 z-10 hidden">
                    <tr className="text-slate-500 dark:text-slate-400 text-[8px] font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-4 font-bold">ID</th>
                      <th className="py-2.5 px-3 font-bold w-full">Input Event Sequence (Tape)</th>
                      <th className="py-2.5 px-3 font-bold text-center">Prediction</th>
                      <th className="py-2.5 px-4 font-bold text-right">Execute</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {testCases.map((tc) => {
                      const isRunning = currentSimulationId === tc.id && status === 'running';
                      const isAccept = tc.expected === 'ACCEPT';
                      
                      return (
                        <tr key={tc.id} className={`transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-900 ${isRunning ? '!bg-indigo-50/50 dark:!bg-indigo-900/30' : ''}`}>
                          <td className="py-3 px-4 font-semibold text-slate-400 dark:text-slate-500">
                            #{tc.id.toString().padStart(2, '0')}
                          </td>
                          <td className="py-3 px-3 flex flex-wrap gap-1">
                            {tc.sequence.length === 0 ? (
                              <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-1 rounded font-bold italic">ε (lambda)</span>
                            ) : (
                              tc.sequence.map((ev, i) => {
                                const isInAlphabet = alphabet.includes(ev);
                                return (
                                  <span 
                                    key={i} 
                                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${
                                      isInAlphabet 
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                        : 'bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 underline decoration-rose-300 dark:decoration-rose-700'
                                    }`}
                                  >
                                    {ev}
                                  </span>
                                );
                              })
                            )}
                          </td>
                          <td className="py-3 px-3 text-center min-w-[70px]">
                            <span className={`inline-flex flex-col items-center justify-center gap-0.5 font-bold rounded px-2 py-1 text-[8px] tracking-wide uppercase ${
                              isAccept 
                                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                                : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                            }`}>
                              {isAccept ? <CheckCircle size={10} /> : <XCircle size={10} />}
                              {tc.expected}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => onRunTest(tc.id)}
                              disabled={status === 'running'}
                              className={`font-sans font-bold text-[9px] uppercase tracking-wide px-3 py-1.5 rounded-md transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border ${
                                isRunning
                                  ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm'
                                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-sm'
                              }`}
                            >
                              {isRunning ? 'Running' : 'Execute'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
              {/* Live custom evaluation row */}
              <table className="w-full border-collapse font-mono text-[10px] text-left">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                    <td className="py-3 px-4 font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <FileCode size={12} /> Live
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={customInput}
                        onChange={(e) => {
                          setCustomInput(e.target.value);
                          setLiveStatus('IDLE');
                        }}
                        placeholder="e.g. user_signup, email_delivered"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded px-2 py-1.5 text-[10px] font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
                      />
                    </td>
                    <td className="py-3 px-3 text-center min-w-[70px]">
                      {liveStatus === 'IDLE' ? (
                        <span className="inline-flex items-center justify-center font-bold rounded px-2 py-1 text-[8px] tracking-wide uppercase bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700">
                          Pending
                        </span>
                      ) : (
                        <span className={`inline-flex flex-col items-center justify-center gap-0.5 font-bold rounded px-2 py-1 text-[8px] tracking-wide uppercase ${
                          liveStatus === 'ACCEPTED'
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                            : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        }`}>
                          {liveStatus === 'ACCEPTED' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                          {liveStatus === 'ACCEPTED' ? 'ACCEPT' : 'REJECT'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end items-center gap-1 ml-auto">
                        <button
                          onClick={handleLiveEvaluate}
                          className="flex justify-center items-center gap-1 font-sans font-bold text-[9px] uppercase tracking-wide px-3 py-1.5 rounded-md transition-all duration-200 cursor-pointer bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm"
                        >
                          <Play size={10} className="fill-slate-700 dark:fill-slate-300" /> Execute
                        </button>
                        <button
                          onClick={() => {
                            if (customInput.trim() !== '') {
                              setSaveSequenceName('');
                              setIsSaveModalOpen(true);
                            }
                          }}
                          disabled={!customInput.trim()}
                          className="flex justify-center items-center gap-1 font-sans font-bold text-[9px] uppercase tracking-wide px-3 py-1.5 rounded-md transition-all duration-200 cursor-pointer bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save size={10} /> Save
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

          {savedTestSequences.length > 0 && (
            <>
              <div className="px-4 py-2 bg-indigo-50/50 dark:bg-indigo-900/20 border-y border-indigo-100 dark:border-indigo-900/50 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center justify-between">
                <span>👤 Saved Custom Testing Sequences</span>
                <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-1.5 rounded">{savedTestSequences.length}</span>
              </div>
              <table className="w-full border-collapse font-mono text-[10px] text-left">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {savedTestSequences.map(seq => {
                    const isRunning = currentSimulationId === seq.id && status === 'running';
                    const sequenceTokens = seq.sequence.split(',').map(s => s.trim()).filter(Boolean);

                    return (
                      <tr key={seq.id} className={`transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-900 ${isRunning ? '!bg-indigo-50/50 dark:!bg-indigo-900/30' : ''}`}>
                        <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 max-w-[150px] truncate">
                          {seq.name}
                        </td>
                        <td className="py-3 px-3 flex flex-wrap gap-1">
                          {sequenceTokens.length === 0 ? (
                            <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-1 rounded font-bold italic">ε (lambda)</span>
                          ) : (
                            sequenceTokens.map((ev, i) => (
                              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {ev}
                              </span>
                            ))
                          )}
                        </td>
                        <td className="py-3 px-3 text-center min-w-[70px]">
                           <span className="inline-flex items-center justify-center font-bold rounded px-2 py-1 text-[8px] tracking-wide uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                             Dynamic
                           </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end items-center gap-1 ml-auto">
                            <button
                              onClick={() => onRunSavedSequence(seq.id)}
                              disabled={status === 'running'}
                              className={`font-sans font-bold text-[9px] uppercase tracking-wide px-3 py-1.5 rounded-md flex items-center gap-1 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border ${
                                isRunning
                                  ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm'
                                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-sm'
                              }`}
                            >
                              <Play size={10} className={isRunning ? "fill-white" : "text-slate-500 dark:text-slate-400"} />
                              {isRunning ? 'Running' : 'Execute'}
                            </button>
                            <button
                              onClick={() => onDeleteSequence(seq.id)}
                              disabled={status === 'running'}
                              className="font-sans font-bold text-[9px] uppercase tracking-wide px-2 py-1.5 rounded-md flex items-center gap-1 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 shadow-sm"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
          </div>
        </div>
      </details>
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 text-left">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
              Save Custom Test Sequence
            </h3>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Sequence Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Happy Path, Edge Case 1"
                  value={saveSequenceName}
                  onChange={e => setSaveSequenceName(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none w-full"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && saveSequenceName.trim()) {
                      onSaveSequence(saveSequenceName.trim(), customInput.trim());
                      setIsSaveModalOpen(false);
                    } else if (e.key === 'Escape') {
                      setIsSaveModalOpen(false);
                    }
                  }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Sequence Data</label>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-xs font-mono select-all overflow-x-auto max-w-full">
                  {customInput.trim()}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => setIsSaveModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (saveSequenceName.trim()) {
                      onSaveSequence(saveSequenceName.trim(), customInput.trim());
                      setIsSaveModalOpen(false);
                    }
                  }}
                  disabled={!saveSequenceName.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Save Sequence
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
