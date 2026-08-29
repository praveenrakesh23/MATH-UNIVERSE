export type ProofState = 'inspect' | 'manipulate' | 'preserve' | 'connect' | 'conclude' | 'transfer';
export type VisualMode = 'groups' | 'array' | 'clock' | 'factors';

export interface Hint {
  title: string;
  text: string;
}

export const LIMITS = {
  defaultA: 23,
  defaultB: 5,
  minA: 1,
  maxA: 35,
  minB: 2,
  maxB: 12,
  snapThreshold: 35, // in screen pixels
};

export const HINTS: Record<number, Hint> = {
  1: {
    title: 'Notice the Layout',
    text: 'Inspect the top tray containing the dividend items (a = 23). The task is to group them into equal groups of divisor items (b = 5).'
  },
  2: {
    title: 'Start Grouping',
    text: 'Drag items from the top tray into the dashed group boxes below. Or click "Step" or "Next" in the playback controls to automate it.'
  },
  3: {
    title: 'Observe Invariants',
    text: 'During regrouping, the total count of items (23) never changes. No items are lost or created.'
  },
  4: {
    title: 'Locate Leftovers',
    text: 'Once you fill 4 complete groups (4 × 5 = 20), the remaining 3 items cannot form a complete group of 5. Place them in the Leftovers tray.'
  },
  5: {
    title: 'Formulate the Equation',
    text: 'Use the results to complete the division identity: 23 = 5 × 4 + 3. The quotient q is 4, and the remainder r is 3.'
  }
};
