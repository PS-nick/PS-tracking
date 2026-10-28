import React, { useState, useEffect, useRef } from 'react';
import { 
  SlidersHorizontal, 
  ArrowRight, 
  CheckCircle2, 
  Check, 
  QrCode, 
  Hand, 
  Sparkles, 
  ShieldCheck, 
  Camera, 
  Trash2, 
  AlertCircle,
  FileCheck,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Timer,
  Clock
} from 'lucide-react';
import { ServiceUnit, MediaItem } from '../../types/process';
import { audioAlert } from '../../utils/audioAlert';
import { StepSopViewer } from '../StepSopModal';
import { readFileAsDataUrl, createMediaItem, generateTechnicalSchematicSvg } from '../../utils/media';

interface GillingStepProps {
  unit: ServiceUnit;
  onUpdateUnit: (updater: (prev: ServiceUnit) => ServiceUnit, logAction?: string) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onOpenScanner?: () => void;
}

export const GillingStep: React.FC<GillingStepProps> = ({
  unit,
  onUpdateUnit,
  onNextStep,
  onPrevStep,
  onOpenScanner,
}) => {
  const gilling = unit.gilling;
  const isCompleted = !!gilling.completedAt;

  // Up-Timer (Stopwatch) state derived from unit.gilling
  const elapsedSeconds = gilling.elapsedSeconds ?? 0;
  const targetSeconds = gilling.targetSeconds || 420;
  const isRunning = Boolean(gilling.isRunning);
  const isTargetReached = elapsedSeconds >= targetSeconds;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('5');
  const [timeAdjustMessage, setTimeAdjustMessage] = useState<string | null>(null);

  // Live Up-Timer runner with wall-clock timestamp synchronization
  // Ensures timer counts up accurately even when user switches tabs or minimizes window
  useEffect(() => {
    if (!gilling.isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const checkAndSyncTimer = () => {
      onUpdateUnit((prev) => {
        if (!prev.gilling?.isRunning) return prev;

        const currentElapsed = prev.gilling.elapsedSeconds ?? 0;
        const startedAt = prev.gilling.startedAtTimestamp || (Date.now() - currentElapsed * 1000);
        const now = Date.now();
        const actualElapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
        const target = prev.gilling.targetSeconds || 420;
        const nextRemaining = Math.max(0, target - actualElapsed);
        const wasCompleted = prev.gilling.timerCompleted;
        const justReachedTarget = actualElapsed >= target && !wasCompleted;

        if (justReachedTarget) {
          audioAlert.playTimerCompleteAlert();
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200, 100, 400]);
          }
        }

        const m = Math.floor(actualElapsed / 60).toString().padStart(2, '0');
        const s = (actualElapsed % 60).toString().padStart(2, '0');
        document.title = `(${m}:${s}) Fin Straightening · Particle Science`;

        return {
          ...prev,
          gilling: {
            ...prev.gilling,
            elapsedSeconds: actualElapsed,
            remainingSeconds: nextRemaining,
            startedAtTimestamp: startedAt,
            timerCompleted: actualElapsed >= target || wasCompleted,
          },
        };
      });
    };

    // Run interval every 500ms for crisp UI ticking
    timerRef.current = setInterval(checkAndSyncTimer, 500);

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
  }, [gilling.isRunning, onUpdateUnit]);

  const toggleTimer = () => {
    const nextRunning = !isRunning;
    audioAlert.playClick();
    const now = Date.now();
    const startedAt = nextRunning ? (now - elapsedSeconds * 1000) : undefined;

    onUpdateUnit((prev) => ({
      ...prev,
      gilling: {
        ...prev.gilling,
        isRunning: nextRunning,
        startedAtTimestamp: startedAt,
      },
    }), nextRunning ? 'Started Fin Straightening count-up timer' : 'Paused Fin Straightening up-timer');
  };

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    audioAlert.playClick();
    document.title = 'Particle Science Tracking System';
    onUpdateUnit((prev) => ({
      ...prev,
      gilling: {
        ...prev.gilling,
        elapsedSeconds: 0,
        remainingSeconds: prev.gilling.targetSeconds || 420,
        startedAtTimestamp: undefined,
        isRunning: false,
        timerCompleted: false,
      },
    }), 'Reset Fin Straightening timer to 00:00');
    setTimeAdjustMessage('Timer reset to 00:00');
    setTimeout(() => setTimeAdjustMessage(null), 3000);
  };

  const setElapsedSecondsDirect = (sec: number) => {
    audioAlert.playClick();
    const now = Date.now();
    const startedAt = isRunning ? (now - sec * 1000) : undefined;
    onUpdateUnit((prev) => ({
      ...prev,
      gilling: {
        ...prev.gilling,
        elapsedSeconds: sec,
        remainingSeconds: Math.max(0, (prev.gilling.targetSeconds || 420) - sec),
        startedAtTimestamp: startedAt,
        timerCompleted: sec >= (prev.gilling.targetSeconds || 420),
      },
    }), `Set Fin Straightening elapsed bench time to ${Math.round(sec / 60)} minutes`);
    setTimeAdjustMessage(`Benchwork time set to ${Math.round(sec / 60)} min`);
    setTimeout(() => setTimeAdjustMessage(null), 3000);
  };

  const handleAddPresetTime = (extraSeconds: number) => {
    audioAlert.playClick();
    const extraMins = Math.round(extraSeconds / 60);
    onUpdateUnit((prev) => {
      const nextTarget = (prev.gilling.targetSeconds || 420) + extraSeconds;
      const nextElapsed = (prev.gilling.elapsedSeconds ?? 0) + extraSeconds;
      const now = Date.now();
      const nextStartedAt = prev.gilling.isRunning ? (now - nextElapsed * 1000) : prev.gilling.startedAtTimestamp;
      return {
        ...prev,
        gilling: {
          ...prev.gilling,
          targetSeconds: nextTarget,
          elapsedSeconds: nextElapsed,
          remainingSeconds: Math.max(0, nextTarget - nextElapsed),
          startedAtTimestamp: nextStartedAt,
        },
      };
    }, `Added +${extraMins} min extra time to Fin Straightening`);
    setTimeAdjustMessage(`Added +${extraMins}m to target & logged bench time`);
    setTimeout(() => setTimeAdjustMessage(null), 3000);
  };

  const handleAddCustomExtraTime = (mode: 'target' | 'elapsed') => {
    const mins = parseFloat(customMinutesInput);
    if (isNaN(mins) || mins <= 0) return;
    const extraSeconds = Math.round(mins * 60);
    audioAlert.playClick();

    onUpdateUnit((prev) => {
      const currentTarget = prev.gilling.targetSeconds || 420;
      const currentElapsed = prev.gilling.elapsedSeconds ?? 0;
      const now = Date.now();

      if (mode === 'target') {
        const nextTarget = currentTarget + extraSeconds;
        return {
          ...prev,
          gilling: {
            ...prev.gilling,
            targetSeconds: nextTarget,
            remainingSeconds: Math.max(0, nextTarget - currentElapsed),
          },
        };
      } else {
        const nextElapsed = currentElapsed + extraSeconds;
        const nextStartedAt = prev.gilling.isRunning ? (now - nextElapsed * 1000) : prev.gilling.startedAtTimestamp;
        return {
          ...prev,
          gilling: {
            ...prev.gilling,
            elapsedSeconds: nextElapsed,
            remainingSeconds: Math.max(0, currentTarget - nextElapsed),
            startedAtTimestamp: nextStartedAt,
            timerCompleted: nextElapsed >= currentTarget,
          },
        };
      }
    }, mode === 'target' 
      ? `Extended Fin Straightening target benchmark by +${mins} min` 
      : `Logged +${mins} min custom offline benchwork time`);

    setTimeAdjustMessage(mode === 'target' 
      ? `Target benchmark extended by +${mins} min` 
      : `Credited +${mins} min to elapsed work timer`);
    setTimeout(() => setTimeAdjustMessage(null), 3500);
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Local state for quality checklist
  const [checklist, setChecklist] = useState({
    manualToolsOnly: true,
    finPitchUniform: true,
    laminarChannelsOpen: true,
    noTubeDamage: true,
    surfaceClean: true,
    leadingEdgesAligned: true,
  });

  const [technicianName, setTechnicianName] = useState(gilling.technician || unit.intake.technician || 'Nicola Malgarotti');
  const [observations, setObservations] = useState(gilling.notes || '');

  const toggleChecklistItem = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    audioAlert.playClick();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const newMedia = createMediaItem(
          file.name,
          'image',
          dataUrl,
          'gilling',
          `Manual fin straightening verification evidence: ${file.name}`
        );

        onUpdateUnit((prev) => ({
          ...prev,
          signOff: {
            ...prev.signOff,
            pictures: [...(prev.signOff?.pictures || []), newMedia],
          },
        }), `Uploaded fin dressing photo evidence: ${file.name}`);
      } catch (err) {
        console.error('Failed to read image file:', err);
      }
    }
  };

  const handleAddSamplePhoto = () => {
    const sampleUrl = generateTechnicalSchematicSvg(
      'Fin Alignment Macro Inspection',
      '100% Hand Dressed · 16 FPI Pitch Restored · 0 Tube Seam Stress',
      '#06b6d4'
    );
    const media = createMediaItem(
      'Fin_Pitch_Macro_Check.svg',
      'image',
      sampleUrl,
      'gilling',
      'Macro optical verification of hand-dressed matrix fins'
    );

    onUpdateUnit((prev) => ({
      ...prev,
      signOff: {
        ...prev.signOff,
        pictures: [...(prev.signOff?.pictures || []), media],
      },
    }), 'Added fin alignment verification macro image');
  };

  const handleRemovePhoto = (photoId: string) => {
    onUpdateUnit((prev) => ({
      ...prev,
      signOff: {
        ...prev.signOff,
        pictures: (prev.signOff?.pictures || []).filter((p) => p.id !== photoId),
      },
    }), 'Removed fin straightening photo');
  };

  const markCompleted = () => {
    const now = new Date().toISOString();
    const finalElapsed = elapsedSeconds > 0 ? elapsedSeconds : (gilling.targetSeconds || 420);

    onUpdateUnit((prev) => ({
      ...prev,
      gilling: {
        ...prev.gilling,
        completedAt: now,
        isRunning: false,
        timerCompleted: true,
        elapsedSeconds: finalElapsed,
        technician: technicianName,
        notes: observations || '100% manual bench craftsmanship straightening of distorted cooling matrix fins verified. Zero mechanical comb jigs used.',
      },
      currentStepId: 'sign_off',
    }), `Manual fin straightening certified & verified (100% Hand Craftsmanship · Zero Jigs Used). Logged ${formatTime(finalElapsed)} benchwork duration.`);
    
    audioAlert.playTimerCompleteAlert();
    onNextStep();
  };

  // Filter pictures attached to gilling
  const gillingPhotos = (unit.signOff?.pictures || []).filter((p) => p.stage === 'gilling');

  const allChecksPassed = Object.values(checklist).every(Boolean);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400">
              Stage 09
            </span>
            <span className="text-xs text-neutral-500">·</span>
            <span className="text-xs text-neutral-400 font-mono">Matrix Fin Straightening &amp; Core Dressing</span>
            <span className="text-xs text-neutral-500">·</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 font-bold">
              <Hand className="h-3 w-3" />
              100% Manual Craft (No Jigs Used)
            </span>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
                <CheckCircle2 className="h-3 w-3" />
                Certified Conforming
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight mt-1">
            Manual Fin Straightening
          </h2>
          <p className="text-sm text-neutral-300 mt-0.5">
            Hand realignment of distorted cooling matrix fins using fine-pitch fin combs and manual craftsmanship. <strong>We do not use any jig for it — it is exclusively a manual hand job.</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <StepSopViewer stepId="gilling" />
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-neutral-700 transition-colors cursor-pointer"
              title="Scan Unit QR"
            >
              <QrCode className="h-3.5 w-3.5 text-cyan-400" />
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
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <span>Certify Fin Straightening &amp; Proceed to Sign-Off</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Craftsmanship Standard Protocol Banner */}
      <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3.5 text-xs">
        <div className="h-9 w-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
          <Hand className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-emerald-200 uppercase font-mono tracking-wider text-[11px]">
              Technician Standard (PS-FIN-01): 100% Manual Bench Operation (Zero Jigs Used)
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-mono text-[10px] font-bold">
              NO JIGS USED — 100% MANUAL JOB
            </span>
          </div>
          <p className="text-neutral-200 leading-relaxed text-[11.5px]">
            Fin straightening on high-performance motorsport and aerospace matrices is executed exclusively by hand using fine-pitch handheld combs and tweezers. Mechanical comb dragging jigs and clamping fixtures are strictly prohibited to prevent micro-scoring of brazed tube seams and crushing of thin-gauge core cooling channels.
          </p>
        </div>
      </div>

      {/* UP TIMER: Manual Benchwork Duration Tracker (Stopwatch) & Custom Extra Time */}
      <div className="bg-neutral-900 border border-cyan-500/30 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider font-mono">
                  Manual Benchwork Up-Timer (Stopwatch)
                </h3>
                {isRunning ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    RUNNING · COUNTING UP
                  </span>
                ) : elapsedSeconds > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    PAUSED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-800 text-neutral-400">
                    READY
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Real-time count-up tracking of active bench craftsmanship duration. Time logged feeds directly into the Master Conformance Certificate.
              </p>
            </div>
          </div>

          {/* Quick Target / Completion Badge */}
          <div className="flex items-center gap-2">
            {isTargetReached && (
              <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Target Benchmark Reached
              </span>
            )}
          </div>
        </div>

        {/* Digital Counter & Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Big Digital Display */}
          <div className="md:col-span-5 bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider font-semibold">
              Elapsed Manual Work Time
            </span>
            <div className={`text-4xl sm:text-5xl font-mono font-black tracking-tight my-1 ${
              isRunning ? 'text-cyan-400' : isTargetReached ? 'text-emerald-400' : 'text-neutral-100'
            }`}>
              {formatTime(elapsedSeconds)}
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 mt-0.5">
              <span>Target: <strong className="text-neutral-200">{formatTime(targetSeconds)}</strong></span>
              <span>·</span>
              <span>Logged: <strong className="text-cyan-300">{(elapsedSeconds / 3600).toFixed(2)} hrs</strong></span>
            </div>
          </div>

          {/* Timer Controls & Benchmark Info */}
          <div className="md:col-span-7 space-y-3">
            {/* Action Buttons: Play/Pause, Reset */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={toggleTimer}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                  isRunning
                    ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="h-4 w-4" />
                    <span>Pause Bench Timer</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    <span>{elapsedSeconds > 0 ? 'Resume Up-Timer' : 'Start Up-Timer'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={resetTimer}
                disabled={isRunning}
                className="px-3.5 py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-neutral-700 cursor-pointer"
                title="Reset elapsed bench time to 00:00"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset (00:00)</span>
              </button>

              <button
                type="button"
                onClick={() => setElapsedSecondsDirect(targetSeconds)}
                className="px-3.5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-neutral-700 cursor-pointer"
                title="Set elapsed time to full target"
              >
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>Set to Target ({Math.round(targetSeconds / 60)}m)</span>
              </button>
            </div>

            {/* Target Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-neutral-400">
                  Target Progress: {Math.min(100, Math.round((elapsedSeconds / targetSeconds) * 100))}%
                </span>
                <span className="text-neutral-400">
                  {elapsedSeconds >= targetSeconds ? (
                    <span className="text-emerald-400 font-bold">
                      + Overtime: {formatTime(elapsedSeconds - targetSeconds)}
                    </span>
                  ) : (
                    <span>
                      {formatTime(Math.max(0, targetSeconds - elapsedSeconds))} to target
                    </span>
                  )}
                </span>
              </div>
              <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                <div 
                  className={`h-full transition-all duration-300 rounded-full ${
                    elapsedSeconds >= targetSeconds ? 'bg-gradient-to-r from-cyan-500 to-emerald-400' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${Math.min(100, (elapsedSeconds / targetSeconds) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Add Extra Time Section: Quick Presets + Custom Extra Time */}
        <div className="pt-3 border-t border-neutral-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold text-neutral-200 uppercase font-mono tracking-wider">
                Add Extra Time to Fin Straightening
              </span>
            </div>
            {timeAdjustMessage && (
              <span className="text-xs font-mono text-cyan-300 animate-fadeIn">
                {timeAdjustMessage}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-neutral-400 font-medium mr-1">Quick Add:</span>
              {[
                { label: '+1m', sec: 60 },
                { label: '+3m', sec: 180 },
                { label: '+5m', sec: 300 },
                { label: '+10m', sec: 600 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleAddPresetTime(p.sec)}
                  className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 hover:border-cyan-500/40 text-neutral-200 font-mono text-xs font-semibold rounded-lg border border-neutral-700 transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-neutral-800 hidden sm:block" />

            {/* Custom Extra Time Input */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-neutral-400 font-medium">Custom Minutes:</span>
              <div className="flex items-center">
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={customMinutesInput}
                  onChange={(e) => setCustomMinutesInput(e.target.value)}
                  className="w-20 bg-neutral-950 border border-neutral-700 rounded-l-lg px-2.5 py-1.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. 5"
                />
                <span className="bg-neutral-800 border-y border-r border-neutral-700 px-2 py-1.5 text-xs text-neutral-400 rounded-r-lg font-mono">
                  min
                </span>
              </div>

              {/* Action 1: Add to Target */}
              <button
                type="button"
                onClick={() => handleAddCustomExtraTime('target')}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-cyan-950 hover:border-cyan-500/50 text-cyan-300 font-semibold text-xs rounded-lg border border-neutral-700 transition-colors cursor-pointer flex items-center gap-1"
                title="Extend the target work benchmark for heavy matrix damage"
              >
                <Plus className="h-3 w-3" />
                <span>Extend Target (+{customMinutesInput || 0}m)</span>
              </button>

              {/* Action 2: Add to Elapsed Work Time */}
              <button
                type="button"
                onClick={() => handleAddCustomExtraTime('elapsed')}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                title="Log extra offline manual craftsmanship time to the live timer"
              >
                <Plus className="h-3 w-3" />
                <span>Add to Work Timer (+{customMinutesInput || 0}m)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Quality Verification Checklist & Matrix Spec */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card: Fin Straightening Craftsmanship Checklist */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">
                  Quality Conformance Criteria
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                allChecksPassed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {allChecksPassed ? 'All 6 Criteria Met' : 'Inspection In Progress'}
              </span>
            </div>

            <div className="space-y-2.5">
              {[
                { key: 'manualToolsOnly', label: '100% Manual Hand Tools Only', desc: 'No mechanical jigs, slide combs, or automated clamping fixtures used.' },
                { key: 'finPitchUniform', label: 'Uniform Matrix Fin Pitch Restored', desc: 'Fin louvers and folds aligned uniformly across the entire active core area.' },
                { key: 'laminarChannelsOpen', label: 'Aerodynamic Laminar Airflow Channels Open', desc: 'Zero blockages or flattened fins obstructing airflow through matrix passages.' },
                { key: 'noTubeDamage', label: 'Zero Cooling Tube Seam Stress', desc: 'Brazed tube-to-fin joints inspected under magnification for zero cracking or distortion.' },
                { key: 'leadingEdgesAligned', label: 'Leading & Trailing Edge Alignment', desc: 'Edge profiles dressed to conform with OEM aerodynamic packaging boundaries.' },
                { key: 'surfaceClean', label: 'Core Face Cleaned of Debris & Swarf', desc: 'Soft-bristle brush applied to evacuate all loose particulates post-straightening.' },
              ].map((item) => {
                const checked = checklist[item.key as keyof typeof checklist];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleChecklistItem(item.key as keyof typeof checklist)}
                    className={`w-full p-3 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      checked
                        ? 'bg-neutral-950/80 border-cyan-500/40 text-neutral-200'
                        : 'bg-neutral-950/40 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className={`mt-0.5 h-4 w-4 rounded flex items-center justify-center shrink-0 border ${
                      checked
                        ? 'bg-cyan-500 border-cyan-400 text-neutral-950'
                        : 'bg-neutral-900 border-neutral-700 text-transparent'
                    }`}>
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                    <div className="min-w-0">
                      <span className={`text-xs font-semibold block ${checked ? 'text-neutral-100' : 'text-neutral-300'}`}>
                        {item.label}
                      </span>
                      <span className="text-[11px] text-neutral-400 block mt-0.5 leading-relaxed">
                        {item.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card: Manual Craftsmanship & Hand Tooling Observations */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
                <Hand className="h-4 w-4 text-cyan-400" />
                Manual Craftsmanship Dressing &amp; Observations
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                ZERO JIG PROTOCOL
              </span>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3 text-xs">
              <span className="text-neutral-300 font-medium">Straightening Tooling Verified:</span>
              <span className="font-mono text-emerald-400 font-bold">Fine Hand Comb &amp; Micro-Tweezers (100% Hand Job)</span>
            </div>

            <div>
              <label className="text-neutral-300 block font-medium mb-1 text-xs">
                Craftsmanship Observations &amp; Technician Notes
              </label>
              <textarea
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Log matrix core condition, impacted stone-strike repairs, or quadrant pitch notes..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-neutral-100 focus:outline-none focus:border-cyan-500 font-sans leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Photo Evidence & Final Verification Stamp */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card: Photo Evidence */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">
                  Matrix Photo Documentation
                </h3>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">
                {gillingPhotos.length} Secured
              </span>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Capture high-resolution macro pictures of the core matrix showing front and rear face fin alignment after hand dressing.
            </p>

            {/* Photo Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <label className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs">
                <Camera className="h-3.5 w-3.5" />
                <span>Upload Matrix Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleAddSamplePhoto}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg flex items-center gap-1 border border-neutral-700 cursor-pointer transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span>Add Macro Schematic</span>
              </button>
            </div>

            {/* Photo Gallery Grid */}
            {gillingPhotos.length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                {gillingPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950 aspect-4/3 flex items-center justify-center"
                  >
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-neutral-950/70 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between text-left">
                      <span className="text-[10px] text-neutral-200 truncate font-mono">
                        {photo.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo.id)}
                        className="p-1 bg-rose-500/80 hover:bg-rose-500 text-white rounded self-end cursor-pointer transition-colors"
                        title="Remove photo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 border border-dashed border-neutral-800 rounded-xl text-center space-y-1 bg-neutral-950/40">
                <Camera className="h-6 w-6 text-neutral-600 mx-auto" />
                <span className="text-xs text-neutral-400 block font-medium">No fin pictures attached yet</span>
                <span className="text-[10px] text-neutral-500 block">Upload pictures of dressed matrix faces before final sign-off</span>
              </div>
            )}
          </div>

          {/* Card: Technician Sign-Off & Disposition */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-emerald-400" />
              Craftsmanship Certification Stamp
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-300 block font-medium mb-1">
                  Responsible Craftsman / Technician
                </label>
                <input
                  type="text"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-1">
                <span className="text-[11px] text-neutral-400 block">Quality Disposition:</span>
                <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs font-mono">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  VERIFIED CONFORMING · 100% HAND CRAFT
                </span>
                <span className="text-[10px] text-neutral-500 block">
                  Matrix fins straightened without jigs per Depot SOP § 9.1
                </span>
              </div>

              <button
                type="button"
                onClick={markCompleted}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                <span>Certify Fin Straightening &amp; Complete Stage 09</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FinStraighteningStep = GillingStep;
