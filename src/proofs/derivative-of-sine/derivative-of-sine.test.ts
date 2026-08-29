import { calculateProofData, getSnapInfo, getSlopeSignZone } from './derivative-of-sineMath';
import { proofReducer, INITIAL_STATE } from './derivative-of-sineReducer';
import type { ProofStateModel } from './derivative-of-sineReducer';
import { checkCompletion } from './derivative-of-sineCompletion';

/**
 * Basic pure test assertions runner
 */
export function runTests() {
  const errors: string[] = [];

  const assert = (condition: boolean, msg: string) => {
    if (!condition) {
      errors.push(`Assertion failed: ${msg}`);
    }
  };

  console.log('Starting tests for derivative-of-sine...');

  // 1. Math Formula Tests
  try {
    const data = calculateProofData(0, 0.1);
    assert(Math.abs(data.sinX - 0) < 1e-6, 'sin(0) should be 0');
    assert(Math.abs(data.cosX - 1) < 1e-6, 'cos(0) should be 1');
    assert(data.tangentSlope === 1, 'Tangent slope at x=0 should be cos(0) = 1');
    assert(data.secantSlope > 0.99 && data.secantSlope < 1.0, 'Secant slope at x=0 with dx=0.1 should be close to 1');
    
    // Snapping logic test (scaleX approx 59.7 pixels per radian)
    const scaleX = 59.7;
    
    // Exact match target (e.g. pi/2 is approx 1.57079)
    const snap1 = getSnapInfo(1.57079, scaleX, 1.0);
    assert(snap1.isSnapped === true && snap1.band === 'commit' && snap1.snappedValue === 0.5 * Math.PI, 'Should snap exactly to pi/2');

    // Attract band (e.g. pi/2 + 0.1 rad is within attract band of 0.40 rad)
    const snap2 = getSnapInfo(1.57079 + 0.1, scaleX, 1.0);
    assert(snap2.isSnapped === false && snap2.band === 'attract', 'Should attract near pi/2');

    // Out of snap band (e.g. pi/2 + 1.0 rad is way beyond 45 pixels / 0.75 rad)
    const snap3 = getSnapInfo(1.57079 + 1.0, scaleX, 1.0);
    assert(snap3.isSnapped === false && snap3.band === 'none', 'Should not snap or attract far from targets');

    // Slope sign zone tests
    assert(getSlopeSignZone(0) === 'plus', 'cos(0) is positive');
    assert(getSlopeSignZone(Math.PI) === 'minus', 'cos(pi) is negative');
    assert(getSlopeSignZone(Math.PI / 2) === 'zero', 'cos(pi/2) is zero');
  } catch (err: any) {
    errors.push(`Math test error: ${err.message}`);
  }

  // 2. Reducer Action Tests
  try {
    // SET_X test
    let state = proofReducer(INITIAL_STATE, { type: 'SET_X', payload: 1.0, commit: true });
    assert(state.x === 1.0, 'Reducer: SET_X did not update x');
    assert(state.history.length === 2, 'Reducer: SET_X commit should append to history');

    // SET_DX boundary tests
    state = proofReducer(state, { type: 'SET_DX', payload: -1.0 }); // underflow
    assert(state.dx === 0.01, 'Reducer: SET_DX should clamp to minDx');
    
    state = proofReducer(state, { type: 'SET_DX', payload: 10.0 }); // overflow
    assert(state.dx === 1.0, 'Reducer: SET_DX should clamp to maxDx');

    // Undo Redo test
    state = proofReducer(INITIAL_STATE, { type: 'SET_X', payload: 0.5, commit: true });
    assert(state.x === 0.5, 'x set to 0.5');
    
    state = proofReducer(state, { type: 'UNDO' });
    assert(state.x === INITIAL_STATE.x, 'Undo should restore previous state');

    state = proofReducer(state, { type: 'REDO' });
    assert(state.x === 0.5, 'Redo should re-apply state');

    // RESET test
    state = proofReducer(state, { type: 'RESET' });
    assert(state.x === INITIAL_STATE.x, 'Reset should restore INITIAL_STATE');
  } catch (err: any) {
    errors.push(`Reducer test error: ${err.message}`);
  }

  // 3. Completion Validation Tests
  try {
    // Start with default state
    let state: ProofStateModel = { ...INITIAL_STATE };
    let snaps = new Set<number>();
    
    let compl = checkCompletion(state, snaps);
    assert(compl.isComplete === false, 'Default state should not be complete');

    // Simulate interactions
    state = proofReducer(state, { type: 'SET_STATE', payload: 'manipulate' });
    state = proofReducer(state, { type: 'SET_STATE', payload: 'conclude' });
    state = proofReducer(state, { type: 'SET_STATE', payload: 'transfer' });

    // Simulate prediction check
    state = proofReducer(state, { type: 'SET_PREDICTION', payload: '0.5' });
    state = proofReducer(state, { type: 'CHECK_PREDICTION' });

    // Simulate misconception checkpoint
    state = proofReducer(state, { type: 'SET_MISCONCEPTION', payload: 'cos' });
    state = proofReducer(state, { type: 'CHECK_MISCONCEPTION' });

    // Simulate snaps visited
    snaps.add(0.5 * Math.PI);
    snaps.add(0);

    compl = checkCompletion(state, snaps);
    assert(compl.isComplete === true, 'Completion should be awarded when all steps are fulfilled');
  } catch (err: any) {
    errors.push(`Completion test error: ${err.message}`);
  }

  if (errors.length === 0) {
    console.log('All tests passed successfully for derivative-of-sine!');
  } else {
    console.error('Test failures detected:');
    errors.forEach(err => console.error(`- ${err}`));
  }

  return errors;
}
