import { divide, getCounterColor, generateGroupsSnapTargets } from './divisibility-equal-groupingMath';
import { divisibilityReducer, initDivisibilityState } from './divisibility-equal-groupingReducer';
import { checkCompletion } from './divisibility-equal-groupingCompletion';

export function runDivisibilityTests() {
  const errors: string[] = [];

  const assert = (condition: boolean, msg: string) => {
    if (!condition) {
      errors.push(`Assertion failed: ${msg}`);
    }
  };

  console.log('Starting tests for divisibility-equal-grouping...');

  // 1. Math Tests
  try {
    const div = divide(23, 5);
    assert(div.q === 4, 'Quotient of 23 ÷ 5 should be 4');
    assert(div.r === 3, 'Remainder of 23 ÷ 5 should be 3');
    assert(div.divisible === false, '23 is not divisible by 5');

    const color = getCounterColor(1);
    assert(color !== '', 'Should return color code string');

    const snaps = generateGroupsSnapTargets(23, 5);
    assert(snaps.length > 0, 'Snap list should not be empty');
    assert(snaps.filter(s => s.type === 'tray').length === 23, 'Tray snaps should equal A');
  } catch (err: any) {
    errors.push(`Math test error: ${err.message}`);
  }

  // 2. Reducer Tests
  try {
    let state = initDivisibilityState();
    assert(state.a === 23, 'Initial A is 23');
    
    // Change A
    state = divisibilityReducer(state, { type: 'SET_A', payload: 17 });
    assert(state.a === 17, 'A updated to 17');
    assert(state.counters.length === 17, 'Counter list updated to 17');
    
    // Change Mode
    state = divisibilityReducer(state, { type: 'CHANGE_MODE', payload: 'array' });
    assert(state.mode === 'array', 'Mode updated to array');

    // Undo Redo test
    state = divisibilityReducer(state, { type: 'UNDO' });
    assert(state.mode === 'groups', 'Undo should return mode back to groups');
  } catch (err: any) {
    errors.push(`Reducer test error: ${err.message}`);
  }

  // 3. Completion Tests
  try {
    let state = initDivisibilityState();
    let status = checkCompletion(state);
    assert(status.isComplete === false, 'Initial state should not be complete');

    // Manually satisfy completion:
    // Set prediction
    state = divisibilityReducer(state, { type: 'SET_PREDICTION', payload: { q: '5', r: '0' } });
    state = divisibilityReducer(state, { type: 'CHECK_PREDICTION' });
    assert(state.predictionCorrect === true, 'Prediction should check out as correct');

    // Set misconception
    state = divisibilityReducer(state, { type: 'SET_MISCONCEPTION', payload: 'correct' });
    state = divisibilityReducer(state, { type: 'CHECK_MISCONCEPTION' });
    assert(state.misconceptionSelected === 'correct', 'Misconception correct selected');

    // Visit conclude and transfer
    state = divisibilityReducer(state, { type: 'SET_STATE', payload: 'conclude' });
    state = divisibilityReducer(state, { type: 'SET_STATE', payload: 'transfer' });

    // Dock all counters correctly
    const q = Math.floor(state.a / state.b); // 4 groups
    const snaps = generateGroupsSnapTargets(state.a, state.b);
    
    state.counters.forEach((c, idx) => {
      let targetType: 'group' | 'leftovers' = 'group';
      let targetGroupId = 0;
      let targetSlotId = 0;

      if (idx < q * state.b) {
        targetType = 'group';
        targetGroupId = Math.floor(idx / state.b);
        targetSlotId = idx % state.b;
      } else {
        targetType = 'leftovers';
        targetSlotId = idx - q * state.b;
      }

      const match = snaps.find(s => s.type === targetType && s.groupId === targetGroupId && s.slotId === targetSlotId);
      if (match) {
        state = divisibilityReducer(state, {
          type: 'DOCK_COUNTER',
          payload: {
            id: c.id,
            targetType,
            targetGroupId,
            targetSlotId,
            x: match.x,
            y: match.y
          }
        });
      }
    });

    status = checkCompletion(state);
    assert(status.isComplete === true, 'Completion status should be complete after satisfying all conditions');
  } catch (err: any) {
    errors.push(`Completion test error: ${err.message}`);
  }

  if (errors.length === 0) {
    console.log('All tests passed successfully for divisibility-equal-grouping!');
  } else {
    console.error('Test failures in divisibility-equal-grouping:');
    errors.forEach(err => console.error(`- ${err}`));
  }

  return errors;
}
