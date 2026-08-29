export type ProofState = 'inspect' | 'manipulate' | 'preserve' | 'connect' | 'conclude' | 'transfer';

export interface Hint {
  title: string;
  text: string;
}

export const LIMITS = {
  xMin: -2 * Math.PI,
  xMax: 2 * Math.PI,
  defaultX: 1.20,
  defaultDx: 0.5,
  minDx: 0.01,
  maxDx: 1.0,
  snapThreshold: 0.15, // in radians
  attractThreshold: 0.40, // in radians
};

export const SNAP_POINTS = [
  { value: -2 * Math.PI, label: '-2π' },
  { value: -1.5 * Math.PI, label: '-3π/2' },
  { value: -Math.PI, label: '-π' },
  { value: -0.5 * Math.PI, label: '-π/2' },
  { value: 0, label: '0' },
  { value: 0.5 * Math.PI, label: 'π/2' },
  { value: Math.PI, label: 'π' },
  { value: 1.5 * Math.PI, label: '3π/2' },
  { value: 2 * Math.PI, label: '2π' },
];

export const HINTS: Record<number, Hint> = {
  1: {
    title: 'Notice the Givens',
    text: 'Look at the curves: the purple curve is y = sin x and the dashed green curve is y = cos x. Notice that P is a point on y = sin x, and the tangent line is purple.'
  },
  2: {
    title: 'Choose the Right Control',
    text: 'Drag the purple handle P or use the slider to shift the x-value. Watch how the purple tangent slope changes at different points.'
  },
  3: {
    title: 'Predict Invariant Behavior',
    text: 'As you move P, the source function y = sin x stays completely fixed. Only the tangent slope and the secant approximation change dynamically.'
  },
  4: {
    title: 'Guide to Matching Slope',
    text: 'Try snapping to x = π/2 or x = 0. Notice that at x = π/2, the tangent is horizontal (slope = 0) which matches cos(π/2) = 0.'
  },
  5: {
    title: 'Track Sign and Conclude',
    text: 'Look at the bottom track. Where the slope is positive, the green curve is above the x-axis. This visually establishes that d/dx[sin x] = cos x.'
  }
};
