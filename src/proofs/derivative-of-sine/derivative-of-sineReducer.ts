import { LIMITS } from './derivative-of-sineConfig';
import type { ProofState } from './derivative-of-sineConfig';
import { clampX } from './derivative-of-sineMath';

export interface StateSlice {
  x: number;
  dx: number;
  proofState: ProofState;
}

export interface ProofStateModel {
  x: number;
  dx: number;
  zoom: number;
  proofState: ProofState;
  showTangent: boolean;
  showSecant: boolean;
  showCos: boolean;
  hintLevel: number;
  
  prediction: string;
  predictionChecked: boolean;
  predictionCorrect: boolean;
  
  challengeInput: string;
  challengeChecked: boolean;
  challengeCorrect: boolean;
  
  misconceptionSelected: string;
  misconceptionChecked: boolean;
  misconceptionFeedback: string | null;
  
  isPlaying: boolean;
  animationSpeed: number; // 0.5, 1.0, 1.5
  
  history: StateSlice[];
  historyIndex: number;
}

export const INITIAL_STATE: ProofStateModel = {
  x: LIMITS.defaultX,
  dx: LIMITS.defaultDx,
  zoom: 1.0,
  proofState: 'inspect',
  showTangent: true,
  showSecant: true,
  showCos: true,
  hintLevel: 1,
  
  prediction: '',
  predictionChecked: false,
  predictionCorrect: false,
  
  challengeInput: '',
  challengeChecked: false,
  challengeCorrect: false,
  
  misconceptionSelected: '',
  misconceptionChecked: false,
  misconceptionFeedback: null,
  
  isPlaying: false,
  animationSpeed: 1.0,
  
  history: [{ x: LIMITS.defaultX, dx: LIMITS.defaultDx, proofState: 'inspect' }],
  historyIndex: 0,
};

export type Action =
  | { type: 'SET_X'; payload: number; commit?: boolean }
  | { type: 'SET_DX'; payload: number }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_STATE'; payload: ProofState }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET' }
  | { type: 'SET_HINT'; payload: number }
  | { type: 'SET_PREDICTION'; payload: string }
  | { type: 'CHECK_PREDICTION' }
  | { type: 'SET_CHALLENGE'; payload: string }
  | { type: 'CHECK_CHALLENGE' }
  | { type: 'SET_MISCONCEPTION'; payload: string }
  | { type: 'CHECK_MISCONCEPTION' }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SET_ANIMATION_SPEED'; payload: number }
  | { type: 'TICK_ANIMATION' }
  | { type: 'TOGGLE_VISIBILITY'; payload: 'tangent' | 'secant' | 'cos' };

function pushHistory(history: StateSlice[], index: number, slice: StateSlice): { history: StateSlice[]; index: number } {
  const newHistory = history.slice(0, index + 1);
  newHistory.push(slice);
  return {
    history: newHistory,
    index: newHistory.length - 1,
  };
}

