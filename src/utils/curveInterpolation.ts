import { FlowTestPoint, PreviousFlowTestRecord } from '../types/process';

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Fritsch-Carlson Monotone Cubic Spline Interpolation for smooth, natural curves in SVG.
 * Guarantees:
 * 1. Curve passes EXACTLY through every data point.
 * 2. C1-continuous (completely smooth, zero sharp lines or angular vertices).
 * 3. Monotonic in X (zero artificial overshoot or unnatural looping).
 */
export function createSmoothCurvePath(points: Point2D[]): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  
  if (points.length === 2) {
    // 2 points: gentle natural cubic curve
    const p0 = points[0];
    const p1 = points[1];
    const dx = p1.x - p0.x;
    return `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C ${(p0.x + dx * 0.4).toFixed(1)} ${p0.y.toFixed(1)}, ${(p1.x - dx * 0.4).toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }

  const n = points.length;
  // Calculate secant slopes
  const dxs: number[] = [];
  const dys: number[] = [];
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = Math.max(0.1, points[i + 1].x - points[i].x);
    const dy = points[i + 1].y - points[i].y;
    dxs.push(dx);
    dys.push(dy);
    slopes.push(dy / dx);
  }

  // Calculate tangents using Fritsch-Carlson monotone cubic condition
  const m: number[] = new Array(n).fill(0);
  m[0] = slopes[0];
  m[n - 1] = slopes[n - 2];

  for (let i = 1; i < n - 1; i++) {
    const s0 = slopes[i - 1];
    const s1 = slopes[i];
    if (s0 * s1 <= 0) {
      m[i] = 0;
    } else {
      const dx0 = dxs[i - 1];
      const dx1 = dxs[i];
      const w0 = dx0 + 2 * dx1;
      const w1 = 2 * dx0 + dx1;
      m[i] = (w0 + w1) / (w0 / s0 + w1 / s1);
    }
  }

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = dxs[i];
    const cp1x = p0.x + dx / 3;
    const cp1y = p0.y + m[i] * (dx / 3);
    const cp2x = p1.x - dx / 3;
    const cp2y = p1.y - m[i + 1] * (dx / 3);

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }

  return path;
}

/**
 * Builds a completely smooth polygon ribbon path between an upper curve and lower curve.
 * Used for the ±15% tolerance corridor.
 */
export function createSmoothRibbonPath(upper: Point2D[], lower: Point2D[]): string {
  if (!upper || upper.length < 2 || !lower || lower.length < 2) return '';
  
  // Forward along upper points
  const forwardPath = createSmoothCurvePath(upper);
  
  // Reverse lower points
  const revLower = [...lower].reverse();
  const n = revLower.length;
  
  // Build reverse cubic curve commands along lower points
  let revCommands = '';
  if (n === 2) {
    const p0 = revLower[0];
    const p1 = revLower[1];
    const dx = p1.x - p0.x;
    revCommands = `C ${(p0.x + dx * 0.4).toFixed(1)} ${p0.y.toFixed(1)}, ${(p1.x - dx * 0.4).toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  } else {
    const dxs: number[] = [];
    const dys: number[] = [];
    const slopes: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      const dx = Math.min(-0.1, revLower[i + 1].x - revLower[i].x);
      const dy = revLower[i + 1].y - revLower[i].y;
      dxs.push(dx);
      dys.push(dy);
      slopes.push(dy / dx);
    }

    const m: number[] = new Array(n).fill(0);
    m[0] = slopes[0];
    m[n - 1] = slopes[n - 2];

    for (let i = 1; i < n - 1; i++) {
      const s0 = slopes[i - 1];
      const s1 = slopes[i];
      if (s0 * s1 <= 0) {
        m[i] = 0;
      } else {
        const dx0 = Math.abs(dxs[i - 1]);
        const dx1 = Math.abs(dxs[i]);
        const w0 = dx0 + 2 * dx1;
        const w1 = 2 * dx0 + dx1;
        m[i] = (w0 + w1) / (w0 / s0 + w1 / s1);
      }
    }

    for (let i = 0; i < n - 1; i++) {
      const p0 = revLower[i];
      const p1 = revLower[i + 1];
      const dx = dxs[i];
      const cp1x = p0.x + dx / 3;
      const cp1y = p0.y + m[i] * (dx / 3);
      const cp2x = p1.x - dx / 3;
      const cp2y = p1.y - m[i + 1] * (dx / 3);

      revCommands += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
  }

  // Connect upper right to lower right, then lower curve back to lower left, then close path
  return `${forwardPath} L ${revLower[0].x.toFixed(1)} ${revLower[0].y.toFixed(1)} ${revCommands} Z`;
}

