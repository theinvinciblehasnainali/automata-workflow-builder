import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Node, 
  Edge,
  applyNodeChanges, 
  applyEdgeChanges,
  NodeChange,
  EdgeChange
} from '@xyflow/react';
import { Toaster, toast } from 'sonner';
import WorkflowCanvas from './components/WorkflowCanvas';
import ControlPanel from './components/ControlPanel';
import MathInspector from './components/MathInspector';
import TestSuiteTable, { CustomScenario } from './components/TestSuiteTable';
import { ThemeToggle } from './components/ThemeToggle';
import { WorkflowNode, WorkflowEdge, ViewMode, SimulationState, TestCase, EventType } from './types/automata';
import { evaluateSequence, getNextDfaState } from './utils/automataEngine';
import { Layout, Binary, Activity, Code2, AlertTriangle, CheckCircle2, Plus, Share2 } from 'lucide-react';

// Initial nodes from requirements
const initialNodes: WorkflowNode[] = [
  {
    id: 'q0', type: 'customNode', position: { x: 50, y: 150 },
    data: { label: 'User Signed Up', mathState: 'q₀', type: 'trigger', mathType: 'initial', description: 'Starts the workflow when a user registers.', parameters: {}, viewMode: 'user' }
  },
  {
    id: 'q1', type: 'customNode', position: { x: 300, y: 100 },
    data: { label: 'Send Welcome Email', mathState: 'q₁', type: 'action', mathType: 'normal', description: 'Dispatches the first onboarding email.', parameters: {}, viewMode: 'user' }
  },
  {
    id: 'q2', type: 'customNode', position: { x: 550, y: 150 },
    data: { label: 'Check Link Click', mathState: 'q₂', type: 'condition', mathType: 'normal', description: 'Checks if the user clicked the magic link.', parameters: {}, viewMode: 'user' }
  },
  {
    id: 'qacc', type: 'customNode', position: { x: 800, y: 50 },
    data: { label: 'Account Verified', mathState: 'q_acc', type: 'accept', mathType: 'accepting', description: 'Success state workflow halts.', parameters: {}, viewMode: 'user' }
  },
  {
    id: 'qrej', type: 'customNode', position: { x: 800, y: 250 },
    data: { label: 'Timeout Trap', mathState: 'q_rej', type: 'reject', mathType: 'rejecting', description: 'Failure state.', parameters: {}, viewMode: 'user' }
  }
];

// Initial edges matching DFA transitions
const initialEdges: WorkflowEdge[] = [
  { id: 'e-q0-q1', source: 'q0', target: 'q1', data: { triggerEvent: 'user_signup' } },
  { id: 'e-q1-q2', source: 'q1', target: 'q2', data: { triggerEvent: 'email_delivered' } },
  { id: 'e-q2-qacc', source: 'q2', target: 'qacc', data: { triggerEvent: 'link_clicked' } },
  { id: 'e-q2-qrej', source: 'q2', target: 'qrej', data: { triggerEvent: 'timeout' } },
  { id: 'e-q1-qrej', source: 'q1', target: 'qrej', data: { triggerEvent: 'email_failed' } },
  { id: 'e-q0-qrej', source: 'q0', target: 'qrej', data: { triggerEvent: 'timeout' } }
];

