import React, { useEffect, useState, useRef } from 'react';
import { 
  RotateCw, 
  Play, 
  Pause, 
  RotateCcw, 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft,
  Plus, 
  ShieldCheck, 
  Droplets,
  Thermometer,
  Layers,
  Sparkles,
  QrCode,
  Gauge,
  Check,
  Wind,
  Flame,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { ServiceUnit, FirstFlushData } from '../../types/process';
import { audioAlert } from '../../utils/audioAlert';
import { StepSopViewer } from '../StepSopModal';
import { formatTimerInHours } from '../../utils/timeFormat';
import { getDefaultFirstFlushData } from '../../utils/storage';

interface FirstFlushStepProps {
  unit: ServiceUnit;
  onUpdateUnit: (updater: (prev: ServiceUnit) => ServiceUnit, logAction?: string) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onOpenScanner?: () => void;
}

export const FirstFlushStep: React.FC<FirstFlushStepProps> = ({
  unit,
  onUpdateUnit,
  onNextStep,
  onPrevStep,
  onOpenScanner,
}) => {
  const compType = unit.componentType || unit.intake?.componentType;
  const isOil = compType === 'oil_cooler' || (typeof compType === 'string' && compType.includes('oil'));
  const isCombi = unit.combiConfig?.isCombi && unit.combiConfig.subUnits && unit.combiConfig.subUnits.length > 0;
  
  // Desoaping flush preset: 6 minutes (360s) if water or intercooler, 10 minutes (600s) if oil
  const desoapTargetSecs = isOil ? 600 : 360;
  
  // Extract or initialize firstFlush data
  const firstFlush: FirstFlushData = unit.firstFlush || {
    ...getDefaultFirstFlushData(compType),
    remainingSeconds: unit.degreasing?.preFlush?.remainingSeconds ?? (isOil ? 600 : 360),
    targetDurationSeconds: unit.degreasing?.preFlush?.targetSeconds ?? (isOil ? 600 : 360),
    timerCompleted: false,
    completedAt: undefined,
    soapingAgentEvacuated: false,
    effluentFoamFree: false,
    deionizeResistivityPass: false,
    technician: unit.intake?.technician || 'Nicola Malgarotti',
    selectedSubUnitId: 'all',
    flushedSubUnitIds: [],
  };

  const [alertActive, setAlertActive] = useState(false);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 3 Sub-Timers: Port 1 (2 min / 120s), Port 2 (2 min / 120s), Desoaping (6 min water/intercooler, 10 min oil)
  const p1 = firstFlush.phase1PowerwashPort1 || {
    targetSeconds: 120,
    remainingSeconds: 120,
    isRunning: false,
    timerCompleted: false,
  };
  const p2 = firstFlush.phase2PowerwashPort2 || {
    targetSeconds: 120,
    remainingSeconds: 120,
    isRunning: false,
    timerCompleted: false,
  };
  const p3 = firstFlush.phase3Desoaping || {
    targetSeconds: desoapTargetSecs,
    remainingSeconds: desoapTargetSecs,
    isRunning: false,
    timerCompleted: false,
  };

  const handleStartSubTimer = (phase: 'phase1PowerwashPort1' | 'phase2PowerwashPort2' | 'phase3Desoaping', name: string) => {
    onUpdateUnit((prev) => {
      const currentFF = prev.firstFlush || getDefaultFirstFlushData(prev.componentType);
      const defTarget = phase === 'phase3Desoaping' ? desoapTargetSecs : 120;
      const sub = currentFF[phase] || { targetSeconds: defTarget, remainingSeconds: defTarget };
      const rem = sub.remainingSeconds ?? sub.targetSeconds ?? defTarget;
      return {
        ...prev,
        firstFlush: {
          ...currentFF,
          [phase]: {
            ...sub,
            isRunning: true,
            targetEndTimestamp: Date.now() + rem * 1000,
            remainingSeconds: rem,
          },
        },
      };
    }, `Started ${name} Timer (${Math.round((subTarget(phase)) / 60)}-min target)`);
  };

  function subTarget(phase: 'phase1PowerwashPort1' | 'phase2PowerwashPort2' | 'phase3Desoaping'): number {
    return phase === 'phase3Desoaping' ? desoapTargetSecs : 120;
  }

  const handlePauseSubTimer = (phase: 'phase1PowerwashPort1' | 'phase2PowerwashPort2' | 'phase3Desoaping', name: string) => {
    onUpdateUnit((prev) => {
      const currentFF = prev.firstFlush || getDefaultFirstFlushData(prev.componentType);
      const sub = currentFF[phase] || { targetSeconds: 120, remainingSeconds: 120 };
      return {
        ...prev,
        firstFlush: {
          ...currentFF,
          [phase]: {
            ...sub,
            isRunning: false,
            targetEndTimestamp: undefined,
          },
        },
      };
    }, `Paused ${name} Timer`);
  };

  const handleResetSubTimer = (
    phase: 'phase1PowerwashPort1' | 'phase2PowerwashPort2' | 'phase3Desoaping',
    seconds: number = 120,
    name: string
  ) => {
    onUpdateUnit((prev) => {
      const currentFF = prev.firstFlush || getDefaultFirstFlushData(prev.componentType);
      const sub = currentFF[phase] || { targetSeconds: 120, remainingSeconds: 120 };
      return {
        ...prev,
        firstFlush: {
          ...currentFF,
          [phase]: {
            ...sub,
            targetSeconds: seconds,
            remainingSeconds: seconds,
            isRunning: false,
            timerCompleted: false,
            targetEndTimestamp: undefined,
          },
        },
      };
    }, `Reset ${name} Timer to ${Math.round(seconds / 60)}m`);
  };

  const handleAddSubSeconds = (phase: 'phase1PowerwashPort1' | 'phase2PowerwashPort2' | 'phase3Desoaping', addSecs: number = 30) => {
    onUpdateUnit((prev) => {
      const currentFF = prev.firstFlush || getDefaultFirstFlushData(prev.componentType);
      const sub = currentFF[phase] || { targetSeconds: 120, remainingSeconds: 120 };
      const rem = (sub.remainingSeconds ?? 120) + addSecs;
      const tgt = (sub.targetSeconds ?? 120) + addSecs;
      return {
        ...prev,
        firstFlush: {
          ...currentFF,
          [phase]: {
            ...sub,
            remainingSeconds: rem,
            targetSeconds: tgt,
            targetEndTimestamp: sub.isRunning ? (Date.now() + rem * 1000) : sub.targetEndTimestamp,
            timerCompleted: false,
          },
        },
      };
    }, `Added +${addSecs}s to flush timer`);
  };

  const targetSeconds = firstFlush.targetDurationSeconds || (isOil ? 600 : 360);
  const remainingSeconds = firstFlush.remainingSeconds ?? targetSeconds;
  const isRunning = !!firstFlush.isRunning;
  const isCompleted = !!firstFlush.completedAt;
  const isTimerDone = !!firstFlush.timerCompleted && !isCompleted;

  // Live timer interval runner with wall-clock timestamp synchronization
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      document.title = 'Motorsport Depot System';
      return;
    }

    const checkAndSyncTimer = () => {
      onUpdateUnit((prev) => {
        const currentFF = prev.firstFlush || getDefaultFirstFlushData(prev.componentType);
        if (!currentFF.isRunning) return prev;

        const currentRemaining = currentFF.remainingSeconds ?? targetSeconds;
        const secondsLeft = Math.max(0, currentRemaining - 1);

        const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
        const s = (secondsLeft % 60).toString().padStart(2, '0');
        document.title = `(${m}:${s}) 55°C DI First Flush · Depot`;

        if (secondsLeft <= 0) {
          audioAlert.playTimerCompleteAlert();
          setAlertActive(true);
          return {
            ...prev,
            firstFlush: {
              ...currentFF,
              remainingSeconds: 0,
              isRunning: false,
              timerCompleted: true,
              // DO NOT AUTO-COMPLETE: Flush requires technician manual inspection of effluent and explicit sign-off
              // Preserve current checkbox states without auto-checking them
              soapingAgentEvacuated: currentFF.soapingAgentEvacuated || false,
              effluentFoamFree: currentFF.effluentFoamFree || false,
            },
          };
        }

        return {
          ...prev,
          firstFlush: {
            ...currentFF,
            remainingSeconds: secondsLeft,
            durationMinutes: Number(((targetSeconds - secondsLeft) / 60).toFixed(1)),
            durationHours: Number(((targetSeconds - secondsLeft) / 3600).toFixed(3)),
          },
        };
      }, undefined);
    };

    timerRef.current = setInterval(checkAndSyncTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, targetSeconds, onUpdateUnit]);

  const updateFirstFlushField = <K extends keyof FirstFlushData>(field: K, val: FirstFlushData[K]) => {
    onUpdateUnit((prev) => {
      const current = prev.firstFlush || getDefaultFirstFlushData(prev.componentType);
      return {
        ...prev,
        firstFlush: {
          ...current,
          [field]: val,
        },
      };
    }, `Updated First Flush ${String(field)}`);
  };

  // Handle selecting which sub-unit/circuit is flushing for combi units
  const handleSelectFlushingCore = (coreId: string) => {
    onUpdateUnit((prev) => {
      const current = prev.firstFlush || getDefaultFirstFlushData(prev.componentType);
      let newTarget = isOil ? 600 : 360;

      if (coreId !== 'all') {
        const sub = prev.combiConfig?.subUnits?.find((s) => s.id === coreId);
        if (sub) {
          newTarget = sub.componentType === 'oil_cooler' ? 600 : 360;
        }
      } else {
        const hasOil = prev.combiConfig?.subUnits?.some((s) => s.componentType === 'oil_cooler');
        newTarget = hasOil ? 600 : 360;
      }

      return {
        ...prev,
        firstFlush: {
          ...current,
          selectedSubUnitId: coreId,
          targetDurationSeconds: newTarget,
          remainingSeconds: current.isRunning ? current.remainingSeconds : newTarget,
          durationMinutes: Number((newTarget / 60).toFixed(1)),
          durationHours: Number((newTarget / 3600).toFixed(3)),
        },
      };
    }, `Selected Flushing Unit: ${coreId === 'all' ? 'All Circuits (Concurrent)' : coreId}`);
  };

  const handleToggleSubUnitFlushed = (coreId: string) => {
    onUpdateUnit((prev) => {
      const current = prev.firstFlush || getDefaultFirstFlushData(prev.componentType);
      const existing = current.flushedSubUnitIds || [];
      const updated = existing.includes(coreId)
        ? existing.filter((id: string) => id !== coreId)
        : [...existing, coreId];

      return {
        ...prev,
        firstFlush: {
          ...current,
          flushedSubUnitIds: updated,
        },
      };
    }, `Toggled Core ${coreId} Flush Status`);
  };

  const handleStartTimer = () => {
    setAlertActive(false);
    onUpdateUnit((prev) => {
      const current = prev.firstFlush || getDefaultFirstFlushData(prev.componentType);
      return {
        ...prev,
        firstFlush: {
          ...current,
          isRunning: true,
          performed: true,
        },
      };
    }, 'Started 55°C Deionized Water First Flush Timer');
  };

  const handlePauseTimer = () => {
    onUpdateUnit((prev) => {
      const current = prev.firstFlush || getDefaultFirstFlushData(prev.componentType);
      return {
        ...prev,
        firstFlush: {
          ...current,
          isRunning: false,
        },
      };
    }, 'Paused 55°C Deionized Water First Flush Timer');
  };

  const handleResetTimer = (newDurationSecs?: number) => {
    setAlertActive(false);
    const secs = newDurationSecs || targetSeconds;
    onUpdateUnit((prev) => {
      const current = prev.firstFlush || getDefaultFirstFlushData(prev.componentType);
      return {
        ...prev,
        firstFlush: {
          ...current,
          isRunning: false,
          remainingSeconds: secs,
          targetDurationSeconds: secs,
          durationMinutes: Number((secs / 60).toFixed(1)),
          durationHours: Number((secs / 3600).toFixed(3)),
          timerCompleted: false,
        },
      };
    }, `Reset 55°C First Flush Timer (${Math.round(secs / 60)}m)`);
  };

  const handleAddMinutes = (extraMinutes: number) => {
    onUpdateUnit((prev) => {
      const current = prev.firstFlush || getDefaultFirstFlushData(prev.componentType);
      const newRemaining = (current.remainingSeconds ?? 0) + extraMinutes * 60;
      const newTarget = (current.targetDurationSeconds ?? 360) + extraMinutes * 60;
      return {
        ...prev,
        firstFlush: {
          ...current,
          remainingSeconds: newRemaining,
          targetDurationSeconds: newTarget,
          timerCompleted: false,
        },
      };
    }, `Added +${extraMinutes}m to 55°C First Flush`);
  };

  const handleCompleteAndNext = () => {
    if (!firstFlush.soapingAgentEvacuated || !firstFlush.effluentFoamFree) {
      setValidationMsg(
        'Manual Verification Required: Flush does not auto-complete. Please visually inspect effluent sight glass and check off the soaping agent evacuation and foam-free checkboxes before sign-off.'
      );
      return;
    }

    setValidationMsg(null);
    onUpdateUnit((prev) => {
      const current = prev.firstFlush || getDefaultFirstFlushData(prev.componentType);
      return {
        ...prev,
        currentStepId: 'flow_test',
        firstFlush: {
          ...current,
          performed: true,
          timerCompleted: true,
          soapingAgentEvacuated: true,
          effluentFoamFree: true,
          deionizeResistivityPass: current.deionizeResistivityPass ?? true,
          completedAt: current.completedAt || new Date().toISOString(),
          technician: current.technician || 'Nicola Malgarotti',
        },
      };
    }, 'Completed Stage 03: First Flush (55°C DI Water) - Proceeding to Flow Test');
    onNextStep();
  };

  const handleForceAcknowledgeAndProceed = () => {
    setValidationMsg(null);
    onUpdateUnit((prev) => {
      const current = prev.firstFlush || getDefaultFirstFlushData(prev.componentType);
      return {
        ...prev,
        currentStepId: 'flow_test',
        firstFlush: {
          ...current,
          performed: true,
          timerCompleted: true,
          soapingAgentEvacuated: true,
          effluentFoamFree: true,
          deionizeResistivityPass: true,
          completedAt: new Date().toISOString(),
          technician: current.technician || 'Nicola Malgarotti',
        },
      };
    }, 'Manual inspection certified & completed Stage 03: First Flush');
    onNextStep();
  };

  // --- RE-FLUSH PROTOCOL & DRYING PROCESS STATE & HANDLERS ---
  const [reflushReasonInput, setReflushReasonInput] = useState<string>(
    firstFlush.reflushReason || 'Sight glass foam persistence / residual particulate detected'
  );

  const drying = firstFlush.dryingProcess || {
    active: false,
    dryingMethod: 'forced_hot_air' as const,
    targetSeconds: 180,
    remainingSeconds: 180,
    isRunning: false,
    timerCompleted: false,
  };
  const dryingRemaining = drying.remainingSeconds ?? 180;
  const isDryingRunning = Boolean(drying.isRunning);
  const isDryingDone = Boolean(drying.timerCompleted || (isDryingRunning && dryingRemaining <= 0));

  const formatDryingCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleTriggerReflush = (reason?: string) => {
    const finalReason = reason || reflushReasonInput;
    onUpdateUnit((prev) => {
      const current = prev.firstFlush || getDefaultFirstFlushData(prev.componentType);
      const nextCount = (current.reflushCount || 0) + 1;
      return {
        ...prev,
        firstFlush: {
          ...current,
          reflushRequired: true,
          reflushCount: nextCount,
          reflushReason: finalReason,
          soapingAgentEvacuated: false,
          effluentFoamFree: false,
          remainingSeconds: current.targetDurationSeconds || (isOil ? 600 : 360),
          timerCompleted: false,
        },
      };
    }, `Triggered Re-Flush Cycle #${(firstFlush.reflushCount || 0) + 1}: ${finalReason}`);
  };

  const handleLogReflushCyclePass = () => {
    onUpdateUnit((prev) => {
      const current = prev.firstFlush || getDefaultFirstFlushData(prev.componentType);
      const count = current.reflushCount || 1;
      const historyItem = {
        cycleNumber: count,
        timestamp: new Date().toISOString(),
        durationSeconds: current.targetDurationSeconds || (isOil ? 600 : 360),
        cleanVerdict: 'PASS' as const,
        notes: `Re-flush cycle #${count} verified clean effluent. Sight glass clear.`,
      };
      return {
        ...prev,
        firstFlush: {
          ...current,
          reflushRequired: false,
          soapingAgentEvacuated: true,
          effluentFoamFree: true,
          deionizeResistivityPass: true,
          reflushHistory: [...(current.reflushHistory || []), historyItem],
        },
      };
    }, `Re-Flush cycle verified PASS: Effluent clean and foam-free`);
  };

  const handleToggleDryingProcess = (active: boolean) => {
    onUpdateUnit((prev) => {
      const current = prev.firstFlush || getDefaultFirstFlushData(prev.componentType);
      return {
        ...prev,
        firstFlush: {
          ...current,
          dryingProcess: {
            ...(current.dryingProcess || {
              dryingMethod: 'forced_hot_air',
              targetSeconds: 180,
              remainingSeconds: 180,
            }),
            active,
            redegreaseRecommended: active,
          },
        },
      };
    }, active ? 'Activated core moisture evacuation drying process' : 'Deactivated drying process');
  };

  const handleStartDryingTimer = () => {
    const rem = dryingRemaining > 0 ? dryingRemaining : 180;
    const targetEnd = Date.now() + rem * 1000;
    onUpdateUnit((prev) => {
      const current = prev.firstFlush || getDefaultFirstFlushData(prev.componentType);
      return {
        ...prev,
        firstFlush: {
          ...current,
          dryingProcess: {
            ...(current.dryingProcess || {
              active: true,
              dryingMethod: 'forced_hot_air',
              targetSeconds: 180,
            }),
            active: true,
            remainingSeconds: rem,
            targetSeconds: 180,
            isRunning: true,
            timerCompleted: false,
            targetEndTimestamp: targetEnd,
          },
        },
      };
    }, 'Started 3-Minute Core Moisture Drying Timer');
  };

  const handlePauseDryingTimer = () => {
    onUpdateUnit((prev) => {
      const current = prev.firstFlush || getDefaultFirstFlushData(prev.componentType);
      const dp = current.dryingProcess;
      if (!dp) return prev;
      return {
        ...prev,
        firstFlush: {
          ...current,
          dryingProcess: {
            ...dp,
            isRunning: false,
            targetEndTimestamp: undefined,
          },
        },
      };
    }, 'Paused Core Drying Timer');
  };

  const handleResetDryingTimer = (seconds = 180) => {
    onUpdateUnit((prev) => {
      const current = prev.firstFlush || getDefaultFirstFlushData(prev.componentType);
      const dp = current.dryingProcess;
      return {
        ...prev,
        firstFlush: {
          ...current,
          dryingProcess: {
            ...(dp || { active: true, dryingMethod: 'forced_hot_air' }),
            targetSeconds: seconds,
            remainingSeconds: seconds,
            isRunning: false,
            timerCompleted: false,
            targetEndTimestamp: undefined,
          },
        },
      };
    }, `Reset Core Drying Timer to ${Math.round(seconds / 60)} minutes`);
  };

  const handleAddDryingSeconds = (add = 30) => {
    onUpdateUnit((prev) => {
      const current = prev.firstFlush || getDefaultFirstFlushData(prev.componentType);
      const dp = current.dryingProcess || { active: true, dryingMethod: 'forced_hot_air', targetSeconds: 180, remainingSeconds: 180 };
      const nextRem = (dp.remainingSeconds ?? 180) + add;
      return {
        ...prev,
        firstFlush: {
          ...current,
          dryingProcess: {
            ...dp,
            remainingSeconds: nextRem,
            targetSeconds: (dp.targetSeconds ?? 180) + add,
            targetEndTimestamp: dp.isRunning ? (Date.now() + nextRem * 1000) : dp.targetEndTimestamp,
            timerCompleted: false,
          },
        },
      };
    }, `Added +${add}s to Core Drying Timer`);
  };

  const handleReturnToDegreasing = () => {
    onUpdateUnit((prev) => ({
      ...prev,
      currentStepId: 'degreasing',
      firstFlush: {
        ...(prev.firstFlush || getDefaultFirstFlushData(prev.componentType)),
        dryingProcess: {
          ...(prev.firstFlush?.dryingProcess || { active: true, dryingMethod: 'forced_hot_air', targetSeconds: 180, remainingSeconds: 0 }),
          redegreaseRecommended: true,
          redegreaseReason: 'Core requires secondary solvent flow / degrease wash cycle after moisture purge.',
        },
      },
    }), 'Returned unit to Stage 02 Degreasing for secondary solvent wash cycle');
    if (onPrevStep) onPrevStep();
  };

  const elapsedSeconds = Math.max(0, targetSeconds - remainingSeconds);
  const progressPercent = targetSeconds > 0 ? Math.min(100, Math.round((elapsedSeconds / targetSeconds) * 100)) : 100;
  const minsLeft = Math.floor(remainingSeconds / 60);
  const secsLeft = remainingSeconds % 60;

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-teal-500/20 text-teal-400 font-mono text-xs font-bold border border-teal-500/30">
              STAGE 04
            </span>
            <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider">
              Post-Degrease &amp; Descale Neutralization Flush
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-100 mt-1 flex items-center gap-2">
            <Droplets className="h-6 w-6 text-teal-400" />
            <span>First Flush: 55°C Deionized Water</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Single rigorous deionized water flush at 55°C to completely dissolve &amp; evacuate all chemical degreaser and descaler residues prior to Flow Testing.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <StepSopViewer stepId="first_flush" />
          
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-teal-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-teal-500/30 cursor-pointer"
              title="Scan unit barcode / QR tag"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>Scan QR</span>
            </button>
          )}

          <button
            type="button"
            onClick={onPrevStep}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>&larr; Stage 03: Descaling</span>
          </button>

          <button
            type="button"
            onClick={handleCompleteAndNext}
            className="px-4 py-1.5 bg-teal-500 hover:bg-teal-400 text-neutral-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>Proceed to Flow Test</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Protocol Banner: Clear SOP specification */}
      <div className="p-4 rounded-xl border bg-gradient-to-r from-teal-950/40 via-neutral-900 to-sky-950/30 border-teal-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/30">
            <Thermometer className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-teal-200">
                Stage 04 Standard Operating Procedure: 55°C Deionized Water Flush
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                SINGLE 55°C FLUSH ONLY
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                NO 2ND FLUSH NEEDED
              </span>
            </div>
            <p className="text-xs text-neutral-300 mt-1 max-w-3xl leading-relaxed">
              In accordance with technician specification (Nicola Malgarotti), degreasing uses ambient room-temperature flow-through degreaser (no immersion). Immediately following degreasing, the core undergoes a <strong>single dedicated flush with 55°C Deionized Water</strong>. This hot DI water breaks down surface tension and eliminates all soaping / surfactant foaming agents, ensuring clean hydraulic channels for accurate LPM flow benchmarking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 bg-neutral-950/70 p-2.5 rounded-lg border border-neutral-800">
          <div className="text-right">
            <span className="text-[10px] text-neutral-400 block uppercase font-mono">DI Flush Target</span>
            <span className="text-sm font-mono font-bold text-teal-300">55.0°C Hot Water</span>
          </div>
          <div className="h-8 w-px bg-neutral-800 mx-1" />
          <div className="text-right">
            <span className="text-[10px] text-neutral-400 block uppercase font-mono">Resistivity</span>
            <span className="text-sm font-mono font-bold text-emerald-400">&ge; 15 MΩ·cm</span>
          </div>
        </div>
      </div>

      {/* Timer Elapsed Notification (No Auto-Complete) */}
      {isTimerDone && (
        <div className="p-4 rounded-xl bg-amber-500/20 border-2 border-amber-500/60 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center shrink-0 font-bold">
              <Check className="h-5 w-5 stroke-[3]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>55°C Flush Timer Elapsed (No Auto-Complete)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500 text-neutral-950 font-bold">
                  MANUAL SIGN-OFF REQUIRED
                </span>
              </h4>
              <p className="text-xs text-amber-200/90 mt-0.5">
                The timed 55°C DI flush cycle has completed. Inspect effluent water for total elimination of soaping agents &amp; foaming bubbles, then sign off below.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCompleteAndNext}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-neutral-950 font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0 shadow-sm"
          >
            Sign-Off &amp; Advance to Flow Test &rarr;
          </button>
        </div>
      )}

      {/* Manual Verification Required Notice */}
      {validationMsg && (
        <div className="p-4 rounded-xl bg-amber-500/15 border-2 border-amber-500/60 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center shrink-0 font-bold">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Technician Verification Required</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500 text-neutral-950 font-bold">
                  DOES NOT AUTO-COMPLETE
                </span>
              </h4>
              <p className="text-xs text-amber-200/90 mt-0.5">
                {validationMsg}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleForceAcknowledgeAndProceed}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Sign-Off &amp; Proceed
            </button>
            <button
              type="button"
              onClick={() => setValidationMsg(null)}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-xl cursor-pointer"
            >
              Check Boxes Manually
            </button>
          </div>
        </div>
      )}

      {/* Combi Assembly: Select which unit/circuit is flushing */}
      {isCombi && (
        <div className="bg-neutral-900 border border-purple-500/40 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-400" />
              <div>
                <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
                  <span>Comby Assembly: Select Circuit to Flush</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    {firstFlush.selectedSubUnitId && firstFlush.selectedSubUnitId !== 'all'
                      ? `ACTIVE CORE: ${unit.combiConfig?.subUnits.find((s) => s.id === firstFlush.selectedSubUnitId)?.name || 'SPECIFIC CORE'}`
                      : 'CONCURRENT: ALL CIRCUITS'}
                  </span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Select which individual core/circuit is currently flushing on the 55°C DI water rig, or choose "All Circuits" for single concurrent flush.
                </p>
              </div>
            </div>
            <div className="text-xs font-mono text-neutral-400 bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800">
              Circuits Verified: <strong className="text-emerald-400">{(firstFlush.flushedSubUnitIds || []).length} / {unit.combiConfig?.subUnits.length || 0} Cores</strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleSelectFlushingCore('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 border cursor-pointer ${
                (!firstFlush.selectedSubUnitId || firstFlush.selectedSubUnitId === 'all')
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md ring-2 ring-purple-400/20'
                  : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-purple-500/50'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>All Circuits (Unified 55°C Single Flush)</span>
            </button>

            {(unit.combiConfig?.subUnits || []).map((sub) => {
              const isSelected = firstFlush.selectedSubUnitId === sub.id;
              const isFlushed = (firstFlush.flushedSubUnitIds || []).includes(sub.id);
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleSelectFlushingCore(sub.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 border cursor-pointer ${
                    isSelected
                      ? 'bg-teal-500 text-neutral-950 border-teal-300 shadow-md ring-2 ring-teal-400/20'
                      : isFlushed
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80 hover:border-emerald-500'
                      : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${isSelected ? 'bg-neutral-950' : isFlushed ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                  <span>Core {sub.unitIndex}: {sub.name}</span>
                  {isFlushed && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3 Dedicated Flush Station Timers */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-neutral-900 border border-teal-500/30 rounded-2xl shadow-md">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                3-STAGE POWERWASH &amp; DESOAPING PROTOCOL
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                Port 1 (2m) &rarr; Port 2 (2m) &rarr; Desoaping ({isOil ? '10m' : '6m'})
              </span>
            </div>
            <h3 className="text-base font-bold text-neutral-100 mt-0.5 flex items-center gap-2">
              <Droplets className="h-5 w-5 text-teal-400" />
              <span>Three Timers: Port 1 Powerwash, Port 2 Powerwash &amp; Desoaping</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              High-velocity 55°C deionized water flush through Port 1 (2 mins), Port 2 (2 mins), followed by final desoaping evacuation. Timers continue ticking even when switching between tabs.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {p1.timerCompleted && p2.timerCompleted && p3.timerCompleted ? (
              <span className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>✓ ALL 3 PHASES COMPLETE</span>
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-neutral-950 text-neutral-400 border border-neutral-800 flex items-center gap-1.5">
                <RotateCw className="h-3.5 w-3.5 text-teal-400" />
                <span>
                  {[p1.timerCompleted, p2.timerCompleted, p3.timerCompleted].filter(Boolean).length} / 3 Complete
                </span>
              </span>
            )}
          </div>
        </div>

        {/* 3 Interactive Timer Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* TIMER 1: Powerwash Port 1 (Set at 2 minutes) */}
          <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
            p1.isRunning
              ? 'bg-neutral-900 border-teal-500 shadow-lg ring-1 ring-teal-500/30'
              : p1.timerCompleted
              ? 'bg-neutral-900/90 border-emerald-500/40'
              : 'bg-neutral-900 border-neutral-800'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase">
                  Stage 1 · Port 1 Powerwash
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  p1.timerCompleted
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : p1.isRunning
                    ? 'bg-teal-500/20 text-teal-300 animate-pulse'
                    : 'bg-neutral-950 text-neutral-400'
                }`}>
                  {p1.timerCompleted ? '✓ COMPLETE' : p1.isRunning ? 'RUNNING' : 'STANDBY'}
                </span>
              </div>

              <h4 className="text-sm font-bold text-neutral-100 flex items-center gap-1.5">
                <span>Powerwash Port 1</span>
                <span className="text-xs text-amber-400 font-mono">(Inlet Port)</span>
              </h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                High-pressure 55°C DI powerwash into Port 1 to break initial internal core sediment.
              </p>

              {/* Digital Countdown */}
              {(() => {
                const rem = p1.remainingSeconds ?? 120;
                const tgt = p1.targetSeconds || 120;
                const m = Math.floor(rem / 60);
                const s = rem % 60;
                const pct = tgt > 0 ? Math.min(100, Math.round(((tgt - rem) / tgt) * 100)) : 100;
                return (
                  <div className="my-4 text-center">
                    <div className="inline-block px-5 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 shadow-inner w-full">
                      <div className="text-4xl sm:text-5xl font-mono font-black tracking-tight text-teal-400 tabular-nums">
                        {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
                      </div>
                      <div className="text-[11px] font-mono text-neutral-400 mt-1 flex items-center justify-center gap-2">
                        <span>Preset: 2m (120s)</span>
                        <span>&middot;</span>
                        <span className="text-teal-300 font-semibold">{pct}%</span>
                      </div>
                    </div>

                    <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden mt-3 border border-neutral-800">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          p1.timerCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-teal-500 to-sky-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-neutral-800">
              {!p1.isRunning ? (
                <button
                  type="button"
                  onClick={() => handleStartSubTimer('phase1PowerwashPort1', 'Powerwash Port 1')}
                  className="flex-1 py-2 px-3 bg-teal-500 hover:bg-teal-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Start (2m)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePauseSubTimer('phase1PowerwashPort1', 'Powerwash Port 1')}
                  className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Pause className="h-3.5 w-3.5 fill-current" />
                  <span>Pause</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleResetSubTimer('phase1PowerwashPort1', 120, 'Powerwash Port 1')}
                className="p-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-xl text-xs cursor-pointer"
                title="Reset Port 1 to 2 minutes"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleAddSubSeconds('phase1PowerwashPort1', 30)}
                className="px-2 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-mono text-[10px] rounded-xl cursor-pointer"
                title="Add 30 seconds"
              >
                +30s
              </button>
            </div>
          </div>

          {/* TIMER 2: Powerwash Port 2 (Set at 2 minutes) */}
          <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
            p2.isRunning
              ? 'bg-neutral-900 border-teal-500 shadow-lg ring-1 ring-teal-500/30'
              : p2.timerCompleted
              ? 'bg-neutral-900/90 border-emerald-500/40'
              : 'bg-neutral-900 border-neutral-800'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase">
                  Stage 2 · Port 2 Powerwash
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  p2.timerCompleted
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : p2.isRunning
                    ? 'bg-teal-500/20 text-teal-300 animate-pulse'
                    : 'bg-neutral-950 text-neutral-400'
                }`}>
                  {p2.timerCompleted ? '✓ COMPLETE' : p2.isRunning ? 'RUNNING' : 'STANDBY'}
                </span>
              </div>

              <h4 className="text-sm font-bold text-neutral-100 flex items-center gap-1.5">
                <span>Powerwash Port 2</span>
                <span className="text-xs text-sky-400 font-mono">(Outlet Port)</span>
              </h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                High-pressure reverse 55°C DI powerwash into Port 2 to back-flush opposite channel headers.
              </p>

              {/* Digital Countdown */}
              {(() => {
                const rem = p2.remainingSeconds ?? 120;
                const tgt = p2.targetSeconds || 120;
                const m = Math.floor(rem / 60);
                const s = rem % 60;
                const pct = tgt > 0 ? Math.min(100, Math.round(((tgt - rem) / tgt) * 100)) : 100;
                return (
                  <div className="my-4 text-center">
                    <div className="inline-block px-5 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 shadow-inner w-full">
                      <div className="text-4xl sm:text-5xl font-mono font-black tracking-tight text-teal-400 tabular-nums">
                        {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
                      </div>
                      <div className="text-[11px] font-mono text-neutral-400 mt-1 flex items-center justify-center gap-2">
                        <span>Preset: 2m (120s)</span>
                        <span>&middot;</span>
                        <span className="text-teal-300 font-semibold">{pct}%</span>
                      </div>
                    </div>

                    <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden mt-3 border border-neutral-800">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          p2.timerCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-teal-500 to-sky-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-neutral-800">
              {!p2.isRunning ? (
                <button
                  type="button"
                  onClick={() => handleStartSubTimer('phase2PowerwashPort2', 'Powerwash Port 2')}
                  className="flex-1 py-2 px-3 bg-teal-500 hover:bg-teal-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Start (2m)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePauseSubTimer('phase2PowerwashPort2', 'Powerwash Port 2')}
                  className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Pause className="h-3.5 w-3.5 fill-current" />
                  <span>Pause</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleResetSubTimer('phase2PowerwashPort2', 120, 'Powerwash Port 2')}
                className="p-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-xl text-xs cursor-pointer"
                title="Reset Port 2 to 2 minutes"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleAddSubSeconds('phase2PowerwashPort2', 30)}
                className="px-2 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-mono text-[10px] rounded-xl cursor-pointer"
                title="Add 30 seconds"
              >
                +30s
              </button>
            </div>
          </div>

          {/* TIMER 3: Desoaping / Neutral Flush (Preset: 2 minutes) */}
          <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
            p3.isRunning
              ? 'bg-neutral-900 border-teal-500 shadow-lg ring-1 ring-teal-500/30'
              : p3.timerCompleted
              ? 'bg-neutral-900/90 border-emerald-500/40'
              : 'bg-neutral-900 border-neutral-800'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase">
                  Stage 3 · Desoaping Flush
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  p3.timerCompleted
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : p3.isRunning
                    ? 'bg-teal-500/20 text-teal-300 animate-pulse'
                    : 'bg-neutral-950 text-neutral-400'
                }`}>
                  {p3.timerCompleted ? '✓ COMPLETE' : p3.isRunning ? 'RUNNING' : 'STANDBY'}
                </span>
              </div>

              <h4 className="text-sm font-bold text-neutral-100 flex items-center gap-1.5">
                <span>Desoaping &amp; Neutral Evacuation</span>
                <span className="text-xs text-emerald-400 font-mono">
                  ({isOil ? '10 min · Oil Cooler' : '6 min · Water/Intercooler'})
                </span>
              </h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Continuous 55°C DI fluid circulation to purge all surfactant soap lather from core ({isOil ? '10-minute oil matrix evacuation' : '6-minute water/intercooler cycle'}).
              </p>

              {/* Digital Countdown */}
              {(() => {
                const rem = p3.remainingSeconds ?? desoapTargetSecs;
                const tgt = p3.targetSeconds || desoapTargetSecs;
                const m = Math.floor(rem / 60);
                const s = rem % 60;
                const pct = tgt > 0 ? Math.min(100, Math.round(((tgt - rem) / tgt) * 100)) : 100;
                return (
                  <div className="my-4 text-center">
                    <div className="inline-block px-5 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 shadow-inner w-full">
                      <div className="text-4xl sm:text-5xl font-mono font-black tracking-tight text-teal-400 tabular-nums">
                        {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
                      </div>
                      <div className="text-[11px] font-mono text-neutral-400 mt-1 flex items-center justify-center gap-2">
                        <span>Preset: {Math.round(tgt / 60)}m ({tgt}s)</span>
                        <span>&middot;</span>
                        <span className="text-teal-300 font-semibold">{pct}%</span>
                      </div>
                    </div>

                    <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden mt-3 border border-neutral-800">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          p3.timerCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-teal-500 to-sky-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-neutral-800">
              {!p3.isRunning ? (
                <button
                  type="button"
                  onClick={() => handleStartSubTimer('phase3Desoaping', 'Desoaping Flush')}
                  className="flex-1 py-2 px-3 bg-teal-500 hover:bg-teal-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Start ({Math.round((p3.targetSeconds || desoapTargetSecs) / 60)}m)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePauseSubTimer('phase3Desoaping', 'Desoaping Flush')}
                  className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Pause className="h-3.5 w-3.5 fill-current" />
                  <span>Pause</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleResetSubTimer('phase3Desoaping', desoapTargetSecs, 'Desoaping Flush')}
                className="p-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-xl text-xs cursor-pointer"
                title={`Reset Desoaping to ${Math.round(desoapTargetSecs / 60)} minutes`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleAddSubSeconds('phase3Desoaping', 30)}
                className="px-2 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-mono text-[10px] rounded-xl cursor-pointer"
                title="Add 30 seconds"
              >
                +30s
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Telemetry & Chemical Evacuation Sign-Off */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Right Column: Temperature, Sight Glass & Soaping Agent Verification */}
        <div className="lg:col-span-6 space-y-4">
          {/* 55°C Water Telemetry & Supply Parameters */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg">
            <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Thermometer className="h-4 w-4 text-teal-400" />
              <span>55°C Deionized Water Supply &amp; Chemistry</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-neutral-400 font-medium mb-1">
                  Water Temperature Target (°C)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    value={firstFlush.waterTempC || 55}
                    onChange={(e) => updateFirstFlushField('waterTempC', Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-teal-500"
                  />
                  <span className="absolute right-3 top-2 text-xs text-teal-400 font-mono font-bold">
                    55.0°C (Nominal)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 font-medium mb-1">
                  Technician Sign-Off
                </label>
                <input
                  type="text"
                  value={firstFlush.technician || 'Nicola Malgarotti'}
                  onChange={(e) => updateFirstFlushField('technician', e.target.value)}
                  placeholder="e.g. Nicola Malgarotti"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Checklist: Soaping Agent Evacuation */}
            <div className="mt-4 pt-4 border-t border-neutral-800 space-y-2.5">
              <span className="text-[11px] font-mono text-neutral-400 uppercase block">
                Soaping Agent Removal Verification Checklist:
              </span>

              <label className="flex items-start gap-2.5 text-xs text-neutral-200 cursor-pointer p-2 rounded-lg bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700">
                <input
                  type="checkbox"
                  checked={!!firstFlush.soapingAgentEvacuated}
                  onChange={(e) => updateFirstFlushField('soapingAgentEvacuated', e.target.checked)}
                  className="rounded border-neutral-700 text-teal-500 focus:ring-teal-500 shrink-0 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-neutral-100">
                    Degreaser Soaping Agent &amp; Foaming Surfactant Evacuated
                  </span>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    55°C deionized water circulated through internal passes until chemical surfactant is completely dissolved and flushed out.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-neutral-200 cursor-pointer p-2 rounded-lg bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700">
                <input
                  type="checkbox"
                  checked={!!firstFlush.effluentFoamFree}
                  onChange={(e) => updateFirstFlushField('effluentFoamFree', e.target.checked)}
                  className="rounded border-neutral-700 text-teal-500 focus:ring-teal-500 shrink-0 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-neutral-100">
                    Sight Glass Clear &amp; 100% Foam-Free
                  </span>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Discharge effluent optical sight glass shows continuous crystal-clear DI water stream with zero soap bubbles or lather.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-neutral-200 cursor-pointer p-2 rounded-lg bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700">
                <input
                  type="checkbox"
                  checked={!!firstFlush.deionizeResistivityPass}
                  onChange={(e) => updateFirstFlushField('deionizeResistivityPass', e.target.checked)}
                  className="rounded border-neutral-700 text-teal-500 focus:ring-teal-500 shrink-0 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-neutral-100">
                    Deionized Water Resistivity Specification Passed (&ge; 15 MΩ·cm)
                  </span>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Conductivity inline sensor verifies residual ionic minerals and surfactant dissolved salts are under 0.05 μS/cm.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* RE-FLUSH PROTOCOL & EFFLUENT QUALITY VERIFICATION */}
          <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 border-2 border-teal-500/40 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
                  <RefreshCw className={`h-5 w-5 ${firstFlush.reflushRequired ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase">
                      Effluent Inspection Protocol
                    </span>
                    {(firstFlush.reflushCount || 0) > 0 && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {firstFlush.reflushCount} RE-FLUSH CYCLES LOGGED
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-neutral-100 mt-0.5">
                    First Flush Cleanliness Verdict &amp; Re-Flush Option
                  </h3>
                </div>
              </div>

              <span className="text-[11px] font-mono text-neutral-400">
                AS9100 / ISO 16232 Effluent Check
              </span>
            </div>

            {/* Effluent Status Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleLogReflushCyclePass}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  !firstFlush.reflushRequired && firstFlush.effluentFoamFree
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/40 shadow-md'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  !firstFlush.reflushRequired && firstFlush.effluentFoamFree ? 'bg-emerald-500/30 text-emerald-200' : 'bg-neutral-900 text-neutral-500'
                }`}>
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-tight text-white">
                    ✓ Effluent Clean &amp; Foam-Free (PASS)
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    Sight glass clear, zero soap bubbles. Ready for Stage 04 Flow Test.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerReflush()}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  firstFlush.reflushRequired
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/40 shadow-md'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  firstFlush.reflushRequired ? 'bg-amber-500/30 text-amber-200' : 'bg-neutral-900 text-neutral-500'
                }`}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-tight text-white">
                    ⚠ Effluent Not Clean (Trigger Re-Flush)
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    Residual oil slurry or foaming detected. Initiate secondary flush.
                  </div>
                </div>
              </button>
            </div>

            {/* Active Re-Flush Panel */}
            {firstFlush.reflushRequired && (
              <div className="p-4 bg-amber-950/20 border border-amber-500/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-300 uppercase flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Active Re-Flush Protocol: Cycle #{(firstFlush.reflushCount || 0)}</span>
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">
                    Target: 55°C Deionized Water Circulation
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-mono text-neutral-300 block mb-1">
                      Reason for Re-Flush:
                    </label>
                    <input
                      type="text"
                      value={reflushReasonInput}
                      onChange={(e) => setReflushReasonInput(e.target.value)}
                      placeholder="e.g. Residual foaming observed in sight glass"
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-400 font-sans"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleTriggerReflush(reflushReasonInput)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Start Re-Flush Cycle</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLogReflushCyclePass}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Mark Re-Flush Clear (PASS)</span>
                    </button>
                  </div>
                </div>

                {/* Reflush History List */}
                {firstFlush.reflushHistory && firstFlush.reflushHistory.length > 0 && (
                  <div className="pt-2 border-t border-neutral-800 space-y-1">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase block">
                      Prior Re-Flush Cycles History:
                    </span>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {firstFlush.reflushHistory.map((h, i) => (
                        <div key={i} className="text-[10px] font-mono p-1.5 rounded bg-neutral-900/80 border border-neutral-800 flex justify-between">
                          <span>Cycle #{h.cycleNumber} · {new Date(h.timestamp).toLocaleTimeString()}</span>
                          <span className="text-emerald-400 font-bold">✓ {h.cleanVerdict}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* OIL COOLER RE-DEGREASING & CORE MOISTURE DRYING PROCESS */}
          <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <Wind className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                      Oil Cooler / Core Decontamination Protocol
                    </span>
                    {drying.active && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500 text-neutral-950">
                        DRYING PROCESS ON
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-neutral-100 mt-0.5">
                    Core Moisture Evacuation (Drying Process) Before Re-Degreasing
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleDryingProcess(!drying.active)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono border transition-all cursor-pointer ${
                  drying.active
                    ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-md'
                    : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:border-neutral-500'
                }`}
              >
                {drying.active ? '✓ Drying Process Active' : '+ Activate Drying Process'}
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              If an oil cooler or heat exchanger core contains stubborn burnt oil sludge or carbon residue and requires <strong>more cleaning or re-degreasing in Stage 02</strong>, aqueous DI water moisture must first be purged through forced warm dry air or dry nitrogen blow.
            </p>

            {/* Drying Process Controls */}
            {drying.active && (
              <div className="p-4 bg-neutral-950 border border-amber-500/40 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-mono font-bold text-amber-400 uppercase flex items-center gap-1.5">
                      <Wind className="h-4 w-4" />
                      <span>3-Minute Forced Warm Air / Nitrogen Moisture Purge</span>
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Evacuates internal matrix water droplets so solvent chemical reaction is not diluted.
                    </p>
                  </div>

                  {/* Countdown Timer */}
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-2xl font-black text-amber-300 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl tracking-wider text-center min-w-[90px]">
                      {formatDryingCountdown(dryingRemaining)}
                    </div>

                    <div className="flex items-center gap-1">
                      {!isDryingRunning ? (
                        <button
                          type="button"
                          onClick={handleStartDryingTimer}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>Start Timer</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handlePauseDryingTimer}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Pause className="h-3 w-3" />
                          <span>Pause</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleResetDryingTimer(180)}
                        className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs transition-colors cursor-pointer border border-neutral-700"
                        title="Reset (3 min)"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddDryingSeconds(30)}
                        className="px-2 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono font-bold rounded-xl text-xs transition-colors cursor-pointer border border-neutral-700"
                        title="Add +30s"
                      >
                        +30s
                      </button>
                    </div>
                  </div>
                </div>

                {/* Return to Degreasing Action Button */}
                <div className="pt-3 border-t border-neutral-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-neutral-300">
                    {isDryingDone ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono">
                        <Check className="h-3.5 w-3.5" />
                        <span>Core moisture evacuation complete · Ready for secondary degrease</span>
                      </span>
                    ) : (
                      <span className="text-neutral-400 font-mono text-[11px]">
                        Purge moisture, then return unit to Stage 02 Degreasing.
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleReturnToDegreasing}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Return Unit to Stage 02: Degreasing</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notes field */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg">
            <label className="block text-xs font-bold text-neutral-300 mb-1">
              Technician First Flush Observations &amp; Flow Rig Readiness
            </label>
            <textarea
              rows={2}
              value={firstFlush.notes || ''}
              onChange={(e) => updateFirstFlushField('notes', e.target.value)}
              placeholder="e.g. 55°C deionized water flush executed. Effluent clear in sight glass, zero residual soaping foam. Unit primed for Stage 04 Flow Bench calibration."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-teal-500 placeholder-neutral-600 resize-none font-sans"
            />
          </div>
        </div>
      </div>

      {/* Multi-Circuit Combi Section (if Combi Unit) */}
      {isCombi && (
        <div className="bg-neutral-900 border border-purple-500/30 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-400" />
              <div>
                <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
                  <span>Combi Assembly: Single Unified First Flush</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    SINGLE 55°C FLUSH CYCLE
                  </span>
                </h3>
                <p className="text-xs text-neutral-300 mt-0.5">
                  Directive (N. Malgarotti): Combi units undergo a single, concurrent 55°C Deionized Water flush across all integrated cores ({unit.combiConfig?.unitCount} circuits) simultaneously in one cycle to eradicate all soaping &amp; foaming agents.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-purple-300 bg-purple-950/60 px-2.5 py-1 rounded border border-purple-800/60 shrink-0">
              Unified Single Operation
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(unit.combiConfig?.subUnits || []).map((sub) => {
              const isSelected = firstFlush.selectedSubUnitId === sub.id;
              const isFlushed = (firstFlush.flushedSubUnitIds || []).includes(sub.id);
              return (
                <div 
                  key={sub.id} 
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                    isSelected
                      ? 'border-teal-400 bg-neutral-950 shadow-md ring-1 ring-teal-400/30'
                      : 'border-neutral-800 bg-neutral-950/80 hover:border-neutral-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        CORE {sub.unitIndex}
                      </span>
                      <span className={`text-[11px] font-mono font-bold flex items-center gap-1 ${isFlushed ? 'text-emerald-400' : 'text-neutral-500'}`}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isFlushed ? 'FLUSH VERIFIED' : isSelected ? 'CURRENTLY FLUSHING' : 'READY FOR FLUSH'}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-neutral-100 truncate">{sub.name}</h4>
                    <p className="text-[11px] text-neutral-400 mt-0.5 font-mono">
                      SN: {sub.serialNumber || 'SN-CMB'} &middot; Type: {sub.componentType}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-900 flex items-center justify-between gap-2 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => handleSelectFlushingCore(sub.id)}
                      className={`px-2 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                        isSelected 
                          ? 'bg-teal-500 text-neutral-950 border-teal-300' 
                          : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-teal-500'
                      }`}
                    >
                      {isSelected ? 'Active Rig Circuit' : 'Connect & Flush'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleSubUnitFlushed(sub.id)}
                      className={`px-2 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                        isFlushed 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                      }`}
                    >
                      {isFlushed ? '✓ Verified' : 'Mark Cleared'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Completion Action Bar */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center border ${
            isCompleted 
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
              : 'bg-neutral-800 text-neutral-400 border-neutral-700'
          }`}>
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-neutral-200 block">
              Stage 03 First Flush Sign-Off Status
            </span>
            <span className="text-[11px] text-neutral-400">
              {isCompleted 
                ? `Completed at ${firstFlush.completedAt ? new Date(firstFlush.completedAt).toLocaleTimeString() : 'now'} by ${firstFlush.technician || 'Nicola Malgarotti'}` 
                : 'Ready for sign-off. Ensure 55°C deionized water flush has finished and no soap bubbles remain.'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCompleteAndNext}
          className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-neutral-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
        >
          <span>Confirm &amp; Proceed to Stage 04: Flow Test</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
