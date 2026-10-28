import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Sparkles, 
  Camera, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Thermometer, 
  Clock, 
  FlaskConical, 
  ArrowRight,
  RotateCcw,
  Play,
  Pause,
  Bell,
  Droplets,
  Layers,
  AlertTriangle,
  Check,
  Wind,
  ShieldCheck,
  ChevronRight,
  QrCode,
  FileText
} from 'lucide-react';
import { ServiceUnit, MediaItem, OilDrainData, PreFlushData, PortFlushRecord, StepId } from '../../types/process';
import { readFileAsDataUrl, createMediaItem, generateTechnicalSchematicSvg } from '../../utils/media';
import { StepSopViewer } from '../StepSopModal';
import { getDefaultOilDrainData, getDefaultPreFlushData } from '../../utils/storage';
import { formatTimerInHours } from '../../utils/timeFormat';
import { audioAlert } from '../../utils/audioAlert';
import { subscribeToTimerTicker } from '../../utils/timerWorker';

interface DegreasingStepProps {
  unit: ServiceUnit;
  onUpdateUnit: (updater: (prev: ServiceUnit) => ServiceUnit, logAction?: string) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onOpenScanner?: () => void;
}

export const DegreasingStep: React.FC<DegreasingStepProps> = ({
  unit,
  onUpdateUnit,
  onNextStep,
  onPrevStep,
  onOpenScanner,
}) => {
  const compType = unit.componentType || unit.intake?.componentType || 'heat_exchanger';
  const isOilCooler = compType === 'oil_cooler';
  const isIntercooler = compType === 'intercooler';
  const isWaterRadiator = compType === 'water_radiator';

  // Fallback defaults if missing
  const degrease = unit.degreasing;
  const oilDrain: OilDrainData = degrease.oilDraining || getDefaultOilDrainData(compType);

  const [activeTab, setActiveTab] = useState<'all' | 'oil_drain' | 'degrease'>('all');
  const [photoCaption, setPhotoCaption] = useState('');

  // --- Persistent Timer States for Phase 1: Oil Draining ---
  const drainTotalSeconds = oilDrain.targetSeconds ?? 900;
  const isDrainRunning = Boolean(oilDrain.isRunning);
  const drainRemainingSecs = useMemo(() => {
    if (oilDrain.isRunning && oilDrain.targetEndTimestamp) {
      return Math.max(0, Math.ceil((oilDrain.targetEndTimestamp - Date.now()) / 1000));
    }
    return oilDrain.remainingSeconds ?? drainTotalSeconds;
  }, [oilDrain.isRunning, oilDrain.targetEndTimestamp, oilDrain.remainingSeconds, drainTotalSeconds]);

  // --- Persistent Timer States for Phase 2: Degrease Bath / Flow-Through Soak ---
  const soakTotalSeconds = (degrease.soakDurationMinutes || 25) * 60;
  const soakTimerData = degrease.soakTimer || {
    targetSeconds: soakTotalSeconds,
    remainingSeconds: soakTotalSeconds,
    isRunning: false,
    timerCompleted: false,
  };
  const isSoakRunning = Boolean(soakTimerData.isRunning);
  const soakRemainingSecs = useMemo(() => {
    if (soakTimerData.isRunning && soakTimerData.targetEndTimestamp) {
      return Math.max(0, Math.ceil((soakTimerData.targetEndTimestamp - Date.now()) / 1000));
    }
    return soakTimerData.remainingSeconds ?? soakTotalSeconds;
  }, [soakTimerData.isRunning, soakTimerData.targetEndTimestamp, soakTimerData.remainingSeconds, soakTotalSeconds]);

  // Background Unthrottled Ticker: keeps UI updating smoothly even if tab is inactive
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isDrainRunning && !isSoakRunning) return;
    const unsubscribe = subscribeToTimerTicker(() => {
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, [isDrainRunning, isSoakRunning]);

  // Timer controls for Oil Draining
  const handleToggleDrain = () => {
    const nextRunning = !isDrainRunning;
    const rem = drainRemainingSecs > 0 ? drainRemainingSecs : 900;
    onUpdateUnit((prev) => ({
      ...prev,
      degreasing: {
        ...prev.degreasing,
        oilDraining: {
          ...(prev.degreasing?.oilDraining || getDefaultOilDrainData(compType)),
          isRunning: nextRunning,
          targetEndTimestamp: nextRunning ? (Date.now() + rem * 1000) : undefined,
          remainingSeconds: rem,
        },
      },
    }), nextRunning ? 'Started oil draining dwell timer' : 'Paused oil draining dwell timer');
  };

  const handleResetDrain = () => {
    onUpdateUnit((prev) => ({
      ...prev,
      degreasing: {
        ...prev.degreasing,
        oilDraining: {
          ...(prev.degreasing?.oilDraining || getDefaultOilDrainData(compType)),
          isRunning: false,
          targetEndTimestamp: undefined,
          remainingSeconds: 900,
          timerCompleted: false,
        },
      },
    }), 'Reset oil draining dwell timer');
  };

  // Timer controls for Degrease Bath Soak (never stops when leaving tab)
  const handleToggleSoak = () => {
    const nextRunning = !isSoakRunning;
    const rem = soakRemainingSecs > 0 ? soakRemainingSecs : soakTotalSeconds;
    onUpdateUnit((prev) => ({
      ...prev,
      degreasing: {
        ...prev.degreasing,
        soakTimer: {
          targetSeconds: soakTotalSeconds,
          remainingSeconds: rem,
          isRunning: nextRunning,
          targetEndTimestamp: nextRunning ? (Date.now() + rem * 1000) : undefined,
          timerCompleted: false,
        },
      },
    }), nextRunning ? 'Started degrease bath / solvent flow timer' : 'Paused degrease bath timer');
  };

  const handleResetSoak = () => {
    onUpdateUnit((prev) => ({
      ...prev,
      degreasing: {
        ...prev.degreasing,
        soakTimer: {
          targetSeconds: soakTotalSeconds,
          remainingSeconds: soakTotalSeconds,
          isRunning: false,
          targetEndTimestamp: undefined,
          timerCompleted: false,
        },
      },
    }), 'Reset degrease bath soak timer');
  };

  // Updaters
  const updateDegrease = (key: string, value: unknown, logMessage?: string) => {
    onUpdateUnit((prev) => ({
      ...prev,
      degreasing: {
        ...prev.degreasing,
        [key]: value,
      },
    }), logMessage);
  };

  const updateOilDrain = (key: keyof OilDrainData, value: unknown, logMessage?: string) => {
    onUpdateUnit((prev) => {
      const current = prev.degreasing.oilDraining || getDefaultOilDrainData(compType);
      return {
        ...prev,
        degreasing: {
          ...prev.degreasing,
          oilDraining: {
            ...current,
            [key]: value,
          },
        },
      };
    }, logMessage);
  };

  const handleToggleSkip = () => {
    const nextSkipped = !degrease.skipped;
    onUpdateUnit((prev) => ({
      ...prev,
      degreasing: {
        ...prev.degreasing,
        skipped: nextSkipped,
        completedAt: nextSkipped ? new Date().toISOString() : undefined,
      },
      processConfig: {
        ...prev.processConfig,
        degreasingRequired: !nextSkipped,
      },
    }), nextSkipped ? 'Degreasing stage SKIPPED per unit cleanliness' : 'Degreasing stage ENABLED as REQUIRED');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const newItem = createMediaItem(
          file.name,
          'image',
          dataUrl,
          'degreasing',
          photoCaption || 'Post-degrease visual check'
        );
        onUpdateUnit((prev) => ({
          ...prev,
          degreasing: {
            ...prev.degreasing,
            photos: [...prev.degreasing.photos, newItem],
          },
        }), `Uploaded degreasing verification photo: ${file.name}`);
      } catch (err) {
        console.error(err);
      }
    }
    setPhotoCaption('');
    e.target.value = '';
  };

  const handleSimulatePhoto = () => {
    const svgUrl = generateTechnicalSchematicSvg(
      'Clean Degreased Substrate',
      `${unit.serialNumber} · 0 Hydrocarbon residue · Clean Pass`,
      '#10b981'
    );
    const item = createMediaItem(
      `Degrease_Check_${Date.now()}.svg`,
      'image',
      svgUrl,
      'degreasing',
      'Post-wash metallic inspection & hydrocarbon strip verification'
    );
    onUpdateUnit((prev) => ({
      ...prev,
      degreasing: {
        ...prev.degreasing,
        photos: [...prev.degreasing.photos, item],
      },
    }), 'Captured degreasing verification photo');
  };

  const markCompleted = () => {
    const isDescalingNeeded = unit.processConfig?.cleaningRequired !== false && 
      unit.processConfig?.descalingRequired !== false && 
      !unit.cleaning?.skipped;
    const nextStepId: StepId = isDescalingNeeded ? 'cleaning' : 'first_flush';

    onUpdateUnit((prev) => ({
      ...prev,
      degreasing: {
        ...prev.degreasing,
        completedAt: new Date().toISOString(),
        degreasingMethod: 'room_temp_flow_through',
        isImmersionTank: false,
        bathTempC: prev.degreasing.bathTempC || 21.0,
        oilDraining: {
          ...(prev.degreasing.oilDraining || getDefaultOilDrainData(compType)),
          performed: true,
          completedAt: prev.degreasing.oilDraining?.completedAt || new Date().toISOString(),
        },
      },
      currentStepId: nextStepId,
    }), `Stage 02 complete: Oil Draining & Room-Temperature Degreaser Flow-Through verified. Proceeding to ${nextStepId.toUpperCase()}.`);
    (onNextStep as any)(nextStepId, 'degreasing');
  };

  // Timer formatted strings in HOURS
  const drainTimer = formatTimerInHours(drainRemainingSecs);
  const soakTimer = formatTimerInHours(soakRemainingSecs);

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400">
              Stage 02
            </span>
            <span className="text-xs text-neutral-500">·</span>
            <span className="text-xs text-neutral-400 font-mono">
              Oil Draining · Room-Temp Flow-Through Degreaser (No Immersion)
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Ambient RT ~20-22°C
            </span>
          </div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight mt-0.5">
            Stage 02: Oil Evacuation &amp; Room-Temp Flow-Through Degreaser
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Mandatory sequence: 1. Evacuate residual oil (15m scavenge) &rarr; 2. Circulate room-temperature degreaser through internal core matrix (no tank immersion) &rarr; Proceed to Stage 03: First Flush (55&deg;C Deionized Water).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <StepSopViewer stepId="degreasing" />
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
            &larr; Intake
          </button>
          <button
            onClick={markCompleted}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <span>Complete &amp; Proceed to Stage 03 First Flush</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Primary Workflow Mode Tabs: With Degreasing vs Without Degreasing */}
      <div className="bg-neutral-950 p-2 rounded-2xl border border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-2 shadow-sm">
        <button
          type="button"
          onClick={() => {
            onUpdateUnit((prev) => ({
              ...prev,
              degreasing: {
                ...prev.degreasing,
                degreasingMode: 'with_degreasing',
                skipped: false,
              },
            }), 'Switched Stage 02 to: With Degreasing Protocol');
          }}
          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
            (!degrease.skipped && degrease.degreasingMode !== 'without_degreasing')
              ? 'bg-amber-500/15 border-amber-500/80 text-white shadow-md ring-1 ring-amber-500/50'
              : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <div className="h-9 w-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-sm text-neutral-100 flex items-center gap-2">
                <span>Tab 1 · With Degreasing Protocol</span>
              </span>
              {(!degrease.skipped && degrease.degreasingMode !== 'without_degreasing') && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500 text-neutral-950 shadow-xs">
                  CURRENT SELECTION
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
              Standard Protocol: Oil Evacuation (15m) &rarr; Room-Temp Degreaser Flow-Through (Ambient 20-22°C - No Immersion) &rarr; Next: Stage 03 First Flush (55°C DI Water)
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            if (unit.processConfig?.degreasingRequired !== false) {
              alert('Cannot bypass: Degreasing is marked as REQUIRED in the Intake Sheet (IN-SHT-REV4) and cannot be skipped during the overhaul process.');
              return;
            }
            onUpdateUnit((prev) => ({
              ...prev,
              degreasing: {
                ...prev.degreasing,
                degreasingMode: 'without_degreasing',
                skipped: true,
              },
            }), 'Switched Stage 02 to: Without Degreasing Protocol');
          }}
          disabled={unit.processConfig?.degreasingRequired !== false}
          className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
            unit.processConfig?.degreasingRequired !== false
              ? 'opacity-50 cursor-not-allowed bg-neutral-950/40 border-neutral-800 text-neutral-500'
              : (degrease.skipped || degrease.degreasingMode === 'without_degreasing')
              ? 'bg-sky-500/15 border-sky-500/80 text-white shadow-md ring-1 ring-sky-500/50 cursor-pointer'
              : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 cursor-pointer'
          }`}
        >
          <div className="h-9 w-9 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
            <Wind className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-sm text-neutral-100 flex items-center gap-2">
                <span>Tab 2 · Without Degreasing Protocol</span>
                {unit.processConfig?.degreasingRequired !== false && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-neutral-800 text-neutral-400 border border-neutral-700">
                    LOCKED BY INTAKE SHEET
                  </span>
                )}
              </span>
              {(degrease.skipped || degrease.degreasingMode === 'without_degreasing') && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500 text-neutral-950 shadow-xs">
                  CURRENT SELECTION
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
              Direct Wash / Clean Bypass: Residual Scavenge (15m) &rarr; Bypass Degreaser &rarr; Direct to Stage 03 First Flush (55°C DI Water)
            </p>
          </div>
        </button>
      </div>

      {/* TAB 2 CONTENT: WITHOUT DEGREASING PROTOCOL */}
      {(degrease.skipped || degrease.degreasingMode === 'without_degreasing') ? (
        <div className="space-y-6">
          {/* Without Degreasing Context Banner */}
          <div className="p-4 rounded-xl border bg-sky-950/30 border-sky-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Wind className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-sky-200">
                    Stage 02B · Protocol Without Chemical Solvent Wash
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                    CHEMICAL SOLVENT BYPASSED
                  </span>
                </div>
                <p className="text-xs text-neutral-300 mt-1 max-w-2xl leading-relaxed">
                  Used for components arriving clean, rapid race-to-race turnaround, factory pre-cleaned parts, or sensitive matrix assemblies. We use chemical solvent (zero caustic); residual oil evacuation is completed, and unit proceeds directly to Stage 03 First Flush (55°C Deionized Water).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onUpdateUnit((prev) => ({
                  ...prev,
                  degreasing: {
                    ...prev.degreasing,
                    degreasingMode: 'with_degreasing',
                    skipped: false,
                  },
                }), 'Switched back to With Degreasing Protocol');
              }}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-lg shrink-0 transition-colors"
            >
              Switch to With Degreasing
            </button>
          </div>

          {/* Without Degreasing Reason & Protocol Parameters */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
              <ShieldCheck className="h-4 w-4 text-sky-400" />
              <h4 className="text-xs font-bold text-neutral-200 uppercase font-mono tracking-wider">
                Without-Degrease Protocol Configuration &amp; Justification
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">
                  Reason for Bypassing Chemical Bath *
                </label>
                <select
                  value={degrease.withoutDegreaseData?.reason || 'Clean Unit / Post-Race Turnaround'}
                  onChange={(e) => {
                    const r = e.target.value;
                    onUpdateUnit((prev) => ({
                      ...prev,
                      degreasing: {
                        ...prev.degreasing,
                        withoutDegreaseData: {
                          ...(prev.degreasing.withoutDegreaseData || {
                            washMethod: 'direct_preflush',
                            residualFluidChecked: true,
                            surfacePass: true,
                            bypassChemicalBath: true,
                            technician: 'N. Malgarotti',
                          }),
                          reason: r,
                        },
                      },
                    }));
                  }}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-neutral-200 font-mono text-xs focus:border-sky-400"
                >
                  <option value="Clean Unit / Post-Race Turnaround">Clean Unit / Post-Race Turnaround</option>
                  <option value="Sensitive Core Matrix / No Chemical Soak Permitted">Sensitive Core Matrix / No Chemical Soak Permitted</option>
                  <option value="Rapid In-Season Turnaround - Clean Race Matrix">Rapid In-Season Turnaround - Clean Race Matrix</option>
                  <option value="Factory Pre-Cleaned Assembly">Factory Pre-Cleaned Assembly</option>
                  <option value="Auxiliary Pure Water Core - No Hydrocarbon Exposure">Auxiliary Pure Water Core - No Hydrocarbon Exposure</option>
                </select>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">
                  Alternative Cleaning / Flush Method *
                </label>
                <select
                  value={degrease.withoutDegreaseData?.washMethod || 'direct_preflush'}
                  onChange={(e) => {
                    const m = e.target.value as any;
                    onUpdateUnit((prev) => ({
                      ...prev,
                      degreasing: {
                        ...prev.degreasing,
                        withoutDegreaseData: {
                          ...(prev.degreasing.withoutDegreaseData || {
                            reason: 'Clean Unit / Post-Race Turnaround',
                            residualFluidChecked: true,
                            surfacePass: true,
                            bypassChemicalBath: true,
                            technician: 'N. Malgarotti',
                          }),
                          washMethod: m,
                        },
                      },
                    }));
                  }}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-neutral-200 font-mono text-xs focus:border-sky-400"
                >
                  <option value="direct_to_first_flush">Proceed Directly to Stage 03 First Flush (55°C DI Water)</option>
                  <option value="flow_dynamics_only">Direct Flow Dynamics Circulation Only</option>
                  <option value="deionized_hot_water_only">Deionized Hot Water Jet Rinse Only</option>
                  <option value="dry_wipe_scavenge">Dry Vacuum Scavenge &amp; Port Wipe</option>
                </select>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">
                  Responsible Technician *
                </label>
                <input
                  type="text"
                  value={degrease.withoutDegreaseData?.technician || degrease.technician || 'N. Malgarotti'}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateUnit((prev) => ({
                      ...prev,
                      degreasing: {
                        ...prev.degreasing,
                        withoutDegreaseData: {
                          ...(prev.degreasing.withoutDegreaseData || {
                            washMethod: 'direct_preflush',
                            reason: 'Clean Unit / Post-Race Turnaround',
                            residualFluidChecked: true,
                            surfacePass: true,
                            bypassChemicalBath: true,
                          }),
                          technician: val,
                        },
                      },
                    }));
                  }}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-neutral-200 font-mono text-xs focus:border-sky-400"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={degrease.withoutDegreaseData?.residualFluidChecked ?? true}
                  onChange={(e) => {
                    const chk = e.target.checked;
                    onUpdateUnit((prev) => ({
                      ...prev,
                      degreasing: {
                        ...prev.degreasing,
                        withoutDegreaseData: {
                          ...(prev.degreasing.withoutDegreaseData || {
                            washMethod: 'direct_preflush',
                            reason: 'Clean Unit / Post-Race Turnaround',
                            surfacePass: true,
                            bypassChemicalBath: true,
                            technician: 'N. Malgarotti',
                          }),
                          residualFluidChecked: chk,
                        },
                      },
                    }));
                  }}
                  className="rounded bg-neutral-950 border-neutral-700 text-sky-500 focus:ring-0"
                />
                <span className="text-neutral-300">Residual Port Fluid Scavenge Inspected &amp; Cleared</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={degrease.withoutDegreaseData?.surfacePass ?? true}
                  onChange={(e) => {
                    const chk = e.target.checked;
                    onUpdateUnit((prev) => ({
                      ...prev,
                      degreasing: {
                        ...prev.degreasing,
                        withoutDegreaseData: {
                          ...(prev.degreasing.withoutDegreaseData || {
                            washMethod: 'direct_preflush',
                            reason: 'Clean Unit / Post-Race Turnaround',
                            residualFluidChecked: true,
                            bypassChemicalBath: true,
                            technician: 'N. Malgarotti',
                          }),
                          surfacePass: chk,
                        },
                      },
                    }));
                  }}
                  className="rounded bg-neutral-950 border-neutral-700 text-sky-500 focus:ring-0"
                />
                <span className="text-neutral-300">Exterior Fin &amp; Core Visual Cleanliness Accepted</span>
              </label>
            </div>

            {/* Without-Degrease Complete Action Bar */}
            <div className="pt-3 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h5 className="text-xs font-bold text-sky-200 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-sky-400" />
                  <span>Without-Degrease Stage Protocol Complete</span>
                </h5>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Confirms chemical solvent wash was bypassed (zero caustic used). Ready for immediate downstream flow and pressure calibration.
                </p>
              </div>

              <button
                type="button"
                onClick={markCompleted}
                className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-neutral-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 shadow-md cursor-pointer hover:scale-[1.01]"
              >
                <span>Sign Off Without Degreasing &amp; Advance</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* TAB 1 CONTENT: WITH DEGREASING (OR SHARED SUB-PHASES) */}

      {!degrease.skipped && (
        <div className="space-y-6">
          {/* Phase Navigation Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-neutral-950/80 p-1.5 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`p-2 rounded-lg text-xs font-mono font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-neutral-800 text-white shadow-xs border border-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span>Both Phases (No Flushing)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('oil_drain')}
              className={`p-2 rounded-lg text-xs font-mono transition-all text-left flex items-center justify-between cursor-pointer border ${
                activeTab === 'oil_drain'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200 border-transparent'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                <span className="truncate">1. Oil Draining (15m)</span>
              </div>
              {oilDrain.performed && (
                <span className="text-[10px] px-1.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  DONE
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('degrease')}
              className={`p-2 rounded-lg text-xs font-mono transition-all text-left flex items-center justify-between cursor-pointer border ${
                activeTab === 'degrease'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200 border-transparent'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="h-2 w-2 rounded-full bg-sky-400 shrink-0" />
                <span className="truncate">2. Room-Temp Degreaser</span>
              </div>
              {degrease.visualCleanlinessPass && (
                <span className="text-[10px] px-1.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  PASS
                </span>
              )}
            </button>
          </div>

          {/* ========================================================================= */}
          {/* PHASE 1: OIL DRAINING (BEFORE DEGREASING)                                */}
          {/* ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'oil_drain') && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Droplets className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                        Phase 01 · Prior to Chemical Bath
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        Compulsory Oil Evacuation
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-neutral-100 mt-0.5">
                      Oil Draining & Matrix Scavenge (Before Degreasing)
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const isNowDry = oilDrain.oilCondition !== 'dry_no_residue';
                      if (isNowDry) {
                        onUpdateUnit((prev) => ({
                          ...prev,
                          degreasing: {
                            ...prev.degreasing,
                            oilDraining: {
                              ...(prev.degreasing?.oilDraining || getDefaultOilDrainData(compType)),
                              oilCondition: 'dry_no_residue',
                              performed: true,
                              timerCompleted: true,
                              remainingSeconds: 0,
                              isRunning: false,
                              targetEndTimestamp: undefined,
                            },
                          },
                        }), 'Unit received dry: Draining dwell timer bypassed.');
                      } else {
                        onUpdateUnit((prev) => ({
                          ...prev,
                          degreasing: {
                            ...prev.degreasing,
                            oilDraining: {
                              ...(prev.degreasing?.oilDraining || getDefaultOilDrainData(compType)),
                              oilCondition: 'dark_used',
                              timerCompleted: false,
                              remainingSeconds: 900,
                              isRunning: false,
                              targetEndTimestamp: undefined,
                            },
                          },
                        }), 'Unit marked for standard oil draining dwell.');
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                      oilDrain.oilCondition === 'dry_no_residue'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40 font-bold'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'
                    }`}
                    title="Toggle Dry Core: no draining timer is needed"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{oilDrain.oilCondition === 'dry_no_residue' ? '✓ Received Dry (No Timer Needed)' : 'Mark Dry (No Timer Needed)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateOilDrain('performed', !oilDrain.performed, 'Toggled oil drain completion')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                      oilDrain.performed
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{oilDrain.performed ? 'Oil Drained & Verified' : 'Mark Oil Drained'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Drain Parameters */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-neutral-300 block font-medium mb-1">
                        Drain Bay / Station ID
                      </label>
                      <input
                        type="text"
                        value={oilDrain.stationId || 'DRAIN-BAY-01'}
                        onChange={(e) => updateOilDrain('stationId', e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-neutral-300 block font-medium mb-1">
                        Evacuation Method
                      </label>
                      <select
                        value={oilDrain.method || 'vacuum_scavenge'}
                        onChange={(e) => updateOilDrain('method', e.target.value as any)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-xs font-sans text-neutral-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="vacuum_scavenge">Pneumatic Vacuum Scavenge</option>
                        <option value="gravity_drip">Inverted Gravity Drain Rack</option>
                        <option value="pneumatic_purge">Low-Pressure Air / N2 Purge</option>
                      </select>
                    </div>
                  </div>

                  {/* Oil Condition & Contamination Verdict */}
                  <div className="p-3.5 bg-neutral-950/80 rounded-xl border border-neutral-800 space-y-2">
                    <label className="text-neutral-200 block text-xs font-bold uppercase tracking-wider">
                      Drained Fluid Condition & Debris Check:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                      {[
                        { id: 'clean', label: 'Golden / Clean Oil', desc: 'Minimal soot' },
                        { id: 'dark_used', label: 'Dark Used Oil', desc: 'Standard track soot' },
                        { id: 'heavy_sludge', label: 'Heavy Sludge', desc: 'Viscous varnish' },
                        { id: 'metal_particles', label: 'Metal Shavings!', desc: 'CRITICAL ALERT', alert: true },
                        { id: 'dry_no_residue', label: 'Dry (Zero Oil)', desc: 'Pre-drained / Air (No timer needed)' },
                      ].map((item) => {
                        const isSel = (oilDrain.oilCondition || 'dark_used') === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              if (item.id === 'dry_no_residue') {
                                updateOilDrain('oilCondition', 'dry_no_residue');
                                updateOilDrain('performed', true);
                                updateOilDrain('timerCompleted', true);
                                updateOilDrain('isRunning', false);
                              } else {
                                updateOilDrain('oilCondition', item.id as any);
                              }
                            }}
                            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                              isSel
                                ? item.alert
                                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                                  : 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                            }`}
                          >
                            <span className="block text-xs leading-tight">{item.label}</span>
                            <span className="text-[10px] opacity-75 font-mono block mt-0.5">{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>

                    {oilDrain.oilCondition === 'metal_particles' && (
                      <div className="p-2.5 bg-rose-500/15 border border-rose-500/40 rounded-lg flex items-center gap-2 text-rose-300 text-xs">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>Warning: Metal shavings detected! Tag unit for detailed particle spectrometry in cleaning stage.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Drain Timer in HOURS - Hidden/Bypassed if core is Dry */}
                {oilDrain.oilCondition === 'dry_no_residue' ? (
                  <div className="lg:col-span-5 bg-emerald-950/30 p-5 rounded-xl border border-emerald-500/40 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-sm">
                      <CheckCircle2 className="h-7 w-7" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-300 uppercase tracking-wide">
                        Dry Core Confirmed (Zero Oil)
                      </h4>
                      <p className="text-xs text-neutral-300 mt-1 max-w-xs">
                        Pre-drained core verified with zero residual fluid ingress. Draining dwell stage is bypassed.
                      </p>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30">
                      ✓ No Dwell Timer Needed · Stage Bypassed
                    </div>
                  </div>
                ) : (
                  <div className="lg:col-span-5 bg-neutral-950 p-4 sm:p-5 rounded-xl border border-neutral-800 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 uppercase font-bold">
                      <Clock className="h-4 w-4 text-amber-400" />
                      <span>Oil Drain Dwell Timer (In Hours)</span>
                    </div>

                    <div className="space-y-0.5">
                      {/* Big Digital Readout in HH:MM:SS */}
                      <div className="text-3xl sm:text-4xl font-mono font-bold text-neutral-100 tracking-tight tabular-nums">
                        {drainTimer.hhmmss}
                      </div>
                      {/* Explicit Decimal Hours Display */}
                      <div className="text-sm font-mono font-bold text-amber-400">
                        {drainTimer.decimalHours} ({drainTimer.shortHours})
                      </div>
                      <div className="text-[11px] font-mono text-neutral-400">
                        Target: 0.25 hrs (15:00 min)
                      </div>
                    </div>

                    {/* Drain Controls */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleToggleDrain}
                        className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isDrainRunning
                            ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                        }`}
                      >
                        {isDrainRunning ? (
                          <>
                            <Pause className="h-3.5 w-3.5 fill-current" />
                            <span>Pause Drain</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 fill-current" />
                            <span>Start Drain (0.25h)</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleResetDrain}
                        className="px-2.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs cursor-pointer"
                        title="Reset Timer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PHASE 2: CHEMICAL SOLVENT FLOW-THROUGH (ZERO CAUSTIC)                     */}
          {/* ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'degrease') && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                    <FlaskConical className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-sky-400 font-bold uppercase tracking-wider">
                        Phase 02 · Chemical Solvent Flow-Through (Zero Caustic)
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        NO CAUSTIC · NO IMMERSION · AMBIENT 20-22°C
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-neutral-100 mt-0.5">
                      Room-Temperature Chemical Solvent Flow-Through (Zero Caustic · No Bath Immersion)
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                    degrease.visualCleanlinessPass
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  }`}>
                    {degrease.visualCleanlinessPass ? '✓ Cleanliness Passed' : '✗ Re-Circulate Needed'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-7 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-neutral-300 font-medium mb-1">
                        Chemical Solvent Flow (Standard)
                      </label>
                      <div className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-sky-300 flex items-center justify-between">
                        <span className="font-semibold">{degrease.chemicalType || 'Solvent Flow (Zero Caustic)'}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          CERTIFIED STANDARD
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-500 mt-1 block">
                        Certified zero-caustic room-temperature formula · No manual input required
                      </span>
                    </div>

                    <div>
                      <label className="block text-neutral-300 font-medium mb-1">
                        Flow-Through Rig ID (No Immersion)
                      </label>
                      <input
                        type="text"
                        value={degrease.tankId || 'FLOW-RIG-01 (Room Temp)'}
                        onChange={(e) => updateDegrease('tankId', e.target.value)}
                        placeholder="e.g. FLOW-RIG-01 (Room Temp Flow-Through)"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-300 font-medium mb-1 flex items-center gap-1.5">
                        <Thermometer className="h-3.5 w-3.5 text-sky-400" />
                        Degreaser Fluid Temp (°C) [Room Temp]
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          value={degrease.bathTempC || 21.0}
                          onChange={(e) => updateDegrease('bathTempC', Number(e.target.value))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-500"
                        />
                        <span className="absolute right-3 top-2 text-xs text-sky-400 font-mono font-bold">
                          °C (Room Temp Ambient 20-22°C)
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-neutral-300 font-medium mb-1 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-cyan-400" />
                        Flow Duration (In Hours &amp; Minutes)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={degrease.soakDurationMinutes}
                          onChange={(e) => {
                            const m = Number(e.target.value);
                            updateDegrease('soakDurationMinutes', m);
                            updateDegrease('soakDurationHours', Number((m / 60).toFixed(2)));
                          }}
                          className="w-24 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-xs font-mono text-neutral-400">mins =</span>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {((degrease.soakDurationMinutes || 25) / 60).toFixed(2)} hrs
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cleanliness Verdict buttons */}
                  <div>
                    <span className="text-xs font-medium text-neutral-300 block mb-2">
                      Post-Soak Cleanliness Verdict:
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => updateDegrease('visualCleanlinessPass', true, 'Cleanliness passed visual check')}
                        className={`p-3 rounded-lg border flex items-center gap-2.5 transition-colors cursor-pointer ${
                          degrease.visualCleanlinessPass
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 font-semibold'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                        }`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs">Pass: Hydrocarbon Film Stripped</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => updateDegrease('visualCleanlinessPass', false, 'Cleanliness failed visual check - requires re-soak')}
                        className={`p-3 rounded-lg border flex items-center gap-2.5 transition-colors cursor-pointer ${
                          !degrease.visualCleanlinessPass
                            ? 'bg-rose-500/10 border-rose-500 text-rose-300 font-semibold'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                        }`}
                      >
                        <XCircle className="h-4 w-4" />
                        <span className="text-xs">Fail: Re-Soak Needed</span>
                      </button>
                    </div>
                  </div>

                  {/* Photos and Snapshot */}
                  <div className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Camera className="h-3.5 w-3.5 text-amber-400" />
                        <span>Degrease Inspection Photo Evidence</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleSimulatePhoto}
                        className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs cursor-pointer font-mono"
                      >
                        + Snapshot
                      </button>
                    </div>

                    <label className="flex items-center justify-center gap-2 p-2.5 bg-neutral-900 hover:bg-neutral-800/80 border border-dashed border-neutral-700 rounded-lg cursor-pointer transition-colors text-xs text-neutral-300">
                      <Camera className="h-4 w-4 text-amber-400" />
                      <span>Upload Cleanliness Photo</span>
                      <span className="text-[10px] text-emerald-400 font-mono font-medium">(Auto-Resized)</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {degrease.photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        {degrease.photos.map((pic) => (
                          <div key={pic.id} className="relative group rounded overflow-hidden border border-neutral-800">
                            <img src={pic.url} alt={pic.name} className="w-full h-16 object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateUnit((prev) => ({
                                  ...prev,
                                  degreasing: {
                                    ...prev.degreasing,
                                    photos: prev.degreasing.photos.filter((p) => p.id !== pic.id),
                                  },
                                }), 'Removed degrease photo');
                              }}
                              className="absolute top-1 right-1 p-0.5 bg-black/80 text-rose-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Soak Timer in HOURS */}
                <div className="lg:col-span-5 bg-neutral-950 p-4 sm:p-5 rounded-xl border border-neutral-800 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 uppercase font-bold">
                    <Clock className="h-4 w-4 text-sky-400" />
                    <span>Degrease Bath Soak Timer (In Hours)</span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-3xl sm:text-4xl font-mono font-bold text-neutral-100 tracking-tight tabular-nums">
                      {soakTimer.hhmmss}
                    </div>
                    <div className="text-sm font-mono font-bold text-sky-400">
                      {soakTimer.decimalHours} ({soakTimer.shortHours})
                    </div>
                    <div className="text-[11px] font-mono text-neutral-400">
                      Target: {((degrease.soakDurationMinutes || 25) / 60).toFixed(2)} hrs ({degrease.soakDurationMinutes || 25}:00 min)
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleToggleSoak}
                      className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isSoakRunning
                          ? 'bg-sky-500 hover:bg-sky-400 text-neutral-950'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                      }`}
                    >
                      {isSoakRunning ? (
                        <>
                          <Pause className="h-3.5 w-3.5 fill-current" />
                          <span>Pause Soak</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Start Soak ({((degrease.soakDurationMinutes || 25) / 60).toFixed(2)}h)</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleResetSoak}
                      className="px-2.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs cursor-pointer"
                      title="Reset Soak Timer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stage 02 Completion & Transition to Stage 03 Descaling / Stage 04 First Flush */}
          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md mt-6">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-200 block">
                  Stage 02 Degreasing Sign-Off
                </span>
                <span className="text-[11px] text-neutral-400">
                  Oil drained (15m) &amp; room-temp degreaser circulated. Next: Stage 03 Descaling (Chemical Descale) &rarr; Stage 04 First Flush (55°C DI).
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={markCompleted}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-teal-500 hover:from-amber-400 hover:to-teal-400 text-neutral-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <span>Proceed to {unit.processConfig?.cleaningRequired !== false && unit.processConfig?.descalingRequired !== false && !unit.cleaning?.skipped ? 'Stage 03: Descaling Protocol' : 'Stage 04: First Flush (55°C DI)'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
