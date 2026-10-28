import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Wind, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Gauge, 
  Thermometer, 
  Activity, 
  Info, 
  RotateCcw, 
  Sliders, 
  CheckSquare, 
  Square,
  Cpu,
  Layers,
  Sparkles,
  Compass,
  FileText,
  QrCode,
  Save,
  Check,
  Lock,
  Unlock,
  History,
  X
} from 'lucide-react';
import { ServiceUnit, FlowTestPoint, FlowTestData, CombiSubUnit } from '../../types/process';
import { FlowDifferenceChart } from '../FlowDifferenceChart';
import { FlowDrawingModal } from '../FlowDrawingModal';
import { StepSopViewer } from '../StepSopModal';
import { ensureCombiConfig } from '../../utils/storage';
import { 
  resolvePartNumberBaseline, 
  saveStoredPartBaseline, 
  PartBaselineRecord,
  DEFAULT_SET_FLOWS,
  DEFAULT_FREQS,
  DEFAULT_TARGET_PRESSURES
} from '../../utils/partBaseline';

interface FlowTestingStepProps {
  unit: ServiceUnit;
  allUnits?: ServiceUnit[];
  onUpdateUnit: (updater: (prev: ServiceUnit) => ServiceUnit, logAction?: string) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onOpenScanner?: () => void;
}

const buildInitialPoints = (
  flowPts?: FlowTestPoint[], 
  baselineRecord?: PartBaselineRecord, 
  isFirstService = false
): FlowTestPoint[] => {
  const names = [
    'P1 - Low Idle (15%)',
    'P2 - Cruise (30%)',
    'P3 - Mid Power (50%)',
    'P4 - High Speed (70%)',
    'P5 - Max Duty (85%)',
    'P6 - Peak Overboost (100%)'
  ];

  if (flowPts && flowPts.length === 6) {
    return flowPts.map((p, idx) => {
      // If recurring and permanent baseline is locked, use medium of first 2 tests as target
      let targetP = p.targetDeltaPressureBar;
      if (!isFirstService && baselineRecord?.isPermanentLocked && baselineRecord.mediumPressureDrops[idx]) {
        targetP = baselineRecord.mediumPressureDrops[idx];
      } else if (!targetP || targetP === 0) {
        targetP = baselineRecord?.mediumPressureDrops[idx] || DEFAULT_TARGET_PRESSURES[idx] || (0.35 + idx * 0.5);
      }

      const tolBand = Number((targetP * 0.15).toFixed(3));
      const measuredP = p.deltaPressureBar ?? (p.measuredFlowLpm > 0 ? targetP : undefined);
      const passed = measuredP !== undefined && measuredP > 0 ? Math.abs(measuredP - targetP) <= tolBand : p.passed;
      return {
        ...p,
        pointIndex: p.pointIndex || idx + 1,
        name: p.name || names[idx],
        frequencyHz: p.frequencyHz || baselineRecord?.frequencies[idx] || DEFAULT_FREQS[idx] || (20 + idx * 10),
        targetFlowLpm: p.targetFlowLpm || baselineRecord?.setFlowRates[idx] || DEFAULT_SET_FLOWS[idx] || (10 + idx * 5),
        targetDeltaPressureBar: targetP,
        toleranceBandBar: tolBand,
        deltaPressureBar: measuredP,
        passed,
      };
    });
  }

  // If 5 points were provided from older unit, upgrade cleanly to 6 points
  if (flowPts && flowPts.length === 5) {
    const upgraded = [...flowPts];
    const targetP6 = baselineRecord?.mediumPressureDrops[5] || DEFAULT_TARGET_PRESSURES[5] || 2.85;
    upgraded.push({
      pointIndex: 6,
      name: names[5],
      frequencyHz: baselineRecord?.frequencies[5] || DEFAULT_FREQS[5] || 70,
      targetFlowLpm: baselineRecord?.setFlowRates[5] || DEFAULT_SET_FLOWS[5] || 35.0,
      tolerancePercent: 15,
      toleranceBandLpm: Number(((baselineRecord?.setFlowRates[5] || DEFAULT_SET_FLOWS[5] || 35.0) * 0.15).toFixed(2)),
      measuredFlowLpm: 0,
      deltaPressureBar: undefined,
      targetDeltaPressureBar: targetP6,
      toleranceBandBar: Number((targetP6 * 0.15).toFixed(3)),
      passed: false,
    });
    return upgraded.map((p, idx) => ({
      ...p,
      pointIndex: idx + 1,
      name: names[idx],
    }));
  }

  return names.map((name, idx) => {
    const targetP = baselineRecord?.mediumPressureDrops[idx] || DEFAULT_TARGET_PRESSURES[idx];
    const tolBand = Number((targetP * 0.15).toFixed(3));
    return {
      pointIndex: idx + 1,
      name,
      frequencyHz: baselineRecord?.frequencies[idx] || DEFAULT_FREQS[idx],
      targetFlowLpm: baselineRecord?.setFlowRates[idx] || DEFAULT_SET_FLOWS[idx],
      tolerancePercent: 15,
      toleranceBandLpm: Number(((baselineRecord?.setFlowRates[idx] || DEFAULT_SET_FLOWS[idx]) * 0.15).toFixed(2)),
      measuredFlowLpm: 0,
      deltaPressureBar: undefined,
      targetDeltaPressureBar: targetP,
      toleranceBandBar: tolBand,
      passed: false,
    };
  });
};