export function proofReducer(state: ProofStateModel, action: Action): ProofStateModel {
  switch (action.type) {
    case 'SET_X': {
      const nextX = clampX(action.payload, state.dx);
      if (nextX === state.x) return state;
      
      let nextHistoryState = { history: state.history, index: state.historyIndex };
      if (action.commit) {
        nextHistoryState = pushHistory(state.history, state.historyIndex, {
          x: nextX,
          dx: state.dx,
          proofState: state.proofState,
        });
      }
      
      return {
        ...state,
        x: nextX,
        history: nextHistoryState.history,
        historyIndex: nextHistoryState.index,
      };
    }
    case 'SET_DX': {
      const nextDx = Math.max(LIMITS.minDx, Math.min(LIMITS.maxDx, action.payload));
      const nextX = clampX(state.x, nextDx);
      const nextHistoryState = pushHistory(state.history, state.historyIndex, {
        x: nextX,
        dx: nextDx,
        proofState: state.proofState,
      });
      return {
        ...state,
        dx: nextDx,
        x: nextX,
        history: nextHistoryState.history,
        historyIndex: nextHistoryState.index,
      };
    }
    case 'SET_ZOOM': {
      return {
        ...state,
        zoom: Math.max(0.5, Math.min(2.0, action.payload)),
      };
    }
    case 'SET_STATE': {
      if (action.payload === state.proofState) return state;
      
      const nextHistoryState = pushHistory(state.history, state.historyIndex, {
        x: state.x,
        dx: state.dx,
        proofState: action.payload,
      });
      
      return {
        ...state,
        proofState: action.payload,
        history: nextHistoryState.history,
        historyIndex: nextHistoryState.index,
      };
    }
    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const nextIdx = state.historyIndex - 1;
      const slice = state.history[nextIdx];
      return {
        ...state,
        x: slice.x,
        dx: slice.dx,
        proofState: slice.proofState,
        historyIndex: nextIdx,
      };
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const nextIdx = state.historyIndex + 1;
      const slice = state.history[nextIdx];
      return {
        ...state,
        x: slice.x,
        dx: slice.dx,
        proofState: slice.proofState,
        historyIndex: nextIdx,
      };
    }
    case 'RESET': {
      return {
        ...INITIAL_STATE,
        history: [{ x: LIMITS.defaultX, dx: LIMITS.defaultDx, proofState: 'inspect' }],
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
        prediction: action.payload,
        predictionChecked: false,
      };
    }
    case 'CHECK_PREDICTION': {
      const predVal = parseFloat(state.prediction.trim());
      // Prediction is correct if the learner estimates around 0.5 (which is cos(pi/3))
      const isCorrect = !isNaN(predVal) && Math.abs(predVal - 0.5) < 0.05;
      return {
        ...state,
        predictionChecked: true,
        predictionCorrect: isCorrect,
      };
    }
    case 'SET_CHALLENGE': {
      return {
        ...state,
        challengeInput: action.payload,
        challengeChecked: false,
      };
    }
    case 'CHECK_CHALLENGE': {
      // Challenge asks: Find d/dx[sin(5x)].
      // Expected answer: 5 cos(5x) or similar variations
      const cleaned = state.challengeInput.replace(/\s+/g, '').toLowerCase();
      const isCorrect = cleaned.includes('5cos(5x)') || cleaned === '5cos5x';
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
      if (state.misconceptionSelected === 'cos') {
        feedback = 'Correct! The tangent slope matches cos(x) exactly at all points.';
      } else if (state.misconceptionSelected === 'minus_cos') {
        feedback = 'Incorrect. That would be the derivative of cos(x) (which is -sin(x)). For sin(x), the derivative is +cos(x).';
      } else if (state.misconceptionSelected === 'sine_value') {
        feedback = 'Incorrect. The slope of the curve is not equal to its height. For example, at x = π/2, sin(x) = 1, but the tangent is flat (slope = 0).';
      } else {
        feedback = 'Please choose a claim first.';
      }
      return {
        ...state,
        misconceptionChecked: true,
        misconceptionFeedback: feedback,
      };
    }
    case 'TOGGLE_PLAY': {
      return {
        ...state,
        isPlaying: !state.isPlaying,
      };
    }
    case 'SET_ANIMATION_SPEED': {
      return {
        ...state,
        animationSpeed: action.payload,
      };
    }
    case 'TICK_ANIMATION': {
      // In the animation tick, we refine dx towards 0, or sweep x from -pi to pi.
      // Let's refine dx down to 0.01 first if we are showing convergence, or sweep P along the curve.
      // A sweep along the curve from -pi to pi is very educational!
      let nextX = state.x + 0.05 * state.animationSpeed;
      if (nextX > LIMITS.xMax - state.dx) {
        nextX = LIMITS.xMin; // Loop
      }
      return {
        ...state,
        x: nextX,
      };
    }
    case 'TOGGLE_VISIBILITY': {
      if (action.payload === 'tangent') return { ...state, showTangent: !state.showTangent };
      if (action.payload === 'secant') return { ...state, showSecant: !state.showSecant };
      if (action.payload === 'cos') return { ...state, showCos: !state.showCos };
      return state;
    }
    default:
      return state;
  }
}
