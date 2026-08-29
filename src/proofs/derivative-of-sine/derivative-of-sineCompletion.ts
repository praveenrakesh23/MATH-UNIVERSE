import type { ProofStateModel } from './derivative-of-sineReducer';

export interface CompletionStatus {
  isComplete: boolean;
  missingSteps: string[];
  visualizeOk: boolean;
  compareOk: boolean;
  trackOk: boolean;
}

/**
 * Checks if the student has completed the required items:
 * 1. Visited crucial states (inspect, manipulate, preserve, connect, conclude, transfer)
 * 2. Handled the prediction question correctly.
 * 3. Addressed the misconception checkpoint correctly.
 * 4. Interacted with P at one or more key snapped locations (e.g. pi/2 or -pi/2) where slope matches cos x.
 */
export function checkCompletion(
  state: ProofStateModel,
  snappedPointsVisited: Set<number>
): CompletionStatus {
  const missingSteps: string[] = [];
  
  // 1. Visualize derivative of sine: requires manipulating x to snap points and visiting 'manipulate' state
  const hasVisitedSnapPoints = snappedPointsVisited.size >= 2;
  const visualizeOk = state.history.some(h => h.proofState === 'manipulate') && hasVisitedSnapPoints;
  if (!visualizeOk) {
    missingSteps.push('Drag point P to at least two critical snapped values (e.g. 0, π/2, or π) to visualize derivative behavior.');
  }

  // 2. Compare slope with cosine: requires checking the prediction and prediction must be correct
  const compareOk = state.predictionChecked && state.predictionCorrect;
  if (!compareOk) {
    missingSteps.push('Submit a correct prediction for the slope of sin x at x = π/3 (cos(π/3) = 0.5).');
  }

  // 3. Track slope sign changes: requires visiting the transfer state and answering the misconception checkpoint correctly
  const trackOk = state.misconceptionChecked && state.misconceptionSelected === 'cos';
  if (!trackOk) {
    missingSteps.push('Resolve the misconception checkpoint by choosing the correct mathematical claim.');
  }

  // General state requirements
  const visitedStates = new Set(state.history.map(h => h.proofState));
  const hasVisitedConclude = visitedStates.has('conclude');
  const hasVisitedTransfer = visitedStates.has('transfer');
  
  if (!hasVisitedConclude) {
    missingSteps.push('Navigate to the Conclude stage to formulate the final derivative identity.');
  }
  if (!hasVisitedTransfer) {
    missingSteps.push('Navigate to the Transfer stage to check slope sign changes and test your understanding.');
  }

  const isComplete = visualizeOk && compareOk && trackOk && hasVisitedConclude && hasVisitedTransfer;

  return {
    isComplete,
    missingSteps,
    visualizeOk,
    compareOk,
    trackOk
  };
}
