import type { VisualMode } from './divisibility-equal-groupingConfig';

export interface CounterPosition {
  id: number;
  label: number;
  x: number;
  y: number;
  color: string;
}

export interface SnapTarget {
  type: 'tray' | 'group' | 'leftovers';
  groupId?: number; // if group, 0-indexed group card ID
  slotId: number; // slot index inside the card/tray
  x: number;
  y: number;
}

/**
 * Perform Euclidean division: a = bq + r
 */
export function divide(a: number, b: number) {
  const q = Math.floor(a / b);
  const r = a % b;
  return { q, r, divisible: r === 0 };
}

/**
 * Returns distinct colors for visual cues matching page2-final.png
 */
export function getCounterColor(num: number): string {
  const colors = [
    '#5b2cff', // violet-blue
    '#38c36f', // green
    '#ef9d22', // gold
    '#7b50ff', // purple
    '#f25a68', // red
    '#ffd9c8', // orange
  ];
  return colors[(num - 1) % colors.length];
}

/**
 * Generates the snap target list for groups mode.
 * SVG viewBox: 900 x 420
 */
export function generateGroupsSnapTargets(a: number, b: number): SnapTarget[] {
  const targets: SnapTarget[] = [];
  const q = Math.floor(a / b);
  
  // 1. Top Tray (Unassigned/Tray positions)
  // Grid layout: 2 rows of up to 12 items.
  const trayStartX = 60;
  const trayStartY = 90;
  const traySpacingX = 54;
  const traySpacingY = 56;
  for (let i = 0; i < a; i++) {
    const row = Math.floor(i / 11);
    const col = i % 11;
    targets.push({
      type: 'tray',
      slotId: i,
      x: trayStartX + col * traySpacingX,
      y: trayStartY + row * traySpacingY,
    });
  }

  // 2. Group Cards (Dashed boxes below)
  // We lay out up to 5 group boxes side-by-side.
  const groupSpacingX = 145;
  const groupStartX = 80;
  const groupStartY = 240;
  
  // Lay out dots in a grid inside each card
  // for b = 5: column of 3 and column of 2.
  const getSlotOffset = (slotIdx: number) => {
    const row = slotIdx % 2;
    const col = Math.floor(slotIdx / 2);
    return {
      dx: col * 48 + 24,
      dy: row * 46 + 28,
    };
  };

  for (let g = 0; g < q; g++) {
    for (let s = 0; s < b; s++) {
      const offset = getSlotOffset(s);
      targets.push({
        type: 'group',
        groupId: g,
        slotId: s,
        x: groupStartX + g * groupSpacingX + offset.dx,
        y: groupStartY + offset.dy,
      });
    }
  }

  // 3. Leftovers Box
  const leftoverStartX = groupStartX + q * groupSpacingX;
  for (let s = 0; s < (a % b); s++) {
    const offset = getSlotOffset(s);
    targets.push({
      type: 'leftovers',
      slotId: s,
      x: leftoverStartX + offset.dx,
      y: groupStartY + offset.dy,
    });
  }

  return targets;
}

/**
 * Helper to compute positions of nodes in alternative modes
 */
export function getAlternativeModePositions(a: number, b: number, mode: VisualMode) {
  const positions: { x: number; y: number }[] = [];
  const W = 900;
  const H = 380;
  const midX = W / 2;
  const midY = H / 2;

  if (mode === 'array') {
    // Array mode: Grid of b columns and q rows + remainder in the last row
    const colSpacing = 48;
    const rowSpacing = 48;
    const startX = midX - ((b - 1) * colSpacing) / 2;
    const startY = midY - 60;

    for (let i = 0; i < a; i++) {
      const r = Math.floor(i / b);
      const c = i % b;
      positions.push({
        x: startX + c * colSpacing,
        y: startY + r * rowSpacing,
      });
    }
  } else if (mode === 'clock') {
    // Clock mode: circular layout on a dial of b hours
    const radius = 100;
    for (let i = 0; i < a; i++) {
      // position overlaps but scales outward for cycles (spiral)
      const cycle = Math.floor(i / b);
      const angle = (i % b) * (2 * Math.PI / b) - Math.PI / 2;
      const curRadius = radius + cycle * 18;
      positions.push({
        x: midX + curRadius * Math.cos(angle),
        y: midY + curRadius * Math.sin(angle),
      });
    }
  } else if (mode === 'factors') {
    // Factors tree layout
    const quotient = Math.floor(a / b);
    // Main tree node at top, then splits to groups, then splits to unit counters
    // We can draw a grid representing factor pairs
    const spacingX = 60;
    const startX = midX - ((quotient - 1) * spacingX) / 2;
    
    for (let i = 0; i < a; i++) {
      if (i < quotient * b) {
        // Form a grid of groups of size b
        const g = Math.floor(i / b);
        const s = i % b;
        positions.push({
          x: startX + g * spacingX + (s - (b-1)/2) * 8,
          y: midY - 40 + g * 12 + s * 4,
        });
      } else {
        // Remainder branch on the side
        const s = i - quotient * b;
        positions.push({
          x: midX + 150 + s * 24,
          y: midY + 40,
        });
      }
    }
  }

  return positions;
}
