import React, { useEffect, useState, useRef } from 'react';
import { 
  Flame, 
  Play, 
  Pause, 
  RotateCcw, 
  Bell, 
  Thermometer, 
  ArrowRight, 
  Plus, 
  ShieldCheck, 
  Sparkles,
  QrCode,
  Clock
} from 'lucide-react';
import { ServiceUnit } from '../../types/process';
import { audioAlert } from '../../utils/audioAlert';
import { StepSopViewer } from '../StepSopModal';
import { formatTimerInHours } from '../../utils/timeFormat';

interface OvenStepProps {
  unit: ServiceUnit;
  onUpdateUnit: (updater: (prev: ServiceUnit) => ServiceUnit, logAction?: string) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onOpenScanner?: () => void;
}

export const OvenStep: React.FC<OvenStepProps> = ({
  unit,
  onUpdateUnit,
  onNextStep,
  onPrevStep,
  onOpenScanner,
}) => {
  const oven = unit.oven;
  const [alertActive, setAlertActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Live timer interval runner with wall-clock timestamp synchronization
  // Ensures timer keeps working accurately even when user changes window or switches tabs
  useEffect(() => {
    if (!oven.isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      document.title = 'Particle Science Tracking System';
      return;
    }

    const checkAndSyncTimer = () => {
      onUpdateUnit((prev) => {
        if (!prev.oven.isRunning) return prev;

        const targetEnd = prev.oven.targetEndTimestamp || (Date.now() + prev.oven.remainingSeconds * 1000);
        const now = Date.now();
        const secondsLeft = Math.max(0, Math.ceil((targetEnd - now) / 1000));

        const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
        const s = (secondsLeft % 60).toString().padStart(2, '0');
        document.title = `(${m}:${s}) Oven Bake · Particle Science`;

        if (secondsLeft <= 0) {
          // Timer finished! Trigger alarm immediately
          audioAlert.playTimerCompleteAlert();
          if ('vibrate' in navigator) {
            navigator.vibrate([300, 200, 300, 200, 500]);
          }
          setAlertActive(true);
          document.title = '✓ Oven Bake Done · Particle Science';

          return {
            ...prev,
            oven: {
              ...prev.oven,
              remainingSeconds: 0,
              isRunning: false,
              timerCompleted: true,
              targetEndTimestamp: undefined,
              completedAt: new Date().toISOString(),
            },
          };
        }

        // Pre-completion warning at 5s
        if (secondsLeft === 5) {
          audioAlert.playWarningBeep();
        }

        return {
          ...prev,
          oven: {
            ...prev.oven,
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
  }, [oven.isRunning, onUpdateUnit]);

  const toggleTimer = () => {
    const nextRunning = !oven.isRunning;
    audioAlert.playClick();
    const now = Date.now();
    const targetEnd = nextRunning ? (now + oven.remainingSeconds * 1000) : undefined;

    onUpdateUnit((prev) => ({
      ...prev,
      oven: {
        ...prev.oven,
        isRunning: nextRunning,
        targetEndTimestamp: targetEnd,
      },
    }), nextRunning ? 'Started Oven bake timer' : 'Paused Oven timer');
  };

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setAlertActive(false);
    document.title = 'Particle Science Tracking System';
    onUpdateUnit((prev) => ({
      ...prev,
      oven: {
        ...prev.oven,
        remainingSeconds: prev.oven.targetSeconds,
        targetEndTimestamp: undefined,
        isRunning: false,
        timerCompleted: false,
      },
    }), 'Reset Oven bake countdown');
  };

  const addTime = (seconds: number) => {
    onUpdateUnit((prev) => {
      const nextRemaining = prev.oven.remainingSeconds + seconds;
      const nextTargetEnd = prev.oven.isRunning ? (Date.now() + nextRemaining * 1000) : undefined;
      return {
        ...prev,
        oven: {
          ...prev.oven,
          remainingSeconds: nextRemaining,
          targetSeconds: Math.max(prev.oven.targetSeconds, nextRemaining),
          targetEndTimestamp: nextTargetEnd,
        },
      };
    }, `Added +${seconds / 60}m to Oven timer`);
  };

  const markCompleted = () => {
    onUpdateUnit((prev) => ({
      ...prev,
      oven: {
        ...prev.oven,
        isRunning: false,
        timerCompleted: true,
        completedAt: new Date().toISOString(),
      },
      currentStepId: 'gilling',
    }), 'Oven thermal soak verified and completed.');
    onNextStep();
  };

  // Format in Hours & HH:MM:SS
  const timerData = formatTimerInHours(oven.remainingSeconds);
  const targetTimerData = formatTimerInHours(oven.targetSeconds);
  const timeFormatted = timerData.hhmmss;

  const progressPercent = oven.targetSeconds > 0 
    ? Math.min(100, Math.max(0, ((oven.targetSeconds - oven.remainingSeconds) / oven.targetSeconds) * 100))
    : 100;

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-rose-400">
              Stage 07
            </span>
            <span className="text-xs text-neutral-500">·</span>
            <span className="text-xs text-neutral-400 font-mono">Thermal Drying & Moisture Bake</span>
          </div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight mt-0.5">
            Oven Thermal Soak & Cure Cycle
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Bake internal passages to evaporate wash solvents and normalize elastomer seals under controlled temperature.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <StepSopViewer stepId="oven" />
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-neutral-700 transition-colors cursor-pointer"
              title="Scan Unit QR / Station Traveler"
            >
              <QrCode className="h-3.5 w-3.5 text-rose-400" />
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
            <span>Confirm Bake & Advance to Fin Straightening</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Completion Alarm Modal / Banner */}
      {alertActive && (
        <div className="p-5 rounded-xl bg-rose-500 border-2 border-rose-300 text-neutral-950 shadow-2xl animate-bounce flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-neutral-950 text-rose-400 flex items-center justify-center">
              <Bell className="h-6 w-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                OVEN BAKE CYCLE COMPLETE! REMOVE UNIT USING THERMAL GLOVES
              </h3>
              <p className="text-xs font-medium text-neutral-900">
                Target heat soak duration elapsed. Transfer unit to workbench for manual fin straightening (100% manual benchwork, zero jigs used).
              </p>
            </div>
          </div>
          <button
            onClick={() => setAlertActive(false)}
            className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs rounded-lg"
          >
            Acknowledge Alert
          </button>
        </div>
      )}

      {/* Countdown Dial Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 lg:p-8">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center space-y-6">
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
                stroke={oven.timerCompleted ? '#10b981' : oven.isRunning ? '#f43f5e' : '#fb923c'}
                strokeWidth="12"
                strokeDasharray={2 * Math.PI * 110}
                strokeDashoffset={(2 * Math.PI * 110) * (1 - progressPercent / 100)}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-500"
              />
            </svg>

            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-rose-400 mb-0.5 flex items-center gap-1">
                <Flame className="h-3 w-3" />
                {oven.isRunning ? 'Thermal Soak Running' : oven.timerCompleted ? 'Bake Completed' : 'Chamber Ready'}
              </span>
              <span className="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-neutral-100 tabular-nums">
                {timeFormatted}
              </span>
              <span className="text-xs font-mono font-bold text-rose-400 mt-1">
                {timerData.decimalHours} ({timerData.shortHours})
              </span>
              <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400 mt-1">
                <span>Target: {targetTimerData.decimalHours} ({Math.floor(oven.targetSeconds / 60)}m)</span>
                <span>·</span>
                <span>Actual: <strong className="text-rose-400">{oven.actualTempC}°C</strong></span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={toggleTimer}
              className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all ${
                oven.isRunning
                  ? 'bg-rose-500 hover:bg-rose-400 text-neutral-950'
                  : 'bg-neutral-100 hover:bg-white text-neutral-950'
              }`}
            >
              {oven.isRunning ? (
                <>
                  <Pause className="h-5 w-5 fill-current" />
                  <span>Pause Oven</span>
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 fill-current" />
                  <span>Start Oven Soak Timer</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={resetTimer}
              className="px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-semibold flex items-center gap-2 border border-neutral-700 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>

            {/* Quick 2 Hours Standard Preset Button */}
            <button
              type="button"
              onClick={() => {
                onUpdateUnit((prev) => ({
                  ...prev,
                  oven: {
                    ...prev.oven,
                    targetSeconds: 7200,
                    remainingSeconds: 7200,
                    isRunning: false,
                    targetEndTimestamp: undefined,
                  },
                }), 'Set Oven bake timer to standard 2 Hours (7200s / 120m)');
              }}
              className="px-4 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-mono font-bold flex items-center gap-1.5 border border-rose-500/40 transition-colors"
              title="Set to Standard 2 Hours Bake Cycle"
            >
              <Clock className="h-3.5 w-3.5 text-rose-400" />
              <span>2.00 Hrs Preset (120m)</span>
            </button>

            <button
              type="button"
              onClick={() => addTime(900)}
              className="px-3.5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono font-semibold flex items-center gap-1 border border-neutral-700 transition-colors"
              title="Add 15 Minutes"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>15m</span>
            </button>

            <button
              type="button"
              onClick={() => addTime(1800)}
              className="px-3.5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono font-semibold flex items-center gap-1 border border-neutral-700 transition-colors"
              title="Add 30 Minutes"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>30m</span>
            </button>
          </div>

          {/* Standard 2 Hours Bakeout Protocol Tag */}
          <div className="pt-2 flex flex-col items-center justify-center gap-1.5">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 font-bold flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-emerald-400" />
              <span>Specification: Particle Science Standard Thermal Bake Profile</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-[11px] font-mono text-rose-300 font-bold flex items-center gap-1.5">
              <Flame className="h-3 w-3" />
              <span>Depot Thermal Soak: Exactly 2 Hours (120 min / 7,200s) at 110°C - 120°C</span>
            </span>
          </div>
        </div>
      </div>

      {/* Temperature & Chamber Log */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
          <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-rose-400" />
            Thermal Chamber Telemetry
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-neutral-400 block mb-1">Target Temp (°C)</label>
              <input
                type="number"
                value={oven.targetTempC}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onUpdateUnit((prev) => ({
                    ...prev,
                    oven: { ...prev.oven, targetTempC: val },
                  }));
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 font-mono text-neutral-200"
              />
            </div>
            <div>
              <label className="text-neutral-400 block mb-1">Thermocouple Probe Reading (°C)</label>
              <input
                type="number"
                step="0.1"
                value={oven.actualTempC}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onUpdateUnit((prev) => ({
                    ...prev,
                    oven: { ...prev.oven, actualTempC: val },
                  }));
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 font-mono text-neutral-200"
              />
            </div>
          </div>
          <div>
            <label className="text-neutral-400 text-xs block mb-1">Chamber Equipment Designation</label>
            <input
              type="text"
              value={oven.parameterValue || 'Thermal Chamber #3'}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateUnit((prev) => ({
                  ...prev,
                  oven: { ...prev.oven, parameterValue: val },
                }));
              }}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 font-mono text-neutral-200 text-xs"
            />
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
          <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Thermal Soak Verification Notes
          </h4>
          <textarea
            rows={3}
            value={oven.notes}
            onChange={(e) => {
              const val = e.target.value;
              onUpdateUnit((prev) => ({
                ...prev,
                oven: { ...prev.oven, notes: val },
              }));
            }}
            placeholder="Log ramp rate, soak uniformness, thermocouple channel #, and post-bake cool down plan..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 font-sans"
          />
        </div>
      </div>
    </div>
  );
};
