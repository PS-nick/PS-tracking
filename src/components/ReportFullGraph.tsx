import React, { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { FlowTestPoint, PreviousFlowTestPoint } from '../types/process';
import { CheckCircle2, AlertTriangle, Activity, BarChart2, TrendingUp, Layers, Gauge } from 'lucide-react';
import { getTargetDeltaPressure, getMeasuredDeltaPressure } from './FlowDifferenceChart';

interface ReportFullGraphProps {
  testPoints: FlowTestPoint[];
  prevPoints?: Array<FlowTestPoint | PreviousFlowTestPoint>;
  isNewUnit?: boolean;
  className?: string;
  forceDualPrint?: boolean;
  compact?: boolean;
  unitLabel?: string;
  showDifferenceBar?: boolean;
}

export const ReportFullGraph: React.FC<ReportFullGraphProps> = ({
  testPoints,
  prevPoints,
  isNewUnit = false,
  className = '',
  forceDualPrint = true,
  compact = false,
  unitLabel,
  showDifferenceBar = true,
}) => {
  const [viewMode, setViewMode] = useState<'dual' | 'curve' | 'difference'>('dual');

  // SVG dimensions
  const width = 680;
  const heightCurve = compact ? 110 : 190;
  const heightDiff = 130;
  const padding = compact 
    ? { top: 16, right: 30, bottom: 24, left: 48 }
    : { top: 22, right: 35, bottom: 38, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartHCurve = heightCurve - padding.top - padding.bottom;
  const chartHDiff = heightDiff - padding.top - padding.bottom;

  // Dynamic Pressure Drop Scaling
  const { maxPressure, minPressure, yTicks, stepY } = useMemo(() => {
    const allPressures: number[] = [];
    (testPoints || []).forEach((p, idx) => {
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

    (prevPoints || []).forEach((p, idx) => {
      const pMeasured = getMeasuredDeltaPressure(p, idx) || getTargetDeltaPressure(p, idx);
      if (pMeasured > 0) allPressures.push(pMeasured);
    });

    const rawMax = allPressures.length > 0 ? Math.max(...allPressures) : 2.15;
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

    return { maxPressure: maxY, minPressure: minY, yTicks: ticks, stepY: chosenStep };
  }, [testPoints, prevPoints]);

  // Dynamic Flow Rate X-Axis Scaling (Strictly maxX = highest flow + 5)
  const { minFlowX, maxFlowX, xTicks, stepX } = useMemo(() => {
    const allFlows: number[] = [];
    (testPoints || []).forEach((p) => {
      if (typeof p?.targetFlowLpm === 'number' && p.targetFlowLpm > 0) allFlows.push(p.targetFlowLpm);
    });
    (prevPoints || []).forEach((p) => {
      if (typeof p?.targetFlowLpm === 'number' && p.targetFlowLpm > 0) allFlows.push(p.targetFlowLpm);
    });

    const rawMax = allFlows.length > 0 ? Math.max(...allFlows) : 30;
    const rawMin = allFlows.length > 0 ? Math.min(...allFlows) : 0;

    // Highest flow + 5 as strictly requested by user
    const maxX = rawMax + 5;
    const minX = Math.max(0, rawMin - 5);

    let chosenStep = 5;
    const span = maxX - minX;
    if (span <= 15) chosenStep = 2.5;
    else if (span <= 40) chosenStep = 5;
    else if (span <= 90) chosenStep = 10;
    else if (span <= 180) chosenStep = 20;
    else chosenStep = 50;

    const ticks: number[] = [];
    for (let val = minX; val <= maxX; val += chosenStep) {
      ticks.push(Number(val.toFixed(chosenStep % 1 !== 0 ? 1 : 0)));
    }
    if (ticks.length > 0 && Math.abs(ticks[ticks.length - 1] - maxX) > 0.5) {
      ticks.push(Number(maxX.toFixed(chosenStep % 1 !== 0 ? 1 : 0)));
    }

    return { minFlowX: minX, maxFlowX: maxX, xTicks: ticks, stepX: chosenStep };
  }, [testPoints, prevPoints]);

  const getX = (flowLpm: number) => {
    const span = Math.max(1, maxFlowX - minFlowX);
    const clamped = Math.max(minFlowX, Math.min(maxFlowX, flowLpm));
    return padding.left + ((clamped - minFlowX) / span) * chartW;
  };

  const getYCurve = (pressureBar: number) => {
    const clamped = Math.max(minPressure, Math.min(maxPressure, pressureBar));
    return padding.top + chartHCurve - ((clamped - minPressure) / (maxPressure - minPressure)) * chartHCurve;
  };

  // D3 Curve Generators (Smooth Monotone Cubic Splines)
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

  const sortedPoints = useMemo(() => {
    return [...testPoints].sort((a, b) => (a.targetFlowLpm || 0) - (b.targetFlowLpm || 0));
  }, [testPoints]);

  // Target Baseline Smooth Curve
  const targetCurveCoords = useMemo(() => {
    if (sortedPoints.length === 0) return [];
    return sortedPoints.map((p) => {
      const origIndex = testPoints.indexOf(p);
      const targetP = getTargetDeltaPressure(p, origIndex);
      return {
        x: getX(p.targetFlowLpm),
        y: getYCurve(targetP),
      };
    });
  }, [sortedPoints, testPoints, minFlowX, maxFlowX, maxPressure, chartHCurve]);

  const targetPath = useMemo(() => {
    if (targetCurveCoords.length < 2) return '';
    return lineGenerator(targetCurveCoords) || '';
  }, [targetCurveCoords, lineGenerator]);

  // Tolerance Corridor Smooth Ribbon (±15% allowable pressure drop bracket)
  const toleranceBandCoords = useMemo(() => {
    if (sortedPoints.length === 0) return [];
    return sortedPoints.map((p) => {
      const origIndex = testPoints.indexOf(p);
      const targetP = getTargetDeltaPressure(p, origIndex);
      return {
        x: getX(p.targetFlowLpm),
        y0: getYCurve(targetP * 0.85),
        y1: getYCurve(targetP * 1.15),
      };
    });
  }, [sortedPoints, testPoints, minFlowX, maxFlowX, maxPressure, chartHCurve]);

  const toleranceAreaPath = useMemo(() => {
    if (toleranceBandCoords.length < 2) return '';
    return areaGenerator(toleranceBandCoords) || '';
  }, [toleranceBandCoords, areaGenerator]);

  // Current Measured Pressure Drop Smooth Curve
  const measuredPoints = useMemo(() => {
    return sortedPoints.filter((p) => getMeasuredDeltaPressure(p, testPoints.indexOf(p)) > 0);
  }, [sortedPoints, testPoints]);

  const measuredCurveCoords = useMemo(() => {
    return measuredPoints.map((p) => {
      const origIndex = testPoints.indexOf(p);
      const measuredP = getMeasuredDeltaPressure(p, origIndex);
      return {
        x: getX(p.targetFlowLpm),
        y: getYCurve(measuredP),
      };
    });
  }, [measuredPoints, testPoints, minFlowX, maxFlowX, maxPressure, chartHCurve]);

  const measuredPath = useMemo(() => {
    if (measuredCurveCoords.length < 2) return '';
    return lineGenerator(measuredCurveCoords) || '';
  }, [measuredCurveCoords, lineGenerator]);

  // Prior Overhaul Previous Curve
  const prevSortedPoints = useMemo(() => {
    if (!prevPoints || prevPoints.length === 0) return [];
    return [...prevPoints].sort((a, b) => (a.targetFlowLpm || 0) - (b.targetFlowLpm || 0));
  }, [prevPoints]);

  const prevCurveCoords = useMemo(() => {
    if (prevSortedPoints.length === 0) return [];
    return prevSortedPoints.map((p) => {
      const origIndex = (prevPoints || []).indexOf(p);
      const pMeasured = getMeasuredDeltaPressure(p, origIndex) || getTargetDeltaPressure(p, origIndex);
      return {
        x: getX(p.targetFlowLpm),
        y: getYCurve(pMeasured),
      };
    });
  }, [prevSortedPoints, prevPoints, minFlowX, maxFlowX, maxPressure, chartHCurve]);

  const prevPath = useMemo(() => {
    if (prevCurveCoords.length < 2) return '';
    return lineGenerator(prevCurveCoords) || '';
  }, [prevCurveCoords, lineGenerator]);

  // Telemetry computations & 3-point rule
  const differences = useMemo(() => {
    return testPoints.map((p, i) => {
      const targetP = getTargetDeltaPressure(p, i);
      const measuredP = getMeasuredDeltaPressure(p, i);
      return measuredP > 0 ? measuredP - targetP : 0;
    });
  }, [testPoints]);

  const maxDeviation = useMemo(() => {
    return Math.max(...differences.map((d) => Math.abs(d)), 0);
  }, [differences]);

  const dynamicMaxDiff = useMemo(() => {
    return Math.max(0.4, Number((Math.ceil(maxDeviation * 1.25 * 5) / 5).toFixed(2)));
  }, [maxDeviation]);

  const diffCenterY = padding.top + chartHDiff / 2;

  const getDiffY = (diff: number) => {
    const clamped = Math.max(-dynamicMaxDiff, Math.min(dynamicMaxDiff, diff));
    return diffCenterY - (clamped / dynamicMaxDiff) * (chartHDiff / 2);
  };

  const passingCount = testPoints.filter((p, i) => {
    const targetP = getTargetDeltaPressure(p, i);
    const measuredP = getMeasuredDeltaPressure(p, i);
    const tol = targetP * 0.15;
    return measuredP > 0 && Math.abs(measuredP - targetP) <= tol;
  }).length;
  const is3PointsPassed = passingCount >= 3;

  if (compact) {
    return (
      <div className={`border border-slate-300 rounded p-1.5 bg-slate-50/70 font-sans ${className}`}>
        {unitLabel && (
          <div className="mb-1 pb-1 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-[8px] uppercase tracking-wider text-slate-900 flex items-center gap-1">
              <Layers className="h-2.5 w-2.5 text-sky-700" />
              <span>{unitLabel}</span>
            </span>
            <span className={`px-1.5 py-0.2 rounded text-[6.5px] font-bold font-mono ${
              is3PointsPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {is3PointsPassed ? 'HOMOLOGATION CONFORMING' : 'CALIBRATION RE-RUN'}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-[7.5px] font-bold text-slate-800 mb-0.5 px-0.5">
          <span className="flex items-center gap-1 uppercase tracking-wider">
            <Gauge className="h-2.5 w-2.5 text-sky-700" />
            <span>1. 5-Point Dynamic ΔP Curve vs Set Flow (Q LPM)</span>
          </span>
          <span className="font-mono text-[7px] text-slate-600 font-normal">
            Target Baseline Curve · ±15% Shaded Ribbon · Tested Curve · {passingCount}/5 PASS
          </span>
        </div>

        <svg viewBox={`0 0 ${width} ${heightCurve}`} className="w-full h-auto select-none font-sans block">
          <defs>
            <linearGradient id="reportTolBandCompact" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.06" />
            </linearGradient>
          </defs>

          {/* Dynamic Y-Axis Grid & Labels */}
          {yTicks.map((tick) => (
            <g key={`compact-y-${tick}`}>
              <line
                x1={padding.left}
                y1={getYCurve(tick)}
                x2={width - padding.right}
                y2={getYCurve(tick)}
                stroke="#cbd5e1"
                strokeWidth="0.8"
                strokeDasharray={tick === 0 ? undefined : '2 2'}
              />
              <text
                x={padding.left - 5}
                y={getYCurve(tick) + 3}
                textAnchor="end"
                fill="#64748b"
                fontSize="8"
                fontFamily="monospace"
              >
                {tick.toFixed(stepY < 0.2 ? 2 : 1)}B
              </text>
            </g>
          ))}

          {/* Shaded ±15% Smooth Tolerance Bracket Ribbon */}
          {toleranceAreaPath && (
            <path
              d={toleranceAreaPath}
              fill="url(#reportTolBandCompact)"
              stroke="#0284c7"
              strokeWidth="0.8"
              strokeDasharray="3 2"
              opacity="0.85"
            />
          )}

          {/* Target Flow Path (Smooth Dashed Blue Curve) */}
          {targetPath && (
            <path
              d={targetPath}
              fill="none"
              stroke="#0284c7"
              strokeWidth="1.8"
              strokeDasharray="5 3"
              strokeLinecap="round"
            />
          )}

          {/* Prior Overhaul Flow Path (Smooth Dashed Slate Curve) */}
          {prevPath && (
            <path
              d={prevPath}
              fill="none"
              stroke="#64748b"
              strokeWidth="1.6"
              strokeDasharray="4 2"
              strokeLinecap="round"
            />
          )}

          {/* Measured Test Flow Path (Smooth Solid Emerald/Rose Curve) */}
          {measuredPath && (
            <path
              d={measuredPath}
              fill="none"
              stroke={is3PointsPassed ? '#059669' : '#e11d48'}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Prior Overhaul Node Markers */}
          {prevPoints && prevPoints.map((pt, i) => {
            const pMeasured = getMeasuredDeltaPressure(pt, i) || getTargetDeltaPressure(pt, i);
            const x = getX(pt.targetFlowLpm);
            const y = getYCurve(pMeasured);
            return (
              <g key={`compact-prev-${i}`}>
                <circle cx={x} cy={y} r="2.2" fill="#94a3b8" stroke="#ffffff" strokeWidth="1" />
              </g>
            );
          })}

          {/* Test Point Nodes & Annotations */}
          {testPoints.map((pt, i) => {
            const targetP = getTargetDeltaPressure(pt, i);
            const measuredP = getMeasuredDeltaPressure(pt, i);
            const x = getX(pt.targetFlowLpm);
            const yTarget = getYCurve(targetP);
            const yMeasured = getYCurve(measuredP > 0 ? measuredP : targetP);
            const tol = targetP * 0.15;
            const passed = measuredP > 0 && Math.abs(measuredP - targetP) <= tol;

            return (
              <g key={`compact-pt-${i}`}>
                {measuredP > 0 && (
                  <line
                    x1={x}
                    y1={yTarget}
                    x2={x}
                    y2={yMeasured}
                    stroke={passed ? '#059669' : '#e11d48'}
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}
                <circle cx={x} cy={yTarget} r="2.8" fill="#ffffff" stroke="#0284c7" strokeWidth="1.4" />
                {measuredP > 0 && (
                  <circle cx={x} cy={yMeasured} r="3.8" fill={passed ? '#059669' : '#e11d48'} stroke="#ffffff" strokeWidth="1.2" />
                )}
                <text
                  x={x}
                  y={measuredP > 0 ? yMeasured - 5 : yTarget - 5}
                  textAnchor="middle"
                  fill={measuredP > 0 ? (passed ? '#0f172a' : '#e11d48') : '#64748b'}
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {measuredP > 0 ? `${measuredP.toFixed(2)}B` : '—'}
                </text>
                <text
                  x={x}
                  y={heightCurve - padding.bottom + 11}
                  textAnchor="middle"
                  fill="#0f172a"
                  fontSize="7.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {pt.targetFlowLpm}L (P{pt.pointIndex || i + 1})
                </text>
              </g>
            );
          })}
        </svg>

        {/* Compact Variance / Delta Bar Chart if enabled */}
        {showDifferenceBar && (
          <div className="mt-1.5 pt-1 border-t border-slate-200">
            <div className="flex items-center justify-between text-[7px] font-bold text-slate-800 mb-0.5 px-0.5">
              <span className="flex items-center gap-1 uppercase tracking-wider">
                <BarChart2 className="h-2.5 w-2.5 text-sky-700" />
                <span>2. Difference Variance (Δ = Measured − Target ΔP Bar)</span>
              </span>
              <span className="font-mono text-[6.5px] text-slate-500">
                ±15% Homologation Envelope
              </span>
            </div>

            <svg viewBox={`0 0 ${width} 70`} className="w-full h-auto select-none font-sans block">
              {/* Zero baseline */}
              <line
                x1={padding.left}
                y1={35}
                x2={width - padding.right}
                y2={35}
                stroke="#64748b"
                strokeWidth="1.2"
              />
              <text
                x={padding.left - 5}
                y={37.5}
                textAnchor="end"
                fill="#475569"
                fontSize="7.5"
                fontFamily="monospace"
              >
                0.0 Bar
              </text>

              {/* Bars */}
              {testPoints.map((pt, i) => {
                const targetP = getTargetDeltaPressure(pt, i);
                const measuredP = getMeasuredDeltaPressure(pt, i);
                const diff = measuredP > 0 ? measuredP - targetP : 0;
                const tol = targetP * 0.15;
                const passed = measuredP > 0 && Math.abs(diff) <= tol;
                const x = getX(pt.targetFlowLpm);
                const barWidth = 26;
                const scale = 25 / dynamicMaxDiff;
                const clamped = Math.max(-dynamicMaxDiff, Math.min(dynamicMaxDiff, diff));
                const barY = clamped >= 0 ? 35 - clamped * scale : 35;
                const barHeight = Math.max(2, Math.abs(clamped * scale));

                return (
                  <g key={`compact-diff-${i}`}>
                    {measuredP > 0 ? (
                      <rect
                        x={x - barWidth / 2}
                        y={barY}
                        width={barWidth}
                        height={barHeight}
                        rx="2"
                        fill={!passed ? '#f43f5e' : diff <= 0 ? '#10b981' : '#f59e0b'}
                        opacity="0.9"
                      />
                    ) : (
                      <rect
                        x={x - barWidth / 2}
                        y={34}
                        width={barWidth}
                        height={2}
                        rx="1"
                        fill="#cbd5e1"
                      />
                    )}
                    <text
                      x={x}
                      y={diff >= 0 ? barY - 2.5 : barY + barHeight + 8}
                      textAnchor="middle"
                      fill={!passed ? '#be123c' : diff <= 0 ? '#047857' : '#b45309'}
                      fontSize="7.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {measuredP > 0 ? (diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)) : '—'}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm font-sans ${className}`}>
      {/* Header Bar */}
      <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-300 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-sky-700" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Flow Dynamics
            </h4>
          </div>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Flow rate is set on the bench · Core differential pressure drop varies smoothly · ±15% acceptance envelope
          </p>
        </div>

        {/* Interactive Mode Switcher (Hidden in print) */}
        <div className="no-print flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300 shadow-xs text-xs">
          <button
            type="button"
            onClick={() => setViewMode('dual')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === 'dual'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Full Dual View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('curve')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === 'curve'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ΔP Curve
          </button>
          <button
            type="button"
            onClick={() => setViewMode('difference')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === 'difference'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Δ(ΔP) Bars
          </button>
        </div>
      </div>

      {/* Main Graphs Container */}
      <div className="p-4 space-y-4 bg-white">
        {/* GRAPH 1: 5-POINT PRESSURE DROP SMOOTH CURVE VS TARGET & ±15% TOLERANCE ENVELOPE */}
        {(viewMode === 'dual' || viewMode === 'curve') && (
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 mb-1 border-b border-slate-200 pb-1">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-sky-700" />
                <span>1. Core Restriction Smooth Spline Curve (ΔP Bar vs Set Flow Q LPM)</span>
              </span>
              <span className="font-mono text-[10px] text-slate-500 font-normal">
                Shaded Envelope = ±15% Acceptance Bracket
              </span>
            </div>

            <svg viewBox={`0 0 ${width} ${heightCurve}`} className="w-full h-auto select-none font-sans">
              <defs>
                <linearGradient id="reportTolBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Dynamic Y-Axis Grid & Labels */}
              {yTicks.map((tick) => (
                <g key={`curve-y-${tick}`}>
                  <line
                    x1={padding.left}
                    y1={getYCurve(tick)}
                    x2={width - padding.right}
                    y2={getYCurve(tick)}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray={tick === 0 ? undefined : '3 3'}
                  />
                  <text
                    x={padding.left - 8}
                    y={getYCurve(tick) + 3.5}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="9.5"
                    fontFamily="monospace"
                  >
                    {tick.toFixed(stepY < 0.2 ? 2 : 1)} Bar
                  </text>
                </g>
              ))}

              {/* Shaded ±15% Smooth Tolerance Ribbon */}
              {toleranceAreaPath && (
                <path
                  d={toleranceAreaPath}
                  fill="url(#reportTolBand)"
                  stroke="#0284c7"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                  opacity="0.85"
                />
              )}

              {/* Target Flow Path (Smooth Dashed Royal/Sky Blue Curve) */}
              {targetPath && (
                <path
                  d={targetPath}
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2.4"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                />
              )}

              {/* Measured Test Flow Path (Smooth Solid Bold Emerald/Rose Curve) */}
              {measuredPath && (
                <path
                  d={measuredPath}
                  fill="none"
                  stroke={is3PointsPassed ? '#059669' : '#e11d48'}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Test Point Nodes & Annotations */}
              {testPoints.map((pt, i) => {
                const targetP = getTargetDeltaPressure(pt, i);
                const measuredP = getMeasuredDeltaPressure(pt, i);
                const x = getX(pt.targetFlowLpm);
                const yTarget = getYCurve(targetP);
                const yMeasured = getYCurve(measuredP > 0 ? measuredP : targetP);
                const ptHz = pt.frequencyHz || (20 + i * 10);
                const tol = targetP * 0.15;
                const passed = measuredP > 0 && Math.abs(measuredP - targetP) <= tol;

                return (
                  <g key={`curve-pt-${i}`}>
                    {measuredP > 0 && (
                      <line
                        x1={x}
                        y1={yTarget}
                        x2={x}
                        y2={yMeasured}
                        stroke={passed ? '#059669' : '#e11d48'}
                        strokeWidth="1.2"
                        strokeDasharray="2 2"
                      />
                    )}

                    <circle
                      cx={x}
                      cy={yTarget}
                      r="4"
                      fill="#ffffff"
                      stroke="#0284c7"
                      strokeWidth="2"
                    />

                    {measuredP > 0 && (
                      <circle
                        cx={x}
                        cy={yMeasured}
                        r="5.5"
                        fill={passed ? '#059669' : '#e11d48'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )}

                    <text
                      x={x}
                      y={measuredP > 0 ? yMeasured - 9 : yTarget - 9}
                      textAnchor="middle"
                      fill={measuredP > 0 ? (passed ? '#0f172a' : '#e11d48') : '#64748b'}
                      fontSize="9.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {measuredP > 0 ? `${measuredP.toFixed(2)} Bar` : 'Pending'}
                    </text>

                    <text
                      x={x}
                      y={heightCurve - padding.bottom + 14}
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {pt.targetFlowLpm.toFixed(0)} LPM
                    </text>

                    <rect
                      x={x - 22}
                      y={heightCurve - padding.bottom + 18}
                      width="44"
                      height="13"
                      rx="3"
                      fill="#f0f9ff"
                      stroke="#bae6fd"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={heightCurve - padding.bottom + 27.5}
                      textAnchor="middle"
                      fill="#0369a1"
                      fontSize="7.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      P{pt.pointIndex || i + 1} ({ptHz}Hz)
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* GRAPH 2: COMPREHENSIVE DIFFERENCE BAR VIEW */}
        {(viewMode === 'dual' || viewMode === 'difference') && (
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 mb-1 border-b border-slate-200 pb-1">
              <span className="flex items-center gap-1.5">
                <BarChart2 className="h-3.5 w-3.5 text-sky-700" />
                <span>2. Differential Variance Δ(ΔP) in Bar (Target Baseline − Tested Core)</span>
              </span>
              <span className="font-mono text-[10px] text-slate-500 font-normal">
                Scale: ±{dynamicMaxDiff.toFixed(2)} Bar dynamic range
              </span>
            </div>

            <svg viewBox={`0 0 ${width} ${heightDiff}`} className="w-full h-auto select-none font-sans">
              {/* Zero baseline */}
              <line
                x1={padding.left}
                y1={diffCenterY}
                x2={width - padding.right}
                y2={diffCenterY}
                stroke="#64748b"
                strokeWidth="1.5"
              />
              <text
                x={padding.left - 8}
                y={diffCenterY + 3.5}
                textAnchor="end"
                fill="#475569"
                fontSize="9"
                fontFamily="monospace"
              >
                0.0 Bar
              </text>

              {/* Dynamic Tolerance guideline limits */}
              {[-dynamicMaxDiff * 0.5, dynamicMaxDiff * 0.5].map((t) => (
                <g key={`report-diff-tick-${t}`}>
                  <line
                    x1={padding.left}
                    y1={getDiffY(t)}
                    x2={width - padding.right}
                    y2={getDiffY(t)}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                    strokeDasharray="3 3"
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
              {testPoints.map((pt, i) => {
                const targetP = getTargetDeltaPressure(pt, i);
                const measuredP = getMeasuredDeltaPressure(pt, i);
                const diff = measuredP > 0 ? measuredP - targetP : 0;
                const tol = targetP * 0.15;
                const passed = measuredP > 0 && Math.abs(diff) <= tol;
                const x = getX(pt.targetFlowLpm);
                const barWidth = 32;
                const barY = diff >= 0 ? getDiffY(diff) : diffCenterY;
                const barHeight = Math.max(2, Math.abs(getDiffY(diff) - diffCenterY));

                return (
                  <g key={`report-bar-${i}`}>
                    {measuredP > 0 ? (
                      <rect
                        x={x - barWidth / 2}
                        y={barY}
                        width={barWidth}
                        height={barHeight}
                        rx="3"
                        fill={!passed ? '#f43f5e' : diff <= 0 ? '#10b981' : '#f59e0b'}
                        opacity="0.85"
                        stroke={!passed ? '#be123c' : diff <= 0 ? '#047857' : '#b45309'}
                        strokeWidth="1"
                      />
                    ) : (
                      <rect
                        x={x - barWidth / 2}
                        y={diffCenterY - 2}
                        width={barWidth}
                        height={4}
                        rx="2"
                        fill="#cbd5e1"
                      />
                    )}

                    <text
                      x={x}
                      y={diff >= 0 ? barY - 4 : barY + barHeight + 11}
                      textAnchor="middle"
                      fill={!passed ? '#be123c' : diff <= 0 ? '#047857' : '#b45309'}
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {measuredP > 0 ? (diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)) : '—'}
                    </text>

                    <text
                      x={x}
                      y={heightDiff - padding.bottom + 14}
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {pt.targetFlowLpm} LPM
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-3 font-mono text-[11px] flex-wrap">
          <span className="text-slate-600">
            Conforming Points:{' '}
            <strong className={is3PointsPassed ? 'text-emerald-700' : 'text-rose-700'}>
              {passingCount} / {testPoints.length}
            </strong>
          </span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-600">
            Max Deviation: <strong>{maxDeviation.toFixed(2)} Bar</strong>
          </span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-600">
            Tolerance: <strong>±15% allowable differential pressure</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-bold text-xs">
          {is3PointsPassed ? (
            <span className="text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              <span>FLOW HOMOLOGATION APPROVED (≥3 POINTS IN SPEC)</span>
            </span>
          ) : (
            <span className="text-rose-700 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              <span>HOMOLOGATION HOLD (&lt;3 POINTS IN SPEC)</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
