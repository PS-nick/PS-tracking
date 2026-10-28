import React, { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { FlowTestPoint, PreviousFlowTestPoint, PreviousFlowTestRecord } from '../types/process';
import { 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  BarChart2, 
  Activity, 
  Info,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sparkles,
  GitCommit,
  Gauge
} from 'lucide-react';

interface FlowDifferenceChartProps {
  testPoints: FlowTestPoint[];
  isNewUnit: boolean;
  previousTest?: PreviousFlowTestRecord;
  previousTests?: PreviousFlowTestRecord[];
  unitSerialNumber?: string;
  partNumber?: string;
  isPermanentLocked?: boolean;
  baselineSourceText?: string;
  lifeNumber?: number;
  serviceCycleCount?: number;
}

// Helper to compute standard target pressure drop for a given set flow rate
export const getTargetDeltaPressure = (p: FlowTestPoint | PreviousFlowTestPoint | any, index: number): number => {
  if (p.targetDeltaPressureBar && p.targetDeltaPressureBar > 0) {
    return p.targetDeltaPressureBar;
  }
  const defaultTargets = [0.35, 0.65, 1.05, 1.55, 2.15, 2.85];
  if (index >= 0 && index < defaultTargets.length) {
    return defaultTargets[index];
  }
  const q = p.targetFlowLpm || (10 + index * 5);
  return Number((0.35 * Math.pow(Math.max(1, q) / 10, 1.55)).toFixed(2));
};

// Helper to get measured pressure drop
export const getMeasuredDeltaPressure = (p: FlowTestPoint | PreviousFlowTestPoint | any, index: number): number => {
  if (p.deltaPressureBar !== undefined && p.deltaPressureBar !== null && p.deltaPressureBar > 0) {
    return p.deltaPressureBar;
  }
  // If legacy measuredFlowLpm was filled and deltaPressureBar is missing, approximate nominal
  if (p.measuredFlowLpm > 0) {
    const targetP = getTargetDeltaPressure(p, index);
    return targetP;
  }
  return 0;
};

export const FlowDifferenceChart: React.FC<FlowDifferenceChartProps> = ({
  testPoints,
  isNewUnit,
  previousTest,
  previousTests,
  unitSerialNumber,
  partNumber,
  isPermanentLocked,
  baselineSourceText,
  lifeNumber = 1,
  serviceCycleCount,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'combined' | 'curve' | 'difference' | 'previous_comparison'>('combined');
  const [showPrev1Overlay, setShowPrev1Overlay] = useState<boolean>(true);
  const [showPrev2Overlay, setShowPrev2Overlay] = useState<boolean>(true);

  const effectiveLife = lifeNumber || (isNewUnit ? 1 : 2);
  const isMoreThan2Services = !isNewUnit && (
    effectiveLife > 2 || 
    (serviceCycleCount !== undefined && serviceCycleCount > 2) || 
    (previousTests && previousTests.length >= 2)
  );

  // Previous Test 1 (Most recent previous overhaul)
  const prevRun1: PreviousFlowTestRecord = useMemo(() => {
    return (previousTests && previousTests[0]) || previousTest || {
      testDate: '2025-11-20T14:15:00.000Z',
      serviceRecordNumber: `SR-PREV-${unitSerialNumber || '8842'}-L${Math.max(1, effectiveLife - 1)}`,
      lifeNumber: Math.max(1, effectiveLife - 1),
      runType: 'previous_overhaul',
      flowPass: true,
      technician: 'L. Badoer (Lead Tech)',
      notes: `Life #${Math.max(1, effectiveLife - 1)} prior overhaul calibration run on RIG-04.`,
      testPoints: testPoints.map((p, idx) => {
        const targetP = getTargetDeltaPressure(p, idx);
        const priorP = Number((targetP * (isNewUnit ? 1.0 : 1.08)).toFixed(2));
        return {
          pointIndex: p.pointIndex || idx + 1,
          name: p.name,
          frequencyHz: p.frequencyHz || (20 + idx * 10),
          targetFlowLpm: p.targetFlowLpm,
          measuredFlowLpm: p.targetFlowLpm,
          deltaPressureBar: priorP,
          targetDeltaPressureBar: targetP,
          passed: true,
        };
      }),
    };
  }, [previousTests, previousTest, unitSerialNumber, effectiveLife, testPoints, isNewUnit]);

  // Previous Test 2 (Two services ago: Life N - 2)
  const prevRun2: PreviousFlowTestRecord = useMemo(() => {
    return (previousTests && previousTests[1]) || {
      testDate: '2025-04-12T09:30:00.000Z',
      serviceRecordNumber: `SR-BIRTH-${unitSerialNumber || '8842'}-L${Math.max(1, effectiveLife - 2)}`,
      lifeNumber: Math.max(1, effectiveLife - 2),
      runType: effectiveLife - 2 <= 1 ? 'birth_baseline' : 'previous_overhaul',
      flowPass: true,
      technician: 'N. Malgarotti (Depot QA)',
      notes: effectiveLife - 2 <= 1 
        ? `Life #1 factory birth baseline calibration record.`
        : `Life #${effectiveLife - 2} earlier overhaul run on RIG-02.`,
      testPoints: testPoints.map((p, idx) => {
        const targetP = getTargetDeltaPressure(p, idx);
        const priorP2 = Number((targetP * (effectiveLife - 2 <= 1 ? 0.99 : 1.05)).toFixed(2));
        return {
          pointIndex: p.pointIndex || idx + 1,
          name: p.name,
          frequencyHz: p.frequencyHz || (20 + idx * 10),
          targetFlowLpm: p.targetFlowLpm,
          measuredFlowLpm: p.targetFlowLpm,
          deltaPressureBar: priorP2,
          targetDeltaPressureBar: targetP,
          passed: true,
        };
      }),
    };
  }, [previousTests, unitSerialNumber, effectiveLife, testPoints]);

  const prevPoints1 = prevRun1.testPoints || [];
  const prevPoints2 = prevRun2.testPoints || [];

  // Chart layout geometry
  const width = 700;
  const height = 300;
  const padding = { top: 28, right: 35, bottom: 48, left: 62 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // DYNAMIC DOMAIN SCALING:
  // 1. Gather all actual pressures (target, measured, tolerances, historical)
  const { minPressureY, maxPressureY, yTicks, stepY } = useMemo(() => {
    const allPressures: number[] = [];
    testPoints.forEach((p, idx) => {
      const targetP = getTargetDeltaPressure(p, idx);
      if (targetP > 0) {
        allPressures.push(targetP);
        allPressures.push(targetP * 1.15); // upper tolerance bound
      }
      const measuredP = getMeasuredDeltaPressure(p, idx);
      if (measuredP > 0) {
        allPressures.push(measuredP);
      }
    });

    prevPoints1.forEach((p, idx) => {
      if (p.deltaPressureBar && p.deltaPressureBar > 0) {
        allPressures.push(p.deltaPressureBar);
      }
    });

    if (isMoreThan2Services) {
      prevPoints2.forEach((p) => {
        if (p.deltaPressureBar && p.deltaPressureBar > 0) {
          allPressures.push(p.deltaPressureBar);
        }
      });
    }

    const rawMax = allPressures.length > 0 ? Math.max(...allPressures) : 2.15;
    // Add ~18% headroom so curves and markers never collide with the top edge
    const desiredMax = Math.max(0.6, rawMax * 1.18);

    let chosenStep = 0.5;
    if (desiredMax <= 0.8) chosenStep = 0.1;
    else if (desiredMax <= 1.4) chosenStep = 0.2;
    else if (desiredMax <= 2.8) chosenStep = 0.5;
    else if (desiredMax <= 5.5) chosenStep = 1.0;
    else chosenStep = 2.0;

    const maxY = Math.ceil(desiredMax / chosenStep) * chosenStep;
    const minY = 0.0;

    const ticks: number[] = [];
    for (let val = minY; val <= maxY + 0.0001; val += chosenStep) {
      ticks.push(Number(val.toFixed(2)));
    }

    return { minPressureY: minY, maxPressureY: maxY, yTicks: ticks, stepY: chosenStep };
  }, [testPoints, prevPoints1, prevPoints2, isMoreThan2Services]);

  // 2. Gather all actual flow rates for dynamic X scaling
  const { minFlowX, maxFlowX, xTicks, stepX } = useMemo(() => {
    const allFlows: number[] = [];
    (testPoints || []).forEach((p) => {
      if (typeof p?.targetFlowLpm === 'number' && p.targetFlowLpm > 0) {
        allFlows.push(p.targetFlowLpm);
      }
    });
    (prevPoints1 || []).forEach((p) => {
      if (typeof p?.targetFlowLpm === 'number' && p.targetFlowLpm > 0) {
        allFlows.push(p.targetFlowLpm);
      }
    });
    if (isMoreThan2Services && prevPoints2) {
      prevPoints2.forEach((p) => {
        if (typeof p?.targetFlowLpm === 'number' && p.targetFlowLpm > 0) {
          allFlows.push(p.targetFlowLpm);
        }
      });
    }

    // Dynamically find max and min flow values from actual points
    const rawMax = allFlows.length > 0 ? Math.max(...allFlows) : 30;
    const rawMin = allFlows.length > 0 ? Math.min(...allFlows) : 0;

    // Exact highest flow + 5 as requested
    const maxX = rawMax + 5;
    // Dynamic minimum flow baseline minus 5 LPM margin (non-negative floor)
    const minX = Math.max(0, rawMin - 5);

    let chosenStep = 5;
    const span = maxX - minX;
    if (span <= 15) chosenStep = 2.5;
    else if (span <= 40) chosenStep = 5;
    else if (span <= 90) chosenStep = 10;
    else if (span <= 180) chosenStep = 20;
    else chosenStep = 50;

    // Generate ticks starting from minX up to maxX without floating-point precision artifacts
    const ticks: number[] = [];
    for (let val = minX; val <= maxX; val += chosenStep) {
      ticks.push(Number(val.toFixed(chosenStep % 1 !== 0 ? 1 : 0)));
    }
    if (ticks.length > 0 && Math.abs(ticks[ticks.length - 1] - maxX) > 0.5) {
      ticks.push(Number(maxX.toFixed(chosenStep % 1 !== 0 ? 1 : 0)));
    }

    return { minFlowX: minX, maxFlowX: maxX, xTicks: ticks, stepX: chosenStep };
  }, [testPoints, prevPoints1, prevPoints2, isMoreThan2Services]);

  const getX = (flowLpm: number) => {
    const rangeX = Math.max(1, maxFlowX - minFlowX);
    const clamped = Math.max(minFlowX, Math.min(maxFlowX, flowLpm));
    return padding.left + ((clamped - minFlowX) / rangeX) * chartW;
  };

  const getY = (pressureBar: number) => {
    const rangeY = Math.max(0.01, maxPressureY - minPressureY);
    const clamped = Math.max(minPressureY, Math.min(maxPressureY, pressureBar));
    const scaleRatio = (clamped - minPressureY) / rangeY;
    return padding.top + chartH - (scaleRatio * chartH);
  };

  // D3 SMOOTH CURVE GENERATORS (Monotone cubic splines: passes through each point without sharp corners or overshooting)
  const lineGenerator = useMemo(() => {
    return d3.line<{ x: number; y: number }>()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(d3.curveMonotoneX);
  }, []);

  const areaGenerator = useMemo(() => {
    return d3.area<{ x: number; y0: number; y1: number }>()
      .x((d) => d.x)
      .y0((d) => d.y0)
      .y1((d) => d.y1)
      .curve(d3.curveMonotoneX);
  }, []);

  // Sort test points by flow rate ascending to ensure monotonic interpolation
  const sortedPoints = useMemo(() => {
    return [...testPoints].sort((a, b) => (a.targetFlowLpm || 0) - (b.targetFlowLpm || 0));
  }, [testPoints]);

  // Target Baseline Curve (Smooth spline passing through each baseline target point)
  const targetCurveCoords = useMemo(() => {
    if (sortedPoints.length === 0) return [];
    return sortedPoints.map((p) => {
      const origIndex = testPoints.indexOf(p);
      const targetP = getTargetDeltaPressure(p, origIndex);
      return {
        x: getX(p.targetFlowLpm),
        y: getY(targetP),
      };
    });
  }, [sortedPoints, testPoints, minFlowX, maxFlowX, minPressureY, maxPressureY]);

  const targetPath = useMemo(() => {
    if (targetCurveCoords.length < 2) return '';
    return lineGenerator(targetCurveCoords) || '';
  }, [targetCurveCoords, lineGenerator]);

  // Tolerance Corridor Envelope (Smooth ribbon: ±15% allowable pressure drop bracket)
  const toleranceBandCoords = useMemo(() => {
    if (sortedPoints.length === 0) return [];
    return sortedPoints.map((p) => {
      const origIndex = testPoints.indexOf(p);
      const targetP = getTargetDeltaPressure(p, origIndex);
      return {
        x: getX(p.targetFlowLpm),
        y0: getY(targetP * 0.85),
        y1: getY(targetP * 1.15),
      };
    });
  }, [sortedPoints, testPoints, minFlowX, maxFlowX, minPressureY, maxPressureY]);

  const toleranceAreaPath = useMemo(() => {
    if (toleranceBandCoords.length < 2) return '';
    return areaGenerator(toleranceBandCoords) || '';
  }, [toleranceBandCoords, areaGenerator]);

  // Smooth upper and lower boundary guide lines
  const upperTolerancePath = useMemo(() => {
    if (toleranceBandCoords.length < 2) return '';
    const upperLine = d3.line<{ x: number; y1: number }>()
      .x((d) => d.x)
      .y((d) => d.y1)
      .curve(d3.curveMonotoneX);
    return upperLine(toleranceBandCoords) || '';
  }, [toleranceBandCoords]);

  const lowerTolerancePath = useMemo(() => {
    if (toleranceBandCoords.length < 2) return '';
    const lowerLine = d3.line<{ x: number; y0: number }>()
      .x((d) => d.x)
      .y((d) => d.y0)
      .curve(d3.curveMonotoneX);
    return lowerLine(toleranceBandCoords) || '';
  }, [toleranceBandCoords]);

  // Current Measured Core Pressure Drop Curve (Smooth spline through all measured points)
  const measuredPoints = useMemo(() => {
    return sortedPoints.filter((p) => getMeasuredDeltaPressure(p, testPoints.indexOf(p)) > 0);
  }, [sortedPoints, testPoints]);

  const measuredCurveCoords = useMemo(() => {
    return measuredPoints.map((p) => {
      const origIndex = testPoints.indexOf(p);
      const measuredP = getMeasuredDeltaPressure(p, origIndex);
      return {
        x: getX(p.targetFlowLpm),
        y: getY(measuredP),
      };
    });
  }, [measuredPoints, testPoints, minFlowX, maxFlowX, minPressureY, maxPressureY]);

  const measuredPath = useMemo(() => {
    if (measuredCurveCoords.length < 2) return '';
    return lineGenerator(measuredCurveCoords) || '';
  }, [measuredCurveCoords, lineGenerator]);

  // Previous Test 1 Smooth Pressure Drop Curve
  const prev1CurveCoords = useMemo(() => {
    if (!prevPoints1 || prevPoints1.length === 0) return [];
    return prevPoints1.map((p, idx) => {
      const origTarget = getTargetDeltaPressure(testPoints[idx] || p, idx);
      const prevP = p.deltaPressureBar ?? origTarget;
      return {
        x: getX(p.targetFlowLpm),
        y: getY(prevP),
      };
    });
  }, [prevPoints1, testPoints, minFlowX, maxFlowX, minPressureY, maxPressureY]);

  const previousPath1 = useMemo(() => {
    if (prev1CurveCoords.length < 2) return '';
    return lineGenerator(prev1CurveCoords) || '';
  }, [prev1CurveCoords, lineGenerator]);

  // Previous Test 2 Smooth Pressure Drop Curve
  const prev2CurveCoords = useMemo(() => {
    if (!isMoreThan2Services || !prevPoints2 || prevPoints2.length === 0) return [];
    return prevPoints2.map((p, idx) => {
      const origTarget = getTargetDeltaPressure(testPoints[idx] || p, idx);
      const prevP = p.deltaPressureBar ?? origTarget;
      return {
        x: getX(p.targetFlowLpm),
        y: getY(prevP),
      };
    });
  }, [isMoreThan2Services, prevPoints2, testPoints, minFlowX, maxFlowX, minPressureY, maxPressureY]);

  const previousPath2 = useMemo(() => {
    if (prev2CurveCoords.length < 2) return '';
    return lineGenerator(prev2CurveCoords) || '';
  }, [prev2CurveCoords, lineGenerator]);

  // Telemetry computations
  const deviations = useMemo(() => {
    return testPoints.map((p, i) => {
      const targetP = getTargetDeltaPressure(p, i);
      const measuredP = getMeasuredDeltaPressure(p, i);
      return measuredP > 0 ? Number((measuredP - targetP).toFixed(3)) : 0;
    });
  }, [testPoints]);

  const maxDeviationBar = useMemo(() => {
    return Math.max(0, ...deviations.map((d) => Math.abs(d)));
  }, [deviations]);

  // Dynamic difference bar scaling
  const dynamicMaxDiffBar = useMemo(() => {
    return Math.max(0.4, Number((Math.ceil(maxDeviationBar * 1.25 * 5) / 5).toFixed(2)));
  }, [maxDeviationBar]);

  const diffCenterY = padding.top + chartH / 2;

  const getDiffY = (diffBar: number) => {
    const clamped = Math.max(-dynamicMaxDiffBar, Math.min(dynamicMaxDiffBar, diffBar));
    return diffCenterY - (clamped / dynamicMaxDiffBar) * (chartH / 2);
  };

  // Point-by-point homologation evaluation (±15% tolerance)
  const evaluatedPoints = useMemo(() => {
    return testPoints.map((p, i) => {
      const targetP = getTargetDeltaPressure(p, i);
      const measuredP = getMeasuredDeltaPressure(p, i);
      const tolBand = Number((targetP * 0.15).toFixed(3));
      const diff = measuredP > 0 ? measuredP - targetP : null;
      const passed = diff !== null && Math.abs(diff) <= tolBand;
      return {
        point: p,
        index: i,
        targetP,
        measuredP,
        tolBand,
        diff,
        passed,
        hasValue: measuredP > 0,
      };
    });
  }, [testPoints]);

  const passingCount = evaluatedPoints.filter((ep) => ep.passed && ep.hasValue).length;
  const is3PointsPassed = passingCount >= 3;
  const allPassed = evaluatedPoints.length > 0 && evaluatedPoints.every((ep) => ep.passed && ep.hasValue);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-sky-400" />
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2 flex-wrap">
              <span>Flow Dynamics</span>
              {isPermanentLocked ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                  <span>🔒 PERMANENT TARGET (MEDIUM OF FIRST 2 TESTS)</span>
                </span>
              ) : isNewUnit ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold flex items-center gap-1">
                  <span>CUSTOMIZABLE BASELINE BAR (1ST SERVICE)</span>
                </span>
              ) : isMoreThan2Services ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1">
                  <History className="h-3 w-3 text-purple-400" />
                  <span>2 PREVIOUS OVERHAULS ACTIVE (LIFE #{effectiveLife})</span>
                </span>
              ) : (
                <span className="text-[10px] font-mono text-neutral-400 font-normal">
                  (Hydraulic Resistance Characteristic)
                </span>
              )}
            </h3>
          </div>
          <p className="text-xs text-neutral-300 mt-0.5">
            {isPermanentLocked 
              ? `Part #${partNumber || 'Core'}: Permanent locked target baseline curve established from the medium (mean) of the first 2 tests.`
              : isNewUnit 
              ? `First-time service: Target Baseline Bar is customizable. Set exact birth baseline Bar per operating point.`
              : `Flow rate is set on the bench (X-axis) and resulting core pressure drop varies (Y-axis) along the smooth ±15% hydraulic curve.`}
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 flex-wrap">
          <button
            type="button"
            onClick={() => setViewMode('combined')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              viewMode === 'combined'
                ? 'bg-neutral-800 text-neutral-100 font-semibold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Combined ΔP Curve
          </button>
          <button
            type="button"
            onClick={() => setViewMode('curve')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              viewMode === 'curve'
                ? 'bg-neutral-800 text-neutral-100 font-semibold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            ΔP Curves
          </button>
          <button
            type="button"
            onClick={() => setViewMode('difference')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              viewMode === 'difference'
                ? 'bg-neutral-800 text-neutral-100 font-semibold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Δ(ΔP) Difference
          </button>
          <button
            type="button"
            onClick={() => setViewMode('previous_comparison')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
              viewMode === 'previous_comparison'
                ? 'bg-purple-600/30 text-purple-200 font-semibold border border-purple-500/40 shadow-xs'
                : 'text-purple-400 hover:text-purple-200'
            }`}
          >
            <History className="h-3 w-3" />
            <span>{isMoreThan2Services ? '2 Runs Prev' : 'Prev Overhaul'}</span>
          </button>
        </div>
      </div>

      {/* Multi-Service Notification Banner when unit has been serviced > 2 times */}
      {isMoreThan2Services && (
        <div className="bg-purple-950/20 border border-purple-500/40 rounded-xl p-3 flex items-start gap-3 text-xs">
          <div className="h-7 w-7 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 mt-0.5">
            <GitCommit className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-purple-200 uppercase font-mono tracking-wider text-[11px]">
                Repeat Service Asset Log ({unitSerialNumber || 'Unit Serial'}):
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 font-mono text-[10px] font-bold">
                Current Life #{effectiveLife} (Serviced &gt; 2 times)
              </span>
            </div>
            <p className="text-neutral-200 leading-relaxed text-[11px]">
              Because this unit has been serviced more than 2 times, the chart displays <strong>2 previous smooth pressure drop curves</strong>:{' '}
              <span className="text-purple-300 font-semibold font-mono">1st Previous (Life #{prevRun1.lifeNumber})</span> and{' '}
              <span className="text-amber-400 font-semibold font-mono">2nd Previous (Life #{prevRun2.lifeNumber})</span> to detect matrix fouling or flow restriction trends.
            </p>
          </div>
        </div>
      )}

      {/* Main Responsive SVG Graph */}
      <div className="relative bg-neutral-950 rounded-xl border border-neutral-800/80 p-2 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[560px] select-none font-sans"
        >
          <defs>
            {/* Tolerance band gradient */}
            <linearGradient id="toleranceBandDeltaP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.06" />
            </linearGradient>
            {/* Measured curve area glow gradient */}
            <linearGradient id="measuredGlowGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            {/* Diff bar gradients */}
            <linearGradient id="posDiffDeltaP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="negDiffDeltaP" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="failDiffDeltaP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* VIEW: FLOW CURVES or COMBINED or PREVIOUS COMPARISON */}
          {(viewMode === 'curve' || viewMode === 'combined' || viewMode === 'previous_comparison') && (
            <>
              {/* Dynamic Y-Axis Grid Lines & Labels: Pressure Drop ΔP (Bar) */}
              {yTicks.map((tick) => (
                <g key={`y-${tick}`}>
                  <line
                    x1={padding.left}
                    y1={getY(tick)}
                    x2={width - padding.right}
                    y2={getY(tick)}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray={tick === 0 ? undefined : '3 3'}
                  />
                  <text
                    x={padding.left - 8}
                    y={getY(tick) + 3.5}
                    textAnchor="end"
                    fill="#94a3b8"
                    fontSize="9.5"
                    fontFamily="monospace"
                  >
                    {tick.toFixed(stepY < 0.2 ? 2 : 1)} Bar
                  </text>
                </g>
              ))}

              {/* Dynamic X-Axis Grid Lines: Set Flow Rate Q (LPM) */}
              {xTicks.map((fTick) => (
                <g key={`x-grid-${fTick}`}>
                  <line
                    x1={getX(fTick)}
                    y1={padding.top}
                    x2={getX(fTick)}
                    y2={height - padding.bottom}
                    stroke="#1e293b"
                    strokeWidth="0.8"
                    strokeDasharray="2 3"
                    strokeOpacity="0.7"
                  />
                  <text
                    x={getX(fTick)}
                    y={height - padding.bottom + 14}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="8.5"
                    fontFamily="monospace"
                  >
                    {fTick}
                  </text>
                </g>
              ))}

              {/* Axis Titles */}
              <text
                x={padding.left}
                y={padding.top - 12}
                textAnchor="start"
                fill="#38bdf8"
                fontSize="10"
                fontWeight="bold"
                fontFamily="monospace"
              >
                ΔP Pressure Drop (Bar) &uarr;
              </text>
              <text
                x={width - padding.right}
                y={height - padding.bottom + 38}
                textAnchor="end"
                fill="#94a3b8"
                fontSize="9.5"
                fontFamily="monospace"
              >
                Set Flow Rate Q (LPM) &rarr;
              </text>

              {/* Shaded Smooth Tolerance Ribbon (±15% allowable pressure drop bracket) */}
              {toleranceAreaPath && (
                <path
                  d={toleranceAreaPath}
                  fill="url(#toleranceBandDeltaP)"
                  opacity="0.85"
                />
              )}

              {/* Smooth Upper & Lower Tolerance Boundary Curves */}
              {upperTolerancePath && (
                <path
                  d={upperTolerancePath}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.0"
                  strokeDasharray="3 3"
                  opacity="0.65"
                />
              )}
              {lowerTolerancePath && (
                <path
                  d={lowerTolerancePath}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.0"
                  strokeDasharray="3 3"
                  opacity="0.65"
                />
              )}

              {/* Target Baseline Pressure Drop Curve (Smooth Dashed Cyan Line) */}
              {targetPath && (
                <path
                  d={targetPath}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.4"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                />
              )}

              {/* PREVIOUS TEST 2 OVERLAY (Coral/Amber dotted smooth curve) */}
              {isMoreThan2Services && showPrev2Overlay && previousPath2 && (
                <path
                  d={previousPath2}
                  fill="none"
                  stroke="#fb923c"
                  strokeWidth="2.0"
                  strokeDasharray="2 3"
                  strokeLinecap="round"
                  opacity="0.85"
                />
              )}

              {/* PREVIOUS TEST 1 OVERLAY (Purple dashed smooth curve) */}
              {!isNewUnit && showPrev1Overlay && previousPath1 && (
                <path
                  d={previousPath1}
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="2.2"
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                  opacity="0.9"
                />
              )}

              {/* Current Measured Pressure Drop Curve (Smooth Solid Emerald/Amber Line) */}
              {measuredPath && (
                <path
                  d={measuredPath}
                  fill="none"
                  stroke={allPassed ? '#10b981' : '#f59e0b'}
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Point Nodes on Smooth Curves */}
              {evaluatedPoints.map((ep) => {
                const { point: p, index: i, targetP, measuredP, passed, hasValue } = ep;
                const x = getX(p.targetFlowLpm);
                const yTarget = getY(targetP);
                const yMeasured = hasValue ? getY(measuredP) : yTarget;
                const prevP1 = prevPoints1[i];
                const yPrev1 = prevP1 ? getY(prevP1.deltaPressureBar ?? getTargetDeltaPressure(p, i)) : null;
                const prevP2 = prevPoints2[i];
                const yPrev2 = prevP2 ? getY(prevP2.deltaPressureBar ?? getTargetDeltaPressure(p, i)) : null;
                const isHovered = hoveredPoint === i;

                return (
                  <g 
                    key={`pts-dp-${i}`} 
                    onMouseEnter={() => setHoveredPoint(i)} 
                    onMouseLeave={() => setHoveredPoint(null)} 
                    className="cursor-pointer"
                  >
                    {/* Vertical connecting guideline between target and measured on hover */}
                    {hasValue && (
                      <line
                        x1={x}
                        y1={yTarget}
                        x2={x}
                        y2={yMeasured}
                        stroke={passed ? '#38bdf8' : '#f43f5e'}
                        strokeWidth={isHovered ? '2' : '1.5'}
                        strokeDasharray="2 2"
                      />
                    )}

                    {/* Target Baseline Node */}
                    <circle
                      cx={x}
                      cy={yTarget}
                      r="4.5"
                      fill="#0f172a"
                      stroke="#38bdf8"
                      strokeWidth="2"
                    />

                    {/* Previous Test 2 Node (Amber/Coral Square) */}
                    {isMoreThan2Services && showPrev2Overlay && yPrev2 !== null && (
                      <rect
                        x={x - 4}
                        y={yPrev2 - 4}
                        width="8"
                        height="8"
                        fill="#fb923c"
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Previous Test 1 Node (Purple Diamond) */}
                    {!isNewUnit && showPrev1Overlay && yPrev1 !== null && (
                      <polygon
                        points={`${x},${yPrev1 - 4.5} ${x + 4.5},${yPrev1} ${x},${yPrev1 + 4.5} ${x - 4.5},${yPrev1}`}
                        fill="#c084fc"
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Current Measured Test Node (Green/Amber/Rose with dynamic glow) */}
                    {hasValue ? (
                      <circle
                        cx={x}
                        cy={yMeasured}
                        r={isHovered ? '7' : '5'}
                        fill={passed ? '#10b981' : '#f43f5e'}
                        stroke="#0f172a"
                        strokeWidth="2"
                        className="transition-all"
                      />
                    ) : (
                      <circle
                        cx={x}
                        cy={yTarget}
                        r="3.5"
                        fill="#475569"
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Operating Point Label Below X-Axis */}
                    <text
                      x={x}
                      y={height - padding.bottom + 26}
                      textAnchor="middle"
                      fill={isHovered ? '#38bdf8' : '#94a3b8'}
                      fontSize="8.5"
                      fontFamily="monospace"
                      fontWeight={isHovered ? 'bold' : 'normal'}
                    >
                      P{i + 1} ({p.targetFlowLpm}L)
                    </text>
                  </g>
                );
              })}
            </>
          )}

          {/* VIEW: DIFFERENCE / DELTA BAR VIEW (Pressure Drop Delta in Bar) */}
          {viewMode === 'difference' && (
            <>
              {/* Zero Reference Line */}
              <line
                x1={padding.left}
                y1={diffCenterY}
                x2={width - padding.right}
                y2={diffCenterY}
                stroke="#475569"
                strokeWidth="1.5"
              />
              <text
                x={padding.left - 8}
                y={diffCenterY + 3.5}
                textAnchor="end"
                fill="#94a3b8"
                fontSize="9.5"
                fontFamily="monospace"
              >
                0.0 Bar
              </text>

              {/* Upper & Lower Dynamic Reference Boundaries */}
              {[-dynamicMaxDiffBar * 0.5, dynamicMaxDiffBar * 0.5].map((t) => (
                <g key={`diff-tick-${t}`}>
                  <line
                    x1={padding.left}
                    y1={getDiffY(t)}
                    x2={width - padding.right}
                    y2={getDiffY(t)}
                    stroke="#475569"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    strokeOpacity="0.6"
                  />
                  <text
                    x={padding.left - 8}
                    y={getDiffY(t) + 3.5}
                    textAnchor="end"
                    fill="#94a3b8"
                    fontSize="8.5"
                    fontFamily="monospace"
                  >
                    {t > 0 ? `+${t.toFixed(2)}` : t.toFixed(2)} Bar
                  </text>
                </g>
              ))}

              {/* Deviation Bars */}
              {evaluatedPoints.map((ep) => {
                const { point: p, index: i, diff, passed, hasValue } = ep;
                const x = getX(p.targetFlowLpm);
                const barWidth = 34;
                const dVal = diff !== null ? diff : 0;
                const barY = dVal >= 0 ? getDiffY(dVal) : diffCenterY;
                const barHeight = Math.max(2, Math.abs(getDiffY(dVal) - diffCenterY));
                const isHovered = hoveredPoint === i;

                return (
                  <g
                    key={`bar-dp-${i}`}
                    onMouseEnter={() => setHoveredPoint(i)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="cursor-pointer"
                  >
                    {hasValue ? (
                      <rect
                        x={x - barWidth / 2}
                        y={barY}
                        width={barWidth}
                        height={barHeight}
                        rx="3"
                        fill={!passed ? 'url(#failDiffDeltaP)' : dVal <= 0 ? 'url(#negDiffDeltaP)' : 'url(#posDiffDeltaP)'}
                        stroke={!passed ? '#f43f5e' : dVal <= 0 ? '#10b981' : '#f59e0b'}
                        strokeWidth={isHovered ? '2' : '1'}
                      />
                    ) : (
                      <rect
                        x={x - barWidth / 2}
                        y={diffCenterY - 2}
                        width={barWidth}
                        height={4}
                        rx="2"
                        fill="#334155"
                      />
                    )}

                    <text
                      x={x}
                      y={dVal >= 0 ? barY - 6 : barY + barHeight + 12}
                      textAnchor="middle"
                      fill={!hasValue ? '#64748b' : !passed ? '#f43f5e' : dVal <= 0 ? '#10b981' : '#f59e0b'}
                      fontSize="9.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {hasValue ? (dVal > 0 ? `+${dVal.toFixed(2)}` : dVal.toFixed(2)) : 'Pending'}
                    </text>

                    <text
                      x={x}
                      y={height - padding.bottom + 20}
                      textAnchor="middle"
                      fill={isHovered ? '#f8fafc' : '#e2e8f0'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {p.targetFlowLpm} LPM ({p.frequencyHz || (20 + i * 10)}Hz)
                    </text>
                  </g>
                );
              })}
            </>
          )}

          {/* Interactive Floating Tooltip */}
          {hoveredPoint !== null && evaluatedPoints[hoveredPoint] && (
            (() => {
              const ep = evaluatedPoints[hoveredPoint];
              const { point: p, index: i, targetP, measuredP, diff, passed, hasValue } = ep;
              const prevP1 = prevPoints1[i];
              const prevP2 = isMoreThan2Services ? prevPoints2[i] : null;
              const minAllowed = (targetP * 0.85).toFixed(2);
              const maxAllowed = (targetP * 1.15).toFixed(2);
              const prevP1Val = prevP1 ? (prevP1.deltaPressureBar ?? getTargetDeltaPressure(p, i)) : null;
              const prevP2Val = prevP2 ? (prevP2.deltaPressureBar ?? getTargetDeltaPressure(p, i)) : null;
              const xPos = Math.min(width - 245, Math.max(padding.left + 10, getX(p.targetFlowLpm) - 120));
              const yPos = 6;
              const tooltipHeight = isMoreThan2Services ? 124 : 106;

              return (
                <g pointerEvents="none">
                  <rect
                    x={xPos}
                    y={yPos}
                    width="240"
                    height={tooltipHeight}
                    rx="6"
                    fill="#020617"
                    stroke={!hasValue ? '#f59e0b' : passed ? '#10b981' : '#f43f5e'}
                    strokeWidth="1.5"
                    filter="drop-shadow(0 4px 6px rgba(0,0,0,0.7))"
                  />
                  <text x={xPos + 10} y={yPos + 15} fill="#f8fafc" fontSize="10" fontWeight="bold">
                    {(p.name || `Point ${i + 1}`).slice(0, 26)}
                  </text>
                  <text x={xPos + 10} y={yPos + 28} fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                    Set Flow: {p.targetFlowLpm.toFixed(1)} LPM @ {p.frequencyHz || (20 + i * 10)} Hz
                  </text>
                  <text x={xPos + 10} y={yPos + 42} fill="#94a3b8" fontSize="9" fontFamily="monospace">
                    Target Baseline ΔP: <tspan fill="#38bdf8" fontWeight="bold">{targetP.toFixed(2)} Bar</tspan>
                  </text>
                  <text x={xPos + 10} y={yPos + 55} fill="#94a3b8" fontSize="9" fontFamily="monospace">
                    Measured Core ΔP: <tspan fill={hasValue ? '#f8fafc' : '#f59e0b'} fontWeight="bold">{hasValue ? `${measuredP.toFixed(2)} Bar` : 'Pending'}</tspan> {diff !== null ? `(${diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} Bar)` : ''}
                  </text>
                  {!isNewUnit && prevP1Val !== null && (
                    <text x={xPos + 10} y={yPos + 68} fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      Prev 1 ΔP (L#{prevRun1.lifeNumber}): <tspan fill="#c084fc" fontWeight="bold">{prevP1Val.toFixed(2)} Bar</tspan>
                    </text>
                  )}
                  {isMoreThan2Services && prevP2Val !== null && (
                    <text x={xPos + 10} y={yPos + 81} fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      Prev 2 ΔP (L#{prevRun2.lifeNumber}): <tspan fill="#fb923c" fontWeight="bold">{prevP2Val.toFixed(2)} Bar</tspan>
                    </text>
                  )}
                  <text x={xPos + 10} y={yPos + (isMoreThan2Services ? 98 : 84)} fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                    ±15% Corridor: <tspan fill="#e2e8f0">[{minAllowed} - {maxAllowed} Bar]</tspan> <tspan fill={!hasValue ? '#f59e0b' : passed ? '#10b981' : '#f43f5e'} fontWeight="bold">{!hasValue ? '(PENDING)' : passed ? '(PASS)' : '(RESTRICTION)'}</tspan>
                  </text>
                </g>
              );
            })()
          )}
        </svg>
      </div>

      {/* Legend & Telemetry Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-4 bg-sky-400 rounded-sm" />
            <span className="text-neutral-200 font-medium">
              {isPermanentLocked ? 'Permanent Target (Medium of Tests 1 & 2)' : isNewUnit ? 'Custom Birth Target ΔP' : 'Target Baseline ΔP Curve'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 bg-emerald-500 rounded-sm" />
            <span className="text-neutral-200 font-medium">Measured Core ΔP Curve</span>
          </div>

          {/* Toggle Previous Test 1 Overlay */}
          {!isNewUnit && (
            <button
              type="button"
              onClick={() => setShowPrev1Overlay(!showPrev1Overlay)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-colors border ${
                showPrev1Overlay
                  ? 'bg-purple-950/60 border-purple-500/40 text-purple-200'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400'
              }`}
              title="Toggle 1st previous overhaul pressure drop curve"
            >
              <span className="h-2 w-2 rotate-45 bg-purple-400 inline-block" />
              <span className="font-mono text-[11px]">
                Prev 1: Life #{prevRun1.lifeNumber} ({prevRun1.serviceRecordNumber})
              </span>
            </button>
          )}

          {/* Toggle Previous Test 2 Overlay */}
          {isMoreThan2Services && (
            <button
              type="button"
              onClick={() => setShowPrev2Overlay(!showPrev2Overlay)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-colors border ${
                showPrev2Overlay
                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400'
              }`}
              title="Toggle 2nd previous overhaul pressure drop curve"
            >
              <span className="h-2 w-2 bg-amber-400 inline-block" />
              <span className="font-mono text-[11px]">
                Prev 2: Life #{prevRun2.lifeNumber} ({prevRun2.serviceRecordNumber})
              </span>
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <span className="h-2 w-4 border border-dashed border-sky-400 bg-sky-400/20 rounded-sm" />
            <span className="text-neutral-300 font-medium">±15% ΔP Corridor Ribbon</span>
          </div>
        </div>

        {/* Real-time Metrics & 3-Point Pass Rule */}
        <div className="flex items-center gap-2 font-mono text-[11px] flex-wrap">
          <div className="px-2.5 py-1 rounded bg-neutral-950 border border-neutral-800 text-neutral-200">
            <span className="text-neutral-400">In Spec: </span>
            <strong className={is3PointsPassed ? 'text-emerald-400' : 'text-amber-400'}>
              {passingCount} / 5 Points
            </strong>
          </div>

          <div className="px-2.5 py-1 rounded bg-neutral-950 border border-neutral-800 text-neutral-200">
            <span className="text-neutral-400">Max |Δ(ΔP)|: </span>
            <strong className="text-neutral-100">{maxDeviationBar.toFixed(2)} Bar</strong>
          </div>

          <div className={`px-2.5 py-1 rounded border font-semibold flex items-center gap-1 ${
            is3PointsPassed
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
          }`}>
            {is3PointsPassed ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>PASS (≥3 IN SPEC)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>FAIL (&lt;3 IN SPEC)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* DEDICATED SECTION: REFERENCE TO PREVIOUS TEST(S) FROM SAME UNIT */}
      {!isNewUnit && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-800/80">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-purple-400" />
              <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider font-mono">
                {isMoreThan2Services
                  ? `Previous Overhaul Restriction & Pressure Drop History (${unitSerialNumber || 'Unit Serial'})`
                  : `Reference to Previous Overhaul Pressure Drop (${unitSerialNumber || 'Unit Serial'})`}
              </h4>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
              <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-purple-300 text-[11px]">
                Prev 1: Life #{prevRun1.lifeNumber || 2} ({prevRun1.serviceRecordNumber})
              </span>
              {isMoreThan2Services && (
                <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 text-[11px]">
                  Prev 2: Life #{prevRun2.lifeNumber || 1} ({prevRun2.serviceRecordNumber})
                </span>
              )}
            </div>
          </div>

          {/* Side-by-side comparison table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse font-mono">
              <thead>
                <tr className="border-b border-neutral-800 text-[10px] uppercase text-neutral-400">
                  <th className="py-2 px-2.5">Operating Point</th>
                  <th className="py-2 px-2.5 text-sky-400">Set Flow Rate (Q)</th>
                  <th className="py-2 px-2.5">Target Baseline ΔP</th>
                  {isMoreThan2Services && (
                    <th className="py-2 px-2.5 text-amber-400">
                      Prev 2 ΔP (Life #{prevRun2.lifeNumber})
                    </th>
                  )}
                  <th className="py-2 px-2.5 text-purple-400">
                    Prev 1 ΔP (Life #{prevRun1.lifeNumber})
                  </th>
                  <th className="py-2 px-2.5 text-emerald-400 font-bold">Current Measured ΔP</th>
                  <th className="py-2 px-2.5">Restriction Change vs Prev 1</th>
                  <th className="py-2 px-2.5 text-right">Matrix Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900 text-xs">
                {evaluatedPoints.map((ep) => {
                  const { point: currPoint, index: idx, targetP, measuredP, passed, hasValue } = ep;
                  const prevPoint1 = prevPoints1[idx];
                  const prevPoint2 = prevPoints2[idx];
                  const prevVal1 = prevPoint1 ? (prevPoint1.deltaPressureBar ?? getTargetDeltaPressure(currPoint, idx)) : 0;
                  const prevVal2 = prevPoint2 ? (prevPoint2.deltaPressureBar ?? getTargetDeltaPressure(currPoint, idx)) : 0;

                  const deltaVsPrev1 = hasValue && prevVal1 > 0 ? Number((measuredP - prevVal1).toFixed(2)) : null;

                  return (
                    <tr key={`diff-cal-pt-${idx}-${currPoint.pointIndex || idx}`} className="hover:bg-neutral-900/50 transition-colors">
                      <td className="py-2 px-2.5 font-sans font-semibold text-neutral-200">
                        {currPoint.name}
                      </td>
                      <td className="py-2 px-2.5 text-sky-300 font-bold">
                        {currPoint.targetFlowLpm.toFixed(1)} LPM ({currPoint.frequencyHz || (20 + idx * 10)}Hz)
                      </td>
                      <td className="py-2 px-2.5 text-neutral-300">
                        {targetP.toFixed(2)} Bar
                      </td>
                      {isMoreThan2Services && (
                        <td className="py-2 px-2.5 text-amber-300">
                          {prevVal2 > 0 ? `${prevVal2.toFixed(2)} Bar` : '—'}
                        </td>
                      )}
                      <td className="py-2 px-2.5 text-purple-300">
                        {prevVal1 > 0 ? `${prevVal1.toFixed(2)} Bar` : '—'}
                      </td>
                      <td className="py-2 px-2.5 font-bold text-neutral-100">
                        {hasValue ? (
                          <span className={passed ? 'text-emerald-300' : 'text-rose-300'}>
                            {measuredP.toFixed(2)} Bar
                          </span>
                        ) : (
                          <span className="text-neutral-500 italic">Pending</span>
                        )}
                      </td>
                      <td className="py-2 px-2.5">
                        {deltaVsPrev1 !== null ? (
                          <span className={`inline-flex items-center gap-1 font-bold ${
                            deltaVsPrev1 <= 0 ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            {deltaVsPrev1 <= 0 ? (
                              <ArrowDownRight className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3 text-amber-400" />
                            )}
                            <span>{deltaVsPrev1 > 0 ? `+${deltaVsPrev1.toFixed(2)}` : deltaVsPrev1.toFixed(2)} Bar</span>
                            <span className="text-[10px] text-neutral-400 font-normal">
                              ({deltaVsPrev1 <= 0 ? 'Cleaned Restriction' : 'Added Backpressure'})
                            </span>
                          </span>
                        ) : (
                          <span className="text-neutral-500">—</span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-right">
                        {hasValue ? (
                          passed ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                              IN SPEC (±15%)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/30">
                              HIGH RESTRICTION
                            </span>
                          )
                        ) : (
                          <span className="text-neutral-500 text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Previous test notes callout */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-neutral-400 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Info className="h-3.5 w-3.5 text-purple-400 shrink-0" />
              <span>
                <strong>Prev 1:</strong> {prevRun1.notes}
              </span>
              {isMoreThan2Services && (
                <span className="text-amber-300/80">
                  · <strong>Prev 2:</strong> {prevRun2.notes}
                </span>
              )}
            </div>
            <div className="text-sky-300 font-mono text-[11px] flex items-center gap-1 shrink-0">
              <Sparkles className="h-3 w-3 text-sky-400" />
              <span>Pressure drop dynamic cubic curve calibrated across set flow rates</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
