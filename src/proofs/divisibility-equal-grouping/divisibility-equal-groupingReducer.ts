import { LIMITS } from './divisibility-equal-groupingConfig';
import type { ProofState, VisualMode } from './divisibility-equal-groupingConfig';
import { generateGroupsSnapTargets, getCounterColor, getAlternativeModePositions } from './divisibility-equal-groupingMath';

export interface CounterState {
  id: number;
  label: number;
  x: number;
  y: number;
  color: string;
  targetType: 'tray' | 'group' | 'leftovers';
  targetGroupId?: number;
  targetSlotId: number;
}

export interface StateSlice {
  a: number;
  b: number;
  mode: VisualMode;
  proofState: ProofState;
  counters: CounterState[];
}

export interface DivisibilityStateModel {
  a: number;
  b: number;
  mode: VisualMode;
  proofState: ProofState;
  counters: CounterState[];
  hintLevel: number;
  
  predictionQ: string;
  predictionR: string;
  predictionChecked: boolean;
  predictionCorrect: boolean;
  
  challengeQ: string;
  challengeR: string;
  challengeChecked: boolean;
  challengeCorrect: boolean;

  misconceptionSelected: string;
  misconceptionChecked: boolean;
  misconceptionFeedback: string | null;

  isPlaying: boolean;
  animationSpeed: number;
  animationStep: number; // For step-by-step division animation
  
  history: StateSlice[];
  historyIndex: number;
}

// Generate the initial list of counters positioned in the tray
export function getInitialCounters(a: number, b: number): CounterState[] {
  const snaps = generateGroupsSnapTargets(a, b);
  return Array.from({ length: a }, (_, i) => {
    const snap = snaps.find(s => s.type === 'tray' && s.slotId === i) || { x: 50 + i * 20, y: 80 };
    return {
      id: i,
      label: i + 1,
      x: snap.x,
      y: snap.y,
      color: getCounterColor(i + 1),
      targetType: 'tray',
      targetSlotId: i,
    };
  });
}

export const INITIAL_STATE: DivisibilityStateModel = {
  a: LIMITS.defaultA,
  b: LIMITS.defaultB,
  mode: 'groups',
  proofState: 'inspect',
  counters: getInitialCounters(LIMITS.defaultA, LIMITS.defaultB),
  hintLevel: 1,
  
  predictionQ: '',
  predictionR: '',
  predictionChecked: false,
  predictionCorrect: false,
  
  challengeQ: '',
  challengeR: '',
  challengeChecked: false,
  challengeCorrect: false,

  misconceptionSelected: '',
  misconceptionChecked: false,
  misconceptionFeedback: null,
  
  isPlaying: false,
  animationSpeed: 1.0,
  animationStep: 0,
  
  history: [],
  historyIndex: 0,
};

// Initialize helper
export function initDivisibilityState(): DivisibilityStateModel {
  const initialSlice: StateSlice = {
    a: LIMITS.defaultA,
    b: LIMITS.defaultB,
    mode: 'groups',
    proofState: 'inspect',
    counters: getInitialCounters(LIMITS.defaultA, LIMITS.defaultB),
  };
  return {
    ...INITIAL_STATE,
    history: [initialSlice],
    historyIndex: 0,
  };
}

export type Action =
  | { type: 'SET_A'; payload: number }
  | { type: 'SET_B'; payload: number }
  | { type: 'CHANGE_MODE'; payload: VisualMode }
  | { type: 'SET_STATE'; payload: ProofState }
  | { type: 'DRAG_COUNTER'; payload: { id: number; x: number; y: number } }
  | { type: 'DOCK_COUNTER'; payload: { id: number; targetType: 'tray' | 'group' | 'leftovers'; targetGroupId?: number; targetSlotId: number; x: number; y: number } }
  | { type: 'AUTO_GROUP_STEP' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET' }
  | { type: 'SET_HINT'; payload: number }
  | { type: 'SET_PREDICTION'; payload: { q: string; r: string } }
  | { type: 'CHECK_PREDICTION' }
  | { type: 'SET_CHALLENGE'; payload: { q: string; r: string } }
  | { type: 'CHECK_CHALLENGE' }
  | { type: 'SET_MISCONCEPTION'; payload: string }
  | { type: 'CHECK_MISCONCEPTION' }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'TICK_ANIMATION' }
  | { type: 'SET_ANIMATION_SPEED'; payload: number };

function pushHistory(history: StateSlice[], index: number, slice: StateSlice): { history: StateSlice[]; index: number } {
  const newHistory = history.slice(0, index + 1);
  newHistory.push(slice);
  return {
    history: newHistory,
    index: newHistory.length - 1,
  };
}

