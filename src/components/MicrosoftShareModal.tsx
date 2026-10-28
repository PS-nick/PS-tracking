import React, { useState } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  MessageSquare, 
  Mail, 
  Check, 
  Copy, 
  ExternalLink, 
  Download, 
  Monitor, 
  ShieldCheck,
  Share2,
  Database
} from 'lucide-react';
import { ServiceUnit } from '../types/process';
import { 
  exportToMicrosoftExcel, 
  copyTeamsCardToClipboard, 
  generateMicrosoftOutlookMailto, 
  generateMicrosoftTeamsCardMarkdown 
} from '../utils/microsoftIntegration';
import { downloadMicrosoftMigrationPackage } from '../utils/microsoftMigrationExport';

interface MicrosoftShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: ServiceUnit[];
  activeUnit?: ServiceUnit | null;
  contextName?: string;
}

export const MicrosoftShareModal: React.FC<MicrosoftShareModalProps> = ({
  isOpen,
  onClose,
  units,
  activeUnit,
  contextName = 'Fleet',
}) => {
  const [copiedTeams, setCopiedTeams] = useState(false);
  const targetUnit = activeUnit || units[0];

  if (!isOpen) return null;

  const handleExportExcel = () => {
    exportToMicrosoftExcel(units, contextName);
  };

  const handleCopyTeams = async () => {
    if (!targetUnit) return;
    const ok = await copyTeamsCardToClipboard(targetUnit);
    if (ok) {
      setCopiedTeams(true);
      setTimeout(() => setCopiedTeams(false), 2500);
    }
  };

  const handleOpenOutlook = () => {
    if (!targetUnit) return;
    const mailto = generateMicrosoftOutlookMailto(targetUnit);
    window.location.href = mailto;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 flex items-center justify-center animate-fadeIn">
      <div className="relative bg-neutral-900 border border-neutral-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Microsoft Ecosystem Integration</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Excel · Teams · Outlook
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Export telemetry data and share overhaul progress across Microsoft 365 tools
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Integration Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* 1. Microsoft Excel Export */}
          <div className="bg-neutral-950/80 border border-emerald-500/30 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Microsoft Excel Workbook</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Export all <strong>{units.length} unit records</strong> into a clean UTF-8 BOM CSV spreadsheet optimized for Microsoft Excel &amp; PowerBI.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              className="w-full py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4 stroke-[2.5]" />
              <span>Export to Microsoft Excel</span>
            </button>
          </div>

          {/* 2. Microsoft Teams Card Share */}
          <div className="bg-neutral-950/80 border border-purple-500/30 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                <MessageSquare className="h-4 w-4" />
                <span>Microsoft Teams Channel</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Copy structured Teams Adaptive Markdown card for {targetUnit ? targetUnit.serialNumber : 'selected unit'} to paste into Teams chats.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyTeams}
              disabled={!targetUnit}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 ${
                copiedTeams
                  ? 'bg-emerald-500 text-neutral-950'
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
            >
              {copiedTeams ? (
                <>
                  <Check className="h-4 w-4 stroke-[2.5]" />
                  <span>Teams Card Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Teams Card</span>
                </>
              )}
            </button>
          </div>

          {/* 3. Microsoft Outlook Email Dispatch */}
          <div className="bg-neutral-950/80 border border-sky-500/30 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                <Mail className="h-4 w-4" />
                <span>Microsoft Outlook Email</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Draft pre-formatted Outlook dispatch or QA release email with full technical specs and telemetry.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenOutlook}
              disabled={!targetUnit}
              className="w-full py-2.5 px-3 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Open in Microsoft Outlook</span>
            </button>
          </div>

          {/* 4. Windows Desktop PWA */}
          <div className="bg-neutral-950/80 border border-amber-500/30 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Monitor className="h-4 w-4" />
                <span>Windows &amp; Edge Desktop PWA</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Install ProTrace SOP natively on Windows 10/11 desktop or inside Microsoft Edge / Teams tabs.
              </p>
            </div>

            <div className="text-[11px] font-mono text-amber-300 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 text-center font-bold">
              Edge: Menu (...) → Apps → Install ProTrace SOP
            </div>
          </div>

        </div>

        {/* Recreate App in Microsoft Environment Box */}
        <div className="bg-gradient-to-r from-sky-950/50 via-neutral-950 to-neutral-950 border border-sky-500/40 p-4 sm:p-5 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-sky-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Recreate Entire App in Microsoft Environment
              </span>
            </div>
            <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2.5 py-0.5 rounded-full font-bold">
              Azure SQL + Power Apps + .NET Blueprint
            </span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Download the complete Microsoft Migration Package containing the <strong>Azure SQL CREATE TABLE DDL</strong> script, <strong>Power Apps Dataverse Entity Schema JSON</strong>, and <strong>Azure Functions / Static Web Apps deployment blueprint</strong>.
          </p>
          <button
            type="button"
            onClick={() => downloadMicrosoftMigrationPackage(units)}
            className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 text-neutral-950 text-xs font-black rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4 stroke-[2.5]" />
            <span>Download Microsoft Migration Package (.SQL + Power Apps JSON + Blueprint)</span>
          </button>
        </div>

        {/* Teams Snippet Preview (if targetUnit exists) */}
        {targetUnit && (
          <div className="space-y-2 border-t border-neutral-800 pt-4">
            <div className="text-xs font-mono font-bold text-neutral-400 flex items-center justify-between">
              <span>Microsoft Teams Snippet Preview ({targetUnit.serialNumber}):</span>
              <span className="text-purple-400">Markdown Format</span>
            </div>
            <pre className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-32 whitespace-pre-wrap">
              {generateMicrosoftTeamsCardMarkdown(targetUnit)}
            </pre>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-neutral-400 pt-2 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Windows &amp; Microsoft 365 Certified UTF-8 / RFC 4180 Standard</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-bold text-xs rounded-xl"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
