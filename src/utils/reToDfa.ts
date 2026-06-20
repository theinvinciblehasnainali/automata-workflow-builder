import { WorkflowNode, WorkflowEdge } from '../types/automata';

// =============================================================================
// TYPES
// =============================================================================

type TokenType = 'SYMBOL' | 'UNION' | 'CONCAT' | 'STAR' | 'LPAREN' | 'RPAREN';

interface Token {
  type: TokenType;
  value: string;
}

interface NFAState {
  id: number;
  transitions: Map<string, Set<number>>;
  epsilonTransitions: Set<number>;
}

interface NFA {
  start: number;
  accept: number;
  states: Map<number, NFAState>;
}

interface DFAState {
  key: string;
  nfaStates: number[];
  isAccepting: boolean;
  transitions: Map<string, string>;
}

// =============================================================================
// STEP 1 — PREPROCESSING
// Strip spaces, normalise | → +
// =============================================================================

function preprocess(re: string): string {
  return re.replace(/\s+/g, '').replace(/\|/g, '+');
}

// =============================================================================
// STEP 2 — TOKENISER (alphabet-aware: longest-match first)
// Returns token array or an error string.
// =============================================================================

function tokenize(re: string, alphabet: string[]): Token[] | string {
  // Sort alphabet longest-first so multi-char symbols are matched greedily
  const sortedAlph = [...alphabet].sort((a, b) => b.length - a.length);
  const tokens: Token[] = [];
  let i = 0;

  while (i < re.length) {
    const ch = re[i];

    if (ch === '(') { tokens.push({ type: 'LPAREN',  value: '(' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'RPAREN',  value: ')' }); i++; continue; }
    if (ch === '+') { tokens.push({ type: 'UNION',   value: '+' }); i++; continue; }
    if (ch === '*') { tokens.push({ type: 'STAR',    value: '*' }); i++; continue; }

    // Try alphabet symbols (longest match)
    let matched = false;
    for (const sym of sortedAlph) {
      if (re.startsWith(sym, i)) {
        tokens.push({ type: 'SYMBOL', value: sym });
        i += sym.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      return `Unrecognised character '${ch}' at position ${i}. Make sure all symbols are in the Event Triggers alphabet.`;
    }
  }

  return tokens;
}

// =============================================================================
// STEP 3 — INSERT EXPLICIT CONCATENATION OPERATOR
// Between any (symbol|)|*) followed by (symbol|() insert implicit ·
// =============================================================================

function insertConcat(tokens: Token[]): Token[] {
  const result: Token[] = [];
  const canFollowLeft:  Set<TokenType> = new Set(['SYMBOL', 'RPAREN', 'STAR']);
  const canPrecedeRight: Set<TokenType> = new Set(['SYMBOL', 'LPAREN']);

  for (let i = 0; i < tokens.length; i++) {
    result.push(tokens[i]);
    if (i + 1 < tokens.length) {
      if (canFollowLeft.has(tokens[i].type) && canPrecedeRight.has(tokens[i + 1].type)) {
        result.push({ type: 'CONCAT', value: '·' });
      }
    }
  }
  return result;
}

// =============================================================================
// STEP 4 — SHUNTING-YARD (infix → postfix / RPN)
// Precedences: * (3) > · (2) > + (1)
// * is treated as already-postfix; output it directly without pushing to stack.
// =============================================================================

const PREC: Partial<Record<TokenType, number>> = {
  UNION:  1,
  CONCAT: 2,
  STAR:   3,
};

function toPostfix(tokens: Token[]): Token[] | string {
  const output: Token[] = [];
  const stack: Token[]  = [];

  for (const tok of tokens) {
    switch (tok.type) {
      case 'SYMBOL':
        output.push(tok);
        break;

      case 'STAR':
        // Unary postfix operator — already in final position, emit directly
        output.push(tok);
        break;

      case 'UNION':
      case 'CONCAT': {
        const p = PREC[tok.type] ?? 0;
        while (
          stack.length > 0 &&
          stack[stack.length - 1].type !== 'LPAREN' &&
          (PREC[stack[stack.length - 1].type] ?? 0) >= p
        ) {
          output.push(stack.pop()!);
        }
        stack.push(tok);
        break;
      }

      case 'LPAREN':
        stack.push(tok);
        break;

      case 'RPAREN':
        while (stack.length > 0 && stack[stack.length - 1].type !== 'LPAREN') {
          output.push(stack.pop()!);
        }
        if (stack.length === 0) return 'Mismatched parentheses: unexpected closing parenthesis.';
        stack.pop(); // discard LPAREN
        break;
    }
  }

  while (stack.length > 0) {
    const top = stack.pop()!;
    if (top.type === 'LPAREN') return 'Mismatched parentheses: unclosed opening parenthesis.';
    output.push(top);
  }

  return output;
}

// =============================================================================
// STEP 5 — THOMPSON'S CONSTRUCTION (Postfix → NFA with ε-transitions)
// =============================================================================

function createState(states: Map<number, NFAState>, counter: { n: number }): number {
  const id = counter.n++;
  states.set(id, { id, transitions: new Map(), epsilonTransitions: new Set() });
  return id;
}

function thompsonBuild(postfix: Token[]): NFA | string {
  const states: Map<number, NFAState> = new Map();
  const counter = { n: 0 };
  const stack: { start: number; accept: number }[] = [];

  const mkState = () => createState(states, counter);

  for (const tok of postfix) {
    switch (tok.type) {
      case 'SYMBOL': {
        // ─── a ───  s ─[a]→ a
        const s = mkState(), a = mkState();
        states.get(s)!.transitions.set(tok.value, new Set([a]));
        stack.push({ start: s, accept: a });
        break;
      }

      case 'CONCAT': {
        if (stack.length < 2) return 'Invalid RE: not enough operands for concatenation.';
        const n2 = stack.pop()!, n1 = stack.pop()!;
        // n1.accept ─ε→ n2.start
        states.get(n1.accept)!.epsilonTransitions.add(n2.start);
        stack.push({ start: n1.start, accept: n2.accept });
        break;
      }

      case 'UNION': {
        if (stack.length < 2) return 'Invalid RE: not enough operands for union (+).';
        const n2 = stack.pop()!, n1 = stack.pop()!;
        const s = mkState(), a = mkState();
        states.get(s)!.epsilonTransitions.add(n1.start);
        states.get(s)!.epsilonTransitions.add(n2.start);
        states.get(n1.accept)!.epsilonTransitions.add(a);
        states.get(n2.accept)!.epsilonTransitions.add(a);
        stack.push({ start: s, accept: a });
        break;
      }

      case 'STAR': {
        if (stack.length < 1) return 'Invalid RE: not enough operands for Kleene star (*).';
        const n = stack.pop()!;
        const s = mkState(), a = mkState();
        // new start ─ε→ n.start, new start ─ε→ new accept (ε-match)
        states.get(s)!.epsilonTransitions.add(n.start);
        states.get(s)!.epsilonTransitions.add(a);
        // n.accept ─ε→ n.start (loop), n.accept ─ε→ new accept
        states.get(n.accept)!.epsilonTransitions.add(n.start);
        states.get(n.accept)!.epsilonTransitions.add(a);
        stack.push({ start: s, accept: a });
        break;
      }

      default:
        break;
    }
  }

  if (stack.length !== 1) return 'Invalid RE: unbalanced expression (check operators and operands).';
  return { start: stack[0].start, accept: stack[0].accept, states };
}

// =============================================================================
// STEP 6 — SUBSET CONSTRUCTION (NFA → DFA)
// =============================================================================

function epsClosure(states: Map<number, NFAState>, initial: number[]): number[] {
  const closure = new Set<number>(initial);
  const wl = [...initial];
  while (wl.length) {
    const s = wl.pop()!;
    for (const e of states.get(s)!.epsilonTransitions) {
      if (!closure.has(e)) { closure.add(e); wl.push(e); }
    }
  }
  return [...closure].sort((a, b) => a - b);
}

function move(states: Map<number, NFAState>, stateSet: number[], sym: string): number[] {
  const result = new Set<number>();
  for (const s of stateSet) {
    const targets = states.get(s)?.transitions.get(sym);
    if (targets) targets.forEach(t => result.add(t));
  }
  return [...result];
}

const DEAD_KEY = '__dead__';

function subsetConstruct(nfa: NFA, alphabet: string[]): { states: DFAState[]; startKey: string } {
  const startSet = epsClosure(nfa.states, [nfa.start]);
  const startKey = startSet.join(',');

  const dfaMap = new Map<string, DFAState>();
  const queue: number[][] = [startSet];
  const seen = new Set<string>([startKey]);
  let needsDead = false;

  while (queue.length) {
    const current = queue.shift()!;
    const key = current.join(',');
    const isAccepting = current.includes(nfa.accept);
    const dfa: DFAState = { key, nfaStates: current, isAccepting, transitions: new Map() };

    for (const sym of alphabet) {
      const nextSet = epsClosure(nfa.states, move(nfa.states, current, sym));
      if (nextSet.length === 0) {
        dfa.transitions.set(sym, DEAD_KEY);
        needsDead = true;
      } else {
        const nextKey = nextSet.join(',');
        dfa.transitions.set(sym, nextKey);
        if (!seen.has(nextKey)) { seen.add(nextKey); queue.push(nextSet); }
      }
    }

    dfaMap.set(key, dfa);
  }

  if (needsDead) {
    dfaMap.set(DEAD_KEY, {
      key: DEAD_KEY,
      nfaStates: [],
      isAccepting: false,
      transitions: new Map(alphabet.map(sym => [sym, DEAD_KEY])),
    });
  }

  return { states: [...dfaMap.values()], startKey };
}

// =============================================================================
// STEP 6.5 — MINIMISATION (Hopcroft's Algorithm)
// =============================================================================

function minimizeDFA(dfaStates: DFAState[], startKey: string, alphabet: string[]): { states: DFAState[]; startKey: string } {
  const stateList = dfaStates;
  const keyToIndex = new Map<string, number>();
  stateList.forEach((s, i) => keyToIndex.set(s.key, i));

  const accepting = new Set<number>();
  const nonAccepting = new Set<number>();

  for (let i = 0; i < stateList.length; i++) {
    if (stateList[i].isAccepting) accepting.add(i);
    else nonAccepting.add(i);
  }

  let P = [accepting, nonAccepting].filter(s => s.size > 0);
  const W = [accepting, nonAccepting].filter(s => s.size > 0);

  while (W.length > 0) {
    const A = W.pop()!;
    for (const c of alphabet) {
      const X = new Set<number>();
      for (let i = 0; i < stateList.length; i++) {
        const targetKey = stateList[i].transitions.get(c);
        if (targetKey !== undefined) {
          const targetIndex = keyToIndex.get(targetKey);
          if (targetIndex !== undefined && A.has(targetIndex)) {
            X.add(i);
          }
        }
      }

      if (X.size === 0) continue;

      const nextP: Set<number>[] = [];
      for (const Y of P) {
        const intersection = new Set<number>();
        const difference = new Set<number>();
        for (const y of Y) {
          if (X.has(y)) intersection.add(y);
          else difference.add(y);
        }

        if (intersection.size > 0 && difference.size > 0) {
          nextP.push(intersection);
          nextP.push(difference);

          const wIndex = W.indexOf(Y);
          if (wIndex !== -1) {
            W.splice(wIndex, 1);
            W.push(intersection);
            W.push(difference);
          } else {
            if (intersection.size <= difference.size) W.push(intersection);
            else W.push(difference);
          }
        } else {
          nextP.push(Y);
        }
      }
      P = nextP;
    }
  }

  const oldToNew = new Map<number, number>();
  P.forEach((partition, newIdx) => {
    partition.forEach(oldIdx => oldToNew.set(oldIdx, newIdx));
  });

  // Identify if any partition is a pure trap state
  let deadPartitionIndex = -1;
  P.forEach((partition, idx) => {
    const repIdx = Array.from(partition)[0];
    const repState = stateList[repIdx];
    if (!repState.isAccepting) {
      let isTrap = true;
      repState.transitions.forEach((targetKey) => {
        const targetOldIdx = keyToIndex.get(targetKey)!;
        const targetNewIdx = oldToNew.get(targetOldIdx)!;
        if (targetNewIdx !== idx) isTrap = false;
      });
      if (isTrap) deadPartitionIndex = idx;
    }
  });

  const minimizedStates: DFAState[] = [];
  let newStartKey = '';

  P.forEach((partition, newIdx) => {
    const repIdx = Array.from(partition)[0];
    const repState = stateList[repIdx];

    let containsStart = false;
    const nfaStates = new Set<number>();

    partition.forEach(oldIdx => {
      const s = stateList[oldIdx];
      if (s.key === startKey) containsStart = true;
      s.nfaStates.forEach(ns => nfaStates.add(ns));
    });

    const newKey = (newIdx === deadPartitionIndex) ? DEAD_KEY : `min_${newIdx}`;
    if (containsStart) newStartKey = newKey;

    const newTransitions = new Map<string, string>();
    repState.transitions.forEach((targetKey, sym) => {
      const targetOldIdx = keyToIndex.get(targetKey)!;
      const targetNewIdx = oldToNew.get(targetOldIdx)!;
      newTransitions.set(sym, targetNewIdx === deadPartitionIndex ? DEAD_KEY : `min_${targetNewIdx}`);
    });

    minimizedStates.push({
      key: newKey,
      nfaStates: [...nfaStates].sort((a, b) => a - b),
      isAccepting: repState.isAccepting,
      transitions: newTransitions
    });
  });

  return { states: minimizedStates, startKey: newStartKey };
}

// =============================================================================
// STEP 7 — BFS LAYOUT ENGINE
// Places nodes in a left-to-right tree layout based on reachability depth.
// =============================================================================

function layoutDFA(states: DFAState[], startKey: string): Map<string, { x: number; y: number }> {
  const HGAP = 260, VGAP = 165, XBASE = 80, YBASE = 300;
  const positions = new Map<string, { x: number; y: number }>();

  // BFS to assign (depth, slot) to each reachable state
  const depthBuckets: string[][] = [];
  const visited = new Set<string>([startKey]);
  const queue: [string, number][] = [[startKey, 0]];

  while (queue.length) {
    const [key, depth] = queue.shift()!;
    if (!depthBuckets[depth]) depthBuckets[depth] = [];
    depthBuckets[depth].push(key);

    const s = states.find(s => s.key === key);
    if (!s) continue;
    for (const nextKey of new Set(s.transitions.values())) {
      if (!visited.has(nextKey)) { visited.add(nextKey); queue.push([nextKey, depth + 1]); }
    }
  }

  // Assign pixel positions, centering each column vertically
  for (let d = 0; d < depthBuckets.length; d++) {
    const bucket = depthBuckets[d];
    for (let i = 0; i < bucket.length; i++) {
      positions.set(bucket[i], {
        x: XBASE + d * HGAP,
        y: YBASE + (i - (bucket.length - 1) / 2) * VGAP,
      });
    }
  }

  // Place any unreachable states (e.g. a dead state not reached by BFS) below
  let fallbackX = XBASE + depthBuckets.length * HGAP;
  for (const s of states) {
    if (!positions.has(s.key)) {
      positions.set(s.key, { x: fallbackX, y: YBASE + 200 });
      fallbackX += HGAP;
    }
  }

  return positions;
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

export interface ReToDfaResult {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  error?: string;
}

export function reToDfa(reString: string, alphabet: string[]): ReToDfaResult {
  // ── Preprocess ──────────────────────────────────────────────────────────────
  const cleaned = preprocess(reString);
  if (!cleaned) return { nodes: [], edges: [], error: 'Regular expression is empty.' };

  // ── Tokenise ─────────────────────────────────────────────────────────────────
  const tokensOrErr = tokenize(cleaned, alphabet);
  if (typeof tokensOrErr === 'string') return { nodes: [], edges: [], error: tokensOrErr };

  // ── Validate all symbols belong to alphabet ──────────────────────────────────
  const invalidSyms = [...new Set(
    tokensOrErr.filter(t => t.type === 'SYMBOL' && !alphabet.includes(t.value)).map(t => t.value)
  )];
  if (invalidSyms.length > 0) {
    return { nodes: [], edges: [], error: `Symbol(s) not in alphabet: ${invalidSyms.join(', ')}. Add them as Event Triggers first.` };
  }

  // ── Insert concat operators ───────────────────────────────────────────────────
  const withConcat = insertConcat(tokensOrErr);

  // ── Shunting-Yard ─────────────────────────────────────────────────────────────
  const postfixOrErr = toPostfix(withConcat);
  if (typeof postfixOrErr === 'string') return { nodes: [], edges: [], error: postfixOrErr };

  // ── Thompson's Construction ───────────────────────────────────────────────────
  const nfaOrErr = thompsonBuild(postfixOrErr);
  if (typeof nfaOrErr === 'string') return { nodes: [], edges: [], error: nfaOrErr };

  // ── Subset Construction ───────────────────────────────────────────────────────
  const { states: dfaStates, startKey } = subsetConstruct(nfaOrErr, alphabet);

  // ── Minimisation ──────────────────────────────────────────────────────────────
  const { states: minStates, startKey: minStartKey } = minimizeDFA(dfaStates, startKey, alphabet);

  // ── Layout ────────────────────────────────────────────────────────────────────
  const positions = layoutDFA(minStates, minStartKey);

  // ── Build WorkflowNodes ───────────────────────────────────────────────────────
  const keyToNodeId = new Map<string, string>();
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  // Ordered: start → normal intermediates → accepting states → dead/trap last
  const ordered: DFAState[] = [
    ...minStates.filter(s => s.key === minStartKey),
    ...minStates.filter(s => s.key !== minStartKey && s.key !== DEAD_KEY && !s.isAccepting),
    ...minStates.filter(s => s.key !== minStartKey && s.key !== DEAD_KEY &&  s.isAccepting),
    ...minStates.filter(s => s.key === DEAD_KEY),
  ];

  const acceptCount = ordered.filter(s => s.isAccepting).length;
  let acceptIdx = 0;

  ordered.forEach((state, idx) => {
    const nodeId = `dfa_${idx}`;
    keyToNodeId.set(state.key, nodeId);

    const isStart     = state.key === minStartKey;
    const isDead      = state.key === DEAD_KEY;
    const isAccepting = state.isAccepting;

    const mathType: WorkflowNode['data']['mathType'] =
      isStart      ? 'initial'   :
      isAccepting  ? 'accepting' :
      isDead       ? 'rejecting' : 'normal';

    // User-friendly label
    let userLabel: string;
    if      (isStart && isAccepting)          userLabel = 'Start (Accepting)';
    else if (isStart)                          userLabel = 'Start';
    else if (isAccepting && acceptCount > 1)   userLabel = `Accept State ${String.fromCharCode(65 + acceptIdx++)}`;
    else if (isAccepting)                      userLabel = 'Accept State';
    else if (isDead)                           userLabel = 'Reject / Trap';
    else                                       userLabel = `State ${idx}`;

    // Math label (q-notation)
    const mathLabel = `q${idx}`;

    const pos = positions.get(state.key) ?? { x: idx * HGAP_FALLBACK + 80, y: 300 };

    nodes.push({
      id: nodeId,
      type: 'customNode',
      position: pos,
      data: {
        label:       userLabel,
        mathState:   mathLabel,
        type:        isAccepting ? 'accept' : isDead ? 'reject' : isStart ? 'trigger' : 'action',
        mathType,
        description: isStart
          ? 'Initial state — auto-generated from Regular Expression'
          : isAccepting
          ? 'Accepting (final) state'
          : isDead
          ? 'Trap state — all incoming paths dead-end here'
          : 'Intermediate DFA state',
        parameters: {},
        viewMode: 'user',
      },
    });
  });

  // ── Build WorkflowEdges ───────────────────────────────────────────────────────
  let edgeIdx = 0;
  for (const state of minStates) {
    const srcId = keyToNodeId.get(state.key);
    if (!srcId) continue;

    for (const [sym, targetKey] of state.transitions) {
      const tgtId = keyToNodeId.get(targetKey);
      if (!tgtId) continue;
      edges.push({
        id: `dfa_edge_${edgeIdx++}`,
        source: srcId,
        target: tgtId,
        label: sym,
        data: { triggerEvent: sym },
      });
    }
  }

  return { nodes, edges };
}

// Internal constant referenced in fallback position calc
const HGAP_FALLBACK = 260;
