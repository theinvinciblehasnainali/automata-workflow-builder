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
import { saveToStorage, loadFromStorage } from './utils/storage';
import { WorkflowNode, WorkflowEdge, ViewMode, SimulationState, TestCase, EventType, SavedTestSequence } from './types/automata';
import { evaluateSequence, getNextDfaState } from './utils/automataEngine';
import { reToDfa } from './utils/reToDfa';
import { Layout, Binary, Activity, Code2, AlertTriangle, CheckCircle2, Plus, Share2, Trash2, Edit2, RefreshCw } from 'lucide-react';

// Initial nodes from requirements
const initialNodes: WorkflowNode[] = [
  {
    id: 'q0', type: 'customNode', position: { x: 50, y: 150 },
    data: { label: 'IDLE / LISTENING', mathState: 'q₀', type: 'trigger', mathType: 'initial', description: 'Waiting for connection.', parameters: {}, viewMode: 'user' }
  },
  {
    id: 'q1', type: 'customNode', position: { x: 300, y: 100 },
    data: { label: 'TRUSTED_SESSION', mathState: 'q₁', type: 'action', mathType: 'normal', description: 'Active, clean data streaming.', parameters: {}, viewMode: 'user' }
  },
  {
    id: 'q2', type: 'customNode', position: { x: 550, y: 150 },
    data: { label: 'RISK_AUDIT', mathState: 'q₂', type: 'condition', mathType: 'normal', description: 'Suspicious anomaly or data leak detected.', parameters: {}, viewMode: 'user' }
  },
  {
    id: 'qacc', type: 'customNode', position: { x: 800, y: 50 },
    data: { label: 'SAFE_TERMINATED', mathState: 'q_acc', type: 'accept', mathType: 'accepting', description: 'Connection gracefully closed.', parameters: {}, viewMode: 'user' }
  },
  {
    id: 'qrej', type: 'customNode', position: { x: 800, y: 250 },
    data: { label: 'BLOCKED_TRAFFIC', mathState: 'q_rej', type: 'reject', mathType: 'rejecting', description: 'Threat neutralized / Trap state.', parameters: {}, viewMode: 'user' }
  }
];

// Initial edges matching DFA transitions
const initialEdges: WorkflowEdge[] = [
  { id: 'e-q0-q1', source: 'q0', target: 'q1', data: { triggerEvent: 'connect' } },
  { id: 'e-q1-q1', source: 'q1', target: 'q1', data: { triggerEvent: 'scan_clean' } },
  { id: 'e-q1-q2', source: 'q1', target: 'q2', data: { triggerEvent: 'scan_risk' } },
  { id: 'e-q1-qacc', source: 'q1', target: 'qacc', data: { triggerEvent: 'terminate' } },
  { id: 'e-q2-q2', source: 'q2', target: 'q2', data: { triggerEvent: 'scan_clean' } },
  { id: 'e-q2-qrej1', source: 'q2', target: 'qrej', data: { triggerEvent: 'scan_risk' } },
  { id: 'e-q2-q1', source: 'q2', target: 'q1', data: { triggerEvent: 'bypass_verify' } },
  { id: 'e-q2-qrej2', source: 'q2', target: 'qrej', data: { triggerEvent: 'terminate' } },
  { id: 'e-qrej-qrej1', source: 'qrej', target: 'qrej', data: { triggerEvent: 'connect' } },
  { id: 'e-qrej-qrej2', source: 'qrej', target: 'qrej', data: { triggerEvent: 'scan_clean' } },
  { id: 'e-qrej-qrej3', source: 'qrej', target: 'qrej', data: { triggerEvent: 'scan_risk' } },
  { id: 'e-qrej-qrej4', source: 'qrej', target: 'qrej', data: { triggerEvent: 'bypass_verify' } },
  { id: 'e-qrej-qrej5', source: 'qrej', target: 'qrej', data: { triggerEvent: 'terminate' } }
];

