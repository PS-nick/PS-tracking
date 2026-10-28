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
  Plus, 
  ShieldCheck, 
  Droplets,
  QrCode 
} from 'lucide-react';
import { ServiceUnit } from '../../types/process';
import { audioAlert } from '../../utils/audioAlert';
import { StepSopViewer } from '../StepSopModal';
import { formatTimerInHours } from '../../utils/timeFormat';

interface FinalFlushStepProps {
  unit: ServiceUnit;
  onUpdateUnit: (updater: (prev: ServiceUnit) => ServiceUnit, logAction?: string) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onOpenScanner?: () => void;
}

export const FinalFlushStep: React.FC<FinalFlushStepProps> = ({
  unit,
  onUpdateUnit,
  onNextStep,
  onPrevStep,
  onOpenScanner,
}) => {
  const flush = unit.finalFlush;
  const [alertActive, setAlertActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Live timer interval runner with wall-clock timestamp synchronization
  // Ensures timer keeps working accurately even when user changes window or switches tabs
  useEffect(() => {
    if (!flush.isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      document.title = 'Particle Science Tracking System';
      return;
    }

    const checkAndSyncTimer = () => {
      onUpdateUnit((prev) => {
        if (!prev.finalFlush.isRunning) return prev;

        const targetEnd = prev.finalFlush.targetEndTimestamp || (Date.now() + prev.finalFlush.remainingSeconds * 1000);
        const now = Date.now();
        const secondsLeft = Math.max(0, Math.ceil((targetEnd - now) / 1000));

        const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
        const s = (secondsLeft % 60).toString().padStart(2, '0');
        document.title = `(${m}:${s}) Final Flush · Particle Science`;

        if (secondsLeft <= 0) {
          // Timer completed countdown! Sound alarm, but DO NOT auto-complete the step
          audioAlert.playTimerCompleteAlert();
          if ('vibrate' in navigator) {
            navigator.vibrate([300, 200, 300, 200, 500]);
          }
          setAlertActive(true);
          document.title = '✓ Final Flush Timer Elapsed · Awaiting Sign-Off';

          return {
            ...prev,
            finalFlush: {
              ...prev.finalFlush,
              remainingSeconds: 0,
              isRunning: false,
              timerCompleted: true,
              targetEndTimestamp: undefined,
              // DO NOT auto-complete: flush requires manual technician sign-off
            },
          };
        }

        // Pre-completion warning at 5s
        if (secondsLeft === 5) {
          audioAlert.playWarningBeep();
        }

        return {
          ...prev,
          finalFlush: {
            ...prev.finalFlush,
            remainingSeconds: secondsLeft,
            targetEndTimestamp: targetEnd,
          },
        };
      });
    };

    // Run interval every 500ms for smooth UI updates
    timerRef.current = setInterval(checkAndSyncTimer, 500);

    // Cross-window and tab visibility event handlers
    const handleVisibilityOrFocus = () => {
      checkAndSyncTimer();
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('pageshow', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('pageshow', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      document.title = 'Particle Science Tracking System';
    };
  }, [flush.isRunning, onUpdateUnit]);

  const toggleTimer = () => {
    const nextRunning = !flush.isRunning;
    audioAlert.playClick();
    const now = Date.now();
    const targetEnd = nextRunning ? (now + flush.remainingSeconds * 1000) : undefined;

    onUpdateUnit((prev) => ({
      ...prev,
      finalFlush: {
        ...prev.finalFlush,
        isRunning: nextRunning,
        targetEndTimestamp: targetEnd,
      },
    }), nextRunning ? 'Started Final Flush countdown timer' : 'Paused Final Flush timer');
  };

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setAlertActive(false);
    document.title = 'Particle Science Tracking System';
    onUpdateUnit((prev) => ({
      ...prev,
      finalFlush: {
        ...prev.finalFlush,
        remainingSeconds: prev.finalFlush.targetSeconds,
        targetEndTimestamp: undefined,
        isRunning: false,
        timerCompleted: false,
      },
    }), 'Reset Final Flush timer to target duration');
  };

  const addTime = (seconds: number) => {
    onUpdateUnit((prev) => {
      const nextRemaining = prev.finalFlush.remainingSeconds + seconds;
      const nextTargetEnd = prev.finalFlush.isRunning ? (Date.now() + nextRemaining * 1000) : undefined;
      return {
        ...prev,
        finalFlush: {
          ...prev.finalFlush,
          remainingSeconds: nextRemaining,
          targetSeconds: Math.max(prev.finalFlush.targetSeconds, nextRemaining),
          targetEndTimestamp: nextTargetEnd,
        },
      };
    }, `Added +${seconds / 60}m to Final Flush timer`);
  };

  const dismissAlert = () => {
    setAlertActive(false);
  };

  const markCompleted = () => {
    onUpdateUnit((prev) => ({
      ...prev,
      finalFlush: {
        ...prev.finalFlush,
        isRunning: false,
        timerCompleted: true,
        completedAt: new Date().toISOString(),
      },
      currentStepId: 'oven',
    }), 'Final flush verified and completed.');
    onNextStep();
  };

  // Format in Hours & HH:MM:SS
  const timerData = formatTimerInHours(flush.remainingSeconds);
  const targetTimerData = formatTimerInHours(flush.targetSeconds);
  const timeFormatted = timerData.hhmmss;

  // Percentage for progress ring
  const progressPercent = flush.targetSeconds > 0 
    ? Math.min(100, Math.max(0, ((flush.targetSeconds - flush.remainingSeconds) / flush.targetSeconds) * 100))
    : 100;

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400">
              Stage 06
            </span>
            <span className="text-xs text-neutral-500">·</span>
            <span className="text-xs text-neutral-400 font-mono">Timed Micron Filtration Flush</span>
          </div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight mt-0.5">
            Final Flush Cycle & Timed Countdown
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Recirculate filtered calibration fluid through internal orifices with audible alert upon cycle completion.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <StepSopViewer stepId="final_flush" />
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
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg"
          >
            ← Previous
          </button>
          <button
            onClick={markCompleted}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2"
          >
            <span>Confirm Flush & Advance to Oven</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Completion Alarm Modal / Banner */}
      {alertActive && (
        <div className="p-5 rounded-xl bg-amber-500 border-2 border-amber-300 text-neutral-950 shadow-2xl animate-bounce flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-neutral-950 text-amber-400 flex items-center justify-center">
              <Bell className="h-6 w-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                FLUSH CYCLE COMPLETE! SHUT OFF HYDRAULIC PUMP
              </h3>
              <p className="text-xs font-medium text-neutral-900">
                The timed final flush period has reached zero. Disconnect rinse line and cap ports immediately.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={dismissAlert}
              className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs rounded-lg"
            >
              Acknowledge Alert
            </button>
          </div>
        </div>
      )}

      {/* Main Countdown Display Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 lg:p-8">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center space-y-6">
          {/* Circular / Dial Visual */}
          <div className="relative flex items-center justify-center w-64 h-64">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke="#1c1f26"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke={flush.timerCompleted ? '#10b981' : flush.isRunning ? '#f59e0b' : '#38bdf8'}
                strokeWidth="12"
                strokeDasharray={2 * Math.PI * 110}
                strokeDashoffset={(2 * Math.PI * 110) * (1 - progressPercent / 100)}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-500"
              />
            </svg>

            {/* Center Digital Readout */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">
                {flush.isRunning ? 'Active Countdown' : flush.timerCompleted ? 'Flush Complete' : 'Paused / Ready'}
              </span>
              <span className="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-neutral-100 tabular-nums">
                {timeFormatted}
              </span>
              <span className="text-xs font-mono font-bold text-amber-400 mt-1">
                {timerData.decimalHours} ({timerData.shortHours})
              </span>
              <span className="text-[11px] font-mono text-neutral-500 mt-1">
                Target: {targetTimerData.decimalHours} ({Math.floor(flush.targetSeconds / 60)}:00 min)
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={toggleTimer}
              className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all ${
                flush.isRunning
                  ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950'
                  : 'bg-neutral-100 hover:bg-white text-neutral-950'
              }`}
            >
              {flush.isRunning ? (
                <>
                  <Pause className="h-5 w-5 fill-current" />
                  <span>Pause Timer</span>
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 fill-current" />
                  <span>Start Flush Countdown</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={resetTimer}
              className="px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-semibold flex items-center gap-2 border border-neutral-700 transition-colors"
              title="Reset Timer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={() => addTime(60)}
              className="px-3.5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono font-semibold flex items-center gap-1 border border-neutral-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>1m</span>
            </button>

            <button
              type="button"
              onClick={() => addTime(300)}
              className="px-3.5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono font-semibold flex items-center gap-1 border border-neutral-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>5m</span>
            </button>
          </div>

          {/* Alert Preview Reminder */}
          <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
            <Bell className="h-3.5 w-3.5 text-amber-400" />
            <span>Audible buzzer alert sounds automatically when countdown hits 00:00</span>
          </div>
        </div>
      </div>

      {/* Flush Fluid & Station Specs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
          <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
            <Droplets className="h-4 w-4 text-sky-400" />
            Flush Fluid & Filter Specifications
          </h4>
          <div className="space-y-3 text-xs">
            <div>
              <label className="text-neutral-400 block mb-1">Rinse Fluid Type</label>
              <input
                type="text"
                value={flush.parameterValue || 'AeroShell Fluid 41 · 3μm Inline Filter'}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateUnit((prev) => ({
                    ...prev,
                    finalFlush: { ...prev.finalFlush, parameterValue: val },
                  }));
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 font-mono text-neutral-200"
              />
            </div>
            <div>
              <label className="text-neutral-400 block mb-1">Inline Filtration Micron Rating</label>
              <input
                type="text"
                defaultValue="3-Micron Absolute (Beta Ratio >= 200)"
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 font-mono text-neutral-200"
              />
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
          <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Flush Verification Notes
          </h4>
          <textarea
            rows={3}
            value={flush.notes}
            onChange={(e) => {
              const val = e.target.value;
              onUpdateUnit((prev) => ({
                ...prev,
                finalFlush: { ...prev.finalFlush, notes: val },
              }));
            }}
            placeholder="Record post-flush visual appearance, effervescence, or oil sample collection bottle number..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 font-sans"
          />
        </div>
      </div>
    </div>
  );
};
