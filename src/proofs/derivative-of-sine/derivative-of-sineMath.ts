import { LIMITS, SNAP_POINTS } from './derivative-of-sineConfig';

export interface SnapResult {
  isSnapped: boolean;
  snappedValue: number;
  band: 'commit' | 'attract' | 'discover' | 'none';
  targetLabel?: string;
}

/**
 * Calculates the trigonometric values and slopes
 */
export function calculateProofData(x: number, dx: number) {
  const sinX = Math.sin(x);
  const cosX = Math.cos(x);
  const xPlusDx = x + dx;
  const sinXPlusDx = Math.sin(xPlusDx);
  
  // Secant slope = (sin(x + dx) - sin(x)) / dx
  const secantSlope = dx !== 0 ? (sinXPlusDx - sinX) / dx : cosX;
  
  // Tangent slope is exactly cos(x)
  const tangentSlope = cosX;
  
  // Local approximation error
  const approximationError = Math.abs(tangentSlope - secantSlope);

  return {
    sinX,
    cosX,
    xPlusDx,
    sinXPlusDx,
    secantSlope,
    tangentSlope,
    approximationError,
  };
}

/**
 * Validates domain and clamps to valid values
 */
export function clampX(x: number, dx: number): number {
  // P cannot exceed boundary minus dx to keep Q within bounds if needed
  return Math.max(LIMITS.xMin, Math.min(LIMITS.xMax - dx, x));
}

/**
 * Implements magnetic snapping in three bands (discover, attract, commit)
 * thresholds:
 * - commit: 6px
 * - attract: 20px
 * - discover: 45px
 */
export function getSnapInfo(x: number, scaleX: number, zoom: number): SnapResult {
  let closestTarget = SNAP_POINTS[0];
  let minDistance = Infinity;

  for (const point of SNAP_POINTS) {
    const dist = Math.abs(x - point.value);
    if (dist < minDistance) {
      minDistance = dist;
      closestTarget = point;
    }
  }

  // Convert distance in radians to screen pixels
  const distPixels = minDistance * scaleX * zoom;

  if (distPixels <= 6) {
    return {
      isSnapped: true,
      snappedValue: closestTarget.value,
      band: 'commit',
      targetLabel: closestTarget.label,
    };
  } else if (distPixels <= 20) {
    return {
      isSnapped: false,
      snappedValue: closestTarget.value,
      band: 'attract',
      targetLabel: closestTarget.label,
    };
  } else if (distPixels <= 45) {
    return {
      isSnapped: false,
      snappedValue: closestTarget.value,
      band: 'discover',
      targetLabel: closestTarget.label,
    };
  }

  return {
    isSnapped: false,
    snappedValue: x,
    band: 'none',
  };
}

/**
 * Checks for slope sign tracks
 * x ranges and signs of cos(x):
 * [-2pi, -3pi/2] -> + (cos is positive)
 * [-3pi/2, -pi/2] -> -
 * [-pi/2, pi/2] -> +
 * [pi/2, 3pi/2] -> -
 * [3pi/2, 2pi] -> +
 */
export function getSlopeSignZone(x: number): 'plus' | 'minus' | 'zero' {
  const cosVal = Math.cos(x);
  if (Math.abs(cosVal) < 1e-4) return 'zero';
  return cosVal > 0 ? 'plus' : 'minus';
}