const initialTestCases: TestCase[] = [
  { id: 1, sequence: ['user_signup', 'email_delivered', 'link_clicked'], expected: 'ACCEPT', description: 'Standard successful execution.' },
  { id: 2, sequence: ['user_signup', 'email_delivered', 'link_clicked', 'email_delivered'], expected: 'ACCEPT', description: 'DFA accepts since final state q_acc loops.' },
  { id: 3, sequence: ['user_signup', 'email_delivered', 'link_clicked', 'timeout'], expected: 'ACCEPT', description: 'Accepting states persist.' },
  { id: 4, sequence: ['user_signup', 'email_delivered', 'link_clicked', 'user_signup'], expected: 'ACCEPT', description: 'Persists through multi-session token checks.' },
  { id: 5, sequence: ['user_signup', 'email_delivered', 'link_clicked', 'link_clicked'], expected: 'ACCEPT', description: 'Continuous clicking stays accepted.' },
  { id: 6, sequence: ['user_signup'], expected: 'REJECT', description: 'Incomplete sequence.' },
  { id: 7, sequence: ['user_signup', 'email_delivered'], expected: 'REJECT', description: 'Halted in q2.' },
  { id: 8, sequence: ['user_signup', 'email_failed'], expected: 'REJECT', description: 'Bounces to trap.' },
  { id: 9, sequence: ['user_signup', 'email_delivered', 'timeout'], expected: 'REJECT', description: 'Timeout occurs while waiting.' },
  { id: 10, sequence: ['email_delivered', 'link_clicked'], expected: 'REJECT', description: 'Invalid start rejects.' }
];

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('user');
  const [currentScenarioId, setCurrentScenarioId] = useState<string>('default');
  const [userCreatedCases, setUserCreatedCases] = useState<CustomScenario[]>([]);

  const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes);
  const [edges, setEdges] = useState<WorkflowEdge[]>(initialEdges);
  const [alphabet, setAlphabet] = useState<EventType[]>(['user_signup', 'email_delivered', 'link_clicked', 'email_failed', 'timeout']);
  
  const [testSequence, setTestSequence] = useState<string>('user_signup, email_delivered, link_clicked');
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const [pendingConnection, setPendingConnection] = useState<{source: string, target: string} | null>(null);
  const [pendingEvent, setPendingEvent] = useState<string>('');

  const [simState, setSimState] = useState<SimulationState>({
    currentTestCaseId: null,
    activeNodeId: 'q0',
    inputIndex: 0,
    status: 'idle',
    history: []
  });

  const simInterval = useRef<NodeJS.Timeout | null>(null);

  // Sync auto-save for custom scenarios
  useEffect(() => {
    if (currentScenarioId !== 'default') {
      setUserCreatedCases(prev => prev.map(s => 
        s.id === currentScenarioId 
          ? { ...s, nodes, edges, alphabet, testSequence } 
          : s
      ));
    }
  }, [nodes, edges, alphabet, testSequence, currentScenarioId]);

  // Sync viewMode to node data so custom nodes re-render correctly
  useEffect(() => {
    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, viewMode }
    })));
  }, [viewMode]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds) as unknown as WorkflowNode[]),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds) as unknown as WorkflowEdge[]),
    []
  );

  const handleCreateCustomScenario = () => {
    const newId = `custom-${Date.now()}`;
    const newScenario: CustomScenario = {
      id: newId,
      name: `Custom Scenario ${userCreatedCases.length + 1}`,
      nodes: [],
      edges: [],
      alphabet: ['custom_event'],
      testSequence: 'custom_event'
    };
    setUserCreatedCases(prev => [...prev, newScenario]);
    setCurrentScenarioId(newId);
    setNodes([]);
    setEdges([]);
    setAlphabet(['custom_event']);
    setTestSequence('custom_event');
    setSimState(s => ({ ...s, status: 'idle' }));
  };

  const handleSelectScenario = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id === 'default') {
      setCurrentScenarioId('default');
      setNodes(initialNodes.map(n => ({ ...n, data: { ...n.data, viewMode } })));
      setEdges(initialEdges);
      setAlphabet(['user_signup', 'email_delivered', 'link_clicked', 'email_failed', 'timeout']);
      setTestSequence('user_signup, email_delivered, link_clicked');
    } else {
      const scenario = userCreatedCases.find(s => s.id === id);
      if (scenario) {
        setCurrentScenarioId(id);
        setNodes(scenario.nodes.map(n => ({ ...n, data: { ...n.data, viewMode } })));
        setEdges(scenario.edges);
        setAlphabet(scenario.alphabet);
        setTestSequence(scenario.testSequence);
      }
    }
    setSimState(s => ({ ...s, status: 'idle' }));
  };

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  };

  const handleNodeDoubleClick = (event: React.MouseEvent, node: Node) => {
    setEditingNodeId(node.id);
  };

  const handleUpdateNodeDetails = (id: string, details: Partial<WorkflowNode['data']>) => {
    setNodes(nds => nds.map(n => {
      if (n.id === id) return { ...n, data: { ...n.data, ...details } };
      return n;
    }));
  };

  const handleAddAlphabetTrigger = (trigger: string) => {
    setAlphabet(prev => [...prev, trigger]);
  };

  const handleRemoveAlphabetTrigger = (trigger: string) => {
    setAlphabet(prev => prev.filter(t => t !== trigger));
    setEdges(prev => prev.filter(e => e.data?.triggerEvent !== trigger));
  };

  const handleAddEdge = (source: string, target: string, event: string) => {
    const id = `e-${source}-${target}-${Date.now()}`;
    setEdges(prev => [...prev, { id, source, target, data: { triggerEvent: event } }]);
  };

  const handleSaveConnection = () => {
    if (pendingConnection && pendingEvent) {
      handleAddEdge(pendingConnection.source, pendingConnection.target, pendingEvent);
      toast.success(`Transition Linked: ${pendingConnection.source} -> ${pendingEvent} -> ${pendingConnection.target}`);
      setPendingConnection(null);
      setPendingEvent('');
    }
  };

  const handleRemoveEdge = (id: string) => {
    setEdges(prev => prev.filter(e => e.id !== id));
  };

  const handleAddNode = () => {
    const newId = `q_${nodes.length + Date.now().toString().slice(-4)}`;
    const newNode: WorkflowNode = {
      id: newId,
      type: 'customNode',
      position: { x: 400, y: 300 },
      data: {
        label: 'New State',
        mathState: newId,
        type: 'condition',
        mathType: 'normal',
        description: 'Dynamically added state.',
        parameters: {},
        viewMode
      }
    };
    setNodes(prev => [...prev, newNode]);
    setEditingNodeId(newId);
  };

  const executeSequence = (sequence: EventType[], testId: number | string | null, freshNodes: WorkflowNode[], freshEdges: WorkflowEdge[]) => {
    if (simInterval.current) clearInterval(simInterval.current);
    
    // reset edges and nodes animation
    setEdges(eds => eds.map(e => ({ ...e, data: { ...e.data, isActive: false } })));
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, isActive: false } })));
    
    const initialNode = freshNodes.find(n => n.data.mathType === 'initial') || freshNodes[0];
    if (!initialNode) {
      alert("Please ensure at least one initial state exists.");
      return;
    }
    
    let currentStateString = initialNode.id;
    let currentIndex = 0;

    setSimState({
      currentTestCaseId: testId,
      activeNodeId: currentStateString,
      inputIndex: 0,
      status: 'running',
      history: []
    });

    simInterval.current = setInterval(() => {
      if (currentIndex >= sequence.length) {
        clearInterval(simInterval.current!);
        const finalMatch = freshNodes.find(n => n.id === currentStateString);
        setSimState(prev => ({
          ...prev,
          status: finalMatch?.data.mathType === 'accepting' ? 'accepted' : 'rejected'
        }));
        setNodes(nds => nds.map(n => ({
          ...n,
          data: { ...n.data, isActive: n.id === currentStateString }
        })));
        return;
      }

      const event = sequence[currentIndex];
      const prevState = currentStateString;
      
      let nextState: string | null = null;
      if (prevState !== null) {
        nextState = getNextDfaState(freshNodes, freshEdges, prevState, event);
      }

      if (nextState === null) {
        // Machine halts/rejects
        clearInterval(simInterval.current!);
        setSimState(prev => ({ ...prev, status: 'rejected' }));
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, isActive: false } })));
        return;
      }

      // Update UI glow states
      setNodes(nds => nds.map(n => ({
        ...n,
        data: { ...n.data, isActive: n.id === nextState }
      })));

      setEdges(eds => eds.map(e => {
        const isCurrentEdgeActive = e.source === prevState && e.target === nextState && e.data?.triggerEvent === event;
        return {
          ...e,
          data: { ...e.data, isActive: isCurrentEdgeActive || e.data?.isActive }
        };
      }));

      currentStateString = nextState;
      currentIndex++;
      setSimState(prev => ({
        ...prev,
        activeNodeId: nextState,
        inputIndex: currentIndex
      }));
    }, 1000);
  };

  const handleTestExecute = () => {
    const sequence = testSequence.split(',').map(s => s.trim()).filter(Boolean);
    executeSequence(sequence, null, nodes, edges);
  };

  const handleRunTestCase = (id: number) => {
    const tc = initialTestCases.find(t => t.id === id);
    if (tc) {
      setTestSequence(tc.sequence.join(', '));
      executeSequence(tc.sequence, id, nodes, edges);
    }
  };

  const handleRunCustomScenario = (id: string) => {
    // If it's already active scenario just run
    let targetNodes = nodes;
    let targetEdges = edges;
    let sequence = '';
    
    if (id !== currentScenarioId) {
      const scenario = userCreatedCases.find(s => s.id === id);
      if (scenario) {
        setCurrentScenarioId(id);
        setNodes(scenario.nodes.map(n => ({ ...n, data: { ...n.data, viewMode } })));
        setEdges(scenario.edges);
        setAlphabet(scenario.alphabet);
        setTestSequence(scenario.testSequence);
        targetNodes = scenario.nodes;
        targetEdges = scenario.edges;
        sequence = scenario.testSequence;
      }
    } else {
      sequence = testSequence;
    }

    const seqArr = sequence.split(',').map(s => s.trim()).filter(Boolean);
    // ensure state updates before execution
    setTimeout(() => {
      executeSequence(seqArr, id, targetNodes, targetEdges);
    }, 50);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex flex-col font-sans transition-colors duration-200">
      <Toaster position="bottom-right" richColors />
      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex flex-col lg:flex-row lg:items-center justify-between shadow-sm gap-4 transition-colors duration-200">
        
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Automata Workflow Builder
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-wide uppercase">
              Formal State Machine Compiler
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row w-full lg:w-auto items-start lg:items-center gap-4">
          
          {/* Multi-scenario dropdown selector */}
          <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center gap-2 lg:border-r border-slate-200 dark:border-slate-700 lg:pr-4">
            <select 
              value={currentScenarioId}
              onChange={handleSelectScenario}
              className="w-full sm:w-auto bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 shadow-sm"
            >
              <option value="default">Default: Academic Preset Model</option>
              {userCreatedCases.map(s => (
                <option key={s.id} value={s.id}>{s.name} (Custom)</option>
              ))}
            </select>
            <button
              onClick={handleCreateCustomScenario}
              className="w-full sm:w-auto justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-lg px-3 py-2 flex items-center gap-1.5 transition-colors shadow-sm whitespace-nowrap"
            >
              <Plus size={14} /> Create Custom Scenario
            </button>
          </div>

          <div className="flex flex-col sm:flex-row w-full sm:w-auto items-start sm:items-center gap-4">
            <ThemeToggle />

            {/* High-contrast toggle */}
            <div className="flex w-full sm:w-auto bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-lg border border-slate-300 dark:border-slate-700 shadow-inner">
              <button
                onClick={() => setViewMode('user')}
                className={`flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  viewMode === 'user'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-400 dark:border-slate-600'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 duration-200'
                }`}
              >
                <Layout size={14} /> User View
              </button>
              <button
                onClick={() => setViewMode('math')}
                className={`flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  viewMode === 'math'
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-900 dark:bg-slate-950 dark:border-slate-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 duration-200'
                }`}
              >
                <Binary size={14} /> Automata Math Mode
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Main Board */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Col: Tools & Inspector */}
        <div className="col-span-1 flex flex-col gap-6">
          <ControlPanel 
            alphabet={alphabet}
            nodes={nodes}
            viewMode={viewMode}
            onAddAlphabetTrigger={handleAddAlphabetTrigger}
            onRemoveAlphabetTrigger={handleRemoveAlphabetTrigger}
            onAddEdge={handleAddEdge}
            onAddNode={handleAddNode}
          />
          <MathInspector 
            nodes={nodes}
            edges={edges}
            alphabet={alphabet}
            viewMode={viewMode}
            selectedNode={selectedNodeId ? nodes.find(n => n.id === selectedNodeId) || null : null}
            onUpdateNodeDetails={handleUpdateNodeDetails}
            onRemoveEdge={handleRemoveEdge}
          />
        </div>

        {/* Center Canvas */}
        <div className="col-span-1 lg:col-span-3 flex flex-col gap-4">
          <WorkflowCanvas
            nodes={nodes}
            edges={edges}
            viewMode={viewMode}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            testSequence={testSequence}
            onTestSequenceChange={setTestSequence}
            onExecute={handleTestExecute}
            onConnectRequest={(source, target) => {
              setPendingConnection({ source, target });
              setPendingEvent('');
            }}
          />
          <TestSuiteTable 
            testCases={initialTestCases}
            userCreatedCases={userCreatedCases}
            alphabet={alphabet}
            nodes={nodes}
            edges={edges}
            currentSimulationId={simState.currentTestCaseId}
            status={simState.status}
            onRunTest={handleRunTestCase}
            onRunCustomScenario={handleRunCustomScenario}
          />
        </div>

      </main>

      {/* Inline Modal for Node Editing */}
      {editingNodeId && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
              Configuration: {nodes.find(n => n.id === editingNodeId)?.data.mathState}
            </h3>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">SaaS Label (User View)</label>
                <input 
                  type="text"
                  value={nodes.find(n => n.id === editingNodeId)?.data.label || ''}
                  onChange={e => handleUpdateNodeDetails(editingNodeId, { label: e.target.value })}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Math State Tuple (Q)</label>
                <input 
                  type="text"
                  value={nodes.find(n => n.id === editingNodeId)?.data.mathState || ''}
                  onChange={e => handleUpdateNodeDetails(editingNodeId, { mathState: e.target.value })}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-400 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Math Type (Role definition)</label>
                <select 
                  value={nodes.find(n => n.id === editingNodeId)?.data.mathType || 'normal'}
                  onChange={e => handleUpdateNodeDetails(editingNodeId, { mathType: e.target.value as any })}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                >
                  <option value="initial">Initial (Start)</option>
                  <option value="normal">Normal Transition</option>
                  <option value="accepting">Accepting Success (F)</option>
                  <option value="rejecting">Rejecting / Trap</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Description</label>
                <textarea 
                  rows={2}
                  value={nodes.find(n => n.id === editingNodeId)?.data.description || ''}
                  onChange={e => handleUpdateNodeDetails(editingNodeId, { description: e.target.value })}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => setEditingNodeId(null)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-xs font-bold transition-colors"
                >
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Edge/Transition Modal */}
      {pendingConnection && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
              <Share2 className="text-emerald-500 w-4 h-4" /> Add Transition
            </h3>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Source State (From)</label>
                <select 
                  value={pendingConnection.source}
                  onChange={e => setPendingConnection({ ...pendingConnection, source: e.target.value })}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none"
                >
                  {nodes.map(n => <option key={n.id} value={n.id}>{viewMode === 'math' ? n.data.mathState : n.data.label}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Target State (To)</label>
                <select 
                  value={pendingConnection.target}
                  onChange={e => setPendingConnection({ ...pendingConnection, target: e.target.value })}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none"
                >
                  {nodes.map(n => <option key={n.id} value={n.id}>{viewMode === 'math' ? n.data.mathState : n.data.label}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Trigger Event (Σ)</label>
                <select 
                  value={pendingEvent}
                  onChange={e => setPendingEvent(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none"
                >
                  <option value="">Select Trigger...</option>
                  {alphabet.map(sym => <option key={sym} value={sym}>{sym}</option>)}
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => {
                    setPendingConnection(null);
                    setPendingEvent('');
                  }}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveConnection}
                  disabled={!pendingEvent}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white px-5 py-2 rounded-lg text-xs font-bold transition-colors"
                >
                  Save Connection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