export interface DynamicFlowScales {
  minFlowX: number;
  maxFlowX: number;
  minPressureY: number;
  maxPressureY: number;
  yTicks: number[];
  xTicks: number[];
}

/**
 * Computes dynamic domain bounds and clean round tick marks so graphs
 * are viewed with optimal headroom and proportion every time, regardless
 * of custom pressure values or flow rates.
 */
export function computeDynamicFlowScales(
  testPoints: FlowTestPoint[],
  previousTests?: PreviousFlowTestRecord[],
  fallbackDefaultFlows: number[] = [10, 15, 20, 25, 30]
): DynamicFlowScales {
  // Collect all set flows
  const flows = testPoints.map((p) => p.targetFlowLpm || 0).filter((v) => v > 0);
  if (!flows.length) flows.push(...fallbackDefaultFlows);
  
  const minFlowX = 0;
  const rawMaxF = Math.max(...flows);
  // Round max flow up with comfortable headroom
  const maxFlowX = Math.max(30, Math.ceil((rawMaxF * 1.12) / 5) * 5);

  // Collect all pressures (target, tolerance boundaries, measured, previous)
  const pressures: number[] = [];
  testPoints.forEach((p, idx) => {
    const targetP = p.targetDeltaPressureBar || (0.35 + idx * 0.42);
    pressures.push(targetP);
    pressures.push(targetP * 1.18); // include upper tolerance ribbon with buffer
    if (p.deltaPressureBar !== undefined && p.deltaPressureBar !== null && p.deltaPressureBar > 0) {
      pressures.push(p.deltaPressureBar);
    }
  });

  if (previousTests && previousTests.length > 0) {
    previousTests.forEach((t) => {
      t.testPoints?.forEach((pt) => {
        if (pt.deltaPressureBar && pt.deltaPressureBar > 0) {
          pressures.push(pt.deltaPressureBar);
        }
      });
    });
  }

  const rawMaxP = pressures.length ? Math.max(...pressures) : 2.0;
  
  // Determine clean round step for Y axis (e.g. 0.5, 0.4, or 0.25 Bar)
  let stepP = 0.5;
  if (rawMaxP <= 1.2) stepP = 0.25;
  else if (rawMaxP <= 2.2) stepP = 0.4;
  else if (rawMaxP <= 3.5) stepP = 0.5;
  else stepP = 1.0;

  const maxPressureY = Number((Math.ceil((rawMaxP * 1.15) / stepP) * stepP).toFixed(2));
  const minPressureY = 0.0;

  // Generate clean Y ticks
  const yTicks: number[] = [];
  for (let val = 0; val <= maxPressureY + 0.001; val += stepP) {
    yTicks.push(Number(val.toFixed(2)));
  }

  // Generate clean X ticks
  const stepF = maxFlowX > 45 ? 10 : 5;
  const xTicks: number[] = [];
  for (let val = stepF; val <= maxFlowX; val += stepF) {
    xTicks.push(val);
  }

  return {
    minFlowX,
    maxFlowX,
    minPressureY,
    maxPressureY,
    yTicks,
    xTicks,
  };
}
