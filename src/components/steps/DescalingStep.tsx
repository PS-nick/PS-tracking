import React, { useState } from 'react';
import { 
  Beaker, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Thermometer, 
  Clock, 
  QrCode, 
  Check, 
  Ban, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { ServiceUnit } from '../../types/process';
import { StepSopViewer } from '../StepSopModal';

interface DescalingStepProps {
  unit: ServiceUnit;
  onUpdateUnit: (updater: (prev: ServiceUnit) => ServiceUnit, logAction?: string) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onOpenScanner?: () => void;
}

export const DescalingStep: React.FC<DescalingStepProps> = ({
  unit,
  onUpdateUnit,
  onNextStep,
  onPrevStep,
  onOpenScanner,
}) => {
  const descaling = unit.descaling || {
    performed: !unit.processConfig?.descalingRequired ? false : true,
    skipped: unit.processConfig?.descalingRequired === false,
    descalerAgent: 'Apex Non-Acidic Precision Descaling Agent',
    cycleMinutes: 15,
    bathTemperatureC: 45,
    technician: unit.intake?.technician || 'Nicola Malgarotti',
    notes: '',
  };

  const isDescalingSkipped = descaling.skipped === true || unit.processConfig?.descalingRequired === false;

  const [bypassReason, setBypassReason] = useState(
    descaling.bypassReason || 'Internal matrix passages clean upon intake · Deep chemical descaling not required for this overhaul cycle'
  );
  const [bypassTechnician, setBypassTechnician] = useState(
    descaling.bypassTechnician || descaling.technician || unit.intake.technician || 'Nicola Malgarotti'
  );
  const [descalerAgent, setDescalerAgent] = useState(
    descaling.descalerAgent || 'Apex Non-Acidic Precision Descaling Agent'
  );
  const [cycleMinutes, setCycleMinutes] = useState(descaling.cycleMinutes || 15);
  const [bathTemperatureC, setBathTemperatureC] = useState(descaling.bathTemperatureC || 45);
  const [technician, setTechnician] = useState(descaling.technician || unit.intake.technician || 'Nicola Malgarotti');
  const [notes, setNotes] = useState(descaling.notes || '');

  const handleToggleDescaling = (required: boolean) => {
    onUpdateUnit((prev) => ({
      ...prev,
      descaling: {
        ...(prev.descaling || descaling),
        performed: required,
        skipped: !required,
        completedAt: !required ? (prev.descaling?.completedAt || new Date().toISOString()) : undefined,
      },
      processConfig: {
        ...prev.processConfig,
        descalingRequired: required,
      },
    }), required 
      ? 'Stage 03: Descaling protocol marked REQUIRED' 
      : 'Stage 03: Descaling protocol marked NOT REQUIRED (Bypassed)');
  };

  const handleConfirmBypass = () => {
    const now = new Date().toISOString();
    onUpdateUnit((prev) => ({
      ...prev,
      descaling: {
        ...(prev.descaling || descaling),
        performed: false,
        skipped: true,
        completedAt: now,
        bypassReason: bypassReason.trim() || 'Internal matrix passages clean · Chemical descaling not required',
        bypassTechnician: bypassTechnician.trim() || 'Technician',
      },
      processConfig: {
        ...prev.processConfig,
        descalingRequired: false,
      },
      currentStepId: 'first_flush',
    }), 'Confirmed descaling not required (bypassed). Advanced to Stage 04: First Flush.');
    onNextStep();
  };

  const markCompleted = () => {
    const now = new Date().toISOString();
    onUpdateUnit((prev) => ({
      ...prev,
      descaling: {
        performed: true,
        skipped: false,
        descalerAgent,
        cycleMinutes,
        bathTemperatureC,
        technician,
        notes,
        completedAt: now,
      },
      processConfig: {
        ...prev.processConfig,
        descalingRequired: true,
      },
      currentStepId: 'first_flush',
    }), 'Stage 03: Chemical descaling cycle completed. Advanced to Stage 04: First Flush.');
    onNextStep();
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400">
              Stage 03
            </span>
            <span className="text-xs text-neutral-500">·</span>
            <span className="text-xs text-neutral-300 font-mono">Internal Passages Descaling (Between Degreasing &amp; First Flush)</span>
          </div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight mt-0.5">
            Internal Passages Chemical Descaling Cycle
          </h2>
          <p className="text-sm text-neutral-300 mt-1">
            Deep chemical descaling protocol run to clean out inner channel pathways between degreasing and first flush. Descaling is optional based on internal contamination levels.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <StepSopViewer stepId="cleaning" />
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
            type="button"
            onClick={onPrevStep}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg cursor-pointer"
          >
            ← Previous
          </button>
          {isDescalingSkipped ? (
            <button
              type="button"
              onClick={handleConfirmBypass}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>Confirm Descaling Not Needed &amp; Proceed to First Flush</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={markCompleted}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>Confirm Descaling &amp; Go to First Flush</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Descaling Requirement Selector Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 space-y-3 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
              isDescalingSkipped
                ? 'bg-neutral-800/80 border-neutral-700 text-neutral-400'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
            }`}>
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                  Descaling Requirement Selection
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                  isDescalingSkipped
                    ? 'bg-neutral-800 text-neutral-300 border-neutral-700'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}>
                  {isDescalingSkipped ? 'BYPASSED · NOT REQUIRED' : 'REQUIRED FOR THIS UNIT'}
                </span>
              </div>
              <p className="text-xs text-neutral-300 mt-1">
                Descaling is not a must: select whether this component requires deep chemical descaling of internal matrix pathways or if passages are clean and this stage is bypassed.
              </p>
            </div>
          </div>

          {/* Toggle Buttons */}
          <div className="flex items-center gap-2 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800 shrink-0">
            <button
              type="button"
              onClick={() => handleToggleDescaling(true)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                !isDescalingSkipped
                  ? 'bg-amber-500 text-neutral-950 shadow-md scale-[1.02]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              <span>Descaling Required</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleDescaling(false)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isDescalingSkipped
                  ? 'bg-neutral-800 text-amber-300 border border-amber-500/40 shadow-md scale-[1.02]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Ban className="h-3.5 w-3.5 text-amber-400" />
              <span>Not Needed / Bypassed</span>
            </button>
          </div>
        </div>
      </div>

      {/* When Descaling is Bypassed / Not Required */}
      {isDescalingSkipped ? (
        <div className="bg-neutral-900 border border-amber-500/30 rounded-xl p-5 space-y-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <span>Stage 03 Descaling Bypassed · Unit Passages Clean</span>
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                  Optional Protocol Bypassed
                </span>
              </h3>
              <p className="text-xs text-neutral-300">
                The technician has inspected the internal pathways and determined that deep chemical descaling is not required for this overhaul cycle. You can record the reason, sign off, and proceed directly to Stage 04 (First Flush).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-neutral-800">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Bypass Justification / Cleanliness Reason:
              </label>
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {[
                    'Internal matrix clean on arrival',
                    'Repeat service with clear history',
                    'Zero mineral or chemical scaling',
                    'Client spec: wash only (no acid descale)',
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setBypassReason(r)}
                      className={`px-2.5 py-1.5 text-[11px] rounded-lg border text-left truncate transition-colors cursor-pointer ${
                        bypassReason === r
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      ✓ {r}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={bypassReason}
                  onChange={(e) => setBypassReason(e.target.value)}
                  placeholder="Custom bypass justification note..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Inspecting Technician Signature:
                </label>
                <input
                  type="text"
                  value={bypassTechnician}
                  onChange={(e) => setBypassTechnician(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-1">
                <span className="text-[11px] font-mono font-semibold text-neutral-400 block">
                  Service Traveler Impact:
                </span>
                <p className="text-[11px] text-neutral-300">
                  Descaled Internal Passages Cycle will be recorded as <strong className="text-amber-300 font-mono">OPTIONAL / BYPASSED (0.00h)</strong> in the master traveler and official service report.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={handleConfirmBypass}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer hover:scale-[1.01]"
            >
              <span>Confirm Descaling Not Needed &amp; Proceed to First Flush</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        /* When Descaling is Required */
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
              <Beaker className="h-4 w-4 text-amber-400" />
              <span>Chemical Descaling Parameters &amp; Circulation</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
              Passage Descaling Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Descaling Chemistry Agent:
              </label>
              <input
                type="text"
                value={descalerAgent}
                onChange={(e) => setDescalerAgent(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Circulation Time (Minutes):
              </label>
              <input
                type="number"
                min="1"
                value={cycleMinutes}
                onChange={(e) => setCycleMinutes(Math.max(1, parseInt(e.target.value || '15', 10)))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Bath Temperature (°C):
              </label>
              <input
                type="number"
                value={bathTemperatureC}
                onChange={(e) => setBathTemperatureC(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Certified Technician:
              </label>
              <input
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Process Observations / Notes:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Log internal scale dissolution observations or visual effluent condition..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
