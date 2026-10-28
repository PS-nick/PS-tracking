import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  Sparkles, 
  Wind, 
  Gauge, 
  Beaker, 
  Microscope,
  RotateCw, 
  Flame, 
  SlidersHorizontal, 
  Award, 
  Check, 
  Clock,
  ArrowUp,
  Droplets,
  Lock,
  AlertCircle,
  X,
  Minus,
  QrCode
} from 'lucide-react';
import { ServiceUnit, StepId } from '../types/process';
import { StepSopViewer } from './StepSopModal';
import { audioAlert } from '../utils/audioAlert';

interface PipelineNavProps {
  unit: ServiceUnit;
  activeStep: StepId;
  onSelectStep: (stepId: StepId) => void;
  onOpenStageQrModal?: () => void;
}

interface StepMeta {
  id: StepId;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ALL_STEPS: StepMeta[] = [
  { id: 'intake', label: '1. In-Sheet Intake', sublabel: 'Assessment & Config', icon: ClipboardCheck },
  { id: 'degreasing', label: '2. Degreasing', sublabel: 'Room-Temp Flow', icon: Sparkles },
  { id: 'descaling', label: '3. Descaling', sublabel: 'Internal Passages Descale', icon: Beaker },
  { id: 'first_flush', label: '4. First Flush', sublabel: '55°C DI Soaping Flush', icon: Droplets },
  { id: 'flow_test', label: '5. Flow Testing', sublabel: 'Flow Dynamics & ΔP', icon: Wind },
  { id: 'pressure_test', label: '6. Pressure Test', sublabel: 'Bar hold & Pass/Fail', icon: Gauge },
  { id: 'cleaning', label: '7. Ultra Fine RIG', sublabel: '5-200μm Specs & Microscope', icon: Microscope },
  { id: 'final_flush', label: '8. Final Flush', sublabel: 'Timed Flush & Alert', icon: RotateCw },
  { id: 'oven', label: '9. Oven Bake', sublabel: 'Customer Standard (2h @ 120°C)', icon: Flame },
  { id: 'gilling', label: '10. Fin Straightening', sublabel: 'Manual Hand Job (No Jigs)', icon: SlidersHorizontal },
  { id: 'sign_off', label: '11. Sign-Off', sublabel: 'Photos & Stamp', icon: Award },
];

export const PipelineNav: React.FC<PipelineNavProps> = ({
  unit,
  activeStep,
  onSelectStep,
  onOpenStageQrModal,
}) => {
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const isIntercooler = unit.componentType === 'intercooler' || unit.intake?.componentType === 'intercooler';

  // Determine whether a step is REQUIRED per the intake sheet configuration
  const isStepRequired = (stepId: StepId): boolean => {
    switch (stepId) {
      case 'intake':
        return true;
      case 'degreasing':
        return unit.processConfig?.degreasingRequired !== false && unit.degreasing?.skipped !== true;
      case 'descaling':
        return unit.processConfig?.descalingRequired !== false && unit.descaling?.skipped !== true;
      case 'first_flush':
        return unit.processConfig?.firstFlushRequired !== false;
      case 'flow_test':
        return !isIntercooler && unit.processConfig?.flowTestRequired !== false && !unit.flowTest?.isExempt;
      case 'pressure_test':
        return unit.processConfig?.pressureTestRequired !== false;
      case 'cleaning':
        return unit.processConfig?.cleaningRequired !== false && unit.cleaning?.skipped !== true;
      case 'final_flush':
        return unit.processConfig?.finalFlushRequired !== false;
      case 'oven':
        return unit.processConfig?.ovenRequired !== false;
      case 'gilling':
        return unit.processConfig?.gillingRequired !== false;
      case 'sign_off':
        return true;
      default:
        return true;
    }
  };

  // Determine completion of steps strictly: only truly completed steps are ticked!
  const isStepCompleted = (stepId: StepId): boolean => {
    switch (stepId) {
      case 'intake':
        return !!unit.intake?.completedAt;
      case 'degreasing':
        return !!unit.degreasing?.completedAt || unit.degreasing?.skipped === true || unit.processConfig?.degreasingRequired === false;
      case 'descaling':
        return !!unit.descaling?.completedAt || unit.descaling?.skipped === true || unit.processConfig?.descalingRequired === false;
      case 'first_flush':
        return !!unit.firstFlush?.completedAt || unit.processConfig?.firstFlushRequired === false;
      case 'flow_test':
        return !!unit.flowTest?.completedAt || unit.flowTest?.isExempt === true || unit.processConfig?.flowTestRequired === false;
      case 'pressure_test':
        return (unit.pressureTest?.testResult === 'PASS' || !!unit.pressureTest?.completedAt) || unit.processConfig?.pressureTestRequired === false;
      case 'cleaning':
        return !!unit.cleaning?.completedAt || unit.cleaning?.skipped === true || unit.processConfig?.cleaningRequired === false;
      case 'final_flush':
        return !!unit.finalFlush?.completedAt || unit.processConfig?.finalFlushRequired === false;
      case 'oven':
        return !!unit.oven?.completedAt || unit.processConfig?.ovenRequired === false;
      case 'gilling':
        return !!unit.gilling?.completedAt || unit.processConfig?.gillingRequired === false;
      case 'sign_off':
        return !!unit.signOff?.completedAt || unit.overallStatus === 'completed';
      default:
        return false;
    }
  };

  const isStepSkipped = (stepId: StepId): boolean => {
    return !isStepRequired(stepId);
  };

  // Check if target step is accessible (cannot jump ahead over incomplete required steps)
  // Check if target step is accessible (strictly cannot navigate or scroll over tabs unless previous stage is completed)
  const isStepAccessible = (targetStepId: StepId): boolean => {
    if (targetStepId === activeStep) return true;

    const targetIndex = ALL_STEPS.findIndex((s) => s.id === targetStepId);
    if (targetIndex < 0) return false;
    if (targetIndex === 0) return true; // Intake stage is always accessible for review

    // Check all prior steps: if ANY prior required step is not completed, tab is locked!
    for (let i = 0; i < targetIndex; i++) {
      const priorStep = ALL_STEPS[i];
      if (isStepRequired(priorStep.id) && !isStepCompleted(priorStep.id)) {
        return false;
      }
    }
    return true;
  };

  const handleStepClick = (stepId: StepId) => {
    if (!isStepAccessible(stepId)) {
      const targetIndex = ALL_STEPS.findIndex((s) => s.id === stepId);
      const targetMeta = ALL_STEPS.find((s) => s.id === stepId);
      const blockingStep = ALL_STEPS.slice(0, targetIndex).find(
        (s) => isStepRequired(s.id) && !isStepCompleted(s.id)
      );
      audioAlert.playWarning();
      setWarningMessage(
        `Stage Locked: Cannot open "${targetMeta?.label || stepId}". You cannot scroll or navigate across tabs until the previous stage "${blockingStep?.label || 'Preceding Stage'}" is completed and verified.`
      );
      return;
    }
    setWarningMessage(null);
    onSelectStep(stepId);
  };

  // Compute overall percentage based on required stages
  const requiredCount = ALL_STEPS.filter((s) => isStepRequired(s.id)).length;
  const completedCount = ALL_STEPS.filter((s) => isStepCompleted(s.id)).length;
  const progressPercent = requiredCount > 0 ? Math.min(100, Math.round((completedCount / requiredCount) * 100)) : 0;

  // Helper to format in hours and mm:ss
  const formatTime = (seconds: number) => {
    const s = Math.max(0, seconds || 0);
    const hrs = (s / 3600).toFixed(2);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${hrs}h (${mins}:${secs < 10 ? '0' : ''}${secs})`;
  };

  return (
    <div className="bg-neutral-900 border-b border-neutral-800 px-3 sm:px-4 lg:px-8 py-2.5 sm:py-3 no-print">
      <div className="max-w-7xl mx-auto">
        {/* Warning banner when skipping is blocked */}
        {warningMessage && (
          <div className="mb-2.5 p-2.5 bg-rose-950/80 border border-rose-500/60 rounded-xl flex items-center justify-between text-xs text-rose-200 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span className="font-medium">{warningMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setWarningMessage(null)}
              className="p-1 hover:bg-rose-900 rounded text-rose-300 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Progress summary header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 sm:mb-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-neutral-400">
              SOP Process Pipeline
            </span>
            <span className="text-xs text-neutral-600">·</span>
            <span className="text-[11px] sm:text-xs font-mono text-neutral-300">
              {completedCount} of {requiredCount} required stages completed
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Step SOP Trigger */}
            <StepSopViewer stepId={activeStep} />

            {/* Stage Station QR Placards Trigger */}
            {onOpenStageQrModal && (
              <button
                type="button"
                onClick={onOpenStageQrModal}
                className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-400 border border-neutral-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="View & Print Process Stage Station QR Placards (All 11 Stations)"
              >
                <QrCode className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden sm:inline">Station QRs</span>
              </button>
            )}

            <div className="w-24 sm:w-36 md:w-48 h-1.5 sm:h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-neutral-200 tabular-nums">
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* Step Navigation Ribbon */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 max-w-full scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
          {ALL_STEPS.map((step) => {
            const isActive = activeStep === step.id;
            const completed = isStepCompleted(step.id);
            const isRequired = isStepRequired(step.id);
            const isSkipped = isStepSkipped(step.id);
            const accessible = isStepAccessible(step.id);
            const Icon = step.icon;

            // Timer badges
            let timerBadge = null;
            if (step.id === 'final_flush' && unit.finalFlush.isRunning) {
              timerBadge = (
                <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 animate-pulse">
                  <Clock className="h-2.5 w-2.5" />
                  {formatTime(unit.finalFlush.remainingSeconds)}
                </span>
              );
            } else if (step.id === 'oven' && unit.oven.isRunning) {
              timerBadge = (
                <span className="flex items-center gap-1 text-[10px] font-mono text-rose-400 animate-pulse">
                  <Clock className="h-2.5 w-2.5" />
                  {formatTime(unit.oven.remainingSeconds)}
                </span>
              );
            }

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleStepClick(step.id)}
                aria-disabled={!accessible}
                title={
                  !accessible
                    ? `Locked: Stage cannot be accessed until previous stage is completed`
                    : isSkipped
                    ? `Skipped in Intake Sheet`
                    : completed
                    ? `Completed & Verified`
                    : isActive
                    ? `Current Active Stage`
                    : `Click to view ${step.label}`
                }
                className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-left transition-all border shrink-0 min-w-[125px] sm:min-w-[140px] ${
                  isActive
                    ? 'bg-neutral-800/90 border-amber-500/80 shadow-sm text-neutral-100 ring-1 ring-amber-500/30 cursor-pointer'
                    : !accessible
                    ? 'bg-neutral-950/30 border-neutral-800/40 text-neutral-600 opacity-45 cursor-not-allowed select-none hover:border-neutral-800'
                    : completed
                    ? 'bg-neutral-950/60 border-emerald-900/40 text-neutral-300 hover:bg-neutral-800/40 cursor-pointer'
                    : isSkipped
                    ? 'bg-neutral-950/40 border-neutral-800/60 text-neutral-500 hover:border-neutral-700 cursor-pointer'
                    : 'bg-neutral-950/40 border-neutral-800 text-neutral-400 hover:bg-neutral-800/30 cursor-pointer'
                }`}
              >
                <div
                  className={`h-6 w-6 sm:h-7 sm:w-7 rounded-md flex items-center justify-center shrink-0 border ${
                    !accessible
                      ? 'bg-neutral-950 border-neutral-800/50 text-neutral-600'
                      : completed
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : isActive
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                      : isSkipped
                      ? 'bg-neutral-950 border-neutral-800 text-neutral-500'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                  }`}
                >
                  {!accessible ? (
                    <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-neutral-600" />
                  ) : completed ? (
                    <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[3]" />
                  ) : isSkipped ? (
                    <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-neutral-500" />
                  ) : (
                    <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  )}
                </div>

                <div className="flex flex-col min-w-0 pr-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] sm:text-xs font-semibold tracking-tight truncate">
                      {step.label}
                    </span>
                    {!accessible && (
                      <span className="text-[9px] font-mono text-neutral-500" title="Locked by previous stage requirement">
                        🔒
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-neutral-400 truncate">
                    {!accessible ? (
                      <span className="text-neutral-500 text-[10px] font-medium flex items-center gap-0.5">
                        <Lock className="h-2.5 w-2.5 shrink-0" /> Locked (Complete Previous)
                      </span>
                    ) : isSkipped ? (
                      <span className="text-neutral-500 italic">
                        {step.id === 'flow_test' && isIntercooler ? 'Exempt (Air Core)' : 'Skipped in Intake'}
                      </span>
                    ) : completed ? (
                      <span className="text-emerald-400 font-medium">Completed</span>
                    ) : timerBadge ? (
                      timerBadge
                    ) : (
                      <span>{step.sublabel}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
