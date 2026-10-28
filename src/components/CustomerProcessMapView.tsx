import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  FileText, 
  Download, 
  Layers, 
  ArrowRight, 
  Calendar, 
  ShieldCheck, 
  Check, 
  ChevronRight, 
  Truck,
  Eye,
  Lock,
  Sparkles,
  MapPin,
  ArrowLeft,
  BookOpen
} from 'lucide-react';
import { ServiceUnit, StepId } from '../types/process';
import { TeamLogo } from './TeamLogo';
import { getUnitDeliveryStatus } from '../utils/delivery';
import { CustomerSopGuideModal } from './CustomerSopGuideModal';

interface CustomerProcessMapViewProps {
  unit: ServiceUnit | null;
  units: ServiceUnit[];
  onSelectUnit?: (id: string) => void;
  onOpenCertificate: (unit: ServiceUnit) => void;
  onBackToDashboard?: () => void;
}

interface ProcessMilestone {
  id: StepId;
  stepNumber: string;
  name: string;
  description: string;
}

const PROCESS_MILESTONES: ProcessMilestone[] = [
  {
    id: 'intake',
    stepNumber: '01',
    name: 'Intake Assessment',
    description: 'Chassis verification, external box inspection, and receipt registration',
  },
  {
    id: 'degreasing',
    stepNumber: '02',
    name: 'Core Degreasing',
    description: 'Solvent circulation to evacuate used fluids and internal deposits',
  },
  {
    id: 'descaling',
    stepNumber: '03',
    name: 'Passage Descaling',
    description: 'Internal passage clearance cycle and mineral deposit elimination',
  },
  {
    id: 'first_flush',
    stepNumber: '04',
    name: 'Deionized First Flush',
    description: 'High-purity deionized water circuit flushing and residue evacuation',
  },
  {
    id: 'flow_test',
    stepNumber: '05',
    name: 'Flow Dynamics Testing',
    description: 'Multi-point dynamic flow profiling and passage balance calibration',
  },
  {
    id: 'pressure_test',
    stepNumber: '06',
    name: 'Proof Pressure Testing',
    description: 'Static hold verification and structural core integrity verification',
  },
  {
    id: 'cleaning',
    stepNumber: '07',
    name: 'Ultra Fine RIG Cleaning',
    description: 'Precision microscopic particulate extraction and cleanliness certification',
  },
  {
    id: 'final_flush',
    stepNumber: '08',
    name: 'Precision Final Flush',
    description: 'Final deionized particulate extraction and micro-filtration sweep',
  },
  {
    id: 'oven',
    stepNumber: '09',
    name: 'Thermal Bakeout',
    description: 'Chamber soak to completely evacuate internal residual moisture',
  },
  {
    id: 'gilling',
    stepNumber: '10',
    name: 'Manual Fin Straightening',
    description: 'Precision aerodynamic dressing of cooling matrix and core face fins',
  },
  {
    id: 'sign_off',
    stepNumber: '11',
    name: 'Final QA Sign-Off',
    description: 'Final ISO release inspection, protective bunging, and conformance sign-off',
  },
];