const initialTestCases: TestCase[] = [
  { id: 1, sequence: ['connect', 'terminate'], expected: 'ACCEPT', description: 'Minimal valid connection.' },
  { id: 2, sequence: ['connect', 'scan_clean', 'scan_clean', 'scan_clean', 'terminate'], expected: 'ACCEPT', description: 'Standard long-running data transmission.' },
  { id: 3, sequence: ['connect', 'scan_risk', 'bypass_verify', 'terminate'], expected: 'ACCEPT', description: 'Suspicious flag raised but verified clean.' },
  { id: 4, sequence: ['connect', 'scan_clean', 'scan_risk', 'scan_clean', 'bypass_verify', 'terminate'], expected: 'ACCEPT', description: 'Data processing continues under audit, then resolved.' },
  { id: 5, sequence: ['connect', 'scan_risk', 'bypass_verify', 'scan_risk', 'bypass_verify', 'terminate'], expected: 'ACCEPT', description: 'Alternating threat alerts and clears.' },
  { id: 6, sequence: ['scan_clean'], expected: 'REJECT', description: 'No active session handshake.' },
  { id: 7, sequence: ['connect', 'scan_clean', 'scan_risk', 'scan_risk'], expected: 'REJECT', description: 'Double consecutive risk flags send to block.' },
  { id: 8, sequence: ['connect', 'scan_risk', 'terminate'], expected: 'REJECT', description: 'Dropping connection mid-audit forces quarantine.' },
  { id: 9, sequence: ['connect', 'scan_risk', 'scan_risk', 'bypass_verify'], expected: 'REJECT', description: 'Trap state ignores override keys.' },
  { id: 10, sequence: ['connect', 'scan_clean'], expected: 'REJECT', description: 'Incomplete sequence, stream never terminated.' }
];

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('user');

  // Load from local storage once at init
  const savedState = loadFromStorage();

  const [currentScenarioId, setCurrentScenarioId] = useState<string>(savedState?.currentScenarioId ?? 'default');
  const [userCreatedCases, setUserCreatedCases] = useState<CustomScenario[]>(savedState?.userCreatedCases ?? []);
  
  const [defaultScenarioState, setDefaultScenarioState] = useState(savedState?.defaultScenarioState || {
    nodes: initialNodes,
    edges: initialEdges,
    alphabet: ['connect', 'scan_clean', 'scan_risk', 'bypass_verify', 'terminate'],
    testSequence: 'connect, scan_clean, terminate',
    savedTestSequences: []
  });

  const getInitialState = (scenarioId: string) => {
    if (scenarioId === 'default') return defaultScenarioState;
    const scenario = (savedState?.userCreatedCases || []).find((s: CustomScenario) => s.id === scenarioId);
    if (scenario) return scenario;
    return defaultScenarioState;
  };

  const initialCurrentState = getInitialState(savedState?.currentScenarioId ?? 'default');

  const [nodes, setNodes] = useState<WorkflowNode[]>(initialCurrentState.nodes);
  const [edges, setEdges] = useState<WorkflowEdge[]>(initialCurrentState.edges);
  const [alphabet, setAlphabet] = useState<EventType[]>(initialCurrentState.alphabet);
  const [testSequence, setTestSequence] = useState<string>(initialCurrentState.testSequence);
  const [savedTestSequences, setSavedTestSequences] = useState<SavedTestSequence[]>(initialCurrentState.savedTestSequences || []);

  // Auto-save any changes to local storage
  useEffect(() => {
    saveToStorage({
      currentScenarioId,
      defaultScenarioState,
      userCreatedCases,
      nodes,
      edges,
      alphabet,
      testSequence
    });
  }, [currentScenarioId, defaultScenarioState, userCreatedCases, nodes, edges, alphabet, testSequence]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const [pendingConnection, setPendingConnection] = useState<{id?: string, source: string, target: string} | null>(null);
  const [pendingEvent, setPendingEvent] = useState<string>('');

  const [contextMenu, setContextMenu] = useState<{type: 'node'|'edge'|'canvas', id: string, x: number, y: number} | null>(null);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [addEventInputValue, setAddEventInputValue] = useState("");

  const [simState, setSimState] = useState<SimulationState>({
    currentTestCaseId: null,
    activeNodeId: 'q0',
    inputIndex: 0,
    status: 'idle',
    history: []
  });

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameInputValue, setRenameInputValue] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // RE → DFA confirmation modal
  const [pendingReString, setPendingReString] = useState<string | null>(null);
  const [reGenerateError, setReGenerateError] = useState<string | null>(null);

  const simInterval = useRef<NodeJS.Timeout | null>(null);

  // Sync auto-save for scenarios
  useEffect(() => {
    if (currentScenarioId === 'default') {
      setDefaultScenarioState({ nodes, edges, alphabet, testSequence, savedTestSequences });
    } else {
      setUserCreatedCases(prev => prev.map(s => 
        s.id === currentScenarioId 
          ? { ...s, nodes, edges, alphabet, testSequence, savedTestSequences } 
          : s
      ));
    }
  }, [nodes, edges, alphabet, testSequence, savedTestSequences, currentScenarioId]);

  // Sync viewMode to node data so custom nodes re-render correctly
  useEffect(() => {
    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, viewMode }
    })));
  }, [viewMode]);

  // Toast notification on simulation complete
  useEffect(() => {
    if (simState.status === 'accepted') {
      toast.success('Sequence Accepted!');
    } else if (simState.status === 'rejected') {
      toast.error('Sequence Rejected!');
    }
  }, [simState.status]);

  // Global Event Listeners
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if ((e.target as Element).closest('.context-menu-container')) return;
      setContextMenu(null);
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setIsAddEventModalOpen(false);
        setIsDeleteModalOpen(false);
        setIsRenameModalOpen(false);
        setEditingNodeId(null);
        setPendingConnection(null);
        setPendingReString(null);
      }
      
      if (e.key === 'Enter') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        if (selectedNodeId && !editingNodeId) {
          setEditingNodeId(selectedNodeId);
        }
      }
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        
        if (selectedNodeId) {
          // Re-implement the deletion logic locally to avoid stale closures, or rely on state.
          // Since selectedNodeId is in the dependency array, we can just call it.
          // Note: handleDeleteNode uses state setters which don't need to be in deps.
          setNodes(prev => prev.filter(n => n.id !== selectedNodeId));
          setEdges(prev => prev.filter(edge => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
          toast.success('State deleted via keyboard.');
          if (editingNodeId === selectedNodeId) setEditingNodeId(null);
          setContextMenu(null);
          setSelectedNodeId(null);
        }
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedNodeId, editingNodeId]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds) as unknown as WorkflowNode[]),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds) as unknown as WorkflowEdge[]),
    []
  );

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({ type: 'node', id: node.id, x: event.clientX, y: event.clientY });
  }, []);

  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    setContextMenu({ type: 'edge', id: edge.id, x: event.clientX, y: event.clientY });
  }, []);

  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ type: 'canvas', id: 'canvas', x: event.clientX, y: event.clientY });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    const fullEdge = edges.find(e => e.id === edge.id);
    if (fullEdge) {
      setPendingConnection({ id: fullEdge.id, source: fullEdge.source, target: fullEdge.target });
      setPendingEvent(fullEdge.data?.triggerEvent || '');
    }
  }, [edges]);

  const handleCreateCustomScenario = () => {
    const newId = `custom-${Date.now()}`;
    const newScenario: CustomScenario = {
      id: newId,
      name: `Custom Scenario ${userCreatedCases.length + 1}`,
      nodes: [],
      edges: [],
      alphabet: [],
      testSequence: '',
      savedTestSequences: []
    };
    setUserCreatedCases(prev => [...prev, newScenario]);
    setCurrentScenarioId(newId);
    setNodes([]);
    setEdges([]);
    setAlphabet([]);
    setTestSequence('');
    setSavedTestSequences([]);
    setSimState(s => ({ ...s, status: 'idle' }));
  };

  const handleDeleteScenarioClick = () => {
    if (currentScenarioId === 'default') {
      toast.error('The default academic preset cannot be deleted.');
      return;
    }
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    setUserCreatedCases(prev => prev.filter(s => s.id !== currentScenarioId));
    
    // reset to default
    setCurrentScenarioId('default');
    setNodes(defaultScenarioState.nodes.map(n => ({ ...n, data: { ...n.data, viewMode } })));
    setEdges(defaultScenarioState.edges);
    setAlphabet(defaultScenarioState.alphabet);
    setTestSequence(defaultScenarioState.testSequence);
    setSavedTestSequences(defaultScenarioState.savedTestSequences || []);
    setSimState(s => ({ ...s, status: 'idle' }));
    toast.success('Scenario deleted.');
    setIsDeleteModalOpen(false);
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
  };

  const handleRenameScenarioClick = () => {
    if (currentScenarioId === 'default') {
      toast.error('The default academic preset cannot be renamed.');
      return;
    }
    const scenario = userCreatedCases.find(s => s.id === currentScenarioId);
    if (!scenario) return;

    setRenameInputValue(scenario.name);
    setIsRenameModalOpen(true);
  };

  const confirmRename = () => {
    if (renameInputValue.trim() !== '') {
      setUserCreatedCases(prev => prev.map(s => s.id === currentScenarioId ? { ...s, name: renameInputValue.trim() } : s));
      toast.success('Scenario renamed.');
    }
    setIsRenameModalOpen(false);
  };

  const cancelRename = () => {
    setIsRenameModalOpen(false);
  };

  const handleSelectScenario = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id === 'default') {
      setCurrentScenarioId('default');
      setNodes(defaultScenarioState.nodes.map(n => ({ ...n, data: { ...n.data, viewMode } })));
      setEdges(defaultScenarioState.edges);
      setAlphabet(defaultScenarioState.alphabet);
      setTestSequence(defaultScenarioState.testSequence);
      setSavedTestSequences(defaultScenarioState.savedTestSequences || []);
    } else {
      const scenario = userCreatedCases.find(s => s.id === id);
      if (scenario) {
        setCurrentScenarioId(id);
        setNodes(scenario.nodes.map(n => ({ ...n, data: { ...n.data, viewMode } })));
        setEdges(scenario.edges);
        setAlphabet(scenario.alphabet);
        setTestSequence(scenario.testSequence);
        setSavedTestSequences(scenario.savedTestSequences || []);
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
      if (pendingConnection.id) {
        setEdges(prev => prev.map(e => e.id === pendingConnection.id ? { ...e, source: pendingConnection.source, target: pendingConnection.target, data: { triggerEvent: pendingEvent } } : e));
        toast.success(`Transition Updated: ${pendingConnection.source} -> ${pendingEvent} -> ${pendingConnection.target}`);
      } else {
        handleAddEdge(pendingConnection.source, pendingConnection.target, pendingEvent);
        toast.success(`Transition Linked: ${pendingConnection.source} -> ${pendingEvent} -> ${pendingConnection.target}`);
      }
      setPendingConnection(null);
      setPendingEvent('');
    }
  };

  const handleRemoveEdge = (id: string) => {
    setEdges(prev => prev.filter(e => e.id !== id));
  };

  const handleDeleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
    toast.success('State deleted.');
    if (editingNodeId === id) setEditingNodeId(null);
    setContextMenu(null);
  };

  const handleDeleteEdge = (id: string) => {
    setEdges(prev => prev.filter(e => e.id !== id));
    toast.success('Transition deleted.');
    setContextMenu(null);
    if (pendingConnection?.id === id) {
      setPendingConnection(null);
      setPendingEvent('');
    }
  };

  const handleContextMenuEdit = () => {
    if (contextMenu) {
      if (contextMenu.type === 'node') {
        setEditingNodeId(contextMenu.id);
      } else if (contextMenu.type === 'edge') {
        const fullEdge = edges.find(e => e.id === contextMenu.id);
        if (fullEdge) {
          setPendingConnection({ id: fullEdge.id, source: fullEdge.source, target: fullEdge.target });
          setPendingEvent(fullEdge.data?.triggerEvent || '');
        }
      }
      closeContextMenu();
    }
  };

  const handleContextMenuDelete = () => {
    if (contextMenu) {
      if (contextMenu.type === 'node') {
        handleDeleteNode(contextMenu.id);
      } else if (contextMenu.type === 'edge') {
        handleDeleteEdge(contextMenu.id);
      }
      closeContextMenu();
    }
  };

  const handleCanvasReset = () => {
    if (currentScenarioId === 'default') return;
    setNodes([]);
    setEdges([]);
    toast.success('Canvas reset.');
  };

  const handleGlobalReset = () => {
    if (currentScenarioId === 'default') return;
    setNodes([]);
    setEdges([]);
    setAlphabet([]);
    setTestSequence('');
    setSavedTestSequences([]);
    toast.success('System completely purged.');
  };

  const handleRestoreDefaults = () => {
    if (currentScenarioId !== 'default') return;
    setNodes(initialNodes.map(n => ({ ...n, data: { ...n.data, viewMode } })));
    setEdges(initialEdges);
    setAlphabet(['connect', 'scan_clean', 'scan_risk', 'bypass_verify', 'terminate']);
    setTestSequence('connect, scan_clean, terminate');
    setSavedTestSequences([]);
    toast.success('Academic defaults restored.');
  };

  // RE → DFA: open confirmation modal
  const handleGenerateDfaRequest = (re: string) => {
    setReGenerateError(null);
    setPendingReString(re);
  };

  // RE → DFA: user confirmed — compile and replace canvas
  const handleConfirmGenerate = () => {
    if (!pendingReString) return;
    const result = reToDfa(pendingReString, alphabet);
    if (result.error) {
      setReGenerateError(result.error);
      // Keep modal open so user can read the error
      return;
    }
    // Apply viewMode to generated nodes
    const nodesWithMode = result.nodes.map(n => ({ ...n, data: { ...n.data, viewMode } }));
    setNodes(nodesWithMode);
    setEdges(result.edges);
    setTestSequence('');
    setSavedTestSequences([]);
    setPendingReString(null);
    setReGenerateError(null);
    toast.success(`${viewMode === 'math' ? 'DFA' : 'Workflow'} generated successfully — ${result.nodes.length} states, ${result.edges.length} transitions.`);
  };

  const confirmAddEvent = () => {
    if (addEventInputValue.trim() !== '') {
      const trigger = addEventInputValue.trim();
      if (!alphabet.includes(trigger)) {
        setAlphabet(prev => [...prev, trigger]);
        toast.success(`Event Trigger '${trigger}' added.`);
      } else {
        toast.error('Event Trigger already exists.');
      }
    }
    setIsAddEventModalOpen(false);
    setAddEventInputValue('');
  };

  const handleAddNode = () => {
    let nextIndex = 0;
    while (nodes.some(n => n.id === `q_${nextIndex}` || n.id === `q${nextIndex}`)) {
      nextIndex++;
    }
    const newId = `q_${nextIndex}`;
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
    
    const initialNode = freshNodes.find(n => n.data.mathType === 'initial' || n.data.mathType === 'initial_accepting') || freshNodes[0];
    if (!initialNode) {
      toast.error("Please ensure at least one initial state exists.");
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
          status: (finalMatch?.data.mathType === 'accepting' || finalMatch?.data.mathType === 'initial_accepting') ? 'accepted' : 'rejected'
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

  const handleRunSavedSequence = (id: string) => {
    const seq = savedTestSequences.find(s => s.id === id);
    if (seq) {
      setTestSequence(seq.sequence);
      const seqArr = seq.sequence.split(',').map(s => s.trim()).filter(Boolean);
      executeSequence(seqArr, id, nodes, edges);
    }
  };

  const handleSaveSequence = (name: string, sequence: string) => {
    const newSeq = { id: `seq-${Date.now()}`, name, sequence };
    setSavedTestSequences(prev => [...prev, newSeq]);
    toast.success(`Sequence '${name}' saved.`);
  };

  const handleDeleteSequence = (id: string) => {
    setSavedTestSequences(prev => prev.filter(s => s.id !== id));
    toast.success('Sequence deleted.');
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
            
            {currentScenarioId !== 'default' && (
              <div className="flex gap-1">
                <button
                  onClick={handleRenameScenarioClick}
                  title="Rename Scenario"
                  className="p-2 justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg flex items-center transition-colors shadow-sm"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={handleDeleteScenarioClick}
                  title="Delete Scenario"
                  className="p-2 justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg flex items-center transition-colors shadow-sm"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}

            {currentScenarioId !== 'default' && (
              <button
                onClick={handleGlobalReset}
                className="w-full sm:w-auto justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg px-3 py-2 flex items-center gap-1.5 transition-colors shadow-sm whitespace-nowrap"
              >
                <RefreshCw size={14} /> Purge All
              </button>
            )}
            
            {currentScenarioId === 'default' && (
              <button
                onClick={handleRestoreDefaults}
                className="w-full sm:w-auto justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-500 text-xs font-bold rounded-lg px-3 py-2 flex items-center gap-1.5 transition-colors shadow-sm whitespace-nowrap"
              >
                <RefreshCw size={14} /> Restore Defaults
              </button>
            )}

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
            onGenerateDfaRequest={handleGenerateDfaRequest}
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
            onEdgeDoubleClick={handleEdgeDoubleClick}
            onNodeContextMenu={handleNodeContextMenu}
            onEdgeContextMenu={handleEdgeContextMenu}
            onPaneContextMenu={handlePaneContextMenu}
            onPaneClick={closeContextMenu}
            testSequence={testSequence}
            onTestSequenceChange={setTestSequence}
            onExecute={handleTestExecute}
            onConnectRequest={(source, target) => {
              setPendingConnection({ source, target });
              setPendingEvent('');
            }}
          />
          <TestSuiteTable 
            currentScenarioId={currentScenarioId}
            testCases={initialTestCases}
            savedTestSequences={savedTestSequences}
            alphabet={alphabet}
            nodes={nodes}
            edges={edges}
            currentSimulationId={simState.currentTestCaseId}
            status={simState.status}
            onRunTest={handleRunTestCase}
            onRunSavedSequence={handleRunSavedSequence}
            onSaveSequence={handleSaveSequence}
            onDeleteSequence={handleDeleteSequence}
          />
        </div>

      </main>

      {/* RE → DFA Confirmation Modal */}
      {pendingReString !== null && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Replace Canvas?</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {viewMode === 'math' ? 'Generate DFA' : 'Generate Workflow'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
              This will <span className="font-semibold text-slate-800 dark:text-slate-200">clear all current states and transitions</span> and replace them with a machine generated from:
            </p>

            {/* RE preview */}
            <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg px-3 py-2 font-mono text-sm text-violet-800 dark:text-violet-300 text-center mb-4 break-all">
              {pendingReString}
            </div>

            {/* Inline compilation error (shown if generation fails) */}
            {reGenerateError && (
              <div className="flex items-start gap-1.5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-2 mb-4">
                <AlertTriangle size={12} className="text-rose-500 mt-0.5 shrink-0" />
                <span className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">{reGenerateError}</span>
              </div>
            )}

            <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-5 italic">
              This action cannot be undone. Saved test sequences will also be cleared.
            </p>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => { setPendingReString(null); setReGenerateError(null); }}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmGenerate}
                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                Proceed &amp; {viewMode === 'math' ? 'Generate DFA' : 'Generate Workflow'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Scenario Modal */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Rename Scenario</h2>
            <input 
              type="text"
              value={renameInputValue}
              onChange={e => setRenameInputValue(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-4 py-2 mb-6 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
              placeholder="Scenario name..."
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') confirmRename();
                if (e.key === 'Escape') cancelRename();
              }}
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={cancelRename}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={confirmRename}
                className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Scenario Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Scenario</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
              Are you sure you want to delete this custom scenario? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
              >
                No, keep it
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {isAddEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add Event Trigger</h2>
            <input 
              type="text"
              value={addEventInputValue}
              onChange={e => setAddEventInputValue(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-4 py-2 mb-6 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
              placeholder="e.g. on_click, on_hover"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') confirmAddEvent();
                if (e.key === 'Escape') {
                  setIsAddEventModalOpen(false);
                  setAddEventInputValue('');
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => {
                  setIsAddEventModalOpen(false);
                  setAddEventInputValue('');
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={confirmAddEvent}
                className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <option value="initial_accepting">Initial/Accepting</option>
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
                  onClick={() => handleDeleteNode(editingNodeId)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 px-4 py-2 rounded-lg text-xs font-bold transition-colors mr-auto"
                >
                  Delete State
                </button>
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
                {pendingConnection.id && (
                  <button 
                    onClick={() => handleDeleteEdge(pendingConnection.id!)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 px-4 py-2 rounded-lg text-xs font-bold transition-colors mr-auto"
                  >
                    Delete Transition
                  </button>
                )}
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

      {/* Context Menu Overlay */}
      {contextMenu && (
        <div 
          className="context-menu-container fixed z-50 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {contextMenu.type !== 'canvas' && (
            <>
              <button 
                onClick={handleContextMenuEdit}
                className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-colors"
              >
                <Edit2 size={14} /> Edit
              </button>
              <button 
                onClick={handleContextMenuDelete}
                className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-red-600 dark:text-red-400 flex items-center gap-2 transition-colors"
              >
                <Trash2 size={14} /> Delete
              </button>
            </>
          )}

          {contextMenu.type === 'node' && (
            <>
              <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
              <button 
                onClick={() => {
                  closeContextMenu();
                  handleAddNode();
                }}
                className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-colors"
              >
                <Plus size={14} /> Add New State
              </button>
            </>
          )}

          {contextMenu.type === 'canvas' && (
            <>
              <button 
                onClick={() => {
                  closeContextMenu();
                  handleAddNode();
                }}
                className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-colors"
              >
                <Plus size={14} /> Add New State
              </button>
              <button 
                onClick={() => {
                  closeContextMenu();
                  setIsAddEventModalOpen(true);
                }}
                className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-colors"
              >
                <Plus size={14} /> Add Event Trigger
              </button>
              <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
              <button 
                onClick={() => {
                  closeContextMenu();
                  if (currentScenarioId !== 'default') handleCanvasReset();
                }}
                disabled={currentScenarioId === 'default'}
                className={`w-full text-left px-4 py-2 flex items-center gap-2 transition-colors ${currentScenarioId === 'default' ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-red-600 dark:text-red-400'}`}
              >
                <RefreshCw size={14} /> Reset Canvas
              </button>
            </>
          )}
        </div>
      )}

    </div>
  );
}