export const FlowTestingStep: React.FC<FlowTestingStepProps> = ({
  unit,
  allUnits = [],
  onUpdateUnit,
  onNextStep,
  onPrevStep,
  onOpenScanner,
}) => {
  const isNewUnit = unit.intake.isFirstService === true;
  const combi = ensureCombiConfig(unit);
  const isCombi = !!combi && combi.isCombi && combi.subUnits && combi.subUnits.length > 0;
  const subUnits: CombiSubUnit[] = isCombi ? combi.subUnits : [];

  const [activeSubIndex, setActiveSubIndex] = useState<number>(0);
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState<boolean>(false);
  const [showMediumModal, setShowMediumModal] = useState<boolean>(false);

  // Active sub-unit or single unit flow data
  const currentSubUnit: CombiSubUnit | null = isCombi ? (subUnits[activeSubIndex] || subUnits[0]) : null;
  const flow: FlowTestData = currentSubUnit ? currentSubUnit.flowTest : unit.flowTest;

  // Resolve part number baseline (computes medium of first 2 tests if recurring, or provides customizable baseline on first service)
  const partBaseline: PartBaselineRecord = useMemo(() => {
    return resolvePartNumberBaseline(unit.partNumber, allUnits, isNewUnit, unit);
  }, [unit.partNumber, allUnits, isNewUnit, unit]);

  const isPermanentLocked = !isNewUnit && partBaseline.isPermanentLocked;

  // Local state for editing - saves ONLY when pressing buttons, not when typing!
  const [localPoints, setLocalPoints] = useState<FlowTestPoint[]>(() => 
    buildInitialPoints(flow.testPoints, partBaseline, isNewUnit)
  );
  const [localFluidTempC, setLocalFluidTempC] = useState<number>(flow.fluidTempC || 42.5);
  const [localFluidType, setLocalFluidType] = useState<string>(flow.fluidType || 'Deionized Water (DI Water)');
  const [localBenchId, setLocalBenchId] = useState<string>(flow.benchId || 'RIG-04');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [justSaved, setJustSaved] = useState<boolean>(false);

  // Keep track of activeSubIndex to sync local state when sub-unit tab changes
  const prevSubIndexRef = useRef<number>(activeSubIndex);

  useEffect(() => {
    if (prevSubIndexRef.current !== activeSubIndex) {
      prevSubIndexRef.current = activeSubIndex;
      const targetSub = subUnits[activeSubIndex];
      const targetFlow = targetSub ? targetSub.flowTest : unit.flowTest;
      setLocalPoints(buildInitialPoints(targetFlow.testPoints, partBaseline, isNewUnit));
      setLocalFluidTempC(targetFlow.fluidTempC || 42.5);
      setLocalFluidType(targetFlow.fluidType || 'Deionized Water (DI Water)');
      setLocalBenchId(targetFlow.benchId || 'RIG-04');
      setIsDirty(false);
      setJustSaved(false);
    }
  }, [activeSubIndex, subUnits, unit.flowTest, partBaseline, isNewUnit]);

  // Handler for typing in inputs - updates local state ONLY (no save while typing)
  const handleLocalPointChange = (
    index: number,
    field: 'targetFlowLpm' | 'deltaPressureBar' | 'targetDeltaPressureBar' | 'frequencyHz' | 'notes',
    value: string | number
  ) => {
    setLocalPoints((prev) => {
      const next = [...prev];
      const point = { ...next[index] };

      if (field === 'notes') {
        point.notes = String(value);
      } else {
        const num = value === '' ? 0 : Number(value);
        if (field === 'deltaPressureBar') {
          point.deltaPressureBar = value === '' ? undefined : num;
          // Synchronize measuredFlowLpm for compatibility with downstream reports
          if (point.deltaPressureBar !== undefined && point.deltaPressureBar > 0) {
            point.measuredFlowLpm = point.targetFlowLpm;
          } else {
            point.measuredFlowLpm = 0;
          }
        } else if (field === 'targetFlowLpm') {
          point.targetFlowLpm = num;
          point.toleranceBandLpm = Number((num * 0.15).toFixed(2));
          if (!point.targetDeltaPressureBar || point.targetDeltaPressureBar === 0) {
            point.targetDeltaPressureBar = Number((0.35 * Math.pow(Math.max(1, num) / 10, 1.55)).toFixed(2));
          }
        } else if (field === 'targetDeltaPressureBar') {
          // CUSTOMIZABLE BASELINE BAR (e.g. on first-time service)
          point.targetDeltaPressureBar = value === '' ? undefined : num;
        } else if (field === 'frequencyHz') {
          point.frequencyHz = num;
        }

        const targetP = point.targetDeltaPressureBar || DEFAULT_TARGET_PRESSURES[index] || 1.0;
        const tolBand = Number((targetP * 0.15).toFixed(3));
        point.targetDeltaPressureBar = targetP;
        point.toleranceBandBar = tolBand;
        point.tolerancePercent = 15;

        if (point.deltaPressureBar !== undefined && point.deltaPressureBar > 0) {
          const diff = Math.abs(point.deltaPressureBar - targetP);
          point.passed = diff <= tolBand;
        } else {
          point.passed = false;
        }
      }

      next[index] = point;
      return next;
    });

    setIsDirty(true);
    setJustSaved(false);
  };

  const handleLocalBenchChange = (field: 'fluidTempC' | 'fluidType' | 'benchId', value: unknown) => {
    if (field === 'fluidTempC') setLocalFluidTempC(Number(value));
    else if (field === 'fluidType') setLocalFluidType(String(value));
    else if (field === 'benchId') setLocalBenchId(String(value));
    setIsDirty(true);
    setJustSaved(false);
  };

  // EXPLICIT SAVE ACTION: Commits changes to the unit ONLY when button is pressed!
  const commitSave = useCallback((overridePoints?: FlowTestPoint[], customActionMsg?: string) => {
    const pointsToSave = overridePoints || localPoints;
    const inSpecCount = pointsToSave.filter((p) => p.passed && p.deltaPressureBar !== undefined && p.deltaPressureBar > 0).length;
    const is3PointsPass = inSpecCount >= 3;
    const avgMeasuredPressure = pointsToSave.reduce((acc, p) => acc + (p.deltaPressureBar || 0), 0) / pointsToSave.length;
    const avgFlow = pointsToSave.reduce((acc, p) => acc + (p.targetFlowLpm || 0), 0) / pointsToSave.length;

    // If first-time service, also save custom baseline to part number repository
    if (isNewUnit && unit.partNumber) {
      const customTargets = pointsToSave.map((p, idx) => p.targetDeltaPressureBar || DEFAULT_TARGET_PRESSURES[idx]);
      saveStoredPartBaseline({
        partNumber: unit.partNumber,
        isPermanentLocked: false,
        source: 'custom_first_service',
        mediumPressureDrops: customTargets,
        setFlowRates: pointsToSave.map((p) => p.targetFlowLpm),
        frequencies: pointsToSave.map((p, idx) => p.frequencyHz || DEFAULT_FREQS[idx]),
        updatedAt: new Date().toISOString(),
      });
    }

    onUpdateUnit((prev) => {
      if (isCombi) {
        const currentCfg = ensureCombiConfig(prev);
        if (!currentCfg) return prev;
        const updatedSubs = [...currentCfg.subUnits];
        const activeSub = { ...updatedSubs[activeSubIndex] };

        activeSub.flowTest = {
          ...activeSub.flowTest,
          testPoints: pointsToSave,
          deltaPressureBar: Number(avgMeasuredPressure.toFixed(2)),
          inletFlowLpm: Number(avgFlow.toFixed(2)),
          flowPass: is3PointsPass,
          pointsPassThreshold: 3,
          fluidTempC: localFluidTempC,
          fluidType: localFluidType,
          benchId: localBenchId,
        };
        updatedSubs[activeSubIndex] = activeSub;

        return {
          ...prev,
          combiConfig: {
            ...currentCfg,
            subUnits: updatedSubs,
          },
          ...(activeSubIndex === 0 ? { flowTest: activeSub.flowTest } : {}),
        };
      } else {
        return {
          ...prev,
          flowTest: {
            ...prev.flowTest,
            testPoints: pointsToSave,
            deltaPressureBar: Number(avgMeasuredPressure.toFixed(2)),
            inletFlowLpm: Number(avgFlow.toFixed(2)),
            flowPass: is3PointsPass,
            pointsPassThreshold: 3,
            fluidTempC: localFluidTempC,
            fluidType: localFluidType,
            benchId: localBenchId,
          },
        };
      }
    }, customActionMsg || `Saved 5-point pressure drop calibration data (${inSpecCount}/5 in spec)`);

    setIsDirty(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }, [localPoints, localFluidTempC, localFluidType, localBenchId, isCombi, activeSubIndex, isNewUnit, unit.partNumber, onUpdateUnit]);

  // Quick fill nominal values for the currently active core (Button triggered)
  const handleAutofillActiveCore = () => {
    const updated = localPoints.map((p, idx) => {
      const targetP = p.targetDeltaPressureBar || partBaseline.mediumPressureDrops[idx] || DEFAULT_TARGET_PRESSURES[idx];
      const microVar = (Math.random() * 0.04 - 0.02);
      const measuredP = Number((targetP + microVar).toFixed(2));
      const tolBand = Number((targetP * 0.15).toFixed(3));
      return {
        ...p,
        frequencyHz: p.frequencyHz || partBaseline.frequencies[idx] || DEFAULT_FREQS[idx],
        targetFlowLpm: p.targetFlowLpm || partBaseline.setFlowRates[idx] || DEFAULT_SET_FLOWS[idx],
        targetDeltaPressureBar: targetP,
        toleranceBandBar: tolBand,
        deltaPressureBar: measuredP,
        measuredFlowLpm: p.targetFlowLpm || partBaseline.setFlowRates[idx] || DEFAULT_SET_FLOWS[idx],
        measuredOutletLpm: Number(((p.targetFlowLpm || partBaseline.setFlowRates[idx] || DEFAULT_SET_FLOWS[idx]) - 0.1).toFixed(2)),
        passed: true,
      };
    });

    setLocalPoints(updated);
    commitSave(updated, `Auto-populated 6 nominal pressure drop readings against set flow rates`);
  };

  // Quick fill nominal values for ALL Combi Cores at once (Button triggered)
  const handleAutofillAllCombiCores = () => {
    onUpdateUnit((prev) => {
      const currentCfg = ensureCombiConfig(prev);
      if (!currentCfg) return prev;

      const updatedSubs = currentCfg.subUnits.map((sub) => {
        const subPts = buildInitialPoints(sub.flowTest?.testPoints, partBaseline, isNewUnit);
        const updatedPoints = subPts.map((p, idx) => {
          const targetP = p.targetDeltaPressureBar || partBaseline.mediumPressureDrops[idx] || DEFAULT_TARGET_PRESSURES[idx];
          const microVar = (Math.random() * 0.04 - 0.02);
          const measuredP = Number((targetP + microVar).toFixed(2));
          const tolBand = Number((targetP * 0.15).toFixed(3));
          return {
            ...p,
            frequencyHz: p.frequencyHz || partBaseline.frequencies[idx] || DEFAULT_FREQS[idx],
            targetFlowLpm: p.targetFlowLpm || partBaseline.setFlowRates[idx] || DEFAULT_SET_FLOWS[idx],
            targetDeltaPressureBar: targetP,
            toleranceBandBar: tolBand,
            deltaPressureBar: measuredP,
            measuredFlowLpm: p.targetFlowLpm || partBaseline.setFlowRates[idx] || DEFAULT_SET_FLOWS[idx],
            measuredOutletLpm: Number(((p.targetFlowLpm || partBaseline.setFlowRates[idx] || DEFAULT_SET_FLOWS[idx]) - 0.1).toFixed(2)),
            passed: true,
          };
        });

        return {
          ...sub,
          flowTest: {
            ...sub.flowTest,
            testPoints: updatedPoints,
            deltaPressureBar: 1.15,
            flowPass: true,
            pointsPassThreshold: 4,
            inletFlowLpm: 20.0,
            fluidTempC: localFluidTempC,
            fluidType: localFluidType,
            benchId: localBenchId,
          },
        };
      });

      return {
        ...prev,
        combiConfig: {
          ...currentCfg,
          subUnits: updatedSubs,
        },
        flowTest: updatedSubs[0].flowTest,
      };
    }, 'Auto-calibrated ALL Comby unit cores simultaneously with conforming pressure drop curves');

    setLocalPoints((prev) => prev.map((p, idx) => ({
      ...p,
      deltaPressureBar: Number(((p.targetDeltaPressureBar || partBaseline.mediumPressureDrops[idx]) + 0.01).toFixed(2)),
      passed: true,
    })));
    setIsDirty(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };

  // Validation
  const activeCompletedCount = localPoints.filter((p) => p.deltaPressureBar !== undefined && p.deltaPressureBar > 0).length;
  const isActive6PointsComplete = activeCompletedCount === 6;
  const activeInSpecCount = localPoints.filter((p) => p.passed && p.deltaPressureBar !== undefined && p.deltaPressureBar > 0).length;
  const isActivePassByThreshold = activeInSpecCount >= 4;

  const isIntercooler = unit.componentType === 'intercooler' || unit.intake?.componentType === 'intercooler';

  const isSubUnitExempt = (sub: CombiSubUnit) => {
    return sub.componentType === 'intercooler' || sub.name?.toLowerCase().includes('intercooler') || !!sub.flowTest?.isExempt;
  };

  // Combi multi-unit validation
  const allSubsPassed = isCombi
    ? subUnits.every((s, idx) => {
        if (isSubUnitExempt(s)) return true;
        const pts = idx === activeSubIndex ? localPoints : (s.flowTest?.testPoints || []);
        const inSpec = pts.filter((p) => p.passed && p.deltaPressureBar !== undefined && p.deltaPressureBar > 0).length;
        return inSpec >= 4;
      })
    : isIntercooler ? true : isActivePassByThreshold;

  const allSubsComplete = isCombi
    ? subUnits.every((s, idx) => {
        if (isSubUnitExempt(s)) return true;
        const pts = idx === activeSubIndex ? localPoints : (s.flowTest?.testPoints || []);
        return pts.filter((p) => p.deltaPressureBar !== undefined && p.deltaPressureBar > 0).length === 6;
      })
    : isIntercooler ? true : isActive6PointsComplete;

  const handleSkipIntercoolerFlowTest = () => {
    const now = new Date().toISOString();
    onUpdateUnit((prev) => ({
      ...prev,
      flowTest: {
        ...prev.flowTest,
        flowPass: true,
        isExempt: true,
        completedAt: now,
      },
      currentStepId: 'pressure_test',
    }), 'Intercooler marked EXEMPT from liquid flow test. Transitioned to Pressure Testing.');
    onNextStep();
  };

  const markCompleted = () => {
    if (isIntercooler) {
      handleSkipIntercoolerFlowTest();
      return;
    }

    if (!allSubsComplete) {
      alert(
        isCombi
          ? 'All 6 pressure drop measurement results are required for all liquid cooling sub-units before advancing.'
          : 'All 6 pressure drop measurement results are required before completing this stage.'
      );
      return;
    }

    commitSave();

    const now = new Date().toISOString();
    onUpdateUnit((prev) => {
      if (isCombi) {
        const cfg = ensureCombiConfig(prev);
        const updatedSubs = (cfg?.subUnits || []).map((s) => ({
          ...s,
          flowTest: {
            ...s.flowTest,
            completedAt: now,
          },
        }));

        return {
          ...prev,
          combiConfig: cfg ? { ...cfg, subUnits: updatedSubs } : prev.combiConfig,
          flowTest: {
            ...prev.flowTest,
            flowPass: allSubsPassed,
            pointsPassThreshold: 3,
            completedAt: now,
          },
          currentStepId: 'pressure_test',
        };
      } else {
        return {
          ...prev,
          flowTest: {
            ...prev.flowTest,
            flowPass: isActivePassByThreshold,
            pointsPassThreshold: 3,
            completedAt: now,
          },
          currentStepId: 'pressure_test',
        };
      }
    }, `Flow testing completed for all units (${allSubsPassed ? 'PASS' : 'FAIL'})`);
    onNextStep();
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              Stage 03
            </span>
            <span className="text-xs text-neutral-400">·</span>
            <span className="text-xs text-neutral-300 font-mono">Pressure Drop vs Set Flow Protocol</span>
            {isPermanentLocked ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                <Lock className="h-3 w-3" />
                <span>PERMANENT TARGET LOCKED (RECURRING P/N: {unit.partNumber})</span>
              </span>
            ) : isNewUnit ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold flex items-center gap-1">
                <Unlock className="h-3 w-3" />
                <span>FIRST-TIME SERVICE (CUSTOMIZABLE BASELINE BAR)</span>
              </span>
            ) : null}
            {isCombi && (
              <>
                <span className="text-xs text-neutral-400">·</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1">
                  <Cpu className="h-3 w-3" />
                  <span>COMBY ({subUnits.length} CORES)</span>
                </span>
              </>
            )}
          </div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight mt-0.5">
            Flow Testing {isCombi ? `for All ${subUnits.length} Comby Cores` : '(Pressure Drop vs Set Flow Rate)'}
          </h2>
          <p className="text-sm text-neutral-300 mt-1">
            Flow rate is <strong className="text-sky-300">set on the bench</strong> across 6 calibration points and resulting <strong className="text-amber-300">pressure drop (&Delta;P) varies</strong>. Saves only occur when pressing buttons, not while typing.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Explicit Save Flow Data Button */}
          <button
            type="button"
            onClick={() => commitSave()}
            className={`px-3.5 py-1.5 text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-xs border ${
              justSaved
                ? 'bg-emerald-600 text-white border-emerald-500 ring-1 ring-emerald-400'
                : isDirty
                ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 border-amber-400 ring-2 ring-amber-400/40 animate-pulse'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
            }`}
            title="Commit and save flow test readings to the unit"
          >
            {justSaved ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Saved ✓</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>{isDirty ? 'Save Flow Data *' : 'Save Flow Data'}</span>
              </>
            )}
          </button>

          {/* See Drawing Button */}
          <button
            type="button"
            onClick={() => setIsDrawingModalOpen(true)}
            className="px-3 py-1.5 bg-sky-950/70 hover:bg-sky-900/80 text-sky-200 border border-sky-500/40 text-xs font-mono font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            title="Inspect Technical Blueprint Drawing & Port Vectors"
          >
            <Compass className="h-3.5 w-3.5 text-sky-400" />
            <span>See Drawing</span>
          </button>

          {/* SOP Viewer */}
          <StepSopViewer stepId="flow_test" />

          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-neutral-700 transition-colors cursor-pointer"
              title="Scan Unit QR / Station Traveler"
            >
              <QrCode className="h-3.5 w-3.5 text-amber-400" />
              <span>Scan QR</span>
            </button>
          )}

          <button
            onClick={onPrevStep}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg cursor-pointer"
          >
            ← Previous
          </button>
          <button
            onClick={markCompleted}
            disabled={!allSubsComplete}
            className={`px-4 py-2 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 ${
              allSubsComplete
                ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-sm cursor-pointer'
                : 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
            }`}
          >
            <span>Confirm {isCombi ? `All ${subUnits.length} Cores` : '6 Points'} &amp; Advance</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* RECURRING PART NUMBER PERMANENT BASELINE BANNER */}
      {isPermanentLocked && (
        <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-3.5 sm:p-4 space-y-2 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                <Lock className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-emerald-200 uppercase font-mono tracking-wider text-xs">
                    Recurring Part Standard: P/N {unit.partNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-700/50">
                    PERMANENT TARGET LOCKED
                  </span>
                </div>
                <p className="text-xs text-neutral-200 leading-relaxed">
                  Because this part number is recurring, the permanent target baseline has been established from the <strong>medium (mean) of the first 2 tests</strong>. All subsequent overhauls for this part number are calibrated against this permanent target corridor (±15%).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowMediumModal(true)}
              className="px-3 py-1.5 bg-emerald-900/50 hover:bg-emerald-800/60 text-emerald-200 border border-emerald-500/40 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer transition-colors self-start sm:self-center shrink-0"
            >
              <History className="h-3.5 w-3.5 text-emerald-400" />
              <span>Inspect 2-Test Medium Breakdown</span>
            </button>
          </div>
        </div>
      )}

      {/* FIRST TIME SERVICE BANNER (Customizable Baseline Bar) */}
      {isNewUnit && (
        <div className="bg-sky-950/30 border border-sky-500/40 rounded-xl p-3.5 space-y-2 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
              <Unlock className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sky-200 uppercase font-mono tracking-wider text-xs">
                  First-Time Service Registration: P/N {unit.partNumber || 'New Unit'}
                </span>
                <span className="px-2 py-0.5 rounded bg-sky-900/60 text-sky-300 font-mono text-[10px] font-bold border border-sky-700/50">
                  BASELINE BAR IS CUSTOMIZABLE
                </span>
              </div>
              <p className="text-xs text-neutral-200 leading-relaxed">
                As this is a first-time service, the <strong>Target Baseline Bar is fully customizable</strong> in the table below. You can customize target pressure drops per operating point. Once 2 test cycles are logged for this part number, the <strong>medium of the first 2 tests</strong> will automatically become the permanent target.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved changes notice banner */}
      {isDirty && (
        <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-200 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-amber-400 shrink-0" />
            <span>You have unsaved changes. Inputs save only when pressing buttons. Click <strong>"Save Flow Data"</strong> or <strong>"Confirm &amp; Advance"</strong> to commit.</span>
          </div>
          <button
            type="button"
            onClick={() => commitSave()}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold font-mono rounded cursor-pointer transition-colors shrink-0"
          >
            Save Now
          </button>
        </div>
      )}

      {/* INTERCOOLER COMPONENT EXEMPTION NOTICE */}
      {isIntercooler && (
        <div className="bg-sky-950/40 border border-sky-500/40 rounded-xl p-5 space-y-3 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
                <Wind className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                    Component Exemption
                  </span>
                  <span className="text-xs font-semibold text-neutral-300">
                    Intercooler (Air-to-Air Boost Core)
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">
                  Intercoolers Do Not Require Liquid Flow Testing
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed max-w-3xl">
                  Per standard operating procedure (SOP PS-QA-2026), air-to-air charge coolers and boost air intercoolers do not undergo liquid flow bench testing. You can proceed directly to Stage 04: Pressure Testing (Helium pneumatic leak check).
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0 flex items-center gap-1.5 self-start">
              <CheckCircle2 className="h-3.5 w-3.5" />
              EXEMPT (PASS)
            </span>
          </div>

          <div className="flex items-center gap-2.5 pt-2 flex-wrap">
            <button
              type="button"
              onClick={handleSkipIntercoolerFlowTest}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>Skip Flow Test &amp; Proceed to Stage 04: Pressure Testing</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* COMBY SUB-UNIT SELECTOR TABS */}
      {isCombi && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold text-neutral-200 uppercase font-mono tracking-wider">
                Select Core to Calibrate ({subUnits.length} Circuit Matrix):
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutofillAllCombiCores}
                className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/50 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Populate calibrated nominal flow curves for all comby units at once"
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-300" />
                <span>⚡ Auto-Calibrate ALL {subUnits.length} Cores</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {subUnits.map((sub, idx) => {
              const isSelected = activeSubIndex === idx;
              const isSubExemptCore = isSubUnitExempt(sub);
              const subPts = isSelected ? localPoints : (sub.flowTest?.testPoints || []);
              const subCompleted = subPts.filter((p) => p.deltaPressureBar !== undefined && p.deltaPressureBar > 0).length;
              const subInSpec = subPts.filter((p) => p.passed && p.deltaPressureBar !== undefined && p.deltaPressureBar > 0).length;
              const isSubPass = isSubExemptCore ? true : subInSpec >= 3;

              return (
                <button
                  key={sub.id || idx}
                  type="button"
                  onClick={() => {
                    if (isDirty) {
                      commitSave();
                    }
                    setActiveSubIndex(idx);
                  }}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'bg-purple-950/40 border-purple-500 text-white ring-1 ring-purple-500/50 shadow-md'
                      : 'bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-purple-300">
                      Core #{idx + 1}
                    </span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold border ${
                      isSubExemptCore
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                        : subCompleted === 6
                          ? isSubPass
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {isSubExemptCore ? 'EXEMPT (AIR)' : subCompleted === 6 ? (isSubPass ? 'PASS (≥4)' : 'FAIL') : `${subCompleted}/6 PTS`}
                    </span>
                  </div>

                  <div>
                    <div className="font-bold text-xs leading-tight text-neutral-100">
                      {sub.name}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                      {sub.serialNumber || `${unit.serialNumber}-U${idx + 1}`} · {sub.flowTest.fluidType}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Target Origin & Status Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-neutral-200">
                {isCombi ? `Active Test Circuit: ${currentSubUnit?.name}` : 'Baseline Origin:'}
              </span>
              <span className="text-xs font-mono font-bold text-sky-400 uppercase">
                {isPermanentLocked 
                  ? 'Permanent Target (Medium of First 2 Tests)'
                  : isNewUnit
                  ? 'Customizable Birth Baseline Target'
                  : 'Locked Standard Baseline'}
              </span>
            </div>
            <p className="text-xs text-neutral-300 mt-0.5">
              {isCombi && currentSubUnit && isSubUnitExempt(currentSubUnit) ? (
                <span className="text-sky-300 font-medium">
                  This core is an Intercooler (air core) and is exempt from liquid flow bench testing per SOP PS-QA-2026.
                </span>
              ) : (
                <>
                  {activeCompletedCount} of 6 required test points logged. Flow rate is set and pressure drop measured. <strong className="text-amber-300">Rule: 4 points within ±15% &Delta;P is a PASS.</strong>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {!(isCombi && currentSubUnit && isSubUnitExempt(currentSubUnit)) && (
            <button
              type="button"
              onClick={handleAutofillActiveCore}
              className="flex-1 sm:flex-initial px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono rounded-lg border border-neutral-700 transition-colors text-center cursor-pointer"
            >
              + Auto-Populate This Core
            </button>
          )}

          <div className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold flex items-center justify-center gap-1.5 ${
            isCombi && currentSubUnit && isSubUnitExempt(currentSubUnit)
              ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
              : isActive6PointsComplete
                ? isActivePassByThreshold
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
          }`}>
            {isCombi && currentSubUnit && isSubUnitExempt(currentSubUnit) ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-sky-400" />
                <span>EXEMPT (PASS)</span>
              </>
            ) : isActive6PointsComplete ? (
              isActivePassByThreshold ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>PASS ({activeInSpecCount}/6 IN SPEC — &ge;4 REQUIRED)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  <span>FAIL (ONLY {activeInSpecCount}/6 IN SPEC — &ge;4 REQUIRED)</span>
                </>
              )
            ) : (
              <>
                <AlertTriangle className="h-4 w-4" />
                <span>{6 - activeCompletedCount} OF 6 POINTS PENDING</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Visual Pressure Drop vs Set Flow Graph & Historical Overlay */}
      <FlowDifferenceChart
        testPoints={localPoints}
        isNewUnit={isNewUnit}
        previousTest={flow.previousTest}
        previousTests={flow.previousTests}
        unitSerialNumber={isCombi ? (currentSubUnit?.serialNumber || unit.serialNumber) : unit.serialNumber}
        partNumber={unit.partNumber}
        isPermanentLocked={isPermanentLocked}
        baselineSourceText={isPermanentLocked ? 'Medium of First 2 Tests' : isNewUnit ? 'Custom Birth Target' : undefined}
        lifeNumber={unit.lifeNumber ?? unit.intake.lifeNumber ?? (isNewUnit ? 1 : 2)}
      />

      {/* 6-Point Measurement Results Data Entry Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-800">
          <div>
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-400" />
              <span>6-Point Pressure Drop Calibration Data Entry {isCombi && `(${currentSubUnit?.name})`}</span>
            </h3>
            <p className="text-xs text-neutral-300 mt-0.5">
              Flow rate is set. Enter measured differential pressure drop (&Delta;P, Bar). Values are evaluated against the target baseline &plusmn;15% corridor.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => commitSave()}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                isDirty 
                  ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md ring-2 ring-amber-400/50' 
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
              }`}
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isDirty ? 'Save Changes *' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 text-[11px] font-mono uppercase text-neutral-300">
                <th className="py-2.5 px-3 font-semibold">Test Point</th>
                <th className="py-2.5 px-3 font-semibold text-sky-400">
                  Drive Freq (Hz)
                </th>
                <th className="py-2.5 px-3 font-semibold text-sky-300">
                  * Set Flow Rate Q (LPM)
                  <span className="text-[10px] text-neutral-400 block font-normal">(Bench Setpoint)</span>
                </th>
                <th className="py-2.5 px-3 font-semibold">
                  Target Baseline &Delta;P (Bar)
                  {isNewUnit ? (
                    <span className="text-[10px] text-sky-400 block font-bold">Customizable Bar (1st Service)</span>
                  ) : isPermanentLocked ? (
                    <span className="text-[10px] text-emerald-400 block font-bold">Permanent Target (Medium 1 &amp; 2)</span>
                  ) : (
                    <span className="text-[10px] text-neutral-400 block font-normal">&plusmn;15% Corridor</span>
                  )}
                </th>
                <th className="py-2.5 px-3 font-semibold text-amber-400 font-bold">
                  * Measured &Delta;P Drop (Bar)
                  <span className="text-[10px] text-amber-300/80 block font-normal">(Pressure Drop Varies)</span>
                </th>
                <th className="py-2.5 px-3 font-semibold">Difference &Delta;(&Delta;P)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80 font-mono text-xs">
              {localPoints.map((point, index) => {
                const targetP = point.targetDeltaPressureBar || partBaseline.mediumPressureDrops[index] || DEFAULT_TARGET_PRESSURES[index];
                const tolBand = Number((targetP * 0.15).toFixed(3));
                const minAllowed = (targetP * 0.85).toFixed(2);
                const maxAllowed = (targetP * 1.15).toFixed(2);
                const hasValue = point.deltaPressureBar !== undefined && point.deltaPressureBar !== null && point.deltaPressureBar > 0;
                const diff = hasValue && point.deltaPressureBar !== undefined ? Number((point.deltaPressureBar - targetP).toFixed(3)) : null;
                const isWithinTol = diff !== null && Math.abs(diff) <= tolBand;
                const currentHz = point.frequencyHz || partBaseline.frequencies[index] || DEFAULT_FREQS[index];

                return (
                  <tr key={`flow-cal-pt-${index}-${point.pointIndex || index}`} className="hover:bg-neutral-800/30 transition-colors">
                    {/* Point Index & Title */}
                    <td className="py-3 px-3">
                      <div className="font-sans font-bold text-neutral-100">
                        {point.name}
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        Point #{point.pointIndex} of 6
                      </span>
                    </td>

                    {/* Operator Reference: Frequency in Hz */}
                    <td className="py-3 px-3">
                      {isNewUnit ? (
                        <div className="relative w-24">
                          <input
                            type="number"
                            min="1"
                            max="300"
                            step="1"
                            value={point.frequencyHz ?? currentHz}
                            onChange={(e) => handleLocalPointChange(index, 'frequencyHz', e.target.value)}
                            className="w-full bg-neutral-950 border border-sky-500/50 rounded px-2 py-1 text-xs font-mono font-bold text-sky-300 focus:outline-none focus:border-sky-400"
                            placeholder="Hz"
                          />
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 bg-sky-950/60 border border-sky-500/40 px-2 py-1 rounded text-sky-300 font-mono font-bold text-xs">
                          <span>{point.frequencyHz || currentHz}</span>
                          <span className="text-[10px] text-sky-400 font-normal">Hz</span>
                        </div>
                      )}
                    </td>

                    {/* Set Flow Rate (LPM) [Where flow rate is set!] */}
                    <td className="py-3 px-3">
                      {isNewUnit ? (
                        <div className="relative w-28">
                          <input
                            type="number"
                            step="0.5"
                            value={point.targetFlowLpm}
                            onChange={(e) => handleLocalPointChange(index, 'targetFlowLpm', e.target.value)}
                            className="w-full bg-neutral-950 border border-sky-500/40 rounded px-2.5 py-1 text-xs font-mono text-sky-300 focus:outline-none focus:border-sky-400"
                          />
                          <span className="text-[9px] text-sky-400/80 block mt-0.5">Set Target (LPM)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-sky-400 tabular-nums">
                            {point.targetFlowLpm.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-neutral-400">LPM</span>
                        </div>
                      )}
                    </td>

                    {/* Target Pressure Drop & Corridor (+/- 15%) - CUSTOMIZABLE ON FIRST SERVICE! */}
                    <td className="py-3 px-3">
                      {isNewUnit ? (
                        <div className="relative w-32">
                          <div className="flex items-center bg-neutral-950 border border-sky-500/60 rounded px-2 py-1 focus-within:border-sky-400 focus-within:ring-1 focus-within:ring-sky-400">
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              max="10.0"
                              value={point.targetDeltaPressureBar ?? targetP}
                              onChange={(e) => handleLocalPointChange(index, 'targetDeltaPressureBar', e.target.value)}
                              className="w-full bg-transparent text-xs font-mono font-bold text-sky-300 focus:outline-none"
                              placeholder="Bar"
                            />
                            <span className="text-[10px] text-sky-400 font-semibold ml-1">Bar</span>
                          </div>
                          <span className="text-[9px] text-sky-400/90 block mt-0.5 font-sans font-semibold">Custom Baseline Bar</span>
                          <span className="text-[9.5px] font-mono text-neutral-400 block">
                            [{minAllowed} – {maxAllowed} Bar]
                          </span>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-neutral-100 text-sm tabular-nums">
                              {targetP.toFixed(2)} Bar
                            </span>
                            {isPermanentLocked ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                <Lock className="h-2.5 w-2.5" />
                                <span>Permanent</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-neutral-400 font-normal">(&plusmn;15%)</span>
                            )}
                          </div>
                          {isPermanentLocked && (
                            <span className="text-[9px] text-emerald-400/90 font-mono block mt-0.5">
                              Medium of Tests 1 &amp; 2
                            </span>
                          )}
                          <span className="text-[9.5px] font-mono text-neutral-400 block mt-0.5">
                            [{minAllowed} – {maxAllowed} Bar]
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Measured Pressure Drop (Bar) - PRIMARY INPUT (where pressure drop varies!) */}
                    <td className="py-3 px-3">
                      <div className="relative w-32">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 0.36"
                          value={point.deltaPressureBar ?? ''}
                          onChange={(e) => handleLocalPointChange(index, 'deltaPressureBar', e.target.value)}
                          className={`w-full bg-neutral-950 border rounded-lg px-3 py-1.5 text-xs font-mono font-bold tabular-nums focus:outline-none transition-colors ${
                            !hasValue
                              ? 'border-amber-500/60 text-neutral-100 placeholder:text-neutral-600 focus:border-amber-400'
                              : isWithinTol
                              ? 'border-emerald-500 text-emerald-300 focus:border-emerald-400'
                              : 'border-rose-500 text-rose-300 focus:border-rose-400'
                          }`}
                        />
                        <span className="text-[9px] text-neutral-400 block mt-0.5">&Delta;P (Bar)</span>
                      </div>
                    </td>

                    {/* Difference / Delta in Pressure Drop */}
                    <td className="py-3 px-3">
                      {diff !== null ? (
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono tabular-nums ${
                            isWithinTol
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}>
                            {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} Bar
                          </span>
                          <span className="text-[10px] text-neutral-300 font-mono">
                            ({diff > 0 ? `+${((diff / targetP) * 100).toFixed(1)}%` : `${((diff / targetP) * 100).toFixed(1)}%`})
                          </span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic text-[11px]">— Pending Input —</span>
                      )}
                    </td>

                    {/* Point Status Verdict */}
                    <td className="py-3 px-3 text-right">
                      {!hasValue ? (
                        <span className="text-[10px] font-mono text-amber-400 font-bold">
                          REQUIRED
                        </span>
                      ) : isWithinTol ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          IN SPEC (PASS)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          OUT OF SPEC
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Table Summary Footer */}
            <tfoot>
              <tr className="border-t border-neutral-800 bg-neutral-950/60 font-mono text-xs">
                <td colSpan={4} className="py-3 px-3 text-neutral-200">
                  <span className="font-bold text-neutral-100">SOP Stage Rule: </span>
                  At least 3 of 5 pressure drop readings within &plusmn;15% corridor required for circuit PASS.
                </td>
                <td colSpan={3} className="py-3 px-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <span className="text-neutral-300 font-sans text-xs">Points In Spec:</span>
                    <span className={`px-2.5 py-1 rounded font-bold font-mono text-xs border ${
                      isActivePassByThreshold
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {activeInSpecCount} / 5 Points &rarr; {isActivePassByThreshold ? 'PASS (≥3 MET)' : 'FAIL (<3 MET)'}
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Bench Details & Environmental Conditions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2">
          <label className="text-xs font-semibold text-neutral-200 block flex items-center gap-1.5">
            <Thermometer className="h-3.5 w-3.5 text-rose-400" />
            Test Fluid Temperature (°C)
          </label>
          <input
            type="number"
            step="0.2"
            value={localFluidTempC || ''}
            onChange={(e) => handleLocalBenchChange('fluidTempC', e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-200 block">
              Calibration Fluid Specification
            </label>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">
              DI Water Standard
            </span>
          </div>
          <input
            type="text"
            value={localFluidType}
            onChange={(e) => handleLocalBenchChange('fluidType', e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-sky-500"
          />
          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => handleLocalBenchChange('fluidType', 'Deionized Water (DI Water)')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                (localFluidType || '').toLowerCase().includes('deionized') || (localFluidType || '').toLowerCase().includes('di water')
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
              }`}
            >
              ✓ Deionized Water (DI Water)
            </button>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2">
          <label className="text-xs font-semibold text-neutral-200 block">
            Calibrated Flow Bench ID
          </label>
          <input
            type="text"
            value={localBenchId}
            onChange={(e) => handleLocalBenchChange('benchId', e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Technical Blueprint Drawing Modal */}
      <FlowDrawingModal
        isOpen={isDrawingModalOpen}
        onClose={() => setIsDrawingModalOpen(false)}
        unit={unit}
      />

      {/* INSPECT 2-TEST MEDIUM BREAKDOWN MODAL */}
      {showMediumModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Permanent Target Baseline: P/N {unit.partNumber}
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono">
                    Established from Medium of First 2 Completed Service Tests
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMediumModal(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">
                    Test #1 (First Service / Birth)
                  </span>
                  <div className="text-sm font-bold text-neutral-200">
                    {partBaseline.test1Info?.runLabel || 'Life #1 Factory Birth Test'}
                  </div>
                  <div className="text-neutral-400 text-[11px] font-mono">
                    Date: {partBaseline.test1Info?.date || '2025-04-12'} · Ref: {partBaseline.test1Info?.workOrderNumber || `SR-BIRTH-${unit.partNumber}`}
                  </div>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">
                    Test #2 (Second Service / Overhaul)
                  </span>
                  <div className="text-sm font-bold text-neutral-200">
                    {partBaseline.test2Info?.runLabel || 'Life #2 Initial Overhaul Test'}
                  </div>
                  <div className="text-neutral-400 text-[11px] font-mono">
                    Date: {partBaseline.test2Info?.date || '2025-11-20'} · Ref: {partBaseline.test2Info?.workOrderNumber || `SR-PREV-${unit.partNumber}-L2`}
                  </div>
                </div>
              </div>

              {/* Side-by-side Table */}
              <div className="overflow-x-auto border border-neutral-800 rounded-xl">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-950 text-neutral-400 uppercase text-[10px] border-b border-neutral-800">
                      <th className="py-2.5 px-3">Operating Point</th>
                      <th className="py-2.5 px-3">Set Flow (LPM)</th>
                      <th className="py-2.5 px-3 text-purple-300">Test #1 ΔP (Bar)</th>
                      <th className="py-2.5 px-3 text-amber-300">Test #2 ΔP (Bar)</th>
                      <th className="py-2.5 px-3 text-emerald-400 font-bold">Medium Target (Bar)</th>
                      <th className="py-2.5 px-3">±15% Corridor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {[0, 1, 2, 3, 4].map((idx) => {
                      const t1 = partBaseline.test1Info?.pressureDrops[idx] ?? DEFAULT_TARGET_PRESSURES[idx];
                      const t2 = partBaseline.test2Info?.pressureDrops[idx] ?? Number((DEFAULT_TARGET_PRESSURES[idx] * 1.06).toFixed(2));
                      const medium = partBaseline.mediumPressureDrops[idx];
                      const minC = (medium * 0.85).toFixed(2);
                      const maxC = (medium * 1.15).toFixed(2);
                      const setFlow = partBaseline.setFlowRates[idx] || DEFAULT_SET_FLOWS[idx];

                      return (
                        <tr key={`breakdown-${idx}`} className="hover:bg-neutral-800/40">
                          <td className="py-2.5 px-3 font-sans font-semibold text-neutral-200">
                            Point #{idx + 1}
                          </td>
                          <td className="py-2.5 px-3 text-sky-300">
                            {setFlow} LPM
                          </td>
                          <td className="py-2.5 px-3 text-purple-300 font-bold">
                            {t1.toFixed(2)} Bar
                          </td>
                          <td className="py-2.5 px-3 text-amber-300 font-bold">
                            {t2.toFixed(2)} Bar
                          </td>
                          <td className="py-2.5 px-3 text-emerald-400 font-bold bg-emerald-500/10">
                            {medium.toFixed(2)} Bar
                          </td>
                          <td className="py-2.5 px-3 text-neutral-400">
                            [{minC} – {maxC} Bar]
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1 text-neutral-300 text-[11px] leading-relaxed">
                <span className="font-bold text-neutral-100 flex items-center gap-1.5 font-mono">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  Homologation Standard Formula:
                </span>
                <p>
                  <strong className="text-emerald-400 font-mono">Permanent Target &Delta;P = (Test #1 &Delta;P + Test #2 &Delta;P) / 2</strong>. This permanent target is locked for part #{unit.partNumber} and applies automatically to all future overhauls of this part number in the fleet.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowMediumModal(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-xs rounded-xl cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