export const CustomerProcessMapView: React.FC<CustomerProcessMapViewProps> = ({
  unit,
  units,
  onSelectUnit,
  onOpenCertificate,
  onBackToDashboard,
}) => {
  const [sopModalStageId, setSopModalStageId] = useState<string | null>(null);

  if (!unit) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-4">
        <Layers className="h-12 w-12 text-neutral-600 mx-auto" />
        <h3 className="text-lg font-bold text-white">No Unit Selected</h3>
        <p className="text-xs text-neutral-400">
          Select one of your team units below to track its real-time position in the overhaul process.
        </p>
        {onBackToDashboard && (
          <button
            type="button"
            onClick={onBackToDashboard}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700"
          >
            Return to Fleet Overview
          </button>
        )}
      </div>
    );
  }

  const delivery = getUnitDeliveryStatus(unit);
  const isCompleted = unit.overallStatus === 'completed' || !!unit.signOff?.completedAt;

  // Calculate current stage position index
  const currentIndex = PROCESS_MILESTONES.findIndex((m) => m.id === unit.currentStepId);
  const effectiveIndex = isCompleted ? PROCESS_MILESTONES.length : (currentIndex >= 0 ? currentIndex : 0);
  const progressPercent = isCompleted ? 100 : Math.round(((effectiveIndex + 1) / PROCESS_MILESTONES.length) * 100);

  // Helper to determine stage status
  const getStageStatus = (milestoneIndex: number, milestoneId: StepId) => {
    if (isCompleted) {
      return 'completed';
    }
    if (milestoneIndex < effectiveIndex) {
      return 'completed';
    }
    if (milestoneIndex === effectiveIndex) {
      return 'current';
    }
    return 'upcoming';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 font-sans animate-fadeIn">
      {/* Top Header Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <TeamLogo teamName={unit.customerName} size="xl" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl">
                  {unit.serialNumber}
                </span>
                <span className="font-mono text-xs text-neutral-400">
                  WO: {unit.workOrderNumber}
                </span>
                {unit.chassisNumber && (
                  <span className="text-xs font-mono text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-lg border border-sky-500/30">
                    {unit.chassisNumber}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-950 text-neutral-300 border border-neutral-800">
                  Life #{unit.lifeNumber || 1}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                {unit.modelName}
              </h1>
              <p className="text-xs text-neutral-400 flex items-center gap-2 flex-wrap">
                <span>Constructor: <strong className="text-neutral-200">{unit.customerName}</strong></span>
                <span>·</span>
                <span>Part #: <span className="font-mono text-neutral-300">{unit.partNumber}</span></span>
                {unit.racingCategory && (
                  <>
                    <span>·</span>
                    <span className="capitalize">{unit.racingCategory.replace(/_/g, ' ')}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setSopModalStageId('01')}
              className="px-4 py-3 bg-neutral-950 hover:bg-neutral-800 text-amber-400 font-bold text-xs rounded-2xl border border-neutral-800 transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
              title="View 11-Stage Simplified SOP Reference Guide"
            >
              <BookOpen className="h-4 w-4" />
              <span>11-Stage SOP Guide</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenCertificate(unit)}
              className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs rounded-2xl transition-all shadow-md cursor-pointer flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              title="Preview & Export Official Conformance Certificate"
            >
              <FileText className="h-4 w-4 stroke-[2.5]" />
              <span>View &amp; Export Certificate</span>
            </button>

            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="px-4 py-3 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 font-bold text-xs rounded-2xl border border-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Fleet</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Position & Progress Callout */}
        <div className="p-4 md:p-5 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              isCompleted
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <MapPin className="h-6 w-6 animate-bounce" />}
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-2">
                <span>Unit Real-Time Position</span>
                <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold ${
                  isCompleted ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {isCompleted ? 'PROCESS COMPLETED' : 'IN OVERHAUL'}
                </span>
              </div>
              <div className="text-base font-black text-white mt-0.5">
                {isCompleted 
                  ? 'Certified Conforming — Quality Release Sign-Off Completed' 
                  : `Currently At: Stage 0${effectiveIndex + 1} — ${PROCESS_MILESTONES[effectiveIndex]?.name || 'In Process'}`
                }
              </div>
              <div className="text-xs text-neutral-400 mt-0.5">
                Target SLA Delivery: <strong className="text-neutral-200">{unit.expectedDeliveryDate || delivery.targetFormatted || 'On Schedule'}</strong>
                {delivery.isOverdue && <span className="text-rose-400 font-bold ml-2">· SLA Critical</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="text-[10px] font-mono text-neutral-400 uppercase">Process Completion</div>
              <div className="text-2xl font-black font-mono text-amber-400">{progressPercent}%</div>
            </div>
            <div className="w-24 md:w-32 h-3 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
              <div 
                className={`h-full transition-all duration-700 ${
                  isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-amber-400'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Customer Team Unit Selector (if multiple units exist for this team) */}
        {units.length > 1 && onSelectUnit && (
          <div className="pt-2 border-t border-neutral-800/80">
            <div className="text-xs text-neutral-400 mb-2 font-semibold flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-amber-400" />
              <span>Your Constructor Units ({units.length}):</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {units.map((u) => {
                const isSelected = u.id === unit.id;
                const uDone = u.overallStatus === 'completed';
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => onSelectUnit(u.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all shrink-0 cursor-pointer border flex items-center gap-2 ${
                      isSelected
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-sm'
                        : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <span>{u.serialNumber}</span>
                    <span className={`h-2 w-2 rounded-full ${uDone ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Visual Process Map (Strictly No Process Specifications) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-4 w-4 text-amber-400" />
              <span>11-Stage Overhaul Process Map</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Milestone tracking of cooler progress from intake registration to final conformance release.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Completed</span>
            </span>
            <span className="text-neutral-600">·</span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping inline-block" />
              <span>Active Position</span>
            </span>
            <span className="text-neutral-600">·</span>
            <span className="flex items-center gap-1 text-neutral-500">
              <Lock className="h-3 w-3" />
              <span>Upcoming</span>
            </span>
          </div>
        </div>

        {/* Milestone Sequence Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {PROCESS_MILESTONES.map((milestone, idx) => {
            const status = getStageStatus(idx, milestone.id);
            const isStageCurrent = status === 'current';
            const isStageCompleted = status === 'completed';

            return (
              <div
                key={milestone.id}
                className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between min-h-[110px] ${
                  isStageCurrent
                    ? 'bg-amber-500/10 border-amber-500/60 shadow-lg ring-1 ring-amber-500/40'
                    : isStageCompleted
                    ? 'bg-neutral-950/70 border-emerald-500/30 text-neutral-200'
                    : 'bg-neutral-950/40 border-neutral-800/60 text-neutral-500 opacity-60'
                }`}
              >
                {/* Header: Stage Number & Status Badge */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-mono font-bold ${
                    isStageCurrent ? 'text-amber-400' : isStageCompleted ? 'text-emerald-400' : 'text-neutral-500'
                  }`}>
                    STAGE {milestone.stepNumber}
                  </span>

                  {isStageCompleted ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      <span>Completed</span>
                    </span>
                  ) : isStageCurrent ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1.5 animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      <span>Current Position</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-neutral-500 bg-neutral-900 border border-neutral-800 flex items-center gap-1">
                      <Lock className="h-2.5 w-2.5" />
                      <span>Upcoming</span>
                    </span>
                  )}
                </div>

                {/* Stage Name */}
                <div className="my-2">
                  <h3 className={`text-sm font-bold tracking-tight ${
                    isStageCurrent ? 'text-white' : isStageCompleted ? 'text-neutral-100' : 'text-neutral-400'
                  }`}>
                    {milestone.name}
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                    {milestone.description}
                  </p>
                </div>

                {/* Footer Status Line */}
                <div className="pt-2 border-t border-neutral-800/60 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    {isStageCompleted ? (
                      <span className="text-emerald-400 font-semibold">Passed &amp; Verified ✓</span>
                    ) : isStageCurrent ? (
                      <span className="text-amber-400 font-bold">In Active Workshop Queue</span>
                    ) : (
                      <span className="text-neutral-500">Pending Sequence</span>
                    )}
                    <span className="text-neutral-500">Milestone {idx + 1} of 11</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSopModalStageId(milestone.id)}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-[10px] font-mono font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center justify-between gap-1 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="h-3 w-3 text-amber-400" />
                      <span>View Stage SOP</span>
                    </span>
                    <ChevronRight className="h-3 w-3 text-neutral-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Certificate of Conformance Download Section */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-500/10 border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
              Official Quality Documentation
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              AS9100D &amp; ISO 17025 Compliant
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
            Master Service Report &amp; Certificate of Conformance
          </h2>
          <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
            Includes official laboratory sign-off, digital authorization signature, serialized QR passport, and watermarked security release. All confidential workshop formulas and process specifications remain protected.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenCertificate(unit)}
          className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs rounded-2xl transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2.5 shrink-0 hover:scale-[1.02] active:scale-[0.98]"
        >
          <FileText className="h-4 w-4 stroke-[2.5]" />
          <span>View &amp; Export Certificate PDF</span>
        </button>
      </div>

      {/* Confidentiality Boundary Note */}
      <div className="text-center text-[11px] text-neutral-500 pt-2 flex items-center justify-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-neutral-400" />
        <span>
          Customer Access Mode: Authorized for Unit Position, Process Map Tracking, and Certificate of Conformance Release only. Internal workshop process specifications are protected.
        </span>
      </div>

      {/* Simplified SOP Modal */}
      <CustomerSopGuideModal
        isOpen={!!sopModalStageId}
        onClose={() => setSopModalStageId(null)}
        initialStageId={sopModalStageId || '01'}
      />
    </div>
  );
};
