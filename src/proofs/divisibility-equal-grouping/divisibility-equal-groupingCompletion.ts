import type { DivisibilityStateModel } from './divisibility-equal-groupingReducer';

export interface CompletionStatus {
  isComplete: boolean;
  missingSteps: string[];
  groupingOk: boolean;
  predictionOk: boolean;
  misconceptionOk: boolean;
}

/**
 * Checks if the learner has successfully completed all tasks based on construction evidence.
 */
export function checkCompletion(state: DivisibilityStateModel): CompletionStatus {
  const missingSteps: string[] = [];
  const q = Math.floor(state.a / state.b);
  
  // 1. Grouping verification: All counters must be correctly grouped or placed in leftovers
  // Every counter from 0 to q*b - 1 must have targetType = 'group'
  // Every counter from q*b to a - 1 must have targetType = 'leftovers'
  let groupingOk = true;
  for (let i = 0; i < state.a; i++) {
    const c = state.counters[i];
    if (i < q * state.b) {
      if (c.targetType !== 'group') {
        groupingOk = false;
        break;
      }
    } else {
      if (c.targetType !== 'leftovers') {
        groupingOk = false;
        break;
      }
    }
  }

  if (!groupingOk) {
    missingSteps.push('Drag all counters into their correct groups or the Leftovers tray.');
  }

  // 2. Prediction validation
  const predictionOk = state.predictionChecked && state.predictionCorrect;
  if (!predictionOk) {
    missingSteps.push('Solve the Prediction puzzle by identifying quotient (q = 5) and remainder (r = 0) for a = 35, b = 7.');
  }

  // 3. Misconception checkpoint
  const misconceptionOk = state.misconceptionChecked && state.misconceptionSelected === 'correct';
  if (!misconceptionOk) {
    missingSteps.push('Solve the Misconception Checkpoint by selecting the correct quotient and remainder theorem constraint.');
  }

  // Check state transitions history
  const visitedStates = new Set(state.history.map(h => h.proofState));
  const hasVisitedConclude = visitedStates.has('conclude');
  const hasVisitedTransfer = visitedStates.has('transfer');

  if (!hasVisitedConclude) {
    missingSteps.push('Navigate to the Conclude tab to formulate the general equation.');
  }
  if (!hasVisitedTransfer) {
    missingSteps.push('Navigate to the Transfer tab to test a new configuration.');
  }

  const isComplete = groupingOk && predictionOk && misconceptionOk && hasVisitedConclude && hasVisitedTransfer;

  return {
    isComplete,
    missingSteps,
    groupingOk,
    predictionOk,
    misconceptionOk,
  };
}
