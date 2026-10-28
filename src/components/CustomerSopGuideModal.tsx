import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  Search, 
  ShieldCheck, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles, 
  Layers, 
  ClipboardCheck, 
  Droplets, 
  Gauge, 
  Microscope, 
  Flame, 
  Award, 
  Waves, 
  Sliders, 
  Droplet,
  FileText
} from 'lucide-react';
import { CUSTOMER_SIMPLIFIED_SOPS, StageSopDetail } from '../constants/customerSop';

interface CustomerSopGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStageId?: string;
}

export const CustomerSopGuideModal: React.FC<CustomerSopGuideModalProps> = ({
  isOpen,
  onClose,
  initialStageId,
}) => {
  const [selectedStage, setSelectedStage] = useState<StageSopDetail>(() => {
    if (initialStageId) {
      const found = CUSTOMER_SIMPLIFIED_SOPS.find((s) => s.id === initialStageId || s.stageNumber === initialStageId);
      if (found) return found;
    }
    return CUSTOMER_SIMPLIFIED_SOPS[0];
  });

  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredSops = CUSTOMER_SIMPLIFIED_SOPS.filter((sop) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      sop.title.toLowerCase().includes(q) ||
      sop.stageNumber.includes(q) ||
      sop.sopCode.toLowerCase().includes(q) ||
      sop.shortSummary.toLowerCase().includes(q) ||
      sop.objective.toLowerCase().includes(q)
    );
  });

  const renderIcon = (name: string, className: string = "h-4 w-4") => {
    switch (name) {
      case 'ClipboardCheck': return <ClipboardCheck className={className} />;
      case 'Droplets': return <Droplets className={className} />;
      case 'Sparkles': return <Sparkles className={className} />;
      case 'Waves': return <Waves className={className} />;
      case 'Gauge': return <Gauge className={className} />;
      case 'ShieldCheck': return <ShieldCheck className={className} />;
      case 'Microscope': return <Microscope className={className} />;
      case 'Droplet': return <Droplet className={className} />;
      case 'Flame': return <Flame className={className} />;
      case 'Sliders': return <Sliders className={className} />;
      case 'Award': return <Award className={className} />;
      default: return <BookOpen className={className} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center animate-fadeIn">
      <div className="relative bg-neutral-900 border border-neutral-800 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-800 bg-neutral-950/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  11-Stage Overhaul SOP Standard Reference
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Customer Guide
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Simplified Standard Operating Procedures for motorsport &amp; aerospace heat exchanger overhauls
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Close SOP Reference Modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body: Sidebar + Detail View */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
          
          {/* Left Navigation Sidebar */}
          <div className="md:col-span-5 border-r border-neutral-800 bg-neutral-950/40 p-4 flex flex-col space-y-3 overflow-y-auto max-h-[400px] md:max-h-none">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter stage or SOP code..."
                className="w-full pl-8 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* List of Stages */}
            <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
              {filteredSops.map((sop) => {
                const isSelected = selectedStage.stageNumber === sop.stageNumber;
                return (
                  <button
                    key={sop.stageNumber}
                    type="button"
                    onClick={() => setSelectedStage(sop)}
                    className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer border flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                        : 'bg-neutral-900/60 hover:bg-neutral-900 border-neutral-800/80 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg border shrink-0 ${
                        isSelected ? 'bg-amber-500 text-neutral-950 border-amber-400' : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                      }`}>
                        {sop.stageNumber}
                      </span>
                      <div className="min-w-0">
                        <div className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-neutral-200'}`}>
                          {sop.title}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          {sop.sopCode}
                        </div>
                      </div>
                    </div>

                    <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isSelected ? 'text-amber-400 translate-x-0.5' : 'text-neutral-600'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Stage Detail Panel */}
          <div className="md:col-span-7 p-6 overflow-y-auto space-y-6 bg-neutral-900/60">
            {/* Stage Header */}
            <div className="space-y-2 border-b border-neutral-800 pb-5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    STAGE {selectedStage.stageNumber} OF 11
                  </span>
                  <span className="font-mono text-xs text-neutral-400 bg-neutral-950 px-2.5 py-1 rounded-xl border border-neutral-800">
                    {selectedStage.sopCode}
                  </span>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border flex items-center gap-1.5 ${selectedStage.badgeColor}`}>
                  {renderIcon(selectedStage.iconName, "h-3.5 w-3.5")}
                  <span>Standard Process</span>
                </div>
              </div>

              <h3 className="text-xl font-black text-white tracking-tight">
                {selectedStage.title}
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed font-medium">
                {selectedStage.shortSummary}
              </p>
            </div>

            {/* Objective Box */}
            <div className="bg-neutral-950/80 p-4 rounded-2xl border border-neutral-800 space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Primary Stage Objective</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {selectedStage.objective}
              </p>
            </div>

            {/* Simplified Step-by-Step Procedure */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-400" />
                <span>Simplified Operating Procedure:</span>
              </h4>
              <div className="space-y-2">
                {selectedStage.simplifiedProcedure.map((stepText, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-xs text-neutral-200 flex items-start gap-2.5">
                    <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-500/10 h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{stepText}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quality Controls */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Stage Quality Verification Parameters:</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedStage.qualityControls.map((qc, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="font-medium">{qc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Assurance Note */}
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                <span>Constructor Value &amp; Assurance</span>
              </div>
              <p className="text-neutral-300 leading-relaxed text-[11px]">
                {selectedStage.customerAssurance}
              </p>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs text-neutral-400 flex-wrap gap-2">
          <span>Particle Science SOP Version 2.4 · Standard Operating Protocol</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 font-bold text-xs rounded-xl border border-neutral-800 transition-colors cursor-pointer"
          >
            Close Reference
          </button>
        </div>

      </div>
    </div>
  );
};