export function divisibilityReducer(state: DivisibilityStateModel, action: Action): DivisibilityStateModel {
  switch (action.type) {
    case 'SET_A': {
      const nextA = Math.max(LIMITS.minA, Math.min(LIMITS.maxA, action.payload));
      const nextCounters = getInitialCounters(nextA, state.b);
      const slice: StateSlice = {
        a: nextA,
        b: state.b,
        mode: state.mode,
        proofState: state.proofState,
        counters: nextCounters,
      };
      const { history, index } = pushHistory(state.history, state.historyIndex, slice);
      return {
        ...state,
        a: nextA,
        counters: nextCounters,
        history,
        historyIndex: index,
        animationStep: 0,
      };
    }
    case 'SET_B': {
      const nextB = Math.max(LIMITS.minB, Math.min(LIMITS.maxB, action.payload));
      const nextCounters = getInitialCounters(state.a, nextB);
      const slice: StateSlice = {
        a: state.a,
        b: nextB,
        mode: state.mode,
        proofState: state.proofState,
        counters: nextCounters,
      };
      const { history, index } = pushHistory(state.history, state.historyIndex, slice);
      return {
        ...state,
        b: nextB,
        counters: nextCounters,
        history,
        historyIndex: index,
        animationStep: 0,
      };
    }
    case 'CHANGE_MODE': {
      // In modes other than groups, positions are fixed and derived mathematically.
      // So we recalculate coordinates for the other modes.
      let nextCounters = [...state.counters];
      if (action.payload !== 'groups') {
        const altPositions = getAlternativeModePositions(state.a, state.b, action.payload);
        nextCounters = state.counters.map((c, i) => ({
          ...c,
          x: altPositions[i]?.x ?? c.x,
          y: altPositions[i]?.y ?? c.y,
        }));
      } else {
        // Return to where they are docked in groups mode
        const snaps = generateGroupsSnapTargets(state.a, state.b);
        nextCounters = state.counters.map(c => {
          const match = snaps.find(s => s.type === c.targetType && s.groupId === c.targetGroupId && s.slotId === c.targetSlotId);
          return match ? { ...c, x: match.x, y: match.y } : c;
        });
      }
      
      const slice: StateSlice = {
        a: state.a,
        b: state.b,
        mode: action.payload,
        proofState: state.proofState,
        counters: nextCounters,
      };
      const { history, index } = pushHistory(state.history, state.historyIndex, slice);
      return {
        ...state,
        mode: action.payload,
        counters: nextCounters,
        history,
        historyIndex: index,
      };
    }
    case 'SET_STATE': {
      const slice: StateSlice = {
        a: state.a,
        b: state.b,
        mode: state.mode,
        proofState: action.payload,
        counters: state.counters,
      };
      const { history, index } = pushHistory(state.history, state.historyIndex, slice);
      return {
        ...state,
        proofState: action.payload,
        history,
        historyIndex: index,
      };
    }
    case 'DRAG_COUNTER': {
      const nextCounters = state.counters.map(c =>
        c.id === action.payload.id ? { ...c, x: action.payload.x, y: action.payload.y } : c
      );
      return {
        ...state,
        counters: nextCounters,
      };
    }
    case 'DOCK_COUNTER': {
      const nextCounters = state.counters.map(c =>
        c.id === action.payload.id
          ? {
              ...c,
              x: action.payload.x,
              y: action.payload.y,
              targetType: action.payload.targetType,
              targetGroupId: action.payload.targetGroupId,
              targetSlotId: action.payload.targetSlotId,
            }
          : c
      );
      
      const slice: StateSlice = {
        a: state.a,
        b: state.b,
        mode: state.mode,
        proofState: state.proofState,
        counters: nextCounters,
      };
      const { history, index } = pushHistory(state.history, state.historyIndex, slice);
      
      return {
        ...state,
        counters: nextCounters,
        history,
        historyIndex: index,
      };
    }
    case 'AUTO_GROUP_STEP': {
      // Find the first counter that is still in the 'tray'
      const firstTrayIdx = state.counters.findIndex(c => c.targetType === 'tray');
      if (firstTrayIdx === -1) return state;

      const q = Math.floor(state.a / state.b);
      const targetSlot = firstTrayIdx; // slot fits index
      
      let targetType: 'group' | 'leftovers' = 'group';
      let targetGroupId = 0;
      let targetSlotId = 0;

      if (targetSlot < q * state.b) {
        targetType = 'group';
        targetGroupId = Math.floor(targetSlot / state.b);
        targetSlotId = targetSlot % state.b;
      } else {
        targetType = 'leftovers';
        targetSlotId = targetSlot - q * state.b;
      }

      const snaps = generateGroupsSnapTargets(state.a, state.b);
      const snapTarget = snaps.find(s => s.type === targetType && s.groupId === targetGroupId && s.slotId === targetSlotId);
      if (!snapTarget) return state;

      const nextCounters = state.counters.map((c, i) =>
        i === firstTrayIdx
          ? {
              ...c,
              x: snapTarget.x,
              y: snapTarget.y,
              targetType,
              targetGroupId,
              targetSlotId,
            }
          : c
      );

      const slice: StateSlice = {
        a: state.a,
        b: state.b,
        mode: state.mode,
        proofState: state.proofState,
        counters: nextCounters,
      };
      const { history, index } = pushHistory(state.history, state.historyIndex, slice);

      return {
        ...state,
        counters: nextCounters,
        animationStep: state.animationStep + 1,
        history,
        historyIndex: index,
      };
    }
    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const idx = state.historyIndex - 1;
      const slice = state.history[idx];
      return {
        ...state,
        a: slice.a,
        b: slice.b,
        mode: slice.mode,
        proofState: slice.proofState,
        counters: slice.counters,
        historyIndex: idx,
      };
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const idx = state.historyIndex + 1;
      const slice = state.history[idx];
      return {
        ...state,
        a: slice.a,
        b: slice.b,
        mode: slice.mode,
        proofState: slice.proofState,
        counters: slice.counters,
        historyIndex: idx,
      };
    }
    case 'RESET': {
      const initialSlice: StateSlice = {
        a: state.a,
        b: state.b,
        mode: 'groups',
        proofState: 'inspect',
        counters: getInitialCounters(state.a, state.b),
      };
      return {
        ...state,
        mode: 'groups',
        proofState: 'inspect',
        counters: initialSlice.counters,
        predictionQ: '',
        predictionR: '',
        predictionChecked: false,
        predictionCorrect: false,
        challengeQ: '',
        challengeR: '',
        challengeChecked: false,
        challengeCorrect: false,
        misconceptionSelected: '',
        misconceptionChecked: false,
        misconceptionFeedback: null,
        isPlaying: false,
        animationStep: 0,
        history: [initialSlice],
        historyIndex: 0,
      };
    }
    case 'SET_HINT': {
      return {
        ...state,
        hintLevel: action.payload,
      };
    }
    case 'SET_PREDICTION': {
      return {
        ...state,
        predictionQ: action.payload.q,
        predictionR: action.payload.r,
        predictionChecked: false,
      };
    }
    case 'CHECK_PREDICTION': {
      // If a = 35 and b = 7
      // 35 = 7 * 5 + 0, so q = 5, r = 0
      const isCorrect = parseInt(state.predictionQ.trim()) === 5 && parseInt(state.predictionR.trim()) === 0;
      return {
        ...state,
        predictionChecked: true,
        predictionCorrect: isCorrect,
      };
    }
    case 'SET_CHALLENGE': {
      return {
        ...state,
        challengeQ: action.payload.q,
        challengeR: action.payload.r,
        challengeChecked: false,
      };
    }
    case 'CHECK_CHALLENGE': {
      // Challenge asks: a = 47, b = 6
      // 47 = 6 * 7 + 5, so q = 7, r = 5
      const isCorrect = parseInt(state.challengeQ.trim()) === 7 && parseInt(state.challengeR.trim()) === 5;
      return {
        ...state,
        challengeChecked: true,
        challengeCorrect: isCorrect,
      };
    }
    case 'SET_MISCONCEPTION': {
      return {
        ...state,
        misconceptionSelected: action.payload,
        misconceptionChecked: false,
        misconceptionFeedback: null,
      };
    }
    case 'CHECK_MISCONCEPTION': {
      let feedback = '';
      if (state.misconceptionSelected === 'r_gt_b') {
        feedback = 'Incorrect. The remainder r must always satisfy 0 ≤ r < b. If r ≥ b, you can make another group!';
      } else if (state.misconceptionSelected === 'correct') {
        feedback = 'Correct! A division partition is valid if and only if 0 ≤ r < b.';
      } else if (state.misconceptionSelected === 'always_divisible') {
        feedback = 'Incorrect. Divisibility is a special case when r = 0. Not all numbers are divisible by any b.';
      }
      return {
        ...state,
        misconceptionChecked: true,
        misconceptionFeedback: feedback || 'Please select an option.',
      };
    }
    case 'TOGGLE_PLAY': {
      return {
        ...state,
        isPlaying: !state.isPlaying,
      };
    }
    case 'TICK_ANIMATION': {
      // Step-by-step moves a counter to group/leftover
      const firstTrayIdx = state.counters.findIndex(c => c.targetType === 'tray');
      if (firstTrayIdx === -1) {
        return {
          ...state,
          isPlaying: false, // stop playing when complete
        };
      }
      return divisibilityReducer(state, { type: 'AUTO_GROUP_STEP' });
    }
    case 'SET_ANIMATION_SPEED': {
      return {
        ...state,
        animationSpeed: action.payload,
      };
    }
    default:
      return state;
  }
}
