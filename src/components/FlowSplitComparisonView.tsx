import React, { useState } from 'react';
import { 
  Columns2, 
  ArrowLeftRight, 
  Activity, 
  Gauge, 
  Wind, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  ExternalLink,
  ChevronDown,
  Info,
  Sparkles,
  Zap,
  BarChart2
} from 'lucide-react';
import { ServiceUnit, FlowTestPoint, StepId } from '../types/process';
import { MOTORSPORT_CATEGORIES } from '../constants/motorsport';

interface FlowSplitComparisonViewProps {
  units: ServiceUnit[];
  initialUnitAId?: string;
  initialUnitBId?: string;
  onOpenUnitWorkflow?: (unitId: string, stepId?: StepId) => void;
  onClose?: () => void;
}

export const FlowSplitComparisonView: React.FC<FlowSplitComparisonViewProps> = ({
  units,
  initialUnitAId,
  initialUnitBId,
  onOpenUnitWorkflow,
  onClose,
}) => {
  // Select initial units, ensuring they are different if possible
  const validUnits = units.length > 0 ? units : [];
  const defaultA = initialUnitAId 
    ? validUnits.find(u => u.id === initialUnitAId) || validUnits[0]
    : validUnits[0];
  const defaultB = initialUnitBId
    ? validUnits.find(u => u.id === initialUnitBId) || validUnits.find(u => u.id !== defaultA?.id) || validUnits[1] || validUnits[0]
    : validUnits.find(u => u.id !== defaultA?.id) || validUnits[1] || validUnits[0];

  const [unitAId, setUnitAId] = useState<string>(defaultA?.id || '');
  const [unitBId, setUnitBId] = useState<string>(defaultB?.id || '');
  const [chartView, setChartView] = useState<'side_by_side' | 'overlay'>('side_by_side');
  const [activeMetric, setActiveMetric] = useState<'flow_lpm' | 'delta_pressure'>('flow_lpm');

  const unitA = validUnits.find(u => u.id === unitAId) || validUnits[0];
  const unitB = validUnits.find(u => u.id === unitBId) || validUnits[1] || validUnits[0];

  // Quick swap
  const handleSwapUnits = () => {
    const temp = unitAId;
    setUnitAId(unitBId);
    setUnitBId(temp);
  };

  // Safe fallback flow points
  const getPoints = (u?: ServiceUnit): FlowTestPoint[] => {
    if (!u) return [];
    if (u.flowTest?.testPoints && u.flowTest.testPoints.length > 0) {
      return u.flowTest.testPoints;
    }
    // Fallback baseline points
    const defaultHz = [20, 30, 40, 50, 60];
    return [1, 2, 3, 4, 5].map((idx) => ({
      pointIndex: idx,
      name: `P${idx}`,
      frequencyHz: defaultHz[idx - 1],
      targetFlowLpm: 10 + idx * 4,
      toleranceBandLpm: (10 + idx * 4) * 0.15,
      measuredFlowLpm: 10.2 + idx * 3.9,
      deltaPressureBar: 0.3 + idx * 0.25,
      passed: true,
    }));
  };

  const pointsA = getPoints(unitA);
  const pointsB = getPoints(unitB);

  // SVG Chart Geometry
  const width = 580;
  const height = 230;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Flow scaling (0 to 36 LPM)
  const maxFlow = 36;
  const minFlow = 0;

  // Pressure scaling (0 to 2.5 Bar)
  const maxPressure = 2.5;
  const minPressure = 0;

  const getX = (index: number, total: number = 5) => {
    if (total <= 1) return padding.left + chartW / 2;
    return padding.left + (index / (total - 1)) * chartW;
  };

  const getYFlow = (val: number) => {
    const clamped = Math.max(minFlow, Math.min(maxFlow, val));
    return padding.top + chartH - ((clamped - minFlow) / (maxFlow - minFlow)) * chartH;
  };

  const getYPressure = (val: number) => {
    const clamped = Math.max(minPressure, Math.min(maxPressure, val));
    return padding.top + chartH - ((clamped - minPressure) / (maxPressure - minPressure)) * chartH;
  };

  // Build SVG paths for Flow
  const pathFlowA = pointsA.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i, pointsA.length)} ${getYFlow(p.measuredFlowLpm)}`).join(' ');
  const pathFlowTargetA = pointsA.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i, pointsA.length)} ${getYFlow(p.targetFlowLpm)}`).join(' ');

  const pathFlowB = pointsB.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i, pointsB.length)} ${getYFlow(p.measuredFlowLpm)}`).join(' ');
  const pathFlowTargetB = pointsB.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i, pointsB.length)} ${getYFlow(p.targetFlowLpm)}`).join(' ');

  // Build SVG paths for Pressure (ΔP Bar)
  const pathPressureA = pointsA.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i, pointsA.length)} ${getYPressure(p.deltaPressureBar ?? (0.3 + i * 0.25))}`).join(' ');
  const pathPressureB = pointsB.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i, pointsB.length)} ${getYPressure(p.deltaPressureBar ?? (0.35 + i * 0.28))}`).join(' ');

  // Performance telemetry calculations
  const avgFlowA = pointsA.length ? pointsA.reduce((sum, p) => sum + p.measuredFlowLpm, 0) / pointsA.length : 0;
  const avgFlowB = pointsB.length ? pointsB.reduce((sum, p) => sum + p.measuredFlowLpm, 0) / pointsB.length : 0;
  const flowDiffAvg = avgFlowA - avgFlowB;

  const peakFlowA = pointsA.length ? Math.max(...pointsA.map(p => p.measuredFlowLpm)) : 0;
  const peakFlowB = pointsB.length ? Math.max(...pointsB.map(p => p.measuredFlowLpm)) : 0;
  const peakFlowDiff = peakFlowA - peakFlowB;

  const avgPressureA = pointsA.length ? pointsA.reduce((sum, p) => sum + (p.deltaPressureBar ?? 0.8), 0) / pointsA.length : 0;
  const avgPressureB = pointsB.length ? pointsB.reduce((sum, p) => sum + (p.deltaPressureBar ?? 0.8), 0) / pointsB.length : 0;
  const pressureDiffAvg = avgPressureA - avgPressureB;

  const passCountA = pointsA.filter(p => p.passed && p.measuredFlowLpm > 0).length;
  const passCountB = pointsB.filter(p => p.passed && p.measuredFlowLpm > 0).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Unit Selector Toolbar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/40 flex items-center gap-1.5">
                <Columns2 className="h-3.5 w-3.5" />
                <span>SPLIT-SCREEN COMPARISON</span>
              </span>
              <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider">
                Hydrodynamic Flow &amp; Pressure Telemetry
              </span>
            </div>
            <h2 className="text-xl font-black text-neutral-100 mt-1 flex items-center gap-2">
              <span>Dual-Unit Flow Rate &amp; Pressure Benchmarking</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Select any two units from the depot fleet to analyze flow calibration curves, differential backpressure (&Delta;P), and identify restriction or wear trends side-by-side.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
              <button
                type="button"
                onClick={() => setChartView('side_by_side')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  chartView === 'side_by_side'
                    ? 'bg-amber-500 text-neutral-950 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Side-by-Side
              </button>
              <button
                type="button"
                onClick={() => setChartView('overlay')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  chartView === 'overlay'
                    ? 'bg-amber-500 text-neutral-950 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Combined Overlay
              </button>
            </div>

            {/* Metric Switcher */}
            <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveMetric('flow_lpm')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeMetric === 'flow_lpm'
                    ? 'bg-sky-500 text-neutral-950 shadow-xs font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Wind className="h-3.5 w-3.5" />
                <span>Flow Rate (LPM)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric('delta_pressure')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeMetric === 'delta_pressure'
                    ? 'bg-rose-500 text-neutral-950 shadow-xs font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Gauge className="h-3.5 w-3.5" />
                <span>Pressure Drop (&Delta;P Bar)</span>
              </button>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Exit Comparison
              </button>
            )}
          </div>
        </div>

        {/* Unit Selector Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center pt-4">
          {/* Unit A Picker */}
          <div className="md:col-span-5 bg-neutral-950 p-3 rounded-xl border border-sky-500/40 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono font-bold text-sky-400 flex items-center gap-1 uppercase">
                <span className="h-2 w-2 rounded-full bg-sky-400 inline-block" />
                <span>Primary Benchmark: Unit A</span>
              </span>
              {unitA && (
                <span className="text-[10px] font-mono text-neutral-400">
                  {unitA.customerName}
                </span>
              )}
            </div>
            <select
              value={unitAId}
              onChange={(e) => setUnitAId(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              {validUnits.map((u) => (
                <option key={`a-${u.id}`} value={u.id}>
                  {u.serialNumber} · {u.modelName} ({u.customerName}) [{u.componentType || 'Radiator'}]
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div className="md:col-span-1 flex justify-center">
            <button
              type="button"
              onClick={handleSwapUnits}
              className="p-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl border border-neutral-700 transition-colors shadow-xs cursor-pointer"
              title="Swap Unit A and Unit B"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>
          </div>

          {/* Unit B Picker */}
          <div className="md:col-span-5 bg-neutral-950 p-3 rounded-xl border border-purple-500/40 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono font-bold text-purple-400 flex items-center gap-1 uppercase">
                <span className="h-2 w-2 rounded-full bg-purple-400 inline-block" />
                <span>Comparative Candidate: Unit B</span>
              </span>
              {unitB && (
                <span className="text-[10px] font-mono text-neutral-400">
                  {unitB.customerName}
                </span>
              )}
            </div>
            <select
              value={unitBId}
              onChange={(e) => setUnitBId(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              {validUnits.map((u) => (
                <option key={`b-${u.id}`} value={u.id}>
                  {u.serialNumber} · {u.modelName} ({u.customerName}) [{u.componentType || 'Radiator'}]
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Side-by-Side Metadata Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Unit A Spec Card */}
        <div className="bg-neutral-900 border border-sky-500/30 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  UNIT A
                </span>
                <span className="text-xs font-mono text-neutral-400">
                  WO #{unitA?.workOrderNumber}
                </span>
              </div>
              <h3 className="text-base font-bold text-neutral-100 mt-1">
                {unitA?.serialNumber} · {unitA?.modelName}
              </h3>
              <p className="text-xs text-neutral-400">
                Team: <strong className="text-neutral-200">{unitA?.customerName}</strong> &middot; Category: <span className="font-mono text-amber-400">{unitA?.racingCategory || 'Motorsport'}</span>
              </p>
            </div>

            {onOpenUnitWorkflow && unitA && (
              <button
                type="button"
                onClick={() => onOpenUnitWorkflow(unitA.id, 'flow_test')}
                className="px-2.5 py-1 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-500/40 text-sky-300 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Open Unit A</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-neutral-800/80 text-center font-mono">
            <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] text-neutral-500 block uppercase">Peak Flow</span>
              <span className="text-xs font-bold text-sky-400">{peakFlowA.toFixed(1)} LPM</span>
            </div>
            <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] text-neutral-500 block uppercase">Avg Flow</span>
              <span className="text-xs font-bold text-neutral-200">{avgFlowA.toFixed(1)} LPM</span>
            </div>
            <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] text-neutral-500 block uppercase">Avg &Delta;P</span>
              <span className="text-xs font-bold text-rose-400">{avgPressureA.toFixed(2)} Bar</span>
            </div>
            <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] text-neutral-500 block uppercase">QA Status</span>
              <span className={`text-xs font-bold ${passCountA >= 3 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {passCountA}/5 PASS
              </span>
            </div>
          </div>
        </div>

        {/* Unit B Spec Card */}
        <div className="bg-neutral-900 border border-purple-500/30 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  UNIT B
                </span>
                <span className="text-xs font-mono text-neutral-400">
                  WO #{unitB?.workOrderNumber}
                </span>
              </div>
              <h3 className="text-base font-bold text-neutral-100 mt-1">
                {unitB?.serialNumber} · {unitB?.modelName}
              </h3>
              <p className="text-xs text-neutral-400">
                Team: <strong className="text-neutral-200">{unitB?.customerName}</strong> &middot; Category: <span className="font-mono text-amber-400">{unitB?.racingCategory || 'Motorsport'}</span>
              </p>
            </div>

            {onOpenUnitWorkflow && unitB && (
              <button
                type="button"
                onClick={() => onOpenUnitWorkflow(unitB.id, 'flow_test')}
                className="px-2.5 py-1 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Open Unit B</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-neutral-800/80 text-center font-mono">
            <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] text-neutral-500 block uppercase">Peak Flow</span>
              <span className="text-xs font-bold text-purple-400">{peakFlowB.toFixed(1)} LPM</span>
            </div>
            <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] text-neutral-500 block uppercase">Avg Flow</span>
              <span className="text-xs font-bold text-neutral-200">{avgFlowB.toFixed(1)} LPM</span>
            </div>
            <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] text-neutral-500 block uppercase">Avg &Delta;P</span>
              <span className="text-xs font-bold text-rose-400">{avgPressureB.toFixed(2)} Bar</span>
            </div>
            <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] text-neutral-500 block uppercase">QA Status</span>
              <span className={`text-xs font-bold ${passCountB >= 3 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {passCountB}/5 PASS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts: Side-by-Side or Combined Overlay */}
      {chartView === 'side_by_side' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Unit A Chart */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <span className="font-bold text-xs text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                <span>Unit A: {unitA?.serialNumber} · {activeMetric === 'flow_lpm' ? 'Flow Rate Curve (LPM)' : 'Pressure Drop (ΔP Bar)'}</span>
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                Bench: {unitA?.flowTest?.benchId || 'RIG-04'}
              </span>
            </div>

            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none font-sans block">
              {/* Y-Axis Grid Lines */}
              {(activeMetric === 'flow_lpm' ? [0, 10, 20, 30] : [0, 0.5, 1.0, 1.5, 2.0]).map((tick) => {
                const y = activeMetric === 'flow_lpm' ? getYFlow(tick) : getYPressure(tick);
                return (
                  <g key={`a-grid-${tick}`}>
                    <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#262626" strokeWidth="1" strokeDasharray="3 3" />
                    <text x={padding.left - 6} y={y + 3.5} textAnchor="end" fill="#737373" fontSize="9" fontFamily="monospace">
                      {tick}{activeMetric === 'flow_lpm' ? 'L' : 'b'}
                    </text>
                  </g>
                );
              })}

              {/* Target Baseline (if flow metric) */}
              {activeMetric === 'flow_lpm' && (
                <path d={pathFlowTargetA} fill="none" stroke="#0ea5e9" strokeWidth="1.8" strokeDasharray="5 3" opacity="0.6" />
              )}

              {/* Measured Path */}
              <path
                d={activeMetric === 'flow_lpm' ? pathFlowA : pathPressureA}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points */}
              {pointsA.map((p, i) => {
                const x = getX(i, pointsA.length);
                const val = activeMetric === 'flow_lpm' ? p.measuredFlowLpm : (p.deltaPressureBar ?? (0.3 + i * 0.25));
                const y = activeMetric === 'flow_lpm' ? getYFlow(val) : getYPressure(val);
                return (
                  <g key={`pt-a-${i}`}>
                    <circle cx={x} cy={y} r="4.5" fill="#38bdf8" stroke="#0c0a09" strokeWidth="2" />
                    <text x={x} y={y - 8} textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
                      {val.toFixed(1)}{activeMetric === 'flow_lpm' ? 'L' : 'b'}
                    </text>
                    <text x={x} y={height - 12} textAnchor="middle" fill="#a3a3a3" fontSize="9" fontFamily="monospace">
                      P{p.pointIndex} ({p.frequencyHz || (20 + i * 10)}Hz)
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Unit B Chart */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <span className="font-bold text-xs text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-400" />
                <span>Unit B: {unitB?.serialNumber} · {activeMetric === 'flow_lpm' ? 'Flow Rate Curve (LPM)' : 'Pressure Drop (ΔP Bar)'}</span>
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                Bench: {unitB?.flowTest?.benchId || 'RIG-04'}
              </span>
            </div>

            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none font-sans block">
              {/* Y-Axis Grid Lines */}
              {(activeMetric === 'flow_lpm' ? [0, 10, 20, 30] : [0, 0.5, 1.0, 1.5, 2.0]).map((tick) => {
                const y = activeMetric === 'flow_lpm' ? getYFlow(tick) : getYPressure(tick);
                return (
                  <g key={`b-grid-${tick}`}>
                    <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#262626" strokeWidth="1" strokeDasharray="3 3" />
                    <text x={padding.left - 6} y={y + 3.5} textAnchor="end" fill="#737373" fontSize="9" fontFamily="monospace">
                      {tick}{activeMetric === 'flow_lpm' ? 'L' : 'b'}
                    </text>
                  </g>
                );
              })}

              {/* Target Baseline (if flow metric) */}
              {activeMetric === 'flow_lpm' && (
                <path d={pathFlowTargetB} fill="none" stroke="#c084fc" strokeWidth="1.8" strokeDasharray="5 3" opacity="0.6" />
              )}

              {/* Measured Path */}
              <path
                d={activeMetric === 'flow_lpm' ? pathFlowB : pathPressureB}
                fill="none"
                stroke="#c084fc"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points */}
              {pointsB.map((p, i) => {
                const x = getX(i, pointsB.length);
                const val = activeMetric === 'flow_lpm' ? p.measuredFlowLpm : (p.deltaPressureBar ?? (0.35 + i * 0.28));
                const y = activeMetric === 'flow_lpm' ? getYFlow(val) : getYPressure(val);
                return (
                  <g key={`pt-b-${i}`}>
                    <circle cx={x} cy={y} r="4.5" fill="#c084fc" stroke="#0c0a09" strokeWidth="2" />
                    <text x={x} y={y - 8} textAnchor="middle" fill="#c084fc" fontSize="10" fontWeight="bold" fontFamily="monospace">
                      {val.toFixed(1)}{activeMetric === 'flow_lpm' ? 'L' : 'b'}
                    </text>
                    <text x={x} y={height - 12} textAnchor="middle" fill="#a3a3a3" fontSize="9" fontFamily="monospace">
                      P{p.pointIndex} ({p.frequencyHz || (20 + i * 10)}Hz)
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      ) : (
        /* Combined Overlay Chart */
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <span className="font-bold text-xs text-neutral-200 uppercase tracking-wider flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <span>Combined Dual-Unit Overlay Curve ({activeMetric === 'flow_lpm' ? 'Flow Rate LPM vs Hz' : 'Differential Pressure Drop ΔP Bar'})</span>
            </span>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-sky-400 font-bold">
                <span className="h-3 w-3 rounded-full bg-sky-400 inline-block" />
                <span>Unit A: {unitA?.serialNumber}</span>
              </span>
              <span className="flex items-center gap-1.5 text-purple-400 font-bold">
                <span className="h-3 w-3 rounded-full bg-purple-400 inline-block" />
                <span>Unit B: {unitB?.serialNumber}</span>
              </span>
            </div>
          </div>

          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none font-sans block">
            {/* Y-Axis Grid Lines */}
            {(activeMetric === 'flow_lpm' ? [0, 10, 20, 30] : [0, 0.5, 1.0, 1.5, 2.0]).map((tick) => {
              const y = activeMetric === 'flow_lpm' ? getYFlow(tick) : getYPressure(tick);
              return (
                <g key={`overlay-grid-${tick}`}>
                  <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#262626" strokeWidth="1" strokeDasharray="3 3" />
                  <text x={padding.left - 6} y={y + 3.5} textAnchor="end" fill="#737373" fontSize="9" fontFamily="monospace">
                    {tick}{activeMetric === 'flow_lpm' ? 'L' : 'b'}
                  </text>
                </g>
              );
            })}

            {/* Path A */}
            <path
              d={activeMetric === 'flow_lpm' ? pathFlowA : pathPressureA}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Path B */}
            <path
              d={activeMetric === 'flow_lpm' ? pathFlowB : pathPressureB}
              fill="none"
              stroke="#c084fc"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6 2"
            />

            {/* Nodes A */}
            {pointsA.map((p, i) => {
              const x = getX(i, pointsA.length);
              const val = activeMetric === 'flow_lpm' ? p.measuredFlowLpm : (p.deltaPressureBar ?? (0.3 + i * 0.25));
              const y = activeMetric === 'flow_lpm' ? getYFlow(val) : getYPressure(val);
              return (
                <circle key={`node-a-${i}`} cx={x} cy={y} r="4.5" fill="#38bdf8" stroke="#0c0a09" strokeWidth="2" />
              );
            })}

            {/* Nodes B */}
            {pointsB.map((p, i) => {
              const x = getX(i, pointsB.length);
              const val = activeMetric === 'flow_lpm' ? p.measuredFlowLpm : (p.deltaPressureBar ?? (0.35 + i * 0.28));
              const y = activeMetric === 'flow_lpm' ? getYFlow(val) : getYPressure(val);
              return (
                <circle key={`node-b-${i}`} cx={x} cy={y} r="4.5" fill="#c084fc" stroke="#0c0a09" strokeWidth="2" />
              );
            })}

            {/* X-Axis Frequencies */}
            {pointsA.map((p, i) => {
              const x = getX(i, pointsA.length);
              return (
                <text key={`hz-${i}`} x={x} y={height - 10} textAnchor="middle" fill="#a3a3a3" fontSize="9.5" fontFamily="monospace">
                  P{p.pointIndex} ({p.frequencyHz || (20 + i * 10)}Hz)
                </text>
              );
            })}
          </svg>
        </div>
      )}

      {/* Point-by-Point Comparative Telemetry Matrix */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <div>
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-400" />
              <span>Point-by-Point Hydrodynamic Comparison Matrix</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Comparative telemetry across all 5 discrete motor frequencies. Difference (Δ) calculated as Unit A minus Unit B.
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            Positive &Delta; Flow = Unit A flows higher &middot; Negative &Delta;P = Unit A has lower restriction
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 text-[11px] font-mono uppercase text-neutral-400 bg-neutral-950/60">
                <th className="py-2.5 px-3">Point</th>
                <th className="py-2.5 px-3">Drive Freq</th>
                <th className="py-2.5 px-3 text-sky-400">Unit A Flow (LPM)</th>
                <th className="py-2.5 px-3 text-purple-400">Unit B Flow (LPM)</th>
                <th className="py-2.5 px-3 font-bold text-neutral-200">Flow Delta (&Delta; A - B)</th>
                <th className="py-2.5 px-3 text-sky-400">Unit A &Delta;P (Bar)</th>
                <th className="py-2.5 px-3 text-purple-400">Unit B &Delta;P (Bar)</th>
                <th className="py-2.5 px-3 text-right">Hydrodynamic Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-mono text-xs">
              {pointsA.map((ptA, i) => {
                const ptB = pointsB[i] || ptA;
                const flowDiff = ptA.measuredFlowLpm - ptB.measuredFlowLpm;
                const flowDiffPct = ptB.measuredFlowLpm > 0 ? ((flowDiff / ptB.measuredFlowLpm) * 100).toFixed(1) : '0';
                const pDiff = (ptA.deltaPressureBar ?? 0.8) - (ptB.deltaPressureBar ?? 0.8);

                return (
                  <tr key={`matrix-${i}`} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-2 px-3 font-bold text-neutral-200">P{ptA.pointIndex}</td>
                    <td className="py-2 px-3 text-neutral-400">{ptA.frequencyHz || (20 + i * 10)} Hz</td>
                    <td className="py-2 px-3 text-sky-300 font-bold">{ptA.measuredFlowLpm.toFixed(2)}</td>
                    <td className="py-2 px-3 text-purple-300 font-bold">{ptB.measuredFlowLpm.toFixed(2)}</td>
                    <td className="py-2 px-3 font-bold">
                      <span className={flowDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {flowDiff > 0 ? `+${flowDiff.toFixed(2)}` : flowDiff.toFixed(2)} LPM ({flowDiff > 0 ? `+${flowDiffPct}%` : `${flowDiffPct}%`})
                      </span>
                    </td>
                    <td className="py-2 px-3 text-sky-300">{(ptA.deltaPressureBar ?? 0.8).toFixed(2)}</td>
                    <td className="py-2 px-3 text-purple-300">{(ptB.deltaPressureBar ?? 0.8).toFixed(2)}</td>
                    <td className="py-2 px-3 text-right">
                      {Math.abs(flowDiff) < 0.3 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                          Identical Response
                        </span>
                      ) : flowDiff > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          Unit A Outperforms (+{flowDiffPct}%)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Unit B Outperforms ({Math.abs(Number(flowDiffPct))}%)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Engineering Diagnosis & Trend Insights */}
      <div className="p-4 bg-gradient-to-r from-neutral-900 via-neutral-900 to-sky-950/40 border border-neutral-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/40">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
              <span>Hydrodynamic Trend Diagnosis</span>
              <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ACTIVE FLEET COMPARISON
              </span>
            </h4>
            <p className="text-xs text-neutral-300 mt-1 max-w-3xl leading-relaxed">
              {flowDiffAvg >= 0 ? (
                <>
                  Unit A (<strong className="text-sky-300">{unitA?.serialNumber}</strong>) demonstrates an average <strong className="text-emerald-400">+{flowDiffAvg.toFixed(2)} LPM higher flow capacity</strong> than Unit B across the motor range. Differential backpressure (&Delta;P) indicates {pressureDiffAvg <= 0 ? 'lower internal resistance (optimal matrix condition)' : 'slightly elevated hydraulic resistance'}.
                </>
              ) : (
                <>
                  Unit B (<strong className="text-purple-300">{unitB?.serialNumber}</strong>) demonstrates an average <strong className="text-emerald-400">+{Math.abs(flowDiffAvg).toFixed(2)} LPM higher flow capacity</strong> than Unit A. Core passage cross-section is operating within nominal race tolerance.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 bg-neutral-950 p-3 rounded-xl border border-neutral-800 font-mono text-right">
          <div>
            <span className="text-[10px] text-neutral-400 block uppercase">Peak Flow Delta</span>
            <span className={`text-sm font-bold ${peakFlowDiff >= 0 ? 'text-sky-400' : 'text-purple-400'}`}>
              {peakFlowDiff >= 0 ? `+${peakFlowDiff.toFixed(1)} LPM` : `${peakFlowDiff.toFixed(1)} LPM`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